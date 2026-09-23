import React, { useState, useCallback } from 'react';
import { Button } from '../../components/ui/Button';
import { FileData } from '../../types';
import {
    FileCode2, Copy, Check, Download, Code2, Eye, Upload,
    FileSearch, Braces, ArrowLeftRight, Maximize2
} from 'lucide-react';
import { ToolShell } from '../../components/ToolShell';

export const SvgToCode: React.FC = () => {
    const [code, setCode] = useState('');
    const [fileName, setFileName] = useState('');
    const [copied, setCopied] = useState(false);
    const [previewVisible, setPreviewVisible] = useState(true);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    React.useEffect(() => {
        if (code) {
            const blob = new Blob([code], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            setPreviewUrl(url);
            return () => URL.revokeObjectURL(url);
        }
    }, [code]);

    const handleFile = useCallback((fileData: FileData | FileData[]) => {
        const first = Array.isArray(fileData) ? fileData[0] : fileData;
        if (!first) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            setCode(text);
            setFileName(first.file.name.replace(/\.svg$/i, ''));
        };
        reader.readAsText(first.file);
    }, []);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        if (!code) return;
        const blob = new Blob([code], { type: 'image/svg+xml' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileName || 'output'}.svg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    if (!code) {
        return (
            <ToolShell
                icon={FileSearch}
                title="SVG to Code"
                description="Upload an SVG file and instantly extract its raw source markup."
                features={[
                    { icon: Upload, label: 'Drop & Extract', desc: 'SVG file input' },
                    { icon: Code2, label: 'Raw Markup', desc: 'Full source code' },
                    { icon: Copy, label: 'One-click Copy', desc: 'Clipboard ready' },
                    { icon: Maximize2, label: 'Any SVG', desc: 'Icons, illustrations' },
                ]}
                file={null}
                accept="image/svg+xml,.svg"
                uploadLabel="Upload SVG File"
                uploadDescription=".svg files only"
                onFileSelect={handleFile}
            >
                <></>
            </ToolShell>
        );
    }

    return (
        <div className="max-w-7xl mx-auto h-[calc(100vh-140px)] min-h-[600px] flex flex-col animate-slide-up">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <div className="flex items-center gap-3">
                    <FileSearch size={32} className="text-indigo-400" />
                    <div>
                        <h2 className="text-2xl font-black text-white font-unbounded">SVG to Code</h2>
                        <p className="text-xs text-zinc-500">{fileName ? `${fileName}.svg` : 'SVG source extractor'}</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => { setCode(''); setFileName(''); }}
                    >
                        <Upload size={14} className="md:mr-2" />
                        <span className="hidden md:inline">Upload New</span>
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setPreviewVisible(v => !v)}>
                        <Eye size={14} className="md:mr-2" />
                        <span className="hidden md:inline">{previewVisible ? 'Hide' : 'Show'} Preview</span>
                    </Button>
                    <Button variant="secondary" size="sm" onClick={handleCopy}>
                        {copied
                            ? <><Check size={14} className="md:mr-2 text-green-400" /><span className="hidden md:inline">Copied!</span></>
                            : <><Copy size={14} className="md:mr-2" /><span className="hidden md:inline">Copy Code</span></>}
                    </Button>
                    <Button
                        onClick={handleDownload}
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white border-none"
                    >
                        <Download size={14} className="mr-2" /> Download
                    </Button>
                </div>
            </div>

            {/* Split: code + preview */}
            <div className="flex-1 flex flex-col md:flex-row gap-4 min-h-0">
                {/* Code Panel */}
                <div className="flex-1 flex flex-col bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden shadow-xl">
                    <div className="bg-zinc-900/80 border-b border-zinc-800 px-4 py-2 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Braces size={14} className="text-zinc-500" />
                            <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider">SVG Source</span>
                        </div>
                        <span className="text-[10px] font-mono text-zinc-600">
                            {code.length.toLocaleString()} chars · {code.split('\n').length} lines
                        </span>
                    </div>
                    <div className="flex-1 relative">
                        <textarea
                            className="w-full h-full bg-zinc-950 p-5 font-mono text-sm text-zinc-300 resize-none outline-none leading-relaxed custom-scrollbar focus:ring-1 focus:ring-indigo-500/50"
                            value={code}
                            onChange={e => setCode(e.target.value)}
                            spellCheck={false}
                        />
                    </div>
                </div>

                {/* Preview Panel */}
                {previewVisible && (
                    <div className="flex-1 flex flex-col bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden shadow-xl">
                        <div className="bg-zinc-900/80 border-b border-zinc-800 px-4 py-2 flex items-center gap-2">
                            <Eye size={14} className="text-zinc-500" />
                            <span className="text-xs font-mono text-zinc-500 uppercase tracking-wider">Preview</span>
                        </div>
                        <div className="flex-1 flex items-center justify-center p-6 bg-zinc-950">
                            <img src={previewUrl || ''} className="max-w-full max-h-full object-contain" alt="SVG Preview" />
                        </div>
                    </div>
                )}
            </div>

            {/* Feature highlights */}
            <div className="flex-none w-full grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                {[
                    { icon: FileSearch, label: 'SVG → Code', desc: 'Extract markup' },
                    { icon: Code2, label: 'Editable', desc: 'Modify inline' },
                    { icon: ArrowLeftRight, label: 'Swap Tool', desc: 'Code → SVG' },
                    { icon: Maximize2, label: 'Scalable', desc: 'Vector source' },
                ].map((feat, i) => (
                    <div key={i} className="flex flex-col items-center text-center space-y-2 p-4 rounded-xl bg-zinc-900/30 border border-zinc-800/30 backdrop-blur-sm hover:bg-zinc-900/50 transition-colors cursor-default group">
                        <div className="p-2 bg-indigo-500/10 rounded-full text-indigo-400 group-hover:scale-110 group-hover:bg-indigo-500/20 transition-all">
                            <feat.icon size={18} />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-zinc-200">{feat.label}</h3>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-wide font-bold mt-1 group-hover:text-zinc-400 transition-colors">{feat.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
