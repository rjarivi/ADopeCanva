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

        const data = await response.json();
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
        const response = await fetch(url);
        const data = await response.json();
        return data;
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
        return await response.json();
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
        return await response.json();
    } catch (e) {
        return { status: 'error', message: String(e) };
    }
};
