import React, { useState, useMemo } from 'react';
import { ToolItem, ToolCategory } from '../types';
import {
    Search,
    Scissors, Music, Video, Image as ImageIcon,
    FileText, Code, Layers, Minimize2, Edit3,
    Crop, FileJson, Zap, ArrowRightLeft, Film, ListMusic, Wand2, QrCode, Eraser, Type, RefreshCcw, FileVideo, FileSpreadsheet
} from 'lucide-react';
import { VideoTrimmer } from './tools/VideoTrimmer';
import { ImageCompressor } from './tools/ImageCompressor';
import { VideoConverter } from './tools/VideoConverter';
import { AudioReplacer } from './tools/AudioReplacer';
import { VideoToGif } from './tools/VideoToGif';
import { AudioMerger } from './tools/AudioMerger';
import { AudioConverter } from './tools/AudioConverter';
import { ImageCropper } from './tools/ImageCropper';
import { PdfSuite } from './tools/DocSuite';
import { JsonFormatter } from './tools/JsonFormatter';
import { MagicImageEditor } from './tools/MagicImageEditor';
import { GifSuite } from './tools/GifSuite';
import { GifMaker } from './tools/GifMaker';
import { GifEditor } from './tools/GifEditor';
import { GifCompressor } from './tools/GifCompressor';
import { QrGenerator } from './tools/QrGenerator';
import { BackgroundRemover } from './tools/BackgroundRemover';
import { TextTools } from './tools/TextTools';
import { TextCleaner } from './tools/TextCleaner';
import { UniversalConverter } from './tools/UniversalConverter';
import { UniversalDocConverter } from './tools/UniversalDocConverter';
import { ApngMaker, VideoToApng, GifToApng, ApngToGif, ApngToWebp, ApngToMp4, MngToApng } from './tools/ApngTools';
import { WebpMaker, VideoToWebp, GifToWebp, JpgToWebp, PngToWebp, AvifToWebp, WebpToGif, WebpToJpg, WebpToPng, WebpToMp4 } from './tools/WebpTools';
import { SpreadsheetTools } from './tools/SpreadsheetTools';
import { Tooltip } from '../components/ui/Tooltip';

