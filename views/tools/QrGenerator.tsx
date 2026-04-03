/// <reference lib="dom" />
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../../components/ui/Button';
import { QrCode, Download, Copy, Check, Link, FileText, Wifi, Mail } from 'lucide-react';
import { SectionLabel } from '../../components/EditorControls';
import QRious from 'qrious';

export const QrGenerator: React.FC = () => {
    const [text, setText] = useState('');
    const [size, setSize] = useState(250);
    const [background, setBackground] = useState('#ffffff');
    const [foreground, setForeground] = useState('#000000');
    const [copied, setCopied] = useState(false);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [qrInstance, setQrInstance] = useState<QRious | null>(null);

    useEffect(() => {
        if (canvasRef.current) {
            const qr = new QRious({
                element: canvasRef.current,
                value: 'https://adopecanva.com',
                size: size,
                background: background,
                foreground: foreground,
                level: 'H'
            });
            setQrInstance(qr);
        }
    }, []);

    useEffect(() => {
        if (qrInstance) {
            qrInstance.set({
                value: text || 'https://adopecanva.com',
                size: size,
                background: background,
                foreground: foreground
            });
        }
    }, [text, size, background, foreground, qrInstance]);

    const handleDownload = () => {
        if (canvasRef.current) {
            const url = canvasRef.current.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = url;
            a.download = 'qrcode.png';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    };

    const handleCopy = async () => {
        if (canvasRef.current) {
            canvasRef.current.toBlob(async (blob) => {
                if (blob) {
                    try {
                        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                    } catch {
                        // Fallback: copy data URL as text
                        const url = canvasRef.current!.toDataURL('image/png');
                        await navigator.clipboard.writeText(url);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                    }
                }
            });
        }
    };

    const quickFills = [
        { icon: Link, label: 'URL', value: 'https://' },
        { icon: Mail, label: 'Email', value: 'mailto:' },
        { icon: Wifi, label: 'WiFi', value: 'WIFI:S:MyNetwork;T:WPA;P:password;;' },
        { icon: FileText, label: 'Text', value: '' },
    ];

    return (
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 animate-slide-up min-h-[560px] selection:bg-indigo-500/30">

            {/* Controls Panel */}
            <div className="bg-zinc-900 rounded-3xl border border-zinc-800 flex flex-col overflow-hidden shadow-xl">
                {/* Header */}
                <div className="h-14 px-5 border-b border-zinc-800 flex items-center gap-3 shrink-0">
                    <QrCode size={18} className="text-indigo-400" />
                    <h2 className="font-black text-xs text-indigo-400 uppercase tracking-widest font-unbounded">QR Generator</h2>
                </div>

                <div className="flex-1 p-5 space-y-6 overflow-y-auto custom-scrollbar">

                    {/* Quick Fill */}
                    <section className="space-y-3">
                        <SectionLabel>Quick Fill</SectionLabel>
                        <div className="grid grid-cols-4 gap-2">
                            {quickFills.map(({ icon: Icon, label, value }) => (
                                <button
                                    key={label}
                                    onClick={() => setText(value)}
                                    className="flex flex-col items-center gap-1.5 py-2.5 px-1 rounded-xl bg-zinc-800/50 border border-zinc-800 hover:border-indigo-500/50 hover:bg-indigo-500/5 transition-all group"
                                >
                                    <Icon size={14} className="text-zinc-500 group-hover:text-indigo-400 transition-colors" />
                                    <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 group-hover:text-zinc-300 transition-colors">{label}</span>
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* Content */}
                    <section className="space-y-2">
                        <SectionLabel>Content</SectionLabel>
                        <textarea
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Enter URL, text, email, or WiFi credentials..."
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white text-sm outline-none focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 h-24 resize-none placeholder:text-zinc-600 transition-all font-mono custom-scrollbar"
                        />
                    </section>

                    {/* Colors */}
                    <section className="space-y-3">
                        <SectionLabel>Colors</SectionLabel>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Foreground</p>
                                <label className="flex items-center gap-3 bg-zinc-950 border border-zinc-800 rounded-xl p-3 cursor-pointer hover:border-indigo-500/50 transition-colors group">
                                    <div className="w-6 h-6 rounded-md border border-zinc-700 shadow-inner shrink-0" style={{ backgroundColor: foreground }} />
                                    <span className="text-xs font-mono text-zinc-400">{foreground}</span>
                                    <input type="color" value={foreground} onChange={(e) => setForeground(e.target.value)} className="sr-only" />
                                </label>
                            </div>
                            <div className="space-y-1.5">
                                <p className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Background</p>
                                <label className="flex items-center gap-3 bg-zinc-950 border border-zinc-800 rounded-xl p-3 cursor-pointer hover:border-indigo-500/50 transition-colors group">
                                    <div className="w-6 h-6 rounded-md border border-zinc-700 shadow-inner shrink-0" style={{ backgroundColor: background }} />
                                    <span className="text-xs font-mono text-zinc-400">{background}</span>
                                    <input type="color" value={background} onChange={(e) => setBackground(e.target.value)} className="sr-only" />
                                </label>
                            </div>
                        </div>
                    </section>

                    {/* Size */}
                    <section className="space-y-3">
                        <div className="flex items-center justify-between">
                            <SectionLabel>Size</SectionLabel>
                            <span className="text-[10px] font-mono text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">{size}px</span>
                        </div>
                        <input
                            type="range" min="150" max="500" value={size}
                            onChange={(e) => setSize(parseInt(e.target.value))}
                            className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                        <div className="flex justify-between text-[9px] text-zinc-600 font-bold uppercase tracking-widest">
                            <span>150px</span>
                            <span>500px</span>
                        </div>
                    </section>
                </div>
            </div>

            {/* Preview Panel */}
            <div className="bg-zinc-900/50 rounded-3xl border border-zinc-800 flex flex-col items-center justify-center p-8 gap-8 relative overflow-hidden shadow-xl">
                {/* Dot grid background */}
                <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

                <div className="relative z-10 p-6 rounded-2xl bg-white/5 border border-white/10 shadow-2xl backdrop-blur-sm">
                    <canvas ref={canvasRef} className="rounded-lg block" />
                </div>

                <div className="relative z-10 flex gap-3 w-full max-w-xs">
                    <Button
                        onClick={handleCopy}
                        variant="secondary"
                        className="flex-1 h-11 border-zinc-800 hover:border-indigo-500/50 text-xs font-bold uppercase tracking-widest"
                    >
                        {copied ? <Check size={16} className="mr-2 text-green-400" /> : <Copy size={16} className="mr-2" />}
                        {copied ? 'Copied!' : 'Copy'}
                    </Button>
                    <Button
                        onClick={handleDownload}
                        className="flex-1 h-11 bg-indigo-600 text-white hover:bg-indigo-500 border-none text-xs font-bold uppercase tracking-widest"
                    >
                        <Download size={16} className="mr-2" /> Download
                    </Button>
                </div>

                <p className="relative z-10 text-[9px] text-zinc-600 uppercase font-bold tracking-widest text-center">
                    PNG · High Quality · Error Correction Level H
                </p>
            </div>
        </div>
    );
};
