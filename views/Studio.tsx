/**
 * AdopeCanva Studio — Agentic Video Creation (Phase 0)
 *
 * Pipeline: text brief → LLM (OpenRouter, any model) writes a HyperFrames
 * composition → @hyperframes/parsers validates it → <hyperframes-player>
 * previews it → export as a standalone .html file.
 *
 * Also ships a Catalog browser for the 400 free HyperFrames registry
 * blocks/components (metadata + previews fetched from their public registry),
 * so briefs can start from a proven visual instead of a blank page.
 *
 * Rendering note: MP4 rendering stays out of the browser for now. HyperFrames'
 * producer needs headless Chrome + FFmpeg (Node-only). An in-browser MP4
 * export path (tab capture + mediabunny) is planned — see the studio plan.
 *
 * Composition engine: HyperFrames (https://github.com/heygen-com/hyperframes),
 * Apache-2.0, Copyright HeyGen, Inc. Packages used unmodified via npm.
 */
import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
// Import from @hyperframes/parsers (not @hyperframes/core) — the core root
// entry pulls Node builtins (`node:path` via safePath/assetPaths) that Vite
// cannot shim in the browser. The parsers package is browser-clean.
import { parseHtml, type ParsedHtml } from '@hyperframes/parsers';
import '@hyperframes/player';
import { getHyperframeRuntimeScript } from '@hyperframes/core/runtime-script';
import { ApiKeyInput } from '../components/ui/ApiKeyInput';
import {
    Sparkles, Clapperboard, AlertTriangle, Play, Square, RotateCcw,
    Download, FileCode2, ShieldCheck, ShieldX, CircleDot, CheckCircle2,
    Wand2, Eye, Code2, Info, ChevronDown, Check, Search, X,
    LayoutGrid, Puzzle, MonitorPlay, BookOpen, Loader2, Layers
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Custom element registration for JSX (the player is a web component)
declare module 'react' {
    namespace JSX {
        interface IntrinsicElements {
            'hyperframes-player': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement> & {
                src?: string;
                srcdoc?: string;
                controls?: boolean;
                muted?: boolean;
                loop?: boolean;
                autoplay?: boolean;
                poster?: string;
                width?: number;
                height?: number;
                'playback-rate'?: number;
                'audio-src'?: string;
                'disable-click-to-play'?: boolean;
            };
        }
    }
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface StudioPlayerElement extends HTMLElement {
    play(): void;
    pause(): void;
    seek(t: number): void;
    ready: boolean;
    duration: number;
    paused: boolean;
    addEventListener(type: string, listener: (e: CustomEvent) => void): void;
    removeEventListener(type: string, listener: (e: CustomEvent) => void): void;
}

type Gs = 'brief' | 'rendering' | 'ready' | 'embed';

// HyperFrames Studio embed (their official editor UI), mounted in its own
// document at /studio.html; the service worker routes its /api/projects/*
// traffic to the composition store the main app feeds via postMessage.
const StudioEmbed: React.FC<{ composition: string; onExit: () => void }> = ({ composition, onExit }) => {
    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const [ready, setReady] = useState(false);

    const push = useCallback(
        (msg: Record<string, unknown>) => {
            iframeRef.current?.contentWindow?.postMessage(msg, window.location.origin);
        },
        [],
    );

    // On embed load: feed composition + runtime source, then flip the flag
    const handleLoad = useCallback(() => {
        // The embed announces itself; wait for its 'embed-ready' ack via message event
    }, []);

    // Push the generated composition + the composition runtime into the embed.
    // Sent on embed-ready, and renewed whenever the composition is re-adopted.
    useEffect(() => {
        if (!composition) return;
        let rtSource = '';
        try {
            // runtime export shape: { RUNTIME_IIFE } — unwrap if wrapped
            const mod = getHyperframeRuntimeScript as unknown as { RUNTIME_IIFE?: string } | (() => string);
            rtSource = typeof mod === 'function' ? mod() : (mod.RUNTIME_IIFE ?? '');
        } catch { /* embed falls back to its own URL-based runtime */ }
        const send = () => {
            push({ type: 'studio:composition', asset: { html: composition } });
            if (rtSource) push({ type: 'studio:runtime', source: rtSource });
        };
        push({ type: 'studio:hello' });
        const onMsg = (ev: MessageEvent) => {
            if (ev.origin !== window.location.origin) return;
            const type = (ev.data as { type?: string })?.type;
            if (type === 'studio:embed-ready') {
                setReady(true);
                send();
            }
        };
        window.addEventListener('message', onMsg);
        return () => window.removeEventListener('message', onMsg);
    }, [composition, push, setReady]);

    return (
        <div className="fixed inset-0 z-[90] bg-zinc-950 flex flex-col">
            <div className="h-12 shrink-0 border-b border-zinc-800 bg-zinc-950 flex items-center px-4 gap-3">
                <button
                    onClick={onExit}
                    className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-indigo-500/30 text-zinc-400 hover:text-white text-xs font-bold transition-all"
                >
                    ← Back to composer
                </button>
                <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-600">
                    HyperFrames Studio workspace · edits apply live to your composition
                </span>
                {!ready && <span className="ml-auto text-[10px] text-indigo-400 font-mono animate-pulse">Booting workspace…</span>}
            </div>
            <iframe
                ref={iframeRef}
                src="/studio.html#project/adopecanva-studio"
                onLoad={handleLoad}
                title="AdopeCanva Studio Workspace (HyperFrames Studio)"
                className="flex-1 w-full"
                style={{ border: 0, background: '#09090b' }}
            />
        </div>
    );
};

interface ModelOption {
    id: string;
    label: string;
    blurb: string;
    icon: LucideIcon;
    recommended?: boolean;
    budget?: boolean;
}

interface CatalogItem {
    name: string;
    type: 'block' | 'component';
    title?: string;
    description?: string;
    tags?: string[];
    duration?: number;
    width?: number;
    height?: number;
    preview?: { video?: string; poster?: string };
    itemMetaFetched?: boolean;
}

// ─── Composition contract prompt ─────────────────────────────────────────────

const SYSTEM_PROMPT = `You are an expert HyperFrames motion designer. You output ONE complete, standalone HTML composition and nothing else — no markdown fences, no commentary.

HYPERFRAMES COMPOSITION CONTRACT (mandatory):
1. Document: <!doctype html> + <head> with <style> + <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>. No other external scripts.
2. Root element: a single <div> with id="root", class set so it fills the viewport, and these attributes: data-composition-id="main" data-start="0" data-width="WIDTH" data-height="HEIGHT" data-duration="DURATION". The root must have width:100%;height:100%;overflow:hidden;position:relative in CSS. NEVER hardcode WIDTHpx/HEIGHTpx on #root.
3. Clips: timed elements carry class="clip" plus data-start and data-duration (seconds, numbers). Give every timed element a unique id. .clip elements should be position:absolute;inset:0 with their own layout inside.
4. Animation: build exactly ONE timeline: const tl = gsap.timeline({ paused: true }); Register it as: window.__timelines["main"] = tl; at the END of the script. Only use finite repeats. No Math.random without a seed. No wall-clock timers (setInterval/setTimeout/rAF), no network calls.
5. GSAP safety rules:
   - Never tween CSS transform values that are also set in CSS on the same element. Set initial states inside the tween.
   - Never animate autoAlpha, visibility or display on a .clip element itself — animate an inner child instead.
   - Do not add scene-exit visibility sets on clips; the runtime hides clips outside their window automatically. Use opacity fades on inner elements for exits.
6. Media: if the brief needs audio, use <audio id="bgm" data-start="0" data-duration="DURATION" data-volume="0.5" src="..."></audio>. Only reference src if the user explicitly gave a URL; otherwise skip media entirely. Every <audio>/<video> MUST have a unique id and MUST NOT have a crossorigin attribute.
7. Typography: use system fonts only (font-family: Inter, system-ui, sans-serif). Do not reference @font-face or Google Fonts.
8. Background: the root (or a full-bleed first child) sets the page background so no transparent frame is possible.
9. Visual quality bar: this is a premium motion design tool. Use a refined dark palette (zinc-950 base) with indigo (#4F46E5) accents used sparingly as glows and highlights, strong typographic hierarchy with big bold headings, generous negative space, smooth power2/power3 easing, staggered reveals. Motion should feel elegant and confident — subtle scale, y-drifts, soft blur-in — not gimmicky.

Output the raw HTML document only, starting with <!doctype html>.`;

// ─── Models (OpenRouter — one key, any model) ────────────────────────────────
// IDs verified live against openrouter.ai/api/v1/models (Oct 2026).

const OPENROUTER_MODELS: ModelOption[] = [
    { id: 'google/gemini-3.8-flash', label: 'Gemini 3.8 Flash', blurb: 'Newest Google model — fast, sharp at composition contracts', icon: Sparkles, recommended: true },
    { id: 'anthropic/claude-opus-5.5', label: 'Claude Opus 5.5', blurb: 'Highest quality motion design and code structure', icon: Wand2, recommended: true },
    { id: 'anthropic/claude-sonnet-5.5', label: 'Claude Sonnet 5.5', blurb: 'Strong coder at a mid tier price', icon: Wand2 },
    { id: 'openai/gpt-6.1-sol', label: 'GPT-6.1 Sol', blurb: 'OpenAI flagship reasoning', icon: Code2 },
    { id: 'deepseek/deepseek-v3.2', label: 'DeepSeek V3.2', blurb: 'Capable and extremely cheap', icon: LayoutGrid, budget: true },
];

const CUSTOM_MODEL: ModelOption = { id: 'custom', label: 'Custom model ID…', blurb: 'Any OpenRouter model — paste its ID', icon: Code2 };

const modelIcon = (m: ModelOption) => m.icon;

// ─── OpenRouter generation ───────────────────────────────────────────────────

async function generateWithOpenRouter(apiKey: string, model: string, userPrompt: string): Promise<string> {
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.origin,
            'X-Title': 'AdopeCanva Studio',
        },
        body: JSON.stringify({
            model,
            temperature: 0.8,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: userPrompt },
            ],
        }),
    });
    if (!res.ok) {
        let detail = `${res.status} ${res.statusText}`;
        try {
            const j: { error?: { message?: string } } = await res.json();
            detail = j?.error?.message || detail;
        } catch { /* keep status line */ }
        throw new Error(`OpenRouter request failed: ${detail}`);
    }
    const data: { choices?: { message?: { content?: string } }[] } = await res.json();
    return data.choices?.[0]?.message?.content ?? '';
}

