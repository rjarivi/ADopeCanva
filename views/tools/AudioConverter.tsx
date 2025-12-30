/// <reference lib="dom" />
import React, { useState, useEffect, useRef } from 'react';
import { FileUploader } from '../../components/FileUploader';
import { Button } from '../../components/ui/Button';
import { FileData } from '../../types';
import { Music, Mic2, Download, CheckCircle, RefreshCcw, Settings2, AlertCircle, Loader2 } from 'lucide-react';
import { SectionLabel } from '../../components/EditorControls';
import { getFFmpeg, writeFileToFFmpeg, readFileFromFFmpeg } from '../../utils/ffmpeg';
import { FFmpeg } from '@ffmpeg/ffmpeg';

import { useIsMobile } from '../../hooks/useIsMobile';

const AUDIO_FORMATS = ['MP3', 'WAV', 'AAC', 'FLAC', 'M4A', 'OGG'];
const BITRATES = ['128k', '192k', '256k', '320k'];

export const AudioConverter: React.FC = () => {
  const isMobile = useIsMobile();
  const [file, setFile] = useState<FileData | null>(null);
  const [format, setFormat] = useState('MP3');
  const [bitrate, setBitrate] = useState('192k');
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
    setLogs('Starting audio conversion...');

    const ffmpeg = ffmpegRef.current;
    // Handle files with spaces or special chars by using a safe name
    const ext = file.file.name.split('.').pop() || 'mp3';
    const inputName = `input.${ext} `;
    const outputName = `output.${format.toLowerCase()} `;
    setConvertedUrl(null);

    try {
      ffmpeg.on('progress', ({ progress }) => {
        setProgress(Math.round(progress * 100));
      });

      ffmpeg.on('log', ({ message }) => {
        setLogs(prev => prev + '\n' + message);
      });

      await writeFileToFFmpeg(ffmpeg, inputName, file.file);

      const args = ['-y', '-i', inputName];

      // Audio Codec Logic
      switch (format) {
        case 'MP3':
          args.push('-c:a', 'libmp3lame', '-b:a', bitrate);
          break;
        case 'AAC':
        case 'M4A':
          args.push('-c:a', 'aac', '-b:a', bitrate);
          break;
        case 'OGG':
          args.push('-c:a', 'libvorbis', '-b:a', bitrate);
          break;
        case 'FLAC':
          args.push('-c:a', 'flac');
          break;
        case 'WAV':
          args.push('-c:a', 'pcm_s16le');
          break;
      }

      args.push(outputName);

      setLogs(prev => prev + `\nRunning: ffmpeg ${args.join(' ')} `);
      await ffmpeg.exec(args);

      const mimeMap: Record<string, string> = {
        'MP3': 'audio/mpeg',
        'WAV': 'audio/wav',
        'AAC': 'audio/aac',
        'FLAC': 'audio/flac',
        'M4A': 'audio/mp4',
        'OGG': 'audio/ogg'
      };

      const url = await readFileFromFFmpeg(ffmpeg, outputName, mimeMap[format]);
      setConvertedUrl(url);

      setIsDone(true);
      setProgress(100);

      // Cleanup
      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);

    } catch (e) {
      console.error(e);
      setLogs(prev => prev + `\nError: ${(e as Error).message} `);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!convertedUrl) return;
    const a = document.createElement('a');
    a.href = convertedUrl;
    const nameWithoutExt = file?.file.name.substring(0, file.file.name.lastIndexOf('.')) || 'audio';
    a.download = `${nameWithoutExt}.${format.toLowerCase()} `;
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
      <div className="flex flex-col items-center justify-center p-8 space-y-4 animate-fade-in text-center">
        <AlertCircle size={32} className="text-red-500" />
        <h3 className="text-xl font-bold text-white">Engine Failed</h3>
        <p className="text-zinc-400">Failed to load audio engine.</p>
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
      <div className="flex flex-col items-center justify-center p-12 space-y-4 animate-fade-in text-center">
        <Loader2 size={32} className="text-indigo-500 animate-spin" />
        <p className="text-zinc-400">Loading Audio Engine...</p>
      </div>
    );
  }

  if (!file) {
    return (
      <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-indigo-600">
            Audio Converter
          </h2>
          <p className="text-zinc-400">Convert music and voice recordings to any format.</p>
        </div>
        <div className="p-8 bg-surface rounded-3xl shadow-xl border border-zinc-800/50">
          <FileUploader
            onFileSelect={setFile}
            accept="audio/*,video/*"
            label="Upload Audio or Video"
            description="Extract audio from video or convert audio files"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-slide-up">
      <div className="bg-surface rounded-3xl border border-zinc-800 overflow-hidden shadow-2xl">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-500">
              <Music size={24} />
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
          {/* Controls */}
          <div className="space-y-8">
            <div className="space-y-4">
              <label className="text-sm font-medium text-zinc-400 flex items-center gap-2">
                <Settings2 size={16} /> Output Settings
              </label>

              <div className="space-y-3">
                <SectionLabel>Format</SectionLabel>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {AUDIO_FORMATS.map(fmt => (
                    <button
                      key={fmt}
                      onClick={() => setFormat(fmt)}
                      disabled={isProcessing || isDone}
                      className={`
px - 3 py - 2 rounded - lg text - xs font - bold uppercase tracking - wider transition - all border
                              ${format === fmt
                          ? 'bg-indigo-500 text-white border-indigo-500 shadow-md shadow-indigo-500/20'
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:bg-zinc-700'
                        }
`}
                    >
                      {fmt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <SectionLabel>Quality (Bitrate)</SectionLabel>
                <select
                  value={bitrate}
                  onChange={(e) => setBitrate((e.target as HTMLSelectElement).value)}
                  disabled={isProcessing || isDone || format === 'WAV' || format === 'FLAC'}
                  className="w-full bg-zinc-800 border border-zinc-700 text-white rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                  {BITRATES.map(br => <option key={br} value={br}>{br.replace('k', ' kbps')}</option>)}
                </select>
                {(format === 'WAV' || format === 'FLAC') && <p className="text-xs text-zinc-500">Bitrate selection not applicable for lossless formats.</p>}
              </div>
            </div>

            {isProcessing && (
              <div className="h-24 bg-black/40 rounded-xl p-3 overflow-y-auto text-xs font-mono text-zinc-500 border border-zinc-800 custom-scrollbar">
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
                Convert Audio
              </Button>
            ) : (
              <div className="space-y-4 animate-fade-in">
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm flex items-center justify-center gap-2 font-medium">
                  <CheckCircle size={18} /> Conversion Complete
                </div>
                <Button size="lg" className="w-full h-14" onClick={handleDownload}>
                  <Download size={20} className="mr-2" /> Download {format}
                </Button>
              </div>
            )}
          </div>

          {/* Visualizer */}
          <div className="relative aspect-square md:aspect-[4/3] rounded-2xl bg-zinc-950 border border-zinc-800 flex flex-col items-center justify-center p-6 text-center overflow-hidden">
            {/* Sound Wave Visualization Simulation */}
            <div className="absolute inset-0 flex items-center justify-center gap-1 opacity-20">
              {Array.from({ length: 20 }).map((_, i) => (
                <div
                  key={i}
                  className={`w - 2 bg - indigo - 500 rounded - full transition - all duration - 300 ${isProcessing ? 'animate-pulse' : ''} `}
                  style={{
                    height: `${Math.random() * 60 + 20}% `,
                    animationDelay: `${i * 0.1} s`
                  }}
                />
              ))}
            </div>

            {isProcessing ? (
              <div className="z-10 w-full max-w-[200px] space-y-4">
                <div className="w-16 h-16 mx-auto border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin"></div>
                <div className="space-y-1">
                  <p className="text-white font-medium">Converting...</p>
                  <div className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${progress}% ` }}></div>
                  </div>
                </div>
              </div>
            ) : isDone ? (
              <div className="z-10 space-y-4 animate-slide-up">
                <div className="w-20 h-20 rounded-full bg-green-500/20 text-green-500 flex items-center justify-center mx-auto border border-green-500/30">
                  <CheckCircle size={40} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-white">Ready!</h3>
                  <p className="text-zinc-500 mt-1">
                    {file.file.name.split('.')[0]}_converted.{format.toLowerCase()}
                  </p>
                </div>
              </div>
            ) : (
              <div className="z-10 opacity-50 space-y-2">
                <Mic2 size={48} className="mx-auto text-zinc-600" />
                <p className="text-zinc-500">Ready to convert</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
