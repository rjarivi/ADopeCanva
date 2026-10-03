import React, { useState, useEffect, useCallback } from 'react';
import { Search, Type, Sliders, Copy, Check, Download, Upload, HardDrive } from 'lucide-react';
import { FileUploader } from '../../components/FileUploader';
import { FileData } from '../../types';

const GOOGLE_FONTS = [
    'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Raleway', 'Oswald',
    'Nunito', 'Poppins', 'Ubuntu', 'Merriweather', 'Playfair Display',
    'Source Serif 4', 'Lora', 'PT Serif', 'Libre Baskerville',
    'Noto Sans', 'Noto Serif', 'Fira Sans', 'Barlow',
    'IBM Plex Sans', 'IBM Plex Mono', 'IBM Plex Serif',
    'Space Grotesk', 'Space Mono', 'DM Sans', 'DM Mono', 'DM Serif Display',
    'Rubik', 'Manrope', 'Plus Jakarta Sans', 'Outfit', 'Sora',
    'Work Sans', 'Mulish', 'Quicksand', 'Karla', 'Cabin',
    'Josefin Sans', 'Josefin Slab', 'Titillium Web', 'Exo 2',
    'Bebas Neue', 'Anton', 'Teko', 'Fjalla One', 'Black Han Sans',
    'Source Code Pro', 'JetBrains Mono', 'Fira Code', 'Inconsolata',
    'Courier Prime', 'Share Tech Mono', 'Roboto Mono',
    'Pacifico', 'Dancing Script', 'Great Vibes', 'Satisfy', 'Sacramento',
    'Lobster', 'Righteous', 'Abril Fatface', 'Bowlby One SC', 'Fredoka',
    'Comfortaa', 'Varela Round', 'Nunito Sans', 'Jost',
    'Cinzel', 'Cormorant Garamond', 'EB Garamond', 'Spectral',
    'Cardo', 'Crimson Text', 'Bitter', 'Arvo', 'Zilla Slab',
    'PT Sans', 'PT Mono', 'Oxygen', 'Dosis', 'Muli',
    'Catamaran', 'Asap', 'Hind', 'Nanum Gothic', 'Almarai',
    'Maven Pro', 'Gothic A1', 'Cantarell', 'Signika', 'Yantramanav',
    'Unbounded', 'Syne', 'Clash Display', 'Cabinet Grotesk',
];

const SIZE_PRESETS = [14, 18, 24, 36, 48, 64, 96];

const loadedFonts = new Set<string>();

