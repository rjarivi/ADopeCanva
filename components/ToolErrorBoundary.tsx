import React from 'react';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';
import { logToolFailure } from '../utils/toolHealth';

interface Props {
    toolId: string;
    toolTitle?: string;
    children: React.ReactNode;
}

interface State {
    error: Error | null;
}

/**
 * Per-tool crash boundary. Wraps every tool render so a single broken
 * tool shows a recoverable card (instead of blanking the whole app) and
 * the crash is persisted via `logToolFailure` for the /health dashboard.
 */
export class ToolErrorBoundary extends React.Component<Props, State> {
    state: State = { error: null };

    static getDerivedStateFromError(error: Error): State {
        return { error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo): void {
        logToolFailure(this.props.toolId, error, {
            kind: 'render-crash',
            componentStack: info.componentStack?.slice(0, 1000),
        });
    }

    private handleReset = (): void => {
        this.setState({ error: null });
    };

    private handleHome = (): void => {
        window.location.hash = '#/';
        if (window.location.pathname !== '/') window.location.pathname = '/';
    };

    render(): React.ReactNode {
        if (!this.state.error) return this.props.children;
        return (
            <div className="container mx-auto px-6 py-16 flex flex-col items-center text-center animate-fade-in">
                <div className="p-4 rounded-full bg-red-500/10 border border-red-500/30 mb-6">
                    <AlertTriangle size={32} className="text-red-400" />
                </div>
                <h2 className="text-2xl font-black text-white font-unbounded mb-2">
                    {this.props.toolTitle ?? this.props.toolId} hit an error
                </h2>
                <p className="text-sm text-zinc-400 max-w-md mb-2">
                    Something went wrong while rendering this tool. The failure has been
                    logged automatically — try again or pick another tool.
                </p>
                <p className="text-xs text-zinc-600 font-mono max-w-lg truncate mb-8">
                    {this.state.error.message}
                </p>
                <div className="flex items-center gap-3">
                    <button
                        onClick={this.handleReset}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold transition-all"
                    >
                        <RefreshCcw size={14} /> Try again
                    </button>
                    <button
                        onClick={this.handleHome}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 text-sm font-bold transition-all"
                    >
                        <Home size={14} /> All tools
                    </button>
                </div>
            </div>
        );
    }
}
