import React, { useState, useMemo } from 'react';
import { ToolItem, ToolCategory } from '../types';
import {
    Search,
    Scissors, Music, Video, Image as ImageIcon,
    FileText, Code, Layers, Minimize2, Edit3,
    Crop, FileJson, Zap, ArrowRightLeft, Film, ListMusic, Wand2, QrCode, Eraser, Type, RefreshCcw, FileVideo, FileSpreadsheet, Maximize2, PenTool
} from 'lucide-react';
import { VideoTrimmer } from './tools/VideoTrimmer';
import { ImageCompressor } from './tools/ImageCompressor';
import { VideoConverter } from './tools/VideoConverter';
import { VideoCompressor } from './tools/VideoCompressor';
import { AudioReplacer } from './tools/AudioReplacer';
import { VideoToGif } from './tools/VideoToGif';
import { AudioMerger } from './tools/AudioMerger';
import { AudioConverter } from './tools/AudioConverter';
import { AudioTrimmer } from './tools/AudioTrimmer';
import { ImageCropper } from './tools/ImageCropper';
import { PdfSuite } from './tools/DocSuite';
import { CodeFormatter } from './tools/CodeFormatter';
import { MagicImageEditor } from './tools/MagicImageEditor';
import { GifSuite } from './tools/GifSuite';
import { GifMaker } from './tools/GifMaker';
import { GifEditor } from './tools/GifEditor';
import { GifCompressor } from './tools/GifCompressor';
import { ImageEditor } from './tools/ImageEditor';
import { QrGenerator } from './tools/QrGenerator';
import { BackgroundRemover } from './tools/BackgroundRemover';
import { TextTools } from './tools/TextTools';
import { TextCleaner } from './tools/TextCleaner';
import { UniversalConverter } from './tools/UniversalConverter';
import { UniversalDocConverter } from './tools/UniversalDocConverter';
import { ApngMaker, VideoToApng, GifToApng, ApngToGif, ApngToWebp, ApngToMp4, MngToApng } from './tools/ApngTools';
import { WebpMaker, VideoToWebp, GifToWebp, JpgToWebp, PngToWebp, AvifToWebp, WebpToGif, WebpToJpg, WebpToPng, WebpToMp4 } from './tools/WebpTools';
import { SpreadsheetTools } from './tools/SpreadsheetTools';
import { QuickVideoEditor } from './tools/QuickVideoEditor';
import { PdfToText } from './tools/PdfToText';
import { TextToPdf } from './tools/TextToPdf';
import { ImageResizer } from './tools/ImageResizer';
import { PdfToJpg } from './tools/PdfToJpg';
import { SignatureGenerator } from './tools/SignatureGenerator';
import { TextUtilities } from './tools/TextUtilities';
import { Tooltip } from '../components/ui/Tooltip';
import { MarkdownCreatorIcon } from '../components/icons/MarkdownCreatorIcon';
import { MarkdownCreator } from './tools/MarkdownCreator';
import { ImageConverter } from './tools/ImageConverter';
import { UpscaleImage } from './tools/UpscaleImage';
import { ImageToIco } from './tools/ImageToIco';

