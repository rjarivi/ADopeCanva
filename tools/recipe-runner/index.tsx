import React, { useMemo, useState, useEffect } from 'react';
import { ChefHat, Zap, ShieldCheck, Download, RefreshCcw, Play, FileText } from 'lucide-react';
import { ToolShell } from '../../components/ToolShell';
import { useToolFile } from '../../hooks/useToolFile';
import { Button } from '../../components/ui/Button';
import { SectionLabel } from '../../components/EditorControls';
import { loadRecipes, runRecipe, type Recipe } from '../../utils/recipeRunner';
import { logToolFailure } from '../../utils/toolHealth';

const TOOL_ID = 'recipe-runner';

const FEATURES = [
    { icon: ChefHat, label: 'Presets', desc: 'Community JSON' },
    { icon: ShieldCheck, label: 'Private', desc: 'Zero Uploads' },
    { icon: Zap, label: 'No Code', desc: 'Data Only' },
    { icon: Download, label: 'Export', desc: 'One-Click Save' },
];

const ACCEPT_BY_KIND: Record<Recipe['kind'], string> = {
    ffmpeg: 'video/*,audio/*',
    audio: 'audio/*',
    image: 'image/*',
    document: '*',
};

const RecipeRunner: React.FC = () => {
    const { file, select, clear } = useToolFile();
    const recipes = useMemo(() => loadRecipes(), []);
    const [recipeId, setRecipeId] = useState<string>(recipes[0]?.id ?? '');
    const [isRunning, setIsRunning] = useState(false);
    const [progress, setProgress] = useState<string | null>(null);
    const [result, setResult] = useState<{ url: string; filename: string } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const recipe = recipes.find((r) => r.id === recipeId) ?? recipes[0];

    useEffect(() => {
        return () => { if (result) URL.revokeObjectURL(result.url); };
    }, [result]);

    const resetResult = () => {
        if (result) URL.revokeObjectURL(result.url);
        setResult(null);
    };

    const handleRun = async () => {
        if (!file || !recipe) return;
        setIsRunning(true);
        setError(null);
        resetResult();
        setProgress('Starting engine…');
        try {
            const { blob, filename } = await runRecipe(recipe, file.file);
            setResult({ url: URL.createObjectURL(blob), filename });
            setProgress(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Recipe failed.');
        } finally {
            setIsRunning(false);
            setProgress(null);
        }
    };

    const handleReset = () => {
        clear();
        resetResult();
        setError(null);
    };

    return (
        <ToolShell
            icon={ChefHat}
            title="Recipe Runner"
            description="Community presets, one click. Pick a recipe, drop a file, download."
            features={FEATURES}
            file={file}
            accept={recipe ? ACCEPT_BY_KIND[recipe.kind] : '*'}
            onFileSelect={(f) => { resetResult(); setError(null); select(f); }}
            error={error}
        >
            <div className="w-full max-w-6xl mx-auto flex flex-col md:flex-row overflow-hidden font-sans">
                <aside className="w-full md:w-80 shrink-0 border-b md:border-b-0 md:border-r border-zinc-800 bg-zinc-950 p-5 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="font-black text-xs text-indigo-400 uppercase tracking-widest font-unbounded flex items-center gap-2">
                            <ChefHat size={16} /> Recipe
                        </h2>
                        <button onClick={handleReset} className="text-zinc-600 hover:text-red-400 transition-colors" title="Start over">
                            <RefreshCcw size={14} />
                        </button>
                    </div>

                    <section className="space-y-2">
                        <SectionLabel>Preset</SectionLabel>
                        <select
                            value={recipe?.id ?? ''}
                            onChange={(e) => { setRecipeId(e.target.value); resetResult(); setError(null); }}
                            className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:ring-1 focus:ring-indigo-500/50 outline-none cursor-pointer"
                        >
                            {recipes.map((r) => (
                                <option key={r.id} value={r.id}>
                                    [{r.kind}] {r.title}
                                </option>
                            ))}
                        </select>
                        {recipe?.description && (
                            <p className="text-[11px] text-zinc-500 leading-relaxed">{recipe.description}</p>
                        )}
                    </section>

                    {recipe && (recipe.kind === 'ffmpeg' || recipe.kind === 'audio') && Array.isArray(recipe.params.args) && (
                        <section className="space-y-2">
                            <SectionLabel>What runs</SectionLabel>
                            <pre className="text-[10px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap break-words">
                                ffmpeg {recipe.params.args.join(' ')}
                            </pre>
                        </section>
                    )}

                    {error && (
                        <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl">
                            <p className="text-xs text-red-400">{error}</p>
                        </div>
                    )}

                    {result ? (
                        <div className="space-y-3">
                            <a
                                href={result.url}
                                download={result.filename}
                                className="flex items-center justify-center gap-2 w-full h-12 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-black uppercase tracking-widest font-unbounded transition-all"
                            >
                                <Download size={16} /> Download
                            </a>
                            <p className="text-[10px] font-mono text-zinc-500 truncate text-center">{result.filename}</p>
                            <Button variant="secondary" className="w-full" onClick={handleReset}>
                                <RefreshCcw size={14} className="mr-2" /> New file
                            </Button>
                        </div>
                    ) : (
                        <Button className="w-full h-12" onClick={handleRun} isLoading={isRunning} disabled={isRunning || !file}>
                            <Play size={16} className="mr-2" />
                            {isRunning ? (progress ?? 'Running…') : 'Run recipe'}
                        </Button>
                    )}

                    <section className="bg-zinc-900/30 p-4 rounded-xl border border-zinc-800">
                        <SectionLabel>About recipes</SectionLabel>
                        <p className="text-[10px] text-zinc-500 leading-relaxed uppercase font-bold tracking-tight flex gap-1.5">
                            <FileText size={12} className="shrink-0 mt-0.5" />
                            Presets are plain JSON in recipes/. Propose one with a tool-request issue.
                        </p>
                    </section>
                </aside>

                <main className="flex-1 relative bg-[#09090b] flex flex-col items-center justify-center p-8 min-h-[40vh]">
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                        style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
                    <ChefHat size={40} className="text-zinc-700 mb-3" />
                    <p className="text-sm text-zinc-400 font-mono">{file?.file.name}</p>
                    <p className="text-xs text-zinc-600 mt-1">
                        {recipe ? `→ ${recipe.title}` : 'Select a recipe'} · {file?.size}
                    </p>
                    {result && (
                        <p className="mt-4 text-xs font-bold text-emerald-400 uppercase tracking-widest">Done — download is ready</p>
                    )}
                </main>
            </div>
        </ToolShell>
    );
};

export default RecipeRunner;
