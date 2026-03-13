/// <reference lib="dom" />
import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { FileUploader } from '../../components/FileUploader';
import { Button } from '../../components/ui/Button';
import { ApiKeyInput } from '../../components/ui/ApiKeyInput';
import { FileData } from '../../types';
import { Maximize2, Download, RefreshCcw, Sliders, Sparkles, AlertCircle, Settings, ChevronDown } from 'lucide-react';
import { SectionLabel, SliderControl } from '../../components/EditorControls';

import { useIsMobile } from '../../hooks/useIsMobile';

const GEMINI_MODELS = [
    { id: 'gemini-3-pro-image-preview', name: 'Gemini 3 Pro Image (Nano Banana Pro)' },
    { id: 'gemini-2.5-flash-image', name: 'Gemini 2.5 Flash Image (Nano Banana)' }
];

const UPSCALE_OPTIONS = [
    { id: '2x', name: '2x Upscale' },
    { id: '4x', name: '4x Upscale' },
    { id: 'enhance', name: 'Detail Enhancement (No Resize)' },
    { id: 'denoise', name: 'Noise Reduction' }
];

export const UpscaleImage: React.FC = () => {
    const isMobile = useIsMobile();
    const [file, setFile] = useState<FileData | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [resultImage, setResultImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [sliderPosition, setSliderPosition] = useState(50);
    const [apiKey, setApiKey] = useState('');

    const [selectedModel, setSelectedModel] = useState(GEMINI_MODELS[0].id);
    const [upscaleOption, setUpscaleOption] = useState(UPSCALE_OPTIONS[0].id);
    const [customPrompt, setCustomPrompt] = useState('');
    const [isScaleDropdownOpen, setIsScaleDropdownOpen] = useState(false);

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

    const generatePrompt = () => {
        let basePrompt = "Upscale and enhance this image. ";

        if (upscaleOption === '2x') basePrompt += "Increase the resolution by 2x. ";
        if (upscaleOption === '4x') basePrompt += "Increase the resolution by 4x. ";
        if (upscaleOption === 'enhance') basePrompt += "Sharpen all details, improve lighting, and bring out high frequency textures without increasing resolution. ";
        if (upscaleOption === 'denoise') basePrompt += "Remove all noise and grain, smoothing out flat surfaces while preserving edge sharpness. ";

        if (customPrompt.trim()) {
            basePrompt += `Additional instructions: ${customPrompt.trim()}`;
        } else {
            basePrompt += "Make it look highly detailed, crisp, and professional.";
        }

        return basePrompt;
    };

    const handleUpscale = async () => {
        if (!file) return;

        setIsProcessing(true);
        setError(null);

        try {
            if (!apiKey) throw new Error("Please enter your Gemini API Key first");

            const base64Data = await getBase64(file.file);
            const ai = new GoogleGenAI({
                apiKey,
                httpOptions: { apiVersion: 'v1alpha' }
            });

            const promptStr = generatePrompt();

            const response = await ai.models.generateContent({
                model: selectedModel,
                contents: {
                    parts: [
                        {
                            inlineData: {
                                data: base64Data,
                                mimeType: file.file.type,
                            },
                        },
                        {
                            text: promptStr,
                        },
                    ],
                },
                config: {
                    responseModalities: ["IMAGE"],
                }
            });

            // Extract image from response
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
                throw new Error("No image generated by the model. Try a different model or settings.");
            }

        } catch (err) {
            console.error(err);
            let message = (err as Error).message || "An error occurred while upscaling the image.";

            if (message.includes('429') || message.toLowerCase().includes('quota')) {
                message = "Usage limit exceeded. Please try again later or check your API quota.";
            } else if (message.includes('401') || message.toLowerCase().includes('key')) {
                message = "Invalid API Key. Please verify your credentials.";
            } else if (message.includes('{')) {
                try {
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
                    <h2 className="text-4xl font-black tracking-tight text-white flex items-center justify-center gap-3 font-unbounded">
                        <Maximize2 size={32} /> AI Image Upscaler
                    </h2>
                    <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
                        Enhance and upscale your images with state-of-the-art Gemini AI models.
                    </p>
                </div>

                {/* Upload Area */}
                <div className="flex-1 w-full max-w-4xl mx-auto bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-2 flex flex-col items-center justify-center relative overflow-hidden group hover:border-blue-500/50 transition-colors shadow-2xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <FileUploader
                        onFileSelect={setFile}
                        accept="image/*"
                        label="Upload Image to Upscale"
                        description="JPG, PNG, WEBP supported"
                        className="w-full h-full border-2 border-dashed border-zinc-800 hover:border-blue-500/50 bg-zinc-950/50 rounded-2xl transition-all"
                    />
                </div>

                {/* Feature Highlights */}
                <div className="flex-none max-w-4xl mx-auto w-full grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
                    {[
                        { icon: Maximize2, label: 'Up to 4x', desc: 'Increase Resolution' },
                        { icon: Sparkles, label: 'Gemini Models', desc: 'Latest Gen AI' },
                        { icon: Sliders, label: 'Live Preview', desc: 'Compare before/after' },
                        { icon: RefreshCcw, label: 'Enhancement', desc: 'Noise Reduction' }
                    ].map((feat, i) => (
                        <div key={i} className="flex flex-col items-center text-center space-y-2 p-4 rounded-xl bg-zinc-900/30 border border-zinc-800/30 backdrop-blur-sm hover:bg-zinc-900/50 transition-colors">
                            <div className="p-2 bg-blue-500/10 rounded-full text-blue-400">
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

            {/* Settings Panel (Middle) */}
            <aside className={`${isMobile ? 'order-2 flex-1 overflow-hidden transition-all' : 'order-2 w-80 border-r'} border-zinc-800 bg-zinc-950 flex flex-col z-20`}>
                <div className="h-14 px-5 border-b border-zinc-900 flex items-center justify-between shrink-0 bg-zinc-950/80 backdrop-blur-sm">
                    <h2 className="font-black text-xs text-blue-400 uppercase tracking-widest flex items-center gap-2 font-unbounded">
                        <Maximize2 size={20} /> AI Upscaler
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
                                description="Required for AI processing"
                                models={GEMINI_MODELS}
                                selectedModel={selectedModel}
                                onModelChange={setSelectedModel}
                            />

                            <section className="space-y-2 relative z-10">
                                <SectionLabel>Upscale Settings</SectionLabel>
                                <div className="relative min-w-0">
                                    <button
                                        type="button"
                                        onClick={() => setIsScaleDropdownOpen(!isScaleDropdownOpen)}
                                        disabled={isProcessing}
                                        className={`w-full bg-zinc-900 border ${isScaleDropdownOpen ? 'border-blue-500/50' : 'border-zinc-800'} hover:border-blue-500/50 rounded-xl p-3 text-sm text-zinc-200 outline-none focus:ring-1 focus:ring-blue-500 transition-all flex items-center justify-between font-medium ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                                    >
                                        <span className="truncate pr-4 text-left">{UPSCALE_OPTIONS.find(o => o.id === upscaleOption)?.name}</span>
                                        <ChevronDown className={`shrink-0 text-zinc-500 transition-transform ${isScaleDropdownOpen ? 'rotate-180' : ''}`} size={16} />
                                    </button>

                                    {isScaleDropdownOpen && !isProcessing && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-zinc-800 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden z-20 animate-in fade-in slide-in-from-top-2">
                                            <div className="max-h-60 overflow-y-auto custom-scrollbar p-1 flex flex-col gap-1">
                                                {UPSCALE_OPTIONS.map(o => (
                                                    <button
                                                        key={o.id}
                                                        onClick={() => {
                                                            setUpscaleOption(o.id);
                                                            setIsScaleDropdownOpen(false);
                                                        }}
                                                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all flex items-center gap-2 ${upscaleOption === o.id ? 'bg-blue-500/10 text-blue-400 font-bold' : 'text-zinc-300 hover:bg-zinc-700'}`}
                                                    >
                                                        <div className={`w-1.5 h-1.5 rounded-full ${upscaleOption === o.id ? 'bg-blue-400' : 'bg-transparent'}`} />
                                                        {o.name}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>

                            <section>
                                <SectionLabel>Custom Instructions (Optional)</SectionLabel>
                                <textarea
                                    value={customPrompt}
                                    onChange={(e) => setCustomPrompt((e.target as HTMLTextAreaElement).value)}
                                    placeholder='e.g., "Make textures more gritty" or "Soften the lighting"'
                                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-sm text-zinc-200 outline-none focus:ring-1 focus:ring-blue-500 min-h-[80px] resize-none placeholder:text-zinc-600 transition-all font-medium"
                                    disabled={isProcessing}
                                />
                            </section>

                            {!resultImage ? (
                                <Button className="w-full h-12 border-none shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all" onClick={handleUpscale} isLoading={isProcessing} disabled={isProcessing || !apiKey} >
                                    <Maximize2 size={18} className="mr-2" />
                                    {isProcessing ? 'Processing AI...' : 'Upscale Image'}
                                </Button>
                            ) : (
                                <div className="space-y-3 animate-slide-up">
                                    <Button className="w-full h-12 bg-white text-black hover:bg-zinc-200 border-none shadow-lg font-bold uppercase text-xs tracking-widest" onClick={() => {
                                            const link = document.createElement('a');
                                            link.href = resultImage;
                                            link.download = `upscaled-${file.file.name}`;
                                            link.click();
                                        }}
                                    >
                                        <Download size={18} className="mr-2" /> Download Image
                                    </Button>
                                    <Button variant="secondary" className="w-full h-12 border-zinc-800" onClick={handleReset}>
                                        <RefreshCcw size={16} className="mr-2" /> Process Another
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

                        {resultImage && (
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
                        )}

                        <section className="bg-zinc-900/30 p-4 rounded-xl border border-zinc-800 mt-auto">
                            <h4 className="font-semibold text-zinc-400 mb-2 text-[10px] uppercase tracking-widest flex items-center gap-2 font-bold">
                                <Sparkles size={14} className="text-blue-400" /> Pro Tip
                            </h4>
                            <p className="text-[10px] text-zinc-500 font-bold tracking-tight">
                                For best results on older images, try the Noise Reduction option before running a 4x upscale.
                            </p>
                        </section>
                    </div>
                </div>
            </aside>

            {/* Preview Area (Top on Mobile) */}
            <main className={`order-1 ${isMobile ? 'h-[45vh]' : 'flex-1'} relative bg-[#09090b] flex items-center justify-center p-4 md:p-8 overflow-hidden shrink-0 border-b md:border-b-0 border-zinc-900 shadow-inner`}>
                {/* Grid Pattern */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                    style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />

                <div className={`relative shadow-2xl transition-all duration-500 ease-out border border-zinc-800/50 bg-black/40 rounded-2xl overflow-hidden ${isMobile ? 'w-full h-full' : 'w-full h-full max-h-[800px]'}`}>
                    <div className="relative w-full h-full rounded-2xl overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/checkerboard.png')] flex items-center justify-center p-4">
                        {resultImage ? (
                            <div className="relative w-full h-full group">
                                <img src={resultImage} alt="Upscaled" className="absolute inset-0 w-full h-full object-contain pointer-events-none" />
                                <img
                                    src={file.previewUrl}
                                    alt="Original"
                                    className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                                    style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
                                />

                                {/* Labels */}
                                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur text-[10px] text-white px-2 py-1 rounded border border-white/10 font-bold pointer-events-none tracking-widest uppercase">
                                    Before
                                </div>
                                <div className="absolute top-4 right-4 bg-blue-600/90 backdrop-blur text-[10px] text-white px-2 py-1 rounded border border-white/10 font-bold shadow-lg shadow-blue-500/20 pointer-events-none tracking-widest uppercase">
                                    After
                                </div>

                                {/* Slider UI */}
                                <div className="absolute inset-y-0" style={{ left: `${sliderPosition}%` }}>
                                    <div className="absolute inset-y-0 -left-px w-0.5 bg-white shadow-xl"></div>
                                    <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center shadow-2xl ring-4 ring-black/20 text-blue-600">
                                        <Sliders size={14} className="rotate-90" />
                                    </div>
                                </div>

                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={sliderPosition}
                                    onChange={(e) => setSliderPosition(parseInt(e.target.value))}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-20"
                                />
                            </div>
                        ) : (
                            <div className="relative w-full h-full flex items-center justify-center">
                                <img src={file.previewUrl} alt="Original" className="max-w-full max-h-full object-contain" />
                                {isProcessing && (
                                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-10 animate-fade-in rounded-2xl">
                                        <div className="w-16 h-16 relative">
                                            <div className="absolute inset-0 border-4 border-zinc-700/30 rounded-full"></div>
                                            <div className="absolute inset-0 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                        </div>
                                        <p className="text-white font-bold mt-6 tracking-widest uppercase text-xs">Upscaling Image...</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};
