---
description: Create a new tool in the AdopeCanva tool suite
---
# How to Create a New Tool for AdopeCanva

When asked to create a new tool in AdopeCanva, it is CRITICAL to follow the established design system and layout structure so the application feels cohesive and premium.

## 1. Upload/Initial State Layout
Every tool that requires user input (especially file uploads) MUST use the following standardized layout for the initial view when no file/data is selected:

```tsx
if (!file) {
    return (
        <div className="container mx-auto px-6 h-[85vh] flex flex-col justify-center animate-fade-in text-center">
            {/* 1. Header Section */}
            <div className="flex-none space-y-3 mb-10">
                <h2 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-[ThemeColor]-400 to-[ThemeColor]-600 flex items-center justify-center gap-3 font-unbounded">
                    <IconName size={32} /> Tool Name
                </h2>
                <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
                    Brief description of the tool.
                </p>
            </div>

            {/* 2. Upload Area / Input Area */}
            <div className="flex-1 w-full max-w-4xl mx-auto bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-2 flex flex-col items-center justify-center relative overflow-hidden group hover:border-[ThemeColor]-500/50 transition-colors shadow-2xl">
                <div className="absolute inset-0 bg-gradient-to-br from-[ThemeColor]-500/5 to-[ThemeColor]-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <FileUploader
                    onFileSelect={setFile}
                    accept="format/*"
                    label="Upload File"
                    description="Supported formats"
                    className="w-full h-full border-2 border-dashed border-zinc-800 hover:border-[ThemeColor]-500/50 bg-zinc-950/50 rounded-2xl transition-all"
                />
            </div>

            {/* 3. Feature Highlights (4-Column Grid) - VITAL FOR CONSISTENCY */}
            <div className="flex-none max-w-4xl mx-auto w-full grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
                {[
                    { icon: Icon1, label: 'Feature 1', desc: 'Slogan 1' },
                    { icon: Icon2, label: 'Feature 2', desc: 'Slogan 2' },
                    { icon: Icon3, label: 'Feature 3', desc: 'Slogan 3' },
                    { icon: Icon4, label: 'Feature 4', desc: 'Slogan 4' }
                ].map((feat, i) => (
                    <div key={i} className="flex flex-col items-center text-center space-y-2 p-4 rounded-xl bg-zinc-900/30 border border-zinc-800/30 backdrop-blur-sm hover:bg-zinc-900/50 transition-colors cursor-default group">
                        <div className="p-2 bg-[ThemeColor]-500/10 rounded-full text-[ThemeColor]-400 group-hover:scale-110 group-hover:bg-[ThemeColor]-500/20 transition-all">
                            <feat.icon size={20} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-zinc-200">{feat.label}</h3>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wide font-bold mt-1 group-hover:text-zinc-400 transition-colors">{feat.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
```

## 2. General Styling Guidelines
*   **Backgrounds**: Use `bg-zinc-900`, `bg-zinc-950`, and dark neutral colors.
*   **Borders**: Soft thin borders like `border-zinc-800` or `border-zinc-800/50`.
*   **Accents**: Use subtle color leaks. The primary accent for "AdopeCanva" is a hint of indigo (`#4F46E5`), but individual tools can have their own theme color (e.g., green for PDF, blue for AI upscaling, indigo for image conversion). Use these colors sparingly for *leaks, glows, borders, and active states*.
*   **Typography**: Utilize `@fontsource/unbounded` (`font-unbounded`) strictly for main tool headers and impactful big numbers. The rest should use standard sans-serif (Inter).
*   **Animations**: Ensure everything feels smooth by using standard Tailwind transitions (`transition-all duration-300`). Use `animate-fade-in` or `animate-slide-up` for new elements rendering on the screen.

## 3. Creating the Component (open-source lanes — see CONTRIBUTING.md)

**Lane 1 first:** if the idea is a preset (FFmpeg args, conversion settings,
resize profile), add a JSON file in `recipes/` — no component needed.

**Lane 2 (custom UI):**
1. Scaffold: `npm run new:tool -- --id=my-tool --title="My Tool" --category=image`
2. Fill in `tools/my-tool/manifest.json` (permissions!) and build the workspace
   in `tools/my-tool/index.tsx` (default export) using `<ToolShell>` +
   `useToolFile()`. There is no `views/tools/index.ts` — the registry is
   generated (`npm run registry:build`) from manifests.
3. Do NOT touch the shell: `App.tsx`, `views/Dashboard.tsx`, `index.html`,
   `vite.config.ts`, `package.json`, analytics, CSP. CI scope-guard fails
   PRs that do.
4. Verify the `FileUploader` component is imported if files are needed.

FOLLOW THIS WORKFLOW EVERY TIME TO ENSURE UI CONSISTENCY ACROSS THE SUITE.
