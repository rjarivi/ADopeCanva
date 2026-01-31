declare module 'qrious' {
    interface QRiousOptions {
        element?: HTMLCanvasElement;
        value?: string;
        size?: number;
        background?: string;
        foreground?: string;
        level?: 'L' | 'M' | 'Q' | 'H';
        mime?: string;
        padding?: number | null;
        backgroundAlpha?: number;
        foregroundAlpha?: number;
    }

    class QRious {
        constructor(options?: QRiousOptions);
        set(options: Partial<QRiousOptions>): void;
        toDataURL(mime?: string): string;
    }

    export = QRious;
}
