import React from 'react';
import { Minus, Plus } from 'lucide-react';

export const SectionLabel: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <label className="text-[10px] md:text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2 md:mb-3 block">
        {children}
    </label>
);

export const ColorPicker: React.FC<{
    activeColor: string,
    onChange: (color: string) => void,
    colors: { id: string, value: string, label: string }[],
    allowCustom?: boolean
}> = ({ activeColor, onChange, colors, allowCustom = true }) => (
    <div className="flex items-center justify-between bg-zinc-900/50 p-2 rounded-lg border border-zinc-900/50 hover:border-zinc-800 transition-colors">
        <div className="flex gap-2 flex-wrap">
            {colors.map((c) => (
                <button
                    key={c.id}
                    onClick={() => onChange(c.id)}
                    className={`w-6 h-6 rounded-full relative flex items-center justify-center transition-transform active:scale-95 hover:scale-110 ${activeColor === c.id ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-zinc-950' : ''
                        }`}
                    style={{
                        background: c.value === 'transparent'
                            ? 'conic-gradient(#333 0 25%, #222 0 50%, #333 0 75%, #222 0)'
                            : c.value,
                        backgroundSize: '8px 8px',
                        border: c.id === 'black' ? '1px solid #333' : 'none'
                    }}
                    title={c.label}
                >
                    {activeColor === c.id && (
                        <div className={`w-1.5 h-1.5 rounded-full ${['white', 'transparent'].includes(c.id) ? 'bg-black' : 'bg-white'}`} />
                    )}
                </button>
            ))}
        </div>

        {allowCustom && (
            <>
                <div className="h-6 w-px bg-zinc-800 mx-2"></div>
                <button className="flex items-center gap-2 text-xs text-zinc-400 hover:text-white transition-colors group">
                    <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-pink-500 via-purple-500 to-indigo-500 group-hover:opacity-80 transition-opacity" />
                </button>
            </>
        )}
    </div>
);

export const SliderControl: React.FC<{
    value: number,
    min: number,
    max: number,
    onChange: (val: number) => void,
    label: string,
    unit?: string
}> = ({ value, min, max, onChange, label, unit = '' }) => (
    <div className="group">
        <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-zinc-400">{label}</span>
            <span className="text-[10px] font-mono text-zinc-500 bg-zinc-900 px-1.5 py-0.5 rounded">{value}{unit}</span>
        </div>
        <div className="flex items-center gap-3">
            <button
                onClick={() => onChange(Math.max(min, value - 1))}
                className="text-zinc-600 hover:text-white transition-colors p-1 hover:bg-zinc-800 rounded touch-manipulation"
            >
                <Minus size={12} />
            </button>
            <div className="relative flex-1 h-6 flex items-center">
                <input
                    type="range"
                    min={min}
                    max={max}
                    value={value}
                    onChange={(e) => onChange(parseInt(e.target.value))}
                    className="w-full h-1 bg-zinc-800 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-zinc-400 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:transition-all [&::-webkit-slider-thumb]:active:scale-110 [&::-webkit-slider-thumb]:hover:bg-white"
                />
            </div>
            <button
                onClick={() => onChange(Math.min(max, value + 1))}
                className="text-zinc-600 hover:text-white transition-colors p-1 hover:bg-zinc-800 rounded touch-manipulation"
            >
                <Plus size={12} />
            </button>
        </div>
    </div>
);
