# CLAUDE.md — ADopeCanva Codebase Guide

## Project Overview

**ADopeCanva** (package name: `omniedit`) is a privacy-first, browser-based multimedia toolkit with 50+ tools for video, audio, image, GIF, document, and text processing. All media processing happens **client-side** using FFmpeg.wasm — no server uploads required.

- **Live Site:** adopecanva.com
- **Deployment:** Cloudflare Pages
- **Internal package name:** omniedit

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + TypeScript 5.8 |
| Build tool | Vite 6 |
| Styling | TailwindCSS 4 (dark mode only) |
| Routing | React Router DOM 7 |
| Media processing | FFmpeg.wasm (`@ffmpeg/ffmpeg` 0.12) |
| AI integration | Google Gemini (`@google/genai`) |
| PDF | jsPDF + pdf-lib + pdfjs-dist |
| Documents | docx, mammoth, exceljs |
| Data formats | papaparse (CSV), js-yaml, xml-js |
| Icons | lucide-react |
| Testing | vitest + @testing-library/react (configured but no tests yet) |
| Deployment | Cloudflare Pages via Wrangler 4 |

---

## Repository Structure

```
/
├── App.tsx                    # Root app: routing, analytics, SEO
├── index.tsx                  # React DOM entry point
├── index.css                  # TailwindCSS v4 + custom theme
├── index.html                 # HTML template (CSP headers, GA, AdSense, fonts)
├── types.ts                   # Global TypeScript types/interfaces
├── vite.config.ts             # Vite configuration
├── wrangler.toml              # Cloudflare Pages config
├── agents.md                  # Design system & conventions (READ THIS)
│
├── components/
│   ├── ui/                    # Primitive UI components
│   │   ├── Button.tsx
│   │   ├── Toggle.tsx
│   │   ├── Tooltip.tsx
│   │   ├── Select.tsx
│   │   └── ApiKeyInput.tsx    # Gemini API key input
│   ├── FileUploader.tsx       # Universal drag-and-drop file upload
│   ├── EditorControls.tsx     # Reusable editor toolbar
│   ├── SEOSections.tsx        # FAQ, guide, spec rendering
│   ├── Feedback.tsx           # User feedback form
│   ├── MobileLayout.tsx       # Mobile-responsive wrapper
│   ├── MobileNavbar.tsx       # Mobile navigation
│   └── ...                    # Changelog, FeatureBoard, etc.
│
├── hooks/
│   └── useIsMobile.ts         # Viewport < 768px detection
│
├── utils/
│   ├── ffmpeg.ts              # FFmpeg.wasm lazy-loader with fallback
│   └── feedbackApi.ts         # Google Sheets/Apps Script feedback backend
│
├── views/
│   ├── Dashboard.tsx          # Tool registry & grid (1,231 lines — source of truth for all tools)
│   └── tools/                 # 39 individual tool components
│
├── public/
│   ├── gif.worker.js          # Web Worker for GIF processing
│   ├── pdf.worker.min.mjs     # Web Worker for PDF processing
│   ├── _headers               # Cloudflare CORS/COEP/COOP headers
│   └── _redirects             # Cloudflare URL rewrites
│
└── .agents/workflows/
    └── Create_New_Tool.md     # Step-by-step guide for adding new tools
```

---

## Development Commands

```bash
npm install          # Install dependencies (Node 18+ required)
npm run dev          # Dev server at http://localhost:3000
npm run build        # Production build → dist/
npm run preview      # Preview production build locally
npm run deploy       # Build + deploy to Cloudflare Pages
npm run pages:dev    # Emulate Cloudflare Pages locally
```

---

## Environment Variables

Set in `.env.local` for development; set in Cloudflare Dashboard for production.

| Variable | Purpose | Required |
|---|---|---|
| `VITE_GEMINI_API_KEY` | Google Gemini AI (Background Removal, Upscale, Magic Editor) | No (features disabled without it) |
| `VITE_FEEDBACK_API_URL` | Google Apps Script endpoint for feedback/features | No (feedback silently skipped) |

---

## Architecture Patterns

### Routing (App.tsx)
```
/             → Dashboard (tool grid)
/:toolId      → Individual tool view (dynamic lookup from tool registry)
/vs/:opponent → Feature comparison page
/studio       → Coming soon (Pro Editor)
```

### Tool Registry (views/Dashboard.tsx)
Every tool is defined here as a `ToolItem` object. This is the **single source of truth** — adding a tool means registering it here. Key fields:

```typescript
interface ToolItem {
  id: string               // URL slug (e.g., "image-editor")
  title: string
  description: string
  icon: LucideIcon
  category: ToolCategory   // VIDEO | AUDIO | IMAGE | DOCS | TEXT | DEV
  component: React.ReactNode
  popular?: boolean
  comingSoon?: boolean
  guideTitle?: string      // SEO guide title
  guideContent?: string    // SEO guide body
  faqs?: FAQItem[]         // SEO FAQ accordion
  specs?: SpecItem[]       // Technical specs table
  privacyNotes?: string    // Privacy disclosure text
}
```

### State Management
No global state library. Each tool manages its own state via `useState`. No Redux, Zustand, or Context API for tool state.

