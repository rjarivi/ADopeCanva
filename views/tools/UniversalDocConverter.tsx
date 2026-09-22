import React, { useState, useRef, useEffect } from 'react';
import Papa from 'papaparse';
import { FileUploader } from '../../components/FileUploader';
import { Button } from '../../components/ui/Button';
import { SectionLabel } from '../../components/EditorControls';
import { FileData } from '../../types';
import {
    FileText, ArrowRight, Download, Loader2,
    FileImage, FileType, FileCode, CheckCircle, AlertCircle, FileSpreadsheet,
    BookOpen, Layers, Image as ImageIcon, FileOutput
} from 'lucide-react';
import * as mammoth from 'mammoth';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { marked } from 'marked';
import ExcelJS from 'exceljs';
import * as pdfjsLib from 'pdfjs-dist';
import JSZip from 'jszip';
import heic2any from 'heic2any';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import ePub from 'epubjs';
import { setupPdfWorker, getPdfDocument, classifyPdfError } from '../../utils/pdfWorker';
import { logToolFailure } from '../../utils/toolHealth';

// Shared PDF.js worker (local-first with CDN fallback) — see utils/pdfWorker.ts
setupPdfWorker();

type ConversionType =
    'docx-to-html' | 'docx-to-pdf' |
    'md-to-html' | 'md-to-pdf' |
    'html-to-pdf' | 'img-to-pdf' |
    'excel-to-csv' | 'excel-to-json' | 'excel-to-html' | 'excel-to-txt' |
    'pdf-to-img' | 'pdf-to-txt' | 'pdf-to-docx' | 'pdf-to-epub' |
    'epub-to-pdf' | 'heic-to-pdf' | 'heic-to-jpg' |
    'ebook-txt-extract' | 'azw-to-epub' | 'azw-to-mobi' | 'azw-to-pdf' |
    'mobi-to-pdf' | 'fb2-to-pdf' | 'epub-to-docx';

