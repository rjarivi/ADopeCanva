/**
 * Bundle-size budget: `npm run budget` (runs after `npm run build` in CI).
 *
 * Guards the main failure mode of an ever-growing tool suite: a PR that
 * quietly doubles the download (miner, duplicated dep, un-shaken import).
 * Tune WARN_BYTES / FAIL_BYTES when the budget changes deliberately.
 */
import { readdirSync, statSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const DIST = join(fileURLToPath(new URL('..', import.meta.url)), 'dist/assets');
// Current baseline ≈ 2.2 MB gzip (7.4 MB raw main chunk). Deliberate grows
// update these numbers in the same PR — silent growth fails CI.
const WARN_BYTES = 2_400_000;
const FAIL_BYTES = 2_700_000;

let total = 0;
const rows = [];
for (const f of readdirSync(DIST)) {
    if (!f.endsWith('.js')) continue;
    const buf = readFileSync(join(DIST, f));
    const gz = gzipSync(buf).length;
    total += gz;
    rows.push({ f, raw: buf.length, gz });
}
rows.sort((a, b) => b.gz - a.gz);
for (const r of rows.slice(0, 8)) {
    console.log(`  ${(r.gz / 1024).toFixed(0).padStart(6)} KB gzip  ${r.f}`);
}
console.log(`  ${(total / 1024 / 1024).toFixed(2)} MB gzip total JS`);

if (total > FAIL_BYTES) {
    console.error(`FAIL budget: ${(total / 1024 / 1024).toFixed(2)} MB > ${(FAIL_BYTES / 1024 / 1024).toFixed(2)} MB — split the chunk or justify the growth`);
    process.exit(1);
}
if (total > WARN_BYTES) {
    console.log(`WARN budget: over ${(WARN_BYTES / 1024 / 1024).toFixed(2)} MB — keep an eye on it`);
}
console.log('ok budget');
