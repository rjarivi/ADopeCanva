
import React, { useState, useMemo } from 'react';
import { Copy, Check, Download, Sparkles, RefreshCcw, Eraser } from 'lucide-react';
import { Button } from '../../components/ui/Button';

interface CleanerOptions {
    removeString: string;
    removeEmptyLines: boolean;
    trimLines: boolean;
    removeDuplicateLines: boolean;
    removeLineBreaks: boolean;
    smartQuotes: boolean;
    collapseSpaces: boolean;
}

function applyCleaning(text: string, opts: CleanerOptions): string {
    let res = text;

    if (opts.removeString) {
        res = res.split(opts.removeString).join('');
    }

    if (opts.smartQuotes) {
        res = res
            .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
            .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
            .replace(/[\u2013\u2014]/g, '-')
            .replace(/\u2026/g, '...');
    }

    res = res.split('\n').map(line => {
        let l = line;
        if (opts.collapseSpaces) l = l.replace(/[ \t]+/g, ' ');
        if (opts.trimLines) l = l.trim();
        return l;
    }).join('\n');

    if (opts.removeDuplicateLines) {
        const seen = new Set<string>();
        res = res.split('\n').filter(line => {
            const key = line.trim();
            if (key === '') return true; // blank handling is separate
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        }).join('\n');
    }

    if (opts.removeEmptyLines) {
        res = res.split('\n').filter(line => line.trim() !== '').join('\n');
    }

    if (opts.removeLineBreaks) {
        res = res.split('\n').filter(line => line.trim() !== '').join(' ');
    }

    return res;
}

type ToggleKey = 'removeEmptyLines' | 'trimLines' | 'removeDuplicateLines' | 'removeLineBreaks' | 'smartQuotes' | 'collapseSpaces';

const TOGGLES: { key: ToggleKey; label: string }[] = [
    { key: 'trimLines', label: 'Trim lines (leading/trailing)' },
    { key: 'removeDuplicateLines', label: 'Remove duplicate lines' },
    { key: 'removeEmptyLines', label: 'Remove extra blank lines' },
    { key: 'removeLineBreaks', label: 'Remove line-breaks (single paragraph)' },
    { key: 'smartQuotes', label: 'Normalize smart quotes & dashes' },
    { key: 'collapseSpaces', label: 'Collapse multiple spaces' },
];

