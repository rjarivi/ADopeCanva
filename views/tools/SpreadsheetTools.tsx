import React, { useState } from 'react';
import ExcelJS from 'exceljs';
import Papa from 'papaparse';
import { FileUploader } from '../../components/FileUploader';
import { Button } from '../../components/ui/Button';
import { FileData } from '../../types';
import { SectionLabel } from '../../components/EditorControls';
import { Table, FileSpreadsheet, Download, RefreshCw, FileJson, FileCode, CheckCircle, Loader2, AlertCircle, ArrowRightLeft } from 'lucide-react';

type ConversionMode = 'excel-to-other' | 'other-to-excel';
type TargetFormat = 'csv' | 'json' | 'html' | 'txt' | 'xlsx';
type CsvDelimiter = ',' | ';' | '\t' | '|';

const DELIMITER_OPTIONS: { value: CsvDelimiter; label: string }[] = [
    { value: ',', label: 'Comma' },
    { value: ';', label: 'Semicolon' },
    { value: '\t', label: 'Tab' },
    { value: '|', label: 'Pipe' },
];

export const SpreadsheetTools: React.FC = () => {
    const [mode, setMode] = useState<ConversionMode>('excel-to-other');
    const [targetFormat, setTargetFormat] = useState<TargetFormat>('csv');
    const [delimiter, setDelimiter] = useState<CsvDelimiter>(',');
    const [headerRow, setHeaderRow] = useState(true);
    const [file, setFile] = useState<FileData | null>(null);
    const [sheetNames, setSheetNames] = useState<string[]>([]);
    const [activeSheet, setActiveSheet] = useState(0);
    const [isProcessing, setIsProcessing] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Workbook sheet names for CSV output naming
    const handleFileSelect = (newFile: FileData) => {
        setFile(newFile);
        setResult(null);
        setDownloadUrl(null);
        setError(null);
        setSheetNames([]);
        setActiveSheet(0);

        // Preload xlsx metadata so the worksheet picker can show sheet names
        if (newFile.file.name.toLowerCase().endsWith('.xlsx') || newFile.file.name.toLowerCase().endsWith('.xls')) {
            newFile.file.arrayBuffer()
                .then(buf => new ExcelJS.Workbook().xlsx.load(buf))
                .then(wb => {
                    const names = wb.worksheets.map(w => w.name);
                    if (names.length > 1) setSheetNames(names);
                })
                .catch(() => { /* surfaced again on convert if invalid */ });
        }
    };

    // Parse CSV text with the user-selected delimiter
    const parseCsv = (text: string) => {
        const parseResult = Papa.parse<string[]>(text, { header: false, delimiter, skipEmptyLines: 'greedy' });
        if (parseResult.errors.length > 0) {
            console.warn('CSV Parse Warnings:', parseResult.errors);
        }
        return (parseResult.data as unknown as any[][]);
    };

    // Build delimited CSV text from rows (used for Excel → CSV so the delimiter applies)
    const rowsToCsv = (rows: any[][]): string => {
        const cell = (v: any) => {
            const s = v === null || v === undefined ? '' : String(v);
            // Quote when the value contains the delimiter, quote, or newline
            if (s.includes(delimiter) || s.includes('"') || /[\n\r]/.test(s)) {
                return '"' + s.replace(/"/g, '""') + '"';
            }
            return s;
        };
        return rows.map(r => r.map(cell).join(delimiter)).join('\n');
    };

    const getWorksheet = async (): Promise<{ workbook: ExcelJS.Workbook; worksheet: ExcelJS.Worksheet }> => {
        const workbook = new ExcelJS.Workbook();
        if (!file) throw new Error('No file');

        const name = file.file.name.toLowerCase();
        if (name.endsWith('.csv') || file.file.type === 'text/csv') {
            const text = await file.file.text();
            const ws = workbook.addWorksheet('Sheet1');
            ws.addRows(parseCsv(text));
            return { workbook, worksheet: ws };
        }

        const arrayBuffer = await file.file.arrayBuffer();
        await workbook.xlsx.load(arrayBuffer);
        const idx = Math.min(Math.max(activeSheet, 0), Math.max(workbook.worksheets.length - 1, 0));
        const worksheet = workbook.worksheets[idx] ?? workbook.worksheets[0];
        if (!worksheet) throw new Error('Workbook has no worksheets');
        return { workbook, worksheet };
    };

    // Row values helper (ExcelJS row.values is 1-based with a leading undefined)
    const rowValues = (row: ExcelJS.Row): any[] => {
        const rawValues = row.values as any[];
        const values = rawValues.length > 0 && rawValues[0] === undefined ? rawValues.slice(1) : rawValues;
        return values;
    };

    const processFile = async () => {
        if (!file) return;

        setIsProcessing(true);
        setError(null);

        try {
            if (mode === 'excel-to-other') {
                let output: any;
                let mimeType = 'text/plain';
                const { workbook, worksheet } = await getWorksheet();

                switch (targetFormat) {
                    case 'csv': {
                        const rows: any[][] = [];
                        worksheet.eachRow((row) => {
                            rows.push(rowValues(row).map((v: any) => (v && typeof v === 'object') ? (v.text || v.result || '') : v));
                        });
                        output = rowsToCsv(rows);
                        mimeType = 'text/csv';
                        break;
                    }
                    case 'json': {
                        const jsonData: any[] | any[][] = [];
                        const allRows = (() => {
                            const r: any[][] = [];
                            worksheet.eachRow((row) => r.push(rowValues(row)));
                            return r;
                        })();

                        if (headerRow && allRows.length > 0) {
                            const headers = allRows[0];
                            for (let i = 1; i < allRows.length; i++) {
                                const rowData: any = {};
                                allRows[i].forEach((cell: any, colIdx: number) => {
                                    const key = headers[colIdx];
                                    if (key !== undefined && key !== null && String(key).trim() !== '') {
                                        rowData[key] = cell;
                                    }
                                });
                                (jsonData as any[]).push(rowData);
                            }
                        } else {
                            // No header row: emit arrays of values
                            allRows.forEach(r => (jsonData as any[][]).push(r));
                        }
                        output = JSON.stringify(jsonData, null, 2);
                        mimeType = 'application/json';
                        break;
                    }
                    case 'html': {
                        let html = '<table border="1" style="border-collapse: collapse; width: 100%;">';
                        worksheet.eachRow((row) => {
                            html += '<tr>';
                            rowValues(row).forEach((val: any) => {
                                const cellValue = val && typeof val === 'object' ? (val.text || val.result || '') : (val || '');
                                html += `<td style="padding: 8px; border: 1px solid #ddd;">${cellValue}</td>`;
                            });
                            html += '</tr>';
                        });
                        html += '</table>';
                        output = html;
                        mimeType = 'text/html';
                        break;
                    }
                    case 'txt': {
                        let txt = '';
                        worksheet.eachRow((row) => {
                            txt += rowValues(row).map((v: any) => v && typeof v === 'object' ? (v.text || '') : v).join('\t') + '\n';
                        });
                        output = txt;
                        mimeType = 'text/plain';
                        break;
                    }
                }

                const blob = new Blob([output], { type: mimeType });
                setDownloadUrl(URL.createObjectURL(blob));
                setResult(output.slice(0, 1000) + (output.length > 1000 ? '...' : ''));
            } else {
                await processOtherToExcel();
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
                // Parse CSV with the selected delimiter instead of a naive split(',')
                worksheet.addRows(parseCsv(text));
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
        }
    }

    return (
        <div className="container mx-auto px-6 h-full flex flex-col justify-center animate-fade-in text-center">
            {/* Header */}
            <div className="flex-none space-y-3 mb-10">
                <h2 className="text-4xl font-black tracking-tight text-white flex items-center justify-center gap-3 font-unbounded">
                    <Table size={32} /> Spreadsheet Converter
                </h2>
                <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
                    Convert between Excel, CSV, JSON, and HTML formats instantly.
                </p>

                <div className="flex justify-center gap-4 mt-6">
                    <button
                        onClick={() => { setMode('excel-to-other'); setFile(null); setResult(null); setSheetNames([]); }}
                        className={`px-6 py-2 rounded-full text-sm font-bold transition-all border ${mode === 'excel-to-other' ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/20' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'}`}
                    >
                        Excel → Other
                    </button>
                    <button
                        onClick={() => { setMode('other-to-excel'); setFile(null); setResult(null); setSheetNames([]); }}
                        className={`px-6 py-2 rounded-full text-sm font-bold transition-all border ${mode === 'other-to-excel' ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-900/20' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white hover:border-zinc-700'}`}
                    >
                        Other → Excel
                    </button>
                </div>
            </div>

            {/* Upload Area */}
            <div className={`flex-1 w-full max-w-4xl mx-auto bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-2 flex flex-col items-center justify-center relative overflow-hidden group hover:border-indigo-500/50 transition-colors shadow-2xl ${result ? 'hidden' : 'flex'}`}>
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                <FileUploader
                    onFileSelect={handleFileSelect}
                    accept={mode === 'excel-to-other' ? ".xlsx, .xls, .csv, .ods" : ".json, .csv, .txt"}
                    label={mode === 'excel-to-other' ? "Upload Spreadsheet" : "Upload JSON/CSV"}
                    description={mode === 'excel-to-other' ? "Supports XLSX, XLS, ODS, CSV" : "Supports JSON arrays or CSV text"}
                    className="w-full h-full border-2 border-dashed border-zinc-800 hover:border-indigo-500/50 bg-zinc-950/50 rounded-2xl transition-all"
                />

                {/* Conversion options — CSV delimiter (both directions), header toggle, worksheet picker */}
                {file && (
                    <div className="w-full max-w-xl mx-auto mt-6 mb-4 space-y-4 text-left">
                        <SectionLabel>Conversion Options</SectionLabel>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">CSV Delimiter</label>
                                <select
                                    value={delimiter}
                                    onChange={(e) => setDelimiter(e.target.value as CsvDelimiter)}
                                    className="mt-1.5 w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none focus:ring-1 focus:ring-indigo-500/50 hover:border-indigo-500/50 transition-colors cursor-pointer"
                                >
                                    {DELIMITER_OPTIONS.map(d => <option key={d.label} value={d.value}>{d.label}</option>)}
                                </select>
                            </div>

                            {sheetNames.length > 1 && (
                                <div>
                                    <label className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Worksheet</label>
                                    <select
                                        value={activeSheet}
                                        onChange={(e) => setActiveSheet(parseInt(e.target.value, 10))}
                                        className="mt-1.5 w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-200 outline-none focus:ring-1 focus:ring-indigo-500/50 hover:border-indigo-500/50 transition-colors cursor-pointer"
                                    >
                                        {sheetNames.map((n, i) => <option key={`${n}-${i}`} value={i}>{n}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>

                        {mode === 'excel-to-other' && (
                            <div className="flex items-center gap-2">
                                <input
                                    id="ss-header-row"
                                    type="checkbox"
                                    checked={headerRow}
                                    onChange={(e) => setHeaderRow(e.target.checked)}
                                    className="w-4 h-4 rounded border-zinc-700 bg-zinc-800 text-indigo-500 focus:ring-offset-0 focus:ring-indigo-500/50"
                                />
                                <label htmlFor="ss-header-row" className="text-xs text-zinc-500 cursor-pointer select-none">
                                    First row is a header (uses headers as JSON keys)
                                </label>
                            </div>
                        )}

                        <div className="flex items-center gap-4 pt-1">
                            <Button onClick={processFile} isLoading={isProcessing} disabled={isProcessing} className="h-11 border-none shadow-lg shadow-indigo-900/20" >
                                {isProcessing ? <Loader2 size={16} className="mr-2 animate-spin" /> : <ArrowRightLeft size={16} className="mr-2" />}
                                {isProcessing ? 'Processing...' : 'Convert'}
                            </Button>
                            <span className="text-xs text-zinc-500 truncate max-w-[200px]">{file.file.name}</span>
                        </div>
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 p-3 rounded-lg flex items-center">
                                <AlertCircle size={16} className="text-red-400 mr-2 shrink-0" />
                                <p className="text-xs text-red-400">{error}</p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Feature Highlights (Only show when no result) */}
            {!result && (
                <div className="flex-none max-w-4xl mx-auto w-full grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
                    {[
                        { icon: FileSpreadsheet, label: 'Excel Support', desc: 'XLSX, XLS & ODS' },
                        { icon: ArrowRightLeft, label: 'Bi-Directional', desc: 'CSV Delimiter Aware' },
                        { icon: FileJson, label: 'Data Formats', desc: 'JSON, CSV, HTML' },
                        { icon: Download, label: 'Fast Process', desc: 'Browser-based' }
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
                                <FileCode size={20} className="text-indigo-400" /> Result
                            </h3>
                            {downloadUrl && (
                                <a
                                    href={downloadUrl}
                                    download={`converted_${file?.file.name.split('.')[0]}.${mode === 'excel-to-other' ? targetFormat : 'xlsx'}`}
                                    className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold text-sm transition-colors"
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
                            <button onClick={() => { setResult(null); setDownloadUrl(null); }} className="text-zinc-400 hover:text-white whitespace-nowrap px-2 py-1 rounded-lg border border-zinc-800 transition-colors">
                                <RefreshCw size={12} className="inline mr-1.5" />
                                Try Other Options
                            </button>
                            <button onClick={() => { setResult(null); setFile(null); setDownloadUrl(null); }} className="text-zinc-400 hover:text-white">Convert another</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
