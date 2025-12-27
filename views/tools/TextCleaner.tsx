
import React, { useState, useMemo } from 'react';
import { Copy, Sparkles, RefreshCcw } from 'lucide-react';
import { Button } from '../../components/ui/Button';

export const TextCleaner: React.FC = () => {
    const [cleanerInput, setCleanerInput] = useState('');
    const [removeString, setRemoveString] = useState('');
    const [removeEmptyLines, setRemoveEmptyLines] = useState(true);

    const cleanedText = useMemo(() => {
        if (!cleanerInput) return '';
        let res = cleanerInput;

        if (removeString) {
            res = res.split(removeString).join('');
        }

        if (removeEmptyLines) {
            res = res.split('\n').filter(line => line.trim() !== '').join('\n');
        }

        return res;
    }, [cleanerInput, removeString, removeEmptyLines]);

    return (
        <div className="max-w-[1800px] mx-auto p-4 lg:p-6 animate-fade-in h-[calc(100vh-100px)]">
            <div className="flex flex-col h-full bg-zinc-950/30 rounded-3xl border border-zinc-900 overflow-hidden shadow-2xl p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-1 flex items-center gap-2">
                            <RefreshCcw className="text-blue-500" />
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
                                className="flex-1 w-full bg-zinc-900/50 border border-zinc-800 rounded-xl p-4 text-zinc-300 outline-none focus:ring-1 focus:ring-blue-500/50 resize-none font-mono text-sm leading-relaxed custom-scrollbar"
                            />
                        </div>
                        <div className="h-1/3 flex flex-col gap-2">
                            <label className="text-sm font-medium text-zinc-400">Phrase to Remove (Exact Match)</label>
                            <textarea
                                value={removeString}
                                onChange={(e) => setRemoveString(e.target.value)}
                                placeholder={'e.g. Copy\nAdd to Design'}
                                className="flex-1 w-full bg-red-900/10 border border-red-500/20 rounded-xl p-4 text-zinc-300 outline-none focus:border-red-500/50 resize-none font-mono text-sm custom-scrollbar"
                            />
                            <div className="flex items-center gap-2 mt-1">
                                <input
                                    id="remove-lines"
                                    type="checkbox"
                                    checked={removeEmptyLines}
                                    onChange={(e) => setRemoveEmptyLines(e.target.checked)}
                                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-blue-500 focus:ring-offset-0 focus:ring-blue-500/50"
                                />
                                <label htmlFor="remove-lines" className="text-sm text-zinc-500 cursor-pointer select-none">Remove empty lines</label>
                            </div>
                        </div>
                    </div>

                    {/* Output Column */}
                    <div className="flex flex-col gap-2 h-full">
                        <div className="flex items-center justify-between">
                            <label className="text-sm font-medium text-zinc-400">Cleaned Result</label>
                            <Button
                                size="sm"
                                variant="secondary"
                                onClick={() => {
                                    navigator.clipboard.writeText(cleanedText);
                                }}
                                disabled={!cleanedText}
                            >
                                <Copy size={14} className="mr-2" /> Copy Result
                            </Button>
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
                    </div>
                </div>
            </div>
        </div>
    );
};
