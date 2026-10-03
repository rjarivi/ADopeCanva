/**
 * Scaffold a new code tool: `npm run new:tool -- --id=my-tool --title="My Tool" --category=image`
 * Copies tools/_template and fills in the placeholders. Recipes need no
 * scaffolding — just copy a JSON file in recipes/ (see recipes/README.md).
 */
import { cpSync, readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));

function arg(name) {
    const argv = process.argv.slice(2);
    for (let i = 0; i < argv.length; i++) {
        if (argv[i] === `--${name}`) return argv[i + 1];
        if (argv[i].startsWith(`--${name}=`)) return argv[i].slice(name.length + 3);
    }
    return undefined;
}

const id = arg('id');
const title = arg('title') || id;
const category = arg('category') || 'Image';
const icon = arg('icon') || 'Zap';

if (!id || !/^[a-z0-9-]+$/.test(id)) {
    console.error('Usage: npm run new:tool -- --id=my-tool --title="My Tool" --category=image [--icon=Zap]');
    console.error('  id: lowercase letters, numbers, dashes. category: Video|Audio|Image|Docs|Text|Developer.');
    process.exit(1);
}

const dest = join(ROOT, 'tools', id);
if (existsSync(dest)) {
    console.error(`tools/${id} already exists.`);
    process.exit(1);
}

mkdirSync(dest, { recursive: true });
for (const f of ['manifest.json', 'index.tsx', 'README.md']) {
    const out = readFileSync(join(ROOT, 'tools/_template', f), 'utf8')
        .replaceAll('__TOOL_ID__', id)
        .replaceAll('__TOOL_TITLE__', title)
        .replaceAll('__CATEGORY__', category)
        .replaceAll('__ICON__', icon);
    writeFileSync(join(dest, f), out);
}

console.log(`created tools/${id}/ (manifest.json, index.tsx, README.md)`);
console.log('next: fill in the manifest, build the workspace, then run:');
console.log('  npm run registry:build && npm run audit:permissions && npm run audit:tools');
