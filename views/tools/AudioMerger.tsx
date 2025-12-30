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
      <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-indigo-600">
            Audio Merger
          </h2>
          <p className="text-zinc-400">Combine multiple audio tracks into a single WAV file.</p>
        </div>
        <div className="p-8 bg-surface rounded-3xl shadow-xl border border-zinc-800/50">
          <FileUploader
            onFilesSelect={handleFilesSelect}
            accept="audio/*"
            label="Upload Audio Files"
            description="Select multiple MP3, WAV files"
            multiple={true}
          />
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
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider flex items-center gap-2">
              <ListMusic size={14} className="text-indigo-500" /> Tracks ({files.length})
            </h3>
            <div className="flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => { setFiles([]); setMergedBlobUrl(null); }}>Clear All</Button>
            </div>
          </div>

          <div className="space-y-3 mb-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {files.map((file, index) => (
              <div key={index} className="flex items-center gap-4 p-4 bg-zinc-900/50 border border-zinc-800/50 rounded-xl group hover:border-zinc-700 transition-all">
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
          <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Action</h3>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 p-3 rounded-lg text-sm text-red-400 flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          <div className="pt-4">
            {!mergedBlobUrl ? (
              <Button
                className="w-full h-14"
                size="lg"
                onClick={handleMerge}
                isLoading={isProcessing}
                disabled={files.length < 2 || isProcessing}
              >
                Merge {files.length} Tracks
              </Button>
            ) : (
              <div className="space-y-4 animate-fade-in">
                <div className="flex items-center gap-2 text-green-400 justify-center font-medium bg-green-500/10 p-3 rounded-xl border border-green-500/20">
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