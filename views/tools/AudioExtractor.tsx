/// <reference lib="dom" />
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../../components/ui/Button';
import { FileData } from '../../types';
import { ToolShell } from '../../components/ToolShell';
import { useToolFile } from '../../hooks/useToolFile';
import { 
  FileAudio, 
  Download, 
  Zap, 
  ShieldCheck, 
  Sliders, 
  Music, 
  Loader2, 
  CheckCircle2, 
  RefreshCcw, 
  Clock, 
  Volume2, 
  AlertCircle,
  Play,
  Pause,
  Scissors
} from 'lucide-react';
import { getFFmpeg, writeFileToFFmpeg } from '../../utils/ffmpeg';
import { FFmpeg } from '@ffmpeg/ffmpeg';

interface FormatOption {
  format: string;
  ext: string;
  mime: string;
  hasBitrate: boolean;
  desc: string;
}

const FORMAT_OPTIONS: FormatOption[] = [
  { format: 'MP3', ext: 'mp3', mime: 'audio/mpeg', hasBitrate: true, desc: 'Universal audio, high compatibility' },
  { format: 'WAV', ext: 'wav', mime: 'audio/wav', hasBitrate: false, desc: 'Uncompressed, studio quality' },
  { format: 'AAC', ext: 'aac', mime: 'audio/aac', hasBitrate: true, desc: 'High efficiency, Apple & mobile optimized' },
  { format: 'M4A', ext: 'm4a', mime: 'audio/mp4', hasBitrate: true, desc: 'Modern AAC container' },
  { format: 'FLAC', ext: 'flac', mime: 'audio/flac', hasBitrate: false, desc: 'Lossless compression' },
  { format: 'OGG', ext: 'ogg', mime: 'audio/ogg', hasBitrate: true, desc: 'Open format, web & game ready' },
];

const BITRATES = [
  { label: '320 kbps', value: '320k', badge: 'Ultra' },
  { label: '192 kbps', value: '192k', badge: 'Standard' },
  { label: '128 kbps', value: '128k', badge: 'Voice' },
  { label: '96 kbps', value: '96k', badge: 'Compact' }
];

