/**
 * AdopeCanva Studio — embedded HyperFrames Studio workspace.
 *
 * This entry mounts HyperFrames' official StudioApp (@hyperframes/studio)
 * inside its own document so its Tailwind/v4 stylesheet never collides with
 * the main app. The service worker routes `/api/projects/*` to this
 * document's in-browser project store (see utils/studio/embedServer.ts).
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '@hyperframes/studio/styles.css';
import './utils/studio/embedServer';
// StudioApp resolves its project from location.hash (#project/<id>)
import { StudioApp } from '@hyperframes/studio';

declare const __BUILD__: { commit: string };

const rootEl = document.getElementById('studio-embed-root')!;

// Wait for the service worker so the first studio fetches actually reach us
async function boot() {
    try {
        await navigator.serviceWorker.register('/studio-sw.js', { scope: '/' });
        await navigator.serviceWorker.ready;
    } catch (e) {
        console.warn('[StudioEmbed] SW registration failed; studio API calls will fail:', e);
    }

    // Project id must match embedServer's PROJECT_ID
    if (!location.hash || !location.hash.startsWith('#project/')) {
        history.replaceState(null, '', `${location.pathname}#project/adopecanva-studio`);
    }

    const root = createRoot(rootEl);
    root.render(
        <div style={{ width: '100%', height: '100vh', overflow: 'hidden' }}>
            <StudioApp />
        </div>,
    );
}

void boot();
