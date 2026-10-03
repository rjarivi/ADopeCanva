import React, { useState } from 'react';
import { Zap, ShieldCheck, Download, RefreshCcw } from 'lucide-react';
import { ToolShell } from '../../components/ToolShell';
import { useToolFile } from '../../hooks/useToolFile';
import { Button } from '../../components/ui/Button';
import { logToolFailure } from '../../utils/toolHealth';

const TOOL_ID = '__TOOL_ID__';

const FEATURES = [
    { icon: Zap, label: 'Fast', desc: 'In-Browser Only' },
    { icon: ShieldCheck, label: 'Private', desc: 'Zero Uploads' },
    { icon: Download, label: 'Export', desc: 'One-Click Save' },
    { icon: RefreshCcw, label: 'Retry', desc: 'Start Over Anytime' },
];

/**
 * Template tool. Replace this workspace with your UI.
 * Rules: no fetch/WebSocket/eval unless declared in manifest.json →
 * permissions.network; no new npm deps without separate review.
 */
const TemplateTool: React.FC = () => {
    const { file, select, clear } = useToolFile();
    const [error, setError] = useState<string | null>(null);

    return (
        <ToolShell
            icon={Zap}
            title="__TOOL_TITLE__"
            description="One sentence: what it does."
            features={FEATURES}
            file={file}
            accept="*"
            onFileSelect={select}
            error={error}
        >
            <div className="max-w-2xl mx-auto p-6 text-center space-y-4">
                <p className="text-sm text-zinc-400">
                    Loaded: <span className="font-mono text-zinc-200">{file?.file.name}</span>
                    {' '}· <span className="font-mono">{file?.size}</span>
                </p>
                {error && (
                    <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-xl">
                        <p className="text-xs text-red-400">{error}</p>
                    </div>
                )}
                <div className="flex items-center justify-center gap-3">
                    <Button
                        onClick={() => {
                            try {
                                // TODO: your processing here.
                                setError(null);
                            } catch (err) {
                                logToolFailure(TOOL_ID, err, { stage: 'process' });
                                setError('Processing failed. Please try another file.');
                            }
                        }}
                    >
                        Process
                    </Button>
                    <Button variant="secondary" onClick={() => { clear(); setError(null); }}>
                        <RefreshCcw size={14} className="mr-2" /> Start over
                    </Button>
                </div>
            </div>
        </ToolShell>
    );
};

export default TemplateTool;
