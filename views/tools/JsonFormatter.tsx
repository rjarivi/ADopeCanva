/// <reference lib="dom" />
import React, { useState, useMemo } from 'react';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { FileJson, Braces, Copy, Check, Trash2, Wand2, Minimize, Download } from 'lucide-react';

// Extract a friendly "line:column" hint from a JSON.parse error.
// V8 messages contain either "at position N" (absolute char index) or
// "at line L column C" (newer V8). Also handle SpiderMonkey ("at line L column C of the JSON data").
function extractErrorPosition(message: string, input: string): string | null {
    try {
        const lineCol = message.match(/at line (\d+) column (\d+)/);
        if (lineCol) return `line ${lineCol[1]}, column ${lineCol[2]}`;

        const posMatch = message.match(/at position (\d+)/i);
        if (posMatch) {
            const pos = parseInt(posMatch[1], 10);
            const before = input.slice(0, pos);
            const line = before.split('\n').length;
            const col = pos - before.lastIndexOf('\n');
            return `line ${line}, column ${col}`;
        }
    } catch {
        // fall through — never fail because of error formatting
    }
    return null;
}

const INDENT_OPTIONS: { value: string; label: string }[] = [
    { value: '2', label: '2 Spaces' },
    { value: '4', label: '4 Spaces' },
    { value: 'tab', label: 'Tab' },
];

function getIndent(value: string): string | number {
    return value === 'tab' ? '\t' : parseInt(value, 10);
}

/** Recursively sort object keys (arrays keep order) */
function sortKeysDeep(value: any): any {
    if (Array.isArray(value)) return value.map(sortKeysDeep);
    if (value && typeof value === 'object') {
        const out: Record<string, any> = {};
        for (const key of Object.keys(value).sort()) out[key] = sortKeysDeep(value[key]);
        return out;
    }
    return value;
}

export const JsonFormatter: React.FC = () => {
    const [input, setInput] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [indent, setIndent] = useState('2');
    const [sortKeys, setSortKeys] = useState(false);

    const errorPosition = useMemo(
        () => (error && input ? extractErrorPosition(error, input) : null),
        [error, input]
    );

    const handleError = (e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        setError("Invalid JSON: " + msg);
    };

    const stringify = (parsed: any, minify: boolean) => {
        const data = sortKeys ? sortKeysDeep(parsed) : parsed;
        return minify ? JSON.stringify(data) : JSON.stringify(data, null, getIndent(indent));
    };

    const handleFormat = () => {
        if (!input.trim()) return;
        try {
            const parsed = JSON.parse(input);
            setInput(stringify(parsed, false));
            setError(null);
        } catch (e) {
            handleError(e);
        }
    };

    const handleMinify = () => {
        if (!input.trim()) return;
        try {
            const parsed = JSON.parse(input);
            setInput(stringify(parsed, true));
            setError(null);
        } catch (e) {
            handleError(e);
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
                <div className="bg-zinc-900/50 border-b border-zinc-800 px-4 py-2 flex justify-between items-center gap-3">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-zinc-500 mr-1">JSON Input / Output</span>
                        <div className="w-32">
                            <Select
                                size="sm"
                                value={indent}
                                onChange={(val) => setIndent(val)}
                                options={INDENT_OPTIONS}
                            />
                        </div>
                        <label className={`flex items-center gap-1.5 cursor-pointer select-none border rounded px-2 py-1 text-[10px] font-bold uppercase tracking-wider transition-colors ${sortKeys ? 'bg-indigo-500/10 border-indigo-500/40 text-indigo-400' : 'border-zinc-800 text-zinc-500 hover:text-zinc-300'}`}>
                            <input
                                type="checkbox"
                                checked={sortKeys}
                                onChange={(e) => setSortKeys(e.target.checked)}
                                className="w-3 h-3 accent-indigo-500"
                            />
                            Sort Keys
                        </label>
                    </div>
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
                            <Braces size={16} className="mr-2 shrink-0" />
                            <span>
                                {error}
                                {errorPosition && <span className="text-red-300 ml-2">({errorPosition})</span>}
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
