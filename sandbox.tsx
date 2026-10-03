/**
 * Phase 2 sandbox entry. Loaded as /sandbox.html?tool=<id> inside
 * <SandboxedToolFrame> with sandbox="allow-scripts allow-downloads"
 * (deliberately WITHOUT allow-same-origin → opaque origin).
 *
 * The tool component comes from the manifest registry (same lazy chunks as
 * the main app, but a separate bundle instance with no access to the parent).
 * Failures are reported to the parent via postMessage so they still land in
 * /health; localStorage/GA are unavailable here by design (calls are guarded
 * no-ops inside utils/toolHealth).
 */
import React, { Suspense, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { GENERATED_TOOLS } from './utils/toolRegistry.generated';
import { ToolErrorBoundary } from './components/ToolErrorBoundary';

function post(type: string, payload: Record<string, unknown> = {}): void {
    try {
        // Parent validates event.source + the adope-sandbox marker.
        window.parent.postMessage({ source: 'adope-sandbox', type, ...payload }, '*');
    } catch {
        /* parent gone — ignore */
    }
}

function SandboxApp(): React.ReactElement {
    const params = new URLSearchParams(window.location.search);
    const toolId = params.get('tool') ?? '';
    const tool = GENERATED_TOOLS.find((t) => t.id === toolId);

    useEffect(() => {
        post('tool:ready', { toolId });
        const onError = (event: ErrorEvent) => {
            post('tool:failure', { toolId, message: String(event.message || 'Unknown error').slice(0, 500) });
        };
        const onRejection = (event: PromiseRejectionEvent) => {
            const reason = event.reason as { message?: string } | null;
            post('tool:failure', {
                toolId,
                message: String((reason && reason.message) || reason || 'Unhandled rejection').slice(0, 500),
            });
        };
        window.addEventListener('error', onError);
        window.addEventListener('unhandledrejection', onRejection);

        // Report height so the parent sizes the frame (no scrollbars-in-scrollbars).
        const ro = new ResizeObserver(() => {
            const h = Math.max(480, document.documentElement.scrollHeight);
            post('tool:resize', { toolId, height: Math.min(h, window.screen.height * 3) });
        });
        ro.observe(document.documentElement);
        return () => {
            window.removeEventListener('error', onError);
            window.removeEventListener('unhandledrejection', onRejection);
            ro.disconnect();
        };
    }, [toolId]);

    if (!tool) {
        return (
            <div style={{ padding: 32, textAlign: 'center', color: '#71717a' }}>
                Unknown sandboxed tool: {toolId || '(none)'}
            </div>
        );
    }

    return (
        <Suspense fallback={
            <div style={{ padding: 48, textAlign: 'center', color: '#71717a' }}>Loading tool…</div>
        }>
            <ToolErrorBoundary toolId={tool.id} toolTitle={tool.title}>
                {tool.component}
            </ToolErrorBoundary>
        </Suspense>
    );
}

const root = document.getElementById('sandbox-root');
if (root) createRoot(root).render(<SandboxApp />);
