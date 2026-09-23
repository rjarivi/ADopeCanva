import React, { useCallback, useEffect } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';
import { useFocusedMode } from '../contexts/FocusedMode';

interface Props {
    /** Element that should fill the screen (the tool workspace wrapper). */
    targetRef: React.RefObject<HTMLElement | null>;
    className?: string;
    title?: string;
}

/**
 * Shared fullscreen toggle — rendered by ToolRenderer so EVERY tool gets it.
 *
 * Two layers (either can work alone):
 *  1. Focus mode (context) — hides site chrome (header, feedback, SEO
 *     sections, breadcrumbs) and stretches the tool to the full viewport.
 *  2. Native Fullscreen API — removes even the browser tab bar area for a
 *     true edge-to-edge workspace. Falls back gracefully to (1) when the
 *     browser denies it (e.g. inside an iframe without permissions).
 *
 * ESC exits native fullscreen automatically; the `fullscreenchange`
 * listener keeps the context in sync so the UI never gets stuck.
 */
export const ToolFullscreenButton: React.FC<Props> = ({ targetRef, className = '', title }) => {
    const { focused, setFocused } = useFocusedMode();

    // Keep context in sync when the user exits via ESC / browser UI.
    useEffect(() => {
        const onChange = () => {
            if (!document.fullscreenElement) setFocused(false);
        };
        document.addEventListener('fullscreenchange', onChange);
        return () => document.removeEventListener('fullscreenchange', onChange);
    }, [setFocused]);

    // Clean up if we unmount while fullscreen (route change).
    useEffect(() => {
        return () => {
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => { /* ignore */ });
            }
        };
    }, []);

    const toggle = useCallback(async () => {
        if (!focused) {
            setFocused(true);
            try {
                const el = targetRef.current;
                if (el && !document.fullscreenElement && document.fullscreenEnabled) {
                    await el.requestFullscreen();
                }
            } catch {
                /* native fullscreen denied — CSS focus mode still applies */
            }
        } else {
            try {
                if (document.fullscreenElement) await document.exitFullscreen();
            } catch {
                /* ignore */
            }
            setFocused(false);
        }
    }, [focused, setFocused, targetRef]);

    return (
        <button
            data-tool-fullscreen
            onClick={toggle}
            title={title ?? (focused ? 'Exit fullscreen (ESC)' : 'Fullscreen — hide site chrome (F)')}
            className={`flex items-center gap-1.5 text-zinc-500 hover:text-zinc-200 transition-colors ${className}`}
        >
            {focused ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            <span className="hidden sm:inline">{focused ? 'Exit' : 'Fullscreen'}</span>
        </button>
    );
};
