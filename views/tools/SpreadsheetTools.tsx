import React, { useState } from 'react';
import ExcelJS from 'exceljs';
import Papa from 'papaparse';
import { FileUploader } from '../../components/FileUploader';
import { Button } from '../../components/ui/Button';
import { FileData } from '../../types';
import { Table, FileSpreadsheet, Download, RefreshCw, FileJson, FileCode, CheckCircle, Loader2, AlertCircle, ArrowRightLeft } from 'lucide-react';

type ConversionMode = 'excel-to-other' | 'other-to-excel';
type TargetFormat = 'csv' | 'json' | 'html' | 'txt' | 'xlsx';

export const SpreadsheetTools: React.FC = () => {
    const [mode, setMode] = useState<ConversionMode>('excel-to-other');
    const [targetFormat, setTargetFormat] = useState<TargetFormat>('csv');
    const [file, setFile] = useState<FileData | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFileSelect = (newFile: FileData) => {
        setFile(newFile);
        setResult(null);
        setDownloadUrl(null);
        setError(null);
    };

    const processFile = async () => {
        if (!file) return;

        setIsProcessing(true);
        setError(null);

        try {
            const workbook = new ExcelJS.Workbook();
            let mainWorksheet: ExcelJS.Worksheet;

            // Check if input is CSV or Excel
            if (file.file.name.endsWith('.csv') || file.file.type === 'text/csv' || file.file.type === 'application/vnd.ms-excel') {
                // Try reading as CSV first if extension matches
                if (file.file.name.endsWith('.xlsx')) {
                    const arrayBuffer = await file.file.arrayBuffer();
                    await workbook.xlsx.load(arrayBuffer);
                    mainWorksheet = workbook.worksheets[0];
                } else {
                    // Parse CSV using PapaParse
                    const text = await file.file.text();
                    const parseResult = Papa.parse(text, { header: false }); // Read as arrays

                    if (parseResult.errors.length > 0) {
                        console.warn('CSV Parse Warnings:', parseResult.errors);
                    }

                    // Add to new worksheet
                    mainWorksheet = workbook.addWorksheet('Sheet1');
                    mainWorksheet.addRows(parseResult.data as any[][]);
                }
            } else {
                // Default to XLSX load
                const arrayBuffer = await file.file.arrayBuffer();
                await workbook.xlsx.load(arrayBuffer);
                mainWorksheet = workbook.worksheets[0];
            }

            // Use the determined mainWorksheet for further processing
            const worksheet = mainWorksheet;

            if (mode === 'excel-to-other') {
                let output: any;
                let mimeType = 'text/plain';

                switch (targetFormat) {
                    case 'csv':
                        const csvBuffer = await workbook.csv.writeBuffer();
                        output = new TextDecoder().decode(csvBuffer);
                        mimeType = 'text/csv';
                        break;
                    case 'json':
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
                                    if (headers[colIdx]) {
                                        rowData[headers[colIdx]] = cell;
                                    }
                                });
                                jsonData.push(rowData);
                            }
                        });
                        output = JSON.stringify(jsonData, null, 2);
                        mimeType = 'application/json';
                        break;
                    case 'html':
                        let html = '<table border="1" style="border-collapse: collapse; width: 100%;">';
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
                        output = html;
                        mimeType = 'text/html';
                        break;
                    case 'txt':
                        let txt = '';
                        worksheet.eachRow((row) => {
                            const rawValues = row.values as any[];
                            const values = rawValues.length > 0 && rawValues[0] === undefined ? rawValues.slice(1) : rawValues;
                            txt += values.map((v: any) => v && typeof v === 'object' ? (v.text || '') : v).join('\t') + '\n';
                        });
                        output = txt;
                        mimeType = 'text/plain';
                        break;
                }

                const blob = new Blob([output], { type: mimeType });
                setDownloadUrl(URL.createObjectURL(blob));
                setResult(output.slice(0, 1000) + (output.length > 1000 ? '...' : ''));
            }
        } catch (err) {
            console.error(err);
            setError("Failed to convert file. Please ensure it's a valid XLSX or CSV file.");
        } finally {
            setIsProcessing(false);
        }
    };

    const processOtherToExcel = async () => {
        if (!file) return;
        setIsProcessing(true);
        setError(null);

        try {
            const text = await file.file.text();
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Sheet1');

            if (file.file.type.includes('json') || file.file.name.endsWith('.json')) {
                const jsonData = JSON.parse(text);
                const data = Array.isArray(jsonData) ? jsonData : [jsonData];

                if (data.length > 0) {
                    // Extract columns from first object
                    const columns = Object.keys(data[0]).map(key => ({ header: key, key: key }));
                    worksheet.columns = columns;
                    worksheet.addRows(data);
                }
            } else if (file.file.type.includes('csv') || file.file.name.endsWith('.csv')) {
                // Manually parse CSV to rows since we have the text
                const rows = text.split('\n').map(row => row.split(','));
                worksheet.addRows(rows);
            } else {
                throw new Error("Unsupported file type for this mode");
            }

            const excelBuffer = await workbook.xlsx.writeBuffer();

            const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            setDownloadUrl(URL.createObjectURL(blob));
            setResult("Conversion successful! Ready to download.");

        } catch (err) {
            console.error(err);
            setError("Failed to convert. Check if input file is valid JSON or CSV.");
        } finally {
            setIsProcessing(false);
        }
    }

    return (
        <div className="container mx-auto px-6 h-[85vh] flex flex-col justify-center animate-fade-in text-center">
            {/* Header */}
            <div className="flex-none space-y-3 mb-10">
                <h2 className="text-4xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-green-400 to-emerald-600 flex items-center justify-center gap-3 font-unbounded">
                    <Table size={32} /> Spreadsheet Converter
                </h2>
                <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
                    Convert between Excel, CSV, JSON, and HTML formats instantly.
                </p>

                <div className="flex justify-center gap-4 mt-6">
                    <button
                        onClick={() => { setMode('excel-to-other'); setFile(null); setResult(null); }}
                        className={`px-6 py-2 rounded-full text-sm font-bold transition-all border ${mode === 'excel-to-other' ? 'bg-green-600 border-green-500 text-white shadow-lg shadow-green-900/20' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600'}`}
                    >
                        Excel → Other
                    </button>
                    <button
                        onClick={() => { setMode('other-to-excel'); setFile(null); setResult(null); }}
                        className={`px-6 py-2 rounded-full text-sm font-bold transition-all border ${mode === 'other-to-excel' ? 'bg-green-600 border-green-500 text-white shadow-lg shadow-green-900/20' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-600'}`}
                    >
                        Other → Excel
                    </button>
                </div>
            </div>

            {/* Upload Area */}
            <div className={`flex-1 w-full max-w-4xl mx-auto bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-2 flex flex-col items-center justify-center relative overflow-hidden group hover:border-green-500/50 transition-colors shadow-2xl ${result ? 'hidden' : 'flex'}`}>
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <FileUploader
                    onFileSelect={handleFileSelect}
                    accept={mode === 'excel-to-other' ? ".xlsx, .xls, .csv, .ods" : ".json, .csv, .txt"}
                    label={mode === 'excel-to-other' ? "Upload Spreadsheet" : "Upload JSON/CSV"}
                    description={mode === 'excel-to-other' ? "Supports XLSX, XLS, ODS, CSV" : "Supports JSON arrays or CSV text"}
                    className="w-full h-full border-2 border-dashed border-zinc-800 hover:border-green-500/50 bg-zinc-950/50 rounded-2xl transition-all"
                />
            </div>

            {/* Feature Highlights (Only show when no result) */}
            {!result && (
                <div className="flex-none max-w-4xl mx-auto w-full grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
                    {[
                        { icon: FileSpreadsheet, label: 'Excel Support', desc: 'XLSX, XLS & ODS' },
                        { icon: ArrowRightLeft, label: 'Bi-Directional', desc: 'Import & Export' },
                        { icon: FileJson, label: 'Data Formats', desc: 'JSON, CSV, HTML' },
                        { icon: Download, label: 'Fast Process', desc: 'Browser-based' }
                    ].map((feat, i) => (
                        <div key={i} className="flex flex-col items-center text-center space-y-2 p-4 rounded-xl bg-zinc-900/30 border border-zinc-800/30 backdrop-blur-sm hover:bg-zinc-900/50 transition-colors">
                            <div className="p-2 bg-green-500/10 rounded-full text-green-400">
                                <feat.icon size={20} />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-zinc-200">{feat.label}</h3>
                                <p className="text-[10px] text-zinc-500 uppercase tracking-wide font-bold mt-1">{feat.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Result Area Wrapper */}
            {result && (
                <div className="flex-1 w-full max-w-5xl mx-auto bg-zinc-900/50 border border-zinc-800/50 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row h-full min-h-[500px]">
                    <div className="p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-zinc-800 w-full md:w-1/3">
                        <FileUploader
                            onFileSelect={handleFileSelect}
                            accept={mode === 'excel-to-other' ? ".xlsx, .xls, .csv, .ods" : ".json, .csv, .txt"}
                            label="Change File"
                            description="Upload new file"
                            compact={true}
                        />
                    </div>

                    {/* Output Section */}
                    <div className="flex-1 p-8 bg-zinc-900/10 flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-black text-white flex items-center gap-2 font-unbounded text-lg uppercase tracking-wider">
                                <FileSpreadsheet size={20} className="text-green-500" /> Result
                            </h3>
                            {downloadUrl && (
                                <a
                                    href={downloadUrl}
                                    download={`converted_${file?.file.name.split('.')[0]}.${mode === 'excel-to-other' ? targetFormat : 'xlsx'}`}
                                    className="inline-flex items-center px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-900 rounded-lg font-bold text-sm transition-colors"
                                >
                                    <Download size={16} className="mr-2" />
                                    Download File
                                </a>
                            )}
                        </div>

                        <div className="flex-1 bg-zinc-950 rounded-xl border border-zinc-800 p-4 overflow-auto custom-scrollbar font-mono text-xs text-zinc-400">
                            <pre>{result}</pre>
                        </div>

                        <div className="mt-4 flex justify-between items-center text-xs text-zinc-500">
                            <span>Preview shows first 1000 characters</span>
                            <button onClick={() => { setResult(null); setFile(null); }} className="text-zinc-400 hover:text-white">Convert another</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
