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
  const [activeTab, setActiveTab] = useState<'remove' | 'config' | 'export'>('remove');

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
      <div className="max-w-3xl mx-auto space-y-8 animate-fade-in">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-teal-400 to-cyan-400">
            Smart Background Remover
          </h2>
          <p className="text-zinc-400">Isolate subjects instantly using Gemini Vision AI.</p>
        </div>
        <div className="p-8 bg-surface rounded-3xl shadow-xl shadow-teal-500/5 border border-zinc-800/50">
          <FileUploader
            onFileSelect={setFile}
            accept="image/*"
            label="Upload Image"
            description="JPG, PNG, WEBP supported"
          />
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full bg-zinc-950 text-zinc-200 flex flex-col md:flex-row overflow-hidden font-sans selection:bg-teal-500/30 ${isMobile ? 'h-[100vh]' : 'max-w-6xl mx-auto rounded-3xl border border-zinc-800'}`}>

      {/* 1. Navigation Rail / Bottom Bar */}
      <nav className={`${isMobile ? 'order-3 w-full h-16 border-t flex-row justify-around' : 'order-1 w-16 border-r flex-col py-4'} border-zinc-900 bg-zinc-950 flex items-center shrink-0 z-30`}>
        <button
          onClick={() => setActiveTab('remove')}
          className={`flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'remove' ? 'text-teal-400' : 'text-zinc-500'} ${isMobile ? 'flex-1' : 'w-full aspect-square mb-4'}`}
        >
          <Eraser size={isMobile ? 22 : 20} />
          <span className="text-[10px] font-medium uppercase tracking-wider">Remove</span>
        </button>
        <button
          onClick={() => setActiveTab('config')}
          className={`flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'config' ? 'text-teal-400' : 'text-zinc-500'} ${isMobile ? 'flex-1' : 'w-full aspect-square mb-4'}`}
        >
          <Settings size={isMobile ? 22 : 20} />
          <span className="text-[10px] font-medium uppercase tracking-wider">Config</span>
        </button>
        <button
          onClick={() => setActiveTab('export')}
          className={`flex flex-col items-center justify-center gap-1 transition-all ${activeTab === 'export' ? 'text-teal-400' : 'text-zinc-500'} ${isMobile ? 'flex-1' : 'w-full aspect-square'}`}
        >
          <Download size={isMobile ? 22 : 20} />
          <span className="text-[10px] font-medium uppercase tracking-wider">Export</span>
        </button>
      </nav>

      {/* 2. Settings Panel (Middle) */}
      <aside className={`${isMobile ? 'order-2 flex-1 overflow-hidden' : 'order-2 w-80 border-r'} border-zinc-800 bg-zinc-950 flex flex-col z-20`}>
        <div className="h-14 px-5 border-b border-zinc-900 flex items-center justify-between shrink-0 bg-zinc-950/80 backdrop-blur-sm">
          <h2 className="font-semibold text-sm text-zinc-100 uppercase tracking-widest flex items-center gap-2">
            {activeTab === 'remove' && <><Sparkles size={16} className="text-teal-400" /> Subject Isolation</>}
            {activeTab === 'config' && <><Settings size={16} className="text-zinc-400" /> Settings</>}
            {activeTab === 'export' && <><Download size={16} className="text-zinc-400" /> Export</>}
          </h2>
          <button onClick={handleReset} className="text-zinc-600 hover:text-red-400 transition-colors">
            <RefreshCcw size={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
          {activeTab === 'remove' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50 mb-4">
                <p className="text-[11px] text-zinc-400 leading-relaxed uppercase tracking-wide font-bold mb-2">How it works</p>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Powered by Gemini Vision AI to identify and isolate the foreground subject from complex backgrounds.
                </p>
              </div>

              <ApiKeyInput
                serviceName="Gemini"
                localStorageKey="gemini_api_key"
                onKeyChange={setApiKey}
                description="Required for Smart BG removal"
              />

              <Button
                className="w-full h-12 bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 border-none shadow-lg shadow-teal-500/20 active:scale-[0.98] transition-all"
                onClick={handleRemoveBackground}
                isLoading={isProcessing}
                disabled={isProcessing || !apiKey}
              >
                <Eraser size={18} className="mr-2" />
                {isProcessing ? 'Removing...' : 'Remove Background'}
              </Button>

              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-500 text-xs shadow-sm">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'config' && (
            <div className="space-y-8 animate-in fade-in duration-300">
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
                <ul className="text-[11px] text-zinc-500 space-y-2">
                  <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-teal-500" /> High contrast edges work best</li>
                  <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-teal-500" /> Avoid extremely blurry areas</li>
                  <li className="flex items-center gap-2"><div className="w-1 h-1 rounded-full bg-teal-500" /> Single subject produces cleaner results</li>
                </ul>
              </section>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              {resultImage ? (
                <div className="space-y-4">
                  <div className="aspect-square rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900/50 flex items-center justify-center p-2 bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')]">
                    <img src={resultImage} className="max-w-full max-h-full object-contain" alt="No Background" />
                  </div>
                  <Button
                    className="w-full h-12 bg-white text-black hover:bg-zinc-200 border-none shadow-sm"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = resultImage;
                      link.download = `no-bg-${file.file.name.split('.')[0]}.png`;
                      link.click();
                    }}
                  >
                    <Download size={18} className="mr-2" /> Download PNG
                  </Button>
                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="secondary" className="h-10 border-zinc-800" disabled>
                      <Share2 size={16} className="mr-2" /> Share
                    </Button>
                    <Button variant="secondary" className="h-10 text-red-400 border-zinc-800" onClick={handleReset}>
                      <Trash2 size={16} className="mr-2" /> Reset
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-zinc-900 flex items-center justify-center mb-4">
                    <Layers size={20} className="text-zinc-700" />
                  </div>
                  <p className="text-sm text-zinc-500">Wait for subject isolation to complete.</p>
                </div>
              )}
            </div>
          )}
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
                <div className="absolute top-4 right-4 bg-teal-600/90 backdrop-blur text-[10px] text-white px-2 py-1 rounded border border-white/10 font-bold uppercase tracking-widest shadow-lg shadow-teal-500/20">Clean</div>

                <div className="absolute inset-y-0" style={{ left: `${sliderPosition}%` }}>
                  <div className="absolute inset-y-0 -left-px w-px bg-white/50"></div>
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center shadow-2xl text-teal-600 ring-2 ring-black/10">
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
                      <div className="absolute inset-0 border-2 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
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