/**
 * Tool health telemetry — the "worker that checks tools before users report them".
 *
 * - `logToolFailure(toolId, error, context)` persists every tool crash /
 *   processing failure to localStorage (capped at 200 entries) and mirrors
 *   it to GA4 (`tool_failure` event) + console so failures are visible in
 *   production analytics.
 * - `views/ToolHealth.tsx` (route `/health`) renders the stored log for
 *   admins, with export/clear and a self-test checklist.
 * - `scripts/audit-tools.mjs` (`npm run audit:tools`) runs the static
 *   build-time audit that catches worker mismatches, crossOrigin loops,
 *   and unhandled-error patterns before deploy.
 */

export interface ToolFailure {
    id: string;
    toolId: string;
    message: string;
    stack?: string;
    context?: Record<string, unknown>;
    url: string;
    userAgent: string;
    timestamp: string;
}

const STORAGE_KEY = 'adopecanva_tool_health';
const MAX_ENTRIES = 200;

function readAll(): ToolFailure[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function writeAll(entries: ToolFailure[]): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
    } catch {
        /* storage full / private mode — failures still go to console + GA */
    }
}

export function logToolFailure(
    toolId: string,
    error: unknown,
    context?: Record<string, unknown>,
): ToolFailure {
    const err = error as { message?: string; stack?: string } | null;
    const message =
        (typeof error === 'string' && error) ||
        err?.message ||
        'Unknown error';
    const entry: ToolFailure = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        toolId,
        message: String(message).slice(0, 500),
        stack: typeof err?.stack === 'string' ? err.stack.slice(0, 2000) : undefined,
        context,
        url: typeof window !== 'undefined' ? window.location.href : '',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
        timestamp: new Date().toISOString(),
    };
    try {
        const all = readAll();
        all.push(entry);
        writeAll(all);
    } catch {
        /* ignore */
    }
    // Always mirror to console so production logs stay useful.
    console.error(`[tool-health:${toolId}]`, message, context ?? '', error ?? '');
    // Mirror to GA4 when available — this is what lets us see failures
    // before users report them.
    try {
        const gtag = (window as { gtag?: (...args: unknown[]) => void }).gtag;
        if (typeof gtag === 'function') {
            gtag('event', 'tool_failure', {
                tool_id: toolId,
                error_message: entry.message,
                page_location: entry.url,
            });
        }
    } catch {
        /* ignore */
    }
    return entry;
}

export function getToolFailures(): ToolFailure[] {
    try {
        return readAll().slice().reverse(); // newest first
    } catch {
        return [];
    }
}

export function getFailureSummary(): { toolId: string; count: number; last: string }[] {
    const map = new Map<string, { count: number; last: string }>();
    for (const f of readAll()) {
        const cur = map.get(f.toolId) ?? { count: 0, last: f.timestamp };
        cur.count += 1;
        if (f.timestamp > cur.last) cur.last = f.timestamp;
        map.set(f.toolId, cur);
    }
    return [...map.entries()]
        .map(([toolId, v]) => ({ toolId, ...v }))
        .sort((a, b) => b.count - a.count);
}

export function clearToolFailures(): void {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {
        /* ignore */
    }
}

/** Global safety net: capture unhandled rejections and route them to the log. */
let globalHookInstalled = false;
export function installGlobalFailureHook(): void {
    if (globalHookInstalled || typeof window === 'undefined') return;
    globalHookInstalled = true;
    window.addEventListener('unhandledrejection', (event) => {
        const reason = (event as PromiseRejectionEvent).reason;
        logToolFailure('global', reason, { kind: 'unhandledrejection' });
    });
    window.addEventListener('error', (event) => {
        const err = (event as ErrorEvent).error ?? (event as ErrorEvent).message;
        // Skip resource 404 noise (favicons, dead avatars) — those are
        // handled per-component; only log script errors.
        const target = event.target as HTMLElement | null;
        if (target && target !== window && 'tagName' in target) return;
        logToolFailure('global', err, { kind: 'window-error' });
    }, true);
}
