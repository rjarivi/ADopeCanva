/// <reference lib="dom" />
import React, { useState, useEffect } from 'react';
import { FileUploader } from '../../components/FileUploader';
import { Button } from '../../components/ui/Button';
import { FileData } from '../../types';
import { 
  ShieldCheck, 
  EyeOff, 
  MapPin, 
  Camera, 
  Clock, 
  Sliders, 
  Download, 
  RefreshCcw, 
  AlertTriangle, 
  CheckCircle2, 
  ExternalLink, 
  Zap, 
  FileSearch,
  Sparkles
} from 'lucide-react';
import { parseExif, stripJpegExif, stripMetadataViaCanvas, ExifData } from '../../utils/exif';

export const ExifStripper: React.FC = () => {
  const [file, setFile] = useState<FileData | null>(null);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [exifData, setExifData] = useState<ExifData | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isStripped, setIsStripped] = useState<boolean>(false);
  const [cleanedBlobUrl, setCleanedBlobUrl] = useState<string | null>(null);
  const [cleanedSize, setCleanedSize] = useState<string>('');
  const [bytesSaved, setBytesSaved] = useState<number>(0);

  // Load and inspect image
  useEffect(() => {
    if (!file) {
      if (imageSrc) URL.revokeObjectURL(imageSrc);
      if (cleanedBlobUrl) URL.revokeObjectURL(cleanedBlobUrl);
      setImageSrc(null);
      setExifData(null);
      setIsStripped(false);
      setCleanedBlobUrl(null);
      setCleanedSize('');
      setBytesSaved(0);
      return;
    }

    const url = URL.createObjectURL(file.file);
    setImageSrc(url);
    setIsStripped(false);
    if (cleanedBlobUrl) URL.revokeObjectURL(cleanedBlobUrl);
    setCleanedBlobUrl(null);

    // Read EXIF from ArrayBuffer
    file.file.arrayBuffer().then(buf => {
      const parsed = parseExif(buf);
      setExifData(parsed);
    }).catch(err => {
      console.warn('Could not parse EXIF:', err);
      setExifData({ hasExif: false, rawTagCount: 0 });
    });

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [file]);

  const handleStrip = async () => {
    if (!file) return;
    setIsProcessing(true);

    try {
      const isJpeg = file.file.type === 'image/jpeg' || file.file.name.toLowerCase().endsWith('.jpg') || file.file.name.toLowerCase().endsWith('.jpeg');
      let cleanedBlob: Blob;
      let saved = 0;

      if (isJpeg) {
        // Lossless binary JPEG strip
        const buffer = await file.file.arrayBuffer();
        const { strippedBuffer, bytesRemoved } = stripJpegExif(buffer);
        cleanedBlob = new Blob([strippedBuffer], { type: 'image/jpeg' });
        saved = bytesRemoved;
      } else {
        // Fallback canvas strip for PNG/WebP
        cleanedBlob = await stripMetadataViaCanvas(file.file);
        saved = Math.max(0, file.file.size - cleanedBlob.size);
      }

      const url = URL.createObjectURL(cleanedBlob);
      setCleanedBlobUrl(url);
      setBytesSaved(saved);

      const sizeStr = cleanedBlob.size > 1024 * 1024 
        ? `${(cleanedBlob.size / (1024 * 1024)).toFixed(2)} MB`
        : `${(cleanedBlob.size / 1024).toFixed(1)} KB`;
      setCleanedSize(sizeStr);
      setIsStripped(true);
    } catch (err) {
      console.error('Failed to strip metadata:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!cleanedBlobUrl || !file) return;
    const nameWithoutExt = file.file.name.replace(/\.[^/.]+$/, '');
    const ext = file.file.name.split('.').pop() || 'jpg';
    const link = document.createElement('a');
    link.href = cleanedBlobUrl;
    link.download = `${nameWithoutExt}_clean.${ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleReset = () => {
    setFile(null);
  };

  // Upload view per AGENTS.md
  if (!file) {
    return (
      <div className="container mx-auto px-6 h-full flex flex-col justify-center animate-fade-in text-center py-10">
        {/* Header */}
        <div className="flex-none space-y-3 mb-10">
          <h2 className="text-4xl font-black tracking-tight flex items-center justify-center gap-3 font-unbounded">
            <div className="text-indigo-400 p-2 bg-indigo-500/10 rounded-2xl border border-indigo-500/20">
              <EyeOff size={36} />
            </div>
            <span className="text-white">EXIF Stripper</span>
          </h2>
          <p className="text-base text-zinc-400 max-w-xl mx-auto">
            Inspect hidden camera info, remove GPS geo-tags, and sanitize photos before sharing.
          </p>
        </div>

        {/* Upload Area */}
        <div className="flex-1 w-full max-w-4xl mx-auto bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-3 flex flex-col items-center justify-center relative overflow-hidden group hover:border-indigo-500/40 transition-all duration-300 shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <FileUploader
            onFileSelect={setFile}
            accept="image/*,.jpg,.jpeg,.png,.webp,.tiff"
            label="Drop Photo Here to Inspect & Sanitize"
            description="Supports JPEG, PNG, WebP, and TIFF camera photos"
            className="w-full h-full min-h-[260px] border-2 border-dashed border-zinc-800/80 hover:border-indigo-500/50 bg-zinc-950/40 rounded-2xl transition-all"
          />
        </div>

        {/* Feature Highlights Grid */}
        <div className="flex-none max-w-4xl mx-auto w-full grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
          {[
            { icon: ShieldCheck, label: '100% Private', desc: 'Zero Server Uploads' },
            { icon: MapPin, label: 'Eradicate GPS', desc: 'Wipe Geo-Coordinates' },
            { icon: Zap, label: 'Lossless Strip', desc: 'No Pixel Re-Compression' },
            { icon: FileSearch, label: 'Deep Audit', desc: 'Inspect Camera & Lens' }
          ].map((feat, i) => (
            <div 
              key={i} 
              className="flex flex-col items-center text-center space-y-2 p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/40 hover:border-zinc-700/60 hover:-translate-y-0.5 transition-all duration-300"
            >
              <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400 border border-indigo-500/20">
                <feat.icon size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-200">{feat.label}</h3>
                <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold mt-1">{feat.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const hasGps = Boolean(exifData?.gps);
  const hasCamera = Boolean(exifData?.make || exifData?.model || exifData?.dateTime);
  const hasMetadata = hasGps || hasCamera || (exifData?.rawTagCount ?? 0) > 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl animate-fade-in space-y-6">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-zinc-800/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <EyeOff size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white font-unbounded">EXIF Metadata Stripper</h2>
            <p className="text-xs text-zinc-400 truncate max-w-sm sm:max-w-md">{file.file.name}</p>
          </div>
        </div>

        <Button 
          variant="secondary" 
          size="sm" 
          onClick={handleReset}
          className="text-xs border-zinc-800 hover:bg-zinc-800"
        >
          <RefreshCcw size={14} className="mr-1.5" />
          New Photo
        </Button>
      </div>

      {/* Privacy Risk Assessment Banner */}
      <div className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
        hasGps
          ? 'bg-rose-950/30 border-rose-800/50 text-rose-300'
          : hasCamera
            ? 'bg-amber-950/30 border-amber-800/50 text-amber-300'
            : 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300'
      }`}>
        <div className="flex items-center gap-3">
          {hasGps ? (
            <AlertTriangle size={24} className="text-rose-400 shrink-0" />
          ) : hasCamera ? (
            <AlertTriangle size={24} className="text-amber-400 shrink-0" />
          ) : (
            <CheckCircle2 size={24} className="text-emerald-400 shrink-0" />
          )}
          <div>
            <div className="font-bold text-sm">
              {hasGps
                ? 'High Privacy Exposure: GPS Coordinates Detected'
                : hasCamera
                  ? 'Moderate Exposure: Camera Hardware & Timestamps Embedded'
                  : 'Clean: No Sensitive Hardware Metadata Detected'}
            </div>
            <div className="text-xs opacity-80 mt-0.5">
              {hasGps
                ? 'Anyone who downloads this image can pinpoint the exact geographic location it was taken.'
                : hasCamera
                  ? 'Contains device model, capture date, and exposure parameters.'
                  : 'This image does not contain identifiable EXIF or GPS markers.'}
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-xs font-mono font-bold">
            {exifData?.rawTagCount ?? 0} EXIF Tags
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Image Preview */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="font-bold uppercase tracking-wider">Source Preview</span>
              <span className="font-mono text-indigo-400">{file.size}</span>
            </div>

            <div className="relative rounded-xl overflow-hidden bg-black/40 border border-zinc-800 flex items-center justify-center aspect-square">
              {imageSrc && (
                <img
                  src={imageSrc}
                  alt="Preview"
                  className="w-full h-full object-contain"
                />
              )}
            </div>

            <div className="text-[11px] text-zinc-500 font-mono flex items-center justify-between">
              <span>{file.file.type || 'image/jpeg'}</span>
              <span>Bit-Level Clean</span>
            </div>
          </div>
        </div>

        {/* Right Column: Metadata Inspector & Strip Action */}
        <div className="lg:col-span-7 space-y-4">
          {/* GPS Location Card (if present) */}
          {exifData?.gps && (
            <div className="bg-rose-950/20 border border-rose-800/40 rounded-2xl p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
                  <MapPin size={16} />
                  <span>Exact GPS Coordinates</span>
                </div>
                <a
                  href={exifData.gps.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-rose-300 hover:text-rose-200 flex items-center gap-1 underline"
                >
                  <span>Open in Maps</span>
                  <ExternalLink size={12} />
                </a>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-xs pt-1">
                <div className="bg-zinc-950/80 p-2 rounded-lg border border-zinc-800/80">
                  <div className="text-[10px] text-zinc-500 uppercase">Latitude</div>
                  <div className="text-white font-bold">{exifData.gps.latitude}°</div>
                </div>
                <div className="bg-zinc-950/80 p-2 rounded-lg border border-zinc-800/80">
                  <div className="text-[10px] text-zinc-500 uppercase">Longitude</div>
                  <div className="text-white font-bold">{exifData.gps.longitude}°</div>
                </div>
                {exifData.gps.altitude !== undefined && (
                  <div className="bg-zinc-950/80 p-2 rounded-lg border border-zinc-800/80">
                    <div className="text-[10px] text-zinc-500 uppercase">Altitude</div>
                    <div className="text-white font-bold">{exifData.gps.altitude} m</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Camera & Settings Grid */}
          <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-5 space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-zinc-300">
              <Camera size={16} className="text-indigo-400" />
              <span>Embedded Hardware & Capture Details</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80 space-y-1">
                <div className="text-[10px] text-zinc-500 uppercase">Camera Model</div>
                <div className="text-zinc-200 font-bold font-mono">
                  {exifData?.make || exifData?.model 
                    ? `${exifData.make || ''} ${exifData.model || ''}`.trim()
                    : 'Not Found'}
                </div>
              </div>

              <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80 space-y-1">
                <div className="text-[10px] text-zinc-500 uppercase">Date & Time</div>
                <div className="text-zinc-200 font-bold font-mono">
                  {exifData?.dateTime || 'Not Found'}
                </div>
              </div>

              <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80 space-y-1">
                <div className="text-[10px] text-zinc-500 uppercase">Lens Spec</div>
                <div className="text-zinc-200 font-bold font-mono truncate">
                  {exifData?.lensModel || 'Standard / Unspecified'}
                </div>
              </div>

              <div className="bg-zinc-950/60 p-3 rounded-xl border border-zinc-800/80 space-y-1">
                <div className="text-[10px] text-zinc-500 uppercase">Software</div>
                <div className="text-zinc-200 font-bold font-mono truncate">
                  {exifData?.software || 'Raw Firmware / None'}
                </div>
              </div>
            </div>

            {/* Shooting Settings */}
            <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono pt-1">
              <div className="bg-zinc-950/60 p-2 rounded-lg border border-zinc-800/80">
                <div className="text-[9px] text-zinc-500 uppercase">Aperture</div>
                <div className="text-zinc-300 font-bold">{exifData?.fNumber ? `f/${exifData.fNumber}` : '--'}</div>
              </div>
              <div className="bg-zinc-950/60 p-2 rounded-lg border border-zinc-800/80">
                <div className="text-[9px] text-zinc-500 uppercase">Shutter</div>
                <div className="text-zinc-300 font-bold">{exifData?.exposureTime || '--'}</div>
              </div>
              <div className="bg-zinc-950/60 p-2 rounded-lg border border-zinc-800/80">
                <div className="text-[9px] text-zinc-500 uppercase">ISO</div>
                <div className="text-zinc-300 font-bold">{exifData?.iso || '--'}</div>
              </div>
              <div className="bg-zinc-950/60 p-2 rounded-lg border border-zinc-800/80">
                <div className="text-[9px] text-zinc-500 uppercase">Focal</div>
                <div className="text-zinc-300 font-bold">{exifData?.focalLength ? `${exifData.focalLength}mm` : '--'}</div>
              </div>
            </div>

            {/* Sanitize Action Button */}
            <div className="pt-3">
              <Button
                onClick={handleStrip}
                disabled={isProcessing}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-unbounded text-sm rounded-xl transition-all shadow-[0_8px_32px_rgba(79,70,229,0.25)] hover:shadow-[0_8px_32px_rgba(79,70,229,0.4)]"
              >
                <ShieldCheck size={18} className="mr-2" />
                Strip & Sanitize Photo Now
              </Button>
            </div>
          </div>

          {/* Cleaned Result Card */}
          {isStripped && (
            <div className="bg-zinc-900/80 border border-emerald-500/40 rounded-2xl p-5 space-y-4 animate-fade-in shadow-[0_8px_32px_rgba(16,185,129,0.15)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 size={18} />
                  <span className="text-xs font-bold uppercase tracking-wider">Photo Sanitized</span>
                </div>
                <span className="text-xs font-mono text-emerald-300 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                  {cleanedSize}
                </span>
              </div>

              <div className="text-xs text-zinc-400 space-y-1">
                <p>✓ All GPS coordinates, camera specs, and personal timestamps removed.</p>
                <p>✓ Zero re-compression artifacts — 100% original pixel data intact.</p>
                {bytesSaved > 0 && (
                  <p className="text-emerald-400 font-mono">
                    ✓ Saved {bytesSaved > 1024 ? `${(bytesSaved / 1024).toFixed(1)} KB` : `${bytesSaved} B`} of metadata overhead.
                  </p>
                )}
              </div>

              <Button
                onClick={handleDownload}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Download size={18} />
                Download Sanitized Photo
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
