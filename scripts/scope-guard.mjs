/**
 * Scope guard: `node scripts/scope-guard.mjs --base <sha> --allow-shell <true|false>`
 *
 * Tool/recipe PRs must NOT touch the shell, lockfile, CSP, analytics, or
 * platform config. Those paths are maintainer-only (see .github/CODEOWNERS).
 * A PR that needs them is two PRs: discuss the shell change in an issue first.
 *
 * Maintainers can bypass with the `allow-shell` PR label (passed as
 * --allow-shell true by CI). Local runs default to strict.
 */
import { execSync } from 'node:child_process';

const PROTECTED = [
    'package.json',
    'package-lock.json',
    'vite.config.ts',
    'tsconfig.json',
    'index.html',
    'wrangler.toml',
    'App.tsx',
    'index.tsx',
    'sandbox.html',
    'sandbox.tsx',
    'types.ts',
    'views/Dashboard.tsx',
    'components/Changelog.tsx',
    'utils/analytics.ts',
    'utils/seoHelper.ts',
    'utils/ffmpeg.ts',
    'utils/pdfWorker.ts',
    'utils/toolHealth.ts',
    'public/sitemap.xml', // generated — edit the generator, not the output
];

const PROTECTED_PREFIXES = [
    'views/', // top-level views are shell… (see exception below)
    'hooks/',
    'contexts/',
    'scripts/',
    '.github/',
];

const ALLOWED_UNDER_VIEWS = ['views/tools/']; // legacy tool location (being migrated to /tools)

const args = process.argv.slice(2);
const baseIdx = args.indexOf('--base');
const base = baseIdx >= 0 ? args[baseIdx + 1] : 'origin/main';
const allowIdx = args.indexOf('--allow-shell');
const allowShell = allowIdx >= 0 ? /^true$/i.test(args[allowIdx + 1] ?? '') : false;

function changedFiles() {
    try {
        const out = execSync(`git diff --name-only ${base}...HEAD`, { encoding: 'utf8' });
        return out.split('\n').map((s) => s.trim()).filter(Boolean);
    } catch {
        // No base available (shallow local clone) — check staged + unstaged instead.
        try {
            const out = execSync('git status --porcelain', { encoding: 'utf8' });
            return out.split('\n').map((l) => l.slice(3).trim()).filter(Boolean);
        } catch {
            return [];
        }
    }
}

function isProtected(f) {
    if (PROTECTED.includes(f)) return true;
    if (ALLOWED_UNDER_VIEWS.some((p) => f.startsWith(p))) return false;
    return PROTECTED_PREFIXES.some((p) => f.startsWith(p));
}

const changed = changedFiles();
const violations = changed.filter(isProtected);

if (violations.length === 0) {
    console.log(`ok scope guard: ${changed.length} file(s) changed, none protected`);
    process.exit(0);
}

if (allowShell) {
    console.log('WARN scope guard bypassed via `allow-shell` label:');
    for (const v of violations) console.log(`  ${v}`);
    process.exit(0);
}

console.error('FAIL scope guard: this PR touches maintainer-only paths.');
console.error('Split the shell change into a separate proposal (open an issue first):');
for (const v of violations) console.error(`  ${v}`);
console.error('\nAllowed in tool/recipe PRs: tools/<id>/*, recipes/*.json, views/tools/* (legacy), docs.');
process.exit(1);
