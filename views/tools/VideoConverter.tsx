/// <reference lib="dom" />
import React, { useState, useEffect, useRef } from 'react';
import { FileUploader } from '../../components/FileUploader';
import { Button } from '../../components/ui/Button';
import { FileData } from '../../types';
import { ArrowRightLeft, FileVideo, Download, CheckCircle, RefreshCcw, Loader2, AlertCircle } from 'lucide-react';
import { getFFmpeg, writeFileToFFmpeg, readFileFromFFmpeg } from '../../utils/ffmpeg';
import { FFmpeg } from '@ffmpeg/ffmpeg';

const FORMATS = ['MP4', 'MOV', 'AVI', 'MKV', 'WEBM', 'APNG', 'GIF', 'WEBP', 'PNG', 'JPG'];

interface VideoConverterProps {
  accept?: string;
  description?: string;
  title?: string;
}

export const VideoConverter: React.FC<VideoConverterProps> = ({
  accept = "video/*",
  description = "MP4, MOV, MKV, AVI, WEBM supported",
  title = "Video Converter"
}) => {
  const [file, setFile] = useState<FileData | null>(null);
  const [targetFormat, setTargetFormat] = useState('MP4');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [progress, setProgress] = useState(0);
  const [convertedUrl, setConvertedUrl] = useState<string | null>(null);
  const [logs, setLogs] = useState<string>('');
  const [engineStatus, setEngineStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  const ffmpegRef = useRef<FFmpeg | null>(null);

  useEffect(() => {
    getFFmpeg()
      .then(ff => {
        ffmpegRef.current = ff;
        setEngineStatus('ready');
      })
      .catch(e => {
        console.error("Failed to load FFmpeg", e);
        setErrorMessage(e instanceof Error ? e.message : 'Unknown error occurred');
        setEngineStatus('error');
      });
  }, []);

  const handleConvert = async () => {
    if (!file || !ffmpegRef.current) return;

    setIsProcessing(true);
    setProgress(0);
    setIsDone(false);
    setLogs('Starting conversion process...');

    const ffmpeg = ffmpegRef.current;
    const inputName = `input.${file.file.name.split('.').pop()}`;
    const outputName = `output.${targetFormat.toLowerCase()}`;

    try {
      ffmpeg.on('progress', ({ progress }) => {
        // progress is 0-1, but sometimes ffmpeg gives garbage or >1 if duration logic fails
        const p = Math.max(0, Math.min(100, Math.round(progress * 100)));
        setProgress(p);
      });

      ffmpeg.on('log', ({ message }) => {
        setLogs(prev => prev + '\n' + message);
      });

      setLogs(prev => prev + '\nWriting file to memory...');
      await writeFileToFFmpeg(ffmpeg, inputName, file.file);

      const args = ['-y', '-i', inputName];

      // Optimize for speed using available threads - Cap at 4 to prevent WASM deadlocks
      const threads = typeof navigator !== 'undefined' && navigator.hardwareConcurrency
        ? Math.min(navigator.hardwareConcurrency, 4).toString()
        : '2';

      args.push('-threads', threads);

      if (targetFormat === 'MP4' || targetFormat === 'MOV' || targetFormat === 'MKV' || targetFormat === 'AVI') {
        args.push('-c:v', 'libx264', '-preset', 'ultrafast', '-c:a', 'aac');
      } else if (targetFormat === 'WEBM') {
        args.push('-c:v', 'libvpx', '-quality', 'realtime', '-cpu-used', '5', '-b:v', '1M', '-c:a', 'libvorbis');
      } else if (targetFormat === 'APNG') {
        args.push('-f', 'apng', '-plays', '0');
      } else if (targetFormat === 'GIF') {
        args.push('-vf', 'split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse');
        args.push('-f', 'gif');
      } else if (targetFormat === 'WEBP') {
        args.push('-c:v', 'libwebp', '-lossless', '0', '-compression_level', '4', '-q:v', '80', '-loop', '0');
      } else if (targetFormat === 'JPG') {
        args.push('-update', '1'); // For animated input, keep last frame or just process as static
      } else if (targetFormat === 'PNG') {
        args.push('-update', '1');
      }

      args.push(outputName);

      console.log(`Starting FFmpeg conversion with ${threads} threads...`);
      setLogs(prev => prev + `\nRunning: ffmpeg ${args.join(' ')}`);
      try {
        await ffmpeg.exec(args);
        console.log('FFmpeg exec completed successfully');
      } catch (primaryErr) {
        setLogs(prev => prev + `\nPrimary encode failed: ${(primaryErr as Error).message}`);
        if (targetFormat === 'MP4' || targetFormat === 'MOV' || targetFormat === 'MKV' || targetFormat === 'AVI') {
          const fallbackArgs = ['-y', '-i', inputName, '-c:v', 'mpeg4', '-b:v', '1M', '-c:a', 'aac', outputName];
          setLogs(prev => prev + `\nFallback: ffmpeg ${fallbackArgs.join(' ')}`);
          try {
            await ffmpeg.exec(fallbackArgs);
          } catch (fallbackErr) {
            const altArgs = ['-y', '-i', inputName, '-c:v', 'mpeg4', '-b:v', '1M', '-c:a', 'pcm_s16le', outputName];
            setLogs(prev => prev + `\nSecond fallback: ffmpeg ${altArgs.join(' ')}`);
            await ffmpeg.exec(altArgs);
          }
        } else if (targetFormat === 'WEBM') {
          const fallbackWebm = ['-y', '-i', inputName, '-c:v', 'libvpx', '-b:v', '1M', '-c:a', 'libvorbis', outputName];
          setLogs(prev => prev + `\nFallback: ffmpeg ${fallbackWebm.join(' ')}`);
          await ffmpeg.exec(fallbackWebm);
        } else if (targetFormat === 'APNG') {
          const fallbackApng = ['-y', '-i', inputName, '-f', 'apng', '-plays', '0', outputName];
          setLogs(prev => prev + `\nFallback: ffmpeg ${fallbackApng.join(' ')}`);
          await ffmpeg.exec(fallbackApng);
        } else if (targetFormat === 'WEBP') {
          const fallbackWebp = ['-y', '-i', inputName, '-c:v', 'libwebp', '-lossless', '1', outputName];
          setLogs(prev => prev + `\nFallback: ffmpeg ${fallbackWebp.join(' ')}`);
          await ffmpeg.exec(fallbackWebp);
        } else if (targetFormat === 'GIF') {
          const fallbackGif = ['-y', '-i', inputName, outputName];
          setLogs(prev => prev + `\nFallback: ffmpeg ${fallbackGif.join(' ')}`);
          await ffmpeg.exec(fallbackGif);
        }
      }

      const url = await readFileFromFFmpeg(ffmpeg, outputName, `video/${targetFormat.toLowerCase()}`);
      setConvertedUrl(url);
      setIsDone(true);
      setProgress(100);

      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);

    } catch (error) {
      console.error(error);
      setLogs(prev => prev + `\nError: ${(error as Error).message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!convertedUrl) return;
    const a = document.createElement('a');
    a.href = convertedUrl;
    const nameWithoutExt = file?.file.name.substring(0, file.file.name.lastIndexOf('.')) || 'video';
    a.download = `${nameWithoutExt}_converted.${targetFormat.toLowerCase()}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleReset = () => {
    setFile(null);
    setIsDone(false);
    setProgress(0);
    setIsProcessing(false);
    setConvertedUrl(null);
    setLogs('');
  };

  if (engineStatus === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center space-y-4 animate-fade-in">
        <div className="bg-red-500/10 p-4 rounded-full text-red-500">
          <AlertCircle size={32} />
        </div>
        <h3 className="text-xl font-bold text-white">Engine Failed</h3>
        <p className="text-zinc-400 max-w-md">The video engine could not load.</p>
        {errorMessage && (
          <p className="text-red-400 text-sm font-mono bg-black/50 p-2 rounded max-w-lg mx-auto">
            {errorMessage}
          </p>
        )}
        <Button onClick={() => window.location.reload()} variant="secondary">Reload Page</Button>
      </div>
    );
  }

  if (engineStatus === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center space-y-4 animate-fade-in">
        <Loader2 size={32} className="animate-spin text-orange-500" />
        <p className="text-zinc-400">Loading Converter Engine...</p>
      </div>
    );
  }

  if (!file) {
    return (
      <div className="container mx-auto px-6 h-[85vh] flex flex-col justify-center animate-fade-in text-center">
        {/* Header */}
        <div className="flex-none space-y-3 mb-10">
          <h2 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-indigo-600 flex items-center justify-center gap-3 font-unbounded">
            <FileVideo size={32} /> {title}
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Transform videos locally using WebAssembly. No server uploads.
          </p>
        </div>

        {/* Upload Area */}
        <div className="flex-1 w-full max-w-4xl mx-auto bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-2 flex flex-col items-center justify-center relative overflow-hidden group hover:border-indigo-500/50 transition-colors shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <FileUploader
            onFileSelect={setFile}
            accept={accept}
            label="Upload Video"
            description={description}
            className="w-full h-full border-2 border-dashed border-zinc-800 hover:border-indigo-500/50 bg-zinc-950/50 rounded-2xl transition-all"
          />
        </div>

        {/* Feature Highlights */}
        <div className="flex-none max-w-4xl mx-auto w-full grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
          {[
            { icon: FileVideo, label: 'All Formats', desc: 'MP4, MOV, MKV & more' },
            { icon: CheckCircle, label: 'Offline', desc: 'Runs in browser' },
            { icon: RefreshCcw, label: 'Universal', desc: 'Convert anything' },
            { icon: Download, label: 'Fast Export', desc: 'Save instantly' }
          ].map((feat, i) => (
            <div key={i} className="flex flex-col items-center text-center space-y-2 p-4 rounded-xl bg-zinc-900/30 border border-zinc-800/30 backdrop-blur-sm hover:bg-zinc-900/50 transition-colors">
              <div className="p-2 bg-indigo-500/10 rounded-full text-indigo-400">
                <feat.icon size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-zinc-200">{feat.label}</h3>
                <p className="text-[10px] text-zinc-500 uppercase tracking-wide font-bold mt-1">{feat.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-slide-up">
      <div className="bg-surface rounded-3xl border border-zinc-800 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
              <FileVideo size={24} />
            </div>
            <div>
              <h3 className="font-semibold text-lg text-zinc-100">{file.file.name}</h3>
              <p className="text-sm text-zinc-500">{file.size} • {file.type}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleReset} disabled={isProcessing}>
            <RefreshCcw size={16} className="mr-2" /> Change File
          </Button>
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Format Selection */}
          <div className="space-y-8">
            <div>
              <label className="text-xs font-bold text-zinc-400 mb-4 block uppercase tracking-wider">Select Output Format</label>
              <div className="grid grid-cols-3 gap-3">
                {FORMATS.map(fmt => (
                  <button
                    key={fmt}
                    onClick={() => setTargetFormat(fmt)}
                    disabled={isProcessing || isDone}
                    className={`
                            px-4 py-3 rounded-xl text-sm font-semibold transition-all border
                            ${targetFormat === fmt
                        ? 'bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/20 scale-105'
                        : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700 hover:border-zinc-600'
                      }
                            ${(isProcessing || isDone) ? 'opacity-50 cursor-not-allowed' : ''}
                          `}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            {isProcessing && (
              <div className="h-32 bg-black/40 rounded-xl p-4 overflow-y-auto text-xs font-mono text-zinc-500 border border-zinc-800 custom-scrollbar">
                <pre>{logs}</pre>
              </div>
            )}

            {!isDone ? (
              <Button
                onClick={handleConvert}
                isLoading={isProcessing}
                size="lg"
                className="w-full h-14"
              >
                {isProcessing ? 'Converting...' : `Convert to ${targetFormat}`}
              </Button>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-green-400 font-medium justify-center p-3 bg-green-500/10 rounded-xl border border-green-500/20">
                  <CheckCircle size={20} /> Conversion Complete
                </div>
                <Button size="lg" className="w-full h-14" onClick={handleDownload}>
                  <Download size={20} className="mr-2" /> Download {targetFormat}
                </Button>
              </div>
            )}
          </div>

          {/* Visualizer / Progress */}
          <div className="relative aspect-square md:aspect-video rounded-2xl bg-black/40 border border-zinc-800 flex flex-col items-center justify-center p-6 text-center overflow-hidden">
            {/* Background Glow */}
            <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-indigo-500/20 blur-[50px] rounded-full transition-opacity duration-1000 ${isProcessing ? 'opacity-100 animate-pulse' : 'opacity-20'}`}></div>

            {isProcessing ? (
              <div className="w-full max-w-xs space-y-6 relative z-10">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                  <h4 className="text-xl font-bold text-white mt-4">Transcoding...</h4>
                  <p className="text-xs text-zinc-500">This happens in your browser</p>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-zinc-400 font-mono">
                    <span>PROGRESS</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-2 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-300 ease-out"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ) : isDone ? (
              <div className="space-y-4 animate-fade-in relative z-10">
                <div className="w-24 h-24 rounded-full bg-green-500/20 flex items-center justify-center mx-auto text-green-500 border border-green-500/30 shadow-lg shadow-green-500/10">
                  <FileVideo size={48} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">Ready!</h3>
                  <p className="text-zinc-500 mt-1">
                    {file.file.name.split('.')[0]}_converted.{targetFormat.toLowerCase()}
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4 opacity-40 relative z-10">
                <div className="w-24 h-24 rounded-full bg-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
                  <ArrowRightLeft size={40} />
                </div>
                <p className="text-zinc-500 font-medium">Ready to convert</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