export const AudioExtractor: React.FC = () => {
  const { file, select, clear } = useToolFile();
  // Memoized video src: FileUploader usually provides previewUrl, but when
  // it doesn't, creating the URL inline in render would leak one per render.
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  useEffect(() => {
    if (file?.previewUrl) { setVideoSrc(file.previewUrl); return; }
    if (!file) { setVideoSrc(null); return; }
    const url = URL.createObjectURL(file.file);
    setVideoSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const [videoDuration, setVideoDuration] = useState<number>(0);
  const [selectedFormat, setSelectedFormat] = useState<string>('MP3');
  const [selectedBitrate, setSelectedBitrate] = useState<string>('192k');
  const [channels, setChannels] = useState<'stereo' | 'mono'>('stereo');
  
  // Trimming
  const [isTrimMode, setIsTrimMode] = useState<boolean>(false);
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);

  // Processing state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const [outputSize, setOutputSize] = useState<string>('');
  const [engineStatus, setEngineStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const ffmpegRef = useRef<FFmpeg | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioPreviewRef = useRef<HTMLAudioElement | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);

  // Initialize FFmpeg WASM
  useEffect(() => {
    let mounted = true;
    getFFmpeg()
      .then(ff => {
        if (mounted) {
          ffmpegRef.current = ff;
          setEngineStatus('ready');
        }
      })
      .catch(err => {
        if (mounted) {
          console.error('Failed to load FFmpeg engine for Audio Extractor:', err);
          setErrorMessage(err instanceof Error ? err.message : 'Failed to initialize audio engine');
          setEngineStatus('error');
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Cleanup object URLs on unmount or file reset
  useEffect(() => {
    return () => {
      if (outputUrl) {
        URL.revokeObjectURL(outputUrl);
      }
    };
  }, [outputUrl]);

  const handleVideoLoadedMetadata = () => {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      setVideoDuration(dur);
      setEndTime(Math.floor(dur));
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleExtract = async () => {
    if (!file || !ffmpegRef.current) return;

    setIsProcessing(true);
    setProgress(0);
    setStatusMessage('Preparing video for audio extraction...');
    if (outputUrl) {
      URL.revokeObjectURL(outputUrl);
      setOutputUrl(null);
    }

    const ffmpeg = ffmpegRef.current;
    const ext = file.file.name.split('.').pop()?.toLowerCase() || 'mp4';
    const inputName = `input_${Date.now()}.${ext}`;
    const targetConfig = FORMAT_OPTIONS.find(f => f.format === selectedFormat) || FORMAT_OPTIONS[0];
    const outputName = `output_${Date.now()}.${targetConfig.ext}`;

    const onProgress = ({ progress: prog }: { progress: number }) => {
      setProgress(Math.min(99, Math.max(0, Math.round(prog * 100))));
      setStatusMessage('Extracting audio track...');
    };

    try {
      ffmpeg.on('progress', onProgress);

      setStatusMessage('Reading input video...');
      await writeFileToFFmpeg(ffmpeg, inputName, file.file);

      const threads = typeof navigator !== 'undefined' && navigator.hardwareConcurrency
        ? Math.min(navigator.hardwareConcurrency, 4).toString()
        : '2';

      const args: string[] = ['-y'];

      // Seek / trim if trim mode is enabled
      if (isTrimMode && (startTime > 0 || (endTime > 0 && endTime < videoDuration))) {
        args.push('-ss', startTime.toString());
        if (endTime > startTime) {
          args.push('-to', endTime.toString());
        }
      }

      args.push('-i', inputName, '-threads', threads);

      // Strip video stream completely
      args.push('-vn');

      // Audio Channel configuration
      if (channels === 'mono') {
        args.push('-ac', '1');
      } else {
        args.push('-ac', '2');
      }

      // Format & Codec mapping
      switch (targetConfig.format) {
        case 'MP3':
          args.push('-c:a', 'libmp3lame', '-b:a', selectedBitrate);
          break;
        case 'AAC':
          args.push('-c:a', 'aac', '-b:a', selectedBitrate);
          break;
        case 'M4A':
          args.push('-c:a', 'aac', '-b:a', selectedBitrate);
          break;
        case 'OGG':
          args.push('-c:a', 'libvorbis', '-b:a', selectedBitrate);
          break;
        case 'FLAC':
          args.push('-c:a', 'flac');
          break;
        case 'WAV':
          args.push('-c:a', 'pcm_s16le');
          break;
      }

      args.push(outputName);

      setStatusMessage('Converting audio format...');
      const exitCode = await ffmpeg.exec(args);

      if (exitCode !== 0) {
        throw new Error(`FFmpeg exited with error code ${exitCode}`);
      }

      setStatusMessage('Finalizing audio file...');
      const data = await ffmpeg.readFile(outputName);
      const audioBlob = new Blob([data as any], { type: targetConfig.mime });
      const url = URL.createObjectURL(audioBlob);

      // Calculate human readable size
      const bytes = audioBlob.size;
      const sizeStr = bytes > 1024 * 1024 
        ? `${(bytes / (1024 * 1024)).toFixed(2)} MB`
        : `${(bytes / 1024).toFixed(1)} KB`;

      setOutputUrl(url);
      setOutputSize(sizeStr);
      setProgress(100);
      setStatusMessage('Audio extracted successfully!');

      // Virtual file cleanup
      try {
        await ffmpeg.deleteFile(inputName);
        await ffmpeg.deleteFile(outputName);
      } catch (cleanErr) {
        console.warn('Could not clean up temporary FFmpeg virtual files:', cleanErr);
      }
    } catch (err) {
      console.error('Audio extraction error:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Audio extraction failed');
    } finally {
      ffmpeg.off('progress', onProgress);
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!outputUrl || !file) return;
    const baseName = file.file.name.replace(/\.[^/.]+$/, '');
    const targetConfig = FORMAT_OPTIONS.find(f => f.format === selectedFormat) || FORMAT_OPTIONS[0];
    const link = document.createElement('a');
    link.href = outputUrl;
    link.download = `${baseName}_audio.${targetConfig.ext}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileSelect = (f: FileData | FileData[]) => {
    const selected = Array.isArray(f) ? f[0] : f;
    if (!selected) return;
    select(selected);
  };

  const handleReset = () => {
    if (outputUrl) {
      URL.revokeObjectURL(outputUrl);
    }
    clear();
    setOutputUrl(null);
    setOutputSize('');
    setProgress(0);
    setStatusMessage('');
    setIsTrimMode(false);
    setStartTime(0);
    setEndTime(0);
    setVideoDuration(0);
    setIsPlayingAudio(false);
  };

  const togglePlayAudio = () => {
    if (!audioPreviewRef.current) return;
    if (isPlayingAudio) {
      audioPreviewRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioPreviewRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  // Engine loading state
  if (engineStatus === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-4 animate-fade-in text-center min-h-[400px]">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
          <FileAudio className="absolute inset-0 m-auto text-indigo-400" size={20} />
        </div>
        <h3 className="text-xl font-bold text-white font-unbounded">Loading Audio Engine</h3>
        <p className="text-sm text-zinc-400 max-w-sm">
          Preparing high-speed on-device audio processor. No files leave your browser.
        </p>
      </div>
    );
  }

  // Engine error state
  if (engineStatus === 'error') {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4 animate-fade-in text-center min-h-[400px]">
        <AlertCircle size={36} className="text-red-500" />
        <h3 className="text-xl font-bold text-white font-unbounded">Engine Failed</h3>
        <p className="text-zinc-400 text-sm max-w-md">
          Unable to initialize WebAssembly audio engine. Please verify WebAssembly is supported in your browser.
        </p>
        {errorMessage && (
          <div className="p-3 bg-red-950/40 border border-red-800/40 rounded-xl text-red-300 text-xs font-mono max-w-lg">
            {errorMessage}
          </div>
        )}
        <Button onClick={() => window.location.reload()} variant="secondary">Reload</Button>
      </div>
    );
  }

  // Upload state (per AGENTS.md specs)
  if (!file) {
    return (
      <ToolShell
        icon={FileAudio}
        title="Audio Extractor"
        description="Extract crystal-clear sound, music, and voice tracks from any video file in seconds."
        features={[
          { icon: Zap, label: 'Instant Extraction', desc: 'No Cloud Uploads' },
          { icon: ShieldCheck, label: '100% Private', desc: 'Processed In-Browser' },
          { icon: Sliders, label: 'Studio Fidelity', desc: 'Up to 320kbps MP3' },
          { icon: Music, label: 'All Formats', desc: 'MP3, WAV, AAC, FLAC' },
        ]}
        file={file}
        accept="video/*,.mp4,.mov,.mkv,.webm,.avi,.flv,.wmv"
        uploadLabel="Drop Video File Here"
        uploadDescription="Supports MP4, MOV, MKV, WebM, AVI, and other major video formats"
        onFileSelect={handleFileSelect}
      >
        <></>
      </ToolShell>
    );
  }

  // Active Editor View
  const targetConfig = FORMAT_OPTIONS.find(f => f.format === selectedFormat) || FORMAT_OPTIONS[0];

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl animate-fade-in space-y-6">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-zinc-800/60 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl border border-indigo-500/20">
            <FileAudio size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white font-unbounded">Audio Extractor</h2>
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
          New File
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Video Preview & Playback */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-4 space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
              <span>Source Video</span>
              <span className="text-indigo-400 font-mono text-[11px]">{file.size}</span>
            </div>

            <div className="relative aspect-video rounded-xl overflow-hidden bg-black border border-zinc-800 flex items-center justify-center">
              <video
                ref={videoRef}
                src={videoSrc ?? undefined}
                controls
                className="w-full h-full object-contain"
                onLoadedMetadata={handleVideoLoadedMetadata}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-500 pt-1">
              <div className="flex items-center gap-1.5">
                <Clock size={13} className="text-zinc-400" />
                <span>Duration: {videoDuration > 0 ? formatSeconds(videoDuration) : '--:--'}</span>
              </div>
              <span className="uppercase text-[10px] tracking-wider px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
                {file.file.type.split('/')[1] || 'Video'}
              </span>
            </div>
          </div>

          {/* Quick Trimming Section */}
          <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Scissors size={15} className="text-indigo-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">Extract Segment</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isTrimMode} 
                  onChange={(e) => setIsTrimMode(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
              </label>
            </div>

            {isTrimMode ? (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="space-y-1">
                  <label className="text-[11px] text-zinc-400 flex items-center justify-between">
                    <span>Start (sec)</span>
                    <button 
                      type="button"
                      onClick={() => {
                        if (videoRef.current) setStartTime(Math.floor(videoRef.current.currentTime));
                      }}
                      className="text-[10px] text-indigo-400 hover:underline"
                    >
                      Use Current
                    </button>
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={endTime || videoDuration}
                    value={startTime}
                    onChange={(e) => setStartTime(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-zinc-500 font-mono">{formatSeconds(startTime)}</p>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] text-zinc-400 flex items-center justify-between">
                    <span>End (sec)</span>
                    <button 
                      type="button"
                      onClick={() => {
                        if (videoRef.current) setEndTime(Math.floor(videoRef.current.currentTime));
                      }}
                      className="text-[10px] text-indigo-400 hover:underline"
                    >
                      Use Current
                    </button>
                  </label>
                  <input
                    type="number"
                    min={startTime}
                    max={Math.floor(videoDuration) || 9999}
                    value={endTime}
                    onChange={(e) => setEndTime(Math.max(startTime, parseInt(e.target.value) || 0))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-indigo-500 focus:outline-none"
                  />
                  <p className="text-[10px] text-zinc-500 font-mono">{formatSeconds(endTime)}</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-500">
                Extracts the complete audio track from beginning to end. Toggle above to extract a specific portion.
              </p>
            )}
          </div>
        </div>

        {/* Right Column: Extraction Settings & Action */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-zinc-900/60 border border-zinc-800/60 rounded-2xl p-5 space-y-5">
            {/* Format Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                Target Audio Format
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {FORMAT_OPTIONS.map((fmt) => (
                  <button
                    key={fmt.format}
                    type="button"
                    onClick={() => setSelectedFormat(fmt.format)}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all ${
                      selectedFormat === fmt.format
                        ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-[0_0_15px_rgba(79,70,229,0.3)]'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    {fmt.format}
                  </button>
                ))}
              </div>
              <p className="text-xs text-zinc-400">{targetConfig.desc}</p>
            </div>

            {/* Bitrate Selector (if format supports bitrate) */}
            {targetConfig.hasBitrate && (
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Audio Quality & Bitrate
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {BITRATES.map((br) => (
                    <button
                      key={br.value}
                      type="button"
                      onClick={() => setSelectedBitrate(br.value)}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        selectedBitrate === br.value
                          ? 'bg-indigo-600/20 border-indigo-500 text-white'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">{br.label}</span>
                        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-mono">
                          {br.badge}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Channel Options */}
            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                Audio Channels
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setChannels('stereo')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    channels === 'stereo'
                      ? 'bg-indigo-600/20 border-indigo-500 text-white'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="text-xs font-bold">Stereo (2 Channels)</div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">Standard music & immersive audio</div>
                </button>
                <button
                  type="button"
                  onClick={() => setChannels('mono')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    channels === 'mono'
                      ? 'bg-indigo-600/20 border-indigo-500 text-white'
                      : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <div className="text-xs font-bold">Mono (1 Channel)</div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">Optimized for speech, podcasts & smaller files</div>
                </button>
              </div>
            </div>

            {/* Extraction Action CTA */}
            <div className="pt-2">
              <Button
                onClick={handleExtract}
                disabled={isProcessing}
                className="w-full py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-unbounded text-sm rounded-xl transition-all shadow-[0_8px_32px_rgba(79,70,229,0.25)] hover:shadow-[0_8px_32px_rgba(79,70,229,0.4)] disabled:opacity-50"
              >
                {isProcessing ? (
                  <span className="flex items-center justify-center gap-2">
                    <Loader2 size={18} className="animate-spin" />
                    Extracting Audio... {progress}%
                  </span>
                ) : (
                  <span className="flex items-center justify-center gap-2">
                    <Volume2 size={18} />
                    Extract to {selectedFormat}
                  </span>
                )}
              </Button>
            </div>

            {/* Processing Progress Bar */}
            {isProcessing && (
              <div className="space-y-2 pt-2 animate-fade-in">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>{statusMessage}</span>
                  <span className="font-mono text-indigo-400">{progress}%</span>
                </div>
                <div className="w-full h-2 bg-zinc-950 rounded-full overflow-hidden border border-zinc-800">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all duration-200"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Results Card */}
          {outputUrl && (
            <div className="bg-zinc-900/80 border border-indigo-500/40 rounded-2xl p-5 space-y-4 animate-fade-in shadow-[0_8px_32px_rgba(79,70,229,0.15)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 size={18} />
                  <span className="text-xs font-bold uppercase tracking-wider">Audio Extracted</span>
                </div>
                <span className="text-xs font-mono text-indigo-300 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20">
                  {outputSize}
                </span>
              </div>

              {/* Native Audio Preview */}
              <div className="bg-zinc-950 p-3 rounded-xl border border-zinc-800 flex items-center gap-3">
                <button
                  type="button"
                  onClick={togglePlayAudio}
                  className="w-10 h-10 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition-colors shadow-[0_0_15px_rgba(79,70,229,0.4)] shrink-0"
                >
                  {isPlayingAudio ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
                </button>

                <audio
                  ref={audioPreviewRef}
                  src={outputUrl}
                  onEnded={() => setIsPlayingAudio(false)}
                  className="w-full h-9"
                  controls
                />
              </div>

              {/* Download Action */}
              <Button
                onClick={handleDownload}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Download size={18} />
                Download {selectedFormat} Audio
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
