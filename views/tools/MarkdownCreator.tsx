
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Type, Square, Minus, Pencil, Eraser, Copy, Trash2,
    Sparkles, Download, Undo, Redo, Grid, Info, Plus, ChevronRight, Check, X,
    Layout, Table as TableIcon, CreditCard, MousePointer2, Settings, ExternalLink,
    Move
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { ApiKeyInput } from '../../components/ui/ApiKeyInput';
import { GoogleGenAI } from "@google/genai";
import { useIsMobile } from '../../hooks/useIsMobile';
import { MarkdownCreatorIcon } from '../../components/icons/MarkdownCreatorIcon';

// Grid Dimensions
const COLS = 80;
const ROWS = 40;

type Tool = 'pencil' | 'eraser' | 'box' | 'line' | 'text' | 'select';

interface Cell {
    char: string;
    color?: string;
}

const EMPTY_CHAR = ' ';

const MarkdownCreator: React.FC = () => {
    const isMobile = useIsMobile();
    const [grid, setGrid] = useState<Cell[][]>(() =>
        Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => ({ char: EMPTY_CHAR })))
    );
    const [activeTool, setActiveTool] = useState<Tool>('pencil');
    const [apiKey, setApiKey] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [prompt, setPrompt] = useState('');
    const [history, setHistory] = useState<Cell[][][]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    const [dragStart, setDragStart] = useState<{ r: number, c: number } | null>(null);
    const [hoverPos, setHoverPos] = useState<{ r: number, c: number } | null>(null);
    const [textCursor, setTextCursor] = useState<{ r: number, c: number } | null>(null);
    const [showApiSettings, setShowApiSettings] = useState(false);
    const [activeComponentId, setActiveComponentId] = useState<string | null>(null);
    const [tableConfig, setTableConfig] = useState({ rows: 3, cols: 2 });
    const [compConfig, setCompConfig] = useState<Record<string, any>>({
        button: "Button",
        input: "Enter text...",
        checkbox: "Checkbox",
        radio: "Radio Option",
        toggle: "Toggle",
        progress: 50,
        tabs: { count: 3, names: ["Overview", "Analytics", "Settings", "Profile", "More"] },
        card: "Card Title"
    });

    // New Placement & Selection State
    const [placementData, setPlacementData] = useState<{ cells: Cell[][], w: number, h: number } | null>(null);
    const [selection, setSelection] = useState<{
        r1: number, c1: number, r2: number, c2: number,
        active: boolean,
        isDragging: boolean,
        dragData?: Cell[][],
        dragStartPos?: { r: number, c: number }
    } | null>(null);

    const canvasRef = useRef<HTMLDivElement>(null);

    // Undo / Redo logic
    const saveHistory = useCallback((newGrid: Cell[][]) => {
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(JSON.parse(JSON.stringify(newGrid)));
        if (newHistory.length > 50) newHistory.shift();
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    }, [history, historyIndex]);

    useEffect(() => {
        if (history.length === 0) {
            saveHistory(grid);
        }
    }, []);

    // Refresh placement preview when config changes
    useEffect(() => {
        if (activeComponentId) {
            prepareComponent(activeComponentId);
        }
    }, [tableConfig, compConfig]);

    const undo = () => {
        if (historyIndex > 0) {
            const prev = history[historyIndex - 1];
            setGrid(JSON.parse(JSON.stringify(prev)));
            setHistoryIndex(historyIndex - 1);
        }
    };

    const redo = () => {
        if (historyIndex < history.length - 1) {
            const next = history[historyIndex + 1];
            setGrid(JSON.parse(JSON.stringify(next)));
            setHistoryIndex(historyIndex + 1);
        }
    };

    // Helper to update grid
    const updateCell = (r: number, c: number, char: string, tempGrid: Cell[][]) => {
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
        tempGrid[r][c] = { char };
    };

    const writeString = (r: number, c: number, str: string, tempGrid: Cell[][]) => {
        str.split('').forEach((char, i) => {
            updateCell(r, c + i, char, tempGrid);
        });
    };

    // Drawing Logic
    const drawBox = (startR: number, startC: number, endR: number, endC: number, tempGrid: Cell[][], style: 'normal' | 'double' | 'rounded' = 'normal') => {
        const r1 = Math.min(startR, endR);
        const r2 = Math.max(startR, endR);
        const c1 = Math.min(startC, endC);
        const c2 = Math.max(startC, endC);

        const chars = {
            normal: { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│' },
            double: { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║' },
            rounded: { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' }
        }[style];

        // Corners
        updateCell(r1, c1, chars.tl, tempGrid);
        updateCell(r1, c2, chars.tr, tempGrid);
        updateCell(r2, c1, chars.bl, tempGrid);
        updateCell(r2, c2, chars.br, tempGrid);

        // Horizontal lines
        for (let c = c1 + 1; c < c2; c++) {
            updateCell(r1, c, chars.h, tempGrid);
            updateCell(r2, c, chars.h, tempGrid);
        }

        // Vertical lines
        for (let r = r1 + 1; r < r2; r++) {
            updateCell(r, c1, chars.v, tempGrid);
            updateCell(r, c2, chars.v, tempGrid);
        }
    };

    const drawLine = (startR: number, startC: number, endR: number, endC: number, tempGrid: Cell[][]) => {
        const dr = endR - startR;
        const dc = endC - startC;

        if (Math.abs(dc) >= Math.abs(dr)) {
            const c1 = Math.min(startC, endC);
            const c2 = Math.max(startC, endC);
            for (let c = c1; c <= c2; c++) {
                const r = dc === 0 ? startR : Math.round(startR + (c - startC) * (dr / dc));
                updateCell(r, c, '─', tempGrid);
            }
        } else {
            const r1 = Math.min(startR, endR);
            const r2 = Math.max(startR, endR);
            for (let r = r1; r <= r2; r++) {
                const c = dr === 0 ? startC : Math.round(startC + (r - startR) * (dc / dr));
                updateCell(r, c, '│', tempGrid);
            }
        }
    };

    const handleMouseDown = (r: number, c: number) => {
        // If we are currently placing a component
        if (placementData) {
            const newGrid = JSON.parse(JSON.stringify(grid));
            placementData.cells.forEach((row, dr) => {
                row.forEach((cell, dc) => {
                    updateCell(r + dr, c + dc, cell.char, newGrid);
                });
            });
            setGrid(newGrid);
            saveHistory(newGrid);
            // setPlacementData(null); // Keep placement data to allow multiple placements
            return;
        }

        if (activeTool === 'text') {
            setTextCursor({ r, c });
            return;
        }

        if (activeTool === 'select') {
            // Check if clicking inside current active selection to move it
            if (selection?.active && r >= selection.r1 && r <= selection.r2 && c >= selection.c1 && c <= selection.c2) {
                // Start dragging selection
                const subGrid: Cell[][] = [];
                for (let i = selection.r1; i <= selection.r2; i++) {
                    const row: Cell[] = [];
                    for (let j = selection.c1; j <= selection.c2; j++) {
                        row.push({ ...grid[i][j] });
                    }
                    subGrid.push(row);
                }

                // Clear original area in grid
                const newGrid = JSON.parse(JSON.stringify(grid));
                for (let i = selection.r1; i <= selection.r2; i++) {
                    for (let j = selection.c1; j <= selection.c2; j++) {
                        updateCell(i, j, EMPTY_CHAR, newGrid);
                    }
                }
                setGrid(newGrid);

                setSelection({
                    ...selection,
                    isDragging: true,
                    dragData: subGrid,
                    dragStartPos: { r, c }
                });
                return;
            }

            // Start a new selection marquee
            setDragStart({ r, c });
            setSelection({ r1: r, c1: c, r2: r, c2: c, active: true, isDragging: false });
            return;
        }

        setDragStart({ r, c });
        if (activeTool === 'pencil' || activeTool === 'eraser') {
            const newGrid = JSON.parse(JSON.stringify(grid));
            updateCell(r, c, activeTool === 'pencil' ? '█' : EMPTY_CHAR, newGrid);
            setGrid(newGrid);
        }
    };

    const handleMouseEnter = (r: number, c: number) => {
        setHoverPos({ r, c });

        if (activeTool === 'select' && selection?.isDragging && selection.dragStartPos) {
            const dr = r - selection.dragStartPos.r;
            const dc = c - selection.dragStartPos.c;
            // We don't bake until mouse up, just update UI
        } else if (dragStart) {
            if (activeTool === 'select') {
                setSelection({
                    active: true,
                    isDragging: false,
                    r1: Math.min(dragStart.r, r),
                    c1: Math.min(dragStart.c, c),
                    r2: Math.max(dragStart.r, r),
                    c2: Math.max(dragStart.c, c),
                });
            } else if (activeTool === 'pencil' || activeTool === 'eraser') {
                const newGrid = JSON.parse(JSON.stringify(grid));
                updateCell(r, c, activeTool === 'pencil' ? '█' : EMPTY_CHAR, newGrid);
                setGrid(newGrid);
            }
        }
    };

    const handleMouseUp = (r: number, c: number) => {
        if (activeTool === 'select' && selection?.isDragging && selection.dragData && selection.dragStartPos) {
            const dr = r - selection.dragStartPos.r;
            const dc = c - selection.dragStartPos.c;

            const newGrid = JSON.parse(JSON.stringify(grid));
            selection.dragData.forEach((row, i) => {
                row.forEach((cell, j) => {
                    updateCell(selection.r1 + dr + i, selection.c1 + dc + j, cell.char, newGrid);
                });
            });

            const nextR1 = selection.r1 + dr;
            const nextC1 = selection.c1 + dc;
            const nextR2 = selection.r2 + dr;
            const nextC2 = selection.c2 + dc;

            setGrid(newGrid);
            saveHistory(newGrid);
            setSelection({
                active: true,
                isDragging: false,
                r1: nextR1,
                c1: nextC1,
                r2: nextR2,
                c2: nextC2,
            });
            return;
        }

        if (!dragStart) return;

        if (activeTool === 'pencil' || activeTool === 'eraser') {
            saveHistory(grid);
        } else {
            const newGrid = JSON.parse(JSON.stringify(grid));
            if (activeTool === 'box') {
                drawBox(dragStart.r, dragStart.c, r, c, newGrid);
            } else if (activeTool === 'line') {
                drawLine(dragStart.r, dragStart.c, r, c, newGrid);
            }

            if (activeTool !== 'select') {
                setGrid(newGrid);
                saveHistory(newGrid);
            }
        }

        setDragStart(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        // Undo / Redo Shortcuts
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            if (e.shiftKey) {
                redo();
            } else {
                undo();
            }
            return;
        }

        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
            e.preventDefault();
            redo();
            return;
        }

        // Selection Deletion
        if (e.key === 'Delete' || e.key === 'Backspace') {
            if (selection?.active && !selection.isDragging) {
                e.preventDefault();
                const newGrid = JSON.parse(JSON.stringify(grid));
                for (let i = selection.r1; i <= selection.r2; i++) {
                    for (let j = selection.c1; j <= selection.c2; j++) {
                        updateCell(i, j, EMPTY_CHAR, newGrid);
                    }
                }
                setGrid(newGrid);
                saveHistory(newGrid);
                setSelection(null);
                return;
            }
        }

        if (e.key === 'Escape') {
            e.preventDefault();
            setSelection(null);
            setPlacementData(null);
            setActiveComponentId(null);
            return;
        }

        if (!textCursor) return;

        // Prevent space bar scrolling while typing
        if (e.key === ' ') {
            e.preventDefault();
        }

        if (e.key === 'Enter') {
            e.preventDefault();
            setTextCursor({ r: textCursor.r + 1, c: textCursor.c });
        } else if (e.key === 'Backspace') {
            e.preventDefault();
            const newGrid = JSON.parse(JSON.stringify(grid));
            updateCell(textCursor.r, textCursor.c - 1, EMPTY_CHAR, newGrid);
            setGrid(newGrid);
            setTextCursor({ r: textCursor.r, c: Math.max(0, textCursor.c - 1) });
        } else if (e.key.length === 1) {
            const newGrid = JSON.parse(JSON.stringify(grid));
            updateCell(textCursor.r, textCursor.c, e.key, newGrid);
            setGrid(newGrid);
            const nextC = Math.min(COLS - 1, textCursor.c + 1);
            setTextCursor({ r: textCursor.r, c: nextC });
            saveHistory(newGrid);
        }
    };

    const copyMarkdown = () => {
        const text = grid.map(row => row.map(cell => cell.char).join('')).join('\n');
        const markdown = '```text\n' + text + '\n```';
        navigator.clipboard.writeText(markdown);
    };

    const clearCanvas = () => {
        const newGrid = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => ({ char: EMPTY_CHAR })));
        setGrid(newGrid);
        saveHistory(newGrid);
        setHistoryIndex(0);
        setSelection(null);
        setPlacementData(null);
    };

    const handleAIGenerate = async (customPrompt?: string) => {
        const activePrompt = customPrompt || prompt;
        if (!activePrompt || !apiKey) return;
        setIsProcessing(true);
        try {
            const ai = new GoogleGenAI({ apiKey });
            const fullPrompt = `Generate a high-fidelity text-based UI layout using ASCII and Unicode box-drawing characters based on this description: "${activePrompt}". 
      
      RULES:
      - Use characters: ┌, ┐, └, ┘, ─, │, ├, ┤, ┬, ┴, ┼.
      - Use ██ for progress or selection.
      - Use [ ] for inputs, ( ) for radio, [X] for checked, [ ] for unchecked.
      - Use ┌───┐ for buttons with text inside.
      - The layout MUST fit within an 80x40 grid.
      - Return ONLY the ASCII UI. No backticks, no text explanation.`;

            const response = await ai.models.generateContent({
                model: "gemini-2.0-flash",
                contents: { parts: [{ text: fullPrompt }] }
            });

            const text = response.candidates[0].content.parts[0].text;

            // Parse text into grid
            const lines = text.split('\n');
            const newGrid = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => ({ char: EMPTY_CHAR })));

            lines.forEach((line, r) => {
                if (r < ROWS) {
                    line.split('').forEach((char, c) => {
                        if (c < COLS) {
                            newGrid[r][c] = { char };
                        }
                    });
                }
            });

            setGrid(newGrid);
            saveHistory(newGrid);
        } catch (err) {
            console.error(err);
        } finally {
            setIsProcessing(false);
        }
    };

    // Presets - Now as Placement Fragments
    const prepareComponent = (type: string) => {
        setSelection(null);
        setActiveComponentId(type);
        setActiveTool('select');

        let w = 0, h = 0;

        switch (type) {
            case 'button': {
                const text = compConfig.button;
                const label = ` ${text} `;
                w = label.length + 4; h = 3;
                const cells = Array.from({ length: h }, () => Array.from({ length: w }, () => ({ char: EMPTY_CHAR })));
                drawBox(0, 0, 2, w - 1, cells);
                writeString(1, 2, label, cells);
                setPlacementData({ cells, w, h });
                break;
            }
            case 'input': {
                const text = compConfig.input;
                w = Math.max(26, text.length + 4); h = 3;
                const cells = Array.from({ length: h }, () => Array.from({ length: w }, () => ({ char: EMPTY_CHAR })));
                drawBox(0, 0, 2, w - 1, cells);
                writeString(1, 1, ` ${text}`.padEnd(w - 2, ' '), cells);
                setPlacementData({ cells, w, h });
                break;
            }
            case 'checkbox': {
                const text = compConfig.checkbox;
                w = text.length + 3; h = 1;
                const cells = Array.from({ length: h }, () => Array.from({ length: w }, () => ({ char: EMPTY_CHAR })));
                writeString(0, 0, `☐ ${text}`, cells);
                setPlacementData({ cells, w, h });
                break;
            }
            case 'radio': {
                const text = compConfig.radio;
                w = text.length + 3; h = 1;
                const cells = Array.from({ length: h }, () => Array.from({ length: w }, () => ({ char: EMPTY_CHAR })));
                writeString(0, 0, `○ ${text}`, cells);
                setPlacementData({ cells, w, h });
                break;
            }
            case 'toggle': {
                const text = compConfig.toggle;
                w = text.length + 8; h = 1;
                const cells = Array.from({ length: h }, () => Array.from({ length: w }, () => ({ char: EMPTY_CHAR })));
                writeString(0, 0, `[○━] ${text}`, cells);
                setPlacementData({ cells, w, h });
                break;
            }
            case 'progress': {
                const val = Math.max(0, Math.min(100, compConfig.progress));
                const filled = Math.round((val / 100) * 12);
                const barStr = `[${'█'.repeat(filled)}${'░'.repeat(12 - filled)}] ${val}%`;
                w = barStr.length; h = 1;
                const cells = Array.from({ length: h }, () => Array.from({ length: w }, () => ({ char: EMPTY_CHAR })));
                writeString(0, 0, barStr, cells);
                setPlacementData({ cells, w, h });
                break;
            }
            case 'tabs': {
                const count = compConfig.tabs.count;
                const tabNames = compConfig.tabs.names.slice(0, count);
                const line = tabNames.map(t => `  ${t}  `).join('');
                w = line.length; h = 2;
                const cells = Array.from({ length: h }, () => Array.from({ length: w }, () => ({ char: EMPTY_CHAR })));
                writeString(0, 0, line, cells);

                let underline = "";
                tabNames.forEach((t) => {
                    underline += " " + "─".repeat(t.length + 2) + " ";
                });
                writeString(1, 0, underline, cells);
                setPlacementData({ cells, w, h });
                break;
            }
            case 'card': {
                const title = compConfig.card;
                w = Math.max(31, title.length + 6); h = 10;
                const cells = Array.from({ length: h }, () => Array.from({ length: w }, () => ({ char: EMPTY_CHAR })));
                drawBox(0, 0, 9, w - 1, cells);
                writeString(1, 2, title, cells);
                writeString(2, 0, "├" + "─".repeat(w - 2) + "┤", cells);
                writeString(4, 2, "Main content goes here", cells);
                writeString(5, 2, "with multiple lines.", cells);
                writeString(6, Math.floor(w / 2 - 4), "┌──────┐", cells);
                writeString(7, Math.floor(w / 2 - 4), "│  OK  │", cells);
                writeString(8, Math.floor(w / 2 - 4), "└──────┘", cells);
                setPlacementData({ cells, w, h });
                break;
            }
            case 'navbar': {
                w = 78; h = 3;
                const cells = Array.from({ length: h }, () => Array.from({ length: w }, () => ({ char: EMPTY_CHAR })));
                drawBox(0, 0, 2, 75, cells);
                writeString(1, 2, "LOGO", cells);
                writeString(1, 10, "Home   Products   About   Contact", cells);
                writeString(1, 64, "[ LOGIN ]", cells);
                setPlacementData({ cells, w, h });
                break;
            }
            case 'table': {
                const rowCount = tableConfig.rows;
                const colCount = tableConfig.cols;
                const cellW = 12;
                w = colCount * cellW + 1;
                h = rowCount * 2 + 1;
                const dynamicTable = Array.from({ length: h }, () => Array.from({ length: w }, () => ({ char: EMPTY_CHAR })));
                for (let r = 0; r <= rowCount; r++) {
                    const gridR = r * 2;
                    let lineStr = "";
                    if (r === 0) lineStr = "┌" + ("─".repeat(cellW - 1) + "┬").repeat(colCount - 1) + "─".repeat(cellW - 1) + "┐";
                    else if (r === rowCount) lineStr = "└" + ("─".repeat(cellW - 1) + "┴").repeat(colCount - 1) + "─".repeat(cellW - 1) + "┘";
                    else lineStr = "├" + ("─".repeat(cellW - 1) + "┼").repeat(colCount - 1) + "─".repeat(cellW - 1) + "┤";
                    writeString(gridR, 0, lineStr, dynamicTable);
                    if (r < rowCount) {
                        const dataR = gridR + 1;
                        for (let c = 0; c <= colCount; c++) updateCell(dataR, c * cellW, "│", dynamicTable);
                    }
                }
                setPlacementData({ cells: dynamicTable, w, h });
                break;
            }
        }
    };

    return (
        <div className={`w-full bg-zinc-950 text-zinc-200 flex flex-col md:flex-row overflow-hidden font-sans selection:bg-indigo-500/30 ${isMobile ? 'h-screen' : 'max-w-[1440px] mx-auto rounded-3xl border border-zinc-800 h-[88vh]'}`} onKeyDown={handleKeyDown} tabIndex={0}>

            {/* Sidebar Tool Palette */}
            <aside className={`${isMobile ? 'order-2 h-64 border-t' : 'w-80 border-r'} border-zinc-900 bg-zinc-950 flex flex-col p-4 space-y-4 overflow-y-auto custom-scrollbar`}>
                <div className="flex items-center gap-3 pt-2">
                    <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 shadow-lg shadow-indigo-500/5">
                        <MarkdownCreatorIcon size={18} />
                    </div>
                    <div className="flex-1 flex items-center justify-between">
                        <div className="flex flex-col">
                            <h2 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 font-unbounded">Markdown Creator</h2>
                            <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-tighter">Tools & Presets</span>
                        </div>
                        <div className="flex gap-1">
                            <button onClick={undo} disabled={historyIndex <= 0} className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-500 hover:text-white transition-colors disabled:opacity-20"><Undo size={14} /></button>
                            <button onClick={redo} disabled={historyIndex >= history.length - 1} className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-500 hover:text-white transition-colors disabled:opacity-20"><Redo size={14} /></button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                    {[
                        { id: 'select' as Tool, icon: MousePointer2, label: 'Move' },
                        { id: 'pencil' as Tool, icon: Pencil, label: 'Draw' },
                        { id: 'eraser' as Tool, icon: Eraser, label: 'Eraser' },
                        { id: 'line' as Tool, icon: Minus, label: 'Line' },
                        { id: 'box' as Tool, icon: Square, label: 'Box' },
                        { id: 'text' as Tool, icon: Type, label: 'Text' },
                    ].map(tool => (
                        <button
                            key={tool.id}
                            onClick={() => { setActiveTool(tool.id); setPlacementData(null); setSelection(null); setActiveComponentId(null); }}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${activeTool === tool.id && !activeComponentId ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400' : 'bg-zinc-900/50 border-zinc-900 text-zinc-500 hover:border-indigo-500/40 hover:text-zinc-300'}`}
                        >
                            <tool.icon size={18} />
                            <span className="text-[10px] font-bold mt-2 uppercase">{tool.label}</span>
                        </button>
                    ))}
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Components</h3>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {[
                            { id: 'button', label: 'Button', icon: Plus },
                            { id: 'input', label: 'Input', icon: Plus },
                            { id: 'checkbox', label: 'Checkbox', icon: Plus },
                            { id: 'radio', label: 'Radio', icon: Plus },
                            { id: 'toggle', label: 'Toggle', icon: Plus },
                            { id: 'progress', label: 'Progress', icon: Plus },
                            { id: 'table', label: 'Table', icon: TableIcon },
                            { id: 'navbar', label: 'Navbar', icon: Layout },
                            { id: 'tabs', label: 'Tabs', icon: Layout },
                            { id: 'card', label: 'Card', icon: CreditCard },
                        ].map(item => (
                            <button key={item.id} onClick={() => prepareComponent(item.id)} className={`flex items-center gap-2 p-2.5 rounded-lg border transition-all text-[10px] font-bold uppercase tracking-tight relative group ${activeComponentId === item.id ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400' : 'bg-zinc-900/40 border-zinc-900 hover:border-zinc-700 hover:bg-zinc-900/60 text-zinc-400 hover:text-zinc-200'}`}>
                                <item.icon size={12} className={activeComponentId === item.id ? 'text-indigo-400' : 'text-indigo-500'} />
                                {item.label}
                                <div className="absolute inset-0 border border-indigo-500/0 group-hover:border-indigo-500/20 rounded-lg pointer-events-none transition-all" />
                            </button>
                        ))}
                    </div>
                </div>

                {activeComponentId && (
                    <div className="bg-zinc-900/30 border border-zinc-900 rounded-2xl p-4 animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400">{activeComponentId.toUpperCase()} Settings</h3>
                            <button onClick={() => { setActiveComponentId(null); setPlacementData(null); }} className="text-zinc-600 hover:text-white transition-colors">
                                <X size={14} />
                            </button>
                        </div>

                        {activeComponentId === 'table' ? (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-tighter">Rows</label>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setTableConfig(prev => ({ ...prev, rows: Math.max(1, prev.rows - 1) }))} className="p-1 px-2 bg-zinc-800 rounded-md hover:bg-indigo-600 text-white transition-colors text-xs font-bold">-</button>
                                        <span className="text-xs font-black text-white w-4 text-center">{tableConfig.rows}</span>
                                        <button onClick={() => setTableConfig(prev => ({ ...prev, rows: Math.min(10, prev.rows + 1) }))} className="p-1 px-2 bg-zinc-800 rounded-md hover:bg-indigo-600 text-white transition-colors text-xs font-bold">+</button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[9px] font-bold text-zinc-500 uppercase tracking-tighter">Cols</label>
                                    <div className="flex items-center gap-2">
                                        <button onClick={() => setTableConfig(prev => ({ ...prev, cols: Math.max(1, prev.cols - 1) }))} className="p-1 px-2 bg-zinc-800 rounded-md hover:bg-indigo-600 text-white transition-colors text-xs font-bold">-</button>
                                        <span className="text-xs font-black text-white w-4 text-center">{tableConfig.cols}</span>
                                        <button onClick={() => setTableConfig(prev => ({ ...prev, cols: Math.min(6, prev.cols + 1) }))} className="p-1 px-2 bg-zinc-800 rounded-md hover:bg-indigo-600 text-white transition-colors text-xs font-bold">+</button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {['button', 'input', 'checkbox', 'radio', 'toggle', 'card'].includes(activeComponentId) && (
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-bold text-zinc-500 uppercase">Text / Label</label>
                                        <input
                                            type="text"
                                            value={compConfig[activeComponentId]}
                                            onChange={(e) => setCompConfig(prev => ({ ...prev, [activeComponentId]: e.target.value }))}
                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-200 focus:ring-1 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                )}

                                {activeComponentId === 'progress' && (
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-bold text-zinc-500 uppercase">Value (%)</label>
                                        <div className="flex items-center gap-3">
                                            <input
                                                type="range" min="0" max="100"
                                                value={compConfig.progress}
                                                onChange={(e) => setCompConfig(prev => ({ ...prev, progress: parseInt(e.target.value) }))}
                                                className="flex-1 h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                            />
                                            <span className="text-[10px] font-bold text-indigo-400 w-8">{compConfig.progress}%</span>
                                        </div>
                                    </div>
                                )}

                                {activeComponentId === 'tabs' && (
                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <h4 className="text-[9px] font-bold text-zinc-500 uppercase tracking-tighter">Tab Count</h4>
                                            <div className="flex items-center gap-2">
                                                {[1, 2, 3, 4, 5].map(n => (
                                                    <button
                                                        key={n}
                                                        onClick={() => setCompConfig(prev => ({ ...prev, tabs: { ...prev.tabs, count: n } }))}
                                                        className={`flex-1 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${compConfig.tabs.count === n ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400' : 'bg-zinc-950 border-zinc-900 text-zinc-500'}`}
                                                    >
                                                        {n}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <h4 className="text-[9px] font-bold text-zinc-500 uppercase tracking-tighter">Tab Names</h4>
                                            <div className="grid grid-cols-2 gap-2">
                                                {compConfig.tabs.names.slice(0, compConfig.tabs.count).map((name, i) => (
                                                    <div key={i} className="space-y-1">
                                                        <input
                                                            type="text"
                                                            value={name}
                                                            onChange={(e) => {
                                                                const newNames = [...compConfig.tabs.names];
                                                                newNames[i] = e.target.value;
                                                                setCompConfig(prev => ({ ...prev, tabs: { ...prev.tabs, names: newNames } }));
                                                            }}
                                                            placeholder={`Tab ${i + 1}`}
                                                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-1.5 px-2 text-[10px] text-zinc-200 focus:ring-1 focus:ring-indigo-500 outline-none"
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Magic Build AI features hidden for now as per user request */}
                {/* <div className="pt-4 border-t border-zinc-900 space-y-4"> ... </div> */}
            </aside>

            {/* Main Canvas Area */}
            <main className="flex-1 flex flex-col min-w-0 bg-[#0c0c0e]">
                <header className="h-16 px-6 border-b border-zinc-900 flex items-center justify-between shrink-0 bg-zinc-950/80 backdrop-blur-xl z-30">
                    <div className="flex items-center gap-6">
                        <div className="hidden lg:flex items-center gap-4 text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                                <Grid size={12} className="text-indigo-500" /> {COLS}x{ROWS} CANVAS
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={clearCanvas}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-400/10 transition-all border border-transparent hover:border-red-400/20 group"
                            title="Clear Canvas"
                        >
                            <Trash2 size={16} className="group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Clear Canvas</span>
                        </button>
                        <div className="w-px h-6 bg-zinc-800 mx-2" />
                        <Button variant="secondary" onClick={copyMarkdown} className="h-9 px-4 border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-white hover:bg-zinc-800 font-bold whitespace-nowrap text-[11px] uppercase tracking-wider" >
                            <Copy size={14} className="mr-2" /> Copy Markdown
                        </Button>
                        <Button className="h-9 px-4 bg-indigo-600 text-white hover:bg-indigo-500 font-black uppercase text-[11px] tracking-widest whitespace-nowrap border-none" onClick={() => {
                            const blob = new Blob([grid.map(row => row.map(cell => cell.char).join('')).join('\n')], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = 'mockup-design.txt';
                            a.click();
                        }}
                        >
                            <Download size={14} className="mr-2" /> Export TXT
                        </Button>
                    </div>
                </header>

                <div className="flex-1 overflow-auto bg-[#09090b] flex items-center justify-center p-6 custom-scrollbar relative">
                    {/* Subtle Grid Pattern Overlay */}
                    <div className="absolute inset-0 opacity-[0.03] pointer-events-none"
                        style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

                    {/* Canvas Wrapper */}
                    <div className="relative group p-1 bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition duration-1000"></div>

                        <div
                            ref={canvasRef}
                            className={`relative bg-zinc-950 border border-zinc-800/80 select-none overflow-hidden ${placementData ? 'cursor-none' : activeTool === 'select' ? 'cursor-default' : 'cursor-crosshair'}`}
                            style={{
                                fontFamily: 'monospace',
                                fontSize: '14px',
                                lineHeight: '1',
                                whiteSpace: 'pre',
                                boxShadow: 'inset 0 0 20px rgba(0,0,0,0.4)'
                            }}
                            onMouseLeave={() => setHoverPos(null)}
                        >
                            {grid.map((row, r) => (
                                <div key={r} className="flex h-[14px]">
                                    {row.map((cell, c) => {
                                        const isHovered = hoverPos?.r === r && hoverPos?.c === c;
                                        const isTextCursor = textCursor?.r === r && textCursor?.c === c;
                                        const isDragVisual = dragStart && (activeTool === 'box' || activeTool === 'line') && (activeTool === 'box' ? isBoxBoundary(r, c, dragStart, hoverPos) : isLineBoundary(r, c, dragStart, hoverPos));

                                        // Placement Preview Logic
                                        let displayChar = cell.char;
                                        let cellClass = "";

                                        if (placementData && hoverPos) {
                                            const dr = r - hoverPos.r;
                                            const dc = c - hoverPos.c;
                                            if (dr >= 0 && dr < placementData.cells.length && dc >= 0 && dc < placementData.cells[0].length) {
                                                displayChar = placementData.cells[dr][dc].char;
                                                cellClass = "text-indigo-400 bg-indigo-500/20 z-10 animate-pulse";
                                            }
                                        }

                                        // Selection Move Preview Logic
                                        if (selection?.active) {
                                            const isInsideSelection = r >= selection.r1 && r <= selection.r2 && c >= selection.c1 && c <= selection.c2;

                                            if (selection.isDragging && selection.dragData && selection.dragStartPos && hoverPos) {
                                                const dr = hoverPos.r - selection.dragStartPos.r;
                                                const dc = hoverPos.c - selection.dragStartPos.c;

                                                // If cell is inside the CURRENT DRAGGING POSITION
                                                if (r >= selection.r1 + dr && r <= selection.r2 + dr && c >= selection.c1 + dc && c <= selection.c2 + dc) {
                                                    const localR = r - (selection.r1 + dr);
                                                    const localC = c - (selection.c1 + dc);
                                                    displayChar = selection.dragData[localR][localC].char;
                                                    cellClass = "text-indigo-300 bg-indigo-500/40 z-20 shadow-[0_0_10px_rgba(99,102,241,0.5)]";
                                                }
                                            } else if (isInsideSelection) {
                                                cellClass = "bg-indigo-500/10 ring-1 ring-indigo-500/30 z-10";
                                            }
                                        }

                                        return (
                                            <div
                                                key={c}
                                                onMouseDown={() => handleMouseDown(r, c)}
                                                onMouseEnter={() => handleMouseEnter(r, c)}
                                                onMouseUp={() => handleMouseUp(r, c)}
                                                className={`w-[8.5px] h-[14px] flex items-center justify-center transition-all duration-75 relative
                                                  ${isHovered && !placementData ? 'bg-indigo-500/10' : ''}
                                                  ${isTextCursor ? 'bg-indigo-600 text-white animate-pulse z-30' : ''}
                                                  ${isDragVisual ? 'bg-indigo-500/40 text-white z-30' : ''}
                                                  ${cellClass}
                                                `}
                                                style={{ fontSize: '13px', lineHeight: '14px', fontFamily: '"JetBrains Mono", "Cascadia Code", "Fira Code", monospace' }}
                                            >
                                                {displayChar}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}

                            {/* Handle Visual for Selection */}
                            {selection?.active && !selection.isDragging && !placementData && (
                                <div
                                    className="absolute border-2 border-indigo-500 pointer-events-none z-40"
                                    style={{
                                        top: selection.r1 * 14,
                                        left: selection.c1 * 8.5,
                                        width: (selection.c2 - selection.c1 + 1) * 8.5,
                                        height: (selection.r2 - selection.r1 + 1) * 14,
                                        boxSizing: 'border-box'
                                    }}
                                >
                                    <div className="absolute -top-1.5 -left-1.5 w-3 h-3 bg-white border border-indigo-500 rounded-sm" />
                                    <div className="absolute -top-1.5 -right-1.5 w-3 h-3 bg-white border border-indigo-500 rounded-sm" />
                                    <div className="absolute -bottom-1.5 -left-1.5 w-3 h-3 bg-white border border-indigo-500 rounded-sm" />
                                    <div className="absolute -bottom-1.5 -right-1.5 w-3 h-3 bg-white border border-indigo-500 rounded-sm" />
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-1 bg-indigo-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Move size={12} className="text-white" />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <footer className="h-12 px-6 border-t border-zinc-900 bg-zinc-950/90 backdrop-blur-md flex items-center justify-between text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em] shrink-0 z-30">
                    <div className="flex gap-8">
                        <div className="flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
                            SYSTEM ACTIVE
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-zinc-700">COORD:</span>
                            <span className="text-zinc-300">{hoverPos ? `X:${hoverPos.c} Y:${hoverPos.r}` : '--- ---'}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-zinc-700">TOOL:</span>
                            <span className="text-indigo-400">{placementData ? 'PLACING COMPONENT' : activeTool.toUpperCase()}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-5">
                        <div className="flex items-center gap-2 text-zinc-600 hover:text-zinc-400 transition-colors cursor-help group">
                            <Info size={14} />
                            <span>Shortcuts</span>
                            <div className="absolute bottom-14 right-6 w-72 p-5 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none capitalize tracking-normal text-xs text-zinc-400 space-y-2 z-[60]">
                                <div className="space-y-1.5 pb-2 border-b border-zinc-800/50 mb-2">
                                    <p><b className="text-indigo-400">CTRL + Z:</b> Undo action</p>
                                    <p><b className="text-indigo-400">CTRL + Y:</b> Redo action</p>
                                </div>
                                <div className="space-y-1.5">
                                    <p><b className="text-indigo-400">ESC:</b> Cancel placement / Deselect</p>
                                    <p><b className="text-indigo-400">DEL:</b> Delete selection</p>
                                    <p><b className="text-indigo-400">DRAG:</b> Move selected area</p>
                                    <p><b className="text-indigo-400">CLICK:</b> Place ghost component</p>
                                </div>
                            </div>
                        </div>
                        <div className="w-px h-4 bg-zinc-800" />
                        <a href="https://www.mockdown.design/" target="_blank" rel="noreferrer" className="flex items-center gap-1.5 hover:text-indigo-400 transition-colors">
                            Inspired by Mockdown <ExternalLink size={12} />
                        </a>
                    </div>
                </footer>
            </main>
        </div>
    );
};


const isBoxBoundary = (r: number, c: number, start: { r: number, c: number }, current: { r: number, c: number } | null) => {
    if (!current) return false;
    const r1 = Math.min(start.r, current.r);
    const r2 = Math.max(start.r, current.r);
    const c1 = Math.min(start.c, current.c);
    const c2 = Math.max(start.c, current.c);
    return (r === r1 || r === r2) && (c >= c1 && c <= c2) || (c === c1 || c === c2) && (r >= r1 && r <= r2);
};

const isLineBoundary = (r: number, c: number, start: { r: number, c: number }, current: { r: number, c: number } | null) => {
    if (!current) return false;
    const dr = current.r - start.r;
    const dc = current.c - start.c;
    if (Math.abs(dc) >= Math.abs(dr)) {
        const c1 = Math.min(start.c, current.c);
        const c2 = Math.max(start.c, current.c);
        if (c < c1 || c > c2) return false;
        const expectedR = dc === 0 ? start.r : Math.round(start.r + (c - start.c) * (dr / dc));
        return r === expectedR;
    } else {
        const r1 = Math.min(start.r, current.r);
        const r2 = Math.max(start.r, current.r);
        if (r < r1 || r > r2) return false;
        const expectedC = dr === 0 ? start.c : Math.round(start.c + (r - start.r) * (dc / dr));
        return c === expectedC;
    }
};

export default MarkdownCreator;
export { MarkdownCreator };