export const TOOLS: ToolItem[] = [
    {
        id: 'spreadsheet-tools',
        title: 'Spreadsheet Converter',
        description: 'Convert Excel to CSV, JSON, HTML or vice versa.',
        category: ToolCategory.DOCS,
        icon: FileSpreadsheet,
        component: <SpreadsheetTools />,
        popular: true
    },
    {
        id: 'universal-doc-converter',
        title: 'Universal Doc Converter',
        description: 'Convert Word, Markdown, HTML, and Images to PDF/HTML.',
        category: ToolCategory.DOCS,
        icon: ArrowRightLeft,
        component: <UniversalDocConverter />,
        popular: true
    },
    {
        id: 'bg-remover',
        title: 'Smart BG Remover',
        description: 'Instantly remove image backgrounds using AI.',
        category: ToolCategory.IMAGE,
        icon: Eraser,
        component: <BackgroundRemover />,
        popular: true
    },
    {
        id: 'video-to-gif',
        title: 'Video to GIF',
        description: 'Convert video clips to animated GIFs.',
        category: ToolCategory.VIDEO,
        icon: Video,
        component: <VideoToGif />,
        popular: true
    },
    {
        id: 'gif-editor',
        title: 'GIF Editor',
        description: 'Trim, crop, and add text to GIFs.',
        category: ToolCategory.IMAGE,
        icon: Edit3,
        component: <GifEditor />
    },
    {
        id: 'gif-compressor',
        title: 'GIF Compressor',
        description: 'Reduce GIF file size efficiently.',
        category: ToolCategory.IMAGE,
        icon: Minimize2,
        component: <GifCompressor />
    },
    {
        id: 'magic-editor',
        title: 'Magic Image Editor',
        description: 'Edit images with text prompts using Gemini AI.',
        category: ToolCategory.IMAGE,
        icon: Wand2,
        component: <MagicImageEditor />,
        popular: true
    },
    {
        id: 'video-trimmer',
        title: 'Video Trimmer',
        description: 'Cut clips with frame precision and volume control.',
        category: ToolCategory.VIDEO,
        icon: Scissors,
        component: <VideoTrimmer />,
        popular: true
    },
    {
        id: 'video-converter',
        title: 'Video Converter',
        description: 'Convert MP4, MOV, AVI, GIF, MKV instantly.',
        category: ToolCategory.VIDEO,
        icon: ArrowRightLeft,
        component: <VideoConverter />,
        popular: true
    },
    {
        id: 'gif-maker',
        title: 'GIF Maker',
        description: 'Create animated GIFs from multiple images.',
        category: ToolCategory.IMAGE,
        icon: Film,
        component: <GifMaker />
    },
    {
        id: 'qr-generator',
        title: 'QR Generator',
        description: 'Create customizable QR codes for links and text.',
        category: ToolCategory.IMAGE,
        icon: QrCode,
        component: <QrGenerator />
    },
    {
        id: 'audio-replace',
        title: 'Audio Replacer',
        description: 'Swap audio tracks in videos with volume mixing.',
        category: ToolCategory.VIDEO,
        icon: Layers,
        component: <AudioReplacer />
    },
    {
        id: 'image-compressor',
        title: 'Image Compressor',
        description: 'Reduce file size without losing visible quality.',
        category: ToolCategory.IMAGE,
        icon: Minimize2,
        component: <ImageCompressor />,
        popular: true
    },
    {
        id: 'image-cropper',
        title: 'Image Cropper',
        description: 'Resize and crop images for social media.',
        category: ToolCategory.IMAGE,
        icon: Crop,
        component: <ImageCropper />
    },
    {
        id: 'audio-merger',
        title: 'Audio Merger',
        description: 'Join multiple audio files into one track.',
        category: ToolCategory.AUDIO,
        icon: ListMusic,
        component: <AudioMerger />,
        popular: true
    },
    {
        id: 'audio-converter',
        title: 'Audio Converter',
        description: 'Convert between MP3, WAV, AAC formats.',
        category: ToolCategory.AUDIO,
        icon: Music,
        component: <AudioConverter />
    },
    {
        id: 'pdf-tools',
        title: 'PDF Suite',
        description: 'Merge, split, or compress PDF documents.',
        category: ToolCategory.DOCS,
        icon: FileText,
        component: <PdfSuite />
    },
    {
        id: 'universal-converter',
        title: 'Universal Converter',
        description: 'Convert between JSON, XML, CSV, and YAML.',
        category: ToolCategory.DEV,
        icon: ArrowRightLeft,
        component: <UniversalConverter />,
        popular: true
    },
    // APNG Tools
    {
        id: 'apng-maker',
        title: 'APNG Maker',
        description: 'Create animated PNGs from image sequences.',
        category: ToolCategory.IMAGE,
        icon: Film,
        component: <ApngMaker />
    },
    {
        id: 'video-to-apng',
        title: 'Video to APNG',
        description: 'Convert video clips to APNG animations.',
        category: ToolCategory.VIDEO,
        icon: FileVideo,
        component: <VideoToApng />
    },
    {
        id: 'gif-to-apng',
        title: 'GIF to APNG',
        description: 'Convert GIF animations to APNG.',
        category: ToolCategory.IMAGE,
        icon: ImageIcon,
        component: <GifToApng />
    },
    {
        id: 'apng-to-gif',
        title: 'APNG to GIF',
        description: 'Convert APNG files to standard GIF.',
        category: ToolCategory.IMAGE,
        icon: ImageIcon,
        component: <ApngToGif />
    },
    {
        id: 'apng-to-webp',
        title: 'APNG to WebP',
        description: 'Convert APNG to animated WebP.',
        category: ToolCategory.IMAGE,
        icon: ImageIcon,
        component: <ApngToWebp />
    },
    {
        id: 'apng-to-mp4',
        title: 'APNG to MP4',
        description: 'Convert APNG animations to MP4 video.',
        category: ToolCategory.IMAGE,
        icon: ImageIcon,
        component: <ApngToMp4 />
    },
    {
        id: 'mng-to-apng',
        title: 'MNG to APNG',
        description: 'Convert MNG files to APNG.',
        category: ToolCategory.IMAGE,
        icon: ImageIcon,
        component: <MngToApng />
    },
    // WebP Tools
    {
        id: 'webp-maker',
        title: 'WebP Maker',
        description: 'Create animated WebP from images.',
        category: ToolCategory.IMAGE,
        icon: Film,
        component: <WebpMaker />
    },
    {
        id: 'video-to-webp',
        title: 'Video to WebP',
        description: 'Convert video to animated WebP.',
        category: ToolCategory.VIDEO,
        icon: FileVideo,
        component: <VideoToWebp />
    },
    {
        id: 'gif-to-webp',
        title: 'GIF to WebP',
        description: 'Convert GIF to animated WebP.',
        category: ToolCategory.IMAGE,
        icon: ImageIcon,
        component: <GifToWebp />
    },
    {
        id: 'jpg-to-webp',
        title: 'JPG to WebP',
        description: 'Convert JPG images to WebP.',
        category: ToolCategory.IMAGE,
        icon: ImageIcon,
        component: <JpgToWebp />
    },
    {
        id: 'png-to-webp',
        title: 'PNG to WebP',
        description: 'Convert PNG images to WebP.',
        category: ToolCategory.IMAGE,
        icon: ImageIcon,
        component: <PngToWebp />
    },
    {
        id: 'avif-to-webp',
        title: 'AVIF to WebP',
        description: 'Convert AVIF images to WebP.',
        category: ToolCategory.IMAGE,
        icon: ImageIcon,
        component: <AvifToWebp />
    },
    {
        id: 'webp-to-gif',
        title: 'WebP to GIF',
        description: 'Convert WebP to GIF animation.',
        category: ToolCategory.IMAGE,
        icon: ImageIcon,
        component: <WebpToGif />
    },
    {
        id: 'webp-to-jpg',
        title: 'WebP to JPG',
        description: 'Convert WebP to JPG image.',
        category: ToolCategory.IMAGE,
        icon: ImageIcon,
        component: <WebpToJpg />
    },
    {
        id: 'webp-to-png',
        title: 'WebP to PNG',
        description: 'Convert WebP to PNG image.',
        category: ToolCategory.IMAGE,
        icon: ImageIcon,
        component: <WebpToPng />
    },
    {
        id: 'webp-to-mp4',
        title: 'WebP to MP4',
        description: 'Convert WebP to MP4 video.',
        category: ToolCategory.IMAGE,
        icon: ImageIcon,
        component: <WebpToMp4 />
    },
    {
        id: 'json-parser',
        title: 'JSON Formatter',
        description: 'Beautify, minify, and validate JSON code.',
        category: ToolCategory.DEV,
        icon: FileJson,
        component: <JsonFormatter />
    },
    {
        id: 'text-tools',
        title: 'Fancy Text Generator',
        description: 'Generate stylish unicode text for social media.',
        category: ToolCategory.TEXT,
        icon: Type,
        component: <TextTools />,
        popular: true
    },
    {
        id: 'text-cleaner',
        title: 'Text Cleaner',
        description: 'Remove repetitive phrases and clean formatting.',
        category: ToolCategory.TEXT,
        icon: RefreshCcw,
        component: <TextCleaner />
    },
];

