/// <reference lib="dom" />
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { FileUploader } from '../../components/FileUploader';
import { Button } from '../../components/ui/Button';
import { ApiKeyInput } from '../../components/ui/ApiKeyInput';
import { FileData } from '../../types';
import { Eraser, Download, RefreshCcw, Sliders, AlertCircle, Layers } from 'lucide-react';

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
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 animate-slide-up">
      {/* Controls Sidebar */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-surface p-6 rounded-2xl border border-zinc-800 space-y-6">
          <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${isMobile ? 'text-center' : ''}`}>
            <h3 className="text-lg font-semibold truncate max-w-[200px] sm:max-w-none" title={file.file.name}>{file.file.name}</h3>
            <button onClick={handleReset} className={`text-xs text-red-400 hover:underline flex items-center gap-1 ${isMobile ? 'w-full justify-center' : ''}`}>
              <RefreshCcw size={12} /> New Project
            </button>
          </div>

          <div className="space-y-4">
            <div className={`bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50 ${isMobile ? 'text-center' : ''}`}>
              <p className="text-sm text-zinc-400">
                This tool uses <strong>Gemini 2.5 Flash</strong> to identify the main subject and regenerate the image without the background context.
              </p>
            </div>

            <ApiKeyInput
              serviceName="Gemini"
              localStorageKey="gemini_api_key"
              onKeyChange={setApiKey}
              description="Required for background removal"
            />

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-3 text-red-400 text-sm">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {!resultImage ? (
              <Button
                className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 hover:from-teal-600 hover:to-cyan-700 border-none shadow-lg shadow-teal-500/20 h-12"
                onClick={handleRemoveBackground}
                isLoading={isProcessing}
                disabled={isProcessing || !apiKey}
              >
                {isProcessing ? 'Processing...' : 'Remove Background'}
              </Button>
            ) : (
              <Button
                variant="secondary"
                className="w-full h-12"
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = resultImage;
                  link.download = `no-bg-${file.file.name.split('.')[0]}.png`;
                  link.click();
                }}
              >
                <Download size={18} className="mr-2" /> Download Result
              </Button>
            )}
          </div>
        </div>

        <div className="bg-surface p-6 rounded-2xl border border-zinc-800">
          <h4 className="font-semibold text-zinc-200 mb-2 flex items-center gap-2">
            <Layers size={16} className="text-teal-400" /> Best Results
          </h4>
          <ul className="text-sm text-zinc-400 list-disc list-inside space-y-1">
            <li>Use images with clear subjects.</li>
            <li>High contrast between subject and background helps.</li>
            <li>Good lighting improves edge detection.</li>
          </ul>
        </div>
      </div>

      {/* Preview Area */}
      <div className="lg:col-span-2">
        <div className="bg-surface rounded-3xl p-2 border border-zinc-800 h-[600px] relative select-none shadow-2xl overflow-hidden group">
          <div className="relative w-full h-full rounded-2xl overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')] flex items-center justify-center bg-zinc-900">

            {/* Image Rendering */}
            {resultImage ? (
              // Comparison View
              <div className="relative w-full h-full">
                {/* Result Image (Bottom/Right Layer) - Full Width */}
                <img
                  src={resultImage}
                  alt="No Background"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                />

                {/* Original Image (Top/Left Layer) - Clipped */}
                <img
                  src={file.previewUrl}
                  alt="Original"
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                  style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                />

                {/* Labels */}
                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur text-white text-xs px-2 py-1 rounded border border-white/10 font-bold pointer-events-none">
                  Original
                </div>
                <div className="absolute top-4 right-4 bg-teal-600/90 backdrop-blur text-white text-xs px-2 py-1 rounded border border-white/10 font-bold shadow-lg shadow-teal-500/20 pointer-events-none">
                  Removed BG
                </div>

                {/* Slider Handle & Line */}
                <div
                  className="absolute inset-y-0"
                  style={{ left: `${sliderPosition}%` }}
                >
                  <div className="absolute inset-y-0 -left-px w-0.5 bg-white shadow-[0_0_10px_rgba(0,0,0,0.5)]"></div>
                  <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-lg text-teal-600">
                    <Sliders size={16} className="rotate-90" />
                  </div>
                </div>

                {/* Invisible Range Input */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sliderPosition}
                  onChange={(e) => setSliderPosition(parseInt((e.target as HTMLInputElement).value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
                />
              </div>
            ) : (
              // Single Preview View
              <div className="relative w-full h-full">
                <img
                  src={file.previewUrl}
                  alt="Original"
                  className="w-full h-full object-contain"
                />
                {isProcessing && (
                  <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-10 animate-fade-in">
                    <div className="w-16 h-16 relative">
                      <div className="absolute inset-0 border-4 border-zinc-700 rounded-full"></div>
                      <div className="absolute inset-0 border-4 border-teal-500 border-t-transparent rounded-full animate-spin"></div>
                    </div>
                    <p className="text-white font-bold mt-4 text-lg">Analyzing Image...</p>
                    <p className="text-teal-300 text-sm">Identifying subject and removing background</p>
                  </div>
                )}
                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur text-white text-xs px-2 py-1 rounded border border-white/10 font-bold">
                  Original
                </div>
              </div>
            )}
          </div>
        </div>

        {resultImage && (
          <p className="text-center text-zinc-500 text-sm mt-4 animate-fade-in">
            Drag the slider to compare before and after
          </p>
        )}
      </div>
    </div>
  );
};