
import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Type, Square, Minus, Pencil, Eraser, Copy, Trash2,
    Sparkles, Download, Undo, Redo, Grid, Info, Plus, X,
    Layout, Table as TableIcon, CreditCard, MousePointer2, ExternalLink,
    Move, Columns, ZoomIn, ZoomOut, Camera, Smartphone, Bell,
    Maximize2, PanelLeft, FileText, ChevronDown, ChevronRight
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { Button } from '../../components/ui/Button';
import { useIsMobile } from '../../hooks/useIsMobile';
import { MarkdownCreatorIcon } from '../../components/icons/MarkdownCreatorIcon';

// Grid Dimensions
const COLS = 80;
const ROWS = 40;

const CHAR_GROUPS = [
    { label: 'Light', chars: ['─', '│', '┌', '┐', '└', '┘', '├', '┤', '┬', '┴', '┼'] },
    { label: 'Double', chars: ['═', '║', '╔', '╗', '╚', '╝', '╠', '╣', '╦', '╩', '╬'] },
    { label: 'Round', chars: ['╭', '╮', '╰', '╯'] },
    { label: 'Fill', chars: ['█', '▓', '▒', '░', '▐', '▌'] },
    { label: 'Arrows', chars: ['→', '←', '↑', '↓', '↗', '↙', '↔', '↕'] },
    { label: 'Misc', chars: ['●', '○', '☐', '☑', '◉', '★', '▶', '▲', '▼', '•', '≡', '×'] },
];

type Tool = 'pencil' | 'eraser' | 'box' | 'line' | 'text' | 'select';
type BoxStyle = 'normal' | 'double' | 'rounded';
type ViewMode = 'canvas' | 'split';

interface Cell {
    char: string;
    color?: string;
}

const EMPTY_CHAR = ' ';

const makeEmptyCells = (h: number, w: number): Cell[][] =>
    Array.from({ length: h }, () => Array.from({ length: w }, () => ({ char: EMPTY_CHAR })));