// ─── Composition help ────────────────────────────────────────────────────────

const ASPECTS = [
    { id: '16:9', label: 'Landscape', width: 1920, height: 1080 },
    { id: '9:16', label: 'Vertical', width: 1080, height: 1920 },
    { id: '1:1', label: 'Square', width: 1080, height: 1080 },
];

const EXAMPLE_BRIEFS = [
    'A 6-second launch teaser for "Nimbus Notes": kinetic headline, floating card mockup feel, elegant fade-up staggers',
    'A minimal 5-second logo sting for a fintech startup called "Ledgerline"',
    'An 8-second explainer intro about "3 habits of effective teams" with sequential stat cards',
];

// ─── HyperFrames catalog (open registry, 400 blocks/components) ──────────────

const REGISTRY_URL = 'https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry/registry.json';
const REGISTRY_RAW = 'https://raw.githubusercontent.com/heygen-com/hyperframes/main/registry';
const REGISTRY_CACHE_KEY = 'studio_hf_registry_cache_v1';

let registryCachePromise: Promise<CatalogItem[]> | null = null;

async function fetchRegistry(): Promise<CatalogItem[]> {
    try {
        const cached = localStorage.getItem(REGISTRY_CACHE_KEY);
        if (cached) {
            const { ts, items } = JSON.parse(cached) as { ts: number; items: CatalogItem[] };
            if (Date.now() - ts < 24 * 3600e3 && Array.isArray(items) && items.length) return items;
        }
    } catch { /* ignore */ }
    if (!registryCachePromise) {
        registryCachePromise = (async () => {
            const res = await fetch(REGISTRY_URL);
            if (!res.ok) throw new Error(`Registry fetch failed: ${res.status}`);
            const reg: unknown = await res.json();
            const rawList = (Array.isArray(reg) ? reg : (reg as { items?: unknown[] }).items || []) as Array<{ name: string; type: string }>;
            const items = rawList.map(i => ({
                name: i.name,
                type: i.type === 'hyperframes:component' ? 'component' as const : 'block' as const,
            }));
            try { localStorage.setItem(REGISTRY_CACHE_KEY, JSON.stringify({ ts: Date.now(), items })); } catch { /* ignore */ }
            return items;
        })().catch(e => { registryCachePromise = null; throw e; });
    }
    return registryCachePromise;
}

