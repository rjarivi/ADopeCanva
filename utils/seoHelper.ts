import { ToolItem, ToolCategory, ProgrammaticSubRoute, HowToStep, ComparisonTableData, FAQItem } from '../types';

export const SITE_URL = 'https://adopecanva.com';
export const SITE_NAME = 'AdopeCanva';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/Thumbnail.png`;

// Category definitions with rich SEO metadata
export interface CategoryMeta {
  id: string;
  name: string;
  category: ToolCategory | 'Converters';
  title: string;
  h1: string;
  description: string;
  keywords: string[];
  features: string[];
  faqs: FAQItem[];
}

export const CATEGORY_METAS: Record<string, CategoryMeta> = {
  image: {
    id: 'image',
    name: 'Image Tools',
    category: ToolCategory.IMAGE,
    title: 'Free In-Browser Image Tools, Converters & Editors',
    h1: 'Online Image Processing & Conversion Suite',
    description: 'Compress, convert, upscale, edit, and crop images entirely inside your browser. 100% private with zero server uploads. Convert between WebP, PNG, JPG, AVIF, HEIC, and ICO.',
    keywords: ['image converter', 'image compressor', 'png to webp', 'photo editor online', 'in-browser image tool', 'remove background free', 'mockup generator'],
    features: ['100% Client-Side Canvas & Wasm Processing', 'Zero Server File Uploads', 'Lossless & High-Compression Options', 'Batch Processing Support'],
    faqs: [
      { question: 'Do image tools upload my photos to external servers?', answer: 'No. All image operations (compressing, resizing, converting, cropping) execute locally in your browser memory using the HTML5 Canvas API and WebAssembly.' },
      { question: 'Which image formats are supported?', answer: 'We support WebP, PNG, JPEG/JPG, AVIF, GIF, APNG, SVG, ICO, BMP, and HEIC across our tools.' },
      { question: 'What is the maximum image resolution supported?', answer: 'Tools support up to 8000x8000 pixels or standard browser RAM limits (typically 100MB+ per file).' },
      { question: 'Can I use these tools for commercial graphic design?', answer: 'Yes! All exports are 100% free with no watermarks, licenses, or paywalls for both personal and commercial projects.' },
    ]
  },
  video: {
    id: 'video',
    name: 'Video Tools',
    category: ToolCategory.VIDEO,
    title: 'Free In-Browser Video Editors, Trimmers & Converters',
    h1: 'Client-Side Video Processing & GIF Maker Suite',
    description: 'Trim, compress, convert, and replace audio in videos directly in your browser with FFmpeg WebAssembly. No watermarks, no upload latency, complete privacy.',
    keywords: ['video trimmer online', 'video compressor', 'video to gif', 'mp4 converter', 'ffmpeg in browser', 'free video editor no watermark'],
    features: ['Powered by FFmpeg WebAssembly', 'Local Frame-Accurate Trimming', 'Zero Watermarks or Quality Limits', 'Fast Client-Side Render'],
    faqs: [
      { question: 'How can video editing run without uploading?', answer: 'We leverage FFmpeg compiled to WebAssembly (Wasm). Your browser executes the encoding engine locally utilizing your device CPU and GPU.' },
      { question: 'Are there file size limits on video tools?', answer: 'Because files are handled in browser memory, we recommend video clips up to 500MB for optimal performance.' },
      { question: 'Does converting add watermarks to my video?', answer: 'Never. All outputs are clean, full-quality, and watermark-free.' }
    ]
  },
  audio: {
    id: 'audio',
    name: 'Audio Tools',
    category: ToolCategory.AUDIO,
    title: 'Free In-Browser Audio Converters, Trimmers & Waveform Exporter',
    h1: 'Online Audio Conversion & Sound Editing Suite',
    description: 'Convert between MP3, WAV, AAC, and OGG formats, trim tracks with waveform precision, merge audio clips, and export high-res visual audio waveforms locally.',
    keywords: ['audio converter online', 'mp3 to wav', 'audio trimmer', 'audio merger', 'waveform exporter', 'free sound editor'],
    features: ['High-Fidelity Sample Rate Preservation', 'Interactive Visual Waveform Editor', 'Lossless & Compressed Audio Formats', 'Instant Local Export'],
    faqs: [
      { question: 'What audio formats can I convert?', answer: 'Convert seamlessly between MP3, WAV, AAC, OGG, FLAC, and M4A.' },
      { question: 'Can I trim ringtones or podcast snippets?', answer: 'Yes! Our visual audio trimmer allows millisecond-accurate start and end slicing.' }
    ]
  },
  docs: {
    id: 'docs',
    name: 'Document & PDF Tools',
    category: ToolCategory.DOCS,
    title: 'Free In-Browser PDF Suite, Redactor & Document Converters',
    h1: 'Client-Side PDF & Office Document Suite',
    description: 'Split, merge, redact, convert PDFs to JPG/Text, convert Word documents to Markdown, and edit spreadsheets with 100% confidential client-side processing.',
    keywords: ['pdf redactor', 'pdf to text', 'pdf to jpg', 'text to pdf', 'file to markdown', 'excel viewer online', 'private pdf tools'],
    features: ['True Pixel-Burn Permanent PDF Redaction', 'Local PDF.js & Mammoth Parsing', 'Confidential File Protection', 'Batch Document Conversions'],
    faqs: [
      { question: 'Is my confidential PDF document protected?', answer: 'Yes. Documents are parsed directly inside your browser memory using PDF.js and pdf-lib. No document is ever sent across the network.' },
      { question: 'What is True Redact mode?', answer: 'True Redact mode rasterizes the PDF pages into flat pixels before applying black bars, permanently destroying underlying text streams so AI and search engines can never recover it.' }
    ]
  },
  text: {
    id: 'text',
    name: 'Text & Content Tools',
    category: ToolCategory.TEXT,
    title: 'Free Text Utilities, Diff Comparison & Markdown Suite',
    h1: 'Online Text Formatting & Content Optimization Suite',
    description: 'Clean messy text, perform side-by-side line diffs, count words, transform case, create SEO URL slugs, and write Markdown in a live split-screen editor.',
    keywords: ['text diff online', 'text cleaner', 'slug generator', 'word counter', 'markdown creator', 'text utilities'],
    features: ['LCS Side-by-Side Diff Engine', 'Real-Time Word & Character Metrics', 'Live Markdown Parser', 'One-Click Copy & Export'],
    faqs: [
      { question: 'Can I compare large source files or code?', answer: 'Yes! The text diff tool uses an optimized Longest Common Subsequence (LCS) algorithm to highlight additions and deletions in real-time.' }
    ]
  },
  dev: {
    id: 'dev',
    name: 'Developer Tools',
    category: ToolCategory.DEV,
    title: 'Free In-Browser Developer Utilities, Formatter & SVG Suite',
    h1: 'Client-Side Web Developer & Code Utility Suite',
    description: 'Convert HTML to images, inspect & convert SVG markup, beautify/minify JSON & CSS, test Google Fonts, and generate device mockups in seconds.',
    keywords: ['html to image', 'svg to code', 'json formatter', 'code beautifier', 'font previewer', 'device mockup generator'],
    features: ['Instant DOM-to-Canvas Capture', 'Live XML & JSON Linting', '100+ Google Fonts Interactive Preview', 'Retina 3x Mockup Rendering'],
    faqs: [
      { question: 'How does HTML to Image work?', answer: 'We render the HTML/CSS DOM directly onto an HTML5 Canvas using client-side rasterization and export it to high-res PNG, JPEG, or WebP.' }
    ]
  },
  converters: {
    id: 'converters',
    name: 'All Converters Matrix',
    category: 'Converters',
    title: 'Universal In-Browser Format Converters Matrix',
    h1: 'All-in-One Online File Conversion Matrix',
    description: 'Transform images, videos, audio files, documents, and code formats seamlessly with zero uploads. Choose any source and target format for instant conversion.',
    keywords: ['file converter online', 'universal converter', 'png to webp', 'pdf to text', 'video to gif', 'svg converter'],
    features: ['Cross-Format Matrix Permutations', 'Zero Server Latency', 'Batch Export Options', 'Format Specifications Breakdown'],
    faqs: [
      { question: 'Why use client-side converters over cloud converters?', answer: 'Cloud converters require uploading large files over your internet connection and waiting in server queues. Client-side converters process immediately on your machine with no network upload delay and total privacy.' }
    ]
  }
};

// Programmatic Sub-Routes Matrix (Intent-focused specific URLs)
export const PROGRAMMATIC_SUB_ROUTES: ProgrammaticSubRoute[] = [
  // /image-converter permutations
  {
    slug: 'png-to-webp',
    parentToolId: 'image-converter',
    title: 'Free PNG to WebP Converter Online (Lossless & High Compression)',
    h1: 'Convert PNG to WebP Online (100% In-Browser & Fast)',
    metaDescription: 'Batch convert PNG images to modern WebP format online for free. Reduce file size up to 80% with transparency preserved. 100% private, no server uploads.',
    sourceFormat: 'PNG',
    targetFormat: 'WebP',
    guideTitle: 'How to Convert PNG to WebP for Maximum Web Speed',
    guideContent: 'WebP provides superior lossless and lossy compression for web images. Converting your transparent PNG graphics to WebP drastically shrinks payload size while retaining crisp alpha channels and edge sharpness.',
    steps: [
      { stepNumber: 1, title: 'Upload PNG Images', description: 'Drag and drop one or multiple PNG files into the converter workspace.' },
      { stepNumber: 2, title: 'Select WebP Output & Quality', description: 'Choose WebP target format and adjust quality slider (85-90% is ideal for web performance).' },
      { stepNumber: 3, title: 'Download WebP Files', description: 'Click Convert and download your compact WebP images instantly or as a ZIP archive.' }
    ],
    comparisonTable: {
      title: 'PNG vs. WebP Format Comparison',
      headers: ['Feature / Metric', 'PNG Format', 'WebP Format'],
      rows: [
        { label: 'Average File Size', values: { 'PNG Format': '100% (Baseline)', 'WebP Format': '25% – 35% (65-75% smaller)' }, highlight: true },
        { label: 'Transparency Support', values: { 'PNG Format': 'Full 8-bit Alpha', 'WebP Format': 'Full 8-bit Alpha (Lossless & Lossy)' } },
        { label: 'Compression Type', values: { 'PNG Format': 'Lossless (Deflate)', 'WebP Format': 'Both Lossless & Predictive Lossy' } },
        { label: 'Browser Compatibility', values: { 'PNG Format': '100% (Universal)', 'WebP Format': '99.5% (All modern browsers)' } },
        { label: 'SEO & Core Web Vitals', values: { 'PNG Format': 'Heavy LCP load', 'WebP Format': 'Optimized for 90+ PageSpeed' }, highlight: true }
      ]
    },
    faqs: [
      { question: 'Does WebP support transparent backgrounds like PNG?', answer: 'Yes! WebP supports full 8-bit alpha channel transparency with both lossless and lossy compression, producing much smaller files than PNG.' },
      { question: 'How much file size do I save converting PNG to WebP?', answer: 'On average, WebP lossless images are 26% smaller than PNGs, and lossy WebP images are 60% to 80% smaller with no visible quality loss.' },
      { question: 'Are my images uploaded to your server?', answer: 'No. The conversion is executed 100% on your device using the browser HTML5 Canvas engine. Files never touch any remote server.' }
    ],
    keywords: ['png to webp', 'convert png to webp', 'png to webp converter', 'batch png to webp', 'free png to webp online']
  },
  {
    slug: 'heic-to-jpg',
    parentToolId: 'image-converter',
    title: 'Free HEIC to JPG Converter Online (Client-Side & Fast)',
    h1: 'Convert iPhone HEIC Photos to JPG Online',
    metaDescription: 'Convert Apple iPhone HEIC and HEIF photos to universal JPG format online for free. Fast, high-quality, 100% private in-browser conversion.',
    sourceFormat: 'HEIC',
    targetFormat: 'JPG',
    guideTitle: 'How to Convert Apple iPhone HEIC Photos to JPG',
    guideContent: 'HEIC is the default photo format for modern iOS devices, but many websites and legacy software cannot open it. Our client-side converter turns HEIC files into high-compatibility JPGs in milliseconds.',
    steps: [
      { stepNumber: 1, title: 'Select HEIC Photos', description: 'Drop your .heic or .heif photos from iPhone or iPad into the dropzone.' },
      { stepNumber: 2, title: 'Choose JPG Format', description: 'Select JPG output with your preferred JPEG quality level.' },
      { stepNumber: 3, title: 'Download Universal JPG', description: 'Save your standard JPG image ready to share, print, or upload anywhere.' }
    ],
    comparisonTable: {
      title: 'HEIC vs. JPG Format Comparison',
      headers: ['Feature', 'Apple HEIC', 'Standard JPG'],
      rows: [
        { label: 'Compatibility', values: { 'Apple HEIC': 'iOS & macOS native', 'Standard JPG': '100% Universal on all devices' }, highlight: true },
        { label: 'File Size', values: { 'Apple HEIC': 'Ultra compact (HEVC)', 'Standard JPG': 'Slightly larger' } },
        { label: 'Color Depth', values: { 'Apple HEIC': 'Up to 16-bit', 'Standard JPG': '8-bit Standard' } },
        { label: 'Web Publishing', values: { 'Apple HEIC': 'Not supported by web browsers', 'Standard JPG': 'Universal web standard' }, highlight: true }
      ]
    },
    faqs: [
      { question: 'Why does my iPhone save photos as HEIC?', answer: 'Apple uses High Efficiency Image Container (HEIC) to store high-resolution photos using half the storage of standard JPGs.' },
      { question: 'Is it safe to convert private photos here?', answer: 'Yes! All HEIC decoding and JPG rendering happens locally on your computer. Your photos are never sent across the internet.' }
    ],
    keywords: ['heic to jpg', 'heic to jpeg', 'iphone photo converter', 'convert heic to jpg online', 'heif to jpg free']
  },
  {
    slug: 'svg-to-png',
    parentToolId: 'image-converter',
    title: 'Free SVG to PNG Converter Online (High-Res & Transparent)',
    h1: 'Convert Vector SVG to High-Resolution Transparent PNG',
    metaDescription: 'Convert Scalable Vector Graphics (SVG) to crystal clear PNG images at custom resolutions. Transparent background preserved with zero server uploads.',
    sourceFormat: 'SVG',
    targetFormat: 'PNG',
    guideTitle: 'How to Rasterize Vector SVG Graphics to PNG',
    guideContent: 'Vector SVG files are great for responsive UI, but platforms like Discord, Twitter, and presentations often require raster PNG files. Convert your SVGs into 1x, 2x, or 3x high-DPI PNGs instantly.',
    steps: [
      { stepNumber: 1, title: 'Upload SVG Vector', description: 'Drag your .svg file or icon into the converter area.' },
      { stepNumber: 2, title: 'Choose Resolution Scale', description: 'Pick target dimensions or scale factor for crisp retina-quality rendering.' },
      { stepNumber: 3, title: 'Export Transparent PNG', description: 'Download your crisp raster PNG with transparent alpha background intact.' }
    ],
    comparisonTable: {
      title: 'SVG vs. PNG Format Comparison',
      headers: ['Property', 'Vector SVG', 'Raster PNG'],
      rows: [
        { label: 'Scalability', values: { 'Vector SVG': 'Infinite lossless scaling', 'Raster PNG': 'Fixed pixel grid' } },
        { label: 'Social & App Support', values: { 'Vector SVG': 'Limited on social media', 'Raster PNG': 'Supported everywhere' }, highlight: true },
        { label: 'Transparency', values: { 'Vector SVG': 'Supported', 'Raster PNG': 'Supported (Alpha channel)' } },
        { label: 'Processing', values: { 'Vector SVG': 'XML Code', 'Raster PNG': 'Rasterized Pixels' } }
      ]
    },
    faqs: [
      { question: 'Will the exported PNG have a transparent background?', answer: 'Yes! As long as your source SVG does not have a solid background rect, the output PNG will have full alpha transparency.' }
    ],
    keywords: ['svg to png', 'convert svg to png', 'vector to png', 'high res svg to png', 'transparent svg to png']
  },
  {
    slug: 'webp-to-png',
    parentToolId: 'image-converter',
    title: 'Free WebP to PNG Converter Online (Lossless Quality)',
    h1: 'Convert WebP Images to PNG Format Online',
    metaDescription: 'Convert WebP images to lossless PNG format online for free. Restore universal compatibility for legacy editors like Photoshop. 100% client-side privacy.',
    sourceFormat: 'WebP',
    targetFormat: 'PNG',
    guideTitle: 'How to Convert WebP to Editable PNG Format',
    guideContent: 'WebP is great for web speed, but many image editors, design software, and printers still require PNG. Convert WebP images back to full-fidelity PNG without quality degradation.',
    steps: [
      { stepNumber: 1, title: 'Drop WebP Files', description: 'Upload one or multiple WebP files from your device.' },
      { stepNumber: 2, title: 'Set Output to PNG', description: 'Select PNG as the target format.' },
      { stepNumber: 3, title: 'Download Clean PNGs', description: 'Export your lossless PNG image ready for editing in Photoshop, Canva, or Figma.' }
    ],
    comparisonTable: {
      title: 'WebP vs. PNG Comparison',
      headers: ['Metric', 'WebP Format', 'PNG Format'],
      rows: [
        { label: 'Design Software Support', values: { 'WebP Format': 'Partial on legacy suites', 'PNG Format': '100% universal across all software' }, highlight: true },
        { label: 'Transparency', values: { 'WebP Format': 'Preserved', 'PNG Format': 'Preserved' } },
        { label: 'File Size', values: { 'WebP Format': 'Compact', 'PNG Format': 'Standard' } }
      ]
    },
    faqs: [
      { question: 'Is converting WebP to PNG lossless?', answer: 'Yes! PNG encoding decompresses the WebP image into raw pixel data without discarding any additional color information.' }
    ],
    keywords: ['webp to png', 'convert webp to png', 'webp to png converter', 'save webp as png', 'batch webp to png']
  },
  // /mockup-generator sub-pages
  {
    slug: 'iphone-mockup',
    parentToolId: 'mockup-generator',
    title: 'Free iPhone Mockup Generator Online (iPhone 15 Pro Frames)',
    h1: 'Create Cinematic iPhone Mockups Online',
    metaDescription: 'Wrap screenshots into photorealistic iPhone 15 Pro titanium frames online. Custom background gradients, drop shadows, and 3x retina export.',
    guideTitle: 'How to Wrap App Screenshots in iPhone Device Frames',
    guideContent: 'Showcase mobile app UI and responsive website screenshots in realistic Apple iPhone device frames. Choose Titanium finishes, pick vibrant gradient backdrops, and export high-res marketing banners.',
    steps: [
      { stepNumber: 1, title: 'Drop Mobile Screenshot', description: 'Upload any portrait screenshot from iOS or Android.' },
      { stepNumber: 2, title: 'Select iPhone 15 Pro Frame', description: 'Choose your desired device finish (Natural, Black, or Silver) and custom background.' },
      { stepNumber: 3, title: 'Export 3x Retina Mockup', description: 'Download your polished promotional mockup in high-resolution PNG.' }
    ],
    comparisonTable: {
      title: 'Device Frame Options',
      headers: ['Frame Style', 'Best Used For', 'Output Quality'],
      rows: [
        { label: 'iPhone 15 Pro', values: { 'Best Used For': 'Mobile App UI, iOS Apps, Instagram Stories', 'Output Quality': 'Up to 3600x2700 px (3x)' }, highlight: true },
        { label: 'MacBook Pro', values: { 'Best Used For': 'SaaS Dashboards, Web Apps, Hero Banners', 'Output Quality': 'Up to 3600x2700 px (3x)' } },
        { label: 'Browser Window', values: { 'Best Used For': 'Landing Pages, Blog Post Articles', 'Output Quality': 'Up to 3600x2700 px (3x)' } }
      ]
    },
    faqs: [
      { question: 'What aspect ratio works best for iPhone mockups?', answer: 'Standard 9:16 or iPhone screenshot dimensions (1179x2556 or similar) automatically cover-fit smoothly into the frame.' },
      { question: 'Can I download with a transparent background?', answer: 'Yes! Set the background preset to "None" to export a clean transparent PNG.' }
    ],
    keywords: ['iphone mockup generator', 'free iphone frame mockup', 'iphone 15 pro mockup online', 'app screenshot mockup', 'device frame generator']
  },
  {
    slug: 'macbook-mockup',
    parentToolId: 'mockup-generator',
    title: 'Free MacBook Mockup Generator Online (Laptop Device Frames)',
    h1: 'Create MacBook Laptop Mockups from Screenshots',
    metaDescription: 'Generate professional MacBook Pro laptop mockups from your website and software screenshots. 100% client-side, zero watermark.',
    guideTitle: 'How to Create Laptop Mockups for Website Demos',
    guideContent: 'Turn desktop screenshots into realistic MacBook Pro presentations. Ideal for SaaS hero sections, Product Hunt launches, and portfolio showcases.',
    steps: [
      { stepNumber: 1, title: 'Upload Desktop Screenshot', description: 'Drop any 16:9 or 16:10 website screenshot into the tool.' },
      { stepNumber: 2, title: 'Choose MacBook Frame', description: 'Select the MacBook Pro device frame and customize shadow and padding.' },
      { stepNumber: 3, title: 'Export Showcase Image', description: 'Download crystal clear PNG ready for landing pages and marketing decks.' }
    ],
    faqs: [
      { question: 'Can I export mockups for commercial websites?', answer: 'Yes! All mockups are completely free for personal and commercial use without attribution requirements.' }
    ],
    keywords: ['macbook mockup generator', 'laptop mockup online', 'macbook frame mockup', 'website screenshot mockup']
  },
  {
    slug: 'browser-frame',
    parentToolId: 'mockup-generator',
    title: 'Free Browser Window Mockup Generator Online (Safari & Chrome Frames)',
    h1: 'Wrap Screenshots in Modern Browser Window Frames',
    metaDescription: 'Create clean minimalist browser window mockups with traffic light window controls, sleek tabs, and custom gradients online for free.',
    guideTitle: 'How to Add a Minimalist Browser Frame to Screenshots',
    guideContent: 'Give your software screenshots a polished aesthetic by wrapping them in modern browser windows featuring macOS traffic light buttons and subtle dropshadows.',
    steps: [
      { stepNumber: 1, title: 'Upload Web Screenshot', description: 'Select any web page screenshot from your computer.' },
      { stepNumber: 2, title: 'Choose Browser Frame Style', description: 'Customize frame padding, corner roundness, and backdrop colors.' },
      { stepNumber: 3, title: 'Export Clean Graphic', description: 'Download your finished browser mockup in lossless PNG format.' }
    ],
    faqs: [
      { question: 'Does it work with full-page screenshots?', answer: 'Yes, any dimensions are proportionally fitted and centered inside the browser frame.' }
    ],
    keywords: ['browser mockup generator', 'chrome frame mockup', 'safari mockup online', 'browser window screenshot frame']
  }
];

// Helper to look up a programmatic sub-route
export const getProgrammaticSubRoute = (parentToolId: string, slug: string): ProgrammaticSubRoute | undefined => {
  return PROGRAMMATIC_SUB_ROUTES.find(
    r => (r.parentToolId === parentToolId && r.slug === slug) || r.slug === `${parentToolId}/${slug}` || r.slug === slug
  );
};

// Find programmatic sub-routes for a specific tool
export const getSubRoutesForTool = (toolId: string): ProgrammaticSubRoute[] => {
  return PROGRAMMATIC_SUB_ROUTES.filter(r => r.parentToolId === toolId);
};

// Generate default 3-Step How-To Guide for any tool
export const getDefaultSteps = (tool: ToolItem): HowToStep[] => {
  if (tool.steps && tool.steps.length > 0) return tool.steps;

  switch (tool.category) {
    case ToolCategory.VIDEO:
      return [
        { stepNumber: 1, title: 'Select or Drop Video Clip', description: 'Drag and drop your MP4, MOV, or WebM video file into the workspace.' },
        { stepNumber: 2, title: 'Configure & Preview', description: 'Adjust trim points, format parameters, or speed with real-time video playback.' },
        { stepNumber: 3, title: 'Render & Download', description: 'Process video instantly via in-browser FFmpeg WebAssembly and save your file.' }
      ];
    case ToolCategory.AUDIO:
      return [
        { stepNumber: 1, title: 'Upload Audio Track', description: 'Drop your MP3, WAV, AAC, or OGG audio recording into the local player.' },
        { stepNumber: 2, title: 'Adjust Waveform & Settings', description: 'Set start/end cut markers, select sample rate, or choose output format.' },
        { stepNumber: 3, title: 'Export Audio File', description: 'Generate high-fidelity audio locally and save directly to your device.' }
      ];
    case ToolCategory.DOCS:
      return [
        { stepNumber: 1, title: 'Open Document / PDF', description: 'Select your PDF, Word DOCX, or Spreadsheet file in the secure viewer.' },
        { stepNumber: 2, title: 'Edit, Redact or Convert', description: 'Apply redaction bars, select export pages, or convert to desired document format.' },
        { stepNumber: 3, title: 'Download Confidential File', description: 'Save processed document with 100% privacy — files never leave your computer.' }
      ];
    case ToolCategory.DEV:
      return [
        { stepNumber: 1, title: 'Input Code or Markup', description: 'Paste your HTML, CSS, SVG, or JSON snippet into the editor canvas.' },
        { stepNumber: 2, title: 'Preview & Validate', description: 'Inspect real-time rendering, check syntax formatting, or adjust output scale.' },
        { stepNumber: 3, title: 'Export Asset / Clean Code', description: 'Copy formatted output or download high-resolution graphic asset.' }
      ];
    case ToolCategory.TEXT:
      return [
        { stepNumber: 1, title: 'Paste Source Text', description: 'Enter or paste text into the input workspace.' },
        { stepNumber: 2, title: 'Apply Formatting Rules', description: 'Select cleanup filters, case transformation, or diff comparison mode.' },
        { stepNumber: 3, title: 'Copy or Save Result', description: 'One-click copy cleaned text or export structured Markdown document.' }
      ];
    default:
      return [
        { stepNumber: 1, title: 'Upload File / Asset', description: 'Drop your image, graphic, or file directly into the tool dropzone.' },
        { stepNumber: 2, title: 'Adjust Parameters', description: 'Tune dimensions, quality, format presets, or design controls in real-time.' },
        { stepNumber: 3, title: 'Export Instant Output', description: 'Download your finished asset locally with zero server upload wait times.' }
      ];
  }
};

// Generate default Comparison Table for any tool
export const getDefaultComparisonTable = (tool: ToolItem): ComparisonTableData | undefined => {
  if (tool.comparisonTable) return tool.comparisonTable;

  if (tool.category === ToolCategory.IMAGE) {
    return {
      title: 'Image Format Performance & Compatibility',
      headers: ['Format', 'Avg Compression', 'Transparency', 'Best Used For'],
      rows: [
        { label: 'WebP', values: { 'Format': 'WebP', 'Avg Compression': '70% – 85% reduction', 'Transparency': 'Supported (Alpha)', 'Best Used For': 'Modern websites & mobile apps' }, highlight: true },
        { label: 'PNG', values: { 'Format': 'PNG', 'Avg Compression': 'Lossless baseline', 'Transparency': 'Supported (8-bit Alpha)', 'Best Used For': 'Logos, icons & UI design' } },
        { label: 'JPG/JPEG', values: { 'Format': 'JPG', 'Avg Compression': 'Good compression', 'Transparency': 'No (White backdrop)', 'Best Used For': 'Photographs & complex scenery' } },
        { label: 'AVIF', values: { 'Format': 'AVIF', 'Avg Compression': '80% – 90% reduction', 'Transparency': 'Supported', 'Best Used For': 'Next-gen web delivery' } }
      ]
    };
  }

  if (tool.category === ToolCategory.VIDEO) {
    return {
      title: 'Video & Animation Format Matrix',
      headers: ['Format', 'Compression Ratio', 'Audio Support', 'Loop Playback'],
      rows: [
        { label: 'MP4 (H.264)', values: { 'Format': 'MP4', 'Compression Ratio': 'High (Universal)', 'Audio Support': 'Full Stereo Audio', 'Loop Playback': 'Via player tag' }, highlight: true },
        { label: 'Animated GIF', values: { 'Format': 'GIF', 'Compression Ratio': 'Low (Heavy file)', 'Audio Support': 'No Audio', 'Loop Playback': 'Infinite native loop' } },
        { label: 'Animated WebP', values: { 'Format': 'WebP', 'Compression Ratio': 'Very High (60% smaller than GIF)', 'Audio Support': 'No Audio', 'Loop Playback': 'Infinite native loop' }, highlight: true },
        { label: 'APNG', values: { 'Format': 'APNG', 'Compression Ratio': 'Lossless quality', 'Audio Support': 'No Audio', 'Loop Playback': 'Infinite native loop' } }
      ]
    };
  }

  if (tool.category === ToolCategory.DOCS) {
    return {
      title: 'Document Processing Benchmark (AdopeCanva vs Cloud Tools)',
      headers: ['Feature / Requirement', 'Traditional Cloud Converters', 'AdopeCanva Local Suite'],
      rows: [
        { label: 'Server Upload Required', values: { 'Traditional Cloud Converters': 'Yes (Privacy Risk)', 'AdopeCanva Local Suite': 'No (100% In-Browser)' }, highlight: true },
        { label: 'Processing Speed', values: { 'Traditional Cloud Converters': 'Queue-based / Upload delay', 'AdopeCanva Local Suite': 'Instant local execution' }, highlight: true },
        { label: 'File Size Limits', values: { 'Traditional Cloud Converters': 'Strict paywalls (5MB–25MB)', 'AdopeCanva Local Suite': 'Unlimited browser capacity' } },
        { label: 'Watermarks / Ads', values: { 'Traditional Cloud Converters': 'Watermarks on free tier', 'AdopeCanva Local Suite': '0 Watermarks, 100% Free' } }
      ]
    };
  }

  return undefined;
};

// Build multi-schema JSON-LD graph for a tool
export const buildToolSchema = (tool: ToolItem, subRoute?: ProgrammaticSubRoute) => {
  const url = subRoute ? `${SITE_URL}/${tool.id}/${subRoute.slug}` : `${SITE_URL}/${tool.id}`;
  const title = subRoute ? subRoute.title : `${tool.title} - A Dope Canva`;
  const description = subRoute ? subRoute.metaDescription : tool.description;
  const steps = subRoute?.steps || getDefaultSteps(tool);
  const faqs = subRoute?.faqs || tool.faqs || [];

  const categoryUrl = `${SITE_URL}/category/${tool.category.toLowerCase()}`;

  const schemas: any[] = [
    // 1. WebApplication / SoftwareApplication
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      'name': title,
      'url': url,
      'description': description,
      'applicationCategory': `${tool.category}Application`,
      'operatingSystem': 'All',
      'browserRequirements': 'Requires JavaScript. Requires HTML5.',
      'offers': {
        '@type': 'Offer',
        'price': '0',
        'priceCurrency': 'USD'
      },
      'featureList': tool.featureList?.join(', ') || '100% Client-Side Processing, No Server Uploads, Free Forever, No Watermark, Instant Download',
      'author': {
        '@type': 'Organization',
        'name': SITE_NAME,
        'url': SITE_URL
      },
      'aggregateRating': {
        '@type': 'AggregateRating',
        'ratingValue': '4.9',
        'ratingCount': '1420',
        'bestRating': '5',
        'worstRating': '1'
      }
    },
    // 2. BreadcrumbList
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        {
          '@type': 'ListItem',
          'position': 1,
          'name': 'Home',
          'item': SITE_URL
        },
        {
          '@type': 'ListItem',
          'position': 2,
          'name': `${tool.category} Tools`,
          'item': categoryUrl
        },
        {
          '@type': 'ListItem',
          'position': 3,
          'name': tool.title,
          'item': `${SITE_URL}/${tool.id}`
        },
        ...(subRoute ? [
          {
            '@type': 'ListItem',
            'position': 4,
            'name': subRoute.h1,
            'item': url
          }
        ] : [])
      ]
    }
  ];

  // 3. HowTo Schema
  if (steps && steps.length > 0) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      'name': subRoute?.guideTitle || tool.guideTitle || `How to use ${tool.title}`,
      'description': subRoute?.guideContent || tool.guideContent || tool.description,
      'step': steps.map(s => ({
        '@type': 'HowToStep',
        'position': s.stepNumber,
        'name': s.title,
        'text': s.description,
        'url': `${url}#step-${s.stepNumber}`
      }))
    });
  }

  // 4. FAQPage Schema
  if (faqs && faqs.length > 0) {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      'mainEntity': faqs.map(faq => ({
        '@type': 'Question',
        'name': faq.question,
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': faq.answer
        }
      }))
    });
  }

  return schemas;
};

