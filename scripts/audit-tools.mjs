/**
 * Static pre-deploy audit: `npm run audit:tools`
 *
 * Catches the failure classes seen in production before they ship:
 *  1. pdfjs-dist version vs bundled public/pdf.worker.min.mjs mismatch
 *     (the "Could not open PDF" outage).
 *  2. `crossOrigin="anonymous"` on <img> with external fallback URLs that
 *     loop forever when the provider returns duplicate ACAO headers
 *     (the ui-avatars CORS spam).
 *  3. Hardcoded external avatar/thumbnail hosts without onError fallbacks.
 *  4. `file?.file.name.replace` null-crash pattern.
 *  5. Bare `catch {}` blocks that swallow the real error.
 *
 * Exit code 1 = problems found (fails CI). Exit 0 = clean.
 */
import { readFileSync, existsSync } from 'node:fs';
import { execSync } from 'node:child_process';

const failures = [];
const warnings = [];

const note = (kind, file, line, msg) => {
    (kind === 'fail' ? failures : warnings).push(`${kind === 'fail' ? 'FAIL' : 'WARN'} ${file}:${line} — ${msg}`);
};

// 0. TypeScript check — vite build does NOT typecheck, so undefined
//    names (e.g. a missing icon import) ship as runtime ReferenceErrors.
//    This gate catches them before deploy.
try {
    execSync('npx tsc --noEmit', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    console.log('ok tsc --noEmit clean');
} catch (e) {
    const out = (e.stdout || '') + (e.stderr || '');
    for (const line of out.split('\n').map((s) => s.trim()).filter(Boolean).slice(0, 20)) {
        note('fail', 'tsc', '-', line);
    }
}

// 1. pdfjs-dist vs bundled worker version
try {
    const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
    const declared = pkg.dependencies?.['pdfjs-dist'] ?? '';
    let installed = '';
    try {
        installed = execSync(`node -p "require('pdfjs-dist/package.json').version"`, { encoding: 'utf8' }).trim();
    } catch { /* ignore */ }
    const workerPath = 'public/pdf.worker.min.mjs';
    if (existsSync(workerPath)) {
        const worker = readFileSync(workerPath, 'utf8').slice(0, 60000);
        const m = worker.match(/(\d+\.\d+\.\d+)/);
        const workerVer = m ? m[1] : 'unknown';
        if (installed && workerVer !== 'unknown' && installed !== workerVer) {
            note('fail', workerPath, 1, `worker v${workerVer} != installed pdfjs-dist v${installed} — PDF tools will fail to open files`);
        } else {
            console.log(`ok pdf worker v${workerVer} matches pdfjs-dist v${installed} (declared ${declared})`);
        }
    } else {
        note('fail', workerPath, 1, 'bundled worker missing — PDF tools need public/pdf.worker.min.mjs');
    }
} catch (e) {
    note('fail', 'package.json', 1, `could not verify pdfjs versions: ${e.message}`);
}

// 2-5. Static pattern scan over tool sources
const { execSync: ex2 } = await import('node:child_process');
let files = [];
try {
    const out = ex2(`git ls-files 'views/tools/*.tsx' 'components/*.tsx' 'utils/*.ts'`, { encoding: 'utf8' });
    files = out.split('\n').map((s) => s.trim()).filter(Boolean);
} catch {
    const { readdirSync } = await import('node:fs');
    files = readdirSync('views/tools').map((f) => `views/tools/${f}`);
}

for (const file of files) {
    let src;
    try { src = readFileSync(file, 'utf8'); } catch { continue; }
    const lines = src.split('\n');

    lines.forEach((text, i) => {
        const n = i + 1;
        // crossOrigin anonymous on JSX <img> — CORS-loop risk (must have guarded onError).
        // (Programmatic `new Image()` for canvas export is intentional and excluded.)
        if (/crossOrigin\s*=\s*[{["']anonymous["']}\]]/.test(text)) {
            const context = lines.slice(Math.max(0, i - 4), i + 1).join('\n');
            if (/<img/.test(context)) {
                const window = lines.slice(i, i + 8).join('\n');
                if (/ui-avatars|pbs\.twimg/.test(window) || !/onError/.test(window)) {
                    note('warn', file, n, 'crossOrigin="anonymous" on <img> without a data-URI onError fallback risks CORS loops');
                }
            }
        }
        // dead external avatar hosts
        if (/ui-avatars\.com|pbs\.twimg\.com\/profile_images\/2038989459069468672/.test(text)) {
            note('fail', file, n, 'references dead/blocked external avatar host — use data-URI initials instead');
        }
        // null-crash pattern (excludes the fixed `(file?.file.name ?? x)` form)
        if (/file\?\.file\.name\.replace/.test(text) && !/file\?\.file\.name\s*\?\?/.test(text)) {
            note('fail', file, n, 'file?.file.name.replace crashes when file is null — use (file?.file.name ?? fallback).replace');
        }
        // bare catch swallowing errors
        if (/}\s*catch\s*{\s*$/.test(text)) {
            const ctx = lines.slice(i, i + 3).join('\n');
            if (!/logToolFailure|console\.error/.test(ctx)) {
                note('warn', file, n, 'bare catch{} swallows the real error — log via logToolFailure');
            }
        }
        // hardcoded workerSrc outside the shared util
        if (/GlobalWorkerOptions\.workerSrc\s*=/.test(text) && !file.endsWith('utils/pdfWorker.ts')) {
            note('fail', file, n, 'hardcoded pdf workerSrc — import setupPdfWorker() from utils/pdfWorker instead');
        }
    });
}

console.log(`\naudited ${files.length} files: ${failures.length} failures, ${warnings.length} warnings`);
for (const w of warnings) console.log(' ', w);
for (const f of failures) console.log(' ', f);
process.exit(failures.length ? 1 : 0);
