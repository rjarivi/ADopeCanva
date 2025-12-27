import React, { useState, useRef } from 'react';
import { FileUploader } from '../../components/FileUploader';
import { Button } from '../../components/ui/Button';
import { FileData } from '../../types';
import {
    FileText, ArrowRight, Download, Loader2,
    FileImage, FileType, FileCode, CheckCircle, AlertCircle
} from 'lucide-react';
import * as mammoth from 'mammoth';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { marked } from 'marked';

type ConversionType = 'docx-to-html' | 'docx-to-pdf' | 'md-to-html' | 'md-to-pdf' | 'html-to-pdf' | 'img-to-pdf';

export const UniversalDocConverter: React.FC = () => {
    const [file, setFile] = useState<FileData | null>(null);
    const [conversionType, setConversionType] = useState<ConversionType>('docx-to-pdf');
    const [isProcessing, setIsProcessing] = useState(false);
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [resultName, setResultName] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    // Hidden preview container for HTML-to-PDF rendering
    const previewRef = useRef<HTMLDivElement>(null);

    const handleFileSelect = (newFile: FileData) => {
        setFile(newFile);
        setResultUrl(null);
        setError(null);

        // Auto-detect best conversion
        const ext = newFile.file.name.split('.').pop()?.toLowerCase();
        if (ext === 'docx') setConversionType('docx-to-pdf');
        else if (ext === 'md') setConversionType('md-to-pdf');
        else if (ext === 'html') setConversionType('html-to-pdf');
        else if (['jpg', 'png', 'jpeg', 'webp'].includes(ext || '')) setConversionType('img-to-pdf');
    };

    const convertDocxToHtml = async (arrayBuffer: ArrayBuffer) => {
        const result = await mammoth.convertToHtml({ arrayBuffer });
        return result.value; // The generated HTML
    };

    const generatePdfFromHtml = async (htmlContent: string) => {
        if (!previewRef.current) return null;

        // Render HTML into hidden container
        previewRef.current.innerHTML = htmlContent;
        // Make sure it's visible for capture (could be off-screen)

        const canvas = await html2canvas(previewRef.current, { scale: 2 });
        const imgData = canvas.toDataURL('image/png');

        const pdf = new jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);

        const imgX = (pdfWidth - imgWidth * ratio) / 2;
        const imgY = 10;

        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, canvas.height * pdfWidth / canvas.width);
        return pdf.output('blob');
    };

    const processFile = async () => {
        if (!file) return;
        setIsProcessing(true);
        setError(null);

        try {
            let blob: Blob | null = null;
            let downloadExt = '';
            const fileExt = file.file.name.split('.').pop()?.toLowerCase() || '';

            if (conversionType === 'docx-to-html') {
                const ab = await file.file.arrayBuffer();
                const html = await convertDocxToHtml(ab);
                blob = new Blob([html], { type: 'text/html' });
                downloadExt = 'html';
            }
            else if (conversionType === 'docx-to-pdf') {
                const ab = await file.file.arrayBuffer();
                const html = await convertDocxToHtml(ab);
                // Wrap in simple styling for PDF
                const styledHtml = `<div style="font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; color: #000; background: white;">${html}</div>`;
                const pdfBlob = await generatePdfFromHtml(styledHtml);
                blob = pdfBlob;
                downloadExt = 'pdf';
            }
            else if (conversionType === 'md-to-html') {
                const text = await file.file.text();
                const html = await marked(text);
                blob = new Blob([html], { type: 'text/html' });
                downloadExt = 'html';
            }
            else if (conversionType === 'md-to-pdf') {
                const text = await file.file.text();
                const html = await marked(text);
                const styledHtml = `<div style="font-family: Arial, sans-serif; padding: 40px; line-height: 1.6; color: #000; background: white;">${html}</div>`;
                const pdfBlob = await generatePdfFromHtml(styledHtml);
                blob = pdfBlob;
                downloadExt = 'pdf';
            }
            else if (conversionType === 'html-to-pdf') {
                const text = await file.file.text();
                // Ensure the HTML has a container
                const styledHtml = `<div style="font-family: Arial, sans-serif; padding: 40px; color: #000; background: white;">${text}</div>`;
                const pdfBlob = await generatePdfFromHtml(styledHtml);
                blob = pdfBlob;
                downloadExt = 'pdf';
            }
            else if (conversionType === 'img-to-pdf') {
                const imgDataUrl = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onload = (e) => resolve(e.target?.result as string);
                    reader.readAsDataURL(file.file);
                });

                const pdf = new jsPDF();
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();

                // Add Image - fitting to page
                // We'd ideally need image dimensions to fit properly, let's assume 'contain' logic
                const imgProps = pdf.getImageProperties(imgDataUrl);
                const ratio = Math.min(pdfWidth / imgProps.width, pdfHeight / imgProps.height);
                const w = imgProps.width * ratio;
                const h = imgProps.height * ratio;

                // Detect format from data URL
                const format = imgDataUrl.startsWith('data:image/png') ? 'PNG' : 'JPEG';
                pdf.addImage(imgDataUrl, format, (pdfWidth - w) / 2, (pdfHeight - h) / 2, w, h);
                blob = pdf.output('blob');
                downloadExt = 'pdf';
            }

            if (blob) {
                setResultUrl(URL.createObjectURL(blob));
                setResultName(file.file.name.replace(/\.[^/.]+$/, "") + '.' + downloadExt);
            } else {
                throw new Error("Conversion generated no output.");
            }

        } catch (err) {
            console.error(err);
            setError("Conversion failed. Please check the file content and try again.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
            {/* Hidden Preview Area for Canvas Rendering */}
            <div className="fixed -left-[9999px] top-0 w-[800px] bg-white text-black z-[-1]" ref={previewRef}></div>

            <div className="text-center space-y-4">
                <h2 className="text-3xl font-bold text-white">Universal Doc Converter</h2>
                <p className="text-zinc-400">Convert documents between Word, PDF, Markdown, HTML, and Images securely.</p>
            </div>

            <div className="bg-surface rounded-3xl border border-zinc-800 overflow-hidden shadow-xl flex flex-col md:flex-row">

                {/* Input Section */}
                <div className={`p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-zinc-800 ${resultUrl ? 'w-full md:w-1/2' : 'w-full'}`}>
                    <FileUploader
                        onFileSelect={handleFileSelect}
                        accept=".docx, .md, .html, .jpg, .png, .webp"
                        label="Upload Document"
                        description="Supports DOCX, Markdown, HTML, & Images"
                        compact={!!resultUrl}
                    />

                    {file && !resultUrl && (
                        <div className="mt-8 w-full max-w-sm space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Convert To</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(file.file.name.endsWith('.docx')) && (
                                        <>
                                            <button
                                                onClick={() => setConversionType('docx-to-pdf')}
                                                className={`p-3 rounded-xl border text-sm font-medium transition-all ${conversionType === 'docx-to-pdf' ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'}`}
                                            >
                                                PDF Document
                                            </button>
                                            <button
                                                onClick={() => setConversionType('docx-to-html')}
                                                className={`p-3 rounded-xl border text-sm font-medium transition-all ${conversionType === 'docx-to-html' ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'}`}
                                            >
                                                HTML Code
                                            </button>
                                        </>
                                    )}
                                    {(file.file.name.endsWith('.md')) && (
                                        <>
                                            <button
                                                onClick={() => setConversionType('md-to-pdf')}
                                                className={`p-3 rounded-xl border text-sm font-medium transition-all ${conversionType === 'md-to-pdf' ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'}`}
                                            >
                                                PDF Document
                                            </button>
                                            <button
                                                onClick={() => setConversionType('md-to-html')}
                                                className={`p-3 rounded-xl border text-sm font-medium transition-all ${conversionType === 'md-to-html' ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'}`}
                                            >
                                                HTML Code
                                            </button>
                                        </>
                                    )}
                                    {(file.file.name.endsWith('.html')) && (
                                        <button
                                            onClick={() => setConversionType('html-to-pdf')}
                                            className={`p-3 rounded-xl border text-sm font-medium transition-all bg-indigo-500/20 border-indigo-500 text-indigo-400`}
                                        >
                                            PDF Document
                                        </button>
                                    )}
                                    {(!file.file.name.endsWith('.docx') && !file.file.name.endsWith('.md') && !file.file.name.endsWith('.html')) && (
                                        <button
                                            onClick={() => setConversionType('img-to-pdf')}
                                            className={`p-3 rounded-xl border text-sm font-medium transition-all bg-indigo-500/20 border-indigo-500 text-indigo-400`}
                                        >
                                            PDF Document
                                        </button>
                                    )}
                                </div>
                            </div>

                            <Button
                                onClick={processFile}
                                disabled={isProcessing}
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-6 text-lg shadow-lg shadow-indigo-600/20"
                            >
                                {isProcessing ? <Loader2 className="animate-spin mr-2" /> : <ArrowRight className="mr-2" />}
                                Convert File
                            </Button>

                            {error && (
                                <div className="bg-red-500/10 text-red-400 p-4 rounded-xl text-sm flex items-center border border-red-500/20">
                                    <AlertCircle size={18} className="mr-2 shrink-0" />
                                    {error}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Result Section */}
                {resultUrl && (
                    <div className="flex-1 p-8 bg-zinc-900/30 flex flex-col items-center justify-center animate-fade-in">
                        <div className="w-24 h-24 bg-green-500/10 text-green-500 rounded-3xl flex items-center justify-center mb-6 border border-green-500/20 shadow-xl shadow-green-500/5">
                            <CheckCircle size={48} />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">Conversion Complete!</h3>
                        <p className="text-zinc-400 mb-8 max-w-xs text-center">Your file has been successfully converted and is ready for download.</p>

                        <div className="flex flex-col gap-3 w-full max-w-xs">
                            <a
                                href={resultUrl}
                                download={resultName}
                                className="flex items-center justify-center w-full px-6 py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold transition-all shadow-lg shadow-green-600/20"
                            >
                                <Download size={20} className="mr-2" /> Download File
                            </a>
                            <button
                                onClick={() => { setFile(null); setResultUrl(null); }}
                                className="text-zinc-500 hover:text-white text-sm py-2"
                            >
                                Convert Another File
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 text-center opacity-50">
                <div className="p-4 bg-zinc-900/30 rounded-2xl border border-zinc-800">
                    <FileText className="mx-auto mb-2 text-indigo-400" />
                    <h4 className="text-zinc-300 font-bold text-sm">Word to PDF</h4>
                </div>
                <div className="p-4 bg-zinc-900/30 rounded-2xl border border-zinc-800">
                    <FileCode className="mx-auto mb-2 text-pink-400" />
                    <h4 className="text-zinc-300 font-bold text-sm">Markdown to HTML</h4>
                </div>
                <div className="p-4 bg-zinc-900/30 rounded-2xl border border-zinc-800">
                    <FileType className="mx-auto mb-2 text-cyan-400" />
                    <h4 className="text-zinc-300 font-bold text-sm">HTML to PDF</h4>
                </div>
                <div className="p-4 bg-zinc-900/30 rounded-2xl border border-zinc-800">
                    <FileImage className="mx-auto mb-2 text-yellow-400" />
                    <h4 className="text-zinc-300 font-bold text-sm">Image to PDF</h4>
                </div>
            </div>
        </div>
    );
};