async function fetchItemMeta(name: string, type: 'block' | 'component'): Promise<CatalogItem> {
    const res = await fetch(`${REGISTRY_RAW}/${type}s/${name}/registry-item.json`);
    if (!res.ok) throw new Error(`Metadata fetch failed for ${name}`);
    const meta = (await res.json()) as {
        title?: string;
        description?: string;
        tags?: string[];
        duration?: number;
        dimensions?: { width?: number; height?: number };
        preview?: { video?: string; poster?: string };
    };
    return {
        name,
        type,
        title: meta.title,
        description: meta.description,
        tags: meta.tags,
        duration: meta.duration,
        width: meta.dimensions?.width,
        height: meta.dimensions?.height,
        preview: meta.preview,
        itemMetaFetched: true,
    };
}

async function fetchBlockHtml(name: string): Promise<string> {
    const res = await fetch(`${REGISTRY_RAW}/blocks/${name}/${name}.html`);
    if (!res.ok) throw new Error(`Could not load composition for ${name}`);
    return res.text();
}

// ─── Utils ───────────────────────────────────────────────────────────────────

function extractHtml(text: string): string {
    const fence = text.match(/```(?:html)?\s*([\s\S]*?)```/i);
    let html = (fence ? fence[1] : text).trim();
    const start = html.search(/<!doctype html|<html/i);
    if (start > 0) html = html.slice(start);
    return html.trim();
}

function downloadHtml(html: string) {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'adopecanva-studio-composition.html';
    a.click();
    URL.revokeObjectURL(url);
}

// ─── Custom model dropdown ───────────────────────────────────────────────────

