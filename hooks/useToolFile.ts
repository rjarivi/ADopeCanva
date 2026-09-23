import { useState, useCallback, useEffect, useRef } from 'react';
import type { FileData } from '../types';

function revoke(fd: FileData | undefined): void {
    if (fd?.previewUrl?.startsWith('blob:')) {
        URL.revokeObjectURL(fd.previewUrl);
    }
}

/**
 * Managed file state for tools. Revokes stale object URLs on replace /
 * clear / unmount — the leak class the tool audit kept finding.
 */
export function useToolFile(opts?: { multiple?: boolean }) {
    const multiple = opts?.multiple ?? false;
    const [files, setFiles] = useState<FileData[]>([]);
    const filesRef = useRef<FileData[]>([]);
    filesRef.current = files;

    useEffect(() => {
        return () => { filesRef.current.forEach(revoke); };
    }, []);

    const select = useCallback((input: FileData | FileData[]) => {
        const next = (Array.isArray(input) ? input : [input]).slice(0, multiple ? undefined : 1);
        setFiles((prev) => {
            prev.forEach(revoke);
            return next;
        });
    }, [multiple]);

    const clear = useCallback(() => {
        setFiles((prev) => { prev.forEach(revoke); return []; });
    }, []);

    return { files, file: files[0] ?? null, select, clear };
}
