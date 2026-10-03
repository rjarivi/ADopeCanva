import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Object-URL state that cannot leak. Setting a new URL revokes the previous
 * one; unmount revokes whatever remains. Replaces the hand-rolled
 * `if (url) revoke; setUrl(...)` pattern the audit kept finding broken
 * (overwrites without revoke, resets without revoke, no unmount cleanup).
 *
 * Note: explicit revokeObjectURL on an already-revoked URL is a safe no-op,
 * so call sites that also revoke manually stay correct — but prefer letting
 * this hook own the lifecycle and drop the manual calls.
 */
export function useObjectUrlState(initial: string | null = null): [string | null, (next: string | null) => void] {
    const [url, setUrlState] = useState<string | null>(initial);
    const ref = useRef<string | null>(initial);
    ref.current = url;

    const set = useCallback((next: string | null) => {
        const prev = ref.current;
        if (prev && prev !== next) {
            try { URL.revokeObjectURL(prev); } catch { /* ignore */ }
        }
        ref.current = next;
        setUrlState(next);
    }, []);

    useEffect(() => {
        return () => {
            if (ref.current) {
                try { URL.revokeObjectURL(ref.current); } catch { /* ignore */ }
            }
            ref.current = null;
        };
    }, []);

    return [url, set];
}
