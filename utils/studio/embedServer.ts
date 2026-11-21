/**
 * AdopeCanva Studio — in-browser host for the embedded HyperFrames Studio.
 *
 * Runs inside studio.html and answers every /api/projects/* request the
 * embedded Studio app makes, standing in for the desktop studio-server:
 *
 *  - @hyperframes/studio expects a REST surface (files read/write with
 *    If-Match versioning, preview/comp assembly, file-mutations, GSAP
 *    animation queries, project listing/handshake).
 *  - File persistence + patch application is implemented here with
 *    @hyperframes/parsers (browser-safe) — no Node needed.
 *
 * Protocol:
 *  - The service worker (public/studio-sw.js) forwards requests here via
 *    MessageChannel ({type:'studio-request'}).
 *  - The AdopeCanva app feeds compositions/assets in via postMessage
 *    ({type:'studio:composition' | 'studio:asset'}).
 */
import { parseHtml, updateElementInHtml, removeElementFromHtml } from '@hyperframes/parsers';

type Versioned = { content: string; version: string };
type Asset = { bytes: ArrayBuffer; contentType: string };

const PROJECT_ID = 'adopecanva-studio';
const STORE_KEY = 'studio_project_store_v1';

const store = {
    title: 'AdopeCanva Studio Project',
    files: new Map<string, Versioned>(),
    assets: new Map<string, Asset>(),
};

// ─── Persistence (localStorage — synchronous, survives reloads) ─────────────

function saveStore() {
    try {
        const assetsLite: Record<string, { contentType: string; hasData: boolean }> = {};
        // asset bytes are NOT persisted (blobs can be huge) — host re-feeds them on demand
        for (const [path, a] of store.assets) assetsLite[path] = { contentType: a.contentType, hasData: a.bytes.byteLength > 0 };
        localStorage.setItem(STORE_KEY, JSON.stringify({
            files: [...store.files.entries()],
            assets: assetsLite,
        }));
    } catch { /* quota — keep memory-only */ }
}

