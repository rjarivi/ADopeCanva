/// <reference lib="dom" />
import React, { useState, useRef, useEffect } from 'react';
import { FileUploader } from '../../components/FileUploader';
import { Button } from '../../components/ui/Button';
import { FileData } from '../../types';
import { 
    Crop, RotateCw, RotateCcw, Check, Undo2, Download, Maximize, 
    Square, RectangleHorizontal, RectangleVertical, MousePointer2,
    Instagram, Youtube, Twitter, Facebook, Smartphone,
    ZoomIn, ZoomOut, Move, Hand
} from 'lucide-react';

interface CropArea {
  x: number; // Percentage 0-100
  y: number; // Percentage 0-100
  width: number; // Percentage 0-100
  height: number; // Percentage 0-100
}

type AspectRatio = 'free' | 'custom' | '1:1' | '16:9' | '4:3' | '3:2' | '9:16' | '4:5' | '2:1';

export const ImageCropper: React.FC = () => {
  const [file, setFile] = useState<FileData | null>(null);
  const [rotation, setRotation] = useState(0);
  const [croppedImage, setCroppedImage] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('free');
  
  // Crop state in percentages
  const [crop, setCrop] = useState<CropArea>({ x: 10, y: 10, width: 80, height: 80 });
  
  // Viewport State
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanMode, setIsPanMode] = useState(false);
  const [isSpaceHeld, setIsSpaceHeld] = useState(false);

  const [isDragging, setIsDragging] = useState(false);
  const [dragType, setDragType] = useState<'move' | 'nw' | 'ne' | 'sw' | 'se' | 'pan' | null>(null);
  
  // Custom Dimension Inputs
  const [customW, setCustomW] = useState<number>(0);
  const [customH, setCustomH] = useState<number>(0);
  
  const containerRef = useRef<HTMLDivElement>(null); // The Rotated Wrapper
  const imageRef = useRef<HTMLImageElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  
  // Refs for drag operations
  const startMouseRef = useRef({ x: 0, y: 0 });
  const startPanRef = useRef({ x: 0, y: 0 });
  const startCropRef = useRef<CropArea>({ x: 0, y: 0, width: 0, height: 0 });

  useEffect(() => {
    if (file) {
      setCrop({ x: 10, y: 10, width: 80, height: 80 });
      setRotation(0);
      setAspectRatio('free');
      setZoom(1);
      setPan({ x: 0, y: 0 });
      setIsPanMode(false);
    }
  }, [file]);

  // Handle Spacebar for temporary pan mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.code === 'Space' && !e.repeat) setIsSpaceHeld(true);
    };
    const handleKeyUp = (e: KeyboardEvent) => {
        if (e.code === 'Space') setIsSpaceHeld(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Update pixel inputs when crop changes
  useEffect(() => {
      if (imageRef.current) {
          const naturalWidth = imageRef.current.naturalWidth;
          const naturalHeight = imageRef.current.naturalHeight;
          setCustomW(Math.round((crop.width / 100) * naturalWidth));
          setCustomH(Math.round((crop.height / 100) * naturalHeight));
      }
  }, [crop, file]);

  const applyAspectRatio = (ratioType: AspectRatio) => {
    setAspectRatio(ratioType);
    if (ratioType === 'free' || ratioType === 'custom') return;

    let targetRatio = 1;
    switch(ratioType) {
        case '16:9': targetRatio = 16/9; break;
        case '4:3': targetRatio = 4/3; break;
        case '3:2': targetRatio = 3/2; break;
        case '9:16': targetRatio = 9/16; break;
        case '4:5': targetRatio = 4/5; break;
        case '2:1': targetRatio = 2/1; break;
        case '1:1': default: targetRatio = 1; break;
    }

    if (!imageRef.current) return;
    
    const imgAspect = imageRef.current.naturalWidth / imageRef.current.naturalHeight;
    let newHeight = (crop.width * imgAspect) / targetRatio;
    
    // Clamp
    if (crop.y + newHeight > 100) {
        newHeight = 100 - crop.y;
        const newWidth = (newHeight * targetRatio) / imgAspect;
        setCrop(c => ({ ...c, width: newWidth, height: newHeight }));
    } else {
        setCrop(c => ({ ...c, height: newHeight }));
    }
  };

  const handleCustomDimensionChange = (dim: 'w' | 'h', value: number) => {
      if (!imageRef.current) return;
      const naturalWidth = imageRef.current.naturalWidth;
      const naturalHeight = imageRef.current.naturalHeight;

      if (dim === 'w') {
          setCustomW(value);
          let newWidthPerc = (value / naturalWidth) * 100;
          if (newWidthPerc > 100) newWidthPerc = 100;
          setCrop(c => ({ ...c, width: newWidthPerc }));
      } else {
          setCustomH(value);
          let newHeightPerc = (value / naturalHeight) * 100;
          if (newHeightPerc > 100) newHeightPerc = 100;
          setCrop(c => ({ ...c, height: newHeightPerc }));
      }
      setAspectRatio('custom');
  };

  const handleWheel = (e: React.WheelEvent) => {
      // Prevent default is harder in passive event listeners, 
      // but inside the component wrapper it usually works if focus is there.
      // We rely on the overflow-hidden of the parent to prevent page scroll mostly.
      const delta = -e.deltaY * 0.001;
      setZoom(z => Math.min(Math.max(0.1, z + delta), 5));
  };

  // Rotate a point (dx, dy) around (0,0) by degrees
  const rotatePoint = (dx: number, dy: number, angleDeg: number) => {
    const angleRad = (angleDeg * Math.PI) / 180;
    return {
        x: dx * Math.cos(angleRad) - dy * Math.sin(angleRad),
        y: dx * Math.sin(angleRad) + dy * Math.cos(angleRad)
    };
  };

  const handleMouseDown = (e: React.MouseEvent, type: 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'bg') => {
    e.preventDefault();
    e.stopPropagation();
    
    // Check if we should pan
    const shouldPan = type === 'bg' || isPanMode || isSpaceHeld || e.button === 1; // Middle click

    if (shouldPan) {
        setIsDragging(true);
        setDragType('pan');
        startMouseRef.current = { x: e.clientX, y: e.clientY };
        startPanRef.current = { ...pan };
        return;
    }

    // Otherwise, handle crop drag
    if (!containerRef.current || !imageRef.current) return;
    setIsDragging(true);
    setDragType(type);
    startMouseRef.current = { x: e.clientX, y: e.clientY };
    startCropRef.current = { ...crop };
  };
  
  useEffect(() => {
    const handleGlobalMove = (e: MouseEvent) => {
        if (!isDragging) return;

        // 1. Panning Logic (Screen Space)
        if (dragType === 'pan') {
            const deltaX = e.clientX - startMouseRef.current.x;
            const deltaY = e.clientY - startMouseRef.current.y;
            setPan({
                x: startPanRef.current.x + deltaX,
                y: startPanRef.current.y + deltaY
            });
            return;
        }

        // 2. Cropping Logic (Image Space)
        if (!containerRef.current || !imageRef.current || !dragType) return;

        // Calculate RAW screen delta
        const rawDx = e.clientX - startMouseRef.current.x;
        const rawDy = e.clientY - startMouseRef.current.y;

        // Adjust for Zoom
        const zoomedDx = rawDx / zoom;
        const zoomedDy = rawDy / zoom;

        // Adjust for Rotation (We need to map screen moves to local image moves)
        // If image is rotated 90deg, moving mouse Right (Screen X+) means moving Top (Image Y-)
        const { x: localDxPixels, y: localDyPixels } = rotatePoint(zoomedDx, zoomedDy, -rotation);

        // Convert pixels to Percentages
        // We use the offsetWidth of the container (the rotated wrapper).
        const containerW = containerRef.current.offsetWidth;
        const containerH = containerRef.current.offsetHeight;

        const deltaX = (localDxPixels / containerW) * 100;
        const deltaY = (localDyPixels / containerH) * 100;

        const prev = startCropRef.current;
        const img = imageRef.current;
        const imgAspect = img.naturalWidth / img.naturalHeight;

        // Aspect Ratio Math
        let targetRatio: number | null = null;
        if (aspectRatio !== 'free') {
            if (aspectRatio === 'custom') {
                targetRatio = (prev.width * img.naturalWidth) / (prev.height * img.naturalHeight);
            } else {
                const [rW, rH] = aspectRatio.split(':').map(Number);
                if (rW && rH) targetRatio = rW / rH;
            }
        }

        let newCrop = { ...prev };

        if (dragType === 'move') {
            newCrop.x = Math.min(Math.max(prev.x + deltaX, 0), 100 - prev.width);
            newCrop.y = Math.min(Math.max(prev.y + deltaY, 0), 100 - prev.height);
        } else {
             // Resize with Ratio
             if (targetRatio !== null) {
                const K = imgAspect / targetRatio;
                let w = prev.width;
                let h = prev.height;

                // Simple scaling logic for constrained ratio
                // We use the primary axis of movement to determine scale
                if (dragType === 'se') {
                    // Try to use X delta primarily
                    w = prev.width + deltaX;
                    h = w * K;
                    // Boundary checks
                    if (prev.x + w > 100) { w = 100 - prev.x; h = w * K; }
                    if (prev.y + h > 100) { h = 100 - prev.y; w = h / K; }
                    newCrop.width = w; newCrop.height = h;
                }
                else if (dragType === 'sw') {
                    w = prev.width - deltaX;
                    h = w * K;
                    const rightEdge = prev.x + prev.width;
                    if (w > rightEdge) { w = rightEdge; h = w * K; }
                    if (prev.y + h > 100) { h = 100 - prev.y; w = h / K; }
                    newCrop.width = w; newCrop.height = h;
                    newCrop.x = rightEdge - w;
                }
                else if (dragType === 'ne') {
                    w = prev.width + deltaX;
                    h = w * K;
                    const bottomEdge = prev.y + prev.height;
                    if (prev.x + w > 100) { w = 100 - prev.x; h = w * K; }
                    if (h > bottomEdge) { h = bottomEdge; w = h / K; }
                    newCrop.width = w; newCrop.height = h;
                    newCrop.y = bottomEdge - h;
                }
                else if (dragType === 'nw') {
                    w = prev.width - deltaX;
                    h = w * K;
                    const rightEdge = prev.x + prev.width;
                    const bottomEdge = prev.y + prev.height;
                    if (w > rightEdge) { w = rightEdge; h = w * K; }
                    if (h > bottomEdge) { h = bottomEdge; w = h / K; }
                    newCrop.width = w; newCrop.height = h;
                    newCrop.x = rightEdge - w;
                    newCrop.y = bottomEdge - h;
                }
             } else {
                 // Free Resize
                 if (dragType === 'se') {
                    newCrop.width = Math.max(1, prev.width + deltaX);
                    newCrop.height = Math.max(1, prev.height + deltaY);
                } else if (dragType === 'sw') {
                    newCrop.x = Math.min(prev.x + prev.width - 1, prev.x + deltaX);
                    newCrop.width = Math.max(1, prev.width - deltaX);
                    newCrop.height = Math.max(1, prev.height + deltaY);
                } else if (dragType === 'ne') {
                    newCrop.y = Math.min(prev.y + prev.height - 1, prev.y + deltaY);
                    newCrop.width = Math.max(1, prev.width + deltaX);
                    newCrop.height = Math.max(1, prev.height - deltaY);
                } else if (dragType === 'nw') {
                    newCrop.x = Math.min(prev.x + prev.width - 1, prev.x + deltaX);
                    newCrop.width = Math.max(1, prev.width - deltaX);
                    newCrop.y = Math.min(prev.y + prev.height - 1, prev.y + deltaY);
                    newCrop.height = Math.max(1, prev.height - deltaY);
                }
                
                // Final clamps
                if (newCrop.x < 0) { newCrop.width += newCrop.x; newCrop.x = 0; }
                if (newCrop.y < 0) { newCrop.height += newCrop.y; newCrop.y = 0; }
                if (newCrop.x + newCrop.width > 100) newCrop.width = 100 - newCrop.x;
                if (newCrop.y + newCrop.height > 100) newCrop.height = 100 - newCrop.y;
             }
        }
        setCrop(newCrop);
    };

    const handleGlobalUp = () => {
        setIsDragging(false);
        setDragType(null);
    };

    if (isDragging) {
        window.addEventListener('mousemove', handleGlobalMove);
        window.addEventListener('mouseup', handleGlobalUp);
    }
    return () => {
        window.removeEventListener('mousemove', handleGlobalMove);
        window.removeEventListener('mouseup', handleGlobalUp);
    };
  }, [isDragging, dragType, aspectRatio, zoom, rotation]);


  const handleCropImage = () => {
    if (!imageRef.current) return;
    
    const canvas = document.createElement('canvas');
    const img = imageRef.current;
    const naturalWidth = img.naturalWidth;
    const naturalHeight = img.naturalHeight;

    // Create intermediate canvas to handle rotation
    const tempCanvas = document.createElement('canvas');
    // Calculate rotated bounding box size to avoid clipping
    // For 90 degree increments it swaps W/H
    if (Math.abs(rotation % 180) === 90) {
        tempCanvas.width = naturalHeight;
        tempCanvas.height = naturalWidth;
    } else {
        tempCanvas.width = naturalWidth;
        tempCanvas.height = naturalHeight;
    }

    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    // Draw rotated image onto temp canvas
    tempCtx.translate(tempCanvas.width/2, tempCanvas.height/2);
    tempCtx.rotate(rotation * Math.PI / 180);
    tempCtx.drawImage(img, -naturalWidth/2, -naturalHeight/2);

    // Map crop percentages to rotated dimensions
    const pixelX = (crop.x / 100) * tempCanvas.width;
    const pixelY = (crop.y / 100) * tempCanvas.height;
    const pixelW = (crop.width / 100) * tempCanvas.width;
    const pixelH = (crop.height / 100) * tempCanvas.height;

    canvas.width = pixelW;
    canvas.height = pixelH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(tempCanvas, pixelX, pixelY, pixelW, pixelH, 0, 0, pixelW, pixelH);

    const result = canvas.toDataURL(file?.file.type || 'image/png');
    setCroppedImage(result);
  };

  const handleDownload = () => {
      if (!croppedImage) return;
      const link = document.createElement('a');
      link.href = croppedImage;
      link.download = `cropped-${file?.file.name}`;
      link.click();
  };

  if (!file) {
    return (
      <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400">
            Image Cropper
          </h2>
          <p className="text-zinc-400">Resize, crop, and adjust your images with precision anchors.</p>
        </div>
        <div className="p-8 bg-surface rounded-3xl shadow-xl border border-zinc-800/50">
          <FileUploader 
            onFileSelect={setFile} 
            accept="image/*" 
            label="Upload Image" 
            description="JPG, PNG, WEBP up to 20MB"
          />
        </div>
      </div>
    );
  }

  if (croppedImage) {
      return (
          <div className="max-w-3xl mx-auto text-center space-y-6 animate-fade-in py-12">
              <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/20">
                  <Check size={40} />
              </div>
              <h2 className="text-3xl font-bold text-white">Image Ready!</h2>
              <div className="bg-surface p-2 rounded-2xl border border-zinc-800 inline-block shadow-2xl relative bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')]">
                 <img 
                    src={croppedImage} 
                    alt="Result" 
                    className="max-h-[400px] rounded-xl object-contain relative z-10"
                 />
              </div>
              <div className="flex justify-center gap-4">
                  <Button variant="secondary" onClick={() => setCroppedImage(null)}>
                      <Undo2 size={18} className="mr-2" /> Adjust
                  </Button>
                  <Button onClick={handleDownload}>
                      <Download size={18} className="mr-2" /> Download Image
                  </Button>
              </div>
          </div>
      );
  }

  const isHand = isPanMode || isSpaceHeld;

  // Visual scaling: Calculate inverse scale for UI elements
  // This ensures that as zoom increases, the visual size of handles and borders decreases
  // relative to the image, remaining constant relative to the screen.
  const uiScale = 1 / zoom;
  const borderW = 2 * uiScale;
  const handlePx = 14 * uiScale; // 14px visual handle size

  const handleStyle = (pos: React.CSSProperties): React.CSSProperties => ({
      position: 'absolute',
      width: `${handlePx}px`,
      height: `${handlePx}px`,
      borderWidth: `${2 * uiScale}px`,
      borderColor: 'white',
      borderStyle: 'solid',
      backgroundColor: '#3b82f6', // blue-500
      borderRadius: '9999px',
      transform: 'translate(-50%, -50%)',
      zIndex: 20,
      cursor: isHand ? 'grab' : undefined,
      ...pos
  });

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-200px)] min-h-[700px] grid grid-cols-1 lg:grid-cols-4 gap-6 animate-slide-up">
      
      {/* Editor Canvas */}
      <div 
        ref={viewportRef}
        className={`lg:col-span-3 bg-zinc-950 rounded-3xl border border-zinc-800 relative overflow-hidden flex items-center justify-center p-0 group select-none ${isHand ? 'cursor-grab active:cursor-grabbing' : ''} bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')]`}
        onWheel={handleWheel}
        onMouseDown={(e) => handleMouseDown(e, 'bg')}
      >
          {/* Floating Toolbar */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-zinc-900/90 backdrop-blur border border-zinc-700 p-1.5 rounded-xl shadow-xl">
               <button 
                  onClick={() => setIsPanMode(!isPanMode)}
                  className={`p-2 rounded-lg transition-colors ${isPanMode ? 'bg-blue-500 text-white' : 'text-zinc-400 hover:text-white hover:bg-zinc-800'}`}
                  title="Pan Tool (Spacebar)"
               >
                   <Hand size={18} />
               </button>
               <div className="w-px h-4 bg-zinc-700 mx-1"></div>
               <button onClick={() => setZoom(z => Math.max(0.1, z - 0.2))} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg">
                   <ZoomOut size={18} />
               </button>
               <span className="text-xs font-mono w-12 text-center text-zinc-300">{Math.round(zoom * 100)}%</span>
               <button onClick={() => setZoom(z => Math.min(5, z + 0.2))} className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg">
                   <ZoomIn size={18} />
               </button>
               <div className="w-px h-4 bg-zinc-700 mx-1"></div>
               <button 
                onClick={() => { setZoom(1); setPan({x:0, y:0}); }}
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg" title="Reset View"
               >
                   <Maximize size={18} />
               </button>
          </div>

          {/* 
            TRANSFORM HIERARCHY:
            1. Pan & Zoom (Outer) - Applied to wrapper.
            2. Rotation (Inner) - Applied to content.
          */}
          <div
             className="origin-center transition-transform duration-75 ease-out will-change-transform"
             style={{ 
                 transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` 
             }}
          >
              <div 
                ref={containerRef}
                className="relative shadow-2xl origin-center transition-transform duration-200"
                style={{
                    transform: `rotate(${rotation}deg)`
                }}
              >
                <img 
                    ref={imageRef}
                    src={file.previewUrl} 
                    alt="Crop target" 
                    className="max-w-none max-h-none block object-contain pointer-events-none" 
                    draggable={false}
                />

                {/* Crop Overlay - Inside Rotated Container */}
                <div className="absolute inset-0 bg-black/60">
                    <div 
                        className={`absolute shadow-[0_0_0_9999px_rgba(0,0,0,0.5)] ${isHand ? '' : 'cursor-move'}`}
                        style={{
                            left: `${crop.x}%`,
                            top: `${crop.y}%`,
                            width: `${crop.width}%`,
                            height: `${crop.height}%`,
                            pointerEvents: isHand ? 'none' : 'auto',
                            borderWidth: `${borderW}px`,
                            borderColor: 'white',
                            borderStyle: 'solid',
                        }}
                        onMouseDown={(e) => !isHand && handleMouseDown(e, 'move')}
                    >
                        <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-50">
                            <div className="border-r" style={{borderRightWidth: `${1 * uiScale}px`, borderColor: 'rgba(255,255,255,0.3)'}}></div>
                            <div className="border-r" style={{borderRightWidth: `${1 * uiScale}px`, borderColor: 'rgba(255,255,255,0.3)'}}></div>
                            <div className="border-r border-transparent"></div>
                            <div className="border-t col-span-3 row-start-2" style={{borderTopWidth: `${1 * uiScale}px`, borderColor: 'rgba(255,255,255,0.3)'}}></div>
                            <div className="border-t col-span-3 row-start-3" style={{borderTopWidth: `${1 * uiScale}px`, borderColor: 'rgba(255,255,255,0.3)'}}></div>
                        </div>

                        {!isHand && (
                            <>
                                {/* Corners */}
                                <div 
                                    className="cursor-nw-resize hover:scale-125 transition-transform shadow-sm"
                                    style={handleStyle({ top: '0%', left: '0%' })}
                                    onMouseDown={(e) => handleMouseDown(e, 'nw')}
                                />
                                <div 
                                    className="cursor-ne-resize hover:scale-125 transition-transform shadow-sm"
                                    style={handleStyle({ top: '0%', left: '100%' })}
                                    onMouseDown={(e) => handleMouseDown(e, 'ne')}
                                />
                                <div 
                                    className="cursor-sw-resize hover:scale-125 transition-transform shadow-sm"
                                    style={handleStyle({ top: '100%', left: '0%' })}
                                    onMouseDown={(e) => handleMouseDown(e, 'sw')}
                                />
                                <div 
                                    className="cursor-se-resize hover:scale-125 transition-transform shadow-sm"
                                    style={handleStyle({ top: '100%', left: '100%' })}
                                    onMouseDown={(e) => handleMouseDown(e, 'se')}
                                />
                            </>
                        )}
                    </div>
                </div>
              </div>
          </div>
          
          <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur rounded px-3 py-1 text-xs text-zinc-400 pointer-events-none font-mono">
             Crop: {customW}px x {customH}px | Rot: {rotation}° | Zoom: {Math.round(zoom * 100)}%
          </div>
      </div>

      {/* Sidebar Controls */}
      <div className="lg:col-span-1 bg-surface rounded-3xl border border-zinc-800 p-6 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
          
          {/* Custom Dimensions */}
          <div>
              <h3 className="font-bold text-white mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
                  Custom Size
              </h3>
              <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                      <label className="text-xs text-zinc-500">Width (px)</label>
                      <input 
                          type="number" 
                          value={customW} 
                          onChange={(e) => handleCustomDimensionChange('w', parseInt((e.target as HTMLInputElement).value) || 0)}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                      />
                  </div>
                  <div className="space-y-1">
                      <label className="text-xs text-zinc-500">Height (px)</label>
                      <input 
                          type="number" 
                          value={customH} 
                          onChange={(e) => handleCustomDimensionChange('h', parseInt((e.target as HTMLInputElement).value) || 0)}
                          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                      />
                  </div>
              </div>
          </div>

          <div className="h-px bg-zinc-800"></div>

          {/* Social Presets */}
          <div>
              <h3 className="font-bold text-white mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
                  Social Media
              </h3>
              <div className="grid grid-cols-2 gap-2">
                   <button onClick={() => applyAspectRatio('1:1')} className={`flex items-center gap-2 p-2 rounded-lg text-xs font-medium border transition-all ${aspectRatio === '1:1' ? 'bg-blue-500 border-blue-500 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700'}`}>
                      <Instagram size={14} /> IG Square
                   </button>
                   <button onClick={() => applyAspectRatio('4:5')} className={`flex items-center gap-2 p-2 rounded-lg text-xs font-medium border transition-all ${aspectRatio === '4:5' ? 'bg-blue-500 border-blue-500 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700'}`}>
                      <Instagram size={14} /> IG Portrait
                   </button>
                   <button onClick={() => applyAspectRatio('9:16')} className={`flex items-center gap-2 p-2 rounded-lg text-xs font-medium border transition-all ${aspectRatio === '9:16' ? 'bg-blue-500 border-blue-500 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700'}`}>
                      <Smartphone size={14} /> IG Story
                   </button>
                   <button onClick={() => applyAspectRatio('16:9')} className={`flex items-center gap-2 p-2 rounded-lg text-xs font-medium border transition-all ${aspectRatio === '16:9' ? 'bg-blue-500 border-blue-500 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700'}`}>
                      <Youtube size={14} /> YouTube
                   </button>
                   <button onClick={() => applyAspectRatio('2:1')} className={`flex items-center gap-2 p-2 rounded-lg text-xs font-medium border transition-all ${aspectRatio === '2:1' ? 'bg-blue-500 border-blue-500 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700'}`}>
                      <Twitter size={14} /> Post
                   </button>
                   <button onClick={() => applyAspectRatio('3:2')} className={`flex items-center gap-2 p-2 rounded-lg text-xs font-medium border transition-all ${aspectRatio === '3:2' ? 'bg-blue-500 border-blue-500 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700'}`}>
                      <Facebook size={14} /> Shared Img
                   </button>
              </div>
          </div>

          <div className="h-px bg-zinc-800"></div>

          {/* Standard Ratios */}
          <div>
              <h3 className="font-bold text-white mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
                  Standard Ratios
              </h3>
              <div className="grid grid-cols-3 gap-2">
                  <button 
                    onClick={() => applyAspectRatio('free')}
                    className={`p-2 rounded-lg text-xs font-medium border flex flex-col items-center gap-1 transition-all ${aspectRatio === 'free' ? 'bg-blue-500 border-blue-500 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700'}`}
                  >
                      <MousePointer2 size={16} /> Free
                  </button>
                  <button 
                    onClick={() => applyAspectRatio('4:3')}
                    className={`p-2 rounded-lg text-xs font-medium border flex flex-col items-center gap-1 transition-all ${aspectRatio === '4:3' ? 'bg-blue-500 border-blue-500 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700'}`}
                  >
                      <RectangleHorizontal size={16} className="scale-y-125" /> 4:3
                  </button>
                  <button 
                    onClick={() => applyAspectRatio('3:2')}
                    className={`p-2 rounded-lg text-xs font-medium border flex flex-col items-center gap-1 transition-all ${aspectRatio === '3:2' ? 'bg-blue-500 border-blue-500 text-white' : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:bg-zinc-700'}`}
                  >
                      <RectangleVertical size={16} className="rotate-90" /> 3:2
                  </button>
              </div>
          </div>

          <div className="mt-auto flex flex-col gap-3">
              <div>
                  <label className="text-xs text-zinc-500 mb-1 block">Rotation</label>
                  <div className="flex gap-2">
                      <Button size="sm" variant="secondary" className="flex-1" onClick={() => setRotation(r => r - 90)}>
                          <RotateCcw size={16} />
                      </Button>
                      <Button size="sm" variant="secondary" className="flex-1" onClick={() => setRotation(r => r + 90)}>
                          <RotateCw size={16} />
                      </Button>
                  </div>
              </div>
              <Button onClick={handleCropImage} className="bg-blue-500 hover:bg-blue-600 border-none shadow-lg shadow-blue-500/20 h-12">
                  <Crop size={18} className="mr-2" /> Apply Crop
              </Button>
              <Button variant="ghost" onClick={() => setFile(null)} className="text-zinc-500">Cancel</Button>
          </div>
      </div>
    </div>
  );
};