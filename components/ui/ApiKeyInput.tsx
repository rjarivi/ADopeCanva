
import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Key, Lock, AlertTriangle } from 'lucide-react';

interface ApiKeyInputProps {
    serviceName: string;
    localStorageKey: string;
    onKeyChange: (key: string) => void;
    placeholder?: string;
    description?: string;
}

export const ApiKeyInput: React.FC<ApiKeyInputProps> = ({
    serviceName,
    localStorageKey,
    onKeyChange,
    placeholder = "Enter your API key",
    description
}) => {
    const [key, setKey] = useState('');
    const [isVisible, setIsVisible] = useState(false);
    const [showWarning, setShowWarning] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem(localStorageKey);
        if (stored) {
            setKey(stored);
            onKeyChange(stored);
        }
    }, [localStorageKey, onKeyChange]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = e.target.value;
        setKey(newVal);
        onKeyChange(newVal);
        localStorage.setItem(localStorageKey, newVal);
    };

    return (
        <div className="space-y-3 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/80">
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                    <Key size={14} className="text-yellow-500" />
                    {serviceName} API Key
                </label>
                <button
                    onClick={() => setShowWarning(!showWarning)}
                    className="text-xs text-zinc-500 hover:text-zinc-300 flex items-center gap-1 transition-colors"
                >
                    <Lock size={10} /> Security Info
                </button>
            </div>

            {showWarning && (
                <div className="text-xs text-yellow-500/90 bg-yellow-500/10 p-3 rounded-lg border border-yellow-500/20 flex gap-2 items-start animate-fade-in">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <p>
                        Your API key is stored locally in your browser's LocalStorage and is never sent to our servers.
                        It is sent directly from your browser to the {serviceName} API provider.
                    </p>
                </div>
            )}

            {description && <p className="text-xs text-zinc-500">{description}</p>}

            <div className="relative group">
                <input
                    type={isVisible ? "text" : "password"}
                    value={key}
                    onChange={handleChange}
                    placeholder={placeholder}
                    className="w-full bg-black/40 border border-zinc-700 text-zinc-200 text-sm rounded-lg pl-10 pr-10 py-2.5 outline-none focus:border-yellow-500/50 focus:ring-1 focus:ring-yellow-500/50 transition-all font-mono"
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600">
                    <Key size={14} />
                </div>
                <button
                    onClick={() => setIsVisible(!isVisible)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                    {isVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
            </div>
        </div>
    );
};