const ModelDropdown: React.FC<{
    models: ModelOption[];
    value: string;
    onSelect: (id: string) => void;
}> = ({ models, value, onSelect }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!open) return;
        const onDoc = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', onDoc);
        return () => document.removeEventListener('mousedown', onDoc);
    }, [open]);

    const selected = models.find(m => m.id === value) ?? CUSTOM_MODEL;

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setOpen(o => !o)}
                className="w-full flex items-center justify-between gap-2 bg-zinc-950/70 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 hover:border-indigo-500/30 transition-all duration-300 text-left"
            >
                <span className="flex items-center gap-2.5 min-w-0">
                    <selected.icon size={14} className="text-indigo-400 shrink-0" />
                    <span className="truncate font-semibold">{selected.label}</span>
                    {selected.budget && <span className="text-[9px] uppercase tracking-widest text-zinc-600 shrink-0">budget</span>}
                </span>
                <ChevronDown size={14} className={`text-zinc-500 transition-transform duration-300 shrink-0 ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
                <div className="absolute z-50 mt-2 w-full bg-zinc-900 border border-zinc-800 rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.6)] overflow-hidden animate-fade-in">
                    <div className="px-4 py-2.5 border-b border-zinc-800/80">
                        <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">Choose a model</span>
                    </div>
                    <div className="max-h-72 overflow-y-auto p-1.5 custom-scrollbar">
                        {models.map(m => (
                            <button
                                key={m.id}
                                onClick={() => { onSelect(m.id); setOpen(false); }}
                                className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 ${m.id === value ? 'bg-indigo-500/10 border border-indigo-500/20' : 'border border-transparent hover:bg-zinc-800/60'}`}
                            >
                                <span className="w-7 h-7 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0 mt-0.5">
                                    {React.createElement(modelIcon(m), { size: 13, className: 'text-indigo-400' })}
                                </span>
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-center gap-2">
                                        <span className="text-sm font-semibold text-zinc-100 truncate">{m.label}</span>
                                        {m.recommended && <span className="text-[9px] uppercase tracking-widest font-bold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 rounded-full px-1.5 py-px shrink-0">Recommended</span>}
                                    </span>
                                    <span className="block text-[11px] text-zinc-500 leading-snug mt-0.5">{m.blurb}</span>
                                </span>
                                {m.id === value && <Check size={14} className="text-indigo-400 shrink-0 mt-2" />}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={() => { onSelect('custom'); setOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4.5 py-3 border-t border-zinc-800/80 text-left transition-all duration-200 ${CUSTOM_MODEL.id === value ? 'bg-indigo-500/10' : 'hover:bg-zinc-800/60'}`}
                        style={{ paddingInline: '1.125rem' }}
                    >
                        <span className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
                            <Code2 size={13} className="text-zinc-400" />
                        </span>
                        <span className="flex-1">
                            <span className="text-sm font-semibold text-zinc-100">Custom model ID…</span>
                            <span className="block text-[11px] text-zinc-500">Paste any OpenRouter model ID (vendor/model)</span>
                        </span>
                    </button>
                </div>
            )}
        </div>
    );
};

// ─── HyperFrames catalog modal ───────────────────────────────────────────────

const CatalogModal: React.FC<{
    onClose: () => void;
    onUseBlock: (html: string, name: string) => void;
    onMention: (name: string, title?: string) => void;
}> = ({ onClose, onUseBlock, onMention }) => {
    const [items, setItems] = useState<CatalogItem[] | null>(null);
    const [query, setQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState<'block' | 'component' | 'all'>('block');
    const [selected, setSelected] = useState<CatalogItem | null>(null);
    const [metaLoading, setMetaLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [useBusy, setUseBusy] = useState(false);

    const selectItem = useCallback(async (item: CatalogItem) => {
        setSelected(item);
        setLoadError(null);
        if (!item.itemMetaFetched && !item.title) {
            setMetaLoading(true);
            try {
                const meta = await fetchItemMeta(item.name, item.type);
                setSelected(meta);
            } catch {
                // metadata optional — the list entry still works
            } finally {
                setMetaLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        fetchRegistry()
            .then(regItems => {
                setItems(regItems);
                const first = regItems.find(i => i.type === 'block');
                if (first) void selectItem(first);
            })
            .catch(e => setLoadError(e instanceof Error ? e.message : 'Failed to load the HyperFrames registry.'));
    }, []);

    const filtered = useMemo(() => {
        return (items ?? []).filter(i =>
            (typeFilter === 'all' || i.type === typeFilter) &&
            (!query || i.name.toLowerCase().includes(query.toLowerCase()))
        );
    }, [items, query, typeFilter]);

    const handleUse = useCallback(async () => {
        if (!selected || selected.type !== 'block') return;
        setUseBusy(true);
        setLoadError(null);
        try {
            const html = await fetchBlockHtml(selected.name);
            onUseBlock(html, selected.name);
        } catch (e) {
            setLoadError(e instanceof Error ? e.message : 'Failed to load the block.');
        } finally {
            setUseBusy(false);
        }
    }, [selected, onUseBlock]);

    return (
        <div className="relative w-full max-w-5xl h-full bg-zinc-950 border border-zinc-800 rounded-3xl shadow-[0_24px_64px_rgba(0,0,0,0.7)] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center gap-4 px-5 py-4 border-b border-zinc-800/80 shrink-0">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                    <Puzzle size={18} className="text-indigo-400" />
                </div>
                <div className="min-w-0">
                    <h3 className="font-unbounded text-lg text-white">HyperFrames Catalog</h3>
                    <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                        Open registry · 170 blocks · 222 components · Apache-2.0
                    </p>
                </div>
                <button
                    onClick={onClose}
                    className="ml-auto w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-500 hover:text-white transition-colors"
                    aria-label="Close catalog"
                >
                    <X size={15} />
                </button>
            </div>

            <div className="flex flex-1 min-h-0">
                {/* List */}
                <div className="w-80 border-r border-zinc-800/80 flex flex-col min-h-0 shrink-0">
                    <div className="p-3 space-y-2.5 border-b border-zinc-800/80">
                        <div className="relative">
                            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" />
                            <input
                                autoFocus
                                value={query}
                                onChange={e => setQuery(e.target.value)}
                                placeholder="Search by name…"
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/40"
                            />
                        </div>
                        <div className="flex gap-1">
                            {(['block', 'component', 'all'] as const).map(t => (
                                <button
                                    key={t}
                                    onClick={() => setTypeFilter(t)}
                                    className={`flex-1 px-2 py-1.5 rounded-lg text-[10px] uppercase tracking-widest font-bold transition-all duration-300 ${typeFilter === t ? 'bg-indigo-500/15 text-indigo-300' : 'text-zinc-500 hover:text-zinc-300 bg-zinc-900/60'}`}
                                >
                                    {t === 'all' ? 'All' : t === 'block' ? 'Blocks' : 'Components'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar p-1.5">
                        {loadError && (items === null) && (
                            <p className="text-xs text-red-400 p-4">{loadError}</p>
                        )}
                        {items === null && !loadError && (
                            <div className="flex items-center justify-center py-16">
                                <div className="w-6 h-6 rounded-full border-2 border-zinc-800 border-t-indigo-500 animate-spin" />
                            </div>
                        )}
                        {filtered.map(item => (
                            <button
                                key={`${item.type}-${item.name}`}
                                onClick={() => void selectItem(item)}
                                className={`w-full text-left px-3 py-2 rounded-lg transition-all duration-200 border ${selected?.name === item.name && selected?.type === item.type ? 'bg-indigo-500/10 border-indigo-500/20' : 'border-transparent hover:bg-zinc-900'}`}
                            >
                                <span className="block text-xs font-semibold text-zinc-200 truncate">{item.name}</span>
                                <span className="block text-[9px] uppercase tracking-widest text-zinc-600">{item.type}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Detail */}
                <div className="flex-1 min-w-0 flex flex-col">
                    {selected ? (
                        <div className="flex-1 min-h-0 flex flex-col">
                            <div className="p-5 pb-3">
                                <h4 className="text-xl font-bold text-white">{metaLoading && !selected.title ? selected.name : (selected.title || selected.name)}</h4>
                                {selected.description && (
                                    <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">{selected.description}</p>
                                )}
                                {selected.tags && selected.tags.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 mt-3">
                                        {selected.tags.map(t => (
                                            <span key={t} className="text-[9px] uppercase tracking-widest font-bold text-zinc-400 bg-zinc-900 border border-zinc-800 rounded-full px-2 py-0.5">{t}</span>
                                        ))}
                                    </div>
                                )}
                                <div className="flex gap-4 mt-3 text-[10px] uppercase tracking-widest font-bold text-zinc-600">
                                    {selected.duration != null && <span>{selected.duration}s</span>}
                                    {selected.width != null && <span>{selected.width}×{selected.height}</span>}
                                </div>
                            </div>

                            {/* Preview surface */}
                            <div className="flex-1 min-h-0 bg-zinc-900/40 border-y border-zinc-800/60 flex items-center justify-center p-4">
                                {selected.preview?.video ? (
                                    <video
                                        key={selected.preview.video}
                                        src={selected.preview.video}
                                        poster={selected.preview.poster}
                                        autoPlay
                                        muted
                                        loop
                                        playsInline
                                        controls
                                        className="max-h-full max-w-full rounded-xl border border-zinc-800"
                                    />
                                ) : (
                                    <p className="text-xs text-zinc-600">No preview video for this item{metaLoading ? ' — loading metadata…' : '.'}</p>
                                )}
                            </div>

                            {/* Actions */}
                            <div className="flex flex-wrap items-center gap-2.5 p-4">
                                {selected.type === 'block' && (
                                    <button
                                        onClick={() => void handleUse()}
                                        disabled={useBusy}
                                        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold transition-all duration-300 shadow-[0_8px_32px_rgba(79,70,229,0.25)]"
                                    >
                                        {useBusy ? <Loader2 size={13} className="animate-spin" /> : <MonitorPlay size={13} />}
                                        {useBusy ? 'Loading…' : 'Use as starting point'}
                                    </button>
                                )}
                                <button
                                    onClick={() => { onMention(selected.name, selected.title); }}
                                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800/70 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-bold transition-all duration-300"
                                >
                                    <BookOpen size={13} />
                                    Mention in my brief
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-1 flex items-center justify-center">
                            <p className="text-xs text-zinc-600">Select an item{loadError ? ' (metadata offline — names still searchable)' : ''}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ─── Main component ──────────────────────────────────────────────────────────

export const Studio: React.FC = () => {
    const [brief, setBrief] = useState('');
    const [aspect, setAspect] = useState(ASPECTS[0]);
    const [duration, setDuration] = useState(6);
    const [stage, setStage] = useState<Gs>('brief');
    const [error, setError] = useState<string | null>(null);
    const [composition, setComposition] = useState<string | null>(null);
    const [parsed, setParsed] = useState<ParsedHtml | null>(null);
    const [parseError, setParseError] = useState<string | null>(null);
    const [playerReady, setPlayerReady] = useState(false);
    const [playerDuration, setPlayerDuration] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [showCode, setShowCode] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [openrouterKey, setOpenrouterKey] = useState('');
    const [model, setModel] = useState<string>(() => {
        try { return localStorage.getItem('studio_model') || 'google/gemini-3.8-flash'; } catch { return 'google/gemini-3.8-flash'; }
    });
    const [catalogOpen, setCatalogOpen] = useState(false);

    const playerRef = useRef<StudioPlayerElement | null>(null);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (stage !== 'rendering') {
            if (timerRef.current) clearInterval(timerRef.current);
            timerRef.current = null;
            if (stage === 'brief') setElapsed(0);
        }
    }, [stage]);

    const validation = useMemo(() => {
        if (!parsed) return null;
        const elements = 'elements' in parsed ? (parsed as { elements?: unknown[] }).elements?.length ?? 0 : 0;
        return { elements };
    }, [parsed]);

    const adoptComposition = useCallback((html: string, opts: { parsed?: ParsedHtml | null; parseError?: string | null } = {}) => {
        setError(null);
        setParsed(opts.parsed ?? null);
        setParseError(opts.parseError ?? null);
        setComposition(html);
        setPlayerReady(false);
        setStage('ready');
    }, []);

    const handleUseBlock = useCallback((html: string, name: string) => {
        try {
            const p = parseHtml(html) as unknown as ParsedHtml;
            adoptComposition(html, { parsed: p });
        } catch (e) {
            adoptComposition(html, { parseError: e instanceof Error ? e.message : String(e) });
        }
        setCatalogOpen(false);
    }, [adoptComposition]);

    const handleMentionBlock = useCallback((name: string, title?: string) => {
        setBrief(b => `${b.trim()}${b.trim() ? ' — ' : ''}Use a visual in the style of the HyperFrames catalog block "${title || name}" (id: ${name}).`.slice(0, 1000));
    }, []);

    const handleGenerate = useCallback(async () => {
        if (!brief.trim()) return;
        const apiKey = openrouterKey;
        if (!apiKey) throw new Error('Enter your OpenRouter API key first.');
        setError(null);
        setParseError(null);
        setParsed(null);
        setComposition(null);
        setPlayerReady(false);
        setStage('rendering');

        timerRef.current = setInterval(() => setElapsed(e => e + 0.5), 500);

        try {
            if (!model) throw new Error('Pick a model first.');

            const userPrompt = `Create a HyperFrames composition for this brief:

BRIEF: ${brief.trim()}

CANVAS: ${aspect.width}x${aspect.height} (${aspect.id}). DURATION: exactly ${duration} seconds (set data-duration="${duration}" on the root).

Respond with the complete HTML document only.`;

            const text = await generateWithOpenRouter(apiKey, model, userPrompt);

            if (!text) throw new Error('The model returned an empty response. Try rephrasing the brief or another model.');

            const html = extractHtml(text);
            if (!/data-composition-id/i.test(html)) {
                throw new Error('The generated composition is missing the HyperFrames root contract (data-composition-id). Try generating again or pick another model.');
            }

            try {
                const p = parseHtml(html) as unknown as ParsedHtml;
                adoptComposition(html, { parsed: p });
            } catch (e) {
                console.warn('parseHtml failed (preview still available):', e);
                adoptComposition(html, { parseError: e instanceof Error ? e.message : String(e) });
            }
            setStage('ready');
        } catch (e) {
            console.error('Studio generation failed:', e);
            setError(e instanceof Error ? e.message : 'Something went wrong while generating the composition.');
            setStage('brief');
        }
    }, [brief, aspect, duration, model, openrouterKey, adoptComposition]);

    const attachPlayer = useCallback((el: StudioPlayerElement | null) => {
        playerRef.current = el;
        if (!el) return;
        const onReady = (e: CustomEvent) => {
            setPlayerReady(true);
            setPlayerDuration(e.detail?.duration ?? 0);
        };
        const onPlay = () => setPlaying(true);
        const onPause = () => setPlaying(false);
        const onError = () => setError('The composition could not be played. Try editing the code or regenerating.');
        el.addEventListener('ready', onReady as EventListener);
        el.addEventListener('play', onPlay as EventListener);
        el.addEventListener('pause', onPause as EventListener);
        el.addEventListener('error', onError as EventListener);
    }, []);

    const togglePlay = useCallback(() => {
        const p = playerRef.current;
        if (!p) return;
        if (p.paused) { p.seek(0); p.play(); } else { p.pause(); }
    }, []);

    const statusChip = useMemo(() => {
        if (parseError) return { icon: ShieldX, text: 'Parse warning — preview may still work', tone: 'amber' as const };
        if (parsed) return { icon: ShieldCheck, text: `Validated · ${validation?.elements ?? 0} timeline elements`, tone: 'emerald' as const };
        return { icon: CircleDot, tone: 'zinc' as const };
    }, [parsed, parseError, validation]);

    return (
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-10 animate-fade-in">
            {/* Header */}
            <div className="flex items-start gap-4 mb-8">
                <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0 shadow-[0_8px_32px_rgba(79,70,229,0.15)]">
                    <Clapperboard className="text-indigo-400" size={26} />
                </div>
                <div>
                    <h1 className="font-unbounded text-3xl md:text-4xl text-white tracking-tight">Studio</h1>
                    <p className="text-zinc-400 mt-2 text-sm md:text-base">
                        Describe a video — an AI agent writes the motion composition, right in your browser.
                    </p>
                </div>
                <div className="ml-auto hidden md:flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-zinc-500 bg-zinc-900/60 border border-zinc-800 rounded-full px-3 py-1.5">
                    <Wand2 size={12} className="text-indigo-400" />
                    Phase 0 Preview
                </div>
            </div>

            {stage === 'brief' && (
                <div className="space-y-6">
                    {/* Model settings */}
                    <div className="bg-zinc-900/40 border border-zinc-800/60 rounded-2xl p-4 md:p-5 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-2">Model <span className="text-zinc-700 normal-case tracking-normal font-normal">via OpenRouter</span></label>
                                <ModelDropdown
                                    models={[...OPENROUTER_MODELS, CUSTOM_MODEL]}
                                    value={model}
                                    onSelect={(id: string) => {
                                        setModel(id);
                                        try { localStorage.setItem('studio_model', id); } catch { /* private mode */ }
                                    }}
                                />
                                <p className="text-[10px] text-zinc-600 mt-1.5">One key for hundreds of models — strong coding models write better compositions.</p>
                            </div>
                            <div>
                                <ApiKeyInput
                                    serviceName="OPENROUTER"
                                    localStorageKey="openrouter_api_key"
                                    onKeyChange={setOpenrouterKey}
                                    compact
                                />
                                <p className="text-[10px] text-zinc-600 mt-1.5">One key, hundreds of models — openrouter.ai/keys. Stored in this browser only.</p>
                            </div>
                        </div>

                        <p className="text-[10px] text-zinc-600 leading-relaxed border-t border-zinc-800/60 pt-3 flex items-start gap-1.5">
                            <Info size={11} className="inline mr-1 mt-0.5 shrink-0" />
                            <span>Your brief is sent to OpenRouter (the model you chose) to generate the composition. Parsing, validation, preview and export all run entirely in your browser — your media never leaves the device.</span>
                        </p>
                    </div>

                    {/* Brief composer */}
                    <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-5 md:p-6 transition-all duration-300 focus-within:border-indigo-500/30 focus-within:shadow-[0_8px_32px_rgba(79,70,229,0.15)]">
                        <div className="flex items-center justify-between mb-3">
                            <label className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                                Video brief
                            </label>
                            <button
                                onClick={() => setCatalogOpen(true)}
                                className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-bold text-indigo-400 hover:text-indigo-300 transition-colors"
                            >
                                <Puzzle size={12} />
                                Elements catalog
                                <span className="text-zinc-600 normal-case tracking-normal font-normal">· 400 ready visuals</span>
                            </button>
                        </div>
                        <textarea
                            value={brief}
                            onChange={e => setBrief(e.target.value)}
                            placeholder="e.g. A 6-second teaser for my app: dark background, big kinetic headline 'Meet Nimbus', floating UI card, soft glow…"
                            rows={4}
                            className="w-full bg-zinc-950/70 border border-zinc-800 rounded-xl p-4 text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/40 resize-none text-sm leading-relaxed"
                        />

                        <div className="flex flex-wrap items-end gap-4 mt-4">
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-2">Format</label>
                                <div className="flex gap-1.5 bg-zinc-950/70 border border-zinc-800 rounded-xl p-1">
                                    {ASPECTS.map(a => (
                                        <button
                                            key={a.id}
                                            onClick={() => setAspect(a)}
                                            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-300 ${aspect.id === a.id ? 'bg-indigo-500/15 text-indigo-300' : 'text-zinc-500 hover:text-zinc-300'}`}
                                        >
                                            {a.label} <span className="opacity-60">{a.id}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="block text-[10px] uppercase tracking-widest font-bold text-zinc-500 mb-2">Duration: <span className="text-indigo-300 font-mono">{duration}s</span></label>
                                <input
                                    type="range" min={3} max={15} step={1} value={duration}
                                    onChange={e => setDuration(parseInt(e.target.value, 10))}
                                    className="w-40 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                />
                            </div>

                            <button
                                onClick={handleGenerate}
                                disabled={!brief.trim() || !openrouterKey}
                                className="ml-auto inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition-all duration-300 shadow-[0_8px_32px_rgba(79,70,229,0.25)] hover:-translate-y-0.5 disabled:hover:translate-y-0"
                            >
                                <Sparkles size={16} />
                                Generate Composition
                            </button>
                        </div>
                    </div>

                    {/* Example briefs */}
                    <div>
                        <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-600 mb-2">Need inspiration?</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {EXAMPLE_BRIEFS.map((b, i) => (
                                <button
                                    key={i}
                                    onClick={() => setBrief(b)}
                                    className="text-left text-xs text-zinc-400 bg-zinc-900/40 hover:bg-zinc-900 border border-zinc-800/60 hover:border-indigo-500/30 rounded-xl p-3.5 transition-all duration-300 leading-relaxed"
                                >
                                    {b}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Feature strip */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
                        {[
                            { icon: Wand2, label: 'Agentic', desc: 'AI writes the motion' },
                            { icon: ShieldCheck, label: 'Validated', desc: 'HyperFrames core checks it' },
                            { icon: Eye, label: 'Instant', desc: 'Timeline-accurate preview' },
                            { icon: Puzzle, label: 'Catalog', desc: '400 free blocks built in' },
                        ].map(f => (
                            <div key={f.label} className="bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-zinc-700">
                                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center mb-3">
                                    <f.icon size={15} className="text-indigo-400" />
                                </div>
                                <p className="text-sm font-bold text-zinc-200">{f.label}</p>
                                <p className="text-[10px] uppercase tracking-widest text-zinc-500 mt-1">{f.desc}</p>
                            </div>
                        ))}
                    </div>

                    {error && (
                        <div className="flex items-start gap-3 bg-red-500/5 border border-red-500/20 rounded-xl p-4 text-sm text-red-300">
                            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
                            {error}
                        </div>
                    )}
                </div>
            )}

            {stage === 'rendering' && (
                <div className="flex flex-col items-center justify-center py-24">
                    <div className="relative w-20 h-20 mb-8">
                        <div className="absolute inset-0 rounded-full border-2 border-zinc-800"></div>
                        <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-indigo-500 animate-spin"></div>
                        <Sparkles className="absolute inset-0 m-auto text-indigo-400" size={22} />
                    </div>
                    <h2 className="font-unbounded text-xl text-white mb-2">Directing your video…</h2>
                    <p className="text-zinc-500 text-sm mb-1">The agent is writing your composition</p>
                    <p className="text-zinc-600 text-xs font-mono">{elapsed.toFixed(1)}s elapsed — typically 5-20s</p>
                </div>
            )}

            {stage === 'ready' && composition && (
                <div className="space-y-5">
                    {/* Preview surface */}
                    <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/60">
                            <div className="flex items-center gap-3">
                                <statusChip.icon size={14} className={statusChip.tone === 'emerald' ? 'text-emerald-400' : statusChip.tone === 'amber' ? 'text-amber-400' : 'text-zinc-500'} />
                                <span className="text-xs text-zinc-400">{statusChip.text}</span>
                            </div>
                            <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-600">
                                {aspect.id} · {playerDuration ? `${playerDuration.toFixed(1)}s` : `${duration}s`}
                            </span>
                        </div>

                        <div className="bg-zinc-950 flex items-center justify-center p-4 md:p-6" style={{ minHeight: 320 }}>
                            <hyperframes-player
                                ref={attachPlayer}
                                srcdoc={composition}
                                controls
                                muted
                                width={aspect.width}
                                height={aspect.height}
                                style={{ width: '100%', maxWidth: 854, aspectRatio: `${aspect.width} / ${aspect.height}` }}
                            />
                        </div>

                        {/* Transport row */}
                        <div className="flex items-center justify-center gap-3 px-4 py-3 border-t border-zinc-800/60 bg-zinc-900/40">
                            <button
                                onClick={togglePlay}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 text-xs font-bold transition-all duration-300 border border-indigo-500/20"
                            >
                                {playing ? <Square size={13} /> : <Play size={13} />}
                                {playing ? 'Stop' : 'Play from start'}
                            </button>
                            <button
                                onClick={() => { playerRef.current?.seek(0); }}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-zinc-800/60 hover:bg-zinc-800 text-zinc-300 text-xs font-bold transition-all duration-300 border border-zinc-700/60"
                            >
                                <RotateCcw size={13} />
                                Rewind
                            </button>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-3">
                        <button
                            onClick={() => downloadHtml(composition)}
                            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all duration-300 shadow-[0_8px_32px_rgba(79,70,229,0.25)] hover:-translate-y-0.5"
                        >
                            <Download size={15} />
                            Export Composition (.html)
                        </button>
                        <button
                            onClick={() => setStage('embed')}
                            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/20 text-indigo-300 text-sm font-bold transition-all duration-300"
                        >
                            <Layers size={15} />
                            Open Studio Workspace
                        </button>
                        <button
                            onClick={() => setShowCode(s => !s)}
                            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-zinc-800/70 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm font-bold transition-all duration-300"
                        >
                            <Code2 size={15} />
                            {showCode ? 'Hide code' : 'View code'}
                        </button>
                        <button
                            onClick={() => setCatalogOpen(true)}
                            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-zinc-800/70 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm font-bold transition-all duration-300"
                        >
                            <Puzzle size={15} />
                            Catalog
                        </button>
                        <button
                            onClick={() => { setStage('brief'); setComposition(null); setParsed(null); }}
                            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl text-zinc-400 hover:text-white text-sm font-semibold transition-all duration-300"
                        >
                            <Sparkles size={15} />
                            New brief
                        </button>
                    </div>

                    {showCode && (
                        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden">
                            <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800/60 text-[10px] uppercase tracking-widest font-bold text-zinc-500">
                                <FileCode2 size={12} /> composition.html — HyperFrames source
                            </div>
                            <pre className="p-4 text-xs text-zinc-300 font-mono overflow-auto max-h-96 leading-relaxed">{composition}</pre>
                        </div>
                    )}

                    {parseError && (
                        <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 text-xs text-amber-300">
                            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                            <span><strong>Parser note:</strong> {parseError} — the preview uses the live runtime, so the video still plays correctly.</span>
                        </div>
                    )}

                    <div className="flex items-start gap-3 bg-zinc-900/40 border border-zinc-800/60 rounded-xl p-4 text-xs text-zinc-500 leading-relaxed">
                        <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-zinc-600" />
                        <span>
                            The exported file is a standard HyperFrames composition — preview it in any browser, drop it into
                            HyperFrames Studio, or render it losslessly with <code className="text-zinc-400">npx hyperframes render</code>.
                            In-browser MP4 export is on the Studio roadmap.
                        </span>
                    </div>
                </div>
            )}

            {catalogOpen && (
                <div className="fixed inset-0 z-[80] flex items-center justify-center p-4 md:p-8 animate-fade-in">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setCatalogOpen(false)} />
                    <div className="relative w-full max-w-5xl h-[700px] max-h-full">
                        <CatalogModal
                            onClose={() => setCatalogOpen(false)}
                            onUseBlock={handleUseBlock}
                            onMention={(name, title) => { handleMentionBlock(name, title); setCatalogOpen(false); }}
                        />
                    </div>
                </div>
            )}

            {stage === 'embed' && composition && (
                <StudioEmbed
                    composition={composition}
                    onExit={() => setStage('ready')}
                />
            )}
        </div>
    );
};