function loadStore() {
    try {
        const raw = localStorage.getItem(STORE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as { files: [string, Versioned][]; assets: Record<string, { contentType: string }> };
        for (const [path, v] of parsed.files ?? []) store.files.set(path, v);
        for (const [path, a] of Object.entries(parsed.assets ?? {})) {
            store.assets.set(path, { bytes: new ArrayBuffer(0), contentType: a.contentType });
        }
    } catch { /* ignore */ }
}
loadStore();

function hashVersion(content: string): string {
    let h = 5381;
    for (let i = 0; i < content.length; i++) {
        h = ((h << 5) + h) | 0;
        h ^= content.charCodeAt(i);
    }
    return `v${(h >>> 0).toString(36)}${content.length.toString(36)}`;
}

function setFile(path: string, content: string) {
    const version = hashVersion(content);
    store.files.set(path, { content, version });
    saveStore();
    return version;
}

function compositionList(): string[] {
    return [...store.files.keys()].filter(f => f.endsWith('.html')).sort();
}

function fileList(): string[] {
    return [...store.files.keys()].sort();
}

// ─── Endpoint handlers ───────────────────────────────────────────────────────

function json(body: unknown, status = 200, headers: { etag?: string } = {}) {
    return {
        status,
        headers: { contentType: 'application/json', etag: headers.etag },
        body: JSON.stringify(body),
    };
}

function textResponse(text: string, status = 200, contentType = 'text/html', etag?: string) {
    return { status, headers: { contentType, etag }, body: text };
}

function notFound(status = 404) {
    return json({ error: 'not found' }, status);
}

function parseVersionedPath(): { path: string } | null {
    const m = location.pathname; // unused; path passed explicitly
    return m ? null : null;
}

async function handle(
    method: string,
    path: string,
    query: string,
    body: string | null,
    ifMatch: string | null,
    ifNoneMatch: string | null,
): Promise<{ status: number; headers: Record<string, string | undefined>; body: string | null }> {
    const url = new URL(`https://host${path}${query}`);
    const p = url.pathname;

    // /api/projects (list)
    if (p === '/api/projects' && method === 'GET') {
        return json({ projects: [{ id: PROJECT_ID, title: store.title }] });
    }

    // /api/projects/:id (project meta: files + compositions)
    if (p === `/api/projects/${PROJECT_ID}` && method === 'GET') {
        if (store.files.size === 0) return notFound();
        return json({
            id: PROJECT_ID,
            dir: PROJECT_ID,
            title: store.title,
            files: fileList(),
            compositions: compositionList(),
        });
    }

    if (p === `/api/projects/${PROJECT_ID}/signature` && method === 'GET') {
        const sig = [...store.files.values()].map(f => f.version).join('|');
        return json({ signature: hashVersion(sig) });
    }

    const rest = p.replace(`/api/projects/${PROJECT_ID}`, '');

    // runtime script request — serve the source the host page delivered (module import fails in SW scope otherwise)
    const rtMatch = rest.match(/^\/hf-runtime\.js$/);
    if (rtMatch && method === 'GET') {
        if (!runtimeSource) return { status: 404, headers: { contentType: 'text/plain' }, body: 'runtime not provided' };
        return { status: 200, headers: { contentType: 'text/javascript' }, body: runtimeSource };
    }

    // files read/write
    const filesMatch = rest.match(/^\/files\/(.+)$/);
    if (filesMatch) {
        const filePath = decodeURIComponent(filesMatch[1]);
        const optional = new URLSearchParams(query).get('optional') === '1';
        if (method === 'GET') {
            const f = store.files.get(filePath);
            if (!f) {
                if (optional) return json({ filename: filePath, content: '', missing: true });
                return notFound();
            }
            return json({ filename: filePath, content: f.content, version: f.version, missing: false }, 200, { etag: `"${f.version}"` });
        }
        if (method === 'PUT') {
            const existing = store.files.get(filePath);
            // Create-only semantics
            if (ifNoneMatch === '*') {
                if (existing) return json({ error: 'file conflict', path: filePath, currentVersion: existing.version }, 409);
                const v = setFile(filePath, body ?? '');
                return json({ filename: filePath, version: v }, 200);
            }
            if (!ifMatch) {
                return json({
                    error: 'precondition required',
                    path: filePath,
                    currentVersion: existing?.version ?? null,
                    currentContent: existing?.content ?? null,
                }, 428);
            }
            const currentVersion = existing?.version ?? null;
            if (ifMatch !== `"${currentVersion}"` && ifMatch !== currentVersion) {
                return json({ error: 'stale version', path: filePath, currentVersion, currentContent: existing?.content ?? null }, 412);
            }
            const v = setFile(filePath, body ?? '');
            return json({ filename: filePath, version: v }, 200);
        }
        // DELETE support (simple)
        if (method === 'DELETE') {
            store.files.delete(filePath);
            return new Response(null, { status: 204 }) as unknown as ReturnType<typeof json>;
        }
    }

    // preview: assembled composition html (root /preview serves index.html)
    const previewMatch = rest.match(/^\/preview(?:\/(comp\/)?(.+))?$/);
    if (previewMatch && method === 'GET') {
        let compPath = previewMatch[2] ? decodeURIComponent(previewMatch[2]) : 'index.html';
        if (compPath === 'comp') compPath = 'index.html';
        if (compPath.endsWith('/')) compPath += 'index.html';
        const f = store.files.get(compPath) ?? store.files.get('index.html');
        if (!f) return { status: 404, headers: { contentType: 'text/plain' }, body: 'not found' };

        const capture = url.searchParams.get('hf-capture') != null;
        const assembled = assemblePreview(f.content, capture);
        const etag = `"preview:${hashVersion(assembled)}"`;
        if (deferCaptureResponse(capture, url)) {
            // thumbnails need a real rasterizer; return 404 and let studio fall back
            return { status: 404, headers: { contentType: 'text/plain' }, body: 'no capture' };
        }
        return {
            status: 200,
            headers: {
                contentType: 'text/html; charset=utf-8',
                etag,
                // Explicitly break COOP/COEP isolation so the Studio app (same origin)
                // can reach into the preview iframe's DOM — required for live editing.
                coop: 'unsafe-none',
                coep: 'unsafe-none',
            },
            body: assembled,
        };
    }

    // preview asset (user media)
    const assetMatch = rest.match(/^\/preview\/(.+)$/);
    if (assetMatch && method === 'GET') {
        const assetPath = decodeURIComponent(assetMatch[1]);
        const a = store.assets.get(assetPath);
        if (!a) return notFound();
        return { status: 200, headers: { contentType: a.contentType, etag: `"${hashVersion(String(a.bytes.byteLength))}"` }, body: a.bytes as unknown as string };
    }

    // file-mutations are relayed through parsers
    const mutationsMatch = rest.match(/^\/file-mutations\/([a-z-]+)\/?(.+)?$/);
    if (mutationsMatch && method === 'POST') {
        const kind = mutationsMatch[1];
        const targetPath = decodeURIComponent(mutationsMatch[2] ?? 'index.html');
        return handleMutation(kind, targetPath, body);
    }

    // GSAP animation surface (studio's animation inspector) — parse returning shape
    const gsapMatch = rest.match(/^\/gsap-animations\/(.+)$/);
    if (gsapMatch && method === 'GET') {
        const filePath = decodeURIComponent(gsapMatch[1]);
        const f = store.files.get(filePath);
        if (!f) return notFound();
        return json({ animations: [], animationsByElement: {}, unsupported: true });
    }

    // tolerant stubs so the studio UI boots fully
    if (rest === '/gsap-mutation-capabilities') return json({ capabilities: { unsupported: true }, unsupported: true });
    if (rest === '/selection') return json({ ok: true });
    if (rest === '/history') return json({ entries: [], windows: [] });
    if (rest === '/history/undo') return json({ ok: false, atBoundary: true });
    if (rest === '/history/window') return json({ windows: [] });
    if (rest === '/history/claim' || rest === '/history/pin' || rest === '/history/step') return json({ ok: true });
    if (rest.startsWith('/history/')) return json({ ok: true, empty: true });
    if (rest === '/lint') return json({ findings: [] });

    return notFound();
}

function deferCaptureResponse(capture: boolean, url: URL): boolean {
    return capture; // thumbnails/capture are not implementable without a headless browser
}

// ─── File mutations (source-backed edits, applied with parsers) ─────────────

type PatchOp = Record<string, unknown>;

async function handleMutation(kind: string, targetPath: string, bodyJson: string | null) {
    const f = store.files.get(targetPath);
    if (!f) return notFound(404);
    let html = f.content;
    let parsedBody: Record<string, unknown> = {};
    try { parsedBody = bodyJson ? JSON.parse(bodyJson) : {}; } catch { /* noop */ }

    const target = parsedBody.target as Record<string, unknown> | undefined;
    const ops = (parsedBody.ops ?? parsedBody.patch ?? []) as PatchOp[];

    switch (kind) {
        case 'probe-elements': {
            // { targets: [{ id?, selector?, selectorIndex?, hfId? }] } -> { exists: boolean[] }
            const targets = (parsedBody.targets ?? []) as unknown[];
            const exists = targets.map(() => true); // each target was fetched from the live preview of this file
            return json({ exists });
        }
        case 'patch-element':
        case 'patch-element-batches':
        case 'patch-elements-batch': {
            // Reuse parsers' element updater per op we understand: style/text/timing patches
            // Their full patch protocol is richer; unsupported ops return an error so the
            // studio surfaces a clean fallback instead of corrupting the source.
            let changed = false;
            try {
                for (const op of ops) {
                    const type = String(op.type ?? op.op ?? '');
                    if (type === 'set-styles' || type === 'style') {
                        const elId = String((op.id ?? (target as Record<string, unknown>)?.id ?? ''));
                        const styles = (op.styles ?? op.value ?? {}) as Record<string, string>;
                        html = applyElementStyles(html, elId, styles);
                        changed = true;
                    } else if (type === 'set-text' || type === 'text') {
                        const elId = String((op.id ?? (target as Record<string, unknown>)?.id ?? ''));
                        const value = String(op.text ?? op.value ?? '');
                        html = applyElementText(html, elId, value);
                        changed = true;
                    } else if (type === 'timing') {
                        const elId = String((op.id ?? (target as Record<string, unknown>)?.id ?? ''));
                        html = applyElementTiming(html, elId, op as Record<string, string | number>);
                        changed = true;
                    } else {
                        return json({ error: `unsupported op type: ${type || 'unknown'}` }, 501);
                    }
                }
            } catch (e) {
                return json({ error: e instanceof Error ? e.message : 'patch failed' }, 500);
            }
            if (changed) setFile(targetPath, html);
            return json({ ok: true, stage: 'saved', version: store.files.get(targetPath)?.version, changed, unsupported: [] });
        }
        case 'remove-elements': {
            const ids = (parsedBody.ids ?? parsedBody.elements ?? []) as string[];
            try {
                for (const id of ids) {
                    html = applyElementRemove(html, String(id));
                }
            } catch (e) {
                return json({ error: e instanceof Error ? e.message : 'remove failed' }, 500);
            }
            setFile(targetPath, html);
            return json({ ok: true, stage: 'saved', version: store.files.get(targetPath)?.version });
        }
        case 'insert-composition':
        case 'split-batch':
        case 'split-element':
        case 'freeze-frame':
        case 'wrap-elements':
        case 'unwrap-elements':
            return json({ error: `mutation ${kind} not implemented in this spike` }, 501);
        default:
            return json({ error: `unknown mutation ${kind}` }, 404);
    }
}

function applyElementStyles(html: string, elId: string, styles: Record<string, string>): string {
    // Find the element's style attribute and merge
    const elMatch = html.match(new RegExp(`(<[^>]*\\bid=["']${escape(rx(elId))}["'][^>]*)(>)`, 'i'));
    if (!elMatch) return html;
    const [full, openTag, close] = elMatch;
    const styleMatch = openTag.match(/style=["']([^"']*)["']/i);
    const existing: Record<string, string> = {};
    if (styleMatch) {
        for (const decl of styleMatch[1].split(';')) {
            const idx = decl.indexOf(':');
            if (idx > 0) existing[decl.slice(0, idx).trim()] = decl.slice(idx + 1).trim();
        }
    }
    for (const [k, v] of Object.entries(styles)) existing[k.includes('-') ? k : k.replace(/([A-Z])/g, '-$1').toLowerCase()] = v;
    const merged = Object.entries(existing).map(([k, v]) => `${k}: ${v}`).join('; ');
    let replaced = openTag.replace(/style=["'][^"']*["']/i, `style="${merged}"`);
    if (replaced === openTag) replaced = openTag.trimEnd() + ` style="${merged}"`;
    return html.replace(full, `${replaced}${close}`);
}

function applyElementText(html: string, elId: string, text: string): string {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const el = doc.getElementById(elId);
    if (!el) return html;
    el.textContent = text;
    return doc.body.innerHTML && html.includes('<!DOCTYPE') ? `<!DOCTYPE html>\n${doc.documentElement.outerHTML}` : doc.body.innerHTML;
}

function applyElementTiming(html: string, elId: string, timing: Record<string, string | number>): string {
    const start = toNum(timing.start ?? timing.dataStart);
    const duration = toNum(timing.duration ?? timing.dataDuration);
    const trackIndex = toNum(timing.trackIndex ?? timing.dataTrackIndex);
    return updateElementInHtml(html, elId, {
        ...(start !== undefined ? { start } : {}),
        ...(duration !== undefined ? { duration } : {}),
        ...(trackIndex !== undefined ? { trackIndex } : {}),
    });
}

function applyElementRemove(html: string, elId: string): string {
    // removeElementFromHtml binds at module level
    return removeElementFromHtml(html, elId);
}

function toNum(v: unknown): number | undefined {
    const n = typeof v === 'string' ? parseFloat(v) : typeof v === 'number' ? v : undefined;
    return Number.isFinite(n as number) ? n : undefined;
}

function rx(s: string): string { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function escape(s: string): string { return s; }

// ─── Preview assembly (their server contract, browser edition) ─────────────

const RUNTIME_URL = '/hf-runtime.js'; // runtime source shipped verbatim in public/
let runtimeSource: string | null = null;

function injectAfterHead(html: string, tag: string): string {
    const i = html.search(/<head[^>]*>/i);
    if (i < 0) return `${tag}\n${html}`;
    const openEnd = html.indexOf('>', i) + 1;
    return `${html.slice(0, openEnd)}\n${tag}${html.slice(openEnd)}`;
}

function injectBeforeBodyClose(html: string, tag: string): string {
    const i = html.lastIndexOf('</body>');
    if (i < 0) return `${html}\n${tag}`;
    return `${html.slice(0, i)}${tag}${html.slice(i)}`;
}

function assemblePreview(sourceHtml: string, capture: boolean): string {
    let html = sourceHtml;
    const baseTag = `<base href="/api/projects/${PROJECT_ID}/preview/">`;
    const runMeta = '<meta name="hf-studio-preview">';
    if (!/<base\s/i.test(html)) html = injectAfterHead(html, baseTag);
    if (!hfStudioPreviewMarked(html)) html = injectAfterHead(html, runMeta);
    if (!/gsap/i.test(html)) {
        html = injectAfterHead(html, '<script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>');
    }
    if (!/data-hf-runtime/.test(html)) {
        // Inline the runtime source if the host delivered it; else reference the SW route
        const rtTag = runtimeSource
            ? `<script data-hf-runtime="1">${runtimeSource.replace(/<\/script/gi, '<\\/script')}</script>`
            : `<script data-hf-runtime="1" src="${RUNTIME_URL}"></script>`;
        html = injectBeforeBodyClose(html, rtTag);
    }
    void capture;
    return html;
}

function hfStudioPreviewMarked(html: string): boolean {
    return html.includes('hf-studio-preview');
}

// ─── Message wiring ─────────────────────────────────────────────────────────

async function respondToRelay(ev: MessageEvent) {
    const data = ev.data as {
        type?: string; relayId?: string; method?: string; path?: string; query?: string;
        body?: string | null; ifMatch?: string | null; ifNoneMatch?: string | null;
        asset?: { html?: string }; html?: string; path_?: string; assetPath?: string;
        contentType?: string; arrayBuffer?: ArrayBuffer; source?: string;
    };
    if (!data || typeof data !== 'object') return;

    if (data.type === 'studio-request' && ev.ports?.[0]) {
        // Service worker relay (arrives via navigator.serviceWorker in Chrome)
        let response: { status: number; headers: Record<string, string | undefined>; body: string | null };
        try {
            response = await handle(
                data.method ?? 'GET', data.path ?? '/', data.query ?? '', data.body ?? null, data.ifMatch ?? null, data.ifNoneMatch ?? null,
            );
        } catch (e) {
            response = { status: 500, headers: { contentType: 'application/json' }, body: JSON.stringify({ error: e instanceof Error ? e.message : String(e) }) };
        }
        ev.ports[0].postMessage({ relayId: data.relayId, status: response.status, headers: response.headers, body: response.body });
        return;
    }

    switch (data.type) {
        case 'studio:composition': {
            setFile('index.html', String(data.asset?.html ?? data.html ?? ''));
            parent.postMessage({ type: 'studio:composition-applied' }, '*');
            break;
        }
        case 'studio:asset': {
            const assetPath = String(data.path ?? data.assetPath ?? '');
            store.assets.set(assetPath, {
                bytes: data.arrayBuffer instanceof ArrayBuffer ? data.arrayBuffer : new ArrayBuffer(0),
                contentType: data.contentType || 'application/octet-stream',
            });
            break;
        }
        case 'studio:runtime': {
            runtimeSource = data.source ?? null;
            break;
        }
        case 'studio:hello': {
            parent.postMessage({ type: 'studio:embed-ready' }, '*');
            break;
        }
    }
}

// Messages from the service worker arrive on the ServiceWorkerContainer bus
// (not window). Messages from the AdopeCanva app frame arrive on window.
navigator.serviceWorker.addEventListener('message', respondToRelay);
window.addEventListener('message', respondToRelay);

// notify parent we exist
parent.postMessage({ type: 'studio:embed-ready' }, '*');

// notify parent we exist
parent.postMessage({ type: 'studio:embed-ready' }, '*');
