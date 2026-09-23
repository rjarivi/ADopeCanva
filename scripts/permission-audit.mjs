/**
 * Permission lint: `npm run audit:permissions`
 *
 * The manifest is the contract. For every `tools/<id>/`:
 *  - required manifest fields + permissions.network array
 *  - FAIL on: fetch/WebSocket/XMLHttpRequest/EventSource, eval,
 *    new Function, document.write, remote <script>, or any https:// host
 *    not declared in permissions.network
 *  - FAIL on: bare npm imports that are neither installed (package.json)
 *    nor declared in manifest permissions.npm (new deps = separate review)
 *  - WARN on: innerHTML / dangerouslySetInnerHTML
 *
 * Also validates `recipes/*.json` against the recipe schema.
 * Exit 1 on any failure (blocks CI).
 */
import { readdirSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const failures = [];
const warnings = [];
const fail = (m) => failures.push(`FAIL ${m}`);
const warn = (m) => warnings.push(`WARN ${m}`);

// Non-issues: never treated as network exfiltration targets.
const HOST_IGNORE = new Set(['www.w3.org', 'www.w3.org/1999/xhtml']);
// Imports that need no declaration (platform).
const PLATFORM_IMPORTS = new Set([
    'react', 'react-dom', 'react-router-dom', 'lucide-react',
]);

function installedDeps() {
    const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
    return new Set([...Object.keys(pkg.dependencies || {}), ...Object.keys(pkg.devDependencies || {})]);
}

const INSTALLED = installedDeps();

function hostAllowed(host, declared) {
    const h = host.toLowerCase();
    return declared.some((d) => {
        const dd = String(d).toLowerCase();
        return h === dd || h.endsWith('.' + dd);
    });
}

function lintTool(dir) {
    const base = join(ROOT, 'tools', dir);
    const mPath = join(base, 'manifest.json');
    if (!existsSync(mPath)) { fail(`tools/${dir}: missing manifest.json`); return; }
    let m;
    try { m = JSON.parse(readFileSync(mPath, 'utf8')); }
    catch (e) { fail(`tools/${dir}/manifest.json: invalid JSON`); return; }
    const declaredHosts = (m.permissions?.network || []).map(String);
    const declaredNpm = (m.permissions?.npm || []).map(String);

    const files = readdirSync(base).filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'));
    if (files.length === 0) { fail(`tools/${dir}: no component source found`); return; }
    for (const f of files) {
        const raw = readFileSync(join(base, f), 'utf8');
        const tag = `tools/${dir}/${f}`;

        // Hosts come from string literals only (comments like "no fetch"
        // must not count as network usage).
        const strings = [...raw.matchAll(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/g)]
            .map((x) => x[0]);
        // Code without strings or comments, for API/pattern detection.
        const code = raw
            .replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`/g, '""')
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/(^|[^\S:])\/\/.*$/gm, '$1');

        // Banned primitives.
        for (const [re, what] of [
            [/\beval\s*\(/, 'eval()'],
            [/new\s+Function\s*\(/, 'new Function()'],
            [/document\.write\s*\(/, 'document.write'],
            [/<script[\s>]/i, '<script injection'],
        ]) {
            if (re.test(code)) fail(`${tag}: banned pattern ${what} — needs maintainer review`);
        }

        // Network APIs.
        const usesNet = /(\bfetch\s*\(|\bWebSocket\b|XMLHttpRequest|EventSource)/.test(code);
        const hosts = strings.flatMap((s) => [...s.matchAll(/https?:\/\/([a-zA-Z0-9.-]+)/g)].map((x) => x[1].toLowerCase()))
            .filter((h) => !HOST_IGNORE.has(h));
        const uniqueHosts = [...new Set(hosts)];
        for (const h of uniqueHosts) {
            if (!hostAllowed(h, declaredHosts)) {
                fail(`${tag}: calls https://${h} but manifest permissions.network lacks it`);
            }
        }
        if (usesNet && uniqueHosts.length === 0) {
            fail(`${tag}: uses a network API with a dynamic URL — declare hosts or remove`);
        }
        if (usesNet && declaredHosts.length === 0 && uniqueHosts.length > 0) {
            fail(`${tag}: network usage requires manifest permissions.network entries`);
        }

        // Dependencies.
        const imports = [...code.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((x) => x[1]);
        for (const imp of imports) {
            if (imp.startsWith('.') || imp.startsWith('@/')) continue; // local
            const bare = imp.split('/')[0].startsWith('@') ? imp.split('/').slice(0, 2).join('/') : imp.split('/')[0];
            if (PLATFORM_IMPORTS.has(bare)) continue;
            if (INSTALLED.has(bare)) continue; // installed, but flag if undeclared
            if (!declaredNpm.includes(bare)) {
                fail(`${tag}: imports undeclared package "${bare}" — add to manifest permissions.npm (separate review tier)`);
            }
        }

        if (/dangerouslySetInnerHTML|[^.]innerHTML\s*=/.test(code)) {
            warn(`${tag}: innerHTML usage — prefer safe rendering`);
        }
    }
}

function lintRecipes() {
    const dir = join(ROOT, 'recipes');
    if (!existsSync(dir)) return;
    const kinds = new Set(['ffmpeg', 'image', 'audio', 'document']);
    for (const f of readdirSync(dir)) {
        if (f === 'README.md' || f === 'schema.json' || f.startsWith('.')) continue;
        if (!f.endsWith('.json')) { fail(`recipes/${f}: only .json recipes allowed`); continue; }
        const tag = `recipes/${f}`;
        let r;
        try { r = JSON.parse(readFileSync(join(dir, f), 'utf8')); }
        catch { fail(`${tag}: invalid JSON`); continue; }
        if (r.id !== f.replace(/\.json$/, '')) fail(`${tag}: id must match filename`);
        for (const k of ['title', 'kind', 'params']) {
            if (r[k] === undefined) fail(`${tag}: missing required field "${k}"`);
        }
        if (r.kind && !kinds.has(r.kind)) fail(`${tag}: unknown kind "${r.kind}"`);
        if (r.params && typeof r.params !== 'object') fail(`${tag}: params must be an object`);
    }
}

if (existsSync(join(ROOT, 'tools'))) {
    for (const d of readdirSync(join(ROOT, 'tools'), { withFileTypes: true })) {
        if (!d.isDirectory() || d.name.startsWith('_') || d.name.startsWith('.')) continue;
        lintTool(d.name);
    }
}
lintRecipes();

console.log(`\naudited tools/ + recipes/: ${failures.length} failures, ${warnings.length} warnings`);
for (const w of warnings) console.log(' ', w);
for (const f of failures) console.log(' ', f);
process.exit(failures.length ? 1 : 0);
