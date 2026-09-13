/// <reference lib="dom" />
import React, { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { FileJson, Braces, Copy, Check, Trash2, Wand2, Minimize, Download } from 'lucide-react';

export const JsonFormatter: React.FC = () => {
    const [input, setInput] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const handleFormat = () => {
        if (!input.trim()) return;
        try {
            const parsed = JSON.parse(input);
            setInput(JSON.stringify(parsed, null, 2));
            setError(null);
        } catch (e) {
            setError("Invalid JSON: " + (e as Error).message);
        }
    };

    const handleMinify = () => {
        if (!input.trim()) return;
        try {
            const parsed = JSON.parse(input);
            setInput(JSON.stringify(parsed));
            setError(null);
        } catch (e) {
            setError("Invalid JSON: " + (e as Error).message);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(input);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        if (!input) return;
        const blob = new Blob([input], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'data.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <div className="max-w-6xl mx-auto h-[calc(100vh-140px)] min-h-[600px] flex flex-col animate-slide-up">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h2 className="text-2xl font-black text-white font-unbounded flex items-center gap-3">
                        <FileJson size={32} className="text-yellow-500" /> JSON Formatter
                    </h2>
                    <p className="text-xs text-zinc-500 ml-11">Validate, Beautify, and Minify</p>
                </div>

                <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => setInput('')} size="sm">
                        <Trash2 size={16} className="mr-2" /> Clear
                    </Button>
                    <Button variant="secondary" onClick={handleDownload} size="sm" disabled={!input}>
                        <Download size={16} className="mr-2" /> Download
                    </Button>
                    <Button variant="secondary" onClick={handleMinify} size="sm">
                        <Minimize size={16} className="mr-2" /> Minify
                    </Button>
                    <Button onClick={handleFormat} className="bg-yellow-500 hover:bg-yellow-600 text-black border-none" size="sm">
                        <Wand2 size={16} className="mr-2" /> Beautify
                    </Button>
                </div>
            </div>

            <div className="flex-1 bg-surface rounded-2xl border border-zinc-800 p-1 flex flex-col shadow-xl overflow-hidden">
                {/* Toolbar */}
                <div className="bg-zinc-900/50 border-b border-zinc-800 px-4 py-2 flex justify-between items-center">
                    <span className="text-xs font-mono text-zinc-500">JSON Input / Output</span>
                    <button
                        onClick={handleCopy}
                        className="text-xs flex items-center gap-1 text-zinc-400 hover:text-white transition-colors"
                    >
                        {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
                        {copied ? 'Copied' : 'Copy'}
                    </button>
                </div>

                <div className="flex-1 relative">
                    <textarea
                        className="w-full h-full bg-zinc-950 p-6 font-mono text-sm text-zinc-300 resize-none outline-none focus:bg-black transition-colors"
                        placeholder='Paste your JSON here... {"key": "value"}'
                        value={input}
                        onChange={(e) => setInput((e.target as HTMLTextAreaElement).value)}
                        spellCheck={false}
                    />

                    {error && (
                        <div className="absolute bottom-4 left-4 right-4 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl backdrop-blur-md text-sm font-mono flex items-center animate-slide-up">
                            <Braces size={16} className="mr-2" />
                            {error}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};