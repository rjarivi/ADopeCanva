import React, { useEffect, useState } from 'react';

interface ToolLoaderProps {
    isLoading: boolean;
}

export const ToolLoader: React.FC<ToolLoaderProps> = ({ isLoading }) => {
    const [visible, setVisible] = useState(isLoading);
    const [opacity, setOpacity] = useState(isLoading ? 1 : 0);

    useEffect(() => {
        if (isLoading) {
            setVisible(true);
            setOpacity(1);
        } else {
            // Fade out
            setOpacity(0);
            const t = setTimeout(() => setVisible(false), 350);
            return () => clearTimeout(t);
        }
    }, [isLoading]);

    if (!visible) return null;

    return (
        <div
            aria-hidden="true"
            style={{
                position: 'absolute',
                inset: 0,
                zIndex: 50,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#09090b',
                opacity,
                transition: 'opacity 350ms ease',
                pointerEvents: isLoading ? 'all' : 'none',
            }}
        >
            {/* Indigo glow blob */}
            <div style={{
                position: 'absolute',
                width: 320,
                height: 320,
                borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(79,70,229,0.18) 0%, transparent 70%)',
                filter: 'blur(40px)',
                animation: 'pulse 2s ease-in-out infinite',
            }} />

            {/* Logo + spinner */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {/* Spinner ring */}
                <svg
                    width={72}
                    height={72}
                    viewBox="0 0 72 72"
                    fill="none"
                    style={{ position: 'absolute', animation: 'spin 1.1s linear infinite' }}
                >
                    <circle cx={36} cy={36} r={32} stroke="rgba(79,70,229,0.15)" strokeWidth={3} />
                    <path
                        d="M36 4 A32 32 0 0 1 68 36"
                        stroke="rgba(79,70,229,0.8)"
                        strokeWidth={3}
                        strokeLinecap="round"
                    />
                </svg>

                {/* Logo */}
                <img
                    src="/adopecanva.svg"
                    alt="Loading…"
                    style={{
                        width: 40,
                        height: 40,
                        borderRadius: 12,
                        filter: 'drop-shadow(0 4px 16px rgba(79,70,229,0.5))',
                    }}
                />
            </div>

            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes pulse {
                    0%, 100% { transform: scale(1); opacity: 0.7; }
                    50% { transform: scale(1.15); opacity: 1; }
                }
            `}</style>
        </div>
    );
};
