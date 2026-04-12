import React, { useState, useMemo } from 'react';
import { Button } from '../../components/ui/Button';
import { GitCompare, Copy, Check, Trash2, ArrowLeftRight, AlignLeft, AlignRight, Diff } from 'lucide-react';

type DiffType = 'equal' | 'add' | 'remove';

interface DiffLine {
    type: DiffType;
    leftLine: string | null;
    rightLine: string | null;
    leftNum: number | null;
    rightNum: number | null;
}

// Simple line-by-line LCS diff
function computeDiff(left: string, right: string): DiffLine[] {
    const leftLines = left.split('\n');
    const rightLines = right.split('\n');
    const m = leftLines.length;
    const n = rightLines.length;

    // Build LCS table
    const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
    for (let i = m - 1; i >= 0; i--) {
        for (let j = n - 1; j >= 0; j--) {
            if (leftLines[i] === rightLines[j]) {
                dp[i][j] = dp[i + 1][j + 1] + 1;
            } else {
                dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
            }
        }
    }

    // Trace back
    const result: DiffLine[] = [];
    let li = 0, ri = 0;
    let leftNum = 1, rightNum = 1;

    while (li < m || ri < n) {
        if (li < m && ri < n && leftLines[li] === rightLines[ri]) {
            result.push({ type: 'equal', leftLine: leftLines[li], rightLine: rightLines[ri], leftNum: leftNum++, rightNum: rightNum++ });
            li++; ri++;
        } else if (ri < n && (li >= m || dp[li][ri + 1] >= dp[li + 1][ri])) {
            result.push({ type: 'add', leftLine: null, rightLine: rightLines[ri], leftNum: null, rightNum: rightNum++ });
            ri++;
        } else {
            result.push({ type: 'remove', leftLine: leftLines[li], rightLine: null, leftNum: leftNum++, rightNum: null });
            li++;
        }
    }

    return result;
}

