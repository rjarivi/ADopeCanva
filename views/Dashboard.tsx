import React, { useState, useMemo } from 'react';
import { ToolItem, ToolCategory } from '../types';
import {
    Search,
    Scissors, Music, Video, Image as ImageIcon,
    FileText, Code, Layers, Minimize2, Edit3,
    Crop, FileJson, Zap, ArrowRightLeft, Film, ListMusic, QrCode, Eraser, Type, RefreshCcw, FileVideo, FileSpreadsheet, Maximize2, PenTool, FileCode2, FileSearch, MonitorDown, Smartphone, AudioWaveform, EyeOff,
    GitCompare, Palette, FileDown, SplitSquareHorizontal, Pipette, FileAudio, Stamp
} from 'lucide-react';
import { VideoTrimmer } from './tools/VideoTrimmer';
import { ImageCompressor } from './tools/ImageCompressor';
import { VideoConverter } from './tools/VideoConverter';
import { VideoCompressor } from './tools/VideoCompressor';
import { AudioReplacer } from './tools/AudioReplacer';
import { VideoToGif } from './tools/VideoToGif';
import { AudioMerger } from './tools/AudioMerger';
import { AudioConverter } from './tools/AudioConverter';
import { AudioExtractor } from './tools/AudioExtractor';
import { AudioTrimmer } from './tools/AudioTrimmer';
import { ImageCropper } from './tools/ImageCropper';
import { PdfSuite } from './tools/DocSuite';
import { CodeFormatter } from './tools/CodeFormatter';
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
import { PdfRedact } from './tools/PdfRedact';
import { SignatureGenerator } from './tools/SignatureGenerator';
import { TextUtilities } from './tools/TextUtilities';
import { Tooltip } from '../components/ui/Tooltip';
import { MarkdownCreatorIcon } from '../components/icons/MarkdownCreatorIcon';
import { MarkdownCreator } from './tools/MarkdownCreator';
import { ImageConverter } from './tools/ImageConverter';
import { ImageToIco } from './tools/ImageToIco';
import { SvgConverter } from './tools/SvgConverter';
import { SvgToCode } from './tools/SvgToCode';
import { HtmlToImage } from './tools/HtmlToImage';
import { DeviceMockup } from './tools/DeviceMockup';
import { AudioWaveformExporter } from './tools/AudioWaveformExporter';
import { TextCompareTool } from './tools/TextCompareTool';
import { GradientCreator } from './tools/GradientCreator';
import { ColorTool } from './tools/ColorTool';
import { FileToMarkdown } from './tools/FileToMarkdown';
import { FontPreviewer } from './tools/FontPreviewer';
import { ImageSplitter } from './tools/ImageSplitter';
import { SocialMockupChecker } from './tools/SocialMockupChecker';
import { PaletteExtractor } from './tools/PaletteExtractor';
import { ExifStripper } from './tools/ExifStripper';
import { PdfWatermark } from './tools/PdfWatermark';

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
        id: 'universal-doc-converter',
        title: 'Universal Doc Converter',
        description: 'Convert Word, Markdown, HTML, and Images to PDF/HTML.',
        category: ToolCategory.DOCS,
        icon: ArrowRightLeft,
        component: <UniversalDocConverter />,
        popular: true,
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
        id: 'mockup-generator',
        title: 'Mockup Generator',
        description: 'Drop your screenshot into a cinematic device frame — iPhone, Android, iPad, MacBook, Browser, or Window.',
        category: ToolCategory.IMAGE,
        icon: Smartphone,
        component: <DeviceMockup />,
        popular: true,
        guideTitle: 'How to create device mockups from screenshots',
        guideContent: 'Upload any screenshot and instantly wrap it in a polished device frame. Choose from iPhone 15 Pro, Android, iPad Pro, MacBook, browser window, or app window frames. Customize the frame finish, pick a background gradient, toggle the drop shadow, and export at up to 3× resolution — all client-side with no uploads required.',
        faqs: [
            { question: 'What image formats are supported?', answer: 'PNG, JPG, and WebP screenshots are all supported. Any aspect ratio will be cover-fitted to the device screen.' },
            { question: 'Can I export with a transparent background?', answer: 'Yes — choose the "None" background preset and export as PNG to get a transparent background behind the device frame.' },
            { question: 'What does the export scale mean?', answer: '1× outputs 1200×900 px, 2× outputs 2400×1800 px, and 3× outputs 3600×2700 px. Use 2× or 3× for sharp, retina-quality images.' },
            { question: 'Is my screenshot uploaded anywhere?', answer: 'No — all rendering happens locally in your browser using the Canvas API. Your screenshots never leave your device.' },
        ],
        specs: [
            { label: 'Input',    value: 'PNG, JPG, WebP' },
            { label: 'Output',   value: 'PNG' },
            { label: 'Devices',  value: 'iPhone 15 Pro, Android, iPad Pro, MacBook, Browser, App Window' },
            { label: 'Max resolution', value: '3× (3600 × 2700 px)' },
            { label: 'Engine',   value: 'Canvas API (client-side)' },
        ],
        privacyNotes: 'All mockup rendering is performed locally in your browser using the Canvas API. No screenshots or generated images are sent to any server.',
    },
    {
        id: 'image-editor',
        title: 'Image Editor',
        description: 'Edit images with layers, filters, and text.',
        category: ToolCategory.IMAGE,
        icon: Edit3,
        component: <ImageEditor />,
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
        id: 'bg-remover',
        title: 'Smart BG Remover',
        seoTitle: 'Best Free Remove.bg Alternative: 100% In-Browser & Private | AdopeCanva',
        metaDescription: 'Looking for a Remove.bg alternative? Remove image backgrounds online for free with zero server uploads. 100% private, on-device AI neural matting, unlimited full-res PNG downloads.',
        description: 'Instantly remove image backgrounds locally in your browser with zero server uploads.',
        category: ToolCategory.IMAGE,
        icon: Eraser,
        component: <BackgroundRemover />,
        keywords: [
            'remove.bg alternative',
            'best remove.bg alternative',
            'free remove bg alternative',
            'remove.bg shutting down alternative',
            'remove background free',
            'remove background online',
            'transparent background maker',
            'private background remover',
            'remove image background no upload',
            'unlimited background remover',
            'in-browser background removal'
        ],
        guideTitle: 'The #1 Free Remove.bg Alternative: How to Remove Backgrounds 100% Privately',
        guideContent: 'With Remove.bg shutting down and third-party cloud services charging expensive credit fees or harvesting your private photos, AdopeCanva Smart BG Remover provides the ultimate zero-cost, privacy-first alternative. Running entirely inside your web browser via cutting-edge ONNX neural WebAssembly (Transformers.js MODNet), it cuts out subjects, hair, and complex edges with zero server uploads, zero subscriptions, and unlimited full-resolution transparent PNG exports.',
        steps: [
            {
                stepNumber: 1,
                title: 'Select or Drop Any Image',
                description: 'Upload your portrait, product photo, graphic, or signature. Files are loaded straight into local browser memory with zero network transmission.'
            },
            {
                stepNumber: 2,
                title: 'Instant On-Device Neural Matting',
                description: 'Click "Remove Background". The on-device MODNet AI model isolates the subject directly using your computer hardware with no API limits or cloud queues.'
            },
            {
                stepNumber: 3,
                title: 'Download Full-Resolution Transparent PNG',
                description: 'Review the crisp cutout with our split before/after slider and download a 32-bit alpha transparent PNG ready for Shopify, Amazon, or graphic design.'
            }
        ],
        comparisonTable: {
            title: 'Remove.bg vs. AdopeCanva Smart BG Remover',
            headers: ['Feature / Metric', 'Remove.bg (Legacy Cloud)', 'AdopeCanva Smart BG Remover'],
            rows: [
                { label: 'Cost & Credits', values: { 'Remove.bg (Legacy Cloud)': '$0.20 – $1.99 per image / Subscription', 'AdopeCanva Smart BG Remover': '$0 Free Forever (Unlimited images)' }, highlight: true },
                { label: 'Data Privacy', values: { 'Remove.bg (Legacy Cloud)': 'Uploaded to third-party cloud servers', 'AdopeCanva Smart BG Remover': '100% Private (Runs locally in browser RAM)' }, highlight: true },
                { label: 'Free Export Resolution', values: { 'Remove.bg (Legacy Cloud)': 'Low-res 0.25MP preview (612×408 px)', 'AdopeCanva Smart BG Remover': 'Full Source Resolution (Up to 4K+)' }, highlight: true },
                { label: 'Account & Sign Up', values: { 'Remove.bg (Legacy Cloud)': 'Mandatory login & payment prompt', 'AdopeCanva Smart BG Remover': 'Zero Signup (Instant 1-click execution)' }, highlight: true },
                { label: 'Offline Capability', values: { 'Remove.bg (Legacy Cloud)': 'Requires active internet & server API', 'AdopeCanva Smart BG Remover': 'Cached in browser — works offline' } },
                { label: 'Commercial Rights', values: { 'Remove.bg (Legacy Cloud)': 'Restricted without commercial plan', 'AdopeCanva Smart BG Remover': '100% Royalty-Free for any purpose' } }
            ]
        },
        faqs: [
            {
                question: 'What is the best free alternative to Remove.bg now that it is shutting down?',
                answer: 'AdopeCanva Smart BG Remover is the premier free alternative to Remove.bg. Unlike Remove.bg which requires cloud uploads and paid credits for full-resolution downloads, AdopeCanva uses in-browser neural networks (MODNet with WebAssembly) to isolate subjects locally on your device with 100% privacy, zero uploads, and unlimited free exports.'
            },
            {
                question: 'How is AdopeCanva different from Remove.bg?',
                answer: 'The three biggest differences are: (1) Privacy: Remove.bg uploads your photos to external cloud servers; AdopeCanva processes 100% locally on your machine. (2) Cost: Remove.bg charges up to $1.99/image or requires recurring plans; AdopeCanva is completely free forever. (3) Quality: Remove.bg caps free downloads at low-resolution 0.25MP previews; AdopeCanva outputs full-resolution transparent PNGs with no watermarks.'
            },
            {
                question: 'Are my photos uploaded to any server or used for AI training?',
                answer: 'Never. AdopeCanva does not transmit your images across the internet. The AI model runs in your browser via WebAssembly, meaning sensitive photos, confidential product prototypes, and personal portraits never leave your computer.'
            },
            {
                question: 'Do I need an account, credit card, or API key?',
                answer: 'No. AdopeCanva requires zero signup, no account creation, and no API keys. You simply visit the site, drop your photo, and download your transparent PNG immediately.'
            },
            {
                question: 'Does it handle hair, transparent fabrics, and complex edges?',
                answer: 'Yes. The underlying MODNet neural matting model is purpose-built for portrait and object boundary refinement, capturing fine strands of hair, clothing silhouettes, and intricate edges cleanly without harsh cutout halos.'
            },
            {
                question: 'Can I choose between different AI models?',
                answer: 'Yes! AdopeCanva provides a multi-model selector allowing you to switch between BiRefNet (the ultra-HD bilateral reference network powering bg0.dev) and MODNet (fast portrait specialist ~25MB). Both models are 100% open-source (Apache-2.0) with zero commercial restrictions.'
            },
            {
                question: 'Can I use the transparent PNGs for commercial e-commerce (Shopify, Amazon, Etsy)?',
                answer: 'Yes. All transparent PNG cutouts produced by AdopeCanva are completely royalty-free with no commercial restrictions. They are ready to drop directly into product listings, social media ads, and marketing graphics.'
            }
        ],
        specs: [
            { label: 'AI Engines', value: 'BiRefNet (BG0 Engine, Apache-2.0), MODNet (Apache-2.0)' },
            { label: 'Processing', value: '100% Client-Side Device Hardware (CPU / WebGPU)' },
            { label: 'Privacy Architecture', value: 'Zero-Knowledge / Zero Cloud Transmission' },
            { label: 'Export Format', value: 'Lossless 32-bit Transparent PNG (RGBA)' },
            { label: 'Pricing', value: '$0 Free Forever (No Subscriptions, No Credits)' }
        ],
        privacyNotes: 'Your photos are processed locally in browser RAM using ONNX WebAssembly. Zero bytes are uploaded to external servers.',
        relatedToolIds: ['image-editor', 'image-compressor', 'image-cropper', 'mockup-generator']
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
        privacyNotes: 'Processing happens entirely in your browser. Your video files are never uploaded to our servers.'
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
        id: 'signature-generator',
        title: 'Sign to Gif',
        description: 'Create animated signatures and export as GIF/MP4.',
        category: ToolCategory.VIDEO,
        icon: PenTool,
        component: <SignatureGenerator />,
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
        id: 'html-to-image',
        title: 'HTML to Image',
        description: 'Write HTML & CSS in a live editor and export it as a PNG, JPEG, or WebP image.',
        category: ToolCategory.DEV,
        icon: MonitorDown,
        component: <HtmlToImage />,
        guideTitle: 'How to convert HTML and CSS to an image',
        guideContent: 'Paste or write any HTML markup and CSS styles, preview the result live in the browser, and export it as a high-resolution PNG, JPEG, or WebP image — entirely in your browser with no server uploads. Perfect for generating social cards, banners, and screenshots.',
        faqs: [
            { question: 'Can I use custom fonts?', answer: 'Inline styles and system fonts work best. External Google Fonts may not load due to browser sandbox restrictions — embed font-face rules or use system fonts for reliable exports.' },
            { question: 'What resolution should I use?', answer: '2× is recommended for sharp, retina-quality exports. Use 3× for print-ready output.' },
            { question: 'Does my HTML get sent to a server?', answer: 'No — everything is processed entirely in your browser using html2canvas. Your code never leaves your device.' },
            { question: 'Why does my layout look different in the export?', answer: 'Set explicit width and height on the body element to control the output dimensions. html2canvas captures the rendered DOM, so ensure all assets are inline or local.' },
        ],
        specs: [
            { label: 'Input', value: 'HTML + CSS markup' },
            { label: 'Output', value: 'PNG, JPEG, WebP' },
            { label: 'Max resolution', value: '3× device pixel ratio' },
            { label: 'Engine', value: 'html2canvas (client-side)' },
        ],
        privacyNotes: 'All rendering and image capture happens locally in your browser. No HTML, CSS, or generated images are uploaded to any server.'
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
        popular: true,
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
        privacyNotes: 'Images are optimized locally in your browser. Privacy is 100% guaranteed.'
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
        id: 'audio-waveform',
        title: 'Audio Waveform SVG',
        description: 'Export your audio as a scalable SVG waveform — bars, sharp, or smooth with gradients and image masking.',
        category: ToolCategory.AUDIO,
        icon: AudioWaveform,
        component: <AudioWaveformExporter />,
        guideTitle: 'How to generate an SVG waveform from audio',
        guideContent: 'Upload any audio file and instantly visualize it as a clean SVG waveform. Choose from bars, sharp polyline, or smooth bezier styles. Apply solid colors, linear/radial gradients, or even use an image as a fill mask. Export at any resolution — SVGs scale infinitely with no quality loss.',
        faqs: [
            { question: 'What audio formats are supported?', answer: 'MP3, WAV, OGG, FLAC, M4A, and AAC — decoded entirely in your browser using the Web Audio API.' },
            { question: 'Can I use the SVG in Figma or Illustrator?', answer: 'Yes. The exported SVG is standard and opens in any vector editor.' },
            { question: 'What is image masking?', answer: 'Image masking fills the waveform shape with a photo or texture instead of a flat color, creating a striking visual effect.' },
        ],
        specs: [
            { label: 'Styles', value: 'Bars, Sharp, Smooth' },
            { label: 'Color modes', value: 'Solid, Gradient (H/V/Radial), Image Mask' },
            { label: 'Max export size', value: '4000 × 1000 px' },
            { label: 'Output', value: 'SVG (vector, infinitely scalable)' },
            { label: 'Processing', value: 'Web Audio API — fully client-side' },
        ],
        privacyNotes: 'Audio is decoded in-browser using the Web Audio API. No audio data is ever uploaded.',
    },
    {
        id: 'audio-extractor',
        title: 'Audio Extractor',
        description: 'Extract crystal-clear audio, music, and voice from any video file.',
        category: ToolCategory.AUDIO,
        icon: FileAudio,
        component: <AudioExtractor />,
        guideTitle: 'How to extract audio tracks from any video file',
        guideContent: 'Quickly strip audio streams from video files like MP4, MOV, MKV, or WebM and export directly to MP3, WAV, AAC, or FLAC. Perfect for saving podcasts, extracting background tracks, or creating sound bites completely offline.',
        faqs: [
            { question: 'Does it upload my video to a server?', answer: 'No. The extraction happens entirely inside your browser using WebAssembly. Your files remain 100% private.' },
            { question: 'Can I extract only a specific section of the video?', answer: 'Yes, toggle "Extract Segment" to set custom start and end timestamps.' },
            { question: 'What audio formats are supported?', answer: 'You can extract to MP3, WAV, AAC, M4A, FLAC, and OGG.' }
        ],
        specs: [
            { label: 'Input Formats', value: 'MP4, MOV, MKV, WebM, AVI, FLV, WMV' },
            { label: 'Output Formats', value: 'MP3, WAV, AAC, M4A, FLAC, OGG' },
            { label: 'Audio Quality', value: 'Up to 320kbps MP3 / Lossless WAV' },
            { label: 'Engine', value: 'FFmpeg WASM (Local)' }
        ],
        privacyNotes: 'Your video never leaves your browser. All audio demuxing and encoding happens locally on-device.'
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
        id: 'pdf-watermark',
        title: 'PDF Watermark & Numberer',
        description: 'Add confidential watermarks, text stamps, and page numbers to PDFs.',
        category: ToolCategory.DOCS,
        icon: Stamp,
        component: <PdfWatermark />,
        guideTitle: 'How to add watermarks and page numbers to PDF documents',
        guideContent: 'Stamp diagonal confidential watermarks (CONFIDENTIAL, DRAFT, SAMPLE) or custom text onto your PDF pages with adjustable opacity and rotation. Also adds headers and footers with flexible page numbering templates.',
        faqs: [
            { question: 'Can I choose which pages get watermarked?', answer: 'Yes, apply to all pages, first page only, odd pages, even pages, or specific ranges.' },
            { question: 'Is my PDF uploaded to a cloud server?', answer: 'No. All stamping and page rendering occurs locally inside your browser using pdf-lib and PDF.js.' }
        ],
        specs: [
            { label: 'Watermark Styles', value: 'Diagonal (45°), Horizontal (0°), Custom Angles' },
            { label: 'Page Numbering', value: 'Page {n} of {total}, {n}/{total}, Top/Bottom Alignment' },
            { label: 'Engine', value: 'pdf-lib & PDF.js (100% Client-Side)' }
        ],
        privacyNotes: 'No document leaves your browser. All vector stamping happens locally on-device.'
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
        title: 'Favicon Generator',
        description: 'Generate a full favicon bundle — ICO, PNG variants, apple-touch-icon, android icons, and webmanifest.',
        category: ToolCategory.IMAGE,
        icon: ImageIcon,
        component: <ImageToIco />,
        popular: true,
        guideTitle: 'How to generate a complete favicon bundle for your website',
        guideContent: 'Upload any image and instantly generate a complete, production-ready favicon package. The bundle includes a multi-size favicon.ico, PNG variants for every platform (16px, 32px, 48px), an apple-touch-icon for iOS home screens (180px), Android Chrome icons (192px and 512px), and a site.webmanifest for PWA support. Just extract the ZIP into your public folder and add the provided HTML snippet.',
        faqs: [
            { question: 'What is included in the SEO bundle?', answer: 'The bundle contains favicon.ico (multi-size: 16, 32, 48px), favicon-16x16.png, favicon-32x32.png, favicon-48x48.png, apple-touch-icon.png (180px), android-chrome-192x192.png, android-chrome-512x512.png, and site.webmanifest.' },
            { question: 'Does it support transparent backgrounds?', answer: 'Yes. PNG and SVG images with transparency will have their alpha channel preserved in all output files.' },
            { question: 'What image formats can I upload?', answer: 'Any browser-renderable image: PNG, JPG, WebP, SVG, GIF, AVIF, and more.' },
            { question: 'Is my image uploaded anywhere?', answer: 'No. All processing happens locally in your browser using the Canvas API. Nothing is sent to a server.' },
        ],
        specs: [
            { label: 'Supported Inputs', value: 'PNG, SVG, JPG, WebP, AVIF, GIF' },
            { label: 'ICO Output', value: 'Multi-size (16, 32, 48px)' },
            { label: 'PNG Outputs', value: '16, 32, 48, 180, 192, 512px' },
            { label: 'Extras', value: 'apple-touch-icon + site.webmanifest' },
        ],
        privacyNotes: 'All favicon generation happens locally in your browser — no images are uploaded to any server.',
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
        swapId: 'apng-to-gif',
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
        swapId: 'gif-to-apng',
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
        swapId: 'webp-to-gif',
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
        swapId: 'webp-to-jpg',
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
        swapId: 'webp-to-png',
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
        swapId: 'gif-to-webp',
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
        swapId: 'jpg-to-webp',
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
        swapId: 'png-to-webp',
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
        swapId: 'text-to-pdf',
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
        swapId: 'pdf-to-text',
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
    {
        id: 'pdf-redact',
        title: 'PDF Redactor',
        description: 'Draw black bars over sensitive text. Normal or permanent true-redact mode.',
        category: ToolCategory.DOCS,
        icon: EyeOff,
        component: <PdfRedact />,
        guideTitle: 'How to permanently redact sensitive information from a PDF',
        guideContent: 'Drag to draw black redaction bars over any text or images you want to hide. Normal mode paints a black rectangle on the PDF layer — fast and small. True Redact mode rasterizes every page into pixels before applying the bars, destroying the text data entirely so no tool, search engine, or AI can recover it.',
        faqs: [
            { question: "What is the difference between Normal and True Redact?", answer: "Normal mode draws a black filled rectangle directly onto the PDF vector layer — it looks redacted but the underlying text may still be extractable with specialized tools. True Redact converts each page into a flat image first, then burns the black bars into the pixels. The output has no text layer at all, making recovery impossible." },
            { question: "Can AI see through the redactions?", answer: "In True Redact mode, no. The output is a purely image-based PDF. There is no text content stream, so no language model, OCR tool, or search index can read the redacted content. Normal mode bars can theoretically be removed by editing the PDF structure." },
            { question: "Does this upload my PDF anywhere?", answer: "Never. All rendering, redaction drawing, and export happen entirely in your browser using PDF.js and pdf-lib. Your document never leaves your device." },
            { question: "Can I undo a redaction after exporting?", answer: "Once exported in True Redact mode, the information is gone forever. In Normal mode the bar is embedded in the PDF but technically reversible with low-level editors. Use True Redact for legally sensitive documents." },
        ],
        specs: [
            { label: "Normal mode engine", value: "pdf-lib (vector)" },
            { label: "True Redact engine", value: "PDF.js + jsPDF (image)" },
            { label: "Output", value: "PDF (no upload)" },
        ],
        privacyNotes: "All processing is 100% client-side. Your PDF is never uploaded or transmitted.",
    },
    {
        id: 'svg-converter',
        title: 'SVG Code to SVG',
        description: 'Paste SVG markup, preview it live, and download as an .svg file.',
        swapId: 'svg-to-code',
        category: ToolCategory.DEV,
        icon: FileCode2,
        component: <SvgConverter />,
        guideTitle: 'How to convert SVG code into a downloadable SVG file',
        guideContent: 'Write or paste raw SVG markup and instantly see a live rendering. The tool validates your code in real-time, highlights errors, and lets you export a clean .svg file — no server uploads, no design software needed.',
        faqs: [
            { question: 'What is SVG?', answer: 'SVG (Scalable Vector Graphics) is an XML-based format for vector images that can be scaled to any size without losing quality.' },
            { question: 'Is my code safe?', answer: 'Yes — all processing happens entirely in your browser. Your SVG code never leaves your device.' },
            { question: 'Can I use custom fonts or external URLs?', answer: 'Inline fonts work fine. External URL references (like Google Fonts) may be blocked by browser security policies in the preview.' },
        ],
        specs: [
            { label: 'Input', value: 'Raw SVG markup (XML)' },
            { label: 'Output', value: '.svg file download' },
            { label: 'Validation', value: 'Real-time DOMParser check' },
            { label: 'Preview backgrounds', value: 'Dark, Light, Transparent' },
        ],
        privacyNotes: 'SVG code is processed entirely in-browser. Nothing is transmitted to any server.'
    },
    {
        id: 'svg-to-code',
        title: 'SVG to Code',
        description: 'Upload an SVG file and extract its raw source markup.',
        swapId: 'svg-converter',
        category: ToolCategory.DEV,
        icon: FileSearch,
        component: <SvgToCode />,
        guideTitle: 'How to extract SVG source code from an SVG file',
        guideContent: 'Open any SVG file and instantly view, copy, or download its raw XML markup. Perfect for developers who need to inspect icon libraries, tweak SVG paths, or embed inline SVG into HTML.',
        faqs: [
            { question: 'What is SVG source code?', answer: 'SVG files are XML text files. This tool reads that text so you can copy, edit, or embed it directly in your code.' },
            { question: 'Can I edit the code after extracting?', answer: 'Yes — the code panel is fully editable. Make changes and the preview updates live.' },
            { question: 'Is my file safe?', answer: 'All processing is done entirely in your browser. The file never leaves your device.' },
        ],
        specs: [
            { label: 'Input', value: '.svg file' },
            { label: 'Output', value: 'Raw SVG markup (editable)' },
            { label: 'Preview', value: 'Live render in browser' },
        ],
        privacyNotes: 'SVG files are read locally in-browser. No data is uploaded.'
    },
    {
        id: 'text-compare',
        title: 'Text Compare',
        description: 'Compare two text blocks side-by-side with highlighted diff.',
        category: ToolCategory.TEXT,
        icon: GitCompare,
        component: <TextCompareTool />,
        guideTitle: 'How to compare and diff two text documents',
        guideContent: 'Paste two versions of any text into the left and right panels, then click Compare to see a colour-coded diff. Added lines appear in green, removed lines in red, and unchanged lines stay neutral — making code reviews, document revisions, and data reconciliation fast and visual.',
        faqs: [
            { question: 'What algorithm is used for diffing?', answer: 'We use a line-by-line LCS (Longest Common Subsequence) algorithm — the same underlying approach as the Unix diff utility.' },
            { question: 'Is my text sent to a server?', answer: 'No — the entire comparison runs in your browser. Your text never leaves your device.' },
        ],
        specs: [
            { label: 'Algorithm', value: 'LCS line-by-line diff' },
            { label: 'Output', value: 'Side-by-side colour diff' },
            { label: 'Stats', value: 'Added / removed / unchanged counts' },
        ],
        privacyNotes: 'All text comparison happens entirely in your browser. Nothing is sent to any server.'
    },
    {
        id: 'gradient-creator',
        title: 'Gradient Creator',
        description: 'Design linear, radial, and conic gradients and export as PNG.',
        category: ToolCategory.IMAGE,
        icon: Palette,
        component: <GradientCreator />,
        guideTitle: 'How to create and export gradient images',
        guideContent: 'Build beautiful gradients for backgrounds, banners, and UI components. Choose from linear, radial, or conic types, add multiple colour stops, and fine-tune positions. Use built-in presets for instant inspiration, then export at any custom resolution.',
        faqs: [
            { question: 'What sizes can I export?', answer: 'You can choose from common presets (Square, HD, FHD, Story, Banner) or enter any custom width and height.' },
            { question: 'Can I copy the CSS gradient?', answer: 'Yes — the tool shows the equivalent CSS gradient string that you can copy and paste directly into your stylesheet.' },
        ],
        specs: [
            { label: 'Types', value: 'Linear, Radial, Conic' },
            { label: 'Color stops', value: 'Unlimited, freely positioned' },
            { label: 'Export', value: 'PNG or JPEG at any resolution' },
        ],
        privacyNotes: 'Gradients are rendered on an HTML Canvas in your browser. No data is uploaded.'
    },
    {
        id: 'color-tool',
        title: 'Color Tool',
        description: 'Generate color palettes, verify contrast ratio, scale tints/shades, and convert color formats.',
        category: ToolCategory.IMAGE,
        icon: Pipette,
        component: <ColorTool />,
        guideTitle: 'How to use the color palette and utility dashboard',
        guideContent: 'Access a complete design workbench. Generate harmonies like complementary or analogous, run real-time contrast checks against WCAG 2.1 standards for accessibility, construct tints & shades, and convert color values seamlessly across HEX, RGB, HSL, and CMYK formats.',
        faqs: [
            { question: 'What harmony rules are supported?', answer: 'We support complementary (2 colors), analogous (3 colors), triadic (3 colors), split-complementary (3 colors), tetradic (4 colors), and monochromatic (5 colors) options.' },
            { question: 'What contrast standards does the checker follow?', answer: 'We use the WCAG 2.1 formula for relative luminance to verify contrast ratios against the AA threshold (4.5:1 for normal text, 3.0:1 for large text) and the AAA threshold (7.0:1 for normal text, 4.5:1 for large text).' },
            { question: 'Are colors processed locally?', answer: 'Yes, all calculations, color wheel rotations, dynamic palette rendering, and PNG generation happen entirely inside your browser locally.' }
        ],
        specs: [
            { label: 'Harmonies', value: 'Complementary · Analogous · Triadic · Split-Complementary · Tetradic · Monochromatic' },
            { label: 'WCAG Metrics', value: 'Normal & Large Text (AA & AAA compliance)' },
            { label: 'Formats', value: 'HEX · RGB · HSL · CMYK (real-time synchronized)' }
        ],
        privacyNotes: 'All color data processing and exports are done locally in the browser.'
    },
    {
        id: 'file-to-markdown',
        title: 'File to Markdown',
        description: 'Convert PDFs, DOCX, CSV, HTML, and more to clean Markdown.',
        category: ToolCategory.DOCS,
        icon: FileDown,
        component: <FileToMarkdown />,
        guideTitle: 'How to convert any document to Markdown',
        guideContent: 'Drop in a PDF, Word document, CSV spreadsheet, HTML page, JSON, YAML, or plain text file and get a clean Markdown version in seconds. Perfect for feeding content into AI tools, static-site generators, or documentation pipelines — all without uploading to any server.',
        faqs: [
            { question: 'Which formats are supported?', answer: 'PDF, DOCX, CSV, JSON, YAML, XML, HTML, TXT, and MD files are all supported.' },
            { question: 'How are PDFs converted?', answer: 'We use PDF.js to extract text from each page and structure it as Markdown headings and paragraphs.' },
            { question: 'What about Word documents?', answer: 'DOCX files are processed with the Mammoth library, which preserves headings, bold, italic, and links.' },
        ],
        specs: [
            { label: 'Input formats', value: 'PDF, DOCX, CSV, JSON, YAML, XML, HTML, TXT, MD' },
            { label: 'Output', value: 'Clean .md file' },
            { label: 'Engine', value: 'PDF.js · Mammoth · PapaParse' },
        ],
        privacyNotes: 'All parsing and conversion runs locally in your browser. Your files are never uploaded.'
    },
    {
        id: 'font-previewer',
        title: 'Font Previewer',
        description: 'Browse and preview 100+ Google Fonts with custom text and sizes.',
        category: ToolCategory.DEV,
        icon: Type,
        component: <FontPreviewer />,
        guideTitle: 'How to find the perfect font for your project',
        guideContent: 'Type your own sample text, adjust the size, and scroll through a curated library of Google Fonts to find your perfect typeface. Click any font for a deep-dive view showing regular and bold weights, full alphabet, a heading/body mockup, and a ready-to-paste CSS snippet.',
        faqs: [
            { question: 'Are fonts loaded for free?', answer: 'Yes — fonts are loaded directly from Google Fonts at no cost. An internet connection is required to render them.' },
            { question: 'Can I copy the CSS code?', answer: 'Yes — each font card has a one-click "Copy CSS" button that copies the font-family declaration. The detail view also provides the full @import URL.' },
        ],
        specs: [
            { label: 'Font library', value: '100+ curated Google Fonts' },
            { label: 'Preview', value: 'Custom text, size, regular & bold weights' },
            { label: 'Export', value: 'CSS @import + font-family snippet' },
        ],
        privacyNotes: 'Font requests are made to fonts.googleapis.com. No user data is collected or transmitted.'
    },
    {
        id: 'image-splitter',
        title: 'Image Splitter',
        description: 'Split wide or tall images into equal slices for seamless Instagram carousels & stories.',
        category: ToolCategory.IMAGE,
        icon: SplitSquareHorizontal,
        component: <ImageSplitter />,
        guideTitle: 'How to split images for Instagram carousel seamless effect',
        guideContent: 'Upload a wide or tall image, choose your split preset (1080×1350 for portrait carousels, 1080×1080 for square), and hit Split. The tool slices the image into perfectly-sized panels and lets you download them all in a ZIP. For a seamless panoramic carousel on Instagram, use a single wide image and let this tool divide it — upload slides right-to-left so they appear left-to-right in the carousel.',
        faqs: [
            { question: 'What is the Instagram carousel dimension?', answer: 'For portrait carousels the recommended size per slide is 1080×1350 px (4:5 ratio). For square carousels it is 1080×1080 px. This tool creates slices at exactly those dimensions.' },
            { question: 'How do I get the seamless panoramic effect?', answer: 'Create one single wide image (e.g. 5400×1350 px for 5 slides), upload it here, choose the IG Carousel preset, and split. Upload the resulting slices to Instagram in right-to-left order — Instagram will display them left to right, creating the illusion of one continuous image.' },
            { question: 'Does this upload my image anywhere?', answer: 'No — all splitting is done locally in your browser using the Canvas API. Nothing is ever sent to a server.' },
            { question: 'Can I split vertically for stories?', answer: 'Yes — choose the IG Story preset or Custom and select Vertical split direction to divide a tall image into story-sized panels.' },
        ],
        specs: [
            { label: 'Presets', value: 'IG Carousel (1080×1350), Square (1080×1080), Story (1080×1920)' },
            { label: 'Custom', value: 'Any pixel width/height + horizontal or vertical split' },
            { label: 'Export', value: 'Individual PNG or bulk ZIP download' },
            { label: 'Engine', value: 'Canvas API — fully client-side' },
        ],
        privacyNotes: 'All image processing is performed locally in your browser using the Canvas API. No images or data are uploaded to any server.'
    },
    {
        id: 'social-mockup-checker',
        title: 'Social Mockup Checker',
        description: 'Preview Instagram Stories, Reels, Feed Posts, Carousels & Ads inside a 3D phone mockup with official Meta safe zone guides.',
        category: ToolCategory.IMAGE,
        icon: Smartphone,
        component: <SocialMockupChecker />,
        guideTitle: 'How to preview social media graphics & check safe zones',
        guideContent: 'Upload your design images or multi-slide carousel images, select your target Instagram/Meta format (Story 9:16, Story Ad 9:16, Feed 4:5, Feed 1:1, Carousel, or Feed Ad), and preview them live inside an interactive 3D mobile phone mockup. Toggle official Meta safe zone guides to ensure top headers, bottom CTA buttons, message reply bars, and profile grid cropping will not obscure your text or logos.',
        faqs: [
            { question: 'What are Meta / Instagram safe zones?', answer: 'Safe zones are the recommended areas inside a story or reel graphic where text and key elements will not be covered by top account headers, status bars, or bottom message reply pills and swipe-up buttons.' },
            { question: 'What is the 1:1 profile grid crop for 4:5 posts?', answer: 'When you post a 4:5 portrait post (1080×1350), Instagram crops the top and bottom ~135px when displaying it in your 1:1 profile grid. The safe zone guide highlights this crop boundary so your grid looks perfect.' },
            { question: 'Can I preview multi-slide carousels?', answer: 'Yes — upload multiple images at once to switch between slides with realistic swipe arrow buttons, pagination dots, and slide counters inside the 3D phone screen.' },
            { question: 'Are my designs uploaded to a server?', answer: 'No — all rendering, 3D transformations, and high-res PNG exports occur entirely client-side in your browser for 100% privacy.' },
        ],
        specs: [
            { label: 'Supported Formats', value: 'Stories (9:16), Reels, Feed 4:5, Feed 1:1, Carousels, Story Ads, Feed Ads' },
            { label: 'Export Options', value: '1×, 2×, 3× Retina PNG (With/Without UI Chrome)' },
            { label: '3D Phone Stage', value: 'Interactive Tilt X/Y/Z, Device Finishes, Studio Backdrops' },
            { label: 'Engine', value: 'HTML Canvas & CSS 3D (100% Client-Side)' },
        ],
        privacyNotes: 'All mockup rendering and safe zone checks are processed locally inside your web browser. No graphics or data are sent to external servers.'
    },
    {
        id: 'palette-extractor',
        title: 'Palette Extractor',
        description: 'Extract dominant color palettes, moods, and CSS variables from images.',
        category: ToolCategory.IMAGE,
        icon: Palette,
        component: <PaletteExtractor />,
        guideTitle: 'How to extract dominant color palettes from any photo',
        guideContent: 'Drop any image to extract dominant color swatches using Canvas color quantization. Explore different moods (Vibrant, Muted, Light, Dark, Pastel), sample custom points with the interactive eyedropper, and copy CSS variables or Tailwind snippets.',
        faqs: [
            { question: 'What formats can I export?', answer: 'You can copy individual HEX/RGB/HSL values, CSS Variables, Tailwind config, JSON data, or download a high-res PNG swatch card.' },
            { question: 'Can I pick custom colors from the image?', answer: 'Yes! Simply click anywhere on the image preview to sample custom color points.' },
        ],
        specs: [
            { label: 'Supported Inputs', value: 'PNG, JPG, WebP, AVIF, SVG, GIF' },
            { label: 'Export Options', value: 'HEX, CSS Variables, Tailwind, JSON, PNG Card' },
            { label: 'Color Quantization', value: 'Spatial 3D RGB Clustering (100% Local)' }
        ],
        privacyNotes: 'Color extraction happens entirely in-browser. No images are uploaded to any server.'
    },
    {
        id: 'exif-stripper',
        title: 'EXIF Metadata Stripper',
        description: 'Inspect camera info, remove GPS geo-tags, and sanitize photos before sharing.',
        category: ToolCategory.IMAGE,
        icon: EyeOff,
        component: <ExifStripper />,
        guideTitle: 'How to remove GPS and personal metadata from photos',
        guideContent: 'Digital photos often contain sensitive metadata including GPS coordinates, camera serial numbers, and exact timestamps. Our EXIF stripper audits these hidden tags and losslessly sanitizes the file without touching pixel quality.',
        faqs: [
            { question: 'Does stripping metadata reduce image quality?', answer: 'No! For JPEG files, our tool performs a lossless binary segment strip that leaves 100% of your pixel data untouched.' },
            { question: 'What metadata is removed?', answer: 'GPS latitude/longitude, camera model, lens specs, shutter speed, ISO, timestamps, and editing software tags.' }
        ],
        specs: [
            { label: 'Supported Formats', value: 'JPEG, PNG, WebP, TIFF' },
            { label: 'Stripping Engine', value: 'Lossless Binary Slice & Canvas Sanitizer' },
            { label: 'Audit Details', value: 'GPS Coordinates, Camera Specs, Timestamps' }
        ],
        privacyNotes: 'Your photos are processed entirely on your device. Metadata is stripped locally in memory.'
    },
];

