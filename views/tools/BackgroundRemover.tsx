/// <reference lib="dom" />
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { FileUploader } from '../../components/FileUploader';
import { Button } from '../../components/ui/Button';
import { ApiKeyInput } from '../../components/ui/ApiKeyInput';
import { FileData } from '../../types';
import { Eraser, Download, RefreshCcw, Sliders, AlertCircle, Layers, Settings, Share2, Trash2, Sparkles } from 'lucide-react';
import { SectionLabel, SliderControl } from '../../components/EditorControls';

import { useIsMobile } from '../../hooks/useIsMobile';

export const BackgroundRemover: React.FC = () => {
  const isMobile = useIsMobile();
  const [file, setFile] = useState<FileData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [apiKey, setApiKey] = useState('');

  const handleReset = () => {
    setFile(null);
    setResultImage(null);
    setError(null);
    setIsProcessing(false);
  };

  const getBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result.split(',')[1]);
        } else {
          reject(new Error("Failed to read file"));
        }
      };
      reader.onerror = reject;
    });
  };

  const handleRemoveBackground = async () => {
    if (!file) return;

    setIsProcessing(true);
    setError(null);

    try {
      if (!apiKey) throw new Error("Please enter your Gemini API Key first");

      const base64Data = await getBase64(file.file);
      const ai = new GoogleGenAI({ apiKey });

      // We use a specific prompt to instruct the model to isolate the subject
      const prompt = "Remove the background from this image. Ensure the main subject is isolated clearly.";

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            {
              inlineData: {
                data: base64Data,
                mimeType: file.file.type,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      });

      let foundImage = false;
      if (response.candidates && response.candidates[0].content && response.candidates[0].content.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            const base64EncodeString = part.inlineData.data;
            const imageUrl = `data:image/png;base64,${base64EncodeString}`;
            setResultImage(imageUrl);
            foundImage = true;
            break;
          }
        }
      }

      if (!foundImage) {
        throw new Error("The AI could not process the image background.");
      }

    } catch (err) {
      console.error(err);
      let message = (err as Error).message || "An error occurred while processing the image.";

      // Parse detailed AI errors
      if (message.includes('429') || message.toLowerCase().includes('quota')) {
        message = "Usage limit exceeded. Please try again later or check your API quota.";
      } else if (message.includes('401') || message.toLowerCase().includes('key')) {
        message = "Invalid API Key. Please verify your credentials.";
      } else if (message.includes('{')) {
        try {
          // Attempt to extract friendly message from JSON blob
          const jsonMatch = message.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const errorObj = JSON.parse(jsonMatch[0]);
            if (errorObj.error && errorObj.error.message) {
              message = errorObj.error.message;
            }
          }
        } catch (e) { /* use original message */ }
      }

      setError(message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!file) {
    return (
      <div className="container mx-auto px-6 h-[85vh] flex flex-col justify-center animate-fade-in text-center">
        {/* Header */}
        <div className="flex-none space-y-3 mb-10">
          <h2 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-cyan-400 flex items-center justify-center gap-3 font-unbounded">
            <Eraser size={32} /> Smart Background Remover
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
            Isolate subjects instantly using Gemini Vision AI.
          </p>
        </div>

        {/* Upload Area */}
        <div className="flex-1 w-full max-w-4xl mx-auto bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-2 flex flex-col items-center justify-center relative overflow-hidden group hover:border-indigo-500/50 transition-colors shadow-2xl">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <FileUploader
            onFileSelect={setFile}
            accept="image/*"
            label="Upload Image"
            description="JPG, PNG, WEBP supported"
            className="w-full h-full border-2 border-dashed border-zinc-800 hover:border-indigo-500/50 bg-zinc-950/50 rounded-2xl transition-all"
          />
        </div>

        {/* Feature Highlights */}
        <div className="flex-none max-w-4xl mx-auto w-full grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
          {[
            { icon: Eraser, label: 'Instant Clear', desc: 'Remove bg in seconds' },
            { icon: Sparkles, label: 'AI Powered', desc: 'Gemini Vision Tech' },
            { icon: Layers, label: 'Transparent', desc: 'Perfect edge detection' },
            { icon: Download, label: 'HD Export', desc: 'Full resolution PNG' }
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
    <div className={`w-full bg-zinc-950 text-zinc-200 flex flex-col md:flex-row overflow-hidden font-sans selection:bg-indigo-500/30 ${isMobile ? 'h-[100vh]' : 'max-w-6xl mx-auto rounded-3xl border border-zinc-800'}`}>

      {/* Navigation removed for unified UX */}

      {/* 2. Settings Panel (Middle) */}
      <aside className={`${isMobile ? 'order-2 flex-1 overflow-hidden' : 'order-2 w-80 border-r'} border-zinc-800 bg-zinc-950 flex flex-col z-20`}>
        <div className="h-14 px-5 border-b border-zinc-900 flex items-center justify-between shrink-0 bg-zinc-950/80 backdrop-blur-sm">
          <h2 className="font-semibold text-[10px] text-zinc-500 uppercase tracking-widest flex items-center gap-2">
            <Eraser size={14} className="text-indigo-400" /> BG Remover
          </h2>
          <button onClick={handleReset} className="text-zinc-600 hover:text-red-400 transition-colors">
            <RefreshCcw size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="space-y-4">
              <ApiKeyInput
                serviceName="Gemini"
                localStorageKey="gemini_api_key"
                onKeyChange={setApiKey}
                description="Required for Smart BG removal"
              />

              {!resultImage ? (
                <Button
                  className="w-full h-12 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 border-none shadow-lg shadow-indigo-500/20 active:scale-[0.98] transition-all"
                  onClick={handleRemoveBackground}
                  isLoading={isProcessing}
                  disabled={isProcessing || !apiKey}
                >
                  <Eraser size={18} className="mr-2" />
                  {isProcessing ? 'Removing...' : 'Remove Background'}
                </Button>
              ) : (
                <div className="space-y-3 animate-slide-up">
                  <Button
                    className="w-full h-12 bg-white text-black hover:bg-zinc-200 border-none shadow-lg"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = resultImage;
                      link.download = `no-bg-${file.file.name.split('.')[0]}.png`;
                      link.click();
                    }}
                  >
                    <Download size={18} className="mr-2" /> Download PNG
                  </Button>
                  <Button variant="secondary" className="w-full h-12 border-zinc-800 font-bold uppercase text-[10px] tracking-widest" onClick={handleReset}>
                    <RefreshCcw size={16} className="mr-2" /> New Image
                  </Button>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-500 text-xs shadow-sm">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}
            </div>

            <section>
              <SliderControl
                label="Before / After View"
                value={sliderPosition}
                min={0}
                max={100}
                onChange={setSliderPosition}
                unit="%"
              />
            </section>

            <section className="bg-zinc-900/30 p-4 rounded-xl border border-zinc-800">
              <SectionLabel>Subject Tips</SectionLabel>
              <ul className="text-[10px] text-zinc-500 space-y-2 uppercase font-bold tracking-tight">
                <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-indigo-500" /> High contrast edges work best</li>
                <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-indigo-500" /> Avoid extremely blurry areas</li>
                <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-indigo-500" /> Single subject produces cleaner results</li>
              </ul>
            </section>
          </div>
        </div>
      </aside>

      {/* 3. Preview Area */}
      <main className={`order-1 ${isMobile ? 'h-[45vh]' : 'flex-1'} relative bg-[#09090b] flex items-center justify-center p-4 md:p-8 overflow-hidden shrink-0 border-b md:border-b-0 border-zinc-900`}>
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

        <div className={`relative shadow-2xl transition-all duration-500 ease-out border border-zinc-800/50 bg-black/40 rounded-2xl overflow-hidden ${isMobile ? 'w-full h-full' : 'w-full max-w-2xl aspect-square'}`}>
          <div className="relative w-full h-full rounded-2xl overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')] flex items-center justify-center">
            {resultImage ? (
              <div className="relative w-full h-full group">
                <img src={resultImage} alt="No Background" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
                <img
                  src={file.previewUrl}
                  alt="Original"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                  style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                />

                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur text-[10px] text-white px-2 py-1 rounded border border-white/10 font-bold uppercase tracking-widest">Original</div>
                <div className="absolute top-4 right-4 bg-indigo-600/90 backdrop-blur text-[10px] text-white px-2 py-1 rounded border border-white/10 font-bold uppercase tracking-widest shadow-lg shadow-indigo-500/20">Clean</div>

                <div className="absolute inset-y-0" style={{ left: `${sliderPosition}%` }}>
                  <div className="absolute inset-y-0 -left-px w-px bg-white/50"></div>
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center shadow-2xl text-indigo-600 ring-2 ring-black/10">
                    <Sliders size={14} className="rotate-90" />
                  </div>
                </div>

                <input
                  type="range"
                  min="0" max="100" value={sliderPosition}
                  onChange={(e) => setSliderPosition(parseInt(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
                />
              </div>
            ) : (
              <div className="relative w-full h-full">
                <img src={file.previewUrl} alt="Original" className="w-full h-full object-contain" />
                {isProcessing && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-10 animate-fade-in">
                    <div className="w-12 h-12 relative mb-4">
                      <div className="absolute inset-0 border-2 border-zinc-700/30 rounded-full"></div>
                      <div className="absolute inset-0 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <p className="text-white font-bold tracking-[0.2em] uppercase text-[10px]">Analyzing Pixels</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {isMobile && <div className="absolute bottom-2 right-4 text-[10px] text-zinc-700 font-bold tracking-widest uppercase">Isolation Stage</div>}
      </main>
    </div>
  );
};