import React from 'react';
import { Sparkles, Bug, Zap, Layers, Lock, Rocket, GitBranch, Music, GitCompare, Palette, FileDown, Type, Scissors, Smartphone, Eraser, FileAudio, Stamp, EyeOff, Cpu, ShieldCheck, Maximize2, RotateCw, Scale, Users, Crop } from 'lucide-react';

interface ChangeEntry {
    version: string;
    date: string;
    items: {
        icon: React.ElementType;
        title: string;
        description: string;
        type: 'feature' | 'fix' | 'update' | 'security';
    }[];
}

const CHANGES: ChangeEntry[] = [
    {
        version: '1.23.7',
        date: 'Nov 24, 2026',
        items: [
            {
                icon: ShieldCheck,
                title: 'CI & Security Hardening: Offline Checkerboard & Tool Audit Passes',
                description: 'Eliminated external transparenttextures.com asset dependencies across Background Remover, Image Compressor, Magic Image Editor, and Image Upscaler in favor of offline CSS checkerboards, satisfying strict CSP audit requirements. Hardened null-handling during file exports and aligned bundle budget thresholds for Hyperframes Studio.',
                type: 'fix'
            }
        ]
    },
    {
        version: '1.23.6',
        date: 'Nov 21, 2026',
        items: [
            {
                icon: Scissors,
                title: 'Video Trimmer: Tactile Apple/CapCut-Style Handles & Precision Scrubbing',
                description: 'Completely overhauled timeline trim handles in Quick Video Editor and Video Trimmer with 28px tactile grab pills, dual grip ridges, directional chevrons (▶ / ◀), live floating timecode tooltips during drag, active ring highlights, and generous 48px hit areas for effortless grabbing even at 0% or 100% boundaries. Resolved accidental selection-body shifts by isolating the top window drag bar from filmstrip seeking.',
                type: 'feature'
            },
            {
                icon: Maximize2,
                title: 'Platform-Wide Viewport Containment: Zero Truncated Action Buttons',
                description: 'Enforced h-full min-h-0 containment and internal scrollbars across Image Cropper, Image Compressor, Image Resizer, Background Remover, GIF Compressor, Upscale Image, Magic Image Editor, Signature Generator, Video to GIF, and Video Compressor. Primary "Download", "Convert", and "Apply" buttons now remain permanently accessible in viewport without outer page scrollbars.',
                type: 'update'
            }
        ]
    },
    {
        version: '1.23.5',
        date: 'Nov 21, 2026',
        items: [
            {
                icon: Layers,
                title: 'Design System: Replaced All Browser Default Selects With Custom Dropdowns',
                description: 'Audited and upgraded every single dropdown across the entire platform (Text to PDF, PDF to JPG, Universal Converter, JSON Formatter, Audio Converter, Audio Merger, Audio Trimmer, Color Tool, GIF Compressor, GIF Editor, Image Editor, Social Mockup Checker, Spreadsheet Tools, Video Converter, Video to GIF, and Recipe Runner). Replaced native OS/browser <select> menus with our bespoke dark minimalist <Select> component featuring smooth chevron rotations, subtle indigo active leaks, keyboard navigation, and click-outside dismissal.',
                type: 'feature'
            }
        ]
    },
    {
        version: '1.23.4',
        date: 'Nov 21, 2026',
        items: [
            {
                icon: Maximize2,
                title: 'Text & Document Tools: Viewport Fitting & Resizable Text Editor',
                description: 'Locked tool container heights to the viewport (h-full) across Text to PDF, PDF to Text, and PDF to JPG, eliminating awkward window scrollbar overflows and cut-off action buttons. Added customizable text sizing (A- / A+ zoom controls) and resizable textarea handles with a one-click "Fit Viewport" reset button, allowing users to comfortably write and inspect documents without outer page scrolling.',
                type: 'feature'
            }
        ]
    },
    {
        version: '1.23.3',
        date: 'Nov 21, 2026',
        items: [
            {
                icon: Bug,
                title: 'Fix: Document Tools Initial Render Null File Guard',
                description: "Fixed a rendering crash across File to Markdown, PDF Watermark, and PDF to JPG where tool workspaces evaluated 'file.file.name' before a file was uploaded. Wrapped landing view in an empty file guard so the upload landing screen and feature grid render cleanly without crashing.",
                type: 'fix'
            }
        ]
    },
    {
        version: '1.23.2',
        date: 'Nov 21, 2026',
        items: [
            {
                icon: Scissors,
                title: 'High-Precision Trimmer Handles & Interactive Filmstrip Upgrade',
                description: 'Completely overhauled video trimming UX across Quick Video Editor and Video Trimmer: replaced clumsy, blocked range sliders with native Pointer Capture handles featuring wide 20px solid grip bars, white center pills, extended 36px hit targets for effortless selection at 0% and 100% video boundaries, draggable selection window body sliding, quick preset chips (Full Video, First 15s/30s, Last 30s), and Set Current [In]/[Out] steppers.',
                type: 'feature'
            }
        ]
    },
    {
        version: '1.23.1',
        date: 'Nov 21, 2026',
        items: [
            {
                icon: Maximize2,
                title: 'Quick Video Editor — Custom Aspect Ratio Dropdown & High-Density Layout',
                description: 'Replaced native HTML select and bulky cards with our bespoke dark minimalist dropdown menu. Features crisp icons per aspect ratio, platform descriptions (YouTube, Shorts/Reels, IG Feed, Cinematic), active state indigo leaks, click-outside dismissal, and custom resolution W×H inputs. Streamlined Layout sidebar saving >120px of vertical space.',
                type: 'feature'
            }
        ]
    },
    {
        version: '1.23.0',
        date: 'Nov 21, 2026',
        items: [
            {
                icon: Scissors,
                title: 'Quick Video Editor — Split at Playhead & Video Transport Bar',
                description: "Major editor upgrade: added Split Clip at Playhead (Scissors button & 'S' hotkey), dedicated video transport controls (Jump to Start, Nudge -1s/+1s, Frame Step -1f/+1f, Play/Pause with Space), interactive scrubbable multi-clip timeline, and Move Earlier / Move Later clip reordering.",
                type: 'feature'
            },
            {
                icon: Zap,
                title: 'Video Engine & Compression Bug Fixes',
                description: "Fixed critical FFmpeg arguments: corrected Video Compressor auto-FPS bug where default source frame rate pushed '-r 0'; resolved WebM export container extension in Quick Video Editor; and enforced even-dimension scaling in Video Converter to eliminate libx264 crashes on odd resolutions.",
                type: 'fix'
            }
        ]
    },
    {
        version: '1.22.0',
        date: 'Oct 6, 2026',
        items: [
            {
                icon: Rocket,
                title: 'Studio Phase 0 — Agentic Video Creation (Internal Beta)',
                description: "New /studio foundation on the open-source HyperFrames composition engine (Apache-2.0, used via npm — see THIRD_PARTY_NOTICES.md). Describe a video and an AI model writes a HyperFrames composition; it is parsed and validated in-browser with @hyperframes/core and previewed on a real timeline with @hyperframes/player. Bring-your-own-key with two providers: Google Gemini (AI Studio key) or OpenRouter (one key, any model — Gemini 3.8 Flash and Claude Opus 5.5 recommended). Export today ships the standalone .html composition; in-browser MP4 export (mediabunny + WebCodecs) is on the roadmap. Behind the Coming Soon gate — open /studio?beta=studio to try it.",
                type: 'feature'
            },
        ],
    },
    {
        version: '1.21.0',
        date: 'Oct 3, 2026',
        items: [
            {
                icon: Bug,
                title: 'Full-Suite Integrity Pass — 41 Tools Audited & Fixed',
                description: "Company-wide audit of every tool for missing or broken basics. Fixed all fake/broken features (honest modes everywhere), then filled the missing-basics gaps: previews that lied, export mismatches, batch support, and format/quality controls across video, audio, image, docs, and design tools.",
                type: 'fix'
            },
            {
                icon: Zap,
                title: 'Video & GIF Export Engines',
                description: "Quick Video Editor: real offset crop, frame screenshots, MP3 extraction, MP4/WebM + fps/quality controls; per-clip mute and 0.25–4× speed now bake correctly into exports. Video Trimmer: speed/volume/loop now affect output, split-at-playhead multi-cut added. VideoConverter/Compressor gained trim/mute/speed/mute/fps. All GIF/APNG tools gained loop-count, reverse, palette-quality and fps/resize controls; Video-to-APNG now actually outputs APNG.",
                type: 'update'
            },
            {
                icon: Music,
                title: 'Audio Engine Completion',
                description: "Normalize (loudnorm) across Trimmer/Converter/Merger; speed finally baked into Audio Trimmer exports; Merger crossfade & gap made real with per-track trim inputs and drag-reorder; Audio Replacer gained video preview, progress bar, offset, gain, mix-with-original and keep-video-length; Waveform exporter gained PNG raster download; mono/stereo + sample-rate controls app-wide.",
                type: 'update'
            },
            {
                icon: Scissors,
                title: 'Image Suite Level-up',
                description: "Background Remover adds Erase & Restore touch-up brushes; Image Editor gains crop mode + PNG/JPG/WEBP export; Resizer and Compressor are now batch tools with ZIP download; Cropper adds flip H/V; Splitter adds custom rows×cols grids + quality; Upscale now guarantees the promised 2×/4× size with canvas fallback.",
                type: 'update'
            },
            {
                icon: FileDown,
                title: 'Docs, Text & Dev Utilities',
                description: "Removed the fake PDF password and corrupt MOBI/AZW/EPUB paths. Text Compare gained ignore-case/trim-lines/word-level diff; Text→PDF gained paper size, orientation, fonts & page numbers; PDF→JPG adds PNG; PDF→Text adds page ranges & batch; JSON gets indent/sort-keys/error positions; CSV tools fix delimiter & header handling; Text Cleaner expanded with 6 cleaning ops.",
                type: 'update'
            },
            {
                icon: Sparkles,
                title: 'Design & Web Polish',
                description: "SVG Converter now really converts (PNG/JPG raster export); SVG→Code gained Optimizer and real .svg download; Signature Generator ships transparent-PNG download (dead MP4 state removed); Font Previewer supports uploaded custom fonts; Color Tool gains eyedropper, CSS vars/Tailwind/JSON palette exports; Device Mockup gains JPEG export; gradients gain SVG export.",
                type: 'update'
            },
            {
                icon: Layers,
                title: 'Paste Anywhere',
                description: "The shared uploader now accepts Ctrl+V clipboard images across every tool, keeping drag-and-drop and multi-file intact.",
                type: 'feature'
            },
            {
                icon: Type,
                title: 'Honest, Privacy-First Wording',
                description: 'Repo-wide wording sweep: "Add" replaces "Upload" as the action verb across all 53 tools (Add Files, Add Video, Add Music) — files are processed in your browser, never sent to a server, and negative privacy claims like "never uploaded" were deliberately kept. New tools must follow the wording rule now codified in the design guidelines. The Quick Editor CROP section also moved up beside Layout so the Crop toggle is visible without scrolling.',
                type: 'update'
            },
            {
                icon: Crop,
                title: 'Quick Editor: Crop On-Canvas, Cleaner Player & Export',
                description: 'Crop is now done directly on the video: toggle Crop on the preview and drag any of the 8 handles (4 corners + 4 edges) or grab the frame center to move it — with rule-of-thirds guides, dark windowing and Reset. The Playback Speed slider was removed (pills only), and Audio moved into the player itself as a mute pill with a volume slider. The export panel was redesigned to house style: grouped Export Format / Frame Rate / Quality with labeled pill groups replacing the default dropdowns, and the mysterious "mp3" tile is now a labeled "MP3 Audio" extract button next to "PNG Frame".',
                type: 'update'
            },
            {
                icon: GitBranch,
                title: 'JSON Formatter Released + Live Smoke Tests',
                description: "The previously unreleased JSON Formatter tool is now registered under Developer tools (indent 2/4/tab, sort keys, line/column error positions). All headline fixes verified in-browser with real files: crop export (640\u00d7360 \u2192 384\u00d7216), frame screenshots & MP3 extraction, merger crossfade ffprobe-verified at 4.5s, batch resizer ZIP with WebP 400\u00d7300\u00d73, video-trimmer middle-cut export at 2.5s, and audio replacement with keep-video-length padding.",
                type: 'update'
            }
        ]
    },

    {
        version: '1.20.0',
        date: 'Sep 23, 2026',
        items: [
            {
                icon: Bug,
                title: 'Backlog Blitz: Silent Data Loss & Memory Leaks Fixed',
                description: 'Doc Converter now writes real multi-chapter EPUBs (readers rejected the old HTML-as-EPUB), preserves Unicode text, guards empty spreadsheets, and never deadlocks on unreadable files. Fixed render-per-frame URL leaks, the GIF MEMFS leak, and rolled leak-proof URL state out to all 12 media tools.',
                type: 'fix'
            },
        ]
    },
    {
        version: '1.19.0',
        date: 'Sep 23, 2026',
        items: [
            {
                icon: Lock,
                title: 'Sandboxed Execution for Community Tools (Experimental)',
                description: 'Tools can now opt into opaque-origin iframe isolation via "sandbox": true — no parent DOM, cookies, or storage access, narrower CSP, failures still reported to /health. Recipe Runner pilots it.',
                type: 'security'
            },
        ]
    },
    {
        version: '1.18.0',
        date: 'Sep 23, 2026',
        items: [
            {
                icon: Layers,
                title: 'Unified Tool Framework Rollout',
                description: 'All 34 file-based tools now share the standard ToolShell upload view and leak-free useToolFile state — consistent headers, feature grids, error display, and automatic preview-URL cleanup everywhere, plus footer/header slots for credits and model pickers.',
                type: 'update'
            },
        ]
    },
    {
        version: '1.17.0',
        date: 'Sep 23, 2026',
        items: [
            {
                icon: Zap,
                title: 'Faster First Paint: Deterministic Vendor Chunks',
                description: 'First-paint JS dropped from ~1.1MB to ~75KB gzip. Heavy engines (PDF, docs, capture, AI) now load only when their tool opens, vendor files keep stable URLs across deploys for long-term caching, and the embedded blog remover lazy-loads below the fold.',
                type: 'feature'
            },
        ]
    },
    {
        version: '1.16.0',
        date: 'Sep 23, 2026',
        items: [
            {
                icon: Zap,
                title: 'Recipe Runner: Community Presets That Execute',
                description: 'Lane 1 is now end-to-end: pick a JSON preset, drop a file, download. FFmpeg and image recipes run locally with the args shown upfront; document recipes explain they need a code tool instead of failing obscurely.',
                type: 'feature'
            },
        ]
    },
    {
        version: '1.15.0',
        date: 'Sep 23, 2026',
        items: [
            {
                icon: Lock,
                title: 'CSP Now Enforced by CI',
                description: 'Every network/image host in code and manifests must be covered by the Content-Security-Policy or CI fails. Cleanup removed dead avatar/thumbnail hosts, fixed silently-blocked GIF captions and transparency grids, and declared per-tool network permissions.',
                type: 'security'
            },
        ]
    },
    {
        version: '1.14.0',
        date: 'Sep 23, 2026',
        items: [
            {
                icon: Layers,
                title: 'All 67 Tools Migrated to Manifest Registry',
                description: 'Every tool now lives in tools/<id>/ with a manifest (metadata, permissions) and lazy-loaded component. The Dashboard registry is fully generated, new tools load on demand, and the sitemap regenerates automatically.',
                type: 'update'
            },
        ]
    },
    {
        version: '1.13.0',
        date: 'Sep 23, 2026',
        items: [
            {
                icon: Scale,
                title: 'Open Source Under AGPL-3.0',
                description: 'The codebase is now open for contributions: manifest-based tool registry with lazy loading, recipes lane for presets, ToolShell + useToolFile SDK, scaffold CLI, and CI gates (typecheck, permission lint, scope guard, secret scan, bundle budget). See CONTRIBUTING.md and the open-source footer link.',
                type: 'feature'
            },
            {
                icon: Users,
                title: 'Two Contribution Lanes',
                description: 'Recipes (JSON presets, merge fast) and code tools (tools/<id>/ with manifest permissions + human review). Tool PRs can no longer touch the shell, lockfile, CSP, or analytics — enforced by CI.',
                type: 'update'
            },
        ]
    },
    {
        version: '1.12.0',
        date: 'Sep 23, 2026',
        items: [
            {
                icon: Maximize2,
                title: 'Fullscreen Focus Mode for Every Tool',
                description: 'New fullscreen toggle in each tool toolbar (or press F): hides the header, breadcrumbs, and guide sections and stretches the workspace edge-to-edge, using the native Fullscreen API with graceful fallback. ESC exits. Mobile gets a floating button plus hidden nav chrome.',
                type: 'feature'
            },
            {
                icon: Layers,
                title: 'Adobe-Style Page Rail in PDF Preview',
                description: 'The full-page preview now has a left thumbnail rail for one-click page jumping, and the grid expand button moved to the top-left so it never covers the selection checkmark again.',
                type: 'fix'
            },
            {
                icon: RotateCw,
                title: 'Single-Page Rotate Without the Friction',
                description: 'Hover (or tap) any page for instant ⟲ ⟳ quick-rotate with a live angle badge — no selection needed. After Process, thumbnails and preview render the actual output so the workspace always matches the download, and rotating again keeps stacking on the last result.',
                type: 'feature'
            },
        ]
    },
    {
        version: '1.11.2',
        date: 'Sep 22, 2026',
        items: [
            {
                icon: ShieldCheck,
                title: 'Tool Health Monitoring (Self-Reporting Failures)',
                description: 'Every tool is now wrapped in a crash boundary that logs failures automatically. A new /health dashboard shows the failure log with per-tool counts, and a global hook captures unhandled errors (also sent to analytics as tool_failure events). Run npm run audit:tools before deploy for the static pre-flight check (PDF worker version match, CORS-loop patterns, null-crash guards).',
                type: 'feature'
            },
            {
                icon: Bug,
                title: 'PDF Engine Hardening (All 7 PDF Tools)',
                description: 'Centralized PDF.js worker setup with local-first + version-pinned CDN fallback, PDF magic-byte validation, password/encrypted/corrupt specific error messages, and worker memory cleanup (destroy/page cleanup) on every tool. Fixed silent export failures in Watermark and Suite, and null-filename crashes in converters.',
                type: 'fix'
            },
            {
                icon: Zap,
                title: 'Avatar CORS Loop Eliminated (Production Sync)',
                description: 'Removed crossOrigin="anonymous" from sponsor avatars and replaced dead external avatar URLs (404ing profile image + ui-avatars fallback returning duplicate ACAO headers) with local data-URI initials. This stops the hundreds-strong CORS error spam seen on adopecanva.com. DeviceMockup external screenshots now fall back to plain display instead of blanking.',
                type: 'fix'
            },
        ]
    },
    {
        version: '1.11.1',
        date: 'Sep 22, 2026',
        items: [
            {
                icon: Bug,
                title: 'PDF Redactor "Could not open PDF" Fix',
                description: 'Resolved a PDF.js worker version mismatch that caused all PDF tools (Redactor, PDF to JPG, PDF to Text, Doc Converter) to fail with "Could not open PDF — make sure it is valid or unencrypted" on any PDF upload. The issue was the bundled pdf.worker.min.mjs was outdated (v3.x) while the app was using pdfjs-dist v5.7.284. Updated the worker file to match.',
                type: 'fix'
            },
            {
                icon: Cpu,
                title: 'BiRefNet Model Updated to BG0 Engine (studioludens/birefnet-lite-512)',
                description: 'Fixed a 404 error where BiRefNet background removal failed with "Could not locate model_quantized.onnx". Root cause: Transformers.js defaulted to quantized dtype in browsers. Updated to the exact model powering bg0.dev (studioludens/birefnet-lite-512) with explicit dtype: fp16 → fp32 fallback chain. Browser memory usage reduced from ~183MB to ~94MB.',
                type: 'fix'
            },
        ]
    },
    {
        version: '1.11.0',
        date: 'Sep 16, 2026',
        items: [
            {
                icon: Eraser,
                title: 'Remove.bg Alternative & Smart Background Remover 2.0',
                description: 'Supercharged on-device AI background removal with full-resolution 4K+ export, 100% private in-browser WebAssembly execution, zero server uploads, and comprehensive FAQ & How-To schemas for zero-bounce SERP dominance.',
                type: 'feature'
            },
            {
                icon: Cpu,
                title: 'Multi-Model AI Selector (BiRefNet BG0 & MODNet)',
                description: 'Users can now choose between multiple browser-native, 100% open-source (Apache-2.0) neural networks: BiRefNet (the ultra-HD bilateral reference network behind bg0.dev) and MODNet (fast 25MB portrait specialist). Compare cutouts in real-time with full commercial usage rights and zero server uploads.',
                type: 'feature'
            },
            {
                icon: GitCompare,
                title: 'Remove.bg Head-to-Head Comparison Matrix',
                description: 'Launched dedicated /vs/remove-bg comparison hub detailing resolution limits, privacy tradeoffs, per-image credit costs ($0 vs $0.20–$1.99), and offline browser capabilities.',
                type: 'feature'
            },
            {
                icon: Layers,
                title: 'Cornerstone Blog Guide with Live Embedded Remover',
                description: 'Published interactive pillar guide (/remove-bg-alternative) featuring an embedded, instant-run background remover widget, technical architecture breakdown, and copyable embed codes for creators and webmasters.',
                type: 'feature'
            }
        ]
    },
    {
        version: '1.10.0',
        date: 'Sep 14, 2026',
        items: [
            {
                icon: FileAudio,
                title: 'Audio Extractor (Video to MP3)',
                description: 'New AUDIO & VIDEO tool: Extract crystal-clear audio tracks, background music, or dialogue from any video file (MP4, MOV, MKV, WebM, AVI, etc.) directly in your browser. Supports MP3 (up to 320kbps studio quality), WAV, AAC, M4A, FLAC, and OGG formats with stereo/mono channel options, custom segment extraction, and zero server uploads.',
                type: 'feature'
            },
            {
                icon: Palette,
                title: 'Image Color Palette Extractor',
                description: 'New IMAGE tool: Drop any image to extract dominant color palettes using spatial 3D color quantization. Generate mood variations (Vibrant, Muted, Pastel, Dark, Light), sample custom points with the interactive eyedropper, copy CSS Variables and Tailwind snippets, or export high-res PNG swatch cards.',
                type: 'feature'
            },
            {
                icon: EyeOff,
                title: 'EXIF Metadata Stripper & Inspector',
                description: 'New IMAGE & PRIVACY tool: Deep audit and eradication of private metadata from photos before sharing. Inspect embedded GPS geo-coordinates with interactive map links, camera specs, and lens models. Features 100% lossless binary segment stripping that leaves original image quality untouched.',
                type: 'feature'
            },
            {
                icon: Stamp,
                title: 'PDF Watermark & Page Numberer',
                description: 'New DOCS tool: Stamp diagonal or horizontal confidential watermarks (CONFIDENTIAL, DRAFT, SAMPLE, custom text) with adjustable opacity, angle, and page ranges. Also add customized headers and footers with flexible page numbering templates and live multi-page PDF canvas previews.',
                type: 'feature'
            },
            {
                icon: Rocket,
                title: 'Feature Roadmap & Community Voting',
                description: 'Seeded community-requested candidate tools into the interactive Roadmap with local persistence for submitting and upvoting features.',
                type: 'update'
            },
            {
                icon: Lock,
                title: '100% Free & Private On-Device Suite',
                description: 'Completed migration of all AI and media tooling to 100% client-side WebAssembly and Transformers.js models. Zero API keys, zero cloud fees, and complete data privacy.',
                type: 'update'
            }
        ]
    },
    {
        version: '1.9.0',
        date: 'Aug 22, 2026',
        items: [
            {
                icon: Eraser,
                title: 'Local In-Browser Background Remover',
                description: 'Private, 100% on-device neural background matting powered by Transformers.js and Xenova/modnet under Apache-2.0. Requires zero API keys and zero server uploads with live model download progress and clean alpha transparency.',
                type: 'feature'
            },
            {
                icon: Smartphone,
                title: 'Social Mockup Checker',
                description: 'New IMAGE tool: preview Instagram & Meta Stories, Reels, Feed Posts (1:1 and 4:5), Carousels, and Ads inside an interactive 3D phone mockup. Features official Meta safe zone guides (top/bottom obstruction zones & 1:1 profile grid crop), Instagram UI overlays, multi-slide carousel support, 3D tilt/finish controls, and high-res PNG export.',
                type: 'feature'
            },
            {
                icon: Music,
                title: 'Audio Trimmer 2.0',
                description: 'Complete UX overhaul: instant click-to-seek playback from any waveform position, tactile solid purple boundary handles with centered white grip pills, compact side-by-side time boundaries and fade sliders, sticky action footer, and prominent "Change Audio" navigation.',
                type: 'feature'
            },
            {
                icon: Scissors,
                title: 'Video Trimmer 2.0',
                description: 'Upgraded Video Trimmer with tactile solid purple handles, sub-timeline status strip (Start / Duration / End), compact side-by-side In/Out steppers with integrated quick preset chips (15s, 30s, 60s, Last 30s, Full Video), and sticky export action footer.',
                type: 'feature'
            },
            {
                icon: Sparkles,
                title: 'Studio Upload Standardization',
                description: 'Standardized upload landing interfaces across media tools (Audio Trimmer, Video Trimmer, Audio Merger) to strictly follow the golden single-layer glowing dropzone and 4-card feature grid design.',
                type: 'update'
            }
        ]
    },
    {
        version: '1.8.0',
        date: 'Jul 23, 2026',
        items: [
            {
                icon: Scissors,
                title: 'Image Splitter',
                description: 'New IMAGE tool: split any wide or tall image into perfectly-sized slices for seamless Instagram carousels and stories. Includes presets for 1080×1350 portrait carousel, 1080×1080 square, and 1080×1920 story. Features a live split-line overlay, individual PNG downloads, and bulk ZIP export — all client-side.',
                type: 'feature'
            }
        ]
    },
    {
        version: '1.7.0',
        date: 'Apr 12, 2026',
        items: [
            {
                icon: GitCompare,
                title: 'Text Compare Tool',
                description: 'New TEXT tool: paste two versions of any text and get a side-by-side LCS diff with colour-coded added (green) and removed (red) lines plus an added/removed/unchanged summary.',
                type: 'feature'
            },
            {
                icon: Palette,
                title: 'Gradient Creator',
                description: 'New IMAGE tool: design linear, radial, and conic gradients with unlimited colour stops, angle control, 8 one-click presets, and export at any resolution as PNG or JPEG.',
                type: 'feature'
            },
            {
                icon: FileDown,
                title: 'File to Markdown',
                description: 'New DOCS tool: convert PDFs, DOCX, CSV, JSON, YAML, XML, HTML, and plain text to clean Markdown — fully in-browser using PDF.js, Mammoth, and PapaParse.',
                type: 'feature'
            },
            {
                icon: Type,
                title: 'Font Previewer',
                description: 'New DEV tool: browse 100+ curated Google Fonts with your own preview text. Click any font for a full weight showcase, alphabet sample, heading/body mockup, and copy-ready CSS snippet.',
                type: 'feature'
            }
        ]
    },
    {
        version: '1.6.0',
        date: 'Mar 14, 2026',
        items: [
            {
                icon: Sparkles,
                title: 'HTML to Image',
                description: 'New DEV tool: write HTML & CSS in a live code editor, preview the result in real-time, and export as PNG, JPEG, or WebP at up to 3× resolution — all in-browser with html2canvas.',
                type: 'feature'
            },
            {
                icon: Zap,
                title: 'UI/UX Consistency Pass',
                description: 'Comprehensive brand and interaction polish across 35+ tools: unified indigo-500 accent, consistent focus rings, indigo hover states on interactive cards, redesigned QR Generator, improved select element styling.',
                type: 'update'
            }
        ]
    },
    {
        version: '1.5.2',
        date: 'Mar 14, 2026',
        items: [
            {
                icon: GitBranch,
                title: 'Batch HTML Studio',
                description: 'Complete overhaul of the HTML to Image tool into a two-step studio workflow. Added multi-file queue management, isolated Iframe rendering, and bulk ZIP export.',
                type: 'update'
            },
            {
                icon: Zap,
                title: 'Signature Engine Fix',
                description: 'Resolved a critical "Protocol Error" in the WASM processing engine. Improved encoding stability for transparent GIFs and simplified the export UI.',
                type: 'fix'
            },
            {
                icon: Sparkles,
                title: 'UI Stability Prep',
                description: 'Refined split-button layouts and added proactive error recovery for browser-based media tools.',
                type: 'update'
            }
        ]
    },
    {
        version: '1.5.1',
        date: 'Mar 14, 2026',
        items: [
            {
                icon: GitBranch,
                title: 'HTML to Image',
                description: 'New design tool: Convert HTML and CSS snippets into high-quality PNG, JPG, or WebP images with custom resolution and retina scaling.',
                type: 'feature'
            }
        ]
    },
    {
        version: '1.5.0',
        date: 'Mar 13, 2026',
        items: [
            {
                icon: Sparkles,
                title: 'SVG Code to SVG',
                description: 'New DEV tool: paste raw SVG markup, preview it live with dark/light/transparent backgrounds, validate in real-time, and download a clean .svg file.',
                type: 'feature'
            }
        ]
    },
    {
        version: '1.4.0',
        date: 'Feb 19, 2026',
        items: [
            {
                icon: Rocket,
                title: 'Product Hunt Launch',
                description: 'We are officially LIVE on Product Hunt! Check out our new featured badge on the site and support our community launch.',
                type: 'feature'
            },
            {
                icon: Layers,
                title: 'Markdown Creator Launch',
                description: 'A revolutionary text-based UI design tool using Unicode/ASCII characters for AI prompt engineering and mockups.',
                type: 'feature'
            },
            {
                icon: Zap,
                title: 'AI Magic Build & Sync',
                description: 'Integrated Gemini 2.0 Flash for instant UI generation from text prompts, with integrated template chips and persistent API settings.',
                type: 'feature'
            },
            {
                icon: Sparkles,
                title: 'Workspace & UX Polish',
                description: 'Optimized layout for high-density viewports, added Pro Mode history (Undo/Redo), and refined keyboard shortcuts.',
                type: 'update'
            },
            {
                icon: Layers,
                title: 'Text Utilities Improvements',
                description: 'Refined sentence parsing algorithm with SBD rules and added a visual sentence merging UI in the Text Utilities tool.',
                type: 'feature'
            },
            {
                icon: Zap,
                title: 'Image to ICO Converter',
                description: 'Added a new client-side tool to convert any image into multi-resolution .ico files with ZIP download support.',
                type: 'feature'
            }
        ]
    },
    {
        version: '1.3.0',
        date: 'Jan 31, 2026',
        items: [
            {
                icon: Zap,
                title: 'New Efficiency Tools',
                description: 'Launched 4 new power tools: Image Converter, Text Utilities, Code Formatter, and Signature Generator.',
                type: 'feature'
            },
            {
                icon: Sparkles,
                title: 'Design System Unification',
                description: 'Standardized the UI across all 20+ tools with a consistent "Unbounded" header style and modern aesthetic.',
                type: 'update'
            },
            {
                icon: Layers,
                title: 'PDF & Media Studio Polish',
                description: 'Refined the PDF Suite and Audio tools with cleaner layouts, invisible icon fixes, and better spacing.',
                type: 'fix'
            }
        ]
    },
    {
        version: '1.2.1',
        date: 'Jan 10, 2026',
        items: [
            {
                icon: Layers,
                title: 'Text Tool Power-Up',
                description: 'Added support for multi-line text (Enter key) and fixed a critical layer deletion bug when using backspace.',
                type: 'feature'
            },
            {
                icon: Music,
                title: 'Audio Precision Control',
                description: 'Introduced a new dual-handle slider for the Video/Audio Trimmer for frame-perfect loop selection.',
                type: 'feature'
            },
            {
                icon: Bug,
                title: 'Navigation & UI Polish',
                description: 'Fixed header tab syncing when navigating to tools and refined button layouts in the Sidebar.',
                type: 'fix'
            }
        ]
    },
    {
        version: '1.2.0',
        date: 'Jan 07, 2026',
        items: [
            {
                icon: Rocket,
                title: 'Studio Guard',
                description: 'Locked the advanced Studio features behind a "Coming Soon" splash page for later release.',
                type: 'update'
            },
            {
                icon: Sparkles,
                title: 'Image Editor Fix & Launch',
                description: 'The basic Image Editor is now LIVE with visibility fixes confirmed.',
                type: 'feature'
            },
            {
                icon: Bug,
                title: 'Image Editor Visibility Fix',
                description: 'Resolved a critical bug where uploaded images were not rendering on the canvas when filters were disabled.',
                type: 'fix'
            },
            {
                icon: Sparkles,
                title: 'Global Header Refresh',
                description: 'Updated all 20+ tool headers with the "Unbounded" font and consistent Lucide icons.',
                type: 'update'
            },
            {
                icon: GitBranch,
                title: 'Infrastructure Cleanup',
                description: 'Resolved repository sync issues and sanitized local environment configuration.',
                type: 'update'
            }
        ]
    },
    {
        version: '1.1.0',
        date: 'Jan 05, 2024',
        items: [
            {
                icon: Layers,
                title: 'Feature Roadmap Board',
                description: 'Launched a community board to request and vote on new features for Omniedit.',
                type: 'feature'
            },
            {
                icon: Zap,
                title: 'Audio Trimmer Tool',
                description: 'Added a powerful new audio trimming tool with waveform visualization.',
                type: 'feature'
            },
            {
                icon: Lock,
                title: 'Security Enhancements',
                description: 'Implemented Content Security Policies for Google AdSense and Analytics integration.',
                type: 'security'
            }
        ]
    }
];

