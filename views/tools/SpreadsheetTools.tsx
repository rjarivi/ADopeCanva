import React, { useState } from 'react';
import ExcelJS from 'exceljs';
import { FileUploader } from '../../components/FileUploader';
import { Button } from '../../components/ui/Button';
import { FileData } from '../../types';
import { Table, FileSpreadsheet, Download, RefreshCw, FileJson, FileCode, CheckCircle, Loader2, AlertCircle } from 'lucide-react';

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
            const arrayBuffer = await file.file.arrayBuffer();
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(arrayBuffer);
            const worksheet = workbook.worksheets[0];

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
                                // ExcelJS row.values includes an empty first element (index 0) if 1-based, usually it's [empty, col1, col2]
                                // We filter or slice. Actually let's just take values.
                                const rawValues = row.values as any[];
                                headers = rawValues.length > 0 && rawValues[0] === undefined ? rawValues.slice(1) : rawValues;
                            } else {
                                const rowData: any = {};
                                const rawValues = row.values as any[];
                                // Adjust if array has empty 0 index
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
            setError("Failed to convert file. Please ensure it's a valid XLSX/Excel file.");
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
        <div className="max-w-5xl mx-auto space-y-8 animate-fade-in">
            {/* Header */}
            <div className="text-center space-y-4">
                <h2 className="text-3xl font-bold text-white">Spreadsheet Converter</h2>
                <p className="text-zinc-400">Convert between Excel, CSV, JSON, and HTML formats instantly.</p>

                <div className="flex justify-center gap-4">
                    <button
                        onClick={() => { setMode('excel-to-other'); setFile(null); setResult(null); }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${mode === 'excel-to-other' ? 'bg-green-600 border-green-500 text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white'}`}
                    >
                        Excel → Other
                    </button>
                    <button
                        onClick={() => { setMode('other-to-excel'); setFile(null); setResult(null); }}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${mode === 'other-to-excel' ? 'bg-green-600 border-green-500 text-white' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white'}`}
                    >
                        Other → Excel
                    </button>
                </div>
            </div>

            <div className="bg-surface rounded-3xl border border-zinc-800 overflow-hidden shadow-xl min-h-[500px] flex flex-col md:flex-row">

                {/* Input Section */}
                <div className={`p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-zinc-800 ${result ? 'w-full md:w-1/3' : 'w-full'}`}>
                    <FileUploader
                        onFileSelect={handleFileSelect}
                        accept={mode === 'excel-to-other' ? ".xlsx, .xls, .csv, .ods" : ".json, .csv, .txt"}
                        label={mode === 'excel-to-other' ? "Upload Spreadsheet" : "Upload JSON/CSV"}
                        description={mode === 'excel-to-other' ? "Supports XLSX, XLS, ODS, CSV" : "Supports JSON arrays or CSV text"}
                        compact={!!result}
                    />

                    {file && !result && (
                        <div className="mt-6 w-full space-y-4">
                            {mode === 'excel-to-other' && (
                                <div className="grid grid-cols-2 gap-2">
                                    {['csv', 'json', 'html', 'txt'].map(fmt => (
                                        <button
                                            key={fmt}
                                            onClick={() => setTargetFormat(fmt as TargetFormat)}
                                            className={`p-2 rounded-lg text-sm font-medium border transition-colors ${targetFormat === fmt ? 'bg-green-500/20 border-green-500 text-green-500' : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:bg-zinc-800'}`}
                                        >
                                            to {fmt.toUpperCase()}
                                        </button>
                                    ))}
                                </div>
                            )}

                            <Button
                                onClick={mode === 'excel-to-other' ? processFile : processOtherToExcel}
                                disabled={isProcessing}
                                className="w-full bg-green-600 hover:bg-green-700 text-white"
                            >
                                {isProcessing ? <Loader2 className="animate-spin mr-2" /> : <RefreshCw className="mr-2" />}
                                Convert Now
                            </Button>

                            {error && (
                                <div className="bg-red-500/10 text-red-400 p-3 rounded-lg text-xs flex items-center">
                                    <AlertCircle size={16} className="mr-2" />
                                    {error}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Output Section */}
                {result && (
                    <div className="flex-1 p-8 bg-zinc-900/10 flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-bold text-zinc-300">Conversion Result</h3>
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
                )}
            </div>
        </div>
    );
};