export const TextCleaner: React.FC = () => {
    const [cleanerInput, setCleanerInput] = useState('');
    const [removeString, setRemoveString] = useState('');
    const [opts, setOpts] = useState<CleanerOptions>({
        removeString: '',
        removeEmptyLines: true,
        trimLines: false,
        removeDuplicateLines: false,
        removeLineBreaks: false,
        smartQuotes: false,
        collapseSpaces: false,
    });
    const [copied, setCopied] = useState(false);

    const setRemoveStringLocal = (value: string) => {
        setRemoveString(value);
        setOpts(prev => ({ ...prev, removeString: value }));
    };

    const cleanedText = useMemo(() => {
        if (!cleanerInput) return '';
        return applyCleaning(cleanerInput, { ...opts, removeString });
    }, [cleanerInput, opts, removeString]);

    // Live stats: what cleaning did
    const stats = useMemo(() => {
        const inputLines = cleanerInput ? cleanerInput.split('\n').length : 0;
        const outputLines = cleanedText ? cleanedText.split('\n').length : 0;
        return {
            linesDelta: inputLines - outputLines,
            charsDelta: cleanerInput.length - cleanedText.length,
            outputLines,
        };
    }, [cleanerInput, cleanedText]);

    const handleCopy = () => {
        navigator.clipboard.writeText(cleanedText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        if (!cleanedText) return;
        const blob = new Blob([cleanedText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'cleaned-text.txt';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleReset = () => {
        setCleanerInput('');
        setRemoveString('');
        setOpts(prev => ({ ...prev, removeString: '' }));
    };

    return (
        <div className="max-w-[1800px] mx-auto p-4 lg:p-6 animate-fade-in h-[calc(100vh-100px)]">
            <div className="flex flex-col h-full bg-zinc-950/30 rounded-3xl border border-zinc-900 overflow-hidden shadow-2xl p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-black text-white mb-1 flex items-center gap-2 font-unbounded uppercase tracking-wider">
                            <RefreshCcw size={24} className="text-blue-400" />
                            Text Cleaner
                        </h2>
                        <p className="text-zinc-400 text-sm">Remove specific phrases, repetitive text, and clean up formatting artifacts.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-0">
                    {/* Input Column */}
                    <div className="flex flex-col gap-4 h-full">
                        <div className="flex-1 flex flex-col gap-2">
                            <label className="text-sm font-medium text-zinc-400">Raw Text Input</label>
                            <textarea
                                value={cleanerInput}
                                onChange={(e) => setCleanerInput(e.target.value)}
                                placeholder="Paste your messy text here..."
                                className="flex-1 w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-zinc-300 outline-none focus:ring-1 focus:ring-indigo-500/50 resize-none font-mono text-sm leading-relaxed custom-scrollbar"
                            />
                        </div>
                        <div className="h-2/5 flex flex-col gap-2">
                            <label className="text-sm font-medium text-zinc-400">Phrase to Remove (Exact Match)</label>
                            <textarea
                                value={removeString}
                                onChange={(e) => setRemoveStringLocal(e.target.value)}
                                placeholder={'e.g. Copy\nAdd to Design'}
                                className="flex-1 w-full bg-red-900/10 border border-red-500/20 rounded-xl p-4 text-zinc-300 outline-none focus:border-red-500/50 resize-none font-mono text-sm custom-scrollbar"
                            />
                        </div>

                        {/* Operations */}
                        <div className="bg-zinc-900/40 border border-zinc-800 rounded-xl p-4 space-y-2.5">
                            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest">
                                <Eraser size={12} className="inline mr-1.5 text-indigo-400" />Operations
                            </label>
                            {TOGGLES.map(t => (
                                <div key={t.key} className="flex items-center gap-2">
                                    <input
                                        id={`tc-${t.key}`}
                                        type="checkbox"
                                        checked={opts[t.key]}
                                        onChange={(e) => setOpts(prev => ({ ...prev, [t.key]: e.target.checked }))}
                                        className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-indigo-500 focus:ring-offset-0 focus:ring-indigo-500/50"
                                    />
                                    <label htmlFor={`tc-${t.key}`} className="text-xs text-zinc-500 cursor-pointer select-none">{t.label}</label>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Output Column */}
                    <div className="flex flex-col gap-2 h-full">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-zinc-400">Cleaned Result</label>
                            <div className="flex items-center gap-2">
                                <Button size="sm" variant="secondary" onClick={handleDownload} disabled={!cleanedText}>
                                    <Download size={14} className="mr-2" /> Download .txt
                                </Button>
                                <Button size="sm" variant="secondary" onClick={handleCopy} disabled={!cleanedText}>
                                    {copied ? <Check size={14} className="mr-2 text-green-500" /> : <Copy size={14} className="mr-2" />}
                                    {copied ? 'Copied' : 'Copy Result'}
                                </Button>
                            </div>
                        </div>
                        <div className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl p-4 relative group overflow-hidden">
                            <div className="absolute inset-0 overflow-auto custom-scrollbar p-4">
                                {cleanedText ? (
                                    <pre className="font-mono text-sm text-zinc-200 whitespace-pre-wrap break-all">{cleanedText}</pre>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-zinc-600 gap-2">
                                        <Sparkles size={24} className="opacity-20" />
                                        <p className="text-sm">Cleaned text will appear here</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Live stats */}
                        {cleanerInput && (
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <Stat label="Lines Removed" value={stats.linesDelta > 0 ? stats.linesDelta : 0} />
                                <Stat label="Chars Removed" value={stats.charsDelta > 0 ? stats.charsDelta : 0} />
                                <Stat label="Lines Out" value={stats.outputLines} />
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const Stat = ({ label, value }: { label: string; value: number }) => (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg py-2 px-3">
        <p className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">{label}</p>
        <p className="text-sm font-black font-unbounded text-indigo-400">{value.toLocaleString()}</p>
    </div>
);
