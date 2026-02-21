export interface FeedbackApiResult {
    status: 'success' | 'error';
    message?: string;
    id?: string;
}

export const submitFeedback = async (
    type: 'feedback' | 'feature' | 'bug',
    message: string,
    email?: string
): Promise<FeedbackApiResult> => {
    const url = import.meta.env.VITE_FEEDBACK_API_URL;
    if (!url) {
        console.warn('VITE_FEEDBACK_API_URL not set. Falling back to simulation.');
        await new Promise(r => setTimeout(r, 1000));
        return { status: 'success' };
    }

    try {
        // We use 'no-cors' mode if simply fire-and-forget, but here we likely want response.
        // However, Apps Script redirects to a text/content response.
        // Standard fetch with POST stringifying body usually works with Apps Script if it handles options/CORS,
        // but Apps Script simple web apps often require specific handling.
        // The most robust way for simple text data is POST with text/plain to avoid preflight content-type checks if possible,
        // or just standard POST.

        // Note: 'no-cors' will result in an opaque response, giving us no JSON back.
        // But Google Apps Script redirects. 
        // A common pattern for GAS is using standard fetch, but the script must return correct CORS headers 
        // OR we accept opaque response if we don't care about the return value (fire & forget).
        // Since we want to know if it succeeded, we usually hope standard Fetch works (it follows redirects).

        const response = await fetch(url, {
            method: 'POST',
            // Using text/plain avoids preflight OPTIONS request in many browsers
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                action: 'submit_feedback',
                type,
                message,
                email,
                userAgent: navigator.userAgent
            })
        });

        let data: FeedbackApiResult;
        try {
            data = await response.json();
        } catch {
            // Fallback: parse text if json() fails (GAS redirect edge case)
            try {
                const text = await response.clone().text();
                data = JSON.parse(text);
            } catch {
                data = { status: 'success' };
            }
        }
        return data;
    } catch (e) {
        console.error('Feedback submission failed', e);
        return { status: 'error', message: String(e) };
    }
};

export const fetchFeatures = async (): Promise<any[]> => {
    const url = import.meta.env.VITE_FEEDBACK_API_URL;
    if (!url) return [];

    try {
        // Google Apps Script redirects GET requests; fetch follows automatically
        // but we parse text first for robustness
        const response = await fetch(url, { redirect: 'follow' });
        const text = await response.text();

        if (!text || text.trim().length === 0) return [];

        const data = JSON.parse(text);

        // Handle both direct array and wrapped object formats
        if (Array.isArray(data)) return data;
        if (data && Array.isArray(data.features)) return data.features;

        console.warn('fetchFeatures: unexpected response shape', data);
        return [];
    } catch (e) {
        console.error('Failed to fetch features', e);
        return [];
    }
};

export const submitFeature = async (title: string, description: string): Promise<FeedbackApiResult> => {
    const url = import.meta.env.VITE_FEEDBACK_API_URL;
    if (!url) return { status: 'success', id: Date.now().toString() }; // fallback

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                action: 'add_feature',
                title,
                description,
                userAgent: navigator.userAgent
            })
        });
        const text = await response.text();
        try { return JSON.parse(text); } catch { return { status: 'success' as const, id: undefined }; }
    } catch (e) {
        return { status: 'error', message: String(e) };
    }
};

export const voteFeature = async (id: string, delta: number): Promise<FeedbackApiResult> => {
    const url = import.meta.env.VITE_FEEDBACK_API_URL;
    if (!url) return { status: 'success' };

    try {
        // Fire and forget mostly, but we can wait
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify({
                action: 'vote',
                id,
                delta
            })
        });
        const text = await response.text();
        try { return JSON.parse(text); } catch { return { status: 'success' as const }; }
    } catch (e) {
        return { status: 'error', message: String(e) };
    }
};
