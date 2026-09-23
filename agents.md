# AdopeCanva Design System & Development Guidelines

This file serves as the core memory and rulebook for the AdopeCanva project. All future development, UI component creation, and tool additions MUST strictly adhere to these guidelines to ensure a pristine, premium, and cohesive application.

## 1. Core Visual Identity: "Premium Dark Minimalism"
AdopeCanva is NOT a basic AI template. It is a high-end suite of tools.
*   **Backgrounds:** Use rich dark tones as the baseline. `bg-zinc-950` for main backgrounds, `bg-zinc-900` for cards and panels. Avoid pure black except for deep shadows or specific contrasts.
*   **Borders:** Soft, subtle separation. Use `border-zinc-800` or `border-zinc-800/50`. Elements should not have harsh outlines.
*   **The "Color Leak" Strategy:** The brand color is Indigo (`#4F46E5`), but it MUST be used sparingly. We use "color leaks" instead of solid blocks.
    *   **Glows/Shadows:** `box-shadow: 0 8px 32px rgba(79,70,229,0.15)`
    *   **Borders on Hover:** `border-color: rgba(79,70,229,0.3)`
    *   **Background Tints (Active States):** `background: rgba(79,70,229,0.15)`
    *   *Do NOT use loud `from-indigo-600 to-purple-600` gradients spreading across the screen.* Keep it minimal. Let the darkness breathe.

## 2. Typography
*   **Headings/Display:** Use the `font-unbounded` class for massive impact. This is reserved for the main Title of tools, large numbers, and the primary Logo. 
*   **Body/UI Text:** Standard Inter/sans-serif. Keep tracking tight.
*   **Labels/Badges:** Small uppercase text with wide tracking for meta-information (e.g., `text-[10px] uppercase tracking-widest font-bold`).

## 3. Standard Tool Architecture (Upload View)
New tools live in `tools/<tool-id>/` (`manifest.json` + `index.tsx`) — see `CONTRIBUTING.md`. Use `<ToolShell>` for the upload view and `useToolFile()` for file state; both enforce this layout automatically.
Every tool that requires an initial upload state must use the following structure. Do not invent new initial layouts.
1.  **Header (Top):** 
    *   Unbounded font, `text-4xl`, with the tool Icon next to the name.
    *   A brief, one-sentence description underneath (`text-zinc-400`).
2.  **Upload Area (Middle):**
    *   Use the `<FileUploader />` component.
    *   Wrapped in a container with a subtle background and a hover border effect that uses the tool's specific color or the global indigo leak.
3.  **Feature Highlights (Bottom):**
    *   **CRITICAL:** Every tool upload page MUST have a 4-column grid of feature highlights at the bottom (`grid-cols-2 md:grid-cols-4`).
    *   Each card features: A Lucide icon (colored, with a soft background tint), a short bold Label, and a micro-uppercase Description. 
    *   Example: `const features = [{ icon: Zap, label: 'Instant', desc: 'No Server Uploads' }, ...]`

## 4. Interaction & Feedback
*   **Micro-animations:** Elements should respond gracefully. Use `transition-all duration-300`, `hover:-translate-y-0.5`, and soft shadow expansions on hover.
*   **Loading States:** Always indicate processing. Buttons should flip to standard loading states with spinners when waiting for an AI API or heavy local processing task.
*   **Empty States:** An empty tool should still look beautiful. Provide the user with clear instructions (the standard upload view).

## 5. Coding Standards
*   **TypeScript:** Strictly type all properties, API responses, and file data structures.
*   **Components:** Keep components modular. If a piece of UI (like a bespoke slider or heavily styled dropdown) gets too large, break it out into a shared component file.
*   **Icons:** Use `lucide-react` exclusively for iconography across the app. 

## 6. Project Maintenance & Updates
*   **Changelog / Updates Page:** Whenever a new tool, feature, or significant structural change is added, you MUST append these updates to the Changelog/Updates component (e.g., `Changelog.tsx` or similar updates page) so users know what's new. NEVER add a tool without documenting its release natively in the app!

*Remember: Simplicity is the ultimate sophistication. When in doubt, strip it back, darken it down, and add just a 15% opacity leak of indigo.*