import { useNavigate } from 'react-router-dom';

// ... imports ...

import { useIsMobile } from '../hooks/useIsMobile';

interface DashboardProps {
    activeCategory: string;
}

export const Dashboard: React.FC<DashboardProps> = ({ activeCategory }) => {
    const navigate = useNavigate();
    const isMobile = useIsMobile();
    const [searchQuery, setSearchQuery] = useState('');

    const filteredTools = useMemo(() => {
        let tools = activeCategory === 'All'
            ? TOOLS
            : activeCategory === 'Media'
                ? TOOLS.filter(t => [ToolCategory.VIDEO, ToolCategory.AUDIO, ToolCategory.IMAGE].includes(t.category))
                : TOOLS.filter(t => t.category === activeCategory);

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            tools = tools.filter(t =>
                t.title.toLowerCase().includes(query) ||
                t.description.toLowerCase().includes(query)
            );
        }
        return tools;
    }, [activeCategory, searchQuery]);

    const handleToolClick = (tool: ToolItem) => {
        navigate(`/${tool.id}`);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Search Bar */}
            <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-zinc-500" />
                </div>
                <input
                    id="mobile-tool-search"
                    type="text"
                    className="block w-full pl-10 pr-3 py-3 border border-zinc-800 rounded-xl leading-5 bg-zinc-900/50 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:bg-zinc-900 focus:ring-1 focus:ring-primary focus:border-primary sm:text-sm transition-colors"
                    placeholder="Search tools..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredTools.map((tool) => (
                    <div
                        key={tool.id}
                        onClick={() => handleToolClick(tool)}
                        className="group bg-surface hover:bg-zinc-800 border border-zinc-800/50 hover:border-primary/50 rounded-3xl transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/5 relative flex flex-col h-full"
                    >
                        {/* Background Glow Effect - Isolated in clipped container */}
                        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
                            <div className="absolute -right-10 -top-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl group-hover:bg-primary/20 transition-all duration-500"></div>
                        </div>

                        {/* Content - relative with z-index to sit above glow, NO overflow hidden */}
                        <div className="relative z-10 flex flex-col h-full p-6">
                            <div className="flex items-start justify-between mb-4">
                                {isMobile ? (
                                    <div className={`p-3 rounded-2xl transition-colors ${tool.category === ToolCategory.VIDEO ? 'bg-pink-500/10 text-pink-500 group-hover:bg-pink-500/20' :
                                        tool.category === ToolCategory.IMAGE ? 'bg-blue-500/10 text-blue-500 group-hover:bg-blue-500/20' :
                                            tool.category === ToolCategory.AUDIO ? 'bg-violet-500/10 text-violet-500 group-hover:bg-violet-500/20' :
                                                tool.category === ToolCategory.DOCS ? 'bg-red-500/10 text-red-500 group-hover:bg-red-500/20' :
                                                    tool.category === ToolCategory.TEXT ? 'bg-orange-500/10 text-orange-500 group-hover:bg-orange-500/20' :
                                                        'bg-yellow-500/10 text-yellow-500 group-hover:bg-yellow-500/20'
                                        }`}>
                                        <tool.icon size={24} />
                                    </div>
                                ) : (
                                    <Tooltip content={tool.category} position="right">
                                        <div className={`p-3 rounded-2xl transition-colors ${tool.category === ToolCategory.VIDEO ? 'bg-pink-500/10 text-pink-500 group-hover:bg-pink-500/20' :
                                            tool.category === ToolCategory.IMAGE ? 'bg-blue-500/10 text-blue-500 group-hover:bg-blue-500/20' :
                                                tool.category === ToolCategory.AUDIO ? 'bg-violet-500/10 text-violet-500 group-hover:bg-violet-500/20' :
                                                    tool.category === ToolCategory.DOCS ? 'bg-red-500/10 text-red-500 group-hover:bg-red-500/20' :
                                                        tool.category === ToolCategory.TEXT ? 'bg-orange-500/10 text-orange-500 group-hover:bg-orange-500/20' :
                                                            'bg-yellow-500/10 text-yellow-500 group-hover:bg-yellow-500/20'
                                            }`}>
                                            <tool.icon size={24} />
                                        </div>
                                    </Tooltip>
                                )}
                                {tool.popular && (
                                    isMobile ? (
                                        <span className="bg-zinc-800 text-zinc-300 text-xs px-2 py-1 rounded-full border border-zinc-700 font-medium">
                                            Popular
                                        </span>
                                    ) : (
                                        <Tooltip content="Trending among users">
                                            <span className="bg-zinc-800 text-zinc-300 text-xs px-2 py-1 rounded-full border border-zinc-700 font-medium">
                                                Popular
                                            </span>
                                        </Tooltip>
                                    )
                                )}
                            </div>

                            <div className="flex-1">
                                <h3 className="text-xl font-bold text-zinc-100 mb-2 group-hover:text-white transition-colors">
                                    {tool.title}
                                </h3>
                                <p className="text-sm text-zinc-400 group-hover:text-zinc-300 line-clamp-2">
                                    {tool.description}
                                </p>
                            </div>

                            <div className="mt-6 flex items-center text-sm font-medium text-zinc-500 group-hover:text-primary transition-colors pt-2">
                                Try now <span className="ml-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">→</span>
                            </div>
                        </div>
                    </div>
                ))}

                {filteredTools.length === 0 && (
                    <div className="col-span-full text-center py-12 text-zinc-500">
                        <p>No tools found matching "{searchQuery}"</p>
                    </div>
                )}
            </div>
        </div>
    );
};