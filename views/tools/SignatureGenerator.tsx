/// <reference lib="dom" />
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '../../components/ui/Button';
import { getFFmpeg, writeFileToFFmpeg, readFileFromFFmpeg } from '../../utils/ffmpeg';
import { Download, RefreshCcw, Undo, Play, Video, Film, PenTool, Eraser, Loader2, Eye, Edit2, ChevronUp } from 'lucide-react';
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

            // Check codec support
            let mimeType = 'video/webm;codecs=vp9';
            if (!MediaRecorder.isTypeSupported(mimeType)) {
                mimeType = 'video/webm'; // Fallback
            }

            // Capture stream
            const stream = offscreen.captureStream(30);
            const mediaRecorder = new MediaRecorder(stream, {
                mimeType,
                videoBitsPerSecond: 2500000
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

            // 2. FFmpeg INIT
            setStatus('Loading engine...');
            const ffmpeg = await getFFmpeg();
            if (!ffmpeg) throw new Error("Failed to load engine");

            // Hook logger
            ffmpeg.on('log', ({ message }) => {
                console.log('FFmpeg:', message);
                // Optional: update status with detailed progress if needed, but simple is better for UI
            });

            await writeFileToFFmpeg(ffmpeg, 'input.webm', webmBlob);

            // 3. GENERATE MP4 (Fastest)
            setIsEncodingMP4(true);
            setStatus('Creating MP4...');

            await ffmpeg.exec([
                '-i', 'input.webm',
                '-c:v', 'libx264',
                '-preset', 'ultrafast',
                '-movflags', 'faststart',
                '-pix_fmt', 'yuv420p',
                'output.mp4'
            ]);

            const mp4Data = await readFileFromFFmpeg(ffmpeg, 'output.mp4', 'video/mp4');
            setMp4Url(mp4Data);

            // Cleanup MP4 to free memory for GIF operation
            await cleanupFiles(ffmpeg, ['output.mp4']);

            setIsEncodingMP4(false);

            // 4. GENERATE GIF (Safest Method)
            setIsEncodingGIF(true);
            setStatus('Creating GIF...');

            // We use a 2-step process or a known safe filter chain.
            // Using a simple palettegen approach in one command is standard, but if it hangs,
            // it's often due to complexity. We'll use the most standard "high quality" palette approach.
            // If this still hangs, the issue is likely WASM memory, but cleaning MP4 above helps.

            await ffmpeg.exec([
                '-i', 'input.webm',
                '-vf', 'fps=15,scale=400:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse',
                '-loop', '0',
                'output.gif'
            ]);

            const gifData = await readFileFromFFmpeg(ffmpeg, 'output.gif', 'image/gif');
            setGifUrl(gifData);

            // Final Cleanup
            await cleanupFiles(ffmpeg, ['input.webm', 'output.gif']);

            setIsEncodingGIF(false);

        } catch (err: any) {
            console.error(err);
            setError("Processing failed. Please try again.");
            // Force cleanup on error
            try {
                const f = await getFFmpeg();
                await cleanupFiles(f, ['input.webm', 'output.mp4', 'output.gif']);
            } catch (e) { }
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
                                <div className="space-y-3 animate-slide-up">
                                    {/* UNIFIED DOWNLOAD BUTTON */}
                                    <div className="relative flex items-stretch mt-4 group shadow-sm">
                                        <Button className={`flex-1 ${(!isProcessing && mp4Url) ? 'rounded-r-none border-r border-white/20' : ''} ${(gifUrl || isProcessing) ? 'bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/25 disabled:opacity-100 disabled:cursor-wait' : 'bg-zinc-800 text-zinc-500 disabled:opacity-50' }`} disabled={!gifUrl && !isProcessing} onClick={() => {
                                                if (isProcessing) return;
                                                if (!gifUrl) return;
                                                const a = document.createElement("a");
                                                a.href = gifUrl;
                                                a.download = "signature.gif";
                                                a.click();
                                            }}
                                        >
                                            {isRecording ? (
                                                <><Loader2 size={16} className="animate-spin mr-2" /> Recording...</>
                                            ) : isEncodingMP4 ? (
                                                <><Loader2 size={16} className="animate-spin mr-2" /> Creating MP4...</>
                                            ) : isEncodingGIF ? (
                                                <><Loader2 size={16} className="animate-spin mr-2" /> Creating GIF...</>
                                            ) : gifUrl ? (
                                                <><Film size={18} className="mr-2" /> Download GIF</>
                                            ) : (
                                                <span className="opacity-50">Initializing...</span>
                                            )}
                                        </Button>

                                        {!isProcessing && mp4Url && (
                                            <button
                                                className={`px-3 flex items-center justify-center rounded-r-md transition-colors ${(gifUrl)
                                                        ? 'bg-primary text-white hover:bg-primary/90 border-l border-white/20'
                                                        : 'bg-zinc-800 text-zinc-500 border-l border-zinc-700'
                                                    }`}
                                                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                                            >
                                                <ChevronUp size={16} />
                                            </button>
                                        )}

                                        {/* Dropdown */}
                                        {showDownloadMenu && !isProcessing && mp4Url && (
                                            <div className="absolute bottom-full right-0 mb-2 w-full bg-zinc-900 border border-zinc-800 rounded-xl shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-bottom-2 p-1">
                                                <button
                                                    className="w-full text-left px-3 py-2 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white rounded-lg flex items-center gap-2 transition-colors"
                                                    onClick={() => {
                                                        const a = document.createElement("a");
                                                        a.href = mp4Url;
                                                        a.download = "signature.mp4";
                                                        a.click();
                                                        setShowDownloadMenu(false);
                                                    }}
                                                >
                                                    <Video size={14} /> Download Video (MP4)
                                                </button>
                                            </div>
                                        )}
                                    </div>

                                    <Button variant="secondary" className="w-full mt-2" onClick={() => { setView('draw'); setError(null); }}
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
