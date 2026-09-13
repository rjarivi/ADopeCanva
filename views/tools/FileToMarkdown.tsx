/// <reference lib="dom" />
import React, { useState } from 'react';
import { FileUploader } from '../../components/FileUploader';
import { Button } from '../../components/ui/Button';
import { FileData } from '../../types';
import {
    FileText, Download, Copy, Check, RefreshCcw, Zap, FileJson,
    Layers, FileCode, AlertCircle, Loader2
} from 'lucide-react';
import * as mammoth from 'mammoth';
import Papa from 'papaparse';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

const ACCEPTED = '.pdf,.docx,.txt,.md,.csv,.json,.yaml,.yml,.xml,.html';

async function fileToMarkdown(file: File): Promise<string> {
    const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

    if (ext === 'docx') {
        const buf = await file.arrayBuffer();
        const result = await mammoth.convertToHtml({ arrayBuffer: buf });
        // Convert basic HTML to markdown
        return htmlToMarkdown(result.value);
    }

    if (ext === 'pdf') {
        const buf = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: buf }).promise;
        let md = `# ${file.name.replace('.pdf', '')}\n\n`;
        try {
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                const text = content.items.map((it: any) => it.str).join(' ').trim();
                if (text) md += `## Page ${i}\n\n${text}\n\n`;
            }
        } finally {
            await pdf.destroy();
        }
        return md.trim();
    }

    if (ext === 'csv') {
        const text = await file.text();
        const result = Papa.parse<string[]>(text, { skipEmptyLines: true });
        const rows = result.data as string[][];
        if (rows.length === 0) return '*(empty CSV)*';
        const header = rows[0];
        const sep = header.map(() => '---').join(' | ');
        const headerRow = header.join(' | ');
        const body = rows.slice(1).map(r => r.join(' | ')).join('\n');
        return `# ${file.name}\n\n| ${headerRow} |\n| ${sep} |\n${rows.slice(1).map(r => `| ${r.join(' | ')} |`).join('\n')}`;
    }

    if (ext === 'json') {
        const text = await file.text();
        try {
            const parsed = JSON.parse(text);
            return `# ${file.name}\n\n\`\`\`json\n${JSON.stringify(parsed, null, 2)}\n\`\`\``;
        } catch {
            return `# ${file.name}\n\n\`\`\`\n${text}\n\`\`\``;
        }
    }

    if (ext === 'yaml' || ext === 'yml') {
        const text = await file.text();
        return `# ${file.name}\n\n\`\`\`yaml\n${text}\n\`\`\``;
    }

    if (ext === 'xml') {
        const text = await file.text();
        return `# ${file.name}\n\n\`\`\`xml\n${text}\n\`\`\``;
    }

    if (ext === 'html') {
        const text = await file.text();
        return htmlToMarkdown(text);
    }

    if (ext === 'md') {
        return await file.text();
    }

    // Plain text passthrough
    const text = await file.text();
    return `# ${file.name}\n\n${text}`;
}

function htmlToMarkdown(html: string): string {
    let result = html;
    // Convert tables to markdown
    result = result.replace(/<tr[^>]*>/gi, '\n');
    result = result.replace(/<th[^>]*>(.*?)<\/th>/gi, '| **$1** ');
    result = result.replace(/<td[^>]*>(.*?)<\/td>/gi, '| $1 ');
    result = result.replace(/<\/tr>/gi, '|');
    result = result.replace(/<table[^>]*>/gi, '');
    result = result.replace(/<\/table>/gi, '');

    return result
        .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '# $1\n\n')
        .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '## $1\n\n')
        .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '### $1\n\n')
        .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '#### $1\n\n')
        .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, '**$1**')
        .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, '**$1**')
        .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, '*$1*')
        .replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, '*$1*')
        .replace(/<code[^>]*>([\s\S]*?)<\/code>/gi, '`$1`')
        .replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, '```\n$1\n```\n')
        .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n')
        .replace(/<ul[^>]*>|<\/ul>/gi, '\n')
        .replace(/<ol[^>]*>|<\/ol>/gi, '\n')
        .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '[$2]($1)')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, '$1\n\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
}

const FORMAT_LABELS: Record<string, { label: string; color: string }> = {
    pdf: { label: 'PDF', color: 'text-red-400' },
    docx: { label: 'DOCX', color: 'text-blue-400' },
    csv: { label: 'CSV', color: 'text-green-400' },
    json: { label: 'JSON', color: 'text-yellow-400' },
    yaml: { label: 'YAML', color: 'text-orange-400' },
    yml: { label: 'YAML', color: 'text-orange-400' },
    xml: { label: 'XML', color: 'text-purple-400' },
    html: { label: 'HTML', color: 'text-orange-400' },
    md: { label: 'MD', color: 'text-zinc-300' },
    txt: { label: 'TXT', color: 'text-zinc-400' },
};