export const TOOLS: ToolItem[] = [
    {
        id: 'image-converter',
        title: 'Image Converter',
        description: 'Batch convert images between PNG, JPG, and WebP.',
        category: ToolCategory.IMAGE,
        icon: RefreshCcw,
        component: <ImageConverter />,
        popular: true,
        guideTitle: 'How to batch convert images for web optimization',
        guideContent: 'Converting images to modern formats like WebP can significantly improve your website loading speed. Our batch converter allows you to transform multiple PNGs or JPGs into optimized WebP files instantly, ensuring high quality with smaller file sizes.',
        faqs: [
            { question: 'What formats can I convert?', answer: 'You can convert between PNG, JPG, WebP, and more.' },
            { question: 'Is there a file size limit?', answer: 'The tool handles large files, but browser memory limits apply (typically up to 100MB per file).' }
        ],
        specs: [
            { label: 'Input Formats', value: 'PNG, JPG, WebP, AVIF, BMP' },
            { label: 'Output Formats', value: 'PNG, JPG, WebP' },
            { label: 'Batch Support', value: 'Yes, multi-file select' }
        ],
        privacyNotes: 'Files are processed locally using your browser. No images are uploaded to any server.'
    },
    {
        id: 'image-upscaler',
        title: 'AI Image Upscaler',
        description: 'Enhance and upscale images using Gemini AI.',
        category: ToolCategory.IMAGE,
        icon: Maximize2,
        component: <UpscaleImage />,
        popular: true,
        guideTitle: 'How to upscale and enhance your images with AI',
        guideContent: 'Our AI Image Upscaler uses advanced Gemini models to increase the resolution of your images while recovering lost details and removing noise. Perfect for low-resolution photos, artwork, and web graphics.',
        faqs: [
            { question: 'What AI models are supported?', answer: 'We support the latest Gemini Flash and Pro models for optimal speed and quality.' },
            { question: 'Is my API key safe?', answer: 'Yes, your API key is stored locally in your browser and never sent to our servers.' }
        ],
        specs: [
            { label: 'Models', value: 'Gemini 2.5 Flash/Pro, Gemini 2.0' },
            { label: 'Options', value: '2x, 4x, Denoise, Enhance' },
            { label: 'Privacy', value: 'Requires API Key' }
        ],
        comingSoon: true,
        privacyNotes: 'Processing is done via the Google Gemini API using your personal key.'
    },
    {
        id: 'signature-generator',
        title: 'Sign to Gif',
        description: 'Create animated signatures and export as GIF/MP4.',
        category: ToolCategory.VIDEO,
        icon: PenTool,
        component: <SignatureGenerator />,
        popular: true,
        guideTitle: 'How to create a professional animated signature',
        guideContent: 'Custom animated signatures add a personal touch to your emails and messages. Draw your signature on the digital canvas, adjust the stroke speed, and export as a smooth GIF or MP4 to use in Outlook, Gmail, or social media.',
        faqs: [
            { question: 'Can I change the signature color?', answer: 'Yes, you can customize the stroke color and background before exporting.' },
            { question: 'Is the signature vector-based?', answer: 'The drawing is captured at high resolution to ensure smooth animation playback.' }
        ],
        specs: [
            { label: 'Export Formats', value: 'GIF, MP4' },
            { label: 'Canvas Type', value: 'Sensitive Pressure Pad' },
            { label: 'Speed Control', value: 'Variable playout speed' }
        ],
        privacyNotes: 'Your signature remains private. The drawing process happens entirely on your device canvas.'
    },
    {
        id: 'image-editor',
        title: 'Image Editor',
        description: 'Edit images with layers, filters, and text.',
        category: ToolCategory.IMAGE,
        icon: Edit3,
        component: <ImageEditor />,
        popular: true,
        guideTitle: 'Master layer-based editing in your browser',
        guideContent: 'Our Image Editor provides a familiar workspace with layers, filters, and granular controls. Whether you are adding text overlays, applying vintage filters, or compositing multiple images, you can do it all without installing heavy software like Photoshop.',
        faqs: [
            { question: 'Does it support layers?', answer: 'Yes, you can manage multiple layers, toggle visibility, and adjust opacity for each.' },
            { question: 'Are there keyboard shortcuts?', answer: 'Yes, standard shortcuts like Ctrl+Z for undo and Ctrl+S for saving are supported.' }
        ],
        specs: [
            { label: 'Max Layers', value: 'Unlimited (Browser dependent)' },
            { label: 'Filters', value: '15+ Professional presets' },
            { label: 'Export Quality', value: 'Lossless PNG/JPG' }
        ],
        privacyNotes: 'We use Canvas API for local processing. No image data is sent to external servers.'
    },
    {
        id: 'gif-editor',
        title: 'GIF Editor',
        description: 'Trim, crop, and add text to GIFs.',
        category: ToolCategory.IMAGE,
        icon: Edit3,
        component: <GifEditor />,
        popular: true,
        guideTitle: 'How to trim and crop animated GIFs',
        guideContent: 'Perfect your animations by removing unwanted frames or focusing on a specific area. Our GIF Editor lets you trim the start and end of any GIF with frame precision, ensuring your loops are seamless and engaging.',
        faqs: [
            { question: 'Can I add text to a GIF?', answer: 'Yes, the editor allows adding customizable text layers to your animations.' },
            { question: 'Does editing reduce GIF quality?', answer: 'We use high-quality dithering algorithms to maintain visual integrity during re-encoding.' }
        ],
        specs: [
            { label: 'Frame Limit', value: 'Up to 200 frames per GIF' },
            { label: 'Tools', value: 'Trim, Crop, Resize, Annotate' },
            { label: 'Dithering', value: 'Floyd-Steinberg enabled' }
        ],
        privacyNotes: 'GIF frame extraction and re-assembly are done locally via WebAssembly.'
    },
    {
        id: 'video-to-gif',
        title: 'Video to GIF',
        description: 'Convert video clips to animated GIFs.',
        category: ToolCategory.VIDEO,
        icon: Video,
        component: <VideoToGif />,
        popular: true,
        guideTitle: 'How to make high-quality GIFs for Slack/Microsoft Teams',
        guideContent: 'GIFs are a great way to communicate in Slack or Microsoft Teams. To create a high-quality GIF, upload your video, select the best frame rate (10-15 fps is usually enough for chat), and ensure the file size stayes under 5MB for best performance in messaging apps.',
        faqs: [
            { question: 'Will my video have a watermark?', answer: 'No, AdopeCanva provides watermark-free GIF conversion.' },
            { question: 'What video formats are supported?', answer: 'We support MP4, MOV, AVI, and WebM for conversion to GIF.' }
        ],
        specs: [
            { label: 'Max Upload', value: '50MB' },
            { label: 'Output Format', value: 'GIF, MP4' },
            { label: 'Compatibility', value: 'Chrome, Safari, Edge' }
        ],
        privacyNotes: 'Processing happens entirely in your browser. Your video files are never uploaded to our servers.',
        beforeAfterImage: {
            before: 'https://images.unsplash.com/photo-1536240478700-b869070f9279?auto=format&fit=crop&q=80&w=1000',
            after: 'https://images.unsplash.com/photo-1541562232579-512a21359920?auto=format&fit=crop&q=80&w=1000',
            alt: 'Video to GIF conversion example'
        }
    },
    {
        id: 'audio-converter',
        title: 'Audio Converter',
        description: 'Convert between MP3, WAV, AAC formats.',
        category: ToolCategory.AUDIO,
        icon: Music,
        component: <AudioConverter />,
        popular: true,
        guideTitle: 'Convert high-quality audio files instantly',
        guideContent: 'Convert your music and voice recordings between all major formats. Whether you need a small MP3 for sharing or a lossless WAV for production, our converter handles the processing with high-fidelity sample rates.',
        faqs: [
            { question: 'Can I convert multiple files at once?', answer: 'Yes, you can select multiple audio files for batch conversion.' },
            { question: 'Is the quality preserved?', answer: 'Yes, we provide options for high bitrate (up to 320kbps) to ensure minimal loss during conversion.' }
        ],
        specs: [
            { label: 'Supported Formats', value: 'MP3, WAV, AAC, OGG, FLAC' },
            { label: 'Bitrate Options', value: '128k, 192k, 256k, 320k' },
            { label: 'Engine', value: 'FFmpeg.wasm' }
        ],
        privacyNotes: 'Your audio files are processed locally. Perfect for sensitive voice memos or unreleased tracks.'
    },
    {
        id: 'audio-trimmer',
        title: 'Audio Trimmer',
        description: 'Trim and cut audio with waveform visualization.',
        category: ToolCategory.AUDIO,
        icon: Scissors,
        component: <AudioTrimmer />,
        guideTitle: 'How to create custom ringtones and loops',
        guideContent: 'Easily cut any audio file to create short clips. Use our visual waveform editor to select the exact start and end points, apply fade-ins or fade-outs, and export your new clip in seconds.',
        faqs: [
            { question: 'Can I zoom into the waveform?', answer: 'Yes, the editor supports zooming for precise millisecond-level trimming.' },
            { question: 'What is the maximum file length?', answer: 'We recommend files under 30 minutes for optimal browser performance.' }
        ],
        specs: [
            { label: 'Waveform View', value: 'High-resolution Audio Canvas' },
            { label: 'Fade Effects', value: 'Automatic Fade-in/out support' },
            { label: 'Precision', value: '0.01 seconds' }
        ],
        privacyNotes: 'Waveform rendering and cutting happen entirely on your device.'
    },
    {
        id: 'text-tools',
        title: 'Fancy Text Generator',
        description: 'Generate stylish unicode text for social media.',
        category: ToolCategory.TEXT,
        icon: Type,
        component: <TextTools />,
        popular: true,
        guideTitle: 'Create stylish text for Instagram and social media',
        guideContent: 'Stand out on social media with unique fonts and stylish unicode characters. Simply type your text, and our generator will provide dozens of creative variations that you can copy and paste directly into your bio, captions, or tweets.',
        faqs: [
            { question: 'Do these fonts work everywhere?', answer: 'Yes, they use standard Unicode characters that are supported by most modern platforms and apps.' },
            { question: 'Are there any weird symbols?', answer: 'We offer a wide variety, from professional-looking bolds to decorative flourishes.' }
        ],
        specs: [
            { label: 'Styles', value: '50+ Aesthetic font styles' },
            { label: 'Output', value: 'Unicode-based text' },
            { label: 'Clipboard', value: 'One-click copy support' }
        ],
        privacyNotes: 'Text transformations are performed using client-side JavaScript mappings.'
    },
    {
        id: 'bg-remover',
        title: 'Smart BG Remover',
        description: 'Instantly remove image backgrounds using AI.',
        category: ToolCategory.IMAGE,
        icon: Eraser,
        component: <BackgroundRemover />,
        popular: true,
        guideTitle: 'How to create transparent product photos for eBay',
        guideContent: 'Transparent backgrounds are essential for professional eBay listings. Our AI backgrounds remover precisely cuts out your product, allowing you to place it on any background or keep it transparent for a clean look.',
        faqs: [
            { question: 'Does this work with complex backgrounds?', answer: 'Yes, our AI is trained to handle complex backgrounds, including hair and fine details.' },
            { question: 'Can I download as PNG?', answer: 'Yes, all background removals are exported as transparent PNG files.' }
        ],
        specs: [
            { label: 'AI Model', value: 'Self-hosted In-browser AI' },
            { label: 'Output Format', value: 'Transparent PNG' },
            { label: 'Speed', value: '< 2 seconds' }
        ],
        comingSoon: true,
        privacyNotes: 'Your images are processed locally using your graphics card. No data leaves your device.',
        beforeAfterImage: {
            before: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=1000',
            after: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&q=80&w=1000&bg=transparent',
            alt: 'Background removal example'
        }
    },
    {
        id: 'spreadsheet-tools',
        title: 'Spreadsheet Converter',
        description: 'Convert Excel to CSV, JSON, HTML or vice versa.',
        category: ToolCategory.DOCS,
        icon: FileSpreadsheet,
        component: <SpreadsheetTools />,
        guideTitle: 'How to convert Excel files to JSON or CSV',
        guideContent: 'Convert your spreadsheets into developer-friendly formats like JSON or universally compatible CSV files. This tool is perfect for importing data into databases, web apps, or other analysis software without expensive corporate tools.',
        faqs: [
            { question: 'Can I convert .xlsx files?', answer: 'Yes, we support both .xls and .xlsx Excel formats.' },
            { question: 'Is my data secure?', answer: 'Yes, your spreadsheet data is parsed locally in the browser; your private table data never touches a server.' }
        ],
        specs: [
            { label: 'Import', value: 'XLS, XLSX, CSV' },
            { label: 'Export', value: 'CSV, JSON, HTML, SQL' },
            { label: 'Max Rows', value: 'Up to 10,000 recommended' }
        ],
        privacyNotes: 'We prioritize data privacy. Spreadsheets often contain PII; our tool ensures it stays on your machine.'
    },
    {
        id: 'universal-doc-converter',
        title: 'Universal Doc Converter',
        description: 'Convert Word, Markdown, HTML, and Images to PDF/HTML.',
        category: ToolCategory.DOCS,
        icon: ArrowRightLeft,
        component: <UniversalDocConverter />,
        guideTitle: 'Convert any document to PDF or HTML',
        guideContent: 'Easily transform Word documents, Markdown files, or plain text into polished PDFs or clean HTML code. Our universal converter maintains formatting and structure, making it ideal for creating resumes, reports, or web content.',
        faqs: [
            { question: 'Does it support Markdown?', answer: 'Yes, it perfectly converts Markdown syntax into styled PDF or HTML output.' },
            { question: 'Can I convert images to PDF?', answer: 'Yes, you can upload images to generate an image-only PDF document.' }
        ],
        specs: [
            { label: 'Engine', value: 'jsPDF & Marked' },
            { label: 'Output', value: 'PDF, HTML' },
            { label: 'Styles', value: 'Modern document presets' }
        ],
        privacyNotes: 'Document parsing and PDF generation happen 100% client-side.'
    },
    {
        id: 'gif-compressor',
        title: 'GIF Compressor',
        description: 'Reduce GIF file size efficiently.',
        category: ToolCategory.IMAGE,
        icon: Minimize2,
        component: <GifCompressor />,
        guideTitle: 'Reduce GIF size for faster loading',
        guideContent: 'GIFs can be large and slow down your website. Our compressor uses advanced lossy and lossless algorithms to strip metadata and optimize colors, drastically reducing file size while keeping your animation looking great.',
        faqs: [
            { question: 'How much can I compress?', answer: 'Most GIFs can be reduced by 30-70% depending on the color complexity.' },
            { question: 'Will it remain animated?', answer: 'Yes, the compression is specifically designed for multi-frame animated GIFs.' }
        ],
        specs: [
            { label: 'Engine', value: 'Libimagequant (WASM)' },
            { label: 'Optimization', value: 'Lossy Dithering & Palette Reduction' },
            { label: 'Max Intensity', value: '9/10 compression ratio' }
        ],
        privacyNotes: 'GIF re-encoding is performed locally using your device resources.'
    },
    {
        id: 'magic-editor',
        title: 'Magic Image Editor',
        description: 'Edit images with text prompts using Gemini AI.',
        category: ToolCategory.IMAGE,
        icon: Wand2,
        component: <MagicImageEditor />,
        guideTitle: 'Edit images with AI text prompts',
        guideContent: 'Harness the power of generative AI to modify your photos with simple text instructions. Whether you want to "add a sunset", "change city to forest", or "remove the person", our magic editor interprets your requests to create stunning visual transformations.',
        faqs: [
            { question: 'What AI model is used?', answer: 'We use Google Gemini Pro Vision for interpreting prompts and generating modifications.' },
            { question: 'Is it free to use?', answer: 'Yes, but it requires your own Gemini API key for processing.' }
        ],
        specs: [
            { label: 'Model', value: 'Gemini Pro Vision' },
            { label: 'Capabilities', value: 'Inpainting, Style Transfer, Object Removal' },
            { label: 'Privacy', value: 'Requires API Key' }
        ],
        comingSoon: true,
        privacyNotes: 'AI requests are sent to Google Gemini API. Your API keys are stored only in your browser.'
    },
    {
        id: 'video-trimmer',
        title: 'Video Trimmer',
        description: 'Cut clips with frame precision and volume control.',
        category: ToolCategory.VIDEO,
        icon: Scissors,
        component: <VideoTrimmer />,
        guideTitle: 'How to trim videos with frame precision',
        guideContent: 'Remove unwanted parts of your video by setting precise start and end points. Our trimmer provides a high-resolution preview and frame-by-frame control, perfect for creating short clips for TikTok, Instagram, or YouTube Shorts.',
        faqs: [
            { question: 'Does it support 4K?', answer: 'Yes, you can trim 4K videos, though processing speed depends on your device hardware.' },
            { question: 'Can I change the volume?', answer: 'Yes, the trimmer includes volume adjustment and muting options.' }
        ],
        specs: [
            { label: 'Engine', value: 'In-browser FFmpeg' },
            { label: 'Supported Video', value: 'MP4, MOV, WebM' },
            { label: 'Precision', value: 'Single-frame seeking' }
        ],
        privacyNotes: 'Video editing is performed using WebAssembly on your machine. Your data never leaves the browser.'
    },
    {
        id: 'video-converter',
        title: 'Video Converter',
        description: 'Convert MP4, MOV, AVI, GIF, MKV instantly.',
        category: ToolCategory.VIDEO,
        icon: ArrowRightLeft,
        component: <VideoConverter />,
        guideTitle: 'Convert videos between any format instantly',
        guideContent: 'Transform your video files into compatible formats for any device. Convert large MOV files from iPhone to efficient MP4s, or turn videos into WebM for high-performance web use without losing visual quality.',
        faqs: [
            { question: 'What is the fastest format?', answer: 'We recommend MP4 (H.264) for the best balance of speed and compatibility.' },
            { question: 'Can I extract audio?', answer: 'Yes, you can convert video files directly to MP3 or WAV format.' }
        ],
        specs: [
            { label: 'Codecs', value: 'H.264, VP9, AV1, ProRes' },
            { label: 'Output', value: 'MP4, MOV, WebM, AVI, MKV' },
            { label: 'Max Filesize', value: 'Browser limited (usually 2GB)' }
        ],
        privacyNotes: 'Transcoding is done locally using FFmpeg.wasm. Privacy and speed guaranteed.'
    },
    {
        id: 'video-compressor',
        title: 'Video Compressor',
        description: 'Reduce video file size efficiently.',
        category: ToolCategory.VIDEO,
        icon: Minimize2,
        component: <VideoCompressor />,
        popular: true,
        guideTitle: 'Reduce video size for web and sharing',
        guideContent: 'Large video files can be difficult to share or upload. Our video compressor uses advanced H.264 encoding with variable bitrate control to significantly reduce file size while maintaining excellent visual quality. Perfect for Discord, Slack, or email attachments.',
        faqs: [
            { question: 'What is the best compression setting?', answer: 'A CRF value between 23 and 28 usually provides the best balance of size and quality.' },
            { question: 'Will it change my video format?', answer: 'The tool currently exports optimized MP4 (H.264) files for maximum compatibility.' }
        ],
        specs: [
            { label: 'Engine', value: 'libx264 (WASM)' },
            { label: 'Input Formats', value: 'MP4, MOV, WebM, AVI' },
            { label: 'Output Format', value: 'MP4 (H.264)' }
        ],
        privacyNotes: 'Video processing is done locally on your CPU. No video data is ever transmitted to a server.'
    },
    {
        id: 'gif-maker',
        title: 'GIF Maker',
        description: 'Create animated GIFs from multiple images.',
        category: ToolCategory.IMAGE,
        icon: Film,
        component: <GifMaker />,
        guideTitle: 'How to create high-quality animated GIFs from images',
        guideContent: 'Turn your photo collections into engaging animations. Upload a sequence of images, adjust the delay between frames, and export a perfectly looped GIF for social media or presentations.',
        faqs: [
            { question: 'How many images can I add?', answer: 'You can add up to 100 images to a single GIF.' },
            { question: 'Can I reorder frames?', answer: 'Yes, the editor allows drag-and-drop frame reordering.' }
        ],
        specs: [
            { label: 'Interpolation', value: 'Bilinear' },
            { label: 'Color Palette', value: 'Global and per-frame support' },
            { label: 'Dithering', value: 'Ordered, Diffusion' }
        ],
        privacyNotes: 'GIF assembly is processed entirely in your browser.'
    },
    {
        id: 'qr-generator',
        title: 'QR Generator',
        description: 'Create customizable QR codes for links and text.',
        category: ToolCategory.IMAGE,
        icon: QrCode,
        component: <QrGenerator />,
        guideTitle: 'Generate custom QR codes with colors and logos',
        guideContent: 'Create scanable QR codes for your websites, Wi-Fi networks, or business cards. Customize the colors, add your brand logo in the center, and adjust the error correction level to ensure reliable scanning.',
        faqs: [
            { question: 'Do QR codes expire?', answer: 'No, these are static QR codes; they will work as long as the destination URL is active.' },
            { question: 'Can I add a custom logo?', answer: 'Yes, you can upload a PNG or SVG logo to be embedded in the center of the code.' }
        ],
        specs: [
            { label: 'Types', value: 'URL, Text, Wi-Fi, vCard' },
            { label: 'Export', value: 'PNG, SVG, JPG' },
            { label: 'Customization', value: 'Colors, Logos, Corner Styles' }
        ],
        privacyNotes: 'QR generation happens on your device. We do not track the URLs you generate.'
    },
    {
        id: 'audio-replace',
        title: 'Audio Replacer',
        description: 'Swap audio tracks in videos with volume mixing.',
        category: ToolCategory.VIDEO,
        icon: Layers,
        component: <AudioReplacer />,
        guideTitle: 'How to replace audio in a video file',
        guideContent: 'Easily swap background music or voiceovers in your videos. Upload your video and a new audio track, adjust the volume mixing to keep some background noise or replace it completely, and export the new video.',
        faqs: [
            { question: 'Will I lose video quality?', answer: 'No, we only re-encode the audio track; the video stream is "copied" to ensure original quality.' },
            { question: 'Can I mix multiple audio tracks?', answer: 'Currently, it supports one primary replacement track.' }
        ],
        specs: [
            { label: 'Syncing', value: 'Precise audio/video alignment' },
            { label: 'Mixing', value: 'Volume sliders for both tracks' },
            { label: 'Formats', value: 'MP4, WAV, MP3, MOV' }
        ],
        privacyNotes: 'Audio/Video merging is done locally via FFmpeg. No data is uploaded.'
    },
    {
        id: 'image-compressor',
        title: 'Image Compressor',
        description: 'Reduce file size without losing visible quality.',
        category: ToolCategory.IMAGE,
        icon: Minimize2,
        component: <ImageCompressor />,
        guideTitle: 'How to reduce image size for Shopify without losing quality',
        guideContent: 'Shopify stores need fast-loading images for better SEO and conversion. Use our compressor to strip unnecessary metadata and optimize pixel data without any visible loss in quality. We recommend targetting under 200KB for product images.',
        faqs: [
            { question: 'Is there a limit on how many images I can compress?', answer: 'No, you can compress as many images as you need, one by one or in batches (coming soon).' },
            { question: 'Does it support WebP?', answer: 'Yes, our compressor supports PNG, JPG, and WebP formats.' }
        ],
        specs: [
            { label: 'Max Reduction', value: 'Up to 90%' },
            { label: 'Supported Formats', value: 'JPG, PNG, WebP' },
            { label: 'Engine', value: 'In-browser WASM' }
        ],
        privacyNotes: 'Images are optimized locally in your browser. Privacy is 100% guaranteed.',
        beforeAfterImage: {
            before: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=1000',
            after: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=1000&q=20',
            alt: 'Image compression comparison'
        }
    },
    {
        id: 'image-cropper',
        title: 'Image Cropper',
        description: 'Resize and crop images for social media.',
        category: ToolCategory.IMAGE,
        icon: Crop,
        component: <ImageCropper />,
        guideTitle: 'Crop images for Instagram, TikTok, and YouTube',
        guideContent: 'Resize your images perfectly for any social platform. Choose from popular aspect ratios (9:16, 1:1, 4:5) or set a custom area to focus on the most important parts of your creative work.',
        faqs: [
            { question: 'What are the best presets?', answer: 'For Instagram posts, use 1:1 or 4:5; for Stories and TikTok, use 9:16.' },
            { question: 'Can I flip images?', answer: 'Yes, the cropper includes horizontal and vertical flip controls.' }
        ],
        specs: [
            { label: 'Aspect Ratios', value: '1:1, 4:5, 16:9, 9:16, Custom' },
            { label: 'Engine', value: 'Canvas-based ultra-fast cropping' },
            { label: 'Rotation', value: '90-degree increments' }
        ],
        privacyNotes: 'Cropping and resizing are done in-browser. Your images are never saved to our servers.'
    },
    {
        id: 'audio-merger',
        title: 'Audio Merger',
        description: 'Join multiple audio files into one track.',
        category: ToolCategory.AUDIO,
        icon: ListMusic,
        component: <AudioMerger />,
        guideTitle: 'How to merge multiple audio files online',
        guideContent: 'Join multiple songs or voice recordings into a single seamless track. Perfect for creating podcasts, mixed tapes, or long ambient loops. Simply upload your files, arrange them in order, and export as a high-quality MP3.',
        faqs: [
            { question: 'Is there a limit on file count?', answer: 'You can merge up to 20 files at a time.' },
            { question: 'Does it support crossfade?', answer: 'Currently, it joins files end-to-end; crossfade support is in development.' }
        ],
        specs: [
            { label: 'Max Files', value: '20 concurrent tracks' },
            { label: 'Dithering', value: 'Enabled for bitrate changes' },
            { label: 'Output', value: 'Lossless WAV or optimized MP3' }
        ],
        privacyNotes: 'Merging is done via your local CPU/RAM using WebAssembly.'
    },
    {
        id: 'pdf-tools',
        title: 'PDF Suite',
        description: 'Merge, split, or compress PDF documents.',
        category: ToolCategory.DOCS,
        icon: FileText,
        component: <PdfSuite />,
        guideTitle: 'The ultimate toolbox for PDF management',
        guideContent: 'Merge multiple PDFs into one document, split large files into individual pages, or compress PDFs to meet email size limits. Our suite provides all the essential tools for professional document management without a subscription.',
        faqs: [
            { question: 'Can I rearrange pages?', answer: 'Yes, you can drag and drop pages to change their order before merging.' },
            { question: 'Is it compatible with Adobe Acrobat?', answer: 'Yes, all generated files follow standard PDF specifications.' }
        ],
        specs: [
            { label: 'Key Tools', value: 'Merge, Split, Compress, Rotate' },
            { label: 'Engine', value: 'pdf-lib & MuPDF' },
            { label: 'Password Support', value: 'Coming soon' }
        ],
        privacyNotes: 'Documents are processed 100% locally. Ideal for sensitive legal or financial files.'
    },
    {
        id: 'universal-converter',
        title: 'Universal Converter',
        description: 'Convert between JSON, XML, CSV, and YAML.',
        category: ToolCategory.DEV,
        icon: ArrowRightLeft,
        component: <UniversalConverter />,
        guideTitle: 'How to convert between JSON, XML, and CSV',
        guideContent: 'Easily transform data between common developer formats. Convert nested JSON into a flat CSV for Excel analysis, or turn XML API responses into readable JSON structures instantly.',
        faqs: [
            { question: 'Does it support large files?', answer: 'Yes, we use streaming parsers to handle large data sets smoothly.' },
            { question: 'Can I minify the output?', answer: 'Yes, you can choose between "Pretty Print" for readability or "Minified" for performance.' }
        ],
        specs: [
            { label: 'Supported formats', value: 'JSON, XML, CSV, YAML' },
            { label: 'Features', value: 'Syntax highlighting, validation' },
            { label: 'Conversion', value: 'Preserves data types where possible' }
        ],
        privacyNotes: 'Data parsing happens in your browser script. No data is transmitted.'
    },
    {
        id: 'markdown-creator',
        title: 'Markdown Creator',
        description: 'Design UI mockups using ASCII and Unicode characters for AI prompt engineering.',
        category: ToolCategory.DEV,
        icon: MarkdownCreatorIcon as any,
        component: <MarkdownCreator />,
        popular: true,
        guideTitle: 'How to design AI-friendly text UI mockups',
        guideContent: 'Describe your UI layouts to AI assistants like Claude or ChatGPT using precise text-based mockups. Our Markdown Creator lets you draw buttons, inputs, and layouts using Unicode box-drawing characters, ensuring the AI understands your design intent perfectly in a code-friendly format.',
        faqs: [
            { question: 'Why use text-based mockups?', answer: 'Text mockups can be pasted directly into LLM prompts, helping the AI "see" the exact spatial relationship of your design elements.' },
            { question: 'Does it support AI generation?', answer: 'Yes, you can use our Gemini-powered engine to generate ASCII layouts from simple text descriptions.' }
        ],
        specs: [
            { label: 'Grid Size', value: '80x40 Characters' },
            { label: 'Characters', value: 'Unicode Box-Drawing (┌, ─, │, etc.)' },
            { label: 'Export', value: 'Markdown Code Block' }
        ],
        comingSoon: true,
        privacyNotes: 'Your designs are processed locally. AI generation requires your own Gemini API key.'
    },
    // APNG Tools
    {
        id: 'apng-maker',
        title: 'APNG Maker',
        description: 'Create animated PNGs from image sequences.',
        category: ToolCategory.IMAGE,
        icon: Film,
        component: <ApngMaker />,
        guideTitle: 'How to make high-quality APNG animations',
        guideContent: 'Create 24-bit animated PNGs with full alpha transparency. Better than GIF, APNG is perfect for high-quality website UI elements and stickers.',
        faqs: [
            { question: 'Is APNG better than GIF?', answer: 'Yes, it supports 24-bit color and 8-bit alpha channel, whereas GIF only supports 8-bit color.' },
            { question: 'Do all browsers support APNG?', answer: 'Yes, all modern browsers including Chrome, Firefox, and Safari have full APNG support.' }
        ],
        specs: [
            { label: 'Color Depth', value: '24-bit TrueColor' },
            { label: 'Transparency', value: '8-bit Alpha Channel' },
            { label: 'Compatibility', value: 'Modern Browsers' }
        ],
        privacyNotes: 'Animations are rendered in your browser memory.'
    },
    {
        id: 'image-to-ico',
        title: 'Image to ICO',
        description: 'Convert any image to a favicon (.ico).',
        category: ToolCategory.IMAGE,
        icon: ImageIcon,
        component: <ImageToIco />,
        guideTitle: 'How to convert images to Favicons',
        guideContent: 'Create perfect favicons for your website instantly. Upload any PNG, JPG, or WebP graphic, select a resolution from 16x16 up to 256x256, and save it directly as a .ico file compatible with all web browsers.',
        faqs: [
            { question: 'What size should a favicon be?', answer: 'Standard favicons use 16x16 or 32x32. For desktop icons and modern apps, larger sizes like 128x128 or 256x256 are recommended.' },
            { question: 'Does it keep transparency?', answer: 'Yes, if your original image has a transparent background (like a PNG), the ICO will preserve it.' }
        ],
        specs: [
            { label: 'Supported Inputs', value: 'PNG, JPG, WebP' },
            { label: 'Output', value: 'Windows Icon (.ico)' }
        ],
        privacyNotes: 'Images are converted locally in your browser.'
    },
    {
        id: 'video-to-apng',
        title: 'Video to APNG',
        description: 'Convert video clips to APNG animations.',
        category: ToolCategory.VIDEO,
        icon: FileVideo,
        component: <VideoToApng />,
        guideTitle: 'Convert Video to APNG with transparency',
        guideContent: 'Turn your video clips into high-quality APNG loops. Essential for professional web animations where GIF quality is not enough.',
        faqs: [
            { question: 'Can I keep transparency?', answer: 'Yes, if your source video has an alpha channel, it will be preserved.' },
            { question: 'What is the advantage?', answer: 'Lossless quality and superior color compared to GIF.' }
        ],
        specs: [
            { label: 'Input', value: 'MP4, MOV, WebM' },
            { label: 'Transparency', value: 'Preserved' },
            { label: 'Engine', value: 'FFmpeg.wasm' }
        ],
        privacyNotes: 'Processing is performed locally on your device.'
    },
    {
        id: 'gif-to-apng',
        title: 'GIF to APNG',
        description: 'Convert GIF animations to APNG.',
        category: ToolCategory.IMAGE,
        icon: ImageIcon,
        component: <GifToApng />,
        guideTitle: 'Upgrade your GIFs to APNG format',
        guideContent: "Convert existing GIFs to the modern APNG format. While it won't add lost colors, it allows for better integration into modern web apps.",
        faqs: [
            { question: "Will the file size change?", answer: "Usually, APNG files are slightly larger than GIFs because they use better compression but store more color data." }
        ],
        specs: [
            { label: 'Optimization', value: 'LZ77/Deflate' },
            { label: 'Bit Depth', value: '8-bit to 24-bit upgrade' }
        ],
        privacyNotes: 'Handled locally in-browser.'
    },
    {
        id: 'apng-to-gif',
        title: 'APNG to GIF',
        description: 'Convert APNG files to standard GIF.',
        category: ToolCategory.IMAGE,
        icon: ImageIcon,
        component: <ApngToGif />,
        guideTitle: "How to convert APNG to GIF for compatibility",
        guideContent: "If you need an animation to work on older platforms or email clients that don't support APNG, converting to GIF is the safest choice. Our converter maintains the timing and frame sequence of your original animation.",
        faqs: [
            { question: "Will I lose quality?", answer: "GIF is limited to 256 colors, so some color banding may occur if your APNG uses 24-bit color." }
        ],
        specs: [
            { label: "Format", value: "APNG -> GIF" },
            { label: "Colors", value: "Quantized to 256" }
        ],
        privacyNotes: "Conversion is processed via local WebAssembly scripts."
    },
    {
        id: 'apng-to-webp',
        title: 'APNG to WebP',
        description: 'Convert APNG to animated WebP.',
        category: ToolCategory.IMAGE,
        icon: ImageIcon,
        component: <ApngToWebp />,
        guideTitle: "Convert APNG to WebP for better web performance",
        guideContent: "WebP offers modern compression that is significantly more efficient than APNG. Convert your animations to WebP to reduce page load times without sacrificing transparency or color depth.",
        faqs: [
            { question: "Is WebP smaller than APNG?", answer: "Yes, WebP typically offers 20-40% better compression than APNG for similar quality." }
        ],
        specs: [
            { label: "Format", value: "APNG -> WebP" },
            { label: "Compression", value: "Lossy/Lossless selection" }
        ],
        privacyNotes: "Processed entirely in your browser."
    },
    {
        id: 'apng-to-mp4',
        title: 'APNG to MP4',
        description: 'Convert APNG animations to MP4 video.',
        category: ToolCategory.IMAGE,
        icon: ImageIcon,
        component: <ApngToMp4 />,
        guideTitle: "How to turn APNG animations into MP4 videos",
        guideContent: "Convert your high-quality animations into MP4 videos for easy sharing on Instagram, Twitter, or YouTube. MP4 files are universally supported and offer excellent compression for long sequences.",
        faqs: [
            { question: "Can I use MP4 for transparent backgrounds?", answer: "Standard MP4 does not support transparency. We recommend WebM for transparent video if needed." }
        ],
        specs: [
            { label: "Codec", value: "H.264 / AVC" },
            { label: "Compatibility", value: "Universal" }
        ],
        privacyNotes: "Transcoding is done locally via FFmpeg.wasm."
    },
    {
        id: 'mng-to-apng',
        title: 'MNG to APNG',
        description: 'Convert MNG files to APNG.',
        category: ToolCategory.IMAGE,
        icon: ImageIcon,
        component: <MngToApng />,
        guideTitle: "How to convert MNG files to modern APNG",
        guideContent: "MNG is an older format that never saw wide adoption. Convert your MNG files to APNG to ensure they can be viewed in all modern web browsers without special plugins.",
        faqs: [
            { question: "What is MNG?", answer: "Multiple-image Network Graphics, an extension of PNG for animations that predates APNG." }
        ],
        specs: [
            { label: "Format", value: "MNG -> APNG" },
            { label: "Compatibility", value: "Modern Web standard" }
        ],
        privacyNotes: "MNG parsing is done in your browser."
    },
    // WebP Tools
    {
        id: 'webp-maker',
        title: 'WebP Maker',
        description: 'Create animated WebP from images.',
        category: ToolCategory.IMAGE,
        icon: Film,
        component: <WebpMaker />,
        guideTitle: 'Create animated WebP for high-performance websites',
        guideContent: 'WebP is the gold standard for web animations today. Create small, high-quality animated WebP files from your image sequences or videos to ensure your site stays fast.',
        faqs: [
            { question: 'Why use WebP over GIF?', answer: 'WebP files are typically 30-50% smaller than GIFs for the same quality.' },
            { question: 'Is WebP supported everywhere?', answer: 'Yes, all modern browsers have full support for both static and animated WebP.' }
        ],
        specs: [
            { label: 'Compression', value: 'Lossy & Lossless' },
            { label: 'Features', value: 'Animation + Transparency' },
            { label: 'Browser Support', value: '96% of global users' }
        ],
        privacyNotes: 'WebP encoding uses your local CPU via WebAssembly.'
    },
    {
        id: 'video-to-webp',
        title: 'Video to WebP',
        description: 'Convert video to animated WebP.',
        category: ToolCategory.VIDEO,
        icon: FileVideo,
        component: <VideoToWebp />,
        guideTitle: 'How to convert Video to Animated WebP',
        guideContent: 'The best way to display short video loops on websites. Animated WebP offers superior compression and quality compared to GIF or APNG.',
        faqs: [
            { question: 'Can I control the quality?', answer: 'Yes, you can adjust the lossy compression level to balance quality and file size.' }
        ],
        specs: [
            { label: 'Source', value: 'MP4, MOV, WebM' },
            { label: 'Looping', value: 'Customizable' },
            { label: 'Output', value: 'Animated WebP' }
        ],
        privacyNotes: 'Transcoding happens entirely in your browser.'
    },
    {
        id: 'gif-to-webp',
        title: 'GIF to WebP',
        description: 'Convert GIF to animated WebP.',
        category: ToolCategory.IMAGE,
        icon: ImageIcon,
        component: <GifToWebp />,
        guideTitle: 'Reduce GIF size by converting to WebP',
        guideContent: 'Instantly slash your GIF file sizes by up to 50% by converting them to the more efficient WebP format. Perfect for web performance optimization.',
        faqs: [
            { question: 'How much smaller is WebP?', answer: 'On average, converts save 30-60% in file size with no visible loss.' }
        ],
        specs: [
            { label: 'Conversion', value: 'GIF -> Animated WebP' },
            { label: 'Engine', value: 'libwebp (WASM)' }
        ],
        privacyNotes: 'No data is uploaded during conversion.'
    },
    {
        id: 'jpg-to-webp',
        title: 'JPG to WebP',
        description: 'Convert JPG images to WebP.',
        category: ToolCategory.IMAGE,
        icon: ImageIcon,
        component: <JpgToWebp />,
        guideTitle: "How to convert JPG to WebP for Google PageSpeed",
        guideContent: "Converting your product photos from JPG to WebP is one of the easiest ways to improve your Google PageSpeed Insights score. WebP files are smaller, meaning faster load times and better SEO rankings.",
        faqs: [
            { question: "Will it improve my SEO?", answer: "Faster page loads are a key ranking factor for Google, so using WebP indirectly boosts your SEO." }
        ],
        specs: [
            { label: "Format", value: "JPG -> WebP" },
            { label: "Speed", value: "Instant" }
        ],
        privacyNotes: "Metadata is stripped by default for privacy and smaller size."
    },
    {
        id: 'png-to-webp',
        title: 'PNG to WebP',
        description: 'Convert PNG images to WebP.',
        category: ToolCategory.IMAGE,
        icon: ImageIcon,
        component: <PngToWebp />,
        guideTitle: "Convert PNG to WebP while keeping transparency",
        guideContent: "WebP supports the same 8-bit alpha transparency as PNG but at a much smaller file size. Convert your UI assets and logos to WebP to speed up your website significantly.",
        faqs: [
            { question: "Will transparency be lost?", answer: "No, WebP fully supports transparency (alpha channel)." }
        ],
        specs: [
            { label: "Format", value: "PNG -> WebP" },
            { label: "Transparency", value: "Lossless support" }
        ],
        privacyNotes: "All metadata is handled locally."
    },
    {
        id: 'avif-to-webp',
        title: 'AVIF to WebP',
        description: 'Convert AVIF images to WebP.',
        category: ToolCategory.IMAGE,
        icon: ImageIcon,
        component: <AvifToWebp />,
        guideTitle: "Convert AVIF to WebP for better compatibility",
        guideContent: "While AVIF offers excellent compression, it isn't supported in all environments yet. Converting to WebP provides a widely compatible modern alternative that still keeps file sizes tiny.",
        faqs: [
            { question: "Is AVIF smaller than WebP?", answer: "Usually yes, but WebP has much broader support across older browsers and apps." }
        ],
        specs: [
            { label: "Format", value: "AVIF -> WebP" }
        ],
        privacyNotes: "Local decoding/encoding via WebAssembly."
    },
    {
        id: 'webp-to-gif',
        title: 'WebP to GIF',
        description: 'Convert WebP to GIF animation.',
        category: ToolCategory.IMAGE,
        icon: ImageIcon,
        component: <WebpToGif />,
        guideTitle: "Easily convert WebP animations back to GIF",
        guideContent: "Need to share a WebP animation in an app that only supports GIFs? Our converter lets you transform modern WebP files back into the classic GIF format in seconds.",
        faqs: [
            { question: "Why convert back to GIF?", answer: "Compatibility with some older email clients and social media platforms that haven't fully adopted WebP yet." }
        ],
        specs: [
            { label: "Engine", value: "Gif.js & libwebp" },
            { label: "Colors", value: "Dithered 256-color palette" }
        ],
        privacyNotes: "Data is handled in your browser's private session."
    },
    {
        id: 'webp-to-jpg',
        title: 'WebP to JPG',
        description: 'Convert WebP to JPG image.',
        category: ToolCategory.IMAGE,
        icon: ImageIcon,
        component: <WebpToJpg />,
        guideTitle: "How to convert WebP images back to JPG",
        guideContent: "If you have a WebP image that needs to be compatible with older software or services that don't support the format, converting to JPG is the best solution. Our tool offers high-quality conversion to ensure your photos look great.",
        faqs: [
            { question: "Why convert to JPG?", answer: "Better compatibility with old browsers, desktop software, and some social media platforms." }
        ],
        specs: [
            { label: "Format", value: "WebP -> JPG" },
            { label: "Quality", value: "Customizable 0-100" }
        ],
        privacyNotes: "Images are converted in your browser's memory."
    },
    {
        id: 'webp-to-png',
        title: 'WebP to PNG',
        description: 'Convert WebP to PNG image.',
        category: ToolCategory.IMAGE,
        icon: ImageIcon,
        component: <WebpToPng />,
        guideTitle: "Convert WebP to PNG without losing quality",
        guideContent: "Convert your WebP images to lossless PNG format. This is ideal if you need to edit the image further or require the maximum possible quality for professional printing or design work.",
        faqs: [
            { question: "Is this conversion lossless?", answer: "Yes, converting to PNG is a lossless process that preserves all pixel data from the source." }
        ],
        specs: [
            { label: "Format", value: "WebP -> PNG" },
            { label: "Transparency", value: "Fully preserved" }
        ],
        privacyNotes: "Local processing ensures your design assets stay private."
    },
    {
        id: 'webp-to-mp4',
        title: 'WebP to MP4',
        description: 'Convert WebP to MP4 video.',
        category: ToolCategory.IMAGE,
        icon: ImageIcon,
        component: <WebpToMp4 />,
        guideTitle: "How to convert animated WebP to MP4 video",
        guideContent: "Turn your animated WebP files into MP4 videos that can be shared on any platform. MP4 is the universal standard for video and works perfectly on mobile devices and all social networks.",
        faqs: [
            { question: "Can I share these on Instagram?", answer: "Yes, converting to MP4 makes your animations fully compatible with Instagram and other video-first platforms." }
        ],
        specs: [
            { label: "Format", value: "Animated WebP -> MP4" },
            { label: "Codec", value: "H.264" }
        ],
        privacyNotes: "Conversion is done on your machine via WebAssembly."
    },
    {
        id: 'code-formatter',
        title: 'Code Formatter',
        description: 'Beautify and minify JSON, HTML, CSS, and XML.',
        category: ToolCategory.DEV,
        icon: Code,
        component: <CodeFormatter />,
        guideTitle: 'Professional code beautifier and minifier',
        guideContent: 'Clean up messy code or minify files for production. Our formatter supports JSON, HTML, CSS, and XML, providing instant syntax highlighting and indentation fixes.',
        faqs: [
            { question: 'Is it safe for sensitive data?', answer: 'Yes, the formatting is done locally in your browser. We never see or store your code.' },
            { question: 'Does it support nested JSON?', answer: 'Yes, it handles deeply nested JSON structures with ease.' }
        ],
        specs: [
            { label: 'Languages', value: 'JSON, HTML, CSS, JavaScript, XML' },
            { label: 'Modes', value: 'Beautify / Minify' },
            { label: 'Theme', value: 'Dark / High Contrast' }
        ],
        privacyNotes: 'Code is processed in-memory using Prettier and local scripts.'
    },
    {
        id: 'quick-video-editor',
        title: 'Quick Video Editor',
        description: 'Edit videos with trim, speed, and aspect ratio controls.',
        category: ToolCategory.VIDEO,
        icon: Film,
        component: <QuickVideoEditor />,
        popular: true,
        guideTitle: "How to quickly edit videos without complex software",
        guideContent: "Our Quick Video Editor is designed for rapid tasks like trimming, adjusting speed, or changing aspect ratios. Perfect for social media creators who need to polish a clip in seconds without waiting for cloud uploads.",
        faqs: [
            { question: "Can I speed up videos?", answer: "Yes, you can speed up or slow down your clips (0.5x to 2x speed)." },
            { question: "Does it support cropping?", answer: "Yes, you can crop to social media dimensions like 9:16 or 1:1." }
        ],
        specs: [
            { label: "Tools", value: "Trim, Speed, Crop, Rotate" },
            { label: "Engine", value: "FFmpeg WASM" },
            { label: "Resolution", value: "Supports up to 4K" }
        ],
        privacyNotes: "Your creative content is processed locally and never uploaded."
    },
    {
        id: 'text-cleaner',
        title: 'Text Cleaner',
        description: 'Remove repetitive phrases and clean formatting.',
        category: ToolCategory.TEXT,
        icon: RefreshCcw,
        component: <TextCleaner />,
        guideTitle: "How to clean and normalize messy text",
        guideContent: "Remove extra spaces, empty lines, and repetitive phrases from your documents. Perfect for cleaning up text copied from PDFs, websites, or legacy software.",
        faqs: [
            { question: "Can I remove duplicates?", answer: "Yes, the tool includes an option to remove duplicate lines and phrases." }
        ],
        specs: [
            { label: "Tools", value: "Trim, De-duplicate, Line-ending fix" }
        ],
        privacyNotes: "Text is processed locally; no data retention."
    },
    {
        id: 'pdf-to-text',
        title: 'PDF to Text',
        description: 'Extract text content from PDF documents.',
        category: ToolCategory.DOCS,
        icon: FileText,
        component: <PdfToText />,
        popular: true,
        guideTitle: 'How to extract text from PDF files accurately',
        guideContent: 'Convert your PDF documents into editable text files. Our extractor parses layers and text paths to recover as much content as possible without needing expensive OCR software.',
        faqs: [
            { question: 'Does it work with scanned images?', answer: 'Currently, it extracts selectable text. For images, we recommend an OCR tool.' },
            { question: 'Is formatting preserved?', answer: 'We attempt to maintain basic layout and spacing during extraction.' }
        ],
        specs: [
            { label: 'Engine', value: 'PDF.js' },
            { label: 'Output', value: 'Plain Text (.txt)' },
            { label: 'Batch', value: 'Coming soon' }
        ],
        privacyNotes: 'Your PDF content is read locally; your documents are never uploaded.'
    },
    {
        id: 'text-to-pdf',
        title: 'Text to PDF',
        description: 'Convert plain text to PDF documents.',
        category: ToolCategory.DOCS,
        icon: FileText,
        component: <TextToPdf />,
        guideTitle: "How to turn plain text or logs into PDF documents",
        guideContent: "Quickly convert technical logs, plain text notes, or code snippets into professional-looking PDF documents. Useful for archiving, sharing, or printing text in a fixed format.",
        faqs: [
            { question: "Can I change the font?", answer: "Yes, we provide several clean, professional font choices for your PDF." }
        ],
        specs: [
            { label: "Input", value: ".txt, .log, raw text" },
            { label: "Page Size", value: "A4, Letter" }
        ],
        privacyNotes: "Text is rendered into PDF locally."
    },
    {
        id: 'text-utilities',
        title: 'Text Utility Suite',
        description: 'Word count, case converter, slug generator & more.',
        category: ToolCategory.TEXT,
        icon: FileText,
        component: <TextUtilities />,
        popular: true,
        guideTitle: "The swiss-army knife for text processing",
        guideContent: "Count words, convert cases, generate slugs, and clean up messy text all in one place. An essential tool for writers, developers, and SEO professionals.",
        faqs: [
            { question: "What is a slug generator?", answer: "It turns a title like 'Hello World!' into a URL-friendly 'hello-world'." }
        ],
        specs: [
            { label: "Tools", value: "Word Count, Case, Slugs, Lists" },
            { label: 'Privacy', value: '100% Client-side' }
        ],
        privacyNotes: "Processing happens in real-time as you type."
    },
    {
        id: 'image-resizer',
        title: 'Image Resizer',
        description: 'Resize images with precise dimension control.',
        category: ToolCategory.IMAGE,
        icon: Maximize2,
        component: <ImageResizer />,
        popular: true,
        guideTitle: 'How to resize images without losing aspect ratio',
        guideContent: 'Quickly change the pixel dimensions of your photos. Lock the aspect ratio to prevent stretching, or set exact widths and heights for specific project requirements.',
        faqs: [
            { question: 'Can I upscale images?', answer: 'Yes, but be aware that upscaling may result in some pixelation depending on the source.' },
            { question: 'What is "Lock Aspect Ratio"?', answer: 'It automatically adjusts the height when you change the width to keep the image proportional.' }
        ],
        specs: [
            { label: 'Units', value: 'Pixels, Percentage' },
            { label: 'Interpolation', value: 'Lanczos (High Quality)' },
            { label: 'Max Size', value: '8000 x 8000px' }
        ],
        privacyNotes: 'Resizing is handled by your browser canvas engine.'
    },
    {
        id: 'pdf-to-jpg',
        title: 'PDF to JPG',
        description: 'Convert PDF pages to high-quality JPG images.',
        category: ToolCategory.DOCS,
        icon: FileText,
        component: <PdfToJpg />,
        popular: true,
        guideTitle: "How to convert PDF pages to high-quality images",
        guideContent: "Extract individual pages from your PDF documents and save them as high-resolution JPG files. Great for sharing document snippets on social media or using them in presentations.",
        faqs: [
            { question: "Can I choose the resolution?", answer: "Yes, we offer multiple DPI settings for high-fidelity extraction." }
        ],
        specs: [
            { label: "Format", value: "PDF -> High DPI JPG" },
            { label: "Engine", value: "PDF.js" }
        ],
        privacyNotes: "Your PDF pages are rendered to images locally."
    },
];

