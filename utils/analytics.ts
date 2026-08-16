/**
 * Advanced Analytics & AI Referral Tracking Helper
 * Automatically detects and attributes traffic arriving from Generative AI engines:
 * (ChatGPT, Gemini, Perplexity, Claude, Copilot, Grok, Kimi, etc.) and UTM campaigns.
 */

declare global {
    interface Window {
        dataLayer: any[];
        gtag?: (...args: any[]) => void;
        clarity?: (...args: any[]) => void;
    }
}

export interface AITrafficSource {
    isAIReferral: boolean;
    aiEngine?: 'chatgpt' | 'perplexity' | 'claude' | 'gemini' | 'copilot' | 'grok' | 'kimi' | 'other_ai';
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;
}

/**
 * Detects AI search engines from query strings (e.g. utm_source=chatgpt.com) and document.referrer
 */
export function detectAITraffic(): AITrafficSource {
    if (typeof window === 'undefined') {
        return { isAIReferral: false };
    }

    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get('utm_source')?.toLowerCase();
    const utmMedium = params.get('utm_medium')?.toLowerCase();
    const utmCampaign = params.get('utm_campaign')?.toLowerCase();
    const referrer = document.referrer?.toLowerCase() || '';

    let aiEngine: AITrafficSource['aiEngine'] = undefined;

    if (utmSource?.includes('chatgpt') || referrer.includes('chatgpt.com') || referrer.includes('openai.com')) {
        aiEngine = 'chatgpt';
    } else if (utmSource?.includes('perplexity') || referrer.includes('perplexity.ai')) {
        aiEngine = 'perplexity';
    } else if (utmSource?.includes('claude') || referrer.includes('claude.ai') || referrer.includes('anthropic.com')) {
        aiEngine = 'claude';
    } else if (utmSource?.includes('gemini') || referrer.includes('gemini.google.com') || referrer.includes('bard.google.com')) {
        aiEngine = 'gemini';
    } else if (utmSource?.includes('copilot') || utmSource?.includes('bing') || referrer.includes('copilot.microsoft.com') || referrer.includes('bing.com/chat')) {
        aiEngine = 'copilot';
    } else if (utmSource?.includes('grok') || referrer.includes('grok.x.ai') || referrer.includes('x.ai')) {
        aiEngine = 'grok';
    } else if (utmSource?.includes('kimi') || referrer.includes('kimi.moonshot.cn')) {
        aiEngine = 'kimi';
    } else if (utmSource?.includes('ai') || utmMedium?.includes('ai') || referrer.includes('.ai/')) {
        aiEngine = 'other_ai';
    }

    const isAIReferral = Boolean(aiEngine || utmSource || utmMedium);

    return {
        isAIReferral,
        aiEngine,
        utmSource: utmSource || undefined,
        utmMedium: utmMedium || undefined,
        utmCampaign: utmCampaign || undefined
    };
}

/**
 * Tracks route change and logs dedicated AI referral events to GA4 and Clarity
 */
export function trackPageView(path: string, title: string) {
    if (typeof window === 'undefined') return;

    const aiData = detectAITraffic();

    // 1. Google Analytics 4 tracking
    if (typeof window.gtag === 'function') {
        window.gtag('event', 'page_view', {
            page_location: window.location.href,
            page_path: path,
            page_title: title,
            ...(aiData.aiEngine ? { ai_engine: aiData.aiEngine } : {}),
            ...(aiData.utmSource ? { utm_source: aiData.utmSource } : {}),
            ...(aiData.utmMedium ? { utm_medium: aiData.utmMedium } : {})
        });

        // Fire custom event if from AI engine
        if (aiData.aiEngine) {
            window.gtag('event', 'ai_search_visit', {
                ai_engine: aiData.aiEngine,
                landing_tool: path,
                referrer: document.referrer
            });
        }
    }

    // 2. Microsoft Clarity custom tagging
    if (typeof window.clarity === 'function' && aiData.aiEngine) {
        window.clarity('set', 'ai_referrer', aiData.aiEngine);
    }
}

/**
 * Tracks when a user completes a tool conversion (e.g. converted image/video)
 */
export function trackToolUsage(toolId: string, actionType: string = 'convert') {
    if (typeof window === 'undefined') return;
    const aiData = detectAITraffic();

    if (typeof window.gtag === 'function') {
        window.gtag('event', 'tool_usage', {
            tool_id: toolId,
            action_type: actionType,
            is_ai_user: aiData.isAIReferral,
            ...(aiData.aiEngine ? { ai_engine: aiData.aiEngine } : {})
        });
    }
}
