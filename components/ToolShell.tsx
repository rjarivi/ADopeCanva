import React from 'react';
import type { LucideIcon } from 'lucide-react';
import { FileUploader } from './FileUploader';
import type { FileData } from '../types';

export interface ToolFeature {
    icon: LucideIcon;
    label: string;
    desc: string;
}

interface ToolShellProps {
    icon: LucideIcon;
    title: string;
    description: string;
    /** Exactly 4 features for the standard upload grid (AGENTS.md §3). */
    features: ToolFeature[];
    /** Current file state — when set, the workspace (`children`) renders. */
    file: FileData | FileData[] | null;
    accept?: string;
    multiple?: boolean;
    uploadLabel?: string;
    uploadDescription?: string;
    onFileSelect: (file: FileData | FileData[]) => void;
    error?: string | null;
    /** Optional line under the feature grid (credits, attributions). */
    footer?: React.ReactNode;
    /** Optional block between the header and the upload area (e.g. model pickers). */
    headerExtra?: React.ReactNode;
    children: React.ReactNode;
}

/**
 * Standard tool frame. Empty state follows the mandated upload layout
 * (header + FileUploader + 4-column feature grid); once a file is present
 * the tool's workspace renders. Use for every new tool.
 */
export const ToolShell: React.FC<ToolShellProps> = ({
    icon: Icon,
    title,
    description,
    features,
    file,
    accept = '*',
    multiple = false,
    uploadLabel,
    uploadDescription,
    onFileSelect,
    error,
    footer,
    headerExtra,
    children,
}) => {
    const hasFile = Array.isArray(file) ? file.length > 0 : !!file;

    if (!hasFile) {
        return (
            <div className="container mx-auto px-6 h-full flex flex-col justify-center animate-fade-in text-center">
                <div className="flex-none space-y-3 mb-10">
                    <h1 className="text-4xl lg:text-5xl font-black tracking-tight flex items-center justify-center gap-4 font-unbounded">
                        <span className="text-indigo-400"><Icon size={42} /></span>
                        <span className="text-white">{title}</span>
                    </h1>
                    <p className="text-lg text-zinc-400 max-w-2xl mx-auto font-medium">
                        {description}
                    </p>
                    {error && <p className="text-red-400 text-sm">{error}</p>}
                </div>
                {headerExtra && (
                    <div className="flex-none w-full max-w-4xl mx-auto mb-6">
                        {headerExtra}
                    </div>
                )}
                <div className="flex-1 w-full max-w-4xl mx-auto bg-zinc-900/50 border border-zinc-800/50 rounded-3xl p-2 flex flex-col items-center justify-center relative overflow-hidden group hover:border-indigo-500/50 transition-colors shadow-2xl">
                    <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.05] pointer-events-none" />
                    <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-indigo-600/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <FileUploader
                        onFileSelect={onFileSelect as (file: FileData) => void}
                        onFilesSelect={multiple ? (onFileSelect as (files: FileData[]) => void) : undefined}
                        accept={accept}
                        multiple={multiple}
                        label={uploadLabel ?? `Drop a file to start`}
                        description={uploadDescription ?? 'All processing happens in your browser — nothing is uploaded'}
                        className="w-full h-full border-2 border-dashed border-zinc-800 hover:border-indigo-500/50 bg-transparent rounded-2xl transition-all"
                    />
                </div>
                <div className="flex-none max-w-4xl mx-auto w-full grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
                    {features.map((f, i) => (
                        <div key={i} className="flex flex-col items-center text-center space-y-2 p-5 rounded-2xl bg-zinc-900/30 border border-zinc-800/50 backdrop-blur-sm hover:bg-zinc-900/50 transition-colors group">
                            <div className="p-3 bg-zinc-900 rounded-full text-indigo-400 group-hover:scale-110 transition-transform shadow-inner"><f.icon size={20} /></div>
                            <div>
                                <h3 className="text-xs font-black text-zinc-300 uppercase tracking-wider font-unbounded">{f.label}</h3>
                                <p className="text-[9px] text-zinc-500 font-bold uppercase mt-1 tracking-tight">{f.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>
                {footer && (
                    <div className="flex-none max-w-4xl mx-auto w-full mt-6 text-center">
                        {footer}
                    </div>
                )}
            </div>
        );
    }

    return <>{children}</>;
};