export const FileToMarkdown: React.FC = () => {
    const [file, setFile] = useState<FileData | null>(null);
    const [markdown, setMarkdown] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const handleFileSelect = (f: FileData | FileData[]) => {
        const selected = Array.isArray(f) ? f[0] : f;
        setFile(selected);
        setMarkdown('');
        setError(null);
    };

    const handleConvert = async () => {
        if (!file) return;
        setIsProcessing(true);
        setError(null);
        try {
            const result = await fileToMarkdown(file.file);
            setMarkdown(result);
        } catch (err: any) {
            setError(err.message || 'Conversion failed. Please try another file.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(markdown);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = (file?.file.name.replace(/\.[^.]+$/, '') ?? 'output') + '.md';
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleReset = () => {
        setFile(null);
        setMarkdown('');
        setError(null);
    };

    const ext = file?.file.name.split('.').pop()?.toLowerCase() ?? '';
    const fmt = FORMAT_LABELS[ext];

    if (!file) {
        return (
            <div className="container mx-auto px-6 h-full flex flex-col justify-center animate-fade-in text-center">
                <div className="flex-none space-y-3 mb-10">
                    <h2 className="text-4xl font-black tracking-tight text-white flex items-center justify-center gap-3 font-unbounded">
                        <FileText size={32} /> File to Markdown
                    </h2>
                    <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
                        Convert PDFs, DOCX, CSV, HTML, and more into clean Markdown — all in-browser.
                    </p>
                </div>

                <div className="flex-1 w-full max-w-4xl mx-auto bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-2 flex flex-col items-center justify-center relative overflow-hidden group hover:border-indigo-500/50 transition-colors shadow-2xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <FileUploader
                        onFileSelect={handleFileSelect}
                        accept={ACCEPTED}
                        label="Drop any document"
                        description="PDF, DOCX, CSV, JSON, YAML, XML, HTML, TXT, MD"
                        className="w-full h-full border-2 border-dashed border-zinc-800 hover:border-indigo-500/50 bg-zinc-950/50 rounded-2xl transition-all"
                    />
                </div>

                <div className="flex-none max-w-4xl mx-auto w-full grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
                    {[
                        { icon: FileText, label: 'PDF / DOCX', desc: 'Extract content' },
                        { icon: FileJson, label: 'CSV / JSON', desc: 'Tables & data' },
                        { icon: FileCode, label: 'HTML / XML', desc: 'Strip tags' },
                        { icon: Download, label: 'Clean .md', desc: 'Download instantly' },
                    ].map((f, i) => (
                        <div key={i} className="flex flex-col items-center text-center space-y-2 p-4 rounded-xl bg-zinc-900/30 border border-zinc-800/30 backdrop-blur-sm hover:bg-zinc-900/50 transition-colors">
                            <div className="p-2 bg-indigo-500/10 rounded-full text-indigo-400"><f.icon size={20} /></div>
                            <div>
                                <h3 className="text-sm font-bold text-zinc-200">{f.label}</h3>
                                <p className="text-[10px] text-zinc-500 uppercase tracking-wide font-bold mt-1">{f.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto h-[calc(100vh-140px)] min-h-[600px] flex flex-col gap-4 animate-slide-up">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400"><FileText size={22} /></div>
                    <div>
                        <h2 className="text-lg font-black text-white font-unbounded truncate max-w-xs">{file.file.name}</h2>
                        {fmt && <span className={`text-[10px] font-bold uppercase tracking-widest ${fmt.color}`}>{fmt.label} → Markdown</span>}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {markdown && (
                        <>
                            <Button variant="secondary" size="sm" onClick={handleCopy}>
                                {copied ? <Check size={14} className="mr-1.5 text-green-400" /> : <Copy size={14} className="mr-1.5" />}
                                {copied ? 'Copied' : 'Copy'}
                            </Button>
                            <Button variant="secondary" size="sm" onClick={handleDownload}>
                                <Download size={14} className="mr-1.5" /> Download .md
                            </Button>
                        </>
                    )}
                    <Button variant="secondary" size="sm" onClick={handleReset}>
                        <RefreshCcw size={14} className="mr-1.5" /> New File
                    </Button>
                    {!markdown && (
                        <Button size="sm" onClick={handleConvert} isLoading={isProcessing} disabled={isProcessing} className="border-none shadow-lg shadow-indigo-500/20">
                            <Zap size={14} className="mr-1.5" />
                            {isProcessing ? 'Converting...' : 'Convert'}
                        </Button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden flex flex-col min-h-0">
                {!markdown && !isProcessing && !error && (
                    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-zinc-500">
                        <Layers size={40} className="opacity-30" />
                        <p className="text-sm">Click <strong className="text-zinc-300">Convert</strong> to extract markdown from your file.</p>
                    </div>
                )}

                {isProcessing && (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 text-zinc-500">
                        <Loader2 size={32} className="animate-spin text-indigo-500" />
                        <p className="text-sm font-mono">Converting {file.file.name}...</p>
                    </div>
                )}

                {error && (
                    <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
                        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/20 rounded-xl max-w-md">
                            <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
                            <p className="text-sm text-red-300">{error}</p>
                        </div>
                    </div>
                )}

                {markdown && (
                    <>
                        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 shrink-0">
                            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Markdown Output</span>
                            <span className="text-[10px] font-mono text-zinc-600">{markdown.length.toLocaleString()} chars · {markdown.split('\n').length} lines</span>
                        </div>
                        <textarea
                            readOnly
                            value={markdown}
                            className="flex-1 w-full bg-zinc-950 p-6 font-mono text-sm text-zinc-300 resize-none outline-none custom-scrollbar leading-relaxed"
                            spellCheck={false}
                        />
                    </>
                )}
            </div>
        </div>
    );
};
