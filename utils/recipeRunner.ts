/// <reference types="vite/client" />
/**
 * Lane 1 recipe runtime. Executes recipes/*.json without component code:
 *  - ffmpeg / audio kinds run params.args through the shared FFmpeg singleton.
 *  - image kind converts via canvas (format + quality, EXIF dropped).
 *  - document kind is validated but needs a code tool (Lane 2) — the runner
 *    rejects it with a clear error instead of failing obscurely.
 *
 * Args support {input} / {output} tokens; without them the runner wraps as
 * [args..., -i input, output]. All files are unique per run and cleaned up.
 */
import { getFFmpeg, writeFileToFFmpeg, readFileFromFFmpeg } from './ffmpeg';
import { logToolFailure } from './toolHealth';

export interface Recipe {
    id: string;
    title: string;
    kind: 'ffmpeg' | 'image' | 'audio' | 'document';
    engine?: string;
    description?: string;
    params: {
        args?: string[];
        ext?: string;
        format?: string;
        quality?: number;
        [key: string]: unknown;
    };
}

const recipeModules = import.meta.glob('../../recipes/*.json', { eager: true }) as Record<string, { default: Recipe }>;

/** All valid recipes, sorted by title. Skips schema.json and malformed files. */
export function loadRecipes(): Recipe[] {
    const out: Recipe[] = [];
    for (const mod of Object.values(recipeModules)) {
        const r = mod?.default;
        if (r && typeof r.id === 'string' && typeof r.kind === 'string') out.push(r);
    }
    return out.sort((a, b) => a.title.localeCompare(b.title));
}

function extOf(recipe: Recipe, fallback: string): string {
    const ext = typeof recipe.params.ext === 'string' ? recipe.params.ext : fallback;
    return ext.replace(/^\./, '');
}

function outcomeName(inputName: string, recipe: Recipe, ext: string): string {
    const base = inputName.replace(/\.[^/.]+$/, '') || 'output';
    return `${base}-${recipe.id}.${ext}`;
}

async function runFfmpegRecipe(recipe: Recipe, file: File): Promise<{ blob: Blob; filename: string }> {
    const args = recipe.params.args;
    if (!Array.isArray(args) || args.length === 0) {
        throw new Error(`Recipe "${recipe.id}" has no params.args to execute.`);
    }
    const ext = extOf(recipe, 'mp4');
    const ffmpeg = await getFFmpeg();
    const tag = Date.now().toString(36);
    const inName = `recipe-in-${tag}`;
    const outName = `recipe-out-${tag}.${ext}`;
    // {input}/{output} tokens for full control; otherwise wrap conventionally.
    const hasTokens = args.some((a) => a === '{input}' || a === '{output}');
    const finalArgs = hasTokens
        ? args.map((a) => (a === '{input}' ? inName : a === '{output}' ? outName : a))
        : ['-i', inName, ...args.map(String), outName];
    try {
        await writeFileToFFmpeg(ffmpeg, inName, file);
        const code = await ffmpeg.exec(finalArgs);
        if (code !== 0) throw new Error(`FFmpeg exited with code ${code}.`);
        // readFileFromFFmpeg returns a blob: URL — materialize it so the
        // caller owns a Blob and no URL leaks past this function.
        const url = await readFileFromFFmpeg(ffmpeg, outName, 'application/octet-stream');
        try {
            const blob = await (await fetch(url)).blob();
            return { blob, filename: outcomeName(file.name, recipe, ext) };
        } finally {
            URL.revokeObjectURL(url);
        }
    } finally {
        try { await ffmpeg.deleteFile(inName); } catch { /* ignore */ }
        try { await ffmpeg.deleteFile(outName); } catch { /* ignore */ }
    }
}

async function runImageRecipe(recipe: Recipe, file: File): Promise<{ blob: Blob; filename: string }> {
    const format = String(recipe.params.format ?? 'webp').toLowerCase();
    const quality = Math.min(100, Math.max(1, Number(recipe.params.quality ?? 80))) / 100;
    const mime = format === 'png' ? 'image/png' : format === 'jpeg' || format === 'jpg' ? 'image/jpeg' : 'image/webp';
    const ext = format === 'png' ? 'png' : format === 'jpeg' || format === 'jpg' ? 'jpg' : 'webp';
    const bitmap = await createImageBitmap(file);
    try {
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas 2D unavailable.');
        ctx.drawImage(bitmap, 0, 0);
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, quality));
        if (!blob) throw new Error('Image encoding failed.');
        return { blob, filename: outcomeName(file.name, recipe, ext) };
    } finally {
        bitmap.close();
    }
}

/** Execute a recipe against an input file. Throws with actionable messages. */
export async function runRecipe(recipe: Recipe, file: File): Promise<{ blob: Blob; filename: string }> {
    try {
        if (recipe.kind === 'image') return await runImageRecipe(recipe, file);
        if (recipe.kind === 'ffmpeg' || recipe.kind === 'audio') return await runFfmpegRecipe(recipe, file);
        throw new Error(`"${recipe.title}" is a document recipe — it needs a code tool (Lane 2).`);
    } catch (err) {
        logToolFailure('recipe-runner', err, { stage: 'run-recipe', recipe: recipe.id });
        throw err;
    }
}
