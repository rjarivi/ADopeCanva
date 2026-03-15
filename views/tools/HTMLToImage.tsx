import React, { useState, useRef, useEffect } from 'react';
import { 
    Code, Camera, Settings, Download, Zap, Maximize, 
    Share2, FileImage, Trash2, Copy, Check, Info,
    Eye, Sliders, Layout, Monitor, RefreshCw, ArrowRightLeft, Upload, FileCode,
    Files, Archive, Play, CheckCircle2, ChevronLeft, Plus
} from 'lucide-react';
import html2canvas from 'html2canvas';
import JSZip from 'jszip';
import { FileUploader } from '../../components/FileUploader';
import { FileData } from '../../types';

interface HTMLFile {
    id: string;
    name: string;
    html: string;
    previewUrl: string | null;
    isGenerating: boolean;
    dimensions?: { width: number; height: number };
}

const HTMLToImage = () => {
    // Start with empty files for a cleaner first impression
    const [files, setFiles] = useState<HTMLFile[]>([]);
    const [selectedFileId, setSelectedFileId] = useState<string>('');
    const [showUploader, setShowUploader] = useState(true);
    
    const [width, setWidth] = useState(800);
    const [height, setHeight] = useState(450);
    const [scale, setScale] = useState(2);
    const [format, setFormat] = useState<'png' | 'jpeg' | 'webp'>('png');
    const [isProcessingBatch, setIsProcessingBatch] = useState(false);
    const [activeTab, setActiveTab] = useState<'editor' | 'preview' | 'batch'>('batch');
    const [isCopied, setIsCopied] = useState(false);
    
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const currentFile = files.find(f => f.id === selectedFileId);

    // Sync HTML to Iframe for the current selection
    useEffect(() => {
        if (iframeRef.current && activeTab === 'editor' && currentFile) {
            const doc = iframeRef.current.contentDocument;
            if (doc) {
                doc.open();
                doc.write(`
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <style>
                            body { margin: 0; padding: 0; overflow: hidden; background: transparent; }
                        </style>
                    </head>
                    <body>
                        ${currentFile.html}
                    </body>
                    </html>
                `);
                doc.close();
            }
        }
    }, [currentFile?.html, activeTab, selectedFileId]);

    const detectAndApplyDimensions = (content: string, updateState = true) => {
        try {
            const widthMatch = content.match(/width:\s*(\d+)px/i);
            const heightMatch = content.match(/height:\s*(\d+)px/i);
            let d = { width, height };

            if (widthMatch && widthMatch[1]) {
                const w = parseInt(widthMatch[1]);
                if (w > 0 && w < 5000) {
                    d.width = w;
                    if (updateState) setWidth(w);
                }
            }
            
            if (heightMatch && heightMatch[1]) {
                const h = parseInt(heightMatch[1]);
                if (h > 0 && h < 5000) {
                    d.height = h;
                    if (updateState) setHeight(h);
                }
            }
            return d;
        } catch (err) {
            console.error("Dimension detection failed:", err);
            return { width, height };
        }
    };

    const handleGenerateSingle = async (fileId: string) => {
        const targetFile = files.find(f => f.id === fileId);
        if (!targetFile) return;

        setFiles(prev => prev.map(f => f.id === fileId ? { ...f, isGenerating: true } : f));
        
        try {
            const dims = detectAndApplyDimensions(targetFile.html, fileId === selectedFileId);
            
            const captureIframe = document.createElement('iframe');
            captureIframe.style.position = 'fixed';
            captureIframe.style.left = '-9999px';
            captureIframe.style.top = '-9999px';
            captureIframe.style.width = `${dims.width}px`;
            captureIframe.style.height = `${dims.height}px`;
            captureIframe.style.border = 'none';
            document.body.appendChild(captureIframe);

            const doc = captureIframe.contentDocument;
            if (!doc) throw new Error("Could not create capture document");

            doc.open();
            doc.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { margin: 0; padding: 0; overflow: hidden; background: transparent; width: ${dims.width}px; height: ${dims.height}px; }
                        * { -webkit-print-color-adjust: exact; }
                    </style>
                </head>
                <body>
                    ${targetFile.html}
                </body>
                </html>
            `);
            doc.close();

            await new Promise(r => setTimeout(r, 600));

            const canvas = await html2canvas(doc.body, {
                scale: scale,
                useCORS: true,
                backgroundColor: null,
                logging: false,
                width: dims.width,
                height: dims.height,
                allowTaint: true
            });
            
            const dataUrl = canvas.toDataURL(`image/${format}`, 0.95);
            setFiles(prev => prev.map(f => f.id === fileId ? { ...f, previewUrl: dataUrl, isGenerating: false } : f));
            
            document.body.removeChild(captureIframe);
            return dataUrl;
        } catch (err) {
            console.error('Failed to generate image:', err);
            setFiles(prev => prev.map(f => f.id === fileId ? { ...f, isGenerating: false } : f));
        }
    };

    const handleBatchGenerate = async () => {
        setIsProcessingBatch(true);
        setActiveTab('batch');
        
        for (const file of files) {
            await handleGenerateSingle(file.id);
        }
        
        setIsProcessingBatch(false);
    };

    const handleDownloadZip = async () => {
        const zip = new JSZip();
        const imgFolder = zip.folder("captured-images");
        
        let addedCount = 0;
        files.forEach((file, index) => {
            if (file.previewUrl) {
                const base64Data = file.previewUrl.split(',')[1];
                imgFolder?.file(`${file.name.replace('.html', '') || 'image'}-${index}.${format}`, base64Data, { base64: true });
                addedCount++;
            }
        });

        if (addedCount === 0) return;

        zip.generateAsync({ type: "blob" }).then((content) => {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = "adopecanva-batch-export.zip";
            link.click();
        });
    };

    const handleFilesSelect = async (filesData: FileData[]) => {
        const newFiles: HTMLFile[] = [];
        
        for (const fileData of filesData) {
            const content = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target?.result as string);
                reader.readAsText(fileData.file);
            });

            if (content) {
                newFiles.push({
                    id: Math.random().toString(36).substr(2, 9),
                    name: fileData.file.name,
                    html: content,
                    previewUrl: null,
                    isGenerating: false
                });
            }
        }

        if (newFiles.length > 0) {
            setFiles(prev => [...prev, ...newFiles]);
            setSelectedFileId(newFiles[0].id);
            setShowUploader(false);
            setActiveTab('batch');
        }
    };

    const removeFile = (id: string) => {
        const updatedFiles = files.filter(f => f.id !== id);
        setFiles(updatedFiles);
        if (updatedFiles.length === 0) {
            setShowUploader(true);
            setSelectedFileId('');
        } else if (selectedFileId === id) {
            setSelectedFileId(updatedFiles[0].id);
        }
    };

    const updateCurrentHtml = (newHtml: string) => {
        setFiles(prev => prev.map(f => f.id === selectedFileId ? { ...f, html: newHtml, previewUrl: null } : f));
    };

    const features = [
        { icon: Zap, label: 'Batch Ready', desc: 'Process 10+ Files' },
        { icon: Archive, label: 'ZIP Export', desc: 'Auto-bundled output' },
        { icon: Camera, label: 'High Res', desc: 'Up to 3x Sharpness' },
        { icon: Info, label: 'Privacy', desc: 'Local Processing' }
    ];

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl animate-fade-in text-left">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                <div className="space-y-2">
                    <h2 className="text-4xl font-black tracking-tight text-white flex items-center gap-3 font-unbounded text-left">
                        <Code className="text-indigo-500" size={36} /> HTML <span className="text-zinc-600">to</span> Image
                    </h2>
                    <p className="text-zinc-400 max-w-xl text-left">
                        Batch process multiple HTML files and export as a single ZIP. Isolated rendering for zero style leakage.
                    </p>
                </div>
                
                <div className="flex items-center gap-3 bg-zinc-900/50 p-1.5 rounded-xl border border-zinc-800">
                    <button 
                        onClick={() => setActiveTab('batch')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'batch' ? 'bg-indigo-500 text-white' : 'text-zinc-400 hover:text-white'}`}
                    >
                        <Files size={16} /> Batch {files.length > 0 && `(${files.length})`}
                    </button>
                    <button 
                        disabled={files.length === 0}
                        onClick={() => setActiveTab('editor')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'editor' ? 'bg-indigo-500 text-white' : 'text-zinc-400 hover:text-white disabled:opacity-30'}`}
                    >
                        <Code size={16} /> Editor
                    </button>
                    <button 
                        disabled={!currentFile?.previewUrl}
                        onClick={() => setActiveTab('preview')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'preview' ? 'bg-indigo-500 text-white' : 'text-zinc-400 hover:text-white disabled:opacity-30'}`}
                    >
                        <Eye size={16} /> Preview
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* Main Content Area */}
                <div className="xl:col-span-8 space-y-6">
                    {/* Batch Processing View */}
                    {activeTab === 'batch' && (
                        <div className="space-y-6 animate-slide-up">
                            {showUploader || files.length === 0 ? (
                                <div className="space-y-4">
                                    {files.length > 0 && (
                                        <button 
                                            onClick={() => setShowUploader(false)}
                                            className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest mb-4"
                                        >
                                            <ChevronLeft size={16} /> Back to Queue
                                        </button>
                                    )}
                                    <FileUploader 
                                        onFilesSelect={handleFilesSelect}
                                        accept=".html,.htm"
                                        label="Upload HTML Files"
                                        multiple
                                        description="Select one or more templates to begin batch processing"
                                        icon={Upload}
                                        className="bg-zinc-900/30 border-zinc-800/50 py-20 border-dashed"
                                    />
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    {/* Queue Header */}
                                    <div className="flex justify-between items-center px-1">
                                        <div className="flex items-center gap-4">
                                            <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-unbounded">File Queue ({files.length})</h3>
                                            <button 
                                                onClick={() => setShowUploader(true)}
                                                className="flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-indigo-500/20 transition-all"
                                            >
                                                <Plus size={10} /> Add Files
                                            </button>
                                        </div>
                                        <button 
                                            onClick={() => { setFiles([]); setShowUploader(true); setSelectedFileId(''); }}
                                            className="text-[9px] font-bold text-zinc-600 hover:text-red-400/80 transition-colors uppercase tracking-widest"
                                        >
                                            Clear All
                                        </button>
                                    </div>

                                    {/* Scrollable File Queue */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-2 no-scrollbar scroll-smooth">
                                        {files.map((file) => (
                                            <div 
                                                key={file.id}
                                                onClick={() => setSelectedFileId(file.id)}
                                                className={`p-3 rounded-xl border transition-all cursor-pointer group flex items-center justify-between ${selectedFileId === file.id ? 'bg-indigo-500/10 border-indigo-500/40 shadow-lg shadow-indigo-500/5' : 'bg-zinc-900/20 border-zinc-800/60 hover:border-zinc-700'}`}
                                            >
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${file.previewUrl ? 'bg-indigo-500/20 text-indigo-400' : 'bg-zinc-800/50 text-zinc-600'}`}>
                                                        {file.isGenerating ? <RefreshCw className="animate-spin" size={14} /> : (file.previewUrl ? <CheckCircle2 size={14} /> : <FileCode size={14} />)}
                                                    </div>
                                                    <div className="overflow-hidden">
                                                        <h4 className="text-zinc-200 text-xs font-bold truncate">{file.name}</h4>
                                                        <div className="flex items-center gap-1.5 mt-0.5">
                                                            <div className={`w-1 h-1 rounded-full ${file.previewUrl ? 'bg-indigo-400' : 'bg-zinc-700'}`}></div>
                                                            <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-bold">
                                                                {file.isGenerating ? 'Rendering' : (file.previewUrl ? 'Complete' : 'Pending')}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); removeFile(file.id); }}
                                                    className="p-1.5 text-zinc-700 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500/10 rounded-lg"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'editor' && currentFile && (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-slide-up">
                            {/* Code Editor */}
                            <div className="group relative bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
                                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
                                    <div className="flex items-center gap-2">
                                        <FileCode size={14} className="text-indigo-400" />
                                        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em]">{currentFile.name}</span>
                                    </div>
                                    <button onClick={() => { navigator.clipboard.writeText(currentFile.html); setIsCopied(true); setTimeout(() => setIsCopied(false), 2000); }} className="p-1.5 text-zinc-500 hover:text-indigo-400">
                                        {isCopied ? <Check size={14} /> : <Copy size={14} />}
                                    </button>
                                </div>
                                <textarea
                                    value={currentFile.html}
                                    onChange={(e) => updateCurrentHtml(e.target.value)}
                                    className="w-full h-[360px] p-6 bg-zinc-950 text-zinc-400 font-mono text-[12px] focus:outline-none resize-none no-scrollbar text-left focus:text-zinc-200 transition-colors"
                                    spellCheck={false}
                                />
                            </div>

                            {/* Live Isolated Preview */}
                            <div className="group relative bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl flex flex-col">
                                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
                                    <div className="flex items-center gap-2">
                                        <Eye size={14} className="text-zinc-500" />
                                        <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Isolated Live Preview</span>
                                    </div>
                                </div>
                                <div className="flex-1 bg-white relative overflow-hidden h-[360px]">
                                    <iframe 
                                        ref={iframeRef}
                                        title="HTML Preview"
                                        className="w-full h-full border-none pointer-events-none"
                                        sandbox="allow-same-origin allow-scripts"
                                    />
                                    <div className="absolute top-2 right-2 px-2 py-1 bg-black/40 backdrop-blur-md rounded text-[9px] font-mono text-white/60">
                                        {width}x{height}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'preview' && currentFile && (
                        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl p-6 min-h-[464px] flex flex-col items-center justify-center animate-slide-up">
                            {currentFile.previewUrl ? (
                                <div className="space-y-6 flex flex-col items-center">
                                    <div className="relative rounded-xl overflow-hidden border border-zinc-700 shadow-2xl bg-zinc-950 max-w-full">
                                        <img src={currentFile.previewUrl} alt="Result" className="max-h-[500px] object-contain" />
                                    </div>
                                    <button 
                                        onClick={() => { const link = document.createElement('a'); link.download = `${currentFile.name.replace('.html', '')}.${format}`; link.href = currentFile.previewUrl!; link.click(); }}
                                        className="px-8 py-3 bg-white text-indigo-950 rounded-xl font-bold flex items-center gap-2 hover:bg-zinc-100 transition-all hover:scale-105"
                                    >
                                        <Download size={20} /> Download This {format.toUpperCase()}
                                    </button>
                                </div>
                            ) : (
                                <div className="text-center space-y-4">
                                    <div className="w-16 h-16 bg-zinc-800 rounded-2xl flex items-center justify-center mx-auto mb-6">
                                        <FileImage className="text-zinc-600" size={32} />
                                    </div>
                                    <p className="text-zinc-400 font-medium">Generate this image to see the result</p>
                                    <button onClick={() => handleGenerateSingle(selectedFileId)} className="text-indigo-400 text-sm font-bold uppercase tracking-widest hover:text-indigo-300">Generate Now</button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Empty State for Editor/Preview */}
                    {files.length === 0 && activeTab !== 'batch' && (
                        <div className="p-20 bg-zinc-900/20 border border-zinc-800/50 border-dashed rounded-[40px] flex flex-col items-center justify-center text-center space-y-4">
                            <div className="w-16 h-16 bg-zinc-900 border border-zinc-800 rounded-full flex items-center justify-center text-zinc-700 mb-2">
                                <Plus size={32} />
                            </div>
                            <h3 className="text-lg font-bold text-zinc-400">No Files Uploaded</h3>
                            <p className="text-sm text-zinc-600 max-w-xs">Upload some HTML templates first to use the Editor or Preview modes.</p>
                            <button 
                                onClick={() => setActiveTab('batch')}
                                className="px-6 py-2 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-full text-xs font-black uppercase tracking-widest hover:bg-indigo-500/20 transition-all"
                            >
                                Go to Upload
                            </button>
                        </div>
                    )}
                </div>

                {/* Settings Sidebar */}
                <div className="xl:col-span-4 space-y-6">
                    <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-xl space-y-8 sticky top-24">
                        <div className="flex items-center justify-between border-b border-zinc-800/50 pb-4">
                            <div className="flex items-center gap-2">
                                <Sliders className="text-indigo-400" size={20} />
                                <h3 className="font-bold text-white tracking-tight">Export Settings</h3>
                            </div>
                        </div>

                        {/* Dimensions */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest flex items-center gap-2">
                                    <Maximize size={12} /> Dimensions
                                </label>
                                <button 
                                    disabled={files.length === 0}
                                    onClick={() => currentFile && detectAndApplyDimensions(currentFile.html)}
                                    className="text-[9px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 bg-indigo-500/10 px-2 py-1 rounded-md disabled:opacity-30"
                                >
                                    <RefreshCw size={10} /> Auto-Sync
                                </button>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5 font-bold">
                                    <span className="text-[10px] text-zinc-500 uppercase ml-1">Width</span>
                                    <input type="number" value={width} onChange={(e) => setWidth(Number(e.target.value))} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white" />
                                </div>
                                <div className="space-y-1.5 font-bold">
                                    <span className="text-[10px] text-zinc-500 uppercase ml-1">Height</span>
                                    <input type="number" value={height} onChange={(e) => setHeight(Number(e.target.value))} className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-2 text-sm text-white" />
                                </div>
                            </div>
                        </div>

                        {/* Format & Scale */}
                        <div className="space-y-6">
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Output Format</label>
                                <div className="flex gap-2">
                                    {['png', 'jpeg', 'webp'].map((f) => (
                                        <button
                                            key={f}
                                            onClick={() => setFormat(f as any)}
                                            className={`flex-1 py-2 text-xs font-bold rounded-xl border transition-all ${format === f ? 'bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/20' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}
                                        >
                                            {f.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Pixel Ratio</label>
                                    <span className="text-xs font-bold text-indigo-400">{scale}x</span>
                                </div>
                                <input type="range" min="1" max="4" step="0.5" value={scale} onChange={(e) => setScale(Number(e.target.value))} className="w-full accent-indigo-500" />
                            </div>
                        </div>

                        {/* Action CTA */}
                        {files.length > 1 ? (
                            <button 
                                onClick={handleBatchGenerate}
                                disabled={isProcessingBatch}
                                className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-3 disabled:opacity-50 ${
                                    files.every(f => f.previewUrl) && !isProcessingBatch
                                    ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border border-zinc-700' 
                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-2xl shadow-indigo-500/30'
                                }`}
                            >
                                {isProcessingBatch ? <RefreshCw className="animate-spin" size={20} /> : <Play size={20} />}
                                {isProcessingBatch ? 'Processing Bundle...' : 'Batch Capture All'}
                            </button>
                        ) : (
                            <button 
                                onClick={() => selectedFileId && handleGenerateSingle(selectedFileId)}
                                disabled={!selectedFileId || currentFile?.isGenerating || files.length === 0}
                                className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-3 disabled:opacity-50 ${
                                    currentFile?.previewUrl && !currentFile?.isGenerating
                                    ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border border-zinc-700'
                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-2xl shadow-indigo-500/30'
                                }`}
                            >
                                {currentFile?.isGenerating ? <RefreshCw className="animate-spin" size={20} /> : <Camera size={20} />}
                                {currentFile?.isGenerating ? 'Rendering...' : 'Generate Image'}
                            </button>
                        )}
                        
                        {files.some(f => f.previewUrl) && (
                            <button 
                                onClick={handleDownloadZip}
                                className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-3 ${
                                    files.every(f => f.previewUrl) && !isProcessingBatch
                                    ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-2xl shadow-indigo-500/30'
                                    : 'bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700'
                                }`}
                            >
                                <Archive size={20} /> Download ZIP Bundle
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default HTMLToImage;