// Build Schema for Category Hubs
export const buildCategorySchema = (catMeta: CategoryMeta, tools: ToolItem[]) => {
  const url = `${SITE_URL}/category/${catMeta.id}`;

  return [
    {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      'name': catMeta.title,
      'url': url,
      'description': catMeta.description,
      'publisher': {
        '@type': 'Organization',
        'name': SITE_NAME,
        'url': SITE_URL
      },
      'mainEntity': {
        '@type': 'ItemList',
        'itemListElement': tools.map((t, index) => ({
          '@type': 'ListItem',
          'position': index + 1,
          'name': t.title,
          'description': t.description,
          'url': `${SITE_URL}/${t.id}`
        }))
      }
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      'itemListElement': [
        {
          '@type': 'ListItem',
          'position': 1,
          'name': 'Home',
          'item': SITE_URL
        },
        {
          '@type': 'ListItem',
          'position': 2,
          'name': catMeta.name,
          'item': url
        }
      ]
    },
    ...(catMeta.faqs && catMeta.faqs.length > 0 ? [{
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      'mainEntity': catMeta.faqs.map(faq => ({
        '@type': 'Question',
        'name': faq.question,
        'acceptedAnswer': {
          '@type': 'Answer',
          'text': faq.answer
        }
      }))
    }] : [])
  ];
};

