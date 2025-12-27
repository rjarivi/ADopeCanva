/// <reference lib="dom" />
import React, { useState, useEffect, useRef } from 'react';
import { FileUploader } from '../../components/FileUploader';
import { Button } from '../../components/ui/Button';
import { FileData } from '../../types';
import { Image as ImageIcon, Film, Download, Trash2, Clock, Settings, RefreshCcw, Play, Loader2, AlertCircle, MoveUp, MoveDown, Pause, Maximize, Minimize, Expand } from 'lucide-react';
import { getFFmpeg, writeFileToFFmpeg, readFileFromFFmpeg } from '../../utils/ffmpeg';
import { FFmpeg } from '@ffmpeg/ffmpeg';

type FitMode = 'stretch' | 'fit' | 'zoom';

export const GifMaker: React.FC = () => {
  const [files, setFiles] = useState<FileData[]>([]);
  const [interval, setInterval] = useState(0.5); // Seconds per frame
  const [width, setWidth] = useState(400);
  const [height, setHeight] = useState(300);
  const [fitMode, setFitMode] = useState<FitMode>('fit');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<string>('');
  const [resultGif, setResultGif] = useState<string | null>(null);
  const [engineStatus, setEngineStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // Preview State
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(true);

  // Drag and Drop State
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  const ffmpegRef = useRef<FFmpeg | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let ffInstance: FFmpeg | null = null;
    const logCallback = ({ message }: { message: string }) => {
      console.log('[GifMaker]', message);
    };

    getFFmpeg()
      .then(ff => {
        ffInstance = ff;
        ff.on('log', logCallback);
        ffmpegRef.current = ff;
        setEngineStatus('ready');
      })
      .catch(e => {
        console.error("Failed to load FFmpeg", e);
        setErrorMessage(e instanceof Error ? e.message : 'Unknown error occurred');
        setEngineStatus('error');
      });

    return () => {
      if (ffInstance) {
        ffInstance.off('log', logCallback);
      }
    };
  }, []);

  // Preview Loop
  useEffect(() => {
    if (!isPreviewPlaying || files.length === 0 || resultGif || isProcessing) return;

    const timer = setTimeout(() => {
      setCurrentFrame(prev => (prev + 1) % files.length);
    }, interval * 1000);

    return () => clearTimeout(timer);
  }, [files.length, interval, isPreviewPlaying, resultGif, isProcessing, currentFrame]);

  const handleFilesSelect = (newFiles: FileData[]) => {
    setFiles(prev => [...prev, ...newFiles]);
    setIsPreviewPlaying(true);
    setErrorMessage('');
  };

  const removeFile = (index: number) => {
    setFiles(prev => {
      const newFiles = prev.filter((_, i) => i !== index);
      if (currentFrame >= newFiles.length) setCurrentFrame(0);
      return newFiles;
    });
  };

  const moveFile = (index: number, direction: -1 | 1) => {
    setFiles(prev => {
      const newFiles = [...prev];
      if (index + direction < 0 || index + direction >= newFiles.length) return prev;
      const temp = newFiles[index];
      newFiles[index] = newFiles[index + direction];
      newFiles[index + direction] = temp;
      return newFiles;
    });
  };

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    if (draggedIndex === null) return;
    
    setFiles(prev => {
      const newFiles = [...prev];
      const [draggedItem] = newFiles.splice(draggedIndex, 1);
      newFiles.splice(dropIndex, 0, draggedItem);
      return newFiles;
    });
    setDraggedIndex(null);
  };

  const handleHiddenInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).map((file: File) => ({
        file,
        type: file.type,
        size: (file.size / (1024 * 1024)).toFixed(2) + ' MB',
        previewUrl: URL.createObjectURL(file)
      }));
      handleFilesSelect(newFiles);
      e.target.value = '';
    }
  };

  const handleCreateGif = async () => {
    if (files.length === 0 || !ffmpegRef.current) return;
    setIsProcessing(true);
    setResultGif(null);
    setIsPreviewPlaying(false);
    setErrorMessage('');
    setProgress('Initializing...');

    const ffmpeg = ffmpegRef.current;

    try {
      // 1. Prepare Filter Chain for Normalization
      let scaleFilter = '';
      if (fitMode === 'stretch') {
        scaleFilter = `scale=${width}:${height}:flags=lanczos`;
      } else if (fitMode === 'fit') {
        scaleFilter = `scale=${width}:${height}:force_original_aspect_ratio=decrease:flags=lanczos,pad=${width}:${height}:-1:-1:color=black`;
      } else if (fitMode === 'zoom') {
        scaleFilter = `scale=${width}:${height}:force_original_aspect_ratio=increase:flags=lanczos,crop=${width}:${height}`;
      } else {
        scaleFilter = `scale=${width}:${height}:flags=lanczos`;
      }

      console.log(`[GifMaker] Mode: ${fitMode}, Filter: ${scaleFilter}`);
      
      const threads = typeof navigator !== 'undefined' && navigator.hardwareConcurrency
        ? Math.min(navigator.hardwareConcurrency, 4).toString()
        : '2';

      // 2. Normalization & Pre-processing Loop
      // Convert all inputs to standardized PNGs with correct dimensions
      // NOTE: We process frames individually here because input files may have mixed
      // dimensions/aspect ratios. FFmpeg's 'image2' demuxer cannot handle a single stream
      // with varying dimensions. Processing one-by-one ensures each frame is correctly
      // scaled/padded to the target resolution before being merged into the final sequence.
      // This also minimizes memory usage by only keeping one raw image in MEMFS at a time.
      const totalStart = performance.now();
      const normalizedFiles: string[] = [];
      
      for (let i = 0; i < files.length; i++) {
        setProgress(`Processing image ${i + 1}/${files.length}...`);
        
        const file = files[i].file;
        const inputExt = file.name.split('.').pop()?.toLowerCase() || 'png';
        const inputName = `raw_${i}.${inputExt}`;
        const outputName = `norm_${i.toString().padStart(3, '0')}.png`; // Sequence pattern friendly
        
        await writeFileToFFmpeg(ffmpeg, inputName, file);
        
        // Convert and Scale
        // STRATEGY: Write to a temporary file 'temp_norm.png' first, then move it to the final
        // 'norm_000.png' name. This avoids FFmpeg's image2 muxer error:
        // "The specified filename 'norm_000.png' does not contain an image sequence pattern"
        // which occurs because FFmpeg sees the digits and expects a pattern like %03d.
        const tempOutput = 'temp_norm.png';
        
        const ret = await ffmpeg.exec([
          '-i', inputName,
          '-vf', scaleFilter,
          '-threads', threads,
          '-y',
          '-f', 'image2',
          tempOutput
        ]);
        
        if (ret !== 0) {
            throw new Error(`Failed to process frame ${i + 1}. Check console for details.`);
        }
        
        // "Move" the file by reading and rewriting (MEMFS operation, fast)
        const frameData = await ffmpeg.readFile(tempOutput);
        await ffmpeg.writeFile(outputName, frameData);
        await ffmpeg.deleteFile(tempOutput);
        
        // Clean up raw input
        await ffmpeg.deleteFile(inputName);
        normalizedFiles.push(outputName);
      }

      // 3. Generate Palette from Normalized Sequence
      setProgress('Generating color palette...');
      console.log('[GifMaker] Generating Palette...');
      const paletteStart = performance.now();
      const fps = (1 / interval).toFixed(2);
      
      // Verify normalized files exist
      try {
        const firstFile = await ffmpeg.readFile('norm_000.png');
        if (firstFile.length === 0) throw new Error('First normalized frame is empty');
      } catch (e) {
        throw new Error('Normalized frames missing before palette generation');
      }

      // Note: Inputs are now norm_000.png, norm_001.png, etc.
      // Pattern: norm_%03d.png
      
      const tempPalette = 'temp_palette.png';
      const retPalette = await ffmpeg.exec([
        '-framerate', fps,
        '-i', 'norm_%03d.png',
        '-vf', 'palettegen=stats_mode=diff', // Optimize palette for animation
        '-threads', threads,
        '-y',
        '-f', 'image2',
        tempPalette
      ]);

      if (retPalette !== 0) {
        throw new Error('Failed to generate color palette. FFmpeg exited with error.');
      }

      // Verify palette exists and has content
      let paletteData;
      try {
        paletteData = await ffmpeg.readFile(tempPalette);
      } catch (e) {
        throw new Error('Palette file was not created successfully');
      }

      if (paletteData.length === 0) throw new Error('Generated palette is empty');
      console.log(`[GifMaker] Palette generated. Size: ${paletteData.length} bytes`);
      
      // Move to final location
      await ffmpeg.writeFile('palette.png', paletteData);
      await ffmpeg.deleteFile(tempPalette);

      console.log(`[GifMaker] Palette Gen Complete (${(performance.now() - paletteStart).toFixed(0)}ms)`);

      // 4. Render GIF
      setProgress('Rendering final GIF...');
      console.log('[GifMaker] Rendering GIF...');
      const renderStart = performance.now();
      const finalOutput = 'output.gif';

      const retRender = await ffmpeg.exec([
        '-framerate', fps,
        '-i', 'norm_%03d.png',
        '-i', 'palette.png',
        '-filter_complex', `[0:v][1:v]paletteuse`, // Images are already scaled!
        '-threads', threads,
        '-y',
        finalOutput
      ]);

      if (retRender !== 0) {
        throw new Error('Failed to render final GIF.');
      }

      console.log(`[GifMaker] Render Complete (${(performance.now() - renderStart).toFixed(0)}ms)`);

      // 5. Read Result
      const url = await readFileFromFFmpeg(ffmpeg, finalOutput, 'image/gif');
      setResultGif(url);
      console.log(`[GifMaker] Total Time: ${(performance.now() - totalStart).toFixed(0)}ms`);

      // 6. Cleanup
      for (const f of normalizedFiles) {
        try { await ffmpeg.deleteFile(f); } catch (e) {}
      }
      try { await ffmpeg.deleteFile('palette.png'); } catch (e) {}
      try { await ffmpeg.deleteFile(finalOutput); } catch (e) {}

    } catch (e) {
      console.error(e);
      setErrorMessage(e instanceof Error ? e.message : 'Conversion failed');
    } finally {
      setIsProcessing(false);
      setProgress('');
    }
  };

  if (engineStatus === 'loading') {
    return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-pink-500" /></div>;
  }

  if (engineStatus === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center space-y-4 animate-fade-in">
        <div className="bg-red-500/10 p-4 rounded-full text-red-500">
          <AlertCircle size={32} />
        </div>
        <h3 className="text-xl font-bold text-white">Engine Failed</h3>
        <p className="text-zinc-400 max-w-md">The GIF engine could not load.</p>
        {errorMessage && (
          <p className="text-red-400 text-sm font-mono bg-black/50 p-2 rounded max-w-lg mx-auto">
            {errorMessage}
          </p>
        )}
        <Button onClick={() => window.location.reload()} variant="secondary">Reload Page</Button>
      </div>
    );
  }

  if (files.length === 0) {
    return (
      <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 to-rose-500">
            GIF Maker
          </h2>
          <p className="text-zinc-400">Create animated GIFs from a series of images.</p>
        </div>
        <div className="p-8 bg-surface rounded-3xl shadow-xl border border-zinc-800/50">
          <FileUploader
            onFilesSelect={handleFilesSelect}
            accept="image/*"
            label="Upload Images"
            description="Select multiple PNG, JPG, WebP files"
            multiple={true}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 animate-slide-up">
      {/* Settings & List */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-surface rounded-3xl border border-zinc-800 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Settings size={18} className="text-pink-500" /> Settings
            </h3>
            <Button variant="ghost" size="sm" onClick={() => { setFiles([]); setResultGif(null); setErrorMessage(''); }}>
              <RefreshCcw size={16} className="mr-2" /> Reset
            </Button>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <Clock size={14} /> Frame Delay (Seconds)
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range" min="0.05" max="5.0" step="0.05"
                  value={interval}
                  onChange={(e) => setInterval(parseFloat((e.target as HTMLInputElement).value))}
                  className="flex-1 h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-pink-500"
                />
                <span className="text-white font-mono w-12 text-right">{interval.toFixed(2)}s</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Width (px)</label>
                <input
                  type="number"
                  value={width}
                  onChange={(e) => setWidth(parseInt(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-xl px-4 py-2"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-400">Height (px)</label>
                <input
                  type="number"
                  value={height}
                  onChange={(e) => setHeight(parseInt(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-700 text-white rounded-xl px-4 py-2"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-400">Image Fit Mode</label>
              <div className="grid grid-cols-3 gap-2">
                {(['fit', 'zoom', 'stretch'] as FitMode[]).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setFitMode(mode)}
                    className={`p-2 rounded-lg text-xs font-medium border transition-all flex flex-col items-center gap-1 ${
                      fitMode === mode 
                        ? 'bg-pink-500/20 border-pink-500 text-pink-500' 
                        : 'border-zinc-700 text-zinc-400 hover:bg-zinc-800'
                    }`}
                  >
                    {mode === 'fit' && <Minimize size={14} />}
                    {mode === 'zoom' && <Maximize size={14} />}
                    {mode === 'stretch' && <Expand size={14} />}
                    {mode.charAt(0).toUpperCase() + mode.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {errorMessage && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <Button
              className="w-full h-12 bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 border-none"
              onClick={handleCreateGif}
              isLoading={isProcessing}
            >
              <Film size={18} className="mr-2" /> {isProcessing ? progress : 'Create GIF'}
            </Button>
          </div>

          <div className="h-px bg-zinc-800 my-4"></div>

          <div>
            <h4 className="font-medium text-zinc-300 mb-3">Frames ({files.length})</h4>
            <div className="grid grid-cols-3 gap-2 max-h-[300px] overflow-y-auto pr-1">
              {files.map((file, i) => (
                <div 
                  key={i} 
                  draggable
                  onDragStart={(e) => handleDragStart(e, i)}
                  onDragOver={(e) => handleDragOver(e, i)}
                  onDrop={(e) => handleDrop(e, i)}
                  className={`relative group aspect-square bg-zinc-900 rounded-lg overflow-hidden border ${
                    draggedIndex === i ? 'border-pink-500 opacity-50' : 'border-zinc-800'
                  } cursor-move hover:border-zinc-600 transition-all`}
                >
                  <img src={file.previewUrl} alt="frame" className="w-full h-full object-cover pointer-events-none" />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                    <div className="flex gap-1">
                       <button onClick={(e) => { e.stopPropagation(); moveFile(i, -1); }} className="p-1 hover:text-white text-zinc-400" disabled={i === 0}>
                         <MoveUp size={14} />
                       </button>
                       <button onClick={(e) => { e.stopPropagation(); moveFile(i, 1); }} className="p-1 hover:text-white text-zinc-400" disabled={i === files.length - 1}>
                         <MoveDown size={14} />
                       </button>
                    </div>
                    <button onClick={() => removeFile(i)} className="text-red-400 hover:text-red-300 p-1">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1 rounded">
                    {i + 1}
                  </div>
                </div>
              ))}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square bg-zinc-900 rounded-lg border border-zinc-800 border-dashed flex items-center justify-center cursor-pointer hover:bg-zinc-800 hover:border-zinc-600 transition-colors"
              >
                <div className="text-xs text-zinc-500 text-center px-1">
                  <span className="block text-2xl mb-1">+</span>
                  Add
                </div>
              </div>
            </div>
          </div>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleHiddenInputChange}
          className="hidden"
          multiple
          accept="image/*"
        />
      </div>

      {/* Preview Area */}
      <div className="lg:col-span-2">
        <div className="bg-black/50 rounded-3xl border border-zinc-800 h-[500px] flex flex-col items-center justify-center relative overflow-hidden p-8">
          <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')] opacity-20 pointer-events-none"></div>

          {resultGif ? (
            <div className="text-center space-y-6 z-10 animate-fade-in w-full h-full flex flex-col items-center justify-center">
              <div className="bg-white p-2 rounded-xl shadow-2xl inline-block max-h-[80%]">
                <img src={resultGif} alt="Generated GIF" className="max-h-full max-w-full rounded-lg object-contain" style={{ maxHeight: '350px' }} />
              </div>
              <div>
                <Button onClick={() => {
                  const a = document.createElement('a');
                  a.href = resultGif!;
                  a.download = 'created.gif';
                  a.click();
                }} className="bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-600 hover:to-rose-700 text-white shadow-lg shadow-pink-500/20 border-none">
                  <Download size={18} className="mr-2" /> Download GIF
                </Button>
              </div>
            </div>
          ) : isProcessing ? (
            <div className="text-center z-10">
              <div className="w-16 h-16 border-4 border-zinc-700 border-t-pink-500 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-zinc-300 font-medium">{progress}</p>
              <p className="text-zinc-500 text-sm mt-2">This may take a moment for large images</p>
            </div>
          ) : files.length > 0 ? (
            <div className="w-full h-full flex flex-col items-center justify-center z-10">
               {/* Live Preview Canvas/Image */}
               <div 
                 className="relative bg-black shadow-2xl border border-zinc-700 overflow-hidden transition-all duration-300"
                 style={{ 
                   width: `${width}px`, 
                   height: `${height}px`,
                   maxWidth: '100%',
                   maxHeight: '80%',
                   aspectRatio: `${width}/${height}`
                 }}
               >
                 <img 
                   src={files[currentFrame]?.previewUrl} 
                   alt={`Frame ${currentFrame}`}
                   className="w-full h-full transition-none"
                   style={{
                     objectFit: fitMode === 'fit' ? 'contain' : fitMode === 'zoom' ? 'cover' : 'fill'
                   }}
                 />
                 <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded font-mono">
                   Preview: {currentFrame + 1}/{files.length}
                 </div>
               </div>

               {/* Preview Controls */}
               <div className="mt-6 flex items-center gap-4 bg-zinc-900/80 p-2 rounded-full border border-zinc-700 backdrop-blur">
                  <button 
                    onClick={() => setIsPreviewPlaying(!isPreviewPlaying)}
                    className="w-10 h-10 flex items-center justify-center rounded-full bg-white text-black hover:bg-zinc-200 transition-colors"
                  >
                    {isPreviewPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-1" />}
                  </button>
                  <div className="px-4 text-sm text-zinc-400 font-medium">
                    Live Preview
                  </div>
               </div>
            </div>
          ) : (
            <div className="text-center z-10 opacity-50 space-y-2">
              <Play size={48} className="mx-auto text-zinc-600" />
              <p className="text-zinc-500">Add images to start preview</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