import { useNavigate } from 'react-router-dom';
import { useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { useIsMobile } from '../hooks/useIsMobile';

interface DashboardProps {
    activeCategory: string;
    setActiveCategory?: (category: string) => void;
}

const getCategoryStyles = (category: ToolCategory) => {
    switch (category) {
        case ToolCategory.VIDEO: return { icon: 'bg-pink-500/10 text-pink-500 group-hover:bg-pink-500/20', badge: 'bg-pink-500/10 text-pink-400 border-pink-500/20' };
        case ToolCategory.IMAGE: return { icon: 'bg-blue-500/10 text-blue-500 group-hover:bg-blue-500/20', badge: 'bg-blue-500/10 text-blue-400 border-blue-500/20' };
        case ToolCategory.AUDIO: return { icon: 'bg-violet-500/10 text-violet-500 group-hover:bg-violet-500/20', badge: 'bg-violet-500/10 text-violet-400 border-violet-500/20' };
        case ToolCategory.DOCS: return { icon: 'bg-red-500/10 text-red-500 group-hover:bg-red-500/20', badge: 'bg-red-500/10 text-red-400 border-red-500/20' };
        case ToolCategory.TEXT: return { icon: 'bg-orange-500/10 text-orange-500 group-hover:bg-orange-500/20', badge: 'bg-orange-500/10 text-orange-400 border-orange-500/20' };
        case ToolCategory.DEV: return { icon: 'bg-indigo-500/10 text-indigo-400 group-hover:bg-indigo-500/20', badge: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' };
        default: return { icon: 'bg-yellow-500/10 text-yellow-500 group-hover:bg-yellow-500/20', badge: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' };
    }
};

export const Dashboard: React.FC<DashboardProps> = ({ activeCategory, setActiveCategory }) => {
    const navigate = useNavigate();
    const isMobile = useIsMobile();
    const [searchQuery, setSearchQuery] = useState('');
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Cmd+K / Ctrl+K keyboard shortcut for search focus
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                searchInputRef.current?.focus();
                searchInputRef.current?.select();
            }
            if (e.key === 'Escape' && document.activeElement === searchInputRef.current) {
                setSearchQuery('');
                searchInputRef.current?.blur();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, []);

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

        return [...tools].sort((a, b) => {
            if (a.comingSoon !== b.comingSoon) return (a.comingSoon ? 1 : 0) - (b.comingSoon ? 1 : 0);
            if (!searchQuery.trim() && a.popular !== b.popular) {
                return (b.popular ? 1 : 0) - (a.popular ? 1 : 0);
            }
            return 0;
        });
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
                    ref={searchInputRef}
                    type="text"
                    className="block w-full pl-10 pr-24 py-3 border border-zinc-800 rounded-xl leading-5 bg-zinc-900/50 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:bg-zinc-900 focus:ring-1 focus:ring-indigo-500/50 focus:border-indigo-500/50 sm:text-sm transition-all"
                    placeholder="Search tools..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Search tools"
                />
                <div className="absolute inset-y-0 right-0 flex items-center gap-2 pr-3">
                    {searchQuery ? (
                        <button
                            onClick={() => { setSearchQuery(''); searchInputRef.current?.focus(); }}
                            className="p-1 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all"
                            aria-label="Clear search"
                        >
                            <X size={14} />
                        </button>
                    ) : (
                        <kbd className="hidden sm:inline-flex items-center px-2 py-0.5 text-[10px] font-mono text-zinc-600 bg-zinc-800/80 border border-zinc-700/50 rounded-md select-none">
                            ⌘K
                        </kbd>
                    )}
                </div>
            </div>

            {/* Result count */}
            {(searchQuery || activeCategory !== 'All') && filteredTools.length > 0 && (
                <div className="text-xs text-zinc-600 font-medium">
                    {filteredTools.length} tool{filteredTools.length !== 1 ? 's' : ''}
                    {searchQuery && <span> matching "<span className="text-zinc-400">{searchQuery}</span>"</span>}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredTools.map((tool) => {
                    const styles = getCategoryStyles(tool.category);
                    return (
                        <div
                            key={tool.id}
                            onClick={() => handleToolClick(tool)}
                            className={`group bg-zinc-900/80 border border-zinc-800/50 rounded-2xl transition-all duration-300 relative flex flex-col h-full ${
                                tool.comingSoon
                                    ? 'opacity-75 grayscale-[0.5] cursor-not-allowed'
                                    : 'cursor-pointer hover:bg-zinc-800/90 hover:-translate-y-0.5 hover:border-indigo-500/50 hover:shadow-[0_8px_32px_rgba(79,70,229,0.15)]'
                            }`}
                        >
                            {/* Background Glow Effect */}
                            <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                                <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full blur-3xl transition-all duration-500 bg-indigo-500/5 group-hover:bg-indigo-500/15" />
                            </div>

                            {/* Content */}
                            <div className="relative z-10 flex flex-col h-full p-6">
                                <div className="flex items-start justify-between mb-4">
                                    {isMobile ? (
                                        <div className={`p-3 rounded-2xl transition-colors ${styles.icon}`}>
                                            <tool.icon size={24} />
                                        </div>
                                    ) : (
                                        <Tooltip content={tool.category} position="right">
                                            <div className={`p-3 rounded-2xl transition-colors ${styles.icon}`}>
                                                <tool.icon size={24} />
                                            </div>
                                        </Tooltip>
                                    )}
                                    {tool.popular && (
                                        isMobile ? (
                                            <span className="bg-amber-500/10 text-amber-400 text-xs px-2 py-1 rounded-full border border-amber-500/20 font-medium">
                                                Popular
                                            </span>
                                        ) : (
                                            <Tooltip content="Trending among users">
                                                <span className="bg-amber-500/10 text-amber-400 text-xs px-2 py-1 rounded-full border border-amber-500/20 font-medium">
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

                                <div className="mt-6 flex items-center justify-between pt-3 border-t border-zinc-800/50">
                                    <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-md border ${styles.badge}`}>
                                        {tool.category}
                                    </span>
                                    {tool.comingSoon ? (
                                        <span className="text-zinc-500 font-bold uppercase tracking-widest text-[10px] bg-zinc-800 px-2 py-1 rounded-md border border-zinc-700">Coming Soon</span>
                                    ) : (
                                        <span className="text-sm font-bold text-zinc-600 group-hover:text-indigo-400 transition-colors flex items-center gap-1">
                                            Try now <span className="opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all inline-block">→</span>
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}

                {filteredTools.length === 0 && (
                    <div className="col-span-full flex flex-col items-center justify-center py-16 text-zinc-500">
                        <div className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800 mb-4">
                            <Search size={24} className="text-zinc-600" />
                        </div>
                        <p className="text-base font-semibold text-zinc-400 mb-1">No tools found</p>
                        <p className="text-sm text-zinc-600 text-center max-w-xs">
                            No results for "<span className="text-zinc-500">{searchQuery}</span>" — try a different keyword
                        </p>
                        <button
                            onClick={() => setSearchQuery('')}
                            className="mt-4 text-xs text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors"
                        >
                            Clear search
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};