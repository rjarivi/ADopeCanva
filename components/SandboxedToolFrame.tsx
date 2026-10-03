import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AlertTriangle } from 'lucide-react';
import { logToolFailure } from '../utils/toolHealth';

interface Props {
    toolId: string;
    toolTitle?: string;
    className?: string;
}

interface SandboxMessage {
    source?: string;
    type?: string;
    toolId?: string;
    message?: string;
    height?: number;
}

/**
 * Phase 2 isolation boundary. Renders a manifest tool inside
 * /sandbox.html?tool=<id> with sandbox="allow-scripts allow-downloads" and
 * deliberately WITHOUT allow-same-origin:
 *  - opaque origin: no parent DOM, cookies, storage, or parent JS access
 *  - narrower CSP than the main app (no analytics/ads/secret endpoints)
 *  - all failure signals come back via postMessage and land in /health
 *
 * A tool opts in with `"sandbox": true` in tools/<id>/manifest.json.
 * Until a tool is vetted it stays first-party (direct render); the frame
 * is for community tools that passed review but haven't earned full trust.
 */
export const SandboxedToolFrame: React.FC<Props> = ({ toolId, toolTitle, className = '' }) => {
    const frameRef = useRef<HTMLIFrameElement>(null);
    const [height, setHeight] = useState(640);
    const [failed, setFailed] = useState<string | null>(null);

    const handleMessage = useCallback((event: MessageEvent<SandboxMessage>) => {
        // Trust only messages from OUR frame carrying the sandbox marker.
        if (event.source !== frameRef.current?.contentWindow) return;
        const data = event.data;
        if (!data || data.source !== 'adope-sandbox' || data.toolId !== toolId) return;
        if (data.type === 'tool:resize' && typeof data.height === 'number') {
            setHeight(Math.max(480, Math.min(4000, data.height)));
        } else if (data.type === 'tool:failure' && data.message) {
            logToolFailure(toolId, new Error(data.message), { kind: 'sandbox-child' });
        }
    }, [toolId]);

    useEffect(() => {
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [handleMessage]);

    if (failed) {
        return (
            <div className={`flex flex-col items-center justify-center gap-3 p-10 text-center ${className}`}>
                <AlertTriangle size={28} className="text-amber-400" />
                <p className="text-sm text-zinc-400 max-w-md">
                    {toolTitle ?? toolId} failed inside its sandbox. The failure was logged.
                </p>
                <button
                    onClick={() => setFailed(null)}
                    className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-colors"
                >
                    Reload tool
                </button>
            </div>
        );
    }

    return (
        <iframe
            ref={frameRef}
            title={toolTitle ?? toolId}
            src={`/sandbox.html?tool=${encodeURIComponent(toolId)}`}
            sandbox="allow-scripts allow-downloads"
            className={`w-full border-0 ${className}`}
            style={{ height, background: '#09090b' }}
            loading="lazy"
            onError={() => {
                logToolFailure(toolId, new Error('Sandbox frame failed to load'), { kind: 'sandbox-frame' });
                setFailed('load');
            }}
        />
    );
};
