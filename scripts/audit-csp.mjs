/**
 * CSP coverage audit: `npm run audit:csp` (runs in CI).
 *
 * The browser enforces index.html's CSP, but nothing kept it in sync with
 * the code — so production silently broke transparency grids (blocked
 * transparenttextures.com) and GIF captions (blocked raw.githubusercontent).
 *
 * Checks (FAIL = block CI):
 *  1. Every manifest permissions.network[] host must be covered by
 *     CSP connect-src.
 *  2. Every fetch()/WebSocket host literal in code must be covered by
 *     connect-src; every <img src>/url() host literal by img-src.
 * Warns on CSP hosts referenced nowhere (removal candidates).
 *
 * data:/blob: fetches, same-origin links, and JSON-LD/schema hosts need
 * nothing and are excluded.
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const failures = [];
const warnings = [];
const fail = (m) => failures.push(`FAIL ${m}`);
const warn = (m) => warnings.push(`WARN ${m}`);

// Hosts that appear in code but never hit the network.
const NON_NETWORK = new Set([
    'www.w3.org', 'schema.org', 'adopecanva.com', 'example.com',
    'localhost', '127.0.0.1',
]);
// Intentionally broad CSP entries the static scan cannot prove:
// ad-network transitive hosts, Google redirect targets, and screenshot
// CDNs whose exact hosts only appear in API responses at runtime.
const DYNAMIC_OK = new Set([
    'unpkg.com', 'cdnjs.cloudflare.com', 'script.googleusercontent.com',
    'microlink.io',
]);

function parseCsp() {
    const html = readFileSync(join(ROOT, 'index.html'), 'utf8');
    const m = html.match(/http-equiv="Content-Security-Policy"\s*\n?\s*content="([^"]+)"/s);
    if (!m) { fail('index.html: CSP meta tag not found'); return {}; }
    const dirs = {};
    for (const part of m[1].split(';').map((s) => s.trim()).filter(Boolean)) {
        const [name, ...tokens] = part.split(/\s+/);
        dirs[name] = tokens;
    }
    return dirs;
}

function cspCovers(list, host) {
    const h = host.toLowerCase();
    return (list || []).some((t) => {
        const tok = t.toLowerCase();
        if (tok === '*' || tok === 'https:' || tok === 'https://*') return true;
        if (tok.startsWith('*.')) return h === tok.slice(2) || h.endsWith('.' + tok.slice(2));
        if (tok.includes('://')) return tok.split('://')[1].toLowerCase() === h;
        return tok === h;
    });
}

function codeFiles() {
    const out = [];
    const walk = (dir) => {
        for (const e of readdirSync(dir, { withFileTypes: true })) {
            if (e.name.startsWith('.') || e.name === 'node_modules') continue;
            const p = join(dir, e.name);
            if (e.isDirectory()) { walk(p); continue; }
            if (/\.(tsx|ts|css)$/.test(e.name) && !p.includes('toolRegistry.generated')) out.push(p);
        }
    };
    for (const d of ['views', 'components', 'utils', 'hooks', 'tools', 'index.css']) {
        const p = join(ROOT, d);
        if (existsSync(p)) {
            if (p.endsWith('.css')) out.push(p);
            else walk(p);
        }
    }
    return out;
}

const csp = parseCsp();
const connectSrc = csp['connect-src'] || [];
const imgSrc = csp['img-src'] || [];
const usedCspHosts = new Set();

// 1. Manifest declarations must be covered.
if (existsSync(join(ROOT, 'tools'))) {
    for (const d of readdirSync(join(ROOT, 'tools'), { withFileTypes: true })) {
        if (!d.isDirectory() || d.name.startsWith('_') || d.name.startsWith('.')) continue;
        const mp = join(ROOT, 'tools', d.name, 'manifest.json');
        if (!existsSync(mp)) continue;
        const m = JSON.parse(readFileSync(mp, 'utf8'));
        for (const h of (m.permissions?.network || []).map(String)) {
            usedCspHosts.add(h.toLowerCase());
            if (!cspCovers(connectSrc, h)) {
                fail(`tools/${d.name}: manifest declares ${h} but CSP connect-src lacks it`);
            }
        }
    }
}

// 2. Code-level fetch / image hosts must be covered.
for (const f of codeFiles()) {
    const rel = f.replace(ROOT, '').replace(/^\//, '');
    let src;
    try { src = readFileSync(f, 'utf8'); } catch { continue; }
    const strings = [...src.matchAll(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/g)].map((x) => x[0]);
    const code = src
        .replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/g, '""')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^\S:])\/\/.*$/gm, '$1');

    const fetchHosts = [...new Set([
        ...[...code.matchAll(/fetch\(\s*[`'"]https?:\/\/([a-zA-Z0-9.-]+)/g)].map((x) => x[1].toLowerCase()),
        ...[...code.matchAll(/new\s+(?:Request|WebSocket)\(\s*[`'"]https?:\/\/([a-zA-Z0-9.-]+)/g)].map((x) => x[1].toLowerCase()),
        ...[...code.matchAll(/\.open\(\s*['"]\w+['"]\s*,\s*[`'"]https?:\/\/([a-zA-Z0-9.-]+)/g)].map((x) => x[1].toLowerCase()),
    ])];
    // Tag spans from RAW source (JSX splits tags across string literals).
    const imgHosts = [...new Set(
        [...src.matchAll(/<img\b[^>]*>/gs)].flatMap((t) =>
            [...t[0].matchAll(/https?:\/\/([a-zA-Z0-9.-]+)/gi)].map((x) => x[1].toLowerCase())),
    )];
    const linkHosts = [...new Set(
        [...src.matchAll(/<link\b[^>]*>/gs)].flatMap((t) =>
            [...t[0].matchAll(/https?:\/\/([a-zA-Z0-9.-]+)/gi)].map((x) => x[1].toLowerCase())),
    )];
    const cssHosts = [...src.matchAll(/url\(\s*['"]?https?:\/\/([a-zA-Z0-9.-]+)/g)]
        .filter((m) => !/@import\s*$/.test(src.slice(Math.max(0, m.index - 12), m.index)))
        .map((x) => x[1].toLowerCase());

    for (const h of fetchHosts) {
        if (NON_NETWORK.has(h)) continue;
        usedCspHosts.add(h);
        if (!cspCovers(connectSrc, h)) {
            fail(`${rel}: fetches https://${h} but no CSP connect-src covers it`);
        }
    }
    for (const h of [...new Set([...imgHosts, ...cssHosts])]) {
        if (NON_NETWORK.has(h)) continue;
        usedCspHosts.add(h);
        if (!cspCovers(imgSrc, h)) {
            fail(`${rel}: loads image from https://${h} but no CSP img-src covers it`);
        }
    }
    const styleSrc = csp['style-src'] || [];
    for (const h of linkHosts) {
        if (NON_NETWORK.has(h)) continue;
        usedCspHosts.add(h);
        if (!cspCovers(styleSrc, h)) {
            fail(`${rel}: loads stylesheet from https://${h} but no CSP style-src covers it`);
        }
    }
}

// 3. Unused CSP hosts (removal candidates, minus known infra).
const INFRA = new Set([
    'google-analytics.com', 'googletagmanager.com', 'doubleclick.net',
    'google.com', 'gstatic.com', 'googleapis.com', 'cloudflareinsights.com',
    'clarity.ms', 'bing.com', 'adtrafficquality.google', 'googlesyndication.com',
    'g.doubleclick.net', 'doubleclick.net', 'fonts.gstatic.com', 'fonts.googleapis.com',
]);
for (const dir of ['connect-src', 'img-src', 'script-src']) {
    for (const rawTok of csp[dir] || []) {
        // CSP sources are quoted ('self'); normalize before comparing.
        const tok = rawTok.replace(/^'|'$/g, '');
        const host = tok.includes('://') ? tok.split('://')[1].toLowerCase() : tok.replace(/^\*\./, '').toLowerCase();
        if (['self', 'data:', 'blob:', 'unsafe-inline', 'unsafe-eval', '*', 'https:', 'none'].includes(tok)) continue;
        const used = [...usedCspHosts].some((u) => u === host || u.endsWith('.' + host) || host.endsWith('.' + u));
        const infra = [...INFRA].some((i) => host === i || host.endsWith('.' + i));
        const dynamic = [...DYNAMIC_OK].some((d) => host === d || host.endsWith('.' + d));
        if (!used && !infra && !dynamic) warn(`CSP ${dir} lists ${rawTok} but no code references it — remove?`);
    }
}

console.log(`\naudited CSP coverage: ${failures.length} failures, ${warnings.length} warnings`);
for (const w of warnings) console.log(' ', w);
for (const f of failures) console.log(' ', f);
process.exit(failures.length ? 1 : 0);