// Update Document Meta Tags in the DOM
export const updateHeadTags = (options: {
  title: string;
  description: string;
  keywords?: string[];
  canonicalUrl: string;
  ogImage?: string;
  ogType?: string;
  schemas: any[];
}) => {
  // Title
  document.title = options.title;

  // Description
  let metaDesc = document.querySelector('meta[name="description"]');
  if (!metaDesc) {
    metaDesc = document.createElement('meta');
    metaDesc.setAttribute('name', 'description');
    document.head.appendChild(metaDesc);
  }
  metaDesc.setAttribute('content', options.description);

  // Keywords
  if (options.keywords && options.keywords.length > 0) {
    let metaKeywords = document.querySelector('meta[name="keywords"]');
    if (!metaKeywords) {
      metaKeywords = document.createElement('meta');
      metaKeywords.setAttribute('name', 'keywords');
      document.head.appendChild(metaKeywords);
    }
    metaKeywords.setAttribute('content', options.keywords.join(', '));
  }

  // Canonical URL
  let linkCanonical = document.querySelector('link[rel="canonical"]');
  if (!linkCanonical) {
    linkCanonical = document.createElement('link');
    linkCanonical.setAttribute('rel', 'canonical');
    document.head.appendChild(linkCanonical);
  }
  linkCanonical.setAttribute('href', options.canonicalUrl);

  // Open Graph
  const setMetaProperty = (property: string, content: string) => {
    let tag = document.querySelector(`meta[property="${property}"]`);
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute('property', property);
      document.head.appendChild(tag);
    }
    tag.setAttribute('content', content);
  };

  const setMetaName = (name: string, content: string) => {
    let tag = document.querySelector(`meta[name="${name}"]`);
    if (!tag) {
      tag = document.createElement('meta');
      tag.setAttribute('name', name);
      document.head.appendChild(tag);
    }
    tag.setAttribute('content', content);
  };

  setMetaProperty('og:title', options.title);
  setMetaProperty('og:description', options.description);
  setMetaProperty('og:url', options.canonicalUrl);
  setMetaProperty('og:type', options.ogType || 'website');
  setMetaProperty('og:image', options.ogImage || DEFAULT_OG_IMAGE);

  // Twitter Cards
  setMetaName('twitter:title', options.title);
  setMetaName('twitter:description', options.description);
  setMetaName('twitter:url', options.canonicalUrl);
  setMetaName('twitter:image', options.ogImage || DEFAULT_OG_IMAGE);

  // JSON-LD Structured Data
  const schemaId = 'adopecanva-schema';
  let scriptTag = document.getElementById(schemaId) as HTMLScriptElement;
  if (!scriptTag) {
    scriptTag = document.createElement('script');
    scriptTag.id = schemaId;
    scriptTag.type = 'application/ld+json';
    document.head.appendChild(scriptTag);
  }
  scriptTag.textContent = JSON.stringify(options.schemas.length === 1 ? options.schemas[0] : options.schemas, null, 2);
};