const MarkdownCreator: React.FC = () => {
    const isMobile = useIsMobile();
    const [grid, setGrid] = useState<Cell[][]>(() =>
        Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => ({ char: EMPTY_CHAR })))
    );
    const [activeTool, setActiveTool] = useState<Tool>('pencil');
    const [boxStyle, setBoxStyle] = useState<BoxStyle>('normal');
    const [pencilChar, setPencilChar] = useState('█');
    const [viewMode, setViewMode] = useState<ViewMode>('canvas');
    const [zoom, setZoom] = useState(1);
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

    const [placementData, setPlacementData] = useState<{ cells: Cell[][], w: number, h: number } | null>(null);
    const [selection, setSelection] = useState<{
        r1: number, c1: number, r2: number, c2: number,
        active: boolean,
        isDragging: boolean,
        dragData?: Cell[][],
        dragStartPos?: { r: number, c: number }
    } | null>(null);

    const canvasRef = useRef<HTMLDivElement>(null);

    // Undo / Redo
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

    useEffect(() => {
        if (activeComponentId) {
            prepareComponent(activeComponentId);
        }
    }, [tableConfig, compConfig]);

    const undo = () => {
        if (historyIndex > 0) {
            setGrid(JSON.parse(JSON.stringify(history[historyIndex - 1])));
            setHistoryIndex(historyIndex - 1);
        }
    };

    const redo = () => {
        if (historyIndex < history.length - 1) {
            setGrid(JSON.parse(JSON.stringify(history[historyIndex + 1])));
            setHistoryIndex(historyIndex + 1);
        }
    };

    // Grid helpers
    const updateCell = (r: number, c: number, char: string, tempGrid: Cell[][]) => {
        if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
        tempGrid[r][c] = { char };
    };

    const writeString = (r: number, c: number, str: string, tempGrid: Cell[][]) => {
        str.split('').forEach((char, i) => updateCell(r, c + i, char, tempGrid));
    };

    // Grid ↔ Text conversion (split view)
    const gridToText = (g: Cell[][]): string =>
        g.map(row => row.map(cell => cell.char).join('')).join('\n');

    const textToGrid = (text: string): Cell[][] => {
        const lines = text.split('\n');
        return Array.from({ length: ROWS }, (_, r) =>
            Array.from({ length: COLS }, (_, c) => ({
                char: (lines[r] && lines[r][c] !== undefined) ? lines[r][c] : EMPTY_CHAR
            }))
        );
    };

    const handleTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newGrid = textToGrid(e.target.value);
        setGrid(newGrid);
        saveHistory(newGrid);
    };

    // Drawing
    const drawBox = (startR: number, startC: number, endR: number, endC: number, tempGrid: Cell[][], style: BoxStyle = 'normal') => {
        const r1 = Math.min(startR, endR);
        const r2 = Math.max(startR, endR);
        const c1 = Math.min(startC, endC);
        const c2 = Math.max(startC, endC);

        const chars = {
            normal: { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│' },
            double: { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║' },
            rounded: { tl: '╭', tr: '╮', bl: '╰', br: '╯', h: '─', v: '│' }
        }[style];

        updateCell(r1, c1, chars.tl, tempGrid);
        updateCell(r1, c2, chars.tr, tempGrid);
        updateCell(r2, c1, chars.bl, tempGrid);
        updateCell(r2, c2, chars.br, tempGrid);
        for (let c = c1 + 1; c < c2; c++) {
            updateCell(r1, c, chars.h, tempGrid);
            updateCell(r2, c, chars.h, tempGrid);
        }
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

    // Mouse handlers
    const handleMouseDown = (r: number, c: number) => {
        if (placementData) {
            const newGrid = JSON.parse(JSON.stringify(grid));
            placementData.cells.forEach((row, dr) => {
                row.forEach((cell, dc) => updateCell(r + dr, c + dc, cell.char, newGrid));
            });
            setGrid(newGrid);
            saveHistory(newGrid);
            return;
        }

        if (activeTool === 'text') {
            setTextCursor({ r, c });
            return;
        }

        if (activeTool === 'select') {
            if (selection?.active && r >= selection.r1 && r <= selection.r2 && c >= selection.c1 && c <= selection.c2) {
                const subGrid: Cell[][] = [];
                for (let i = selection.r1; i <= selection.r2; i++) {
                    const row: Cell[] = [];
                    for (let j = selection.c1; j <= selection.c2; j++) row.push({ ...grid[i][j] });
                    subGrid.push(row);
                }
                const newGrid = JSON.parse(JSON.stringify(grid));
                for (let i = selection.r1; i <= selection.r2; i++)
                    for (let j = selection.c1; j <= selection.c2; j++)
                        updateCell(i, j, EMPTY_CHAR, newGrid);
                setGrid(newGrid);
                setSelection({ ...selection, isDragging: true, dragData: subGrid, dragStartPos: { r, c } });
                return;
            }
            setDragStart({ r, c });
            setSelection({ r1: r, c1: c, r2: r, c2: c, active: true, isDragging: false });
            return;
        }

        setDragStart({ r, c });
        if (activeTool === 'pencil' || activeTool === 'eraser') {
            const newGrid = JSON.parse(JSON.stringify(grid));
            updateCell(r, c, activeTool === 'pencil' ? pencilChar : EMPTY_CHAR, newGrid);
            setGrid(newGrid);
        }
    };

    const handleMouseEnter = (r: number, c: number) => {
        setHoverPos({ r, c });
        if (activeTool === 'select' && selection?.isDragging) return;
        if (dragStart) {
            if (activeTool === 'select') {
                setSelection({
                    active: true, isDragging: false,
                    r1: Math.min(dragStart.r, r), c1: Math.min(dragStart.c, c),
                    r2: Math.max(dragStart.r, r), c2: Math.max(dragStart.c, c),
                });
            } else if (activeTool === 'pencil' || activeTool === 'eraser') {
                const newGrid = JSON.parse(JSON.stringify(grid));
                updateCell(r, c, activeTool === 'pencil' ? pencilChar : EMPTY_CHAR, newGrid);
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
                row.forEach((cell, j) => updateCell(selection.r1 + dr + i, selection.c1 + dc + j, cell.char, newGrid));
            });
            setGrid(newGrid);
            saveHistory(newGrid);
            setSelection({ active: true, isDragging: false, r1: selection.r1 + dr, c1: selection.c1 + dc, r2: selection.r2 + dr, c2: selection.c2 + dc });
            setDragStart(null);
            return;
        }

        if (!dragStart) return;

        if (activeTool === 'pencil' || activeTool === 'eraser') {
            saveHistory(grid);
        } else {
            const newGrid = JSON.parse(JSON.stringify(grid));
            if (activeTool === 'box') drawBox(dragStart.r, dragStart.c, r, c, newGrid, boxStyle);
            else if (activeTool === 'line') drawLine(dragStart.r, dragStart.c, r, c, newGrid);
            if (activeTool !== 'select') {
                setGrid(newGrid);
                saveHistory(newGrid);
            }
        }
        setDragStart(null);
    };

    // Keyboard
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
            e.preventDefault();
            e.shiftKey ? redo() : undo();
            return;
        }
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
            e.preventDefault();
            redo();
            return;
        }
        if ((e.key === 'Delete' || e.key === 'Backspace') && selection?.active && !selection.isDragging) {
            e.preventDefault();
            const newGrid = JSON.parse(JSON.stringify(grid));
            for (let i = selection.r1; i <= selection.r2; i++)
                for (let j = selection.c1; j <= selection.c2; j++)
                    updateCell(i, j, EMPTY_CHAR, newGrid);
            setGrid(newGrid);
            saveHistory(newGrid);
            setSelection(null);
            return;
        }
        if (e.key === 'Escape') {
            e.preventDefault();
            setSelection(null);
            setPlacementData(null);
            setActiveComponentId(null);
            return;
        }

        if (!textCursor) return;
        if (e.key === ' ') e.preventDefault();

        if (e.key === 'Enter') {
            e.preventDefault();
            setTextCursor({ r: Math.min(ROWS - 1, textCursor.r + 1), c: textCursor.c });
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            setTextCursor({ r: textCursor.r, c: Math.min(COLS - 1, textCursor.c + 1) });
        } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            setTextCursor({ r: textCursor.r, c: Math.max(0, textCursor.c - 1) });
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            setTextCursor({ r: Math.min(ROWS - 1, textCursor.r + 1), c: textCursor.c });
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setTextCursor({ r: Math.max(0, textCursor.r - 1), c: textCursor.c });
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
            setTextCursor({ r: textCursor.r, c: Math.min(COLS - 1, textCursor.c + 1) });
            saveHistory(newGrid);
        }
    };

    // Character palette insert
    const insertChar = (char: string) => {
        if (activeTool === 'pencil') {
            setPencilChar(char);
            return;
        }
        if (activeTool === 'text' && textCursor) {
            const newGrid = JSON.parse(JSON.stringify(grid));
            updateCell(textCursor.r, textCursor.c, char, newGrid);
            setGrid(newGrid);
            setTextCursor({ r: textCursor.r, c: Math.min(COLS - 1, textCursor.c + 1) });
            saveHistory(newGrid);
        }
    };

    // Actions
    const copyMarkdown = () => {
        const markdown = '```text\n' + gridToText(grid) + '\n```';
        navigator.clipboard.writeText(markdown);
    };

    const copyRaw = () => navigator.clipboard.writeText(gridToText(grid));

    const clearCanvas = () => {
        const newGrid = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => ({ char: EMPTY_CHAR })));
        setGrid(newGrid);
        saveHistory(newGrid);
        setHistoryIndex(0);
        setSelection(null);
        setPlacementData(null);
    };

    const exportTXT = () => {
        const blob = new Blob([gridToText(grid)], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'wireframe.txt';
        a.click();
        URL.revokeObjectURL(url);
    };

    const exportPNG = async () => {
        if (!canvasRef.current) return;
        try {
            const canvas = await html2canvas(canvasRef.current, {
                backgroundColor: '#09090b',
                scale: 2,
                useCORS: true,
            });
            const url = canvas.toDataURL('image/png');
            const a = document.createElement('a');
            a.href = url;
            a.download = 'wireframe.png';
            a.click();
        } catch (err) {
            console.error('PNG export failed:', err);
        }
    };


    // Component presets
    const prepareComponent = (type: string) => {
        setSelection(null);
        setActiveComponentId(type);
        setActiveTool('select');
        let w = 0, h = 0;

        switch (type) {
            case 'button': {
                const label = ` ${compConfig.button} `;
                w = label.length + 4; h = 3;
                const cells = makeEmptyCells(h, w);
                drawBox(0, 0, 2, w - 1, cells);
                writeString(1, 2, label, cells);
                setPlacementData({ cells, w, h }); break;
            }
            case 'input': {
                w = Math.max(26, compConfig.input.length + 4); h = 3;
                const cells = makeEmptyCells(h, w);
                drawBox(0, 0, 2, w - 1, cells);
                writeString(1, 1, ` ${compConfig.input}`.padEnd(w - 2, ' '), cells);
                setPlacementData({ cells, w, h }); break;
            }
            case 'checkbox': {
                w = compConfig.checkbox.length + 3; h = 1;
                const cells = makeEmptyCells(h, w);
                writeString(0, 0, `☐ ${compConfig.checkbox}`, cells);
                setPlacementData({ cells, w, h }); break;
            }
            case 'radio': {
                w = compConfig.radio.length + 3; h = 1;
                const cells = makeEmptyCells(h, w);
                writeString(0, 0, `○ ${compConfig.radio}`, cells);
                setPlacementData({ cells, w, h }); break;
            }
            case 'toggle': {
                w = compConfig.toggle.length + 8; h = 1;
                const cells = makeEmptyCells(h, w);
                writeString(0, 0, `[○━] ${compConfig.toggle}`, cells);
                setPlacementData({ cells, w, h }); break;
            }
            case 'progress': {
                const val = Math.max(0, Math.min(100, compConfig.progress));
                const filled = Math.round((val / 100) * 12);
                const barStr = `[${'█'.repeat(filled)}${'░'.repeat(12 - filled)}] ${val}%`;
                w = barStr.length; h = 1;
                const cells = makeEmptyCells(h, w);
                writeString(0, 0, barStr, cells);
                setPlacementData({ cells, w, h }); break;
            }
            case 'tabs': {
                const count = compConfig.tabs.count;
                const tabNames = compConfig.tabs.names.slice(0, count);
                const line = tabNames.map((t: string) => `  ${t}  `).join('');
                w = line.length; h = 2;
                const cells = makeEmptyCells(h, w);
                writeString(0, 0, line, cells);
                let underline = "";
                tabNames.forEach((t: string) => { underline += " " + "─".repeat(t.length + 2) + " "; });
                writeString(1, 0, underline, cells);
                setPlacementData({ cells, w, h }); break;
            }
            case 'card': {
                const title = compConfig.card;
                w = Math.max(31, title.length + 6); h = 10;
                const cells = makeEmptyCells(h, w);
                drawBox(0, 0, 9, w - 1, cells);
                writeString(1, 2, title, cells);
                writeString(2, 0, "├" + "─".repeat(w - 2) + "┤", cells);
                writeString(4, 2, "Main content goes here", cells);
                writeString(5, 2, "with multiple lines.", cells);
                writeString(6, Math.floor(w / 2 - 4), "┌──────┐", cells);
                writeString(7, Math.floor(w / 2 - 4), "│  OK  │", cells);
                writeString(8, Math.floor(w / 2 - 4), "└──────┘", cells);
                setPlacementData({ cells, w, h }); break;
            }
            case 'navbar': {
                w = 78; h = 3;
                const cells = makeEmptyCells(h, w);
                drawBox(0, 0, 2, 75, cells);
                writeString(1, 2, "LOGO", cells);
                writeString(1, 10, "Home   Products   About   Contact", cells);
                writeString(1, 64, "[ LOGIN ]", cells);
                setPlacementData({ cells, w, h }); break;
            }
            case 'table': {
                const rowCount = tableConfig.rows;
                const colCount = tableConfig.cols;
                const cellW = 12;
                w = colCount * cellW + 1; h = rowCount * 2 + 1;
                const dynamicTable = makeEmptyCells(h, w);
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
                setPlacementData({ cells: dynamicTable, w, h }); break;
            }
            case 'dropdown': {
                w = 22; h = 7;
                const cells = makeEmptyCells(h, w);
                drawBox(0, 0, 2, w - 1, cells, 'rounded');
                writeString(1, 2, 'Select option  ▼', cells);
                drawBox(3, 0, h - 1, w - 1, cells);
                ['Option 1', 'Option 2', 'Option 3'].forEach((opt, i) => {
                    writeString(4 + i, 2, (i === 0 ? '▶ ' : '  ') + opt, cells);
                });
                setPlacementData({ cells, w, h }); break;
            }
            case 'modal': {
                w = 46; h = 15;
                const cells = makeEmptyCells(h, w);
                drawBox(0, 0, h - 1, w - 1, cells, 'rounded');
                writeString(1, 2, '× Modal Title', cells);
                writeString(2, 0, '├' + '─'.repeat(w - 2) + '┤', cells);
                writeString(4, 2, 'Modal body content goes here.', cells);
                writeString(5, 2, 'Add your message or form here.', cells);
                writeString(11, 0, '├' + '─'.repeat(w - 2) + '┤', cells);
                writeString(12, 4, '┌──────────┐', cells);
                writeString(12, 20, '┌──────────┐', cells);
                writeString(13, 4, '│  Cancel  │', cells);
                writeString(13, 20, '│  Confirm │', cells);
                writeString(14, 4, '└──────────┘', cells);  // overlaps bottom border intentionally
                writeString(14, 20, '└──────────┘', cells);
                setPlacementData({ cells, w, h }); break;
            }
            case 'alert': {
                w = 44; h = 5;
                const cells = makeEmptyCells(h, w);
                drawBox(0, 0, h - 1, w - 1, cells, 'rounded');
                writeString(1, 2, '⚠ Warning: Action Required', cells);
                writeString(2, 0, '├' + '─'.repeat(w - 2) + '┤', cells);
                writeString(3, 2, 'This action cannot be undone.', cells);
                setPlacementData({ cells, w, h }); break;
            }
            case 'form': {
                w = 46; h = 16;
                const cells = makeEmptyCells(h, w);
                drawBox(0, 0, h - 1, w - 1, cells, 'rounded');
                writeString(1, 2, 'Sign Up', cells);
                writeString(2, 0, '├' + '─'.repeat(w - 2) + '┤', cells);
                writeString(4, 2, 'Full Name', cells);
                drawBox(5, 2, 7, w - 3, cells);
                writeString(6, 4, 'Enter your name...', cells);
                writeString(9, 2, 'Email Address', cells);
                drawBox(10, 2, 12, w - 3, cells);
                writeString(11, 4, 'name@example.com', cells);
                writeString(13, 4, '┌──────────────────┐', cells);
                writeString(14, 4, '│  Create Account  │', cells);
                writeString(15, 4, '└──────────────────┘', cells);
                setPlacementData({ cells, w, h }); break;
            }
            case 'mobile': {
                w = 32; h = 36;
                const cells = makeEmptyCells(h, w);
                drawBox(0, 0, h - 1, w - 1, cells, 'rounded');
                writeString(1, 10, '──────────────', cells);
                writeString(3, 2, '9:41', cells);
                writeString(3, w - 10, '▌▌▌ 100%', cells);
                writeString(4, 0, '│' + '─'.repeat(w - 2) + '│', cells);
                writeString(h - 3, 0, '│' + '─'.repeat(w - 2) + '│', cells);
                writeString(h - 2, Math.floor(w / 2) - 4, '────────', cells);
                setPlacementData({ cells, w, h }); break;
            }
            case 'sidebar': {
                w = 28; h = 26;
                const cells = makeEmptyCells(h, w);
                drawBox(0, 0, h - 1, w - 1, cells);
                writeString(1, 2, '≡ AppName', cells);
                writeString(2, 0, '├' + '─'.repeat(w - 2) + '┤', cells);
                ['▶ Dashboard', '  Analytics', '  Products', '  Orders', '  Settings'].forEach((item, i) => {
                    writeString(4 + i * 2, 2, item, cells);
                });
                writeString(h - 3, 0, '├' + '─'.repeat(w - 2) + '┤', cells);
                writeString(h - 2, 2, '○ Profile', cells);
                setPlacementData({ cells, w, h }); break;
            }
            case 'hero': {
                w = 78; h = 12;
                const cells = makeEmptyCells(h, w);
                drawBox(0, 0, h - 1, w - 1, cells);
                const title = '★  Welcome to Our Platform  ★';
                const sub = 'The best tool for modern workflows.';
                writeString(2, Math.floor((w - title.length) / 2), title, cells);
                writeString(4, Math.floor((w - sub.length) / 2), sub, cells);
                const btnOffset = Math.floor((w - 34) / 2);
                writeString(7, btnOffset, '┌──────────────┐', cells);
                writeString(8, btnOffset, '│  Get Started │', cells);
                writeString(9, btnOffset, '└──────────────┘', cells);
                writeString(7, btnOffset + 20, '┌────────────┐', cells);
                writeString(8, btnOffset + 20, '│ Learn More │', cells);
                writeString(9, btnOffset + 20, '└────────────┘', cells);
                setPlacementData({ cells, w, h }); break;
            }
        }
    };

    // Zoom
    const zoomIn = () => setZoom(z => Math.min(2, parseFloat((z + 0.25).toFixed(2))));
    const zoomOut = () => setZoom(z => Math.max(0.5, parseFloat((z - 0.25).toFixed(2))));
    const resetZoom = () => setZoom(1);

    return (
        <div
            className={`w-full bg-zinc-950 text-zinc-200 flex flex-col md:flex-row overflow-hidden font-sans selection:bg-indigo-500/30 ${isMobile ? 'h-screen' : 'max-w-[1440px] mx-auto rounded-3xl border border-zinc-800 h-[88vh]'}`}
            onKeyDown={handleKeyDown}
            tabIndex={0}
        >
            {/* Sidebar */}
            <aside className={`${isMobile ? 'order-2 h-64 border-t' : 'w-72 border-r'} border-zinc-900 bg-zinc-950 flex flex-col p-4 space-y-4 overflow-y-auto custom-scrollbar`}>

                {/* Header */}
                <div className="flex items-center gap-3 pt-2">
                    <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                        <MarkdownCreatorIcon size={18} />
                    </div>
                    <div className="flex-1 flex items-center justify-between">
                        <div className="flex flex-col">
                            <h2 className="text-[10px] font-black uppercase tracking-widest text-indigo-400 font-unbounded">Wireframe</h2>
                            <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-tighter">ASCII · Unicode</span>
                        </div>
                        <div className="flex gap-1">
                            <button onClick={undo} disabled={historyIndex <= 0} className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-500 hover:text-white transition-colors disabled:opacity-20" title="Undo (Ctrl+Z)"><Undo size={14} /></button>
                            <button onClick={redo} disabled={historyIndex >= history.length - 1} className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-500 hover:text-white transition-colors disabled:opacity-20" title="Redo (Ctrl+Y)"><Redo size={14} /></button>
                        </div>
                    </div>
                </div>

                {/* Tools */}
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

                {/* Box Style (shown when box tool active) */}
                {activeTool === 'box' && !activeComponentId && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Box Style</span>
                        <div className="grid grid-cols-3 gap-1.5">
                            {([
                                { id: 'normal' as BoxStyle, label: '┌─┐', title: 'Light' },
                                { id: 'double' as BoxStyle, label: '╔═╗', title: 'Double' },
                                { id: 'rounded' as BoxStyle, label: '╭─╮', title: 'Round' },
                            ]).map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => setBoxStyle(s.id)}
                                    title={s.title}
                                    className={`py-2 rounded-lg border text-[11px] font-mono font-bold transition-all ${boxStyle === s.id ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400' : 'bg-zinc-900/50 border-zinc-900 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300'}`}
                                >
                                    {s.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Pencil char (shown when pencil tool active) */}
                {activeTool === 'pencil' && !activeComponentId && (
                    <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-1 duration-200">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500 shrink-0">Draw Char</span>
                        <div className="flex-1 flex items-center gap-2">
                            <span className="w-8 h-8 flex items-center justify-center bg-zinc-900 border border-indigo-500/40 rounded-lg text-indigo-300 font-mono text-base">{pencilChar}</span>
                            <span className="text-[9px] text-zinc-600">Click palette to change</span>
                        </div>
                    </div>
                )}

                {/* Character Palette */}
                <div className="space-y-2.5">
                    <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Characters</span>
                        <span className="text-[8px] text-zinc-700">
                            {activeTool === 'pencil' ? '— sets draw char' : activeTool === 'text' ? '— inserts at cursor' : '— select pencil/text'}
                        </span>
                    </div>
                    {CHAR_GROUPS.map(group => (
                        <div key={group.label}>
                            <div className="text-[8px] text-zinc-700 uppercase tracking-widest mb-1">{group.label}</div>
                            <div className="flex flex-wrap gap-1">
                                {group.chars.map(char => (
                                    <button
                                        key={char}
                                        onClick={() => insertChar(char)}
                                        className={`w-7 h-7 flex items-center justify-center rounded-md border font-mono text-[13px] transition-all
                                            ${(activeTool === 'pencil' && pencilChar === char) ? 'bg-indigo-500/20 border-indigo-500/60 text-indigo-300' : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-white hover:border-zinc-600'}
                                            ${activeTool !== 'pencil' && activeTool !== 'text' ? 'opacity-40 cursor-not-allowed' : ''}`}
                                        disabled={activeTool !== 'pencil' && activeTool !== 'text'}
                                    >
                                        {char}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Components */}
                <div className="space-y-3">
                    <h3 className="text-[9px] font-black uppercase tracking-widest text-zinc-500">Components</h3>
                    <div className="grid grid-cols-2 gap-1.5">
                        {[
                            { id: 'button', label: 'Button', icon: Plus },
                            { id: 'input', label: 'Input', icon: Plus },
                            { id: 'checkbox', label: 'Checkbox', icon: Plus },
                            { id: 'radio', label: 'Radio', icon: Plus },
                            { id: 'toggle', label: 'Toggle', icon: Plus },
                            { id: 'progress', label: 'Progress', icon: Plus },
                            { id: 'dropdown', label: 'Dropdown', icon: ChevronDown },
                            { id: 'tabs', label: 'Tabs', icon: Layout },
                            { id: 'table', label: 'Table', icon: TableIcon },
                            { id: 'card', label: 'Card', icon: CreditCard },
                            { id: 'modal', label: 'Modal', icon: Maximize2 },
                            { id: 'alert', label: 'Alert', icon: Bell },
                            { id: 'form', label: 'Form', icon: FileText },
                            { id: 'navbar', label: 'Navbar', icon: Layout },
                            { id: 'sidebar', label: 'Sidebar', icon: PanelLeft },
                            { id: 'mobile', label: 'Mobile', icon: Smartphone },
                            { id: 'hero', label: 'Hero', icon: Maximize2 },
                        ].map(item => (
                            <button
                                key={item.id}
                                onClick={() => prepareComponent(item.id)}
                                className={`flex items-center gap-2 p-2.5 rounded-lg border transition-all text-[10px] font-bold uppercase tracking-tight ${activeComponentId === item.id ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400' : 'bg-zinc-900/40 border-zinc-900 hover:border-zinc-700 hover:bg-zinc-900/60 text-zinc-400 hover:text-zinc-200'}`}
                            >
                                <item.icon size={11} className={activeComponentId === item.id ? 'text-indigo-400' : 'text-indigo-500'} />
                                {item.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Component Settings */}
                {activeComponentId && (
                    <div className="bg-zinc-900/30 border border-zinc-900 rounded-2xl p-4 animate-in fade-in slide-in-from-top-2 duration-300 space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[10px] font-black uppercase tracking-widest text-indigo-400">{activeComponentId.toUpperCase()} Settings</h3>
                            <button onClick={() => { setActiveComponentId(null); setPlacementData(null); }} className="text-zinc-600 hover:text-white transition-colors"><X size={14} /></button>
                        </div>

                        {activeComponentId === 'table' ? (
                            <div className="grid grid-cols-2 gap-4">
                                {[{ key: 'rows', label: 'Rows', min: 1, max: 10 }, { key: 'cols', label: 'Cols', min: 1, max: 6 }].map(({ key, label, min, max }) => (
                                    <div key={key} className="space-y-2">
                                        <label className="text-[9px] font-bold text-zinc-500 uppercase">{label}</label>
                                        <div className="flex items-center gap-2">
                                            <button onClick={() => setTableConfig(prev => ({ ...prev, [key]: Math.max(min, prev[key as keyof typeof prev] - 1) }))} className="p-1 px-2 bg-zinc-800 rounded-md hover:bg-indigo-600 text-white text-xs font-bold">-</button>
                                            <span className="text-xs font-black text-white w-4 text-center">{tableConfig[key as keyof typeof tableConfig]}</span>
                                            <button onClick={() => setTableConfig(prev => ({ ...prev, [key]: Math.min(max, prev[key as keyof typeof prev] + 1) }))} className="p-1 px-2 bg-zinc-800 rounded-md hover:bg-indigo-600 text-white text-xs font-bold">+</button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {['button', 'input', 'checkbox', 'radio', 'toggle', 'card'].includes(activeComponentId) && (
                                    <div className="space-y-1.5">
                                        <label className="text-[9px] font-bold text-zinc-500 uppercase">Text / Label</label>
                                        <input
                                            type="text"
                                            value={compConfig[activeComponentId] ?? ''}
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
                                            <h4 className="text-[9px] font-bold text-zinc-500 uppercase">Tab Count</h4>
                                            <div className="flex gap-1">
                                                {[1, 2, 3, 4, 5].map(n => (
                                                    <button key={n} onClick={() => setCompConfig(prev => ({ ...prev, tabs: { ...prev.tabs, count: n } }))}
                                                        className={`flex-1 py-1.5 rounded-lg border text-[10px] font-bold transition-all ${compConfig.tabs.count === n ? 'bg-indigo-500/10 border-indigo-500/50 text-indigo-400' : 'bg-zinc-950 border-zinc-900 text-zinc-500'}`}>
                                                        {n}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <h4 className="text-[9px] font-bold text-zinc-500 uppercase">Tab Names</h4>
                                            <div className="grid grid-cols-2 gap-2">
                                                {compConfig.tabs.names.slice(0, compConfig.tabs.count).map((name: string, i: number) => (
                                                    <input key={i} type="text" value={name} placeholder={`Tab ${i + 1}`}
                                                        onChange={(e) => {
                                                            const newNames = [...compConfig.tabs.names];
                                                            newNames[i] = e.target.value;
                                                            setCompConfig(prev => ({ ...prev, tabs: { ...prev.tabs, names: newNames } }));
                                                        }}
                                                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-1.5 px-2 text-[10px] text-zinc-200 focus:ring-1 focus:ring-indigo-500 outline-none"
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}

            </aside>

            {/* Main Canvas Area */}
            <main className="flex-1 flex flex-col min-w-0 bg-[#0c0c0e]">

                {/* Header */}
                <header className="h-14 px-4 border-b border-zinc-900 flex items-center justify-between shrink-0 bg-zinc-950/80 backdrop-blur-xl z-30 gap-3">
                    <div className="flex items-center gap-3">
                        {/* View mode toggle */}
                        <div className="hidden md:flex items-center bg-zinc-900 rounded-lg p-1 gap-1 border border-zinc-800">
                            {([
                                { mode: 'canvas' as ViewMode, icon: Grid, label: 'Canvas' },
                                { mode: 'split' as ViewMode, icon: Columns, label: 'Split' },
                            ]).map(({ mode, icon: Icon, label }) => (
                                <button
                                    key={mode}
                                    onClick={() => setViewMode(mode)}
                                    title={label}
                                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${viewMode === mode ? 'bg-indigo-600 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
                                >
                                    <Icon size={12} />
                                    <span className="hidden lg:inline">{label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Zoom controls */}
                        <div className="hidden md:flex items-center gap-1 bg-zinc-900 rounded-lg p-1 border border-zinc-800">
                            <button onClick={zoomOut} disabled={zoom <= 0.5} className="p-1.5 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all disabled:opacity-30" title="Zoom out">
                                <ZoomOut size={13} />
                            </button>
                            <button onClick={resetZoom} className="px-2 py-1 rounded-md text-[10px] font-black text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all min-w-[40px] text-center" title="Reset zoom">
                                {Math.round(zoom * 100)}%
                            </button>
                            <button onClick={zoomIn} disabled={zoom >= 2} className="p-1.5 rounded-md text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all disabled:opacity-30" title="Zoom in">
                                <ZoomIn size={13} />
                            </button>
                        </div>

                        <div className="hidden lg:flex items-center gap-1.5 text-[10px] font-black text-zinc-700 uppercase tracking-widest whitespace-nowrap">
                            <Grid size={11} className="text-indigo-500/50" /> {COLS}×{ROWS}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={clearCanvas}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-400/10 transition-all border border-transparent hover:border-red-400/20 group"
                        >
                            <Trash2 size={14} className="group-hover:scale-110 transition-transform" />
                            <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Clear</span>
                        </button>
                        <div className="w-px h-5 bg-zinc-800" />
                        <button onClick={copyRaw} className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all text-[10px] font-bold uppercase tracking-wider">
                            <Copy size={13} /> Raw
                        </button>
                        <Button variant="secondary" onClick={copyMarkdown} className="h-8 px-3 border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-white hover:bg-zinc-800 font-bold text-[10px] uppercase tracking-wider whitespace-nowrap">
                            <Copy size={13} className="mr-1.5" /> MD
                        </Button>
                        <Button variant="secondary" onClick={exportTXT} className="h-8 px-3 border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-white hover:bg-zinc-800 font-bold text-[10px] uppercase tracking-wider whitespace-nowrap">
                            <Download size={13} className="mr-1.5" /> TXT
                        </Button>
                        <Button className="h-8 px-3 bg-indigo-600 text-white hover:bg-indigo-500 font-black text-[10px] uppercase tracking-widest whitespace-nowrap border-none" onClick={exportPNG}>
                            <Camera size={13} className="mr-1.5" /> PNG
                        </Button>
                    </div>
                </header>

                {/* Content Area */}
                <div className="flex-1 overflow-hidden flex min-h-0">

                    {/* Text Editor Pane (split mode) */}
                    {viewMode === 'split' && (
                        <div className="w-1/2 border-r border-zinc-800 flex flex-col bg-zinc-950 min-h-0">
                            <div className="px-4 py-2 border-b border-zinc-800 text-[9px] font-black text-zinc-600 uppercase tracking-[0.2em] flex items-center gap-2 shrink-0">
                                <Type size={10} className="text-indigo-500/50" /> Raw Text Editor
                            </div>
                            <textarea
                                value={gridToText(grid)}
                                onChange={handleTextAreaChange}
                                className="flex-1 bg-transparent text-zinc-300 p-4 resize-none outline-none custom-scrollbar overflow-auto"
                                style={{
                                    fontFamily: '"JetBrains Mono", "Cascadia Code", "Fira Code", monospace',
                                    fontSize: `${13 * zoom}px`,
                                    lineHeight: `${14 * zoom}px`,
                                    letterSpacing: '0px',
                                }}
                                spellCheck={false}
                            />
                        </div>
                    )}

                    {/* Canvas Pane */}
                    <div className={`${viewMode === 'split' ? 'w-1/2' : 'flex-1'} overflow-auto bg-[#09090b] flex items-center justify-center p-6 custom-scrollbar relative`}>
                        <div className="absolute inset-0 opacity-[0.025] pointer-events-none"
                            style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

                        <div
                            className="relative group p-1 bg-gradient-to-br from-zinc-800/50 to-zinc-900/50 rounded-lg shadow-[0_0_50px_rgba(0,0,0,0.5)]"
                            style={{ transform: `scale(${zoom})`, transformOrigin: 'center center' }}
                        >
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/20 to-purple-500/20 rounded-lg blur opacity-0 group-hover:opacity-100 transition duration-1000 pointer-events-none" />

                            <div
                                ref={canvasRef}
                                className={`relative bg-zinc-950 border border-zinc-800/80 select-none overflow-hidden ${placementData ? 'cursor-none' : activeTool === 'select' ? 'cursor-default' : 'cursor-crosshair'}`}
                                style={{
                                    fontFamily: '"JetBrains Mono", "Cascadia Code", "Fira Code", monospace',
                                    fontSize: '13px',
                                    lineHeight: '1',
                                    whiteSpace: 'pre',
                                    boxShadow: 'inset 0 0 20px rgba(0,0,0,0.4)',
                                }}
                                onMouseLeave={() => setHoverPos(null)}
                            >
                                {grid.map((row, r) => (
                                    <div key={r} className="flex h-[14px]">
                                        {row.map((cell, c) => {
                                            const isHovered = hoverPos?.r === r && hoverPos?.c === c;
                                            const isTextCursor = textCursor?.r === r && textCursor?.c === c;
                                            const isDragVisual = dragStart && (activeTool === 'box' || activeTool === 'line') && (activeTool === 'box' ? isBoxBoundary(r, c, dragStart, hoverPos) : isLineBoundary(r, c, dragStart, hoverPos));

                                            let displayChar = cell.char;
                                            let cellClass = "";

                                            if (placementData && hoverPos) {
                                                const dr = r - hoverPos.r;
                                                const dc = c - hoverPos.c;
                                                if (dr >= 0 && dr < placementData.cells.length && dc >= 0 && dc < placementData.cells[0].length) {
                                                    displayChar = placementData.cells[dr][dc].char;
                                                    cellClass = "text-indigo-400 bg-indigo-500/20 z-10";
                                                }
                                            }

                                            if (selection?.active) {
                                                const isInside = r >= selection.r1 && r <= selection.r2 && c >= selection.c1 && c <= selection.c2;
                                                if (selection.isDragging && selection.dragData && selection.dragStartPos && hoverPos) {
                                                    const dr = hoverPos.r - selection.dragStartPos.r;
                                                    const dc = hoverPos.c - selection.dragStartPos.c;
                                                    if (r >= selection.r1 + dr && r <= selection.r2 + dr && c >= selection.c1 + dc && c <= selection.c2 + dc) {
                                                        displayChar = selection.dragData[r - (selection.r1 + dr)][c - (selection.c1 + dc)].char;
                                                        cellClass = "text-indigo-300 bg-indigo-500/40 z-20";
                                                    }
                                                } else if (isInside) {
                                                    cellClass = "bg-indigo-500/10 ring-1 ring-indigo-500/30 z-10";
                                                }
                                            }

                                            return (
                                                <div
                                                    key={c}
                                                    onMouseDown={() => handleMouseDown(r, c)}
                                                    onMouseEnter={() => handleMouseEnter(r, c)}
                                                    onMouseUp={() => handleMouseUp(r, c)}
                                                    className={`w-[8.5px] h-[14px] flex items-center justify-center transition-colors duration-75 relative
                                                        ${isHovered && !placementData ? 'bg-indigo-500/10' : ''}
                                                        ${isTextCursor ? 'bg-indigo-600 text-white animate-pulse z-30' : ''}
                                                        ${isDragVisual ? 'bg-indigo-500/40 text-white z-30' : ''}
                                                        ${cellClass}`}
                                                    style={{ fontSize: '13px', lineHeight: '14px' }}
                                                >
                                                    {displayChar}
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}

                                {/* Selection handles */}
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
                                        {[[-1.5, -1.5], [-1.5, '100%'], ['100%', -1.5], ['100%', '100%']].map(([t, l], i) => (
                                            <div key={i} className="absolute w-3 h-3 bg-white border border-indigo-500 rounded-sm"
                                                style={{ top: t, left: l, transform: 'translate(-50%, -50%)' }} />
                                        ))}
                                        <Move size={12} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-400 opacity-50" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <footer className="h-10 px-4 border-t border-zinc-900 bg-zinc-950/90 backdrop-blur-md flex items-center justify-between text-[9px] font-black text-zinc-600 uppercase tracking-[0.15em] shrink-0 z-30">
                    <div className="flex gap-6 items-center">
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse shadow-[0_0_6px_rgba(99,102,241,0.8)]" />
                            Active
                        </div>
                        <div className="hidden sm:flex items-center gap-2">
                            <span className="text-zinc-700">XY:</span>
                            <span className="text-zinc-400 font-mono">{hoverPos ? `${hoverPos.c},${hoverPos.r}` : '—'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-zinc-700">Tool:</span>
                            <span className="text-indigo-400">{placementData ? 'Placing' : activeTool === 'pencil' ? `Pencil [${pencilChar}]` : activeTool}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative group flex items-center gap-1.5 text-zinc-700 hover:text-zinc-400 transition-colors cursor-help">
                            <Info size={12} />
                            <span>Shortcuts</span>
                            <div className="absolute bottom-12 right-0 w-64 p-4 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none normal-case tracking-normal text-[10px] text-zinc-400 space-y-1.5 z-[60]">
                                <p><b className="text-indigo-400">Ctrl+Z / Ctrl+Y</b> — Undo / Redo</p>
                                <p><b className="text-indigo-400">Esc</b> — Cancel / Deselect</p>
                                <p><b className="text-indigo-400">Del</b> — Clear selection</p>
                                <p><b className="text-indigo-400">Arrow keys</b> — Move text cursor</p>
                                <p><b className="text-indigo-400">Drag</b> — Move selected area</p>
                                <p><b className="text-indigo-400">Click</b> — Place component</p>
                            </div>
                        </div>
                        <div className="w-px h-3 bg-zinc-800" />
                        <a href="https://wiretext.app/" target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-indigo-400 transition-colors">
                            Inspired by WireText <ExternalLink size={10} className="ml-0.5" />
                        </a>
                    </div>
                </footer>
            </main>
        </div>
    );
};


const isBoxBoundary = (r: number, c: number, start: { r: number, c: number }, current: { r: number, c: number } | null) => {
    if (!current) return false;
    const r1 = Math.min(start.r, current.r), r2 = Math.max(start.r, current.r);
    const c1 = Math.min(start.c, current.c), c2 = Math.max(start.c, current.c);
    return ((r === r1 || r === r2) && c >= c1 && c <= c2) || ((c === c1 || c === c2) && r >= r1 && r <= r2);
};

const isLineBoundary = (r: number, c: number, start: { r: number, c: number }, current: { r: number, c: number } | null) => {
    if (!current) return false;
    const dr = current.r - start.r, dc = current.c - start.c;
    if (Math.abs(dc) >= Math.abs(dr)) {
        const c1 = Math.min(start.c, current.c), c2 = Math.max(start.c, current.c);
        if (c < c1 || c > c2) return false;
        return r === (dc === 0 ? start.r : Math.round(start.r + (c - start.c) * (dr / dc)));
    } else {
        const r1 = Math.min(start.r, current.r), r2 = Math.max(start.r, current.r);
        if (r < r1 || r > r2) return false;
        return c === (dr === 0 ? start.c : Math.round(start.c + (r - start.r) * (dc / dr)));
    }
};

export default MarkdownCreator;
export { MarkdownCreator };
