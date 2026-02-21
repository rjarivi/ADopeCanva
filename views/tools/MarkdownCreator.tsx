
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
            setPlacementData(null);
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
        setSelection(null); // Clear selection when starting placement
        // Create a temporary mini-grid for the component
        // Dimensions vary by component
        let w = 0, h = 0;

        switch (type) {
            case 'button': w = 12; h = 3; break;
            case 'input': w = 26; h = 3; break;
            case 'checkbox': w = 12; h = 1; break;
            case 'radio': w = 15; h = 1; break;
            case 'toggle': w = 15; h = 1; break;
            case 'progress': w = 20; h = 1; break;
            case 'table': w = 32; h = 7; break;
            case 'navbar': w = 78; h = 3; break;
            case 'tabs': w = 40; h = 2; break;
            case 'card': w = 31; h = 9; break;
            default: w = 10; h = 3; break;
        }

        const tempGrid = Array.from({ length: h }, () => Array.from({ length: w }, () => ({ char: EMPTY_CHAR })));

        switch (type) {
            case 'button':
                drawBox(0, 0, 2, 11, tempGrid);
                writeString(1, 2, " Button ", tempGrid);
                break;
            case 'input':
                drawBox(0, 0, 2, 25, tempGrid);
                writeString(1, 1, "Enter text...          ", tempGrid);
                break;
            case 'checkbox':
                writeString(0, 0, "☐ Checkbox", tempGrid);
                break;
            case 'radio':
                writeString(0, 0, "○ Radio Option", tempGrid);
                break;
            case 'toggle':
                writeString(0, 0, "[○━] Toggle Off", tempGrid);
                break;
            case 'progress':
                writeString(0, 0, "[██████░░░░░░] 50%", tempGrid);
                break;
            case 'table':
                drawBox(0, 0, 6, 31, tempGrid);
                writeString(2, 0, "├" + "─".repeat(10) + "┬" + "─".repeat(20) + "┤", tempGrid);
                writeString(1, 1, " ID       ", tempGrid);
                writeString(1, 11, "│ NAME               ", tempGrid);
                writeString(3, 1, " 01       ", tempGrid);
                writeString(3, 11, "│ Item A             ", tempGrid);
                writeString(4, 0, "├" + "─".repeat(10) + "┼" + "─".repeat(20) + "┤", tempGrid);
                writeString(5, 1, " 02       ", tempGrid);
                writeString(5, 11, "│ Item B             ", tempGrid);
                break;
            case 'navbar':
                drawBox(0, 0, 2, 75, tempGrid);
                writeString(1, 2, "LOGO", tempGrid);
                writeString(1, 10, "Home   Products   About   Contact", tempGrid);
                writeString(1, 64, "[ LOGIN ]", tempGrid);
                break;
            case 'tabs':
                writeString(0, 0, "  Overview    Analytics    Settings  ", tempGrid);
                writeString(1, 0, " ──────────  ", tempGrid);
                break;
            case 'card':
                drawBox(0, 0, 8, 30, tempGrid);
                writeString(1, 2, "Card Title", tempGrid);
                writeString(2, 0, "├" + "─".repeat(29) + "┤", tempGrid);
                writeString(4, 2, "Main content goes here", tempGrid);
                writeString(5, 2, "with multiple lines.", tempGrid);
                writeString(7, 18, "┌──────┐", tempGrid);
                writeString(8, 18, "└──────┘", tempGrid);
                writeString(8, 19, "  OK  ", tempGrid);
                break;
        }

        setPlacementData({ cells: tempGrid, w, h });
        setActiveTool('select'); // Switch to pointer to indicate placement mode
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
                            onClick={() => { setActiveTool(tool.id); setPlacementData(null); setSelection(null); }}
                            className={`flex flex-col items-center justify-center p-3 rounded-xl border transition-all ${activeTool === tool.id ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400' : 'bg-zinc-900/50 border-zinc-900 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'}`}
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
                            <button key={item.id} onClick={() => prepareComponent(item.id)} className="flex items-center gap-2 p-2.5 rounded-lg bg-zinc-900/40 border border-zinc-900 hover:border-zinc-700 hover:bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 transition-all text-[10px] font-bold uppercase tracking-tight relative group">
                                <item.icon size={12} className="text-indigo-500" />
                                {item.label}
                                <div className="absolute inset-0 border border-indigo-500/0 group-hover:border-indigo-500/20 rounded-lg pointer-events-none transition-all" />
                            </button>
                        ))}
                    </div>
                </div>

                <div className="pt-4 border-t border-zinc-900 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Magic Build</h3>
                        <button
                            onClick={() => setShowApiSettings(!showApiSettings)}
                            className={`p-1.5 rounded-lg transition-colors ${showApiSettings ? 'bg-indigo-500/10 text-indigo-400' : 'text-zinc-500 hover:text-white hover:bg-zinc-900'}`}
                        >
                            <Settings size={14} />
                        </button>
                    </div>

                    {showApiSettings && (
                        <div className="bg-zinc-900/30 border border-zinc-900 rounded-2xl p-4 animate-in fade-in slide-in-from-top-2 duration-300">
                            <ApiKeyInput
                                serviceName="Gemini"
                                localStorageKey="gemini_api_key"
                                onKeyChange={setApiKey}
                                compact={true}
                            />
                        </div>
                    )}

                    <div className="relative group">
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            placeholder="Describe any custom UI component..."
                            className="w-full bg-zinc-900 border border-zinc-900 rounded-2xl p-4 text-xs text-zinc-200 outline-none focus:ring-1 focus:ring-indigo-500 min-h-[110px] resize-none placeholder:text-zinc-700 transition-all"
                        />
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Sparkles size={14} className="text-zinc-700" />
                        </div>

                        {/* Integrated Templates as suggestions */}
                        <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5 max-w-[calc(100%-24px)]">
                            {[
                                { label: 'Login', prompt: 'A centered login form card with email input, password input, a "Remember Me" checkbox, and a large primary button at the bottom.' },
                                { label: 'Pricing', prompt: 'A horizontal pricing layout with 3 cards side-by-side. Each card has a title, price, list of 3 benefits, and a "Choose Plan" button.' },
                                { label: 'Navbar', prompt: 'A professional website header with a company logo on the left, four navigation links in the center, and a search bar on the right.' },
                            ].map(template => (
                                <button
                                    key={template.label}
                                    onClick={() => { setPrompt(template.prompt); }}
                                    className="px-2 py-1 rounded-md bg-zinc-950/80 border border-zinc-800 text-[9px] font-bold text-zinc-500 hover:text-indigo-400 hover:border-indigo-500/30 transition-all uppercase tracking-tighter"
                                >
                                    {template.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <Button onClick={() => handleAIGenerate()}
                        disabled={!prompt || !apiKey || isProcessing}
                        isLoading={isProcessing}
                        className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white border-none shadow-lg shadow-indigo-500/10 font-black uppercase tracking-widest text-[10px]"
                    >
                        <Sparkles size={14} className="mr-2" /> Start Generation
                    </Button>
                </div>
            </aside>

            {/* Main Canvas Area */}
            <main className="flex-1 flex flex-col min-w-0 bg-[#0c0c0e]">
                <header className="h-16 px-6 border-b border-zinc-900 flex items-center justify-between shrink-0 bg-zinc-950/80 backdrop-blur-xl z-30">
                    <div className="flex items-center gap-6">
                        <div className="hidden lg:flex items-center gap-4 text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                                <Grid size={12} className="text-indigo-500" /> {COLS}x{ROWS} CANVAS
                            </div>
                            <div className="w-1 h-1 rounded-full bg-zinc-800" />
                            <div className="flex items-center gap-1.5">
                                <Sparkles size={12} className="text-purple-500" /> PRO MODE
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
                                                  ${isDragVisual ? 'bg-indigo-500/40 text-white z-30 shadow-[0_0_10px_rgba(99,102,241,0.5)]' : ''}
                                                  ${cellClass}
                                                `}
                                            >
                                                {displayChar}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}

                            {/* Handle Visual for Selection */}
                            {selection?.active && !selection.isDragging && (
                                <div
                                    className="absolute border-2 border-indigo-500 pointer-events-none z-40"
                                    style={{
                                        top: selection.r1 * 14,
                                        left: selection.c1 * 8.5,
                                        width: (selection.c2 - selection.c1 + 1) * 8.5,
                                        height: (selection.r2 - selection.r1 + 1) * 14
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
