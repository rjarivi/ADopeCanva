/// <reference lib="dom" />
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '../../components/ui/Button';
import { getFFmpeg, writeFileToFFmpeg, readFileFromFFmpeg } from '../../utils/ffmpeg';
import { Download, RefreshCcw, Undo, Play, Video, Film, PenTool, Eraser, Loader2, Eye, Edit2, ChevronUp, Info } from 'lucide-react';
import { SectionLabel, SliderControl, ColorPicker } from '../../components/EditorControls';
import { useIsMobile } from '../../hooks/useIsMobile';

interface Point {
    x: number;
    y: number;
    time: number;
}

interface Stroke {
    points: Point[];
    color: string;
    width: number;
}

export const SignatureGenerator: React.FC = () => {
    const isMobile = useIsMobile();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [view, setView] = useState<'draw' | 'preview'>('draw');

    // Drawing State
    const [isDrawing, setIsDrawing] = useState(false);
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const [currentStroke, setCurrentStroke] = useState<Stroke | null>(null);

    // Settings
    const [color, setColor] = useState('#ffffff');
    const [width, setWidth] = useState(3);
    const [speed, setSpeed] = useState(1);
    const [bgColor, setBgColor] = useState('#000000');

    // Export State
    const [status, setStatus] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isRecording, setIsRecording] = useState(false);
    const [isEncodingMP4, setIsEncodingMP4] = useState(false);
    const [isEncodingGIF, setIsEncodingGIF] = useState(false);
    const [gifUrl, setGifUrl] = useState<string | null>(null);
    const [mp4Url, setMp4Url] = useState<string | null>(null);
    const [previewFrameId, setPreviewFrameId] = useState<number | null>(null);
    const [showDownloadMenu, setShowDownloadMenu] = useState(false);

    // Color presets
    const colors = [
        { id: '#000000', value: '#000000', label: 'Black' },
        { id: '#1d4ed8', value: '#1d4ed8', label: 'Blue' },
        { id: '#b91c1c', value: '#b91c1c', label: 'Red' },
        { id: '#047857', value: '#047857', label: 'Green' },
        { id: '#ffffff', value: '#ffffff', label: 'White' },
    ];

    const bgColors = [
        { id: 'transparent', value: 'transparent', label: 'Transparent' },
        { id: '#ffffff', value: '#ffffff', label: 'White' },
        { id: '#000000', value: '#000000', label: 'Black' },
    ];

    // --- Drawing Logic ---

    const getCoordinates = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!canvasRef.current) return { x: 0, y: 0 };
        const rect = canvasRef.current.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (view === 'preview') return;
        e.currentTarget.setPointerCapture(e.pointerId);
        setIsDrawing(true);
        const { x, y } = getCoordinates(e);
        setCurrentStroke({
            points: [{ x, y, time: Date.now() }],
            color,
            width
        });
    };

    const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !currentStroke || view === 'preview') return;
        const { x, y } = getCoordinates(e);
        setCurrentStroke(prev => prev ? {
            ...prev,
            points: [...prev.points, { x, y, time: Date.now() }]
        } : null);
    };

    const stopDrawing = () => {
        if (!isDrawing || !currentStroke) return;
        setIsDrawing(false);
        if (currentStroke.points.length > 1) {
            setStrokes(prev => [...prev, currentStroke]);
        }
        setCurrentStroke(null);
    };

    // --- Rendering ---

    const drawStrokes = (ctx: CanvasRenderingContext2D, renderStrokes: Stroke[]) => {
        renderStrokes.forEach(stroke => {
            if (stroke.points.length < 2) return;
            ctx.beginPath();
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.strokeStyle = stroke.color;
            ctx.lineWidth = stroke.width;
            ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

            for (let i = 1; i < stroke.points.length - 1; i++) {
                const p1 = stroke.points[i];
                const p2 = stroke.points[i + 1];
                const midX = (p1.x + p2.x) / 2;
                const midY = (p1.y + p2.y) / 2;
                ctx.quadraticCurveTo(p1.x, p1.y, midX, midY);
            }
            const last = stroke.points[stroke.points.length - 1];
            ctx.lineTo(last.x, last.y);
            ctx.stroke();
        });
    };

    // Static drawing for 'draw' mode
    useEffect(() => {
        if (view === 'preview') return;

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (bgColor !== 'transparent') {
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }

        drawStrokes(ctx, [...strokes, ...(currentStroke ? [currentStroke] : [])]);

    }, [strokes, currentStroke, bgColor, view]);

    // --- Preview & Export ---

    const startPreviewAndExport = async () => {
        if (strokes.length === 0) return;
        setView('preview');

        // Use a slight delay to ensure view switch happens before heavy lifting starts
        setTimeout(async () => {
            generateExports();
        }, 100);
    };

    // Loop animation for preview
    useEffect(() => {
        if (view !== 'preview') {
            if (previewFrameId) cancelAnimationFrame(previewFrameId);
            return;
        }

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const allPoints = strokes.flatMap(s => s.points);
        if (allPoints.length === 0) return;

        const startTime = allPoints[0].time;
        const endTime = allPoints[allPoints.length - 1].time;
        const duration = endTime - startTime;
        let loopStart = Date.now();

        const animate = () => {
            const now = Date.now();
            let elapsed = (now - loopStart) * speed;

            if (elapsed > duration + 1000) { // 1s pause at end
                loopStart = now;
                elapsed = 0;
            }

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (bgColor !== 'transparent') {
                ctx.fillStyle = bgColor;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            // Filter points based on time
            const visibleStrokes = strokes.map(stroke => ({
                ...stroke,
                points: stroke.points.filter(p => (p.time - startTime) <= elapsed)
            })).filter(s => s.points.length > 0);

            drawStrokes(ctx, visibleStrokes);

            const id = requestAnimationFrame(animate);
            setPreviewFrameId(id);
        };

        const id = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(id);
    }, [view, strokes, bgColor, speed]);

    const generateExports = async () => {
        // Reset states
        setGifUrl(null);
        setMp4Url(null);
        setError(null);
        setStatus('');

        // Create a cleanup function to be called on error or completion
        const cleanupFiles = async (f: any, files: string[]) => {
            try {
                for (const file of files) {
                    try { await f.deleteFile(file); } catch (e) { /* ignore */ }
                }
            } catch (e) { console.error("Cleanup error", e); }
        };

        try {
            // 1. RECORDING PHASE
            setIsRecording(true);
            setStatus('Recording...');

            // Setup hidden canvas
            const width = 800;
            const height = 450;
            const offscreen = document.createElement('canvas');
            offscreen.width = width;
            offscreen.height = height;
            const ctx = offscreen.getContext('2d');
            if (!ctx) throw new Error("Canvas context failed");

            // Capture stream - Use VP8 for maximum decoding compatibility in WASM
            let mimeType = 'video/webm;codecs=vp8';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'video/webm'; 
            }

            const stream = offscreen.captureStream(30);
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType,
                videoBitsPerSecond: 1500000 // Slightly lower for stability
            });

            const chunks: Blob[] = [];
            mediaRecorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };

            const recordPromise = new Promise<Blob>((resolve, reject) => {
                mediaRecorder.onstop = () => {
                    const blob = new Blob(chunks, { type: 'video/webm' });
                    if (blob.size === 0) reject(new Error("Recording failed: Empty output"));
                    else resolve(blob);
                };
                mediaRecorder.onerror = (e) => reject(e);
            });

            mediaRecorder.start();

            // Replay logic
            const allPoints = strokes.flatMap(s => s.points);
            const startTime = allPoints[0].time;
            const endTime = allPoints[allPoints.length - 1].time;
            const duration = endTime - startTime;

            const renderStart = Date.now();

            const playRecord = () => {
                const now = Date.now();
                const elapsed = (now - renderStart) * speed;

                ctx.clearRect(0, 0, width, height);
                if (bgColor !== 'transparent') {
                    ctx.fillStyle = bgColor;
                    ctx.fillRect(0, 0, width, height);
                }

                const visibleStrokes = strokes.map(stroke => ({
                    ...stroke,
                    points: stroke.points.filter(p => (p.time - startTime) <= elapsed)
                }));

                drawStrokes(ctx, visibleStrokes);

                if (elapsed < duration + 500) {
                    requestAnimationFrame(playRecord);
                } else {
                    mediaRecorder.stop();
                }
            };

            playRecord();
            const webmBlob = await recordPromise;
            setIsRecording(false);

            setStatus('Loading engine...');
            const ffmpeg = await getFFmpeg();
            if (!ffmpeg) throw new Error("Failed to load engine. Please check your internet connection.");

            // Hook logger
            ffmpeg.on('log', ({ message }) => {
                console.log('FFmpeg:', message);
                // Detection for "Aborted()" - only show if we are still processing and NO file has been created yet.
                // We'll also check a local 'isDone' flag to be extra sure.
                if (message.includes('Aborted()') && !gifUrl) {
                    // We'll set a delayed error check to see if the process actually recovered
                    setTimeout(() => {
                        if (!document.querySelector('[data-success="true"]')) {
                            // Only set error if we truly have nothing
                            setError("Stability issue detected. Please try drawing a slightly shorter signature.");
                        }
                    }, 500);
                }
            });

            await writeFileToFFmpeg(ffmpeg, 'input.webm', webmBlob);

            // 4. GENERATE GIF (Priority)
            setIsEncodingGIF(true);
            setStatus('Creating GIF...');

            await ffmpeg.exec([
                '-threads', '1',
                '-i', 'input.webm',
                '-vf', 'fps=12,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen=reserve_transparent=1[p];[s1][p]paletteuse=alpha_threshold=128',
                '-loop', '0',
                'output.gif'
            ]);

            const gifData = await readFileFromFFmpeg(ffmpeg, 'output.gif', 'image/gif');
            setGifUrl(gifData);
            setError(null); // Explicitly clear any transient "Aborted()" errors

            // Final Cleanup
            await ffmpeg.deleteFile('input.webm').catch(() => {});
            await ffmpeg.deleteFile('output.gif').catch(() => {});

            setIsEncodingGIF(false);

        } catch (err: any) {
            console.error(err);
            const msg = err.message || "Processing failed.";
            if (msg.includes('SharedArrayBuffer') || msg.includes('Isolated')) {
                setError("Security Error: This browser tool requires Cross-Origin Isolation headers. Please ensure you are viewing via the main AdopeCanva hub.");
            } else {
                setError(msg);
            }
        } finally {
            setIsRecording(false);
            setIsEncodingMP4(false);
            setIsEncodingGIF(false);
            setStatus('');
        }
    };

    const isProcessing = isRecording || isEncodingMP4 || isEncodingGIF;

    return (
        <div className={`w-full bg-zinc-950 text-zinc-200 flex flex-col md:flex-row overflow-hidden font-sans selection:bg-primary/30 ${isMobile ? 'h-[100vh]' : 'max-w-6xl mx-auto rounded-3xl border border-zinc-800 min-h-[600px]'}`}>

            {/* Sidebar */}
            <aside className={`${isMobile ? 'order-2 flex-1 overflow-hidden' : 'order-2 w-80 border-r'} border-zinc-800 bg-zinc-950 flex flex-col z-20`}>
                <div className="h-14 px-5 border-b border-zinc-900 flex items-center justify-between shrink-0 bg-zinc-950/80 backdrop-blur-sm">
                    <h2 className="font-black text-xs text-primary uppercase tracking-widest flex items-center gap-2 font-unbounded">
                        <PenTool size={20} /> Sign to Gif
                    </h2>
                    <button onClick={() => {
                        setStrokes([]);
                        setGifUrl(null);
                        setMp4Url(null);
                        setError(null);
                        setView('draw');
                    }} className="text-zinc-600 hover:text-primary transition-colors">
                        <RefreshCcw size={14} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                    <div className="space-y-6 animate-in fade-in duration-300">
                        <section className="space-y-4">
                            <SectionLabel>Pen Style</SectionLabel>
                            <ColorPicker
                                activeColor={color}
                                onChange={setColor}
                                colors={colors}
                            />
                            <SliderControl
                                label="Pen Size"
                                value={width}
                                min={1}
                                max={10}
                                onChange={setWidth}
                                unit="px"
                            />
                        </section>

                        <section className="space-y-4">
                            <SectionLabel>Background</SectionLabel>
                            <ColorPicker
                                activeColor={bgColor}
                                onChange={setBgColor}
                                colors={bgColors}
                                allowCustom={false}
                            />
                        </section>

                        <section className="space-y-4">
                            <SectionLabel>Animation Speed</SectionLabel>
                            <SliderControl
                                label="Playback Speed"
                                value={speed}
                                min={0.5}
                                max={3}
                                step={0.5}
                                onChange={setSpeed}
                                unit="x"
                            />
                        </section>

                        <div className="pt-4 border-t border-zinc-800 space-y-3">
                            {view === 'draw' ? (
                                <>
                                    <div className="grid grid-cols-2 gap-3">
                                        <Button variant="secondary" onClick={() => setStrokes(s => s.slice(0, -1))}
                                            disabled={strokes.length === 0}
                                        >
                                            <Undo size={16} className="mr-2" /> Undo
                                        </Button>
                                        <Button variant="secondary" className="hover:border-red-500/50 hover:text-red-400" onClick={() => setStrokes([])}
                                            disabled={strokes.length === 0}
                                        >
                                            <Eraser size={16} className="mr-2" /> Clear
                                        </Button>
                                    </div>
                                    <Button variant="primary" className="w-full h-12" onClick={startPreviewAndExport} disabled={strokes.length === 0} >
                                        <Eye size={18} className="mr-2" /> Preview & Create
                                    </Button>
                                </>
                            ) : (
                                <div className="space-y-4 animate-slide-up">
                                    {error && (
                                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400">
                                            <Info size={16} className="shrink-0 mt-0.5" />
                                            <div className="text-[11px] leading-relaxed">
                                                <p className="font-bold">Error during export</p>
                                                <p className="opacity-80">{error}</p>
                                                <button 
                                                    onClick={() => generateExports()}
                                                    className="mt-2 text-primary hover:underline font-bold uppercase tracking-widest text-[9px]"
                                                >
                                                    Try Again
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="space-y-3">
                                    {/* SIMPLIFIED DOWNLOAD BUTTON */}
                                    <div className="flex h-12 w-full mt-4 shadow-lg shadow-primary/20 rounded-xl overflow-hidden">
                                        <button 
                                            className={`flex-1 h-full flex items-center justify-center font-bold text-sm transition-all rounded-xl ${(gifUrl || isProcessing) ? 'bg-primary text-white hover:bg-primary/90 disabled:opacity-100 disabled:cursor-wait' : 'bg-zinc-800 text-zinc-500' }`} 
                                            disabled={!gifUrl && !isProcessing} 
                                            data-success={!!gifUrl}
                                            onClick={() => {
                                                if (isProcessing || !gifUrl) return;
                                                const a = document.createElement("a");
                                                a.href = gifUrl;
                                                a.download = "signature.gif";
                                                a.click();
                                            }}
                                        >
                                            {isRecording ? (
                                                <><Loader2 size={16} className="animate-spin mr-2" /> Recording...</>
                                            ) : isEncodingMP4 ? (
                                                <><Loader2 size={16} className="animate-spin mr-2" /> Preparing...</>
                                            ) : isEncodingGIF ? (
                                                <><Loader2 size={16} className="animate-spin mr-2" /> Creating GIF...</>
                                            ) : status === 'Loading engine...' ? (
                                                <><Loader2 size={16} className="animate-spin mr-2" /> Starting...</>
                                            ) : gifUrl ? (
                                                <><Film size={18} className="mr-2" /> Download GIF</>
                                            ) : error ? (
                                                <><RefreshCcw size={16} className="mr-2" /> Retry Export</>
                                            ) : (
                                                <><Loader2 size={16} className="animate-spin mr-2" /> Initializing...</>
                                            )}
                                        </button>
                                    </div>
                                    </div>

                                    <Button variant="secondary" className="w-full mt-2" onClick={() => { setView('draw'); setError(null); setStatus(''); }}
                                    >
                                        <Edit2 size={16} className="mr-2" /> Continue Drawing
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </aside>

            {/* Canvas Area */}
            <main className={`order-1 ${isMobile ? 'h-[50vh]' : 'flex-1'} relative bg-[#09090b] flex flex-col items-center justify-center p-4 md:p-8 overflow-hidden shrink-0`}>
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

                <div
                    className={`relative w-full max-w-3xl aspect-[16/9] rounded-2xl overflow-hidden shadow-2xl border transition-all ${isDrawing ? 'border-primary ring-4 ring-primary/10' : 'border-zinc-800'}`}
                    style={{
                        // CSS Pattern instead of internal image to avoid CSP issues
                        background: bgColor === 'transparent'
                            ? "repeating-linear-gradient(45deg, #18181b 25%, transparent 25%, transparent 75%, #18181b 75%, #18181b), repeating-linear-gradient(45deg, #18181b 25%, #09090b 25%, #09090b 75%, #18181b 75%, #18181b)"
                            : bgColor,
                        backgroundPosition: '0 0, 10px 10px',
                        backgroundSize: '20px 20px',
                        backgroundColor: bgColor === 'transparent' ? '#09090b' : bgColor
                    }}
                >
                    <canvas
                        ref={canvasRef}
                        width={800}
                        height={450}
                        onPointerDown={startDrawing}
                        onPointerMove={draw}
                        onPointerUp={stopDrawing}
                        onPointerLeave={stopDrawing}
                        onPointerOut={stopDrawing}
                        className={`w-full h-full touch-none ${view === 'draw' ? 'cursor-crosshair' : 'cursor-default'}`}
                    />

                    {strokes.length === 0 && !isDrawing && view === 'draw' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-zinc-400/50">
                            <PenTool size={48} className="mb-4 opacity-50" />
                            <p className="font-unbounded text-lg">Sign Here</p>
                        </div>
                    )}

                    {view === 'preview' && (
                        <div className="absolute top-4 right-4 px-3 py-1 bg-primary/90 text-white text-[10px] font-bold uppercase tracking-widest rounded-full shadow-lg backdrop-blur-md animate-pulse">
                            Preview
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};
