import React, { useState, useRef, useEffect } from 'react';
import Papa from 'papaparse';
import { FileUploader } from '../../components/FileUploader';
import { Button } from '../../components/ui/Button';
import { FileData } from '../../types';
import {
    FileText, ArrowRight, Download, Loader2,
    FileImage, FileType, FileCode, CheckCircle, AlertCircle, FileSpreadsheet
} from 'lucide-react';
import * as mammoth from 'mammoth';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { marked } from 'marked';
import ExcelJS from 'exceljs';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker source
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

type ConversionType =
    'docx-to-html' | 'docx-to-pdf' |
    'md-to-html' | 'md-to-pdf' |
    'html-to-pdf' | 'img-to-pdf' |
    'excel-to-csv' | 'excel-to-json' | 'excel-to-html' | 'excel-to-txt' |
    'pdf-to-img' | 'pdf-to-txt';

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
        else if (['xlsx', 'xls', 'csv'].includes(ext || '')) setConversionType('excel-to-csv');
        else if (['jpg', 'png', 'jpeg', 'webp'].includes(ext || '')) setConversionType('img-to-pdf');
        else if (ext === 'pdf') setConversionType('pdf-to-img');
    };

    // ... (lines 47-233)

    {
        (file.file.name.endsWith('.html')) && (
            <button
                onClick={() => setConversionType('html-to-pdf')}
                className={`p-3 rounded-xl border text-sm font-medium transition-all bg-indigo-500/20 border-indigo-500 text-indigo-400`}
            >
                PDF Document
            </button>
        )
    }
    {/* PDF Options */ }
    {
        (file.file.name.endsWith('.pdf')) && (
            <>
                <button
                    onClick={() => setConversionType('pdf-to-img')}
                    className={`p-3 rounded-xl border text-sm font-medium transition-all ${conversionType === 'pdf-to-img' ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'}`}
                >
                    To JPG (Page 1)
                </button>
                <button
                    onClick={() => setConversionType('pdf-to-txt')}
                    className={`p-3 rounded-xl border text-sm font-medium transition-all ${conversionType === 'pdf-to-txt' ? 'bg-indigo-500/20 border-indigo-500 text-indigo-400' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:bg-zinc-800'}`}
                >
                    Extract Text
                </button>
            </>
        )
    }
    {
        (!file.file.name.endsWith('.docx') && !file.file.name.endsWith('.md') && !file.file.name.endsWith('.html') && !file.file.name.endsWith('.xlsx') && !file.file.name.endsWith('.xls') && !file.file.name.endsWith('.csv') && !file.file.name.endsWith('.pdf')) && (
            <button
                onClick={() => setConversionType('img-to-pdf')}
                className={`p-3 rounded-xl border text-sm font-medium transition-all bg-indigo-500/20 border-indigo-500 text-indigo-400`}
            >
                PDF Document
            </button>
        )
    }

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
                    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
                    const pdf = await loadingTask.promise;
                    const page = await pdf.getPage(1);
                    const viewport = page.getViewport({ scale: 2 });

                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    canvas.height = viewport.height;
                    canvas.width = viewport.width;

                    if (context) {
                        const renderContext = {
                            canvasContext: context,
                            viewport: viewport
                        };
                        await page.render(renderContext).promise;

                        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                        const res = await fetch(dataUrl);
                        blob = await res.blob();
                        downloadExt = 'jpg';
                    } else {
                        throw new Error("Canvas context is null");
                    }
                } catch (e) {
                    console.error("PDF to Img Error:", e);
                    throw new Error("Failed to convert PDF to Image.");
                }
            }
            else if (conversionType === 'pdf-to-txt') {
                // Removed usePdfWorker() call
                const arrayBuffer = await file.file.arrayBuffer();
                const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
                let fullText = '';

                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const textContent = await page.getTextContent();
                    const pageText = textContent.items.map((item: any) => item.str).join(' ');
                    fullText += `--- Page ${i} ---\n\n${pageText}\n\n`;
                }

                blob = new Blob([fullText], { type: 'text/plain' });
                downloadExt = 'txt';
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
                        accept=".docx, .md, .html, .jpg, .png, .webp, .xlsx, .xls, .csv, .pdf"
                        label="Upload Document"
                        description="Supports DOCX, PDF, XLSX, HTML, Markdown, Images"
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
                                    {/* Excel Options */}
                                    {(file.file.name.endsWith('.xlsx') || file.file.name.endsWith('.xls') || file.file.name.endsWith('.csv')) && (
                                        <>
                                            <button onClick={() => setConversionType('excel-to-csv')} className={`p-2 rounded-lg text-xs font-medium border ${conversionType === 'excel-to-csv' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'}`}>To CSV</button>
                                            <button onClick={() => setConversionType('excel-to-json')} className={`p-2 rounded-lg text-xs font-medium border ${conversionType === 'excel-to-json' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'}`}>To JSON</button>
                                            <button onClick={() => setConversionType('excel-to-html')} className={`p-2 rounded-lg text-xs font-medium border ${conversionType === 'excel-to-html' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'}`}>To HTML</button>
                                            <button onClick={() => setConversionType('excel-to-txt')} className={`p-2 rounded-lg text-xs font-medium border ${conversionType === 'excel-to-txt' ? 'bg-indigo-500/20 text-indigo-400 border-indigo-500' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white'}`}>To Text</button>
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
                                    {(!file.file.name.endsWith('.docx') && !file.file.name.endsWith('.md') && !file.file.name.endsWith('.html') && !file.file.name.endsWith('.xlsx') && !file.file.name.endsWith('.xls') && !file.file.name.endsWith('.csv')) && (
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