export const TextCompareTool: React.FC = () => {
    const [leftText, setLeftText] = useState('');
    const [rightText, setRightText] = useState('');
    const [copied, setCopied] = useState<'left' | 'right' | null>(null);
    const [showDiff, setShowDiff] = useState(false);

    const diff = useMemo(() => {
        if (!showDiff || (!leftText && !rightText)) return [];
        return computeDiff(leftText, rightText);
    }, [leftText, rightText, showDiff]);

    const stats = useMemo(() => {
        const added = diff.filter(d => d.type === 'add').length;
        const removed = diff.filter(d => d.type === 'remove').length;
        const equal = diff.filter(d => d.type === 'equal').length;
        return { added, removed, equal };
    }, [diff]);

    const handleCopy = (side: 'left' | 'right') => {
        navigator.clipboard.writeText(side === 'left' ? leftText : rightText);
        setCopied(side);
        setTimeout(() => setCopied(null), 2000);
    };

    const handleSwap = () => {
        const tmp = leftText;
        setLeftText(rightText);
        setRightText(tmp);
    };

    return (
        <div className="max-w-7xl mx-auto h-[calc(100vh-140px)] min-h-[600px] flex flex-col animate-slide-up gap-4">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500/10 rounded-xl text-indigo-400">
                        <GitCompare size={28} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black text-white font-unbounded">Text Compare</h2>
                        <p className="text-xs text-zinc-500">Side-by-side diff viewer</p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {showDiff && (
                        <div className="flex items-center gap-3 text-xs font-mono mr-2">
                            <span className="text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-1 rounded">+{stats.added} added</span>
                            <span className="text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-1 rounded">−{stats.removed} removed</span>
                            <span className="text-zinc-500 bg-zinc-800 border border-zinc-700 px-2 py-1 rounded">{stats.equal} unchanged</span>
                        </div>
                    )}
                    <Button variant="secondary" size="sm" onClick={handleSwap}>
                        <ArrowLeftRight size={14} className="mr-1.5" /> Swap
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => { setLeftText(''); setRightText(''); setShowDiff(false); }}>
                        <Trash2 size={14} className="mr-1.5" /> Clear
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => setShowDiff(v => !v)}
                        className={showDiff ? 'bg-indigo-600 border-none text-white' : ''}
                    >
                        <Diff size={14} className="mr-1.5" />
                        {showDiff ? 'Hide Diff' : 'Compare'}
                    </Button>
                </div>
            </div>

            {/* Editor panes */}
            {!showDiff ? (
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 min-h-0">
                    {/* Left */}
                    <div className="flex flex-col bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 shrink-0">
                            <div className="flex items-center gap-2 text-xs text-zinc-500 font-bold uppercase tracking-widest">
                                <AlignLeft size={12} /> Original
                            </div>
                            <button onClick={() => handleCopy('left')} className="text-xs flex items-center gap-1 text-zinc-500 hover:text-white transition-colors">
                                {copied === 'left' ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                                {copied === 'left' ? 'Copied' : 'Copy'}
                            </button>
                        </div>
                        <textarea
                            value={leftText}
                            onChange={e => setLeftText(e.target.value)}
                            placeholder="Paste original text here..."
                            className="flex-1 w-full bg-zinc-950 p-4 font-mono text-sm text-zinc-300 resize-none outline-none focus:ring-1 focus:ring-indigo-500/50 custom-scrollbar leading-relaxed"
                            spellCheck={false}
                        />
                        <div className="px-4 py-1.5 border-t border-zinc-800 text-[10px] font-mono text-zinc-600">
                            {leftText.split('\n').length} lines · {leftText.length} chars
                        </div>
                    </div>

                    {/* Right */}
                    <div className="flex flex-col bg-zinc-900 rounded-2xl border border-zinc-800 overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 shrink-0">
                            <div className="flex items-center gap-2 text-xs text-zinc-500 font-bold uppercase tracking-widest">
                                <AlignRight size={12} /> Modified
                            </div>
                            <button onClick={() => handleCopy('right')} className="text-xs flex items-center gap-1 text-zinc-500 hover:text-white transition-colors">
                                {copied === 'right' ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                                {copied === 'right' ? 'Copied' : 'Copy'}
                            </button>
                        </div>
                        <textarea
                            value={rightText}
                            onChange={e => setRightText(e.target.value)}
                            placeholder="Paste modified text here..."
                            className="flex-1 w-full bg-zinc-950 p-4 font-mono text-sm text-zinc-300 resize-none outline-none focus:ring-1 focus:ring-indigo-500/50 custom-scrollbar leading-relaxed"
                            spellCheck={false}
                        />
                        <div className="px-4 py-1.5 border-t border-zinc-800 text-[10px] font-mono text-zinc-600">
                            {rightText.split('\n').length} lines · {rightText.length} chars
                        </div>
                    </div>
                </div>
            ) : (
                /* Diff View */
                <div className="flex-1 grid grid-cols-2 gap-0 rounded-2xl border border-zinc-800 overflow-hidden min-h-0">
                    {/* Left column header */}
                    <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border-b border-r border-zinc-800 text-xs text-zinc-500 font-bold uppercase tracking-widest shrink-0">
                        <AlignLeft size={12} /> Original
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border-b border-zinc-800 text-xs text-zinc-500 font-bold uppercase tracking-widest shrink-0">
                        <AlignRight size={12} /> Modified
                    </div>

                    {/* Diff rows */}
                    <div className="col-span-2 overflow-y-auto custom-scrollbar">
                        {diff.length === 0 ? (
                            <div className="flex items-center justify-center h-32 text-zinc-600 text-sm">
                                No differences — texts are identical.
                            </div>
                        ) : (
                            <div className="font-mono text-xs">
                                {diff.map((row, idx) => (
                                    <div key={idx} className="grid grid-cols-2 border-b border-zinc-800/50">
                                        {/* Left cell */}
                                        <div className={`flex gap-3 px-3 py-1 border-r border-zinc-800/50 ${row.type === 'remove' ? 'bg-red-500/10' : row.type === 'add' ? 'bg-zinc-950/30' : ''}`}>
                                            <span className="text-zinc-700 select-none w-7 shrink-0 text-right">{row.leftNum ?? ''}</span>
                                            <span className={`whitespace-pre-wrap break-all ${row.type === 'remove' ? 'text-red-300' : 'text-zinc-400'}`}>
                                                {row.type === 'remove' && <span className="text-red-500 mr-1 select-none">−</span>}
                                                {row.leftLine ?? ''}
                                            </span>
                                        </div>
                                        {/* Right cell */}
                                        <div className={`flex gap-3 px-3 py-1 ${row.type === 'add' ? 'bg-green-500/10' : row.type === 'remove' ? 'bg-zinc-950/30' : ''}`}>
                                            <span className="text-zinc-700 select-none w-7 shrink-0 text-right">{row.rightNum ?? ''}</span>
                                            <span className={`whitespace-pre-wrap break-all ${row.type === 'add' ? 'text-green-300' : 'text-zinc-400'}`}>
                                                {row.type === 'add' && <span className="text-green-500 mr-1 select-none">+</span>}
                                                {row.rightLine ?? ''}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
