import React, { useState, useEffect } from 'react';
import {
    AlignLeft, CaseSensitive, Binary, Hash, Fingerprint, RefreshCcw, Copy,
    Check, ArrowRightLeft, FileText, Type, Link, Lock, Hourglass, Trash2
} from 'lucide-react';
import { Button } from '../../components/ui/Button';

type Mode = 'analyze' | 'convert' | 'encode' | 'generate';
type CaseType = 'upper' | 'lower' | 'title' | 'camel' | 'snake' | 'kebab' | 'sentence';

export const TextUtilities: React.FC = () => {
    const [mode, setMode] = useState<Mode>('analyze');
    const [input, setInput] = useState('');
    const [output, setOutput] = useState('');
    const [copied, setCopied] = useState(false);

    // Analyzer Stats
    const [stats, setStats] = useState({ words: 0, chars: 0, charsNoSpace: 0, sentences: 0, lines: 0, readingTime: 0 });
    const [detectedSentences, setDetectedSentences] = useState<string[]>([]);

    useEffect(() => {
        if (mode === 'analyze') analyzeText();
        else if (mode === 'convert') convertCase('sentence');
        else if (mode === 'encode') encodeBase64(true); // Default encode
    }, [input, mode]);

    const extractSentences = (text: string): string[] => {
        if (!text.trim()) return [];
        let processed = text;

        processed = processed.replace(/\.{2,}/g, match => '<<<ELLIPSIS' + match.length + '>>>');
        processed = processed.replace(/(\d)\.(\d)/g, '$1<<<DECIMAL>>>$2');
        processed = processed.replace(/(^|\s)([a-zA-Z])\./g, '$1$2<<<INITIAL>>>');

        const abbreviations = ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof', 'Sr', 'Jr', 'Inc', 'Ltd', 'Co', 'Corp', 'Vs', 'vs', 'Fig', 'St', 'Mt'];
        abbreviations.forEach(abbr => {
            const regex = new RegExp(`\\b(${abbr})\\.`, 'gi');
            processed = processed.replace(regex, '$1<<<ABBR>>>');
        });

        processed = processed.replace(/(^|\n)(\s*\d+)\.(\s)/g, '$1$2<<<LIST>>>$3');

        const parts = processed.split(/([.!?]+[\s\n]*)/);

        const sentences: string[] = [];
        for (let i = 0; i < parts.length; i += 2) {
            let sentence = parts[i];
            let punctuation = parts[i + 1] || '';
            let combined = sentence + punctuation;
            if (!combined.trim()) continue;

            combined = combined.replace(/<<<ELLIPSIS(\d+)>>>/g, (_, len) => '.'.repeat(Number(len)));
            combined = combined.replace(/<<<DECIMAL>>>/g, '.');
            combined = combined.replace(/<<<INITIAL>>>/g, '.');
            combined = combined.replace(/<<<ABBR>>>/g, '.');
            combined = combined.replace(/<<<LIST>>>/g, '.');

            sentences.push(combined);
        }

        const mergedSentences: string[] = [];
        for (let i = 0; i < sentences.length; i++) {
            const s = sentences[i];
            if (mergedSentences.length > 0) {
                const trimmed = s.trim();
                // If the next sentence starts with a lower case letter, merge it with previous.
                if (trimmed.length > 0 && /^[a-z]/.test(trimmed)) {
                    mergedSentences[mergedSentences.length - 1] += s;
                    continue;
                }
            }
            mergedSentences.push(s);
        }

        return mergedSentences;
    };

    const analyzeText = () => {
        const text = input.trim();
        const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
        const chars = input.length;
        const charsNoSpace = input.replace(/\s/g, '').length;
        const lines = text ? input.split(/\n/).length : 0;
        const readingTime = Math.ceil(words / 200); // 200 wpm

        const sentencesArray = extractSentences(text);

        setDetectedSentences(sentencesArray);
        setStats({ words, chars, charsNoSpace, sentences: sentencesArray.length, lines, readingTime });
    };

    const handleMergeSentence = (index: number) => {
        if (index === 0) return;
        const newSentences = [...detectedSentences];
        newSentences[index - 1] += newSentences[index];
        newSentences.splice(index, 1);
        setDetectedSentences(newSentences);
        setStats(prev => ({ ...prev, sentences: newSentences.length }));
    };

    // --- Converters ---
    const convertCase = (type: CaseType) => {
        let res = '';
        switch (type) {
            case 'upper': res = input.toUpperCase(); break;
            case 'lower': res = input.toLowerCase(); break;
            case 'sentence':
                res = input.toLowerCase().replace(/(^\s*\w|[.!?]\s*\w)/g, c => c.toUpperCase());
                break;
            case 'title':
                res = input.toLowerCase().split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                break;
            case 'camel':
                res = input.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase());
                break;
            case 'snake':
                res = input.match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)
                    ?.map(x => x.toLowerCase()).join('_') || input;
                break;
            case 'kebab': // Slug
                res = input.toLowerCase().trim().replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');
                break;
        }
        setOutput(res);
    };

    // --- Encoders ---
    const encodeBase64 = (encode: boolean) => {
        try {
            setOutput(encode ? btoa(unescape(encodeURIComponent(input))) : decodeURIComponent(escape(atob(input.trim()))));
        } catch {
            setOutput('Invalid Input');
        }
    };

    const encodeURL = (encode: boolean) => {
        try {
            setOutput(encode ? encodeURIComponent(input) : decodeURIComponent(input));
        } catch {
            setOutput('Invalid URL Component');
        }
    };

    // --- Generators ---
    const generateUUID = () => {
        const uuid = crypto.randomUUID();
        setOutput(uuid);
    };

    const generateHash = async (algo: 'SHA-256' | 'SHA-1' | 'MD5') => {
        if (!input) return;
        const msgBuffer = new TextEncoder().encode(input);

        // MD5 not supported by subtle crypto usually, stick to SHA
        if (algo === 'MD5') {
            // Simple JS MD5 or placeholder implementation would be needed.
            // For now let's just do SHA-256 which is standard.
            setOutput("MD5 requires external lib, using SHA-256 instead...");
        }

        if (!window.crypto?.subtle) {
            setOutput('Hash functions require a secure context (HTTPS).');
            return;
        }
        const hashBuffer = await crypto.subtle.digest(algo === 'MD5' ? 'SHA-256' : algo, msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        setOutput(hashHex);
    };

    const handleCopy = (textToCopy: string) => {
        navigator.clipboard.writeText(textToCopy);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="max-w-6xl mx-auto h-[calc(100vh-140px)] min-h-[600px] flex flex-col animate-slide-up">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="bg-primary/10 p-3 rounded-2xl text-primary"><AlignLeft size={32} /></div>
                    <div>
                        <h2 className="text-2xl font-black text-white font-unbounded">Text Utilities</h2>
                        <p className="text-xs text-zinc-500">Analyze, Convert, Encode, and Generate</p>
                    </div>
                </div>

                <div className="flex bg-zinc-900 border border-zinc-800 p-1 rounded-xl">
                    {[
                        { id: 'analyze', icon: FileText, label: 'Analyze' },
                        { id: 'convert', icon: CaseSensitive, label: 'Convert' },
                        { id: 'encode', icon: Binary, label: 'Encode' },
                        { id: 'generate', icon: Fingerprint, label: 'Generate' }
                    ].map(m => (
                        <button
                            key={m.id}
                            onClick={() => { setMode(m.id as Mode); setOutput(''); }}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all ${mode === m.id ? 'bg-indigo-500/10 border border-indigo-500 text-indigo-400' : 'text-zinc-500 hover:text-zinc-300'
                                }`}
                        >
                            <m.icon size={14} />
                            <span className="hidden md:inline">{m.label}</span>
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex-1 bg-surface rounded-3xl border border-zinc-800 p-1 flex flex-col md:flex-row shadow-xl overflow-hidden">

                {/* Left: Input / Controls */}
                <div className="flex-1 flex flex-col min-w-0 border-b md:border-b-0 md:border-r border-zinc-800 bg-zinc-900/30">
                    <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Input</span>
                        <div className="flex gap-2">
                            <Button variant="secondary" size="sm" onClick={() => setInput('')} disabled={!input}>
                                <Trash2 size={14} className="mr-2" /> Clear
                            </Button>
                        </div>
                    </div>

                    <textarea
                        className="flex-1 bg-transparent p-6 outline-none text-zinc-300 font-mono text-sm resize-none custom-scrollbar focus:ring-1 focus:ring-indigo-500/50"
                        placeholder={mode === 'generate' ? "Enter text to hash (optional for UUID)..." : "Paste your text here to begin..."}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                    />

                    {/* Action Bar based on Mode */}
                    <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
                        {mode === 'convert' && (
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                                <Button variant="secondary" size="sm" onClick={() => convertCase('upper')}>UPPERCASE</Button>
                                <Button variant="secondary" size="sm" onClick={() => convertCase('lower')}>lowercase</Button>
                                <Button variant="secondary" size="sm" onClick={() => convertCase('title')}>Title Case</Button>
                                <Button variant="secondary" size="sm" onClick={() => convertCase('sentence')}>Sentence case</Button>
                                <Button variant="secondary" size="sm" onClick={() => convertCase('camel')}>camelCase</Button>
                                <Button variant="secondary" size="sm" onClick={() => convertCase('snake')}>snake_case</Button>
                                <Button variant="secondary" size="sm" onClick={() => convertCase('kebab')}>kebab-case (Slug)</Button>
                            </div>
                        )}
                        {mode === 'encode' && (
                            <div className="grid grid-cols-2 gap-2">
                                <Button variant="secondary" size="sm" onClick={() => encodeBase64(true)}>Base64 Encode</Button>
                                <Button variant="secondary" size="sm" onClick={() => encodeBase64(false)}>Base64 Decode</Button>
                                <Button variant="secondary" size="sm" onClick={() => encodeURL(true)}>URL Encode</Button>
                                <Button variant="secondary" size="sm" onClick={() => encodeURL(false)}>URL Decode</Button>
                            </div>
                        )}
                        {mode === 'generate' && (
                            <div className="grid grid-cols-2 gap-2">
                                <Button variant="secondary" size="sm" onClick={generateUUID}><Fingerprint size={14} className="mr-2" /> Generate UUID</Button>
                                <Button variant="secondary" size="sm" onClick={() => generateHash('SHA-256')} disabled={!input}><Hash size={14} className="mr-2" /> SHA-256</Button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right: Results / Stats */}
                <div className={`w-full md:w-80 lg:w-96 flex flex-col bg-zinc-950`}>
                    <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/30">
                        <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                            {mode === 'analyze' ? 'Statistics' : 'Output Result'}
                        </span>
                        {(mode !== 'analyze' && output) && (
                            <button onClick={() => handleCopy(output)} className="text-zinc-500 hover:text-white transition-colors">
                                {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                            </button>
                        )}
                    </div>

                    <div className="flex-1 p-6 overflow-y-auto custom-scrollbar">
                        {mode === 'analyze' ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <StatBox label="Words" value={stats.words} />
                                    <StatBox label="Characters" value={stats.chars} />
                                    <StatBox label="No Spaces" value={stats.charsNoSpace} />
                                    <StatBox label="Sentences" value={stats.sentences} />
                                    <StatBox label="Lines" value={stats.lines} />
                                    <StatBox label="Read Time" value={`~${stats.readingTime} min`} />
                                </div>
                                <div className="mt-6 pt-6 border-t border-zinc-800">
                                    <div className="flex items-center justify-between mb-3">
                                        <h4 className="text-xs font-bold text-zinc-500 uppercase">Sentence Parsing</h4>
                                        <div className="flex items-center gap-1 text-[10px] text-zinc-600">
                                            <span className="w-2 h-2 rounded-full bg-indigo-500/50"></span>
                                            <span>Click a sentence to merge it with the previous</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap text-sm text-zinc-300 leading-relaxed bg-zinc-900/30 p-4 rounded-xl border border-zinc-800/50 max-h-64 overflow-y-auto custom-scrollbar">
                                        {detectedSentences.length === 0 ? (
                                            <p className="text-xs text-zinc-600 italic">No sentences detected yet.</p>
                                        ) : (
                                            detectedSentences.map((sentence, idx) => (
                                                <span
                                                    key={idx}
                                                    onClick={() => handleMergeSentence(idx)}
                                                    className={`px-0.5 rounded cursor-pointer transition-colors ${idx % 2 === 0 ? 'bg-indigo-500/10 hover:bg-indigo-500/30 text-indigo-200' : 'bg-violet-500/10 hover:bg-violet-500/30 text-violet-200'} ${idx > 0 ? 'hover:ring-1 hover:ring-white/20' : ''}`}
                                                    title={idx > 0 ? "Click to merge with previous sentence" : "First sentence"}
                                                >
                                                    {sentence}
                                                </span>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col relative">
                                {output ? (
                                    <textarea
                                        readOnly
                                        value={output}
                                        className="w-full h-full bg-transparent resize-none outline-none text-green-400 font-mono text-sm"
                                    />
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-600 gap-2 opacity-50">
                                        <ArrowRightLeft size={32} />
                                        <p className="text-xs">Result will appear here</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const StatBox = ({ label, value }: { label: string, value: string | number }) => (
    <div className="bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
        <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider mb-1">{label}</p>
        <p className="text-xl font-black text-zinc-200 font-unbounded">{value}</p>
    </div>
);
