import React, { useState } from 'react';
import { Activity, Trash2, Download, RefreshCcw, ShieldCheck, AlertTriangle } from 'lucide-react';
import { getToolFailures, getFailureSummary, clearToolFailures } from '../utils/toolHealth';
import { TOOLS } from './Dashboard';

/**
 * Admin health dashboard (route `/health`).
 * Shows every tool failure captured by `logToolFailure` / `ToolErrorBoundary`
 * / the global unhandled-rejection hook — newest first — so broken tools
 * are visible before users report them. Data lives in localStorage; GA4
 * also receives a `tool_failure` event per failure for production monitoring.
 */
export const ToolHealth: React.FC = () => {
    const [tick, setTick] = useState(0);
    const failures = getToolFailures();
    const summary = getFailureSummary();
    const toolTitles = new Map(TOOLS.map((t) => [t.id, t.title]));

    const refresh = () => setTick((t) => t + 1);
    void tick;

    const handleClear = () => {
        clearToolFailures();
        refresh();
    };

    const handleExport = () => {
        const blob = new Blob([JSON.stringify(failures, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `adopecanva-tool-health-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    };

    return (
        <div className="container mx-auto px-6 py-10 max-w-5xl animate-fade-in">
            <div className="flex items-center gap-4 mb-2">
                <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                    <Activity size={28} />
                </div>
                <div>
                    <h1 className="text-3xl font-black text-white font-unbounded">Tool Health</h1>
                    <p className="text-sm text-zinc-400">
                        Automatic failure log — every tool crash is recorded here before users report it.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-8">
                {[
                    { label: 'Total failures', value: String(failures.length) },
                    { label: 'Affected tools', value: String(summary.length) },
                    { label: 'Live tools', value: String(TOOLS.filter((t) => !t.comingSoon).length) },
                    { label: 'Status', value: failures.length === 0 ? 'Healthy' : 'Needs review' },
                ].map((s) => (
                    <div key={s.label} className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/60 text-center">
                        <div className="text-2xl font-black text-white font-unbounded">{s.value}</div>
                        <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mt-1">{s.label}</div>
                    </div>
                ))}
            </div>

            {failures.length === 0 ? (
                <div className="p-10 rounded-3xl bg-zinc-900/30 border border-zinc-800/50 text-center">
                    <ShieldCheck size={36} className="mx-auto text-emerald-400 mb-4" />
                    <h2 className="text-lg font-bold text-white mb-1">No failures recorded</h2>
                    <p className="text-sm text-zinc-500 max-w-md mx-auto">
                        Use the tools normally — any render crash, failed conversion, or unhandled
                        error will appear here automatically with its tool name and message.
                    </p>
                </div>
            ) : (
                <>
                    <div className="flex items-center gap-2 mb-4">
                        <button onClick={refresh} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs font-bold transition-all">
                            <RefreshCcw size={12} /> Refresh
                        </button>
                        <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-xs font-bold transition-all">
                            <Download size={12} /> Export JSON
                        </button>
                        <button onClick={handleClear} className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-300 text-xs font-bold transition-all">
                            <Trash2 size={12} /> Clear log
                        </button>
                    </div>

                    {summary.length > 0 && (
                        <div className="mb-6 p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
                            <h3 className="text-[11px] uppercase tracking-widest text-zinc-500 font-bold mb-3">Failures by tool</h3>
                            <div className="flex flex-wrap gap-2">
                                {summary.map((s) => (
                                    <span key={s.toolId} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-bold">
                                        <AlertTriangle size={11} />
                                        {toolTitles.get(s.toolId) ?? s.toolId} · {s.count}
                                    </span>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-3">
                        {failures.slice(0, 100).map((f) => (
                            <div key={f.id} className="p-4 rounded-2xl bg-zinc-900/50 border border-zinc-800/60">
                                <div className="flex items-center justify-between gap-3 mb-1">
                                    <span className="text-sm font-bold text-white">
                                        {toolTitles.get(f.toolId) ?? f.toolId}
                                        <span className="ml-2 text-[10px] font-mono text-zinc-500">{f.toolId}</span>
                                    </span>
                                    <span className="text-[10px] font-mono text-zinc-500 shrink-0">
                                        {new Date(f.timestamp).toLocaleString()}
                                    </span>
                                </div>
                                <p className="text-xs text-red-300 font-mono break-words">{f.message}</p>
                                {f.context && (
                                    <p className="text-[10px] text-zinc-500 font-mono mt-1 break-words">
                                        {JSON.stringify(f.context).slice(0, 300)}
                                    </p>
                                )}
                            </div>
                        ))}
                    </div>
                </>
            )}

            <div className="mt-8 p-4 rounded-2xl bg-zinc-900/30 border border-zinc-800/50">
                <h3 className="text-[11px] uppercase tracking-widest text-zinc-500 font-bold mb-2">How monitoring works</h3>
                <ul className="text-xs text-zinc-400 space-y-1 list-disc list-inside">
                    <li>Every tool render is wrapped in an error boundary that logs crashes here.</li>
                    <li>PDF / conversion / export failures call <span className="font-mono">logToolFailure(toolId, error)</span>.</li>
                    <li>A global hook captures unhandled promise rejections.</li>
                    <li>Each failure also fires a GA4 <span className="font-mono">tool_failure</span> event for production alerts.</li>
                    <li>Run <span className="font-mono">npm run audit:tools</span> before deploy for the static audit.</li>
                </ul>
            </div>
        </div>
    );
};
