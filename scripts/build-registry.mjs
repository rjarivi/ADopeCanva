/**
 * Registry codegen: `npm run registry:build` (also runs on `prebuild`).
 *
 * Scans `tools/<id>/manifest.json` and emits:
 *  1. `utils/toolRegistry.generated.ts` — lazy-loaded ToolItem entries.
 *     Dashboard concatenates these; contributors never hand-edit it.
 *  2. `public/sitemap.xml` — static routes + Dashboard tool ids + manifests.
 *
 * Manifest schema (see tools/_template/manifest.json):
 *   id, title, description, category, icon (lucide name), popular?,
 *   guideTitle?, guideContent?, faqs?, specs?, privacyNotes?,
 *   seoTitle?, metaDescription?, keywords?,
 *   permissions: { network: string[] }   // hosts the tool may call
 */
import { readdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const TOOLS_DIR = join(ROOT, 'tools');
const OUT_PATH = join(ROOT, 'utils/toolRegistry.generated.ts');
const SITEMAP_PATH = join(ROOT, 'public/sitemap.xml');
const DASHBOARD_PATH = join(ROOT, 'views/Dashboard.tsx');

const CATEGORIES = ['Video', 'Audio', 'Image', 'Docs', 'Text', 'Developer'];

// Manifest icon names that are local aliases of a different lucide export.
const LUCIDE_ALIASES = { ImageIcon: 'Image as ImageIcon' };

// Non-tool routes, preserved from the hand-maintained sitemap.
const STATIC_ROUTES = [
    '/',
    '/guides',
    '/health',
    '/remove-bg-alternative',
    '/blog/remove-bg-alternative',
    '/category/image',
    '/category/video',
    '/category/audio',
    '/category/docs',
    '/category/text',
    '/category/dev',
    '/category/converters',
    '/vs/remove-bg',
    '/vs/ezgif',
    '/vs/tinypng',
    '/vs/ilovepdf',
    '/vs/cloudconvert',
    '/vs/canva',
    '/convert/png-to-webp',
    '/convert/heic-to-jpg',
    '/convert/svg-to-png',
    '/convert/webp-to-png',
    '/convert/pdf-to-text',
    '/convert/text-to-pdf',
    '/convert/video-to-gif',
    '/convert/svg-to-code',
    '/convert/file-to-markdown',
    '/image-converter/png-to-webp',
    '/image-converter/heic-to-jpg',
    '/image-converter/svg-to-png',
    '/image-converter/webp-to-png',
    '/mockup-generator',
    '/mockup-generator/iphone-mockup',
    '/mockup-generator/macbook-mockup',
    '/mockup-generator/browser-frame',
];

const failures = [];
const fail = (msg) => failures.push(msg);

function loadManifests() {
    const tools = [];
    if (!existsSync(TOOLS_DIR)) return tools;
    for (const dir of readdirSync(TOOLS_DIR, { withFileTypes: true })) {
        if (!dir.isDirectory() || dir.name.startsWith('_') || dir.name.startsWith('.')) continue;
        const mPath = join(TOOLS_DIR, dir.name, 'manifest.json');
        if (!existsSync(mPath)) { fail(`tools/${dir.name}: missing manifest.json`); continue; }
        let m;
        try {
            m = JSON.parse(readFileSync(mPath, 'utf8'));
        } catch (e) {
            fail(`tools/${dir.name}/manifest.json: invalid JSON (${e.message})`);
            continue;
        }
        if (m.id !== dir.name) fail(`tools/${dir.name}: manifest id "${m.id}" must match directory name`);
        for (const f of ['title', 'description', 'category', 'icon']) {
            if (!m[f] || typeof m[f] !== 'string') fail(`tools/${dir.name}: manifest.${f} is required`);
        }
        if (m.category && !CATEGORIES.includes(m.category)) {
            fail(`tools/${dir.name}: unknown category "${m.category}" (use ${CATEGORIES.join(', ')})`);
        }
        if (!m.permissions || !Array.isArray(m.permissions.network)) {
            fail(`tools/${dir.name}: manifest.permissions.network must be an array (use [] for offline tools)`);
        }
        if (m.iconFrom !== undefined && (typeof m.iconFrom !== 'string' || /^https?:/.test(m.iconFrom))) {
            fail(`tools/${dir.name}: manifest.iconFrom must be a local path, never a URL`);
        }
        const indexPath = join(TOOLS_DIR, dir.name, 'index.tsx');
        if (!existsSync(indexPath)) fail(`tools/${dir.name}: missing index.tsx (default export)`);
        tools.push(m);
    }
    return tools;
}

/** Tool ids still declared inline in Dashboard (legacy, being migrated). */
function dashboardIds() {
    const src = readFileSync(DASHBOARD_PATH, 'utf8');
    const ids = [];
    for (const m of src.matchAll(/^\s*id:\s*'([^']+)'/gm)) ids.push(m[1]);
    return ids;
}

function emitRegistry(tools) {
    // Preserve legacy Dashboard ordering (stable sort under popular-first).
    const sorted = [...tools].sort((a, b) => (a.order ?? 9999) - (b.order ?? 9999));
    const lucide = [...new Set(sorted.filter((t) => !t.iconFrom).map((t) => t.icon))].sort()
        .map((n) => LUCIDE_ALIASES[n] ?? n);
    const local = sorted.filter((t) => t.iconFrom);
    const hasLocalIcons = local.length > 0;
    const varName = (id) => id.replace(/[^a-zA-Z0-9]/g, '') + 'Tool';
    const lines = [
        '// GENERATED — do not edit. Run `npm run registry:build`.',
        "// Source of truth: tools/<id>/manifest.json + tools/<id>/index.tsx",
        "import { lazy, createElement } from 'react';",
        ...(lucide.length ? [`import { ${lucide.join(', ')} } from 'lucide-react';`] : []),
        ...(hasLocalIcons ? [`import type { LucideIcon } from 'lucide-react';`] : []),
        ...local.map((t) => `import { ${t.icon} } from '../${t.iconFrom}';`),
        "import type { ToolItem } from '../types';",
        "import { ToolCategory } from '../types';",
        '',
        ...sorted.map((t) => `const ${varName(t.id)} = lazy(() => import('../tools/${t.id}/index'));`),
        '',
        'export const GENERATED_TOOLS: ToolItem[] = [',
    ];
    for (const t of sorted) {
        // Pass through every manifest field except the contract internals
        // (permissions, order, iconFrom) — ToolItem carries the rest (swapId,
        // subRoutes, keywords, comingSoon, popular, faqs, specs, …).
        const { permissions, order, iconFrom, id, title, description, category, icon, ...rest } = t;
        void permissions; void order; void iconFrom;
        const entry = { id, title, description, ...rest };
        for (const k of Object.keys(entry)) if (entry[k] === undefined) delete entry[k];
        let json = JSON.stringify({ ...entry, category: `__CAT_${category}__` }, null, 4)
            .replace(/"__CAT_(.+?)__"/g, 'ToolCategory.' + String(category).toUpperCase().replace('DEVELOPER', 'DEV'));
        // Custom (non-lucide) icons are plain components — cast to LucideIcon
        // at the boundary so ToolItem stays strict for everything else.
        const iconExpr = t.iconFrom ? `${icon} as unknown as LucideIcon` : icon;
        lines.push(`    { ...${json}, icon: ${iconExpr}, component: createElement(${varName(id)}) },`);
    }
    lines.push('];', '');
    writeFileSync(OUT_PATH, lines.join('\n'));
    console.log(`wrote ${OUT_PATH} (${sorted.length} tool(s))`);
}

function emitSitemap(dashIds, tools) {
    const today = new Date().toISOString().slice(0, 10);
    const toolRoutes = [...new Set([...dashIds, ...tools.map((t) => t.id)])].sort();
    const url = (loc, freq, priority) =>
        `  <url>\n    <loc>https://adopecanva.com${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${freq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`;
    const parts = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
        ...STATIC_ROUTES.map((r) => url(r, r === '/' ? 'daily' : 'weekly', r === '/' ? '1.0' : '0.7')),
        ...toolRoutes.map((id) => url(`/${id}`, 'weekly', '0.8')),
        '</urlset>',
        '',
    ];
    writeFileSync(SITEMAP_PATH, parts.join('\n'));
    console.log(`wrote ${SITEMAP_PATH} (${STATIC_ROUTES.length + toolRoutes.length} urls)`);
}

const tools = loadManifests();
const dashIds = dashboardIds();
if (failures.length) {
    for (const f of failures) console.error('FAIL', f);
    process.exit(1);
}
emitRegistry(tools);
emitSitemap(dashIds, tools);