import { useNavigate } from 'react-router-dom';

// ... imports ...

import { useIsMobile } from '../hooks/useIsMobile';

interface DashboardProps {
    activeCategory: string;
    setActiveCategory?: (category: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ activeCategory, setActiveCategory }) => {
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
        if (tool.comingSoon) return;
        if (setActiveCategory) {
            setActiveCategory(tool.category);
        }
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
                    className="block w-full pl-10 pr-3 py-3 border border-zinc-800 rounded-xl leading-5 bg-zinc-900/50 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:bg-zinc-900 focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 sm:text-sm transition-all"
                    style={{ zIndex: 10 }}
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
                        className={`group bg-zinc-900/80 hover:bg-zinc-800/90 border border-zinc-800/50 rounded-2xl transition-all duration-300 relative flex flex-col h-full ${tool.comingSoon ? 'opacity-75 grayscale-[0.5] cursor-not-allowed' : 'cursor-pointer hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20'}`}
                        style={!tool.comingSoon ? { ['--tw-hover-border' as any]: '' } : undefined}
                        onMouseEnter={(e) => { if (!tool.comingSoon) { e.currentTarget.style.borderColor = 'rgba(79,70,229,0.5)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(79,70,229,0.15)'; } }}
                        onMouseLeave={(e) => { e.currentTarget.style.borderColor = ''; e.currentTarget.style.boxShadow = ''; }}
                    >
                        {/* Background Glow Effect - Isolated in clipped container */}
                        <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                            <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full blur-3xl transition-all duration-500" style={{ background: 'rgba(79,70,229,0.05)' }}
                                ref={el => { if (el) { el.parentElement?.parentElement?.addEventListener('mouseenter', () => el.style.background = 'rgba(79,70,229,0.15)'); el.parentElement?.parentElement?.addEventListener('mouseleave', () => el.style.background = 'rgba(79,70,229,0.05)'); } }}></div>
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

                            <div className="mt-6 flex items-center text-sm font-bold text-zinc-600 transition-colors pt-2" style={{ color: undefined }}
                                ref={el => { if (el) { el.closest('[data-tool]')?.addEventListener('mouseenter', () => el.style.color = 'rgb(129,140,248)'); el.closest('[data-tool]')?.addEventListener('mouseleave', () => el.style.color = ''); } }}>
                                {tool.comingSoon ? (
                                    <span className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] bg-zinc-800 px-2 py-1 rounded-md border border-zinc-700">Coming Soon</span>
                                ) : (
                                    <>Try now <span className="ml-1 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">→</span></>
                                )}
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