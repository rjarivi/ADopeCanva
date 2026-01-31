import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import {
    Code2, Braces, Copy, Check, Trash2, Wand2, Minimize,
    Download, FileJson, FileCode, FileType, AlignLeft
} from 'lucide-react';
import { xml2json, json2xml } from 'xml-js';

type Language = 'JSON' | 'HTML' | 'CSS' | 'XML';

export const CodeFormatter: React.FC = () => {
    const [input, setInput] = useState('');
    const [language, setLanguage] = useState<Language>('JSON');
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [tabSize, setTabSize] = useState(2);

    // Auto-detect language
    useEffect(() => {
        const trimmed = input.trim();
        if (!trimmed) return;

        if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
            setLanguage('JSON');
        } else if (trimmed.startsWith('<')) {
            if (trimmed.includes('xml version')) setLanguage('XML');
            else setLanguage('HTML');
        } else if (trimmed.includes('{') && trimmed.includes(';') && !trimmed.startsWith('<')) {
            setLanguage('CSS');
        }
    }, [input]);

    const formatJSON = (minify: boolean) => {
        try {
            const parsed = JSON.parse(input);
            return minify ? JSON.stringify(parsed) : JSON.stringify(parsed, null, tabSize);
        } catch (e: any) {
            throw new Error("Invalid JSON: " + e.message);
        }
    };

    const formatXML = (minify: boolean) => {
        try {
            // Using xml-js: convert to JS obj then back to XML with formatting
            // Note: This is loop-back conversion, it validates structure too.
            const jsObj = xml2json(input, { compact: true });
            return json2xml(jsObj, { compact: true, spaces: minify ? 0 : tabSize });
        } catch (e: any) {
            // Fallback for simple XML if the library fails or for partial fragments
            if (minify) return input.replace(/>\s+</g, '><').trim();
            throw new Error("Invalid XML: " + e.message);
        }
    };

    const formatCSS = (minify: boolean) => {
        if (minify) {
            return input
                .replace(/\s+/g, ' ')
                .replace(/ ?\{ ?/g, '{')
                .replace(/ ?\} ?/g, '}')
                .replace(/ ?; ?/g, ';')
                .replace(/ ?: ?/g, ':')
                .trim();
        } else {
            return input
                .replace(/\s+/g, ' ')
                .replace(/\{/g, ' {\n')
                .replace(/\}/g, '}\n')
                .replace(/;/g, ';\n')
                .replace(/:/g, ': ')
                .replace(/\n\s*/g, '\n') // clean up
                .replace(/;\n([^}])/g, ';\n' + ' '.repeat(tabSize) + '$1') // indent props
                .replace(/\{\n/g, '{\n' + ' '.repeat(tabSize)) // indent first prop
                .trim();
        }
    };

    const formatHTML = (minify: boolean) => {
        if (minify) {
            return input
                .replace(/>\s+</g, '><')
                .replace(/\s{2,}/g, ' ')
                .replace(/<!--[\s\S]*?-->/g, '') // remove comments
                .trim();
        } else {
            // Basic HTML prettifier
            let formatted = '';
            let pad = 0;
            const xml = input.replace(/>\s+</g, '><');

            xml.split(/>\s*</).forEach(node => {
                if (node.match(/^\/\w/)) pad = Math.max(0, pad - 1);

                formatted += ' '.repeat(pad * tabSize) + '<' + node + '>\n';

                if (node.match(/^<?\w[^>]*[^\/]$/) && !node.startsWith('input') && !node.startsWith('img') && !node.startsWith('br') && !node.startsWith('hr') && !node.startsWith('meta')) {
                    pad += 1;
                }
            });

            return formatted.trim().substring(1, formatted.length - 2); // cleanup generic split artifacts
        }
    };

    const process = (minify: boolean) => {
        setError(null);
        if (!input.trim()) return;

        try {
            let result = '';
            switch (language) {
                case 'JSON': result = formatJSON(minify); break;
                case 'XML': result = formatXML(minify); break;
                case 'CSS': result = formatCSS(minify); break;
                // For HTML we use a simplified robust approach or DOMParser if needed, 
                // but regex approach above is decent for client-side tool without heavy libs
                case 'HTML': result = formatHTML(minify); break;
            }
            setInput(result);
        } catch (e: any) {
            setError(e.message || "Formatting failed");
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(input);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        if (!input) return;
        const ext = language.toLowerCase();
        const blob = new Blob([input], { type: `text/${ext}` });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `formatted.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const getIcon = () => {
        switch (language) {
            case 'JSON': return <FileJson size={32} className="text-yellow-500" />;
            case 'HTML': return <FileCode size={32} className="text-orange-500" />;
            case 'CSS': return <FileType size={32} className="text-blue-500" />;
            case 'XML': return <Code2 size={32} className="text-green-500" />;
        }
    };

    return (
        <div className="max-w-6xl mx-auto h-[calc(100vh-140px)] min-h-[600px] flex flex-col animate-slide-up">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-3">
                    {getIcon()}
                    <div>
                        <h2 className="text-2xl font-black text-white font-unbounded">Code Formatter</h2>
                        <p className="text-xs text-zinc-500">Universal Beautifier & Minifier</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Language Selector */}
                    <div className="bg-zinc-900 p-1 rounded-lg border border-zinc-800 flex mr-2">
                        {(['JSON', 'HTML', 'CSS', 'XML'] as Language[]).map(lang => (
                            <button
                                key={lang}
                                onClick={() => setLanguage(lang)}
                                className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${language === lang
                                        ? 'bg-zinc-700 text-white shadow-sm'
                                        : 'text-zinc-500 hover:text-zinc-300'
                                    }`}
                            >
                                {lang}
                            </button>
                        ))}
                    </div>

                    <Button variant="secondary" onClick={() => setInput('')} size="sm">
                        <Trash2 size={16} className="md:mr-2" /> <span className="hidden md:inline">Clear</span>
                    </Button>
                    <Button variant="secondary" onClick={handleDownload} size="sm" disabled={!input}>
                        <Download size={16} className="md:mr-2" /> <span className="hidden md:inline">Download</span>
                    </Button>
                    <Button variant="secondary" onClick={() => process(true)} size="sm">
                        <Minimize size={16} className="mr-2" /> Minify
                    </Button>
                    <Button onClick={() => process(false)} className="bg-primary hover:bg-primary/90 text-white border-none" size="sm">
                        <Wand2 size={16} className="mr-2" /> Beautify
                    </Button>
                </div>
            </div>

            <div className="flex-1 bg-surface rounded-2xl border border-zinc-800 p-1 flex flex-col shadow-xl overflow-hidden relative group">
                {/* Editor Header */}
                <div className="bg-zinc-900/50 border-b border-zinc-800 px-4 py-2 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider">{language} Input</span>

                        {/* Tab Size Control */}
                        <div className="flex items-center gap-2 border-l border-zinc-800 pl-4">
                            <span className="text-[10px] text-zinc-600 uppercase font-bold">Indent:</span>
                            {[2, 4].map(size => (
                                <button
                                    key={size}
                                    onClick={() => setTabSize(size)}
                                    className={`text-[10px] w-5 h-5 rounded flex items-center justify-center transition-colors ${tabSize === size ? 'bg-primary/20 text-primary font-bold' : 'text-zinc-600 hover:bg-zinc-800'
                                        }`}
                                >
                                    {size}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="text-[10px] text-zinc-600 font-mono">
                            {input.length.toLocaleString()} chars
                        </div>
                        <button
                            onClick={handleCopy}
                            className="text-xs flex items-center gap-1.5 text-zinc-400 hover:text-white transition-colors bg-zinc-800/50 hover:bg-zinc-800 px-2 py-1 rounded"
                        >
                            {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
                            {copied ? 'Copied' : 'Copy'}
                        </button>
                    </div>
                </div>

                <div className="flex-1 relative">
                    <textarea
                        className="w-full h-full bg-zinc-950 p-6 font-mono text-sm text-zinc-300 resize-none outline-none focus:bg-black transition-colors custom-scrollbar leading-relaxed"
                        placeholder={`Paste your ${language} code here...`}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        spellCheck={false}
                    />

                    {/* Watermark/Empty State */}
                    {!input && (
                        <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.02]">
                            <AlignLeft size={120} />
                        </div>
                    )}

                    {/* Error Toast */}
                    {error && (
                        <div className="absolute bottom-6 left-6 right-6 bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-xl backdrop-blur-md text-sm font-mono flex items-center animate-in fade-in slide-in-from-bottom-2 shadow-2xl">
                            <Braces size={16} className="mr-2 shrink-0" />
                            <span className="truncate">{error}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