### FFmpeg Loading (utils/ffmpeg.ts)
- Lazy-loaded singleton — cached after first load
- Detects `SharedArrayBuffer` support for multi-threaded mode
- Falls back to single-threaded if cross-origin isolation is unavailable
- 20-second timeout with smoke test before returning instance
- Loads core from CDN: `jsdelivr.net/@ffmpeg/core-mt` or `@ffmpeg/core`

---

## Design System

> Source of truth: **agents.md** in the repo root

**Philosophy:** "Premium Dark Minimalism" — dark backgrounds with indigo color leaks.

### Colors
| Token | Value | Use |
|---|---|---|
| Background | `zinc-950` / `#09090b` | Page background |
| Surface | `zinc-900` / `#18181b` | Cards, panels |
| Border | `zinc-800` | Dividers |
| Primary | `indigo-500` / `#6366f1` | Buttons, accents, gradients |
| Text primary | `white` | Headings |
| Text secondary | `zinc-400` | Body copy |

### Typography
- **Headings:** `font-unbounded` (Unbounded Google Font)
- **Body:** `font-jakarta` (Plus Jakarta Sans)
- **Code/Mono:** `font-mono` (JetBrains Mono)

### Standard Tool Layout
Every tool follows this structure:
1. **Header** — Title + description
2. **Upload Area** — `FileUploader` component (drag-drop)
3. **Settings/Controls** — Tool-specific options
4. **4-column Feature Grid** — Highlights of the tool's capabilities
5. **Output/Preview** — Download button + preview

### Icons
Always use **lucide-react** icons. Never use other icon libraries.

---

## Adding a New Tool

Follow `.agents/workflows/Create_New_Tool.md` exactly. Summary:

1. Create `views/tools/YourTool.tsx` using the standard layout
2. Register it in `views/Dashboard.tsx` with full `ToolItem` metadata
3. Update `Changelog.tsx` with the new release entry
4. If using AI features, use `components/ui/ApiKeyInput.tsx` for the Gemini key
5. Test on both desktop and mobile

---

## Key Conventions

### TypeScript
- Strict mode is **not** enabled (`skipLibCheck: true`) but types should be explicit
- Path alias `@/` maps to the repo root
- Avoid `any`; use proper interfaces
- All tool component files export a default component

### Styling
- **TailwindCSS v4 only** — no inline styles, no CSS modules, no styled-components
- Dark mode is the **only** mode; no light theme support
- Prefer Tailwind utilities over custom CSS classes
- Custom animations defined in `index.css`

### Component Patterns
- Use `lucide-react` for all icons
- Use `components/ui/Button.tsx` for all buttons (not raw `<button>`)
- Use `components/FileUploader.tsx` for all file inputs
- `useIsMobile()` hook for responsive logic (breakpoint: 768px)
- No global state — component-level `useState` only

### FFmpeg Usage
```typescript
import { getFFmpeg } from '@/utils/ffmpeg'

const ffmpeg = await getFFmpeg()  // Lazy-loads + caches FFmpeg
await ffmpeg.writeFile('input.mp4', await fetchFile(file))
await ffmpeg.exec(['-i', 'input.mp4', ...args, 'output.mp4'])
const data = await ffmpeg.readFile('output.mp4')
```

### File Processing
- All processing is **client-side** — never send user files to a server
- Use `URL.createObjectURL()` for previews
- Always revoke object URLs with `URL.revokeObjectURL()` when done
- Support common formats; show clear error messages for unsupported ones

### AI Features (Gemini)
- Use `@google/genai` SDK
- API key comes from `VITE_GEMINI_API_KEY` or the `ApiKeyInput` component
- Features must degrade gracefully when no key is provided
- Currently used by: BackgroundRemover, MagicImageEditor, UpscaleImage

---

## Deployment

### Cloudflare Pages Setup
- Connect the GitHub repo in Cloudflare Dashboard
- Build command: `npm run build`
- Output directory: `dist`
- Set environment variables (`VITE_GEMINI_API_KEY`, etc.) in Dashboard

### Cross-Origin Isolation
FFmpeg multithreading requires `SharedArrayBuffer`, which requires cross-origin isolation headers:
- `Cross-Origin-Opener-Policy: same-origin`
- `Cross-Origin-Embedder-Policy: credentialless`

These are set in both `vite.config.ts` (dev) and `public/_headers` (production).

### Manual Deploy
```bash
npm run deploy  # Equivalent to: npm run build && wrangler pages deploy dist
```

---

## Current Gaps / Known Issues

- **No automated tests** — vitest and @testing-library are installed but zero tests exist
- **No CI/CD** — deployments are manual via Wrangler CLI
- **No pre-commit hooks** — no lint-staged or husky configured
- **No error boundaries** — uncaught React errors will crash the entire app
- **Studio/Pro Editor** is disabled (shows "Coming Soon")

---

## External Services

| Service | Purpose | Config |
|---|---|---|
| Cloudflare Pages | Hosting + CDN | wrangler.toml |
| Google Analytics | Usage tracking | GA ID: G-1ZV3C4L9KF (in index.html) |
| Google AdSense | Monetization | Publisher ID: ca-pub-1724525842916972 |
| Google Gemini | AI image features | VITE_GEMINI_API_KEY |
| Google Apps Script | Feedback/feature voting | VITE_FEEDBACK_API_URL |
| jsDelivr CDN | FFmpeg WASM core files | Loaded at runtime |
