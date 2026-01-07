import React, { useState, useEffect, useRef } from 'react';
import {
    ArrowRightLeft, Copy, Download, Trash2,
    FileJson, FileCode, FileSpreadsheet, FileText, AlertCircle,
    ChevronDown, Check
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import Papa from 'papaparse';
import yaml from 'js-yaml';
import { js2xml, xml2js } from 'xml-js';

type Format = 'json' | 'xml' | 'csv' | 'yaml';

interface FormatOption {
    value: Format;
    label: string;
    icon: React.ElementType;
}

const FORMATS: FormatOption[] = [
    { value: 'json', label: 'JSON', icon: FileJson },
    { value: 'xml', label: 'XML', icon: FileCode },
    { value: 'csv', label: 'CSV', icon: FileSpreadsheet },
    { value: 'yaml', label: 'YAML', icon: FileText },
];

const FormatSelector: React.FC<{
    value: Format;
    onChange: (format: Format) => void;
}> = ({ value, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selected = FORMATS.find(f => f.value === value);

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-zinc-700 transition-all min-w-[110px] justify-between group"
            >
                <div className="flex items-center gap-2">
                    {selected?.icon && <selected.icon size={14} className="text-zinc-400 group-hover:text-white transition-colors" />}
                    <span>{selected?.label}</span>
                </div>
                <ChevronDown size={14} className={`text-zinc-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 mt-1 w-40 bg-zinc-900 border border-zinc-700 rounded-xl shadow-xl overflow-hidden z-20 animate-in fade-in zoom-in-95 duration-100">
                    {FORMATS.map(option => (
                        <button
                            key={option.value}
                            onClick={() => { onChange(option.value); setIsOpen(false); }}
                            className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center gap-2 transition-colors ${value === option.value
                                ? 'bg-blue-500/10 text-blue-400'
                                : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                                }`}
                        >
                            <option.icon size={14} className={value === option.value ? 'text-blue-400' : 'text-zinc-500'} />
                            <span className="flex-1">{option.label}</span>
                            {value === option.value && <Check size={12} />}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

export const UniversalConverter: React.FC = () => {
    const [input, setInput] = useState('');
    const [output, setOutput] = useState('');
    const [inputFormat, setInputFormat] = useState<Format>('json');
    const [outputFormat, setOutputFormat] = useState<Format>('csv');
    const [error, setError] = useState<string | null>(null);

    // Auto-convert when input or formats change
    useEffect(() => {
        if (!input.trim()) {
            setOutput('');
            setError(null);
            return;
        }

        const timer = setTimeout(() => {
            convertData();
        }, 500);

        return () => clearTimeout(timer);
    }, [input, inputFormat, outputFormat]);

    const parseInput = (data: string, format: Format): any => {
        try {
            switch (format) {
                case 'json':
                    return JSON.parse(data);
                case 'xml':
                    // compact: true helps reduce standard converting noise
                    const xmlData = xml2js(data, { compact: true });
                    // Usually requires unwrapping the root if simple conversion
                    return xmlData;
                case 'csv':
                    const csvResult = Papa.parse(data, { header: true, dynamicTyping: true });
                    if (csvResult.errors.length > 0) throw new Error(csvResult.errors[0].message);
                    return csvResult.data;
                case 'yaml':
                    return yaml.load(data);
                default:
                    throw new Error('Unsupported input format');
            }
        } catch (e) {
            throw new Error(`Invalid ${format.toUpperCase()}: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    };

    const stringifyOutput = (data: any, format: Format): string => {
        try {
            switch (format) {
                case 'json':
                    return JSON.stringify(data, null, 2);
                case 'xml':
                    return js2xml(data, { compact: true, spaces: 2 });
                case 'csv':
                    // Fix: Papa.unparse expects an array. If data is an object, wrap it.
                    const csvInput = Array.isArray(data) ? data : [data];
                    return Papa.unparse(csvInput);
                case 'yaml':
                    return yaml.dump(data);
                default:
                    throw new Error('Unsupported output format');
            }
        } catch (e) {
            throw new Error(`Failed to convert to ${format.toUpperCase()}: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    };

    const convertData = () => {
        setError(null);
        try {
            // 1. Parse Input
            const parsed = parseInput(input, inputFormat);

            // 2. Stringify to Output
            // Special handling if trying to convert array (CSV) to Object (XML root) sometimes needs care, 
            // but libs usually handle basic cases.
            if (!parsed) throw new Error("Parsed data is empty");

            const result = stringifyOutput(parsed, outputFormat);
            setOutput(result);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Conversion Failed');
            setOutput(''); // Clear output on error to avoid confusion? Or keep stale? User prefers clear usually.
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(output);
    };

    const downloadOutput = () => {
        const blob = new Blob([output], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `converted.${outputFormat}`;
        a.click();
    };

    return (
        <div className="container mx-auto px-6 h-[85vh] flex flex-col justify-center animate-fade-in text-center">
            {/* Header */}
            <div className="flex-none space-y-3 mb-10">
                <h2 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-600 flex items-center justify-center gap-3 font-unbounded">
                    <ArrowRightLeft size={32} /> Universal Converter
                </h2>
                <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
                    Transform data between JSON, XML, CSV, and YAML.
                </p>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl flex items-center justify-center gap-3 animate-slide-up mb-6 max-w-2xl mx-auto">
                    <AlertCircle size={20} />
                    <span className="font-mono text-sm">{error}</span>
                </div>
            )}

            {/* Main Converter Area */}
            <div className="flex-1 w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6 h-full min-h-[500px]">
                {/* Input Panel */}
                <div className="flex flex-col bg-zinc-900/50 rounded-3xl border border-zinc-800/50 overflow-hidden shadow-2xl hover:border-blue-500/30 transition-colors">
                    <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Input</span>
                            <FormatSelector value={inputFormat} onChange={setInputFormat} />
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => { setInput(''); setOutput(''); setError(null); }}>
                            <Trash2 size={16} /> Clear
                        </Button>
                    </div>
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={`Paste your ${inputFormat.toUpperCase()} here...`}
                        className="flex-1 w-full bg-zinc-950/50 p-6 text-sm font-mono text-zinc-300 outline-none resize-none placeholder:text-zinc-700"
                        spellCheck={false}
                    />
                </div>

                {/* Output Panel */}
                <div className="flex flex-col bg-zinc-900/50 rounded-3xl border border-zinc-800/50 overflow-hidden shadow-2xl hover:border-blue-500/30 transition-colors">
                    <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Output</span>
                            <FormatSelector value={outputFormat} onChange={setOutputFormat} />
                        </div>
                        <div className="flex items-center gap-2">
                            <Button variant="secondary" size="sm" onClick={copyToClipboard} disabled={!output}>
                                <Copy size={16} className="mr-2" /> Copy
                            </Button>
                            <Button size="sm" onClick={downloadOutput} disabled={!output}>
                                <Download size={16} className="mr-2" /> Download
                            </Button>
                        </div>
                    </div>
                    <textarea
                        value={output}
                        readOnly
                        placeholder={`Resulting ${outputFormat.toUpperCase()} will appear here...`}
                        className="flex-1 w-full bg-black/40 p-6 text-sm font-mono text-blue-400 outline-none resize-none placeholder:text-zinc-800"
                        spellCheck={false}
                    />
                </div>
            </div>

            {/* Feature Highlights */}
            <div className="flex-none max-w-4xl mx-auto w-full grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                {[
                    { icon: FileJson, label: 'JSON Parsing', desc: 'Validate & Format' },
                    { icon: FileCode, label: 'XML Support', desc: 'Bi-directional' },
                    { icon: FileSpreadsheet, label: 'CSV Tables', desc: 'Import from Excel' },
                    { icon: FileText, label: 'YAML Config', desc: 'DevOps friendly' }
                ].map((feat, i) => (
                    <div key={i} className="flex flex-col items-center text-center space-y-2 p-2 rounded-xl hover:bg-zinc-900/50 transition-colors">
                        <div className="text-blue-500/50">
                            <feat.icon size={16} />
                        </div>
                        <div>
                            <h3 className="text-xs font-bold text-zinc-400">{feat.label}</h3>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