export const UniversalDocConverter: React.FC = () => {
    const [file, setFile] = useState<FileData | null>(null);
    const [conversionType, setConversionType] = useState<ConversionType>('docx-to-pdf');
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [resultUrl, setResultUrl] = useState<string | null>(null);
    const [resultName, setResultName] = useState<string>('');
    const [error, setError] = useState<string | null>(null);

    // Hidden preview container for HTML-to-PDF rendering
    const previewRef = useRef<HTMLDivElement>(null);

    const handleFileSelect = (newFile: FileData) => {
        setFile(newFile);
        setResultUrl(null);
        setError(null);
        setProgress(0);

        // Auto-detect best conversion
        const ext = newFile.file.name.split('.').pop()?.toLowerCase();
        if (ext === 'docx') setConversionType('docx-to-pdf');
        else if (ext === 'md') setConversionType('md-to-pdf');
        else if (ext === 'html') setConversionType('html-to-pdf');
        else if (['xlsx', 'xls', 'csv'].includes(ext || '')) setConversionType('excel-to-csv');
        else if (['jpg', 'png', 'jpeg', 'webp'].includes(ext || '')) setConversionType('img-to-pdf');
        else if (ext === 'pdf') setConversionType('pdf-to-img');
        else if (ext === 'epub') setConversionType('epub-to-pdf');
        else if (['heic', 'heif'].includes(ext || '')) setConversionType('heic-to-pdf');
        else if (ext === 'azw' || ext === 'azw3') setConversionType('azw-to-pdf');
        else if (ext === 'mobi') setConversionType('mobi-to-pdf');
        else if (ext === 'fb2' || ext === 'fbz') setConversionType('fb2-to-pdf');
        else setConversionType('docx-to-pdf');
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
            else if (conversionType.startsWith('excel-to-')) {
                const workbook = new ExcelJS.Workbook();
                let mainWorksheet: ExcelJS.Worksheet;

                if (file.file.name.endsWith('.csv') || file.file.type === 'text/csv' || fileExt === 'csv') {
                    const text = await file.file.text();
                    const parseResult = Papa.parse(text, { header: false });
                    mainWorksheet = workbook.addWorksheet('Sheet1');
                    if (parseResult.data && Array.isArray(parseResult.data)) {
                        mainWorksheet.addRows(parseResult.data as any[][]);
                    }
                } else {
                    const arrayBuffer = await file.file.arrayBuffer();
                    await workbook.xlsx.load(arrayBuffer);
                    mainWorksheet = workbook.worksheets[0];
                }
                const worksheet = mainWorksheet;

                if (conversionType === 'excel-to-csv') {
                    const csvBuffer = await workbook.csv.writeBuffer();
                    const output = new TextDecoder().decode(csvBuffer);
                    blob = new Blob([output], { type: 'text/csv' });
                    downloadExt = 'csv';
                }
                else if (conversionType === 'excel-to-json') {
                    const jsonData: any[] = [];
                    let headers: any[] = [];
                    worksheet.eachRow((row, rowNumber) => {
                        if (rowNumber === 1) {
                            const rawValues = row.values as any[];
                            headers = rawValues.length > 0 && rawValues[0] === undefined ? rawValues.slice(1) : rawValues;
                        } else {
                            const rowData: any = {};
                            const rawValues = row.values as any[];
                            const values = rawValues.length > 0 && rawValues[0] === undefined ? rawValues.slice(1) : rawValues;
                            values.forEach((cell: any, colIdx: number) => {
                                if (headers[colIdx]) rowData[headers[colIdx]] = cell;
                            });
                            jsonData.push(rowData);
                        }
                    });
                    blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
                    downloadExt = 'json';
                }
                else if (conversionType === 'excel-to-html') {
                    let html = '<table border="1" style="border-collapse: collapse; width: 100%; font-family: Arial, sans-serif;">';
                    worksheet.eachRow((row) => {
                        html += '<tr>';
                        const rawValues = row.values as any[];
                        const values = rawValues.length > 0 && rawValues[0] === undefined ? rawValues.slice(1) : rawValues;
                        values.forEach((val: any) => {
                            const cellValue = val && typeof val === 'object' ? (val.text || val.result || '') : (val || '');
                            html += `<td style="padding: 8px; border: 1px solid #ddd;">${cellValue}</td>`;
                        });
                        html += '</tr>';
                    });
                    html += '</table>';
                    blob = new Blob([html], { type: 'text/html' });
                    downloadExt = 'html';
                }
                else if (conversionType === 'excel-to-txt') {
                    let txt = '';
                    worksheet.eachRow((row) => {
                        const rawValues = row.values as any[];
                        const values = rawValues.length > 0 && rawValues[0] === undefined ? rawValues.slice(1) : rawValues;
                        txt += values.map((v: any) => v && typeof v === 'object' ? (v.text || '') : v).join('\t') + '\n';
                    });
                    blob = new Blob([txt], { type: 'text/plain' });
                    downloadExt = 'txt';
                }
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
            else if (conversionType === 'pdf-to-img') {
                try {
                    const arrayBuffer = await file.file.arrayBuffer();
                    const pdf = await getPdfDocument(arrayBuffer, 'doc-converter');

                    if (pdf.numPages > 1) {
                        const zip = new JSZip();
                        for (let i = 1; i <= pdf.numPages; i++) {
                            setProgress(Math.round((i / pdf.numPages) * 100));
                            const page = await pdf.getPage(i);
                            const viewport = page.getViewport({ scale: 2 });
                            const canvas = document.createElement('canvas');
                            const context = canvas.getContext('2d');
                            canvas.height = viewport.height;
                            canvas.width = viewport.width;
                            if (context) {
                                await page.render({ canvasContext: context, viewport } as any).promise;
                                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                                zip.file(`page-${i}.jpg`, dataUrl.split(',')[1], { base64: true });
                            }
                        }
                        blob = await zip.generateAsync({ type: 'blob' });
                        downloadExt = 'zip';
                    } else {
                        const page = await pdf.getPage(1);
                        const viewport = page.getViewport({ scale: 2 });
                        const canvas = document.createElement('canvas');
                        const context = canvas.getContext('2d');
                        canvas.height = viewport.height;
                        canvas.width = viewport.width;
                        if (context) {
                            await page.render({ canvasContext: context, viewport } as any).promise;
                            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                            const resp = await fetch(dataUrl);
                            blob = await resp.blob();
                            downloadExt = 'jpg';
                        }
                    }
                } catch (e) {
                    logToolFailure('doc-converter', e, { stage: 'pdf-to-img' });
                    throw new Error(classifyPdfError(e));
                }
            }
            else if (conversionType === 'pdf-to-txt' || conversionType === 'pdf-to-docx') {
                const arrayBuffer = await file.file.arrayBuffer();
                const pdf = await getPdfDocument(arrayBuffer, 'doc-converter');
                let fullText = '';
                const paragraphs: Paragraph[] = [];

                for (let i = 1; i <= pdf.numPages; i++) {
                    setProgress(Math.round((i / pdf.numPages) * 100));
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.filter((item: any) => 'str' in item && typeof item.str === 'string').map((item: any) => item.str).join(' ');
                    fullText += `--- Page ${i} ---\n\n${pageText}\n\n`;

                    if (conversionType === 'pdf-to-docx') {
                        paragraphs.push(new Paragraph({
                            children: [new TextRun({ text: `Page ${i}`, bold: true, size: 28 })],
                            heading: HeadingLevel.HEADING_1
                        }));
                        paragraphs.push(new Paragraph({
                            children: [new TextRun(pageText)]
                        }));
                    }
                }

                if (conversionType === 'pdf-to-docx') {
                    const doc = new Document({
                        sections: [{ properties: {}, children: paragraphs }]
                    });
                    blob = await Packer.toBlob(doc);
                    downloadExt = 'docx';
                } else {
                    blob = new Blob([fullText], { type: 'text/plain' });
                    downloadExt = 'txt';
                }
            }
            else if (conversionType === 'heic-to-pdf' || conversionType === 'heic-to-jpg') {
                const results = await heic2any({
                    blob: file.file,
                    toType: 'image/jpeg',
                    quality: 0.8
                });
                const jpgBlob = Array.isArray(results) ? results[0] : results;

                if (conversionType === 'heic-to-pdf') {
                    const imgDataUrl = await new Promise<string>((resolve) => {
                        const reader = new FileReader();
                        reader.onload = (e) => resolve(e.target?.result as string);
                        reader.readAsDataURL(jpgBlob);
                    });
                    const pdf = new jsPDF();
                    const pdfWidth = pdf.internal.pageSize.getWidth();
                    const pdfHeight = pdf.internal.pageSize.getHeight();
                    const props = pdf.getImageProperties(imgDataUrl);
                    const ratio = Math.min(pdfWidth / props.width, pdfHeight / props.height);
                    pdf.addImage(imgDataUrl, 'JPEG', 0, 0, props.width * ratio, props.height * ratio);
                    blob = pdf.output('blob');
                    downloadExt = 'pdf';
                } else {
                    blob = jpgBlob;
                    downloadExt = 'jpg';
                }
            }
            else if (conversionType.startsWith('epub-') || conversionType.startsWith('azw-') || conversionType.startsWith('mobi-') || conversionType.startsWith('fb2-') || conversionType === 'ebook-txt-extract' || conversionType === 'pdf-to-epub') {
                let fullText = '';
                let title = 'Document';

                if (file.file.name.endsWith('.epub')) {
                    try {
                        const book = ePub(await file.file.arrayBuffer());
                        await book.ready;
                        title = (book as any).package?.metadata?.title || 'Ebook';
                        const spine = (book as any).spine;
                        // @ts-ignore
                        for (const item of spine.items) {
                            const doc = await item.load(book.load.bind(book));
                            fullText += (doc as any).innerText || (doc as any).textContent || '';
                        }
                    } catch (e) {
                        console.warn("EPUB error:", e);
                        fullText = await file.file.text();
                    }
                } else if (file.file.name.endsWith('.pdf')) {
                    const arrayBuffer = await file.file.arrayBuffer();
                    const pdf = await getPdfDocument(arrayBuffer, 'doc-converter');
                    for (let i = 1; i <= pdf.numPages; i++) {
                        const page = await pdf.getPage(i);
                        const textContent = await page.getTextContent();
                        fullText += textContent.items.filter((item: any) => 'str' in item).map((item: any) => item.str).join(' ') + '\n';
                    }
                    try { await pdf.destroy(); } catch { /* ignore */ }
                } else {
                    const text = await file.file.text();
                    if (file.file.name.endsWith('.fb2')) {
                        fullText = text.replace(/<[^>]*>?/gm, ' ');
                    } else {
                        fullText = text.replace(/[^\x20-\x7E\n\t]/g, '');
                    }
                }

                if (conversionType.endsWith('-pdf')) {
                    const pdf = new jsPDF();
                    const pdfWidth = pdf.internal.pageSize.getWidth();
                    const lines = pdf.splitTextToSize(fullText, pdfWidth - 20);
                    let cursorY = 10;
                    for (let j = 0; j < lines.length; j++) {
                        if (cursorY > 280) {
                            pdf.addPage();
                            cursorY = 10;
                        }
                        pdf.text(lines[j], 10, cursorY);
                        cursorY += 7;
                    }
                    blob = pdf.output('blob');
                    downloadExt = 'pdf';
                } else if (conversionType.endsWith('-docx')) {
                    const doc = new Document({
                        sections: [{
                            properties: {},
                            children: [
                                new Paragraph({ text: title, heading: HeadingLevel.TITLE }),
                                ...fullText.split('\n').filter(t => t.trim()).map(t => new Paragraph({ children: [new TextRun(t)] }))
                            ]
                        }]
                    });
                    blob = await Packer.toBlob(doc);
                    downloadExt = 'docx';
                } else if (conversionType.endsWith('-epub')) {
                    const htmlContent = `<html><body><h1>${title}</h1><pre>${fullText}</pre></body></html>`;
                    blob = new Blob([htmlContent], { type: 'application/epub+zip' });
                    downloadExt = 'epub';
                } else {
                    blob = new Blob([fullText], { type: 'text/plain' });
                    downloadExt = 'txt';
                }
            }

            if (blob) {
                setResultUrl(URL.createObjectURL(blob));
                setResultName(file.file.name.replace(/\.[^/.]+$/, "") + '.' + downloadExt);
            } else {
                throw new Error("Conversion generated no output.");
            }

        } catch (err) {
            logToolFailure('doc-converter', err, { stage: 'convert', conversionType });
            setError(err instanceof Error ? err.message : 'Conversion failed. Please check the file content and try again.');
        } finally {
            setIsProcessing(false);
            setProgress(0);
        }
    };

    const renderOption = (type: ConversionType, icon: any, label: string) => (
        <button
            key={type}
            onClick={() => setConversionType(type)}
            className={`p-4 rounded-2xl border flex flex-col items-center gap-2 transition-all ${conversionType === type
                ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.2)]'
                : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-indigo-500/40 hover:bg-indigo-500/5 hover:text-zinc-200'
                }`}
        >
            <div className={`p-2 rounded-xl ${conversionType === type ? 'bg-indigo-500/20' : 'bg-zinc-800'}`}>
                {React.createElement(icon, { size: 20 })}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
        </button>
    );

    if (!file) {
        return (
            <div className="container mx-auto px-6 h-full flex flex-col justify-center animate-fade-in text-center">
                {/* Header */}
                <div className="flex-none space-y-3 mb-10">
                    <h2 className="text-4xl font-black tracking-tight text-white flex items-center justify-center gap-3 font-unbounded">
                        <Layers size={32} /> Universal Doc Converter
                    </h2>
                    <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
                        Convert Ebooks, PDFs, Docs, and Images locally.
                    </p>
                </div>

                {/* Upload Area */}
                <div className="flex-1 w-full max-w-4xl mx-auto bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-2 flex flex-col items-center justify-center relative overflow-hidden group hover:border-indigo-500/50 transition-colors shadow-2xl">
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <FileUploader
                        onFileSelect={handleFileSelect}
                        accept=".docx, .md, .html, .jpg, .png, .webp, .xlsx, .xls, .csv, .pdf, .epub, .azw, .azw3, .mobi, .fb2, .heic"
                        label="Upload Document"
                        description="DOCX, PDF, EPUB, HEIC, and more..."
                        className="w-full h-full border-2 border-dashed border-zinc-800 hover:border-indigo-500/50 bg-zinc-950/50 rounded-2xl transition-all"
                    />
                </div>

                {/* Feature Highlights */}
                <div className="flex-none max-w-4xl mx-auto w-full grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
                    {[
                        { icon: BookOpen, label: 'Ebooks', desc: 'EPUB, MOBI, AZW' },
                        { icon: FileText, label: 'Documents', desc: 'Word, PDF, MD' },
                        { icon: ImageIcon, label: 'Images', desc: 'HEIC, PNG, JPG' },
                        { icon: Layers, label: 'Batch Ready', desc: 'Client-side Only' }
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
        <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-10">
            {/* Hidden Preview Area for Canvas Rendering */}
            <div className="fixed -left-[9999px] top-0 w-[800px] bg-white text-black z-[-1]" ref={previewRef}></div>

            <div className="text-center space-y-2">
                <h2 className="text-4xl font-black tracking-tight text-white flex items-center justify-center gap-3 font-unbounded">
                    <Layers size={32} /> Universal Doc Converter
                </h2>
                <button
                    onClick={() => setFile(null)}
                    className="text-indigo-400 text-sm hover:text-indigo-300 transition-colors bg-indigo-500/10 px-3 py-1 rounded-full uppercase font-bold tracking-widest text-[10px]"
                >
                    Back to Upload
                </button>
            </div>

            <div className="bg-surface rounded-[2rem] border border-zinc-800 overflow-hidden shadow-2xl flex flex-col lg:flex-row min-h-[520px] backdrop-blur-xl bg-opacity-80">

                {/* Left Panel: Input & Settings */}
                <div className={`p-6 flex flex-col border-b lg:border-b-0 lg:border-r border-zinc-800 ${resultUrl ? 'w-full lg:w-1/3' : 'w-full lg:w-1/2'}`}>
                    <div className="flex-1 flex flex-col">
                        <FileUploader
                            onFileSelect={handleFileSelect}
                            accept=".docx, .md, .html, .jpg, .png, .webp, .xlsx, .xls, .csv, .pdf, .epub, .azw, .azw3, .mobi, .fb2, .heic"
                            label="Drop your file here"
                            description="DOCX, PDF, EPUB, HEIC, and more..."
                            compact={!!resultUrl}
                        />

                        {file && !resultUrl && (
                            <div className="mt-8 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
                                <div className="space-y-6">
                                    <SectionLabel className="flex items-center gap-2">
                                        <FileOutput size={16} className="text-indigo-500" />
                                        Conversion Options
                                    </SectionLabel>

                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        {/* Dynamic UI based on file type */}
                                        {file.file.name.toLowerCase().endsWith('.pdf') && (
                                            <>
                                                {renderOption('pdf-to-img', ImageIcon, 'Images (ZIP)')}
                                                {renderOption('pdf-to-docx', FileText, 'Word Doc')}
                                                {renderOption('pdf-to-txt', FileText, 'Plain Text')}
                                                {renderOption('pdf-to-epub', BookOpen, 'EPUB')}
                                            </>
                                        )}
                                        {file.file.name.toLowerCase().endsWith('.docx') && (
                                            <>
                                                {renderOption('docx-to-pdf', FileOutput, 'PDF')}
                                                {renderOption('docx-to-html', FileCode, 'HTML')}
                                            </>
                                        )}
                                        {['.epub', '.mobi', '.azw', '.azw3', '.fb2', '.fbz'].some(e => file.file.name.toLowerCase().endsWith(e)) && (
                                            <>
                                                {renderOption(conversionType.includes('-pdf') ? conversionType : `${file.file.name.split('.').pop()}-to-pdf` as any, FileOutput, 'PDF')}
                                                {renderOption(conversionType.includes('-docx') ? conversionType : `${file.file.name.split('.').pop()}-to-docx` as any, FileText, 'Word Doc')}
                                                {renderOption('ebook-txt-extract', FileText, 'Extract Text')}
                                            </>
                                        )}
                                        {['.jpg', '.png', '.jpeg', '.webp', '.heic'].some(e => file.file.name.toLowerCase().endsWith(e)) && (
                                            <>
                                                {renderOption('img-to-pdf', FileOutput, 'PDF')}
                                                {file.file.name.toLowerCase().endsWith('.heic') && renderOption('heic-to-jpg', ImageIcon, 'to JPG')}
                                            </>
                                        )}
                                        {['.xlsx', '.xls', '.csv'].some(e => file.file.name.toLowerCase().endsWith(e)) && (
                                            <>
                                                {renderOption('excel-to-csv', FileSpreadsheet, 'CSV')}
                                                {renderOption('excel-to-json', FileCode, 'JSON')}
                                                {renderOption('excel-to-html', FileCode, 'HTML')}
                                                {renderOption('excel-to-txt', FileText, 'Text')}
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {isProcessing && (
                                        <div className="space-y-2 animate-pulse">
                                            <div className="flex justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                                                <span>Processing...</span>
                                                <span>{progress}%</span>
                                            </div>
                                            <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-indigo-500 transition-all duration-300 shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                                                    style={{ width: `${progress}%` }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    <Button onClick={processFile} disabled={isProcessing} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-6 text-lg font-bold rounded-2xl shadow-xl shadow-indigo-600/20 transform transition-transform hover:scale-[1.02] active:scale-[0.98]" >
                                        {isProcessing ? <Loader2 className="animate-spin mr-3" size={24} /> : <ArrowRight className="mr-3" size={24} />}
                                        {isProcessing ? 'Converting...' : 'Start Conversion'}
                                    </Button>
                                </div>

                                {error && (
                                    <div className="bg-red-500/10 text-red-400 p-5 rounded-2xl text-sm flex items-center border border-red-500/30 animate-shake">
                                        <AlertCircle size={20} className="mr-3 shrink-0" />
                                        {error}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Panel: Result Section */}
                {resultUrl ? (
                    <div className="flex-1 p-6 bg-zinc-900/50 flex flex-col items-center justify-center animate-fade-in text-center">
                        <div className="relative">
                            <div className="w-32 h-32 bg-indigo-500/10 text-indigo-400 rounded-[2.5rem] flex items-center justify-center mb-8 border border-indigo-500/20 shadow-2xl shadow-indigo-500/10 relative z-10">
                                <CheckCircle size={64} />
                            </div>
                            <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full -z-10 animate-pulse"></div>
                        </div>

                        <h3 className="text-2xl font-bold text-white mb-3">Conversion Ready!</h3>
                        <p className="text-zinc-400 mb-10 max-w-sm text-lg font-medium leading-relaxed">
                            Successfully converted <span className="text-white">{file?.file.name}</span> to your desired format.
                        </p>

                        <div className="flex flex-col gap-4 w-full max-w-md">
                            <a
                                href={resultUrl}
                                download={resultName}
                                className="flex items-center justify-center w-full px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-bold text-lg transition-all shadow-xl transform hover:translate-y-[-2px] active:translate-y-[1px]"
                            >
                                <Download size={24} className="mr-3" /> Download Result
                            </a>
                            <button
                                onClick={() => { setFile(null); setResultUrl(null); }}
                                className="text-zinc-500 hover:text-white text-base py-4 font-bold transition-colors"
                            >
                                Convert Another File
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="hidden lg:flex flex-1 p-12 bg-zinc-900/10 items-center justify-center">
                        <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                            {[
                                { icon: BookOpen, label: 'Ebooks', desc: 'EPUB, MOBI, AZW, FB2', color: 'text-indigo-400' },
                                { icon: FileText, label: 'Docs', desc: 'Word, PDF, Markdown', color: 'text-blue-400' },
                                { icon: ImageIcon, label: 'Images', desc: 'HEIC, ZIP, PDF-to-Img', color: 'text-pink-400' },
                                { icon: FileSpreadsheet, label: 'Data', desc: 'Excel, CSV & JSON', color: 'text-green-400' }
                            ].map((item, i) => (
                                <div key={i} className="p-5 bg-zinc-900/30 rounded-2xl border border-zinc-800/50 hover:border-indigo-500/40 hover:bg-indigo-500/5 transition-all group flex flex-col items-center text-center">
                                    <item.icon className={`${item.color} mb-3 group-hover:scale-110 transition-transform`} size={28} />
                                    <h4 className="text-white text-xs font-bold mb-1 uppercase tracking-wider">{item.label}</h4>
                                    <p className="text-zinc-500 text-[10px] font-medium leading-tight">{item.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
