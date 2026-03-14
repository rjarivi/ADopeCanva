/// <reference lib="dom" />
import React, { useState } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';
import { FileUploader } from '../../components/FileUploader';
import { Button } from '../../components/ui/Button';
import { FileData } from '../../types';
import { ListMusic, Music, Plus, Trash2, Download, CheckCircle, AlertCircle } from 'lucide-react';

export const AudioMerger: React.FC = () => {
  const isMobile = useIsMobile();
  const [files, setFiles] = useState<FileData[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mergedBlobUrl, setMergedBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFilesSelect = (newFiles: FileData[]) => {
    setFiles(prev => [...prev, ...newFiles]);
    setMergedBlobUrl(null); // Reset result
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setMergedBlobUrl(null);
  };

  // Helper: Write WAV header
  const writeWavHeader = (samples: Float32Array, sampleRate: number) => {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono (simplified for browser compatibility)
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, samples.length * 2, true);

    const floatTo16BitPCM = (output: DataView, offset: number, input: Float32Array) => {
      for (let i = 0; i < input.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, input[i]));
        output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
      }
    };

    floatTo16BitPCM(view, 44, samples);
    return view;
  };

  const handleMerge = async () => {
    if (files.length < 2) return;
    setIsProcessing(true);
    setError(null);

    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const buffers: AudioBuffer[] = [];

      // Decode all files
      for (const fileData of files) {
        const arrayBuffer = await fileData.file.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        buffers.push(audioBuffer);
      }

      // Calculate total length
      const totalLength = buffers.reduce((acc, buf) => acc + buf.length, 0);
      const sampleRate = buffers[0].sampleRate;

      // Create output buffer (Mono for simplicity, or 1st channel)
      const output = new Float32Array(totalLength);

      let offset = 0;
      for (const buf of buffers) {
        // Take channel 0
        const channelData = buf.getChannelData(0);
        output.set(channelData, offset);
        offset += channelData.length;
      }

      // Encode to WAV
      const wavView = writeWavHeader(output, sampleRate);
      const blob = new Blob([wavView], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);

      setMergedBlobUrl(url);

    } catch (err) {
      console.error(err);
      setError("Failed to process audio files. Please try simpler formats (WAV/MP3).");
    } finally {
      setIsProcessing(false);
    }
  };

  if (files.length === 0) {
    return (
      <div className="container mx-auto px-6 h-[85vh] flex flex-col justify-center animate-fade-in text-center">
        {/* Header */}
        <div className="flex-none space-y-3 mb-10">
          <h2 className="text-4xl font-black tracking-tight flex items-center justify-center gap-3 font-unbounded">
            <div className="text-indigo-500"><ListMusic size={32} /></div>
            <span className="text-white">              Audio Merger
            </span>
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Combine multiple audio tracks into a single WAV file.
          </p>
        </div>

        {/* Upload Area */}
        <div className="flex-1 w-full max-w-4xl mx-auto bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-2 flex flex-col items-center justify-center relative overflow-hidden group hover:border-indigo-500/50 transition-colors shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <FileUploader
            onFilesSelect={handleFilesSelect}
            accept="audio/*"
            label="Upload Audio Files"
            description="Select multiple MP3, WAV files"
            multiple={true}
            className="w-full h-full border-2 border-dashed border-zinc-800 hover:border-indigo-500/50 bg-zinc-950/50 rounded-2xl transition-all"
          />
        </div>

        {/* Feature Highlights */}
        <div className="flex-none max-w-4xl mx-auto w-full grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
          {[
            { icon: ListMusic, label: 'Multi-Track', desc: 'Combine many files' },
            { icon: Music, label: 'Seamless', desc: 'Gapless playback' },
            { icon: Download, label: 'Instant', desc: 'Process in browser' },
            { icon: CheckCircle, label: 'High Quality', desc: 'Lossless merging' }
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
    <div className="max-w-5xl mx-auto animate-slide-up grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* File List */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-surface rounded-3xl border border-zinc-800 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest flex items-center gap-2 font-unbounded">
              <ListMusic size={20} /> Tracks ({files.length})
            </h3>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => { setFiles([]); setMergedBlobUrl(null); }}>Clear All</Button>
            </div>
          </div>

          <div className="space-y-3 mb-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {files.map((file, index) => (
              <div key={index} className="flex items-center gap-4 p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-xl group hover:border-indigo-500/40 transition-all">
                <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center font-bold text-xs uppercase">
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{file.file.name}</p>
                  <p className="text-xs text-zinc-500">{file.size}</p>
                </div>
                <button
                  onClick={() => removeFile(index)}
                  className="p-2 text-zinc-500 hover:text-red-400 rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>

          <div className="border-t-2 border-dashed border-zinc-800 my-6"></div>

          <FileUploader
            onFilesSelect={handleFilesSelect}
            label="Add More Tracks"
            description="Drop files here to append"
            multiple={true}
          />
        </div>
      </div>

      {/* Settings & Action */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-surface rounded-3xl border border-zinc-800 p-6 space-y-6 sticky top-6">
          <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest font-unbounded">Action</h3>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-sm text-red-400 flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <div className="pt-4">
            {!mergedBlobUrl ? (
              <Button className="w-full h-14" size="lg" onClick={handleMerge} isLoading={isProcessing} disabled={files.length < 2 || isProcessing} >
                Merge {files.length} Tracks
              </Button>
            ) : (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center gap-2 text-green-400 justify-center font-black bg-green-500/10 p-3 rounded-xl border border-green-500/20 font-unbounded uppercase tracking-wider text-xs">
                  <CheckCircle size={18} /> Merge Successful
                </div>
                <a
                  href={mergedBlobUrl}
                  download="merged-audio.wav"
                  className="block w-full"
                >
                  <Button size="lg" className="w-full h-14">
                    <Download size={20} className="mr-2" /> Download Merged Audio
                  </Button>
                </a>
                <Button variant="ghost" className="w-full" onClick={() => { setMergedBlobUrl(null); setFiles([]); }}>
                  Start New
                </Button>
              </div>
            )}
          </div>

          <p className="text-xs text-zinc-500 text-center">
            Note: Merging happens entirely in your browser. Large files may take a moment to process.
          </p>
        </div>
      </div>
    </div>
  );
};