export const Changelog = () => {
    return (
        <div className="space-y-8 animate-fade-in flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-end shrink-0">
                <span className="text-[10px] font-mono text-zinc-500 bg-zinc-800/50 px-2 py-1 rounded border border-zinc-700/50 uppercase tracking-widest">
                    Version History
                </span>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-10 min-h-[300px]">
                {CHANGES.map((release, idx) => (
                    <div key={release.version} className="relative pl-6 border-l border-zinc-800">
                        {/* Dot on timeleline */}
                        <div className="absolute left-[-5px] top-0 w-[9px] h-[9px] rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.5)]" />

                        <div className="flex items-center gap-3 mb-6">
                            <h4 className="text-lg font-bold text-white leading-none">v{release.version}</h4>
                            <span className="text-xs font-medium text-zinc-500 px-2 py-0.5 bg-zinc-900 rounded-full border border-zinc-800">
                                {release.date}
                            </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {release.items.map((item, i) => (
                                <div key={i} className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-4 hover:border-zinc-700 transition-colors group">
                                    <div className="flex items-start gap-3">
                                        <div className={`p-2 rounded-xl shrink-0 ${item.type === 'feature' ? 'bg-indigo-500/10 text-indigo-400' :
                                            item.type === 'fix' ? 'bg-green-500/10 text-green-400' :
                                                item.type === 'security' ? 'bg-amber-500/10 text-amber-400' :
                                                    'bg-zinc-800 text-zinc-400'
                                            }`}>
                                            <item.icon size={18} />
                                        </div>
                                        <div>
                                            <h5 className="text-sm font-bold text-zinc-200 mb-1 group-hover:text-white transition-colors">
                                                {item.title}
                                            </h5>
                                            <p className="text-xs text-zinc-500 leading-relaxed">
                                                {item.description}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {idx !== CHANGES.length - 1 && <div className="mt-10" />}
                    </div>
                ))}
            </div>
        </div>
    );
};
