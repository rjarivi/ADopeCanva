/// <reference lib="dom" />
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../../components/ui/Button';
import { QrCode, Download, Copy, RefreshCcw } from 'lucide-react';
import QRious from 'qrious';

export const QrGenerator: React.FC = () => {
    const [text, setText] = useState('');
    const [size, setSize] = useState(250);
    const [background, setBackground] = useState('#ffffff');
    const [foreground, setForeground] = useState('#000000');
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [qrInstance, setQrInstance] = useState<QRious | null>(null);

    useEffect(() => {
        // Initialize QRious - using local npm package (no CDN)
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

    return (
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 animate-slide-up h-[calc(100vh-200px)] min-h-[500px]">
            {/* Controls */}
            <div className="bg-surface rounded-3xl border border-zinc-800 p-8 flex flex-col justify-center space-y-8">
                <div className="space-y-2">
                    <h2 className="text-3xl font-black text-white flex items-center gap-3 font-unbounded">
                        <QrCode className="text-white" size={32} /> QR Generator
                    </h2>
                    <p className="text-zinc-400">Generate high-quality QR codes for URLs, text, or data.</p>
                </div>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300">Content</label>
                        <textarea
                            value={text}
                            onChange={(e) => setText((e.target as HTMLTextAreaElement).value)}
                            placeholder="Enter URL or text here..."
                            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl p-4 text-white outline-none focus:ring-2 focus:ring-primary h-24 resize-none"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300">Foreground</label>
                            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-lg p-2">
                                <input
                                    type="color"
                                    value={foreground}
                                    onChange={(e) => setForeground((e.target as HTMLInputElement).value)}
                                    className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
                                />
                                <span className="text-xs font-mono text-zinc-400">{foreground}</span>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-zinc-300">Background</label>
                            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-700 rounded-lg p-2">
                                <input
                                    type="color"
                                    value={background}
                                    onChange={(e) => setBackground((e.target as HTMLInputElement).value)}
                                    className="w-8 h-8 rounded cursor-pointer bg-transparent border-none"
                                />
                                <span className="text-xs font-mono text-zinc-400">{background}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-zinc-300">Size: {size}px</label>
                        <input
                            type="range" min="150" max="500" value={size}
                            onChange={(e) => setSize(parseInt((e.target as HTMLInputElement).value))}
                            className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-white"
                        />
                    </div>
                </div>
            </div>

            {/* Preview */}
            <div className="bg-zinc-900/50 rounded-3xl border border-zinc-800 flex flex-col items-center justify-center p-8 relative">
                <div className="bg-white/5 p-8 rounded-3xl mb-8 backdrop-blur-sm border border-white/10 shadow-2xl">
                    <canvas ref={canvasRef} className="rounded-lg shadow-sm" />
                </div>

                <div className="flex gap-4">
                    <Button onClick={handleDownload} className="bg-white text-black hover:bg-zinc-200">
                        <Download size={18} className="mr-2" /> Download PNG
                    </Button>
                </div>
            </div>
        </div>
    );
};