function loadFont(name: string) {
    if (loadedFonts.has(name)) return;
    loadedFonts.add(name);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(name)}:wght@400;700&display=swap`;
    document.head.appendChild(link);
}

export const FontPreviewer: React.FC = () => {
    const [query, setQuery] = useState('');
    const [previewText, setPreviewText] = useState('The quick brown fox jumps over the lazy dog');
    const [fontSize, setFontSize] = useState(24);
    const [selectedFont, setSelectedFont] = useState<string | null>(null);
    const [copied, setCopied] = useState<string | null>(null);
    const [visibleCount, setVisibleCount] = useState(40);
    const [customFonts, setCustomFonts] = useState<Array<{ name: string; file: File; format: string }>>([]);
    const [fontError, setFontError] = useState<string | null>(null);

    const handleCustomFont = useCallback(async (fileData: FileData) => {
        const file = fileData.file;
        const ext = (file.name.match(/\.(ttf|otf|woff2?)$/i)?.[1] ?? 'woff2').toLowerCase();
        if (!/\.(ttf|otf|woff2?)$/i.test(file.name)) {
            setFontError('Only .ttf, .otf, .woff and .woff2 files are supported.');
            return;
        }
        setFontError(null);
        try {
            const buffer = await file.arrayBuffer();
            const family = file.name.replace(/\.[^.]+$/, '').replace(/[^\w\s-]/g, ' ').trim() || 'Custom Font';
            const face = new FontFace(family, buffer);
            await face.load();
            document.fonts.add(face);
            setCustomFonts(prev => prev.some(f => f.name === family)
                ? prev
                : [...prev, { name: family, file, format: ext }]);
        } catch {
            setFontError('Could not load this font file — it may be corrupt or an unsupported format.');
        }
    }, []);

    const filteredFonts = GOOGLE_FONTS.filter(f =>
        f.toLowerCase().includes(query.toLowerCase())
    );

    const visibleCustomFonts = customFonts.filter(f =>
        f.name.toLowerCase().includes(query.toLowerCase())
    );

    const visibleFonts = filteredFonts.slice(0, visibleCount);

    // Preload visible fonts
    useEffect(() => {
        visibleFonts.forEach(loadFont);
    }, [visibleFonts]);

    // Load selected font immediately
    useEffect(() => {
        if (selectedFont) loadFont(selectedFont);
    }, [selectedFont]);

    const handleCopyCSS = (name: string) => {
        navigator.clipboard.writeText(`font-family: '${name}', sans-serif;`);
        setCopied(name);
        setTimeout(() => setCopied(null), 2000);
    };

    const handleCopyImport = (name: string) => {
        navigator.clipboard.writeText(
            `@import url('https://fonts.googleapis.com/css2?family=${name.replace(/ /g, '+')}:wght@400;700&display=swap');`
        );
        setCopied(name + '_import');
        setTimeout(() => setCopied(null), 2000);
    };

    const cssSnippetFor = (name: string): string => {
        const custom = customFonts.find(f => f.name === name);
        if (custom) {
            return `@font-face {\n  font-family: '${name}';\n  src: url('./${custom.file.name}') format('${custom.format}');\n}`;
        }
        return `@import url('https://fonts.googleapis.com/css2?family=${name.replace(/ /g, '+')}:wght@400;700&display=swap');\n\nbody {\n  font-family: '${name}', sans-serif;\n}`;
    };

    const handleDownloadCss = (name: string) => {
        const blob = new Blob([cssSnippetFor(name)], { type: 'text/css' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${name.replace(/\s+/g, '-')}.css`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const isCustomFont = selectedFont !== null && customFonts.some(f => f.name === selectedFont);

    if (selectedFont) {
        return (
            <div className="max-w-5xl mx-auto h-[calc(100vh-140px)] min-h-[600px] flex flex-col gap-4 animate-slide-up">
                {/* Header */}
                <div className="flex items-center justify-between gap-4 shrink-0">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setSelectedFont(null)} className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors text-xs font-bold">← Back</button>
                        <div>
                            <h2 className="text-2xl font-black text-white" style={{ fontFamily: `'${selectedFont}', sans-serif` }}>{selectedFont}</h2>
                            <p className="text-xs text-zinc-500">{isCustomFont ? 'Your custom font' : 'Google Fonts'}</p>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleDownloadCss(selectedFont)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-xs font-bold text-indigo-300 hover:bg-indigo-500/20 transition-colors"
                        >
                            <Download size={12} />
                            Download CSS
                        </button>
                        <button
                            onClick={() => handleCopyCSS(selectedFont)}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 hover:text-white transition-colors"
                        >
                            {copied === selectedFont ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                            Copy CSS
                        </button>
                        {!isCustomFont && (
                            <button
                                onClick={() => handleCopyImport(selectedFont)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-400 hover:text-white transition-colors"
                            >
                                {copied === selectedFont + '_import' ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                                Copy @import
                            </button>
                        )}
                    </div>
                </div>

                {/* Size slider */}
                <div className="flex items-center gap-4 bg-zinc-900 rounded-2xl border border-zinc-800 px-5 py-3 shrink-0">
                    <Sliders size={14} className="text-zinc-500 shrink-0" />
                    <input type="range" min={12} max={120} value={fontSize} onChange={e => setFontSize(parseInt(e.target.value))} className="flex-1 accent-indigo-500" />
                    <span className="text-xs font-mono text-indigo-400 w-10 text-right">{fontSize}px</span>
                    <div className="flex gap-1 ml-2">
                        {SIZE_PRESETS.map(s => (
                            <button key={s} onClick={() => setFontSize(s)} className={`text-[10px] px-2 py-1 rounded-lg border font-bold transition-all ${fontSize === s ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-400' : 'border-zinc-800 text-zinc-600 hover:text-zinc-300'}`}>{s}</button>
                        ))}
                    </div>
                </div>

                {/* Editable preview text */}
                <div className="bg-zinc-900 rounded-2xl border border-zinc-800 p-2 shrink-0">
                    <input
                        value={previewText}
                        onChange={e => setPreviewText(e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-zinc-400 outline-none focus:ring-1 focus:ring-indigo-500/50"
                        placeholder="Type preview text..."
                    />
                </div>

                {/* Weight showcase */}
                <div className="flex-1 overflow-y-auto custom-scrollbar bg-zinc-900 rounded-2xl border border-zinc-800 p-8 space-y-8" style={{ fontFamily: `'${selectedFont}', sans-serif` }}>
                    <div>
                        <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest mb-3">Regular 400</p>
                        <p style={{ fontSize: `${fontSize}px`, fontWeight: 400 }} className="text-white leading-tight break-words">
                            {previewText || 'The quick brown fox jumps over the lazy dog'}
                        </p>
                    </div>
                    <div>
                        <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest mb-3">Bold 700</p>
                        <p style={{ fontSize: `${fontSize}px`, fontWeight: 700 }} className="text-white leading-tight break-words">
                            {previewText || 'The quick brown fox jumps over the lazy dog'}
                        </p>
                    </div>
                    <div className="border-t border-zinc-800 pt-6">
                        <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest mb-3">Alphabet</p>
                        <p style={{ fontSize: Math.max(fontSize * 0.7, 14), fontWeight: 400 }} className="text-zinc-300 break-all leading-loose">
                            A B C D E F G H I J K L M N O P Q R S T U V W X Y Z<br />
                            a b c d e f g h i j k l m n o p q r s t u v w x y z<br />
                            0 1 2 3 4 5 6 7 8 9 ! @ # $ % ^ & * ( )
                        </p>
                    </div>
                    <div className="border-t border-zinc-800 pt-6">
                        <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest mb-3">Heading / Body Pair</p>
                        <h1 style={{ fontFamily: `'${selectedFont}', sans-serif`, fontWeight: 700, fontSize: '2rem' }} className="text-white mb-2">Landing Page Headline</h1>
                        <p style={{ fontFamily: `'${selectedFont}', sans-serif`, fontWeight: 400 }} className="text-zinc-400 text-base leading-relaxed">
                            This is body text using {selectedFont}. Clean, readable, and versatile — great for interfaces, editorial layouts, and product pages.
                        </p>
                    </div>
                    {/* CSS snippet */}
                    <div className="border-t border-zinc-800 pt-6">
                        <p className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest mb-3">CSS Snippet</p>
                        <pre className="bg-zinc-950 rounded-xl p-4 text-xs font-mono text-zinc-300 overflow-x-auto custom-scrollbar border border-zinc-800">
{cssSnippetFor(selectedFont)}
                        </pre>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto h-[calc(100vh-140px)] min-h-[600px] flex flex-col gap-4 animate-slide-up">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400"><Type size={26} /></div>
                    <div>
                        <h2 className="text-2xl font-black text-white font-unbounded">Font Previewer</h2>
                        <p className="text-xs text-zinc-500">
                            {GOOGLE_FONTS.length} Google Fonts{customFonts.length > 0 ? ` · ${customFonts.length} custom` : ''} · click any to inspect
                        </p>
                    </div>
                </div>

                {/* Controls */}
                <div className="flex items-center gap-3 flex-wrap">
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                        <input
                            value={query}
                            onChange={e => { setQuery(e.target.value); setVisibleCount(40); }}
                            placeholder="Search fonts..."
                            className="bg-zinc-900 border border-zinc-800 rounded-xl pl-8 pr-4 py-2 text-sm text-zinc-300 outline-none focus:ring-1 focus:ring-indigo-500/50 w-48"
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <Sliders size={12} className="text-zinc-500" />
                        <input type="range" min={12} max={72} value={fontSize} onChange={e => setFontSize(parseInt(e.target.value))} className="w-24 accent-indigo-500" />
                        <span className="text-[10px] font-mono text-indigo-400 w-8">{fontSize}px</span>
                    </div>
                    <div className="flex gap-1">
                        {[18, 24, 36].map(s => (
                            <button key={s} onClick={() => setFontSize(s)} className={`text-[10px] px-2 py-1 rounded-lg border font-bold transition-all ${fontSize === s ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-400' : 'border-zinc-800 text-zinc-600 hover:text-zinc-300'}`}>{s}</button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Custom font upload */}
            <div className="shrink-0 bg-zinc-900/50 border border-zinc-800/50 rounded-2xl flex items-center gap-4 p-3">
                <FileUploader
                    onFileSelect={handleCustomFont}
                    accept=".ttf,.otf,.woff,.woff2"
                    label="Add Font"
                    description=".ttf · .otf · .woff · .woff2"
                    icon={Upload}
                    compact
                    className="shrink-0"
                />
                {customFonts.length > 0 ? (
                    <div className="flex-1 flex items-center gap-2 overflow-x-auto custom-scrollbar">
                        <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest shrink-0 flex items-center gap-1.5">
                            <HardDrive size={11} className="text-indigo-400" /> Your fonts
                        </span>
                        {customFonts.map(f => (
                            <span key={f.name} className="text-[10px] text-zinc-400 bg-zinc-800/60 border border-zinc-800 rounded-lg px-2 py-1 whitespace-nowrap">
                                {f.name}
                            </span>
                        ))}
                    </div>
                ) : (
                    <p className="flex-1 text-[10px] text-zinc-600 leading-relaxed">
                        Drop in a font file to preview it alongside the Google catalog — nothing is uploaded to a server.
                    </p>
                )}
            </div>

            {fontError && (
                <div className="shrink-0 bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-2 rounded-xl text-xs font-mono">
                    {fontError}
                </div>
            )}

            {/* Preview text input */}
            <div className="shrink-0">
                <input
                    value={previewText}
                    onChange={e => setPreviewText(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-sm text-zinc-400 outline-none focus:ring-1 focus:ring-indigo-500/50"
                    placeholder="Type your preview text..."
                />
            </div>

            {/* Font grid */}
            <div className="flex-1 overflow-y-auto custom-scrollbar min-h-0" onScroll={e => {
                const el = e.currentTarget;
                if (el.scrollHeight - el.scrollTop < el.clientHeight + 400) {
                    setVisibleCount(c => c + 20);
                }
            }}>
                {filteredFonts.length === 0 && visibleCustomFonts.length === 0 ? (
                    <div className="flex items-center justify-center h-32 text-zinc-600 text-sm">No fonts match "{query}"</div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pb-4">
                        {visibleCustomFonts.map(({ name }) => (
                            <button
                                key={name}
                                onClick={() => setSelectedFont(name)}
                                className="group text-left bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-indigo-500/30 rounded-2xl p-5 transition-all"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest group-hover:text-indigo-400 transition-colors">{name}</span>
                                    <span className="text-[9px] font-mono text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded">Yours</span>
                                </div>
                                <p
                                    style={{ fontFamily: `'${name}', sans-serif`, fontSize: `${fontSize}px` }}
                                    className="text-zinc-200 leading-snug truncate"
                                >
                                    {previewText || 'The quick brown fox'}
                                </p>
                            </button>
                        ))}
                        {visibleFonts.map(name => (
                            <button
                                key={name}
                                onClick={() => setSelectedFont(name)}
                                className="group text-left bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-indigo-500/30 rounded-2xl p-5 transition-all"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest group-hover:text-indigo-400 transition-colors">{name}</span>
                                    <span className="text-[9px] font-mono text-zinc-700 bg-zinc-800 px-1.5 py-0.5 rounded">Google</span>
                                </div>
                                <p
                                    style={{ fontFamily: `'${name}', sans-serif`, fontSize: `${fontSize}px` }}
                                    className="text-zinc-200 leading-snug truncate"
                                >
                                    {previewText || 'The quick brown fox'}
                                </p>
                                <div className="mt-3 flex justify-between items-center">
                                    <button
                                        onClick={e => { e.stopPropagation(); handleCopyCSS(name); }}
                                        className="flex items-center gap-1 text-[10px] text-zinc-600 hover:text-zinc-300 transition-colors"
                                    >
                                        {copied === name ? <Check size={10} className="text-green-400" /> : <Copy size={10} />}
                                        {copied === name ? 'Copied' : 'Copy CSS'}
                                    </button>
                                    <span className="text-[10px] text-zinc-700 group-hover:text-zinc-500 transition-colors">Click to inspect →</span>
                                </div>
                            </button>
                        ))}
                        {visibleCount < filteredFonts.length && (
                            <div className="col-span-full flex justify-center py-4">
                                <button onClick={() => setVisibleCount(c => c + 40)} className="text-xs text-indigo-400 hover:text-indigo-300 border border-indigo-500/20 px-4 py-2 rounded-xl transition-colors">
                                    Load more ({filteredFonts.length - visibleCount} remaining)
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
