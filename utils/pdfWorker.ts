/**
 * Shared PDF.js worker setup + error classification.
 *
 * Root cause of the "Could not open PDF" outage: the bundled
 * `public/pdf.worker.min.mjs` drifted out of sync with the installed
 * `pdfjs-dist` version. PDF.js requires an exact worker/library match —
 * any mismatch surfaces as a generic open failure.
 *
 * All PDF tools must call `setupPdfWorker()` instead of hardcoding
 * `GlobalWorkerOptions.workerSrc` themselves.
 */
import * as pdfjsLib from 'pdfjs-dist';
import { logToolFailure } from './toolHealth';

let workerReady = false;

/** Configure the PDF.js worker once. Safe to call from every tool. */
export function setupPdfWorker(): void {
    if (workerReady) return;
    try {
        const version = (pdfjsLib as { version?: string }).version ?? '5.7.284';
        // Primary: locally bundled worker (privacy-first, no CDN).
        // Fallback is applied lazily in `getPdfDocument` if the local
        // worker 404s (e.g. non-root base path deployments).
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
        (pdfjsLib.GlobalWorkerOptions as { _adopeVersion?: string })._adopeVersion = version;
        workerReady = true;
    } catch (err) {
        console.error('[pdfWorker] setup failed:', err);
    }
}

/** Load a PDF document with local-worker-first + CDN fallback. */
export async function getPdfDocument(
    data: ArrayBuffer | Uint8Array,
    toolId: string,
): Promise<pdfjsLib.PDFDocumentProxy> {
    setupPdfWorker();
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    try {
        return await pdfjsLib.getDocument({ data: bytes.slice() }).promise;
    } catch (firstErr) {
        const msg = String((firstErr as Error)?.message ?? firstErr);
        // Worker 404 / setup failure typically mentions "worker" or
        // "Setting up fake worker" — retry once against a version-pinned CDN.
        if (/worker|fake worker|fetch|404/i.test(msg)) {
            try {
                const version =
                    (pdfjsLib as { version?: string }).version ?? '5.7.284';
                pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${version}/build/pdf.worker.min.mjs`;
                return await pdfjsLib.getDocument({ data: bytes.slice() }).promise;
            } catch (retryErr) {
                logToolFailure(toolId, retryErr, { stage: 'pdf-worker-cdn-fallback' });
                throw retryErr;
            }
        }
        throw firstErr;
    }
}

/** Quick sanity check before invoking PDF.js (bad extension, empty file, wrong magic bytes). */
export async function validatePdfFile(file: File): Promise<string | null> {
    if (!/\.pdf$/i.test(file.name) && file.type !== 'application/pdf') {
        return 'Please select a valid .pdf file.';
    }
    if (file.size === 0) return 'This file is empty (0 bytes).';
    if (file.size > 200 * 1024 * 1024) return 'This PDF is larger than 200 MB — try a smaller file.';
    try {
        const head = new Uint8Array(await file.slice(0, 5).arrayBuffer());
        const magic = String.fromCharCode(...head);
        if (magic !== '%PDF-') return 'This file does not look like a PDF (missing %PDF header).';
    } catch {
        /* ignore — let PDF.js decide */
    }
    return null;
}

/** Map raw PDF.js exceptions to actionable user-facing messages. */
export function classifyPdfError(err: unknown): string {
    const e = err as { name?: string; message?: string; code?: number };
    const name = e?.name ?? '';
    const message = e?.message ?? '';
    if (name === 'PasswordException' || /password|encrypted/i.test(message)) {
        return 'This PDF is password-protected or encrypted. Remove the password first, then try again.';
    }
    if (name === 'InvalidPDFException' || /invalid/i.test(message)) {
        return 'This file appears to be corrupted or is not a valid PDF.';
    }
    if (name === 'MissingPDFException' || /missing/i.test(message)) {
        return 'No PDF data was received. Please re-select the file and try again.';
    }
    if (/worker|fake worker/i.test(message)) {
        return 'PDF engine failed to start (worker mismatch). Please hard-refresh (Ctrl/Cmd+Shift+R) and try again.';
    }
    if (/memory|allocation|OOM/i.test(message)) {
        return 'This PDF is too large to process in your browser. Try a smaller file or fewer pages.';
    }
    return 'Could not open PDF — make sure it is a valid, unencrypted PDF file.';
}
