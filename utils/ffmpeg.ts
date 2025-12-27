
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { toBlobURL } from '@ffmpeg/util';

let ffmpeg: FFmpeg | null = null;
let loadingPromise: Promise<FFmpeg> | null = null;

export const getFFmpeg = async () => {
    if (ffmpeg && ffmpeg.loaded) {
        return ffmpeg;
    }

    if (loadingPromise) {
        try {
            return await loadingPromise;
        } catch (e) {
            // If previous attempt failed, clear promise so we can try again
            loadingPromise = null;
        }
    }

    loadingPromise = (async () => {
        const forceSingle = typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_FFMPEG_FORCE_SINGLE === 'true';
        const isSharedArrayBufferSupported = !forceSingle && typeof SharedArrayBuffer !== 'undefined' && 
                                           (typeof window !== 'undefined' ? window.crossOriginIsolated : true);
        
        const baseURLMT = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core-mt@0.12.10/dist/esm';
        const baseURLST = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm';
        const TIMEOUT_MS = 20000; // 20s timeout for loading

        const withTimeout = <T>(promise: Promise<T>, ms: number, msg: string): Promise<T> => {
            return new Promise((resolve, reject) => {
                const timer = setTimeout(() => reject(new Error(msg)), ms);
                promise.then(
                    (res) => { clearTimeout(timer); resolve(res); },
                    (err) => { clearTimeout(timer); reject(err); }
                );
            });
        };

        const cleanup = () => {
            if (ffmpeg) {
                try {
                    ffmpeg.terminate();
                } catch (e) {
                    console.warn('Failed to terminate FFmpeg instance:', e);
                }
                ffmpeg = null;
            }
        };

        // Helper to load multi-threaded
        const loadMT = async () => {
            console.log('Attempting to load FFmpeg (Multi-threaded)...');
            console.log('Cross-Origin Isolated:', window.crossOriginIsolated);
            
            const coreURL = await toBlobURL(`${baseURLMT}/ffmpeg-core.js`, 'text/javascript');
            const wasmURL = await toBlobURL(`${baseURLMT}/ffmpeg-core.wasm`, 'application/wasm');
            const workerURL = await toBlobURL(`${baseURLMT}/ffmpeg-core.worker.js`, 'text/javascript');
            
            cleanup();
            ffmpeg = new FFmpeg();
            
            await withTimeout(ffmpeg.load({
                coreURL,
                wasmURL,
                workerURL,
            }), TIMEOUT_MS, 'Multi-threaded FFmpeg load timed out');
            
            // Give threads a moment to initialize
            await new Promise(resolve => setTimeout(resolve, 500));
            
            console.log('FFmpeg (Multi-threaded) loaded successfully.');
        };

        // Helper to load single-threaded
        const loadST = async () => {
            console.log('Attempting to load FFmpeg (Single-threaded)...');
            const coreURL = await toBlobURL(`${baseURLST}/ffmpeg-core.js`, 'text/javascript');
            const wasmURL = await toBlobURL(`${baseURLST}/ffmpeg-core.wasm`, 'application/wasm');
            
            cleanup();
            ffmpeg = new FFmpeg();
            
            await withTimeout(ffmpeg.load({
                coreURL,
                wasmURL,
            }), TIMEOUT_MS, 'Single-threaded FFmpeg load timed out');
            
            console.log('FFmpeg (Single-threaded) loaded successfully.');
        };
        
        const smoke = async () => {
            const out = 'smoke.png';
            if (!ffmpeg) throw new Error('FFmpeg instance not initialized');
            
            // Use explicit thread count for smoke test to avoid potential deadlocks
            await withTimeout(ffmpeg.exec([
                '-y',
                '-f', 'lavfi',
                '-i', 'color=s=16x16:color=red',
                '-frames:v', '1',
                '-threads', '2',
                out
            ]), 2500, 'Smoke test execution timed out');
            
            await ffmpeg.readFile(out);
            await ffmpeg.deleteFile(out);
        };

        try {
            if (isSharedArrayBufferSupported) {
                try {
                    await loadMT();
                    try {
                        await smoke();
                    } catch (execErr) {
                        console.warn('FFmpeg multi-thread exec/smoke failed, falling back to single-threaded:', execErr);
                        await loadST();
                        await smoke();
                    }
                } catch (mtError) {
                    console.warn('Failed to load multi-threaded FFmpeg, falling back to single-threaded:', mtError);
                    await loadST();
                    await smoke();
                }
            } else {
                console.warn('SharedArrayBuffer not supported or forced single-thread, using single-threaded FFmpeg.');
                await loadST();
                await smoke();
            }
        } catch (error) {
            console.error('CRITICAL: Error loading FFmpeg:', error);
            cleanup();
            loadingPromise = null;
            throw error;
        }

        return ffmpeg!;
    })();

    return loadingPromise;
};

export const writeFileToFFmpeg = async (ffmpeg: FFmpeg, fileName: string, file: File | Blob) => {
    const data = await file.arrayBuffer();
    await ffmpeg.writeFile(fileName, new Uint8Array(data));
};

export const readFileFromFFmpeg = async (ffmpeg: FFmpeg, fileName: string, mimeType: string) => {
    const data = await ffmpeg.readFile(fileName);
    const blob = new Blob([data as any], { type: mimeType });
    return URL.createObjectURL(blob);
};

export const resetFFmpeg = () => {
    try {
        // @ts-ignore
        ffmpeg?.terminate?.();
    } catch {}
    ffmpeg = null;
    loadingPromise = null;
    console.log('FFmpeg instance has been reset.');
};
