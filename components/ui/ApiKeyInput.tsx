
import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Key, Lock, AlertTriangle, CheckSquare, Square, ChevronDown, Settings } from 'lucide-react';

interface ApiKeyInputProps {
    serviceName: string;
    localStorageKey: string;
    onKeyChange: (key: string) => void;
    placeholder?: string;
    description?: string;
    compact?: boolean;
    models?: { id: string; name: string }[];
    selectedModel?: string;
    onModelChange?: (model: string) => void;
}

export const ApiKeyInput: React.FC<ApiKeyInputProps> = ({
    serviceName,
    localStorageKey,
    onKeyChange,
    placeholder = "Enter your API key",
    description,
    compact = false,
    models,
    selectedModel,
    onModelChange
}) => {
    const [key, setKey] = useState('');
    const [isVisible, setIsVisible] = useState(false);
    const [persist, setPersist] = useState(false);
    const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);

    // Initial Load: Check Session first, then Local
    useEffect(() => {
        const sessionKey = sessionStorage.getItem(localStorageKey);
        const localKey = localStorage.getItem(localStorageKey);

        if (sessionKey) {
            setKey(sessionKey);
            onKeyChange(sessionKey);
            setPersist(false);
        } else if (localKey) {
            setKey(localKey);
            onKeyChange(localKey);
            setPersist(true);
        }
    }, [localStorageKey, onKeyChange]);

    const handleKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newVal = e.target.value;
        setKey(newVal);
        onKeyChange(newVal);
        updateStorage(newVal, persist);
    };

    const togglePersist = () => {
        const newPersist = !persist;
        setPersist(newPersist);
        updateStorage(key, newPersist);
    };

    const updateStorage = (val: string, isPersistent: boolean) => {
        if (isPersistent) {
            localStorage.setItem(localStorageKey, val);
            sessionStorage.setItem(localStorageKey, val);
        } else {
            localStorage.removeItem(localStorageKey);
            sessionStorage.setItem(localStorageKey, val);
        }
    };

    if (compact) {
        return (
            <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-wider text-zinc-500 flex items-center gap-2">
                        {serviceName} KEY
                    </label>
                    <button
                        onClick={togglePersist}
                        className={`text-[9px] font-bold uppercase tracking-tighter flex items-center gap-1.5 px-2 py-1 rounded-md transition-all ${persist
                            ? 'text-indigo-400 bg-indigo-500/10 border border-indigo-500/20'
                            : 'text-zinc-600 hover:text-zinc-400 border border-transparent'
                            }`}
                    >
                        {persist ? <CheckSquare size={10} /> : <Square size={10} />}
                        Remember
                    </button>
                </div>

                <div className="relative group">
                    <input
                        type={isVisible ? "text" : "password"}
                        value={key}
                        onChange={handleKeyChange}
                        placeholder={placeholder}
                        className="w-full bg-zinc-950/50 border border-zinc-800 text-zinc-200 text-xs rounded-xl pl-9 pr-9 py-2 outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/20 transition-all font-mono placeholder:text-zinc-800"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-700">
                        <Key size={12} />
                    </div>
                    <button
                        onClick={() => setIsVisible(!isVisible)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-700 hover:text-zinc-400 transition-colors"
                    >
                        {isVisible ? <EyeOff size={12} /> : <Eye size={12} />}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-3 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/80">
            <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-zinc-300 flex items-center gap-2 whitespace-nowrap">
                        <Key size={14} className="text-yellow-500 shrink-0" />
                        {serviceName} API Key
                    </label>

                    {models && models.length > 0 && selectedModel && onModelChange && (
                        <div className="relative z-30">
                            <button
                                onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                                className={`p-1.5 rounded-lg border transition-all ${isModelDropdownOpen ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-transparent border-transparent text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 hover:border-zinc-700/50'}`}
                                title="AI Model Selection"
                            >
                                <Settings size={14} className={`transition-transform duration-500 ${isModelDropdownOpen ? 'rotate-90' : ''}`} />
                            </button>

                            {isModelDropdownOpen && (
                                <div className="absolute top-full right-0 mt-2 w-64 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2">
                                    <div className="px-3 py-2 border-b border-zinc-800 bg-zinc-800/20">
                                        <span className="text-[10px] uppercase font-black text-zinc-500 tracking-widest">Select Model</span>
                                    </div>
                                    <div className="max-h-60 overflow-y-auto custom-scrollbar p-1 flex flex-col gap-1">
                                        {models.map(m => (
                                            <button
                                                key={m.id}
                                                onClick={() => {
                                                    onModelChange(m.id);
                                                    setIsModelDropdownOpen(false);
                                                }}
                                                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all flex items-center gap-2 ${selectedModel === m.id ? 'bg-indigo-500/10 text-indigo-400 font-bold' : 'text-zinc-300 hover:bg-zinc-800'}`}
                                            >
                                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${selectedModel === m.id ? 'bg-indigo-400' : 'bg-transparent border-zinc-700 border'}`} />
                                                <span className="truncate">{m.name}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={togglePersist}
                        className={`text-xs flex items-center gap-1.5 transition-colors whitespace-nowrap ${persist
                            ? 'text-indigo-400'
                            : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                        title={persist ? "Key saved mostly securely in LocalStorage" : "Key clears when tab closes"}
                    >
                        {persist ? <CheckSquare size={13} className="shrink-0" /> : <Square size={13} className="shrink-0" />}
                        Keep me signed in
                    </button>
                    {persist && (
                        <span className="text-[10px] text-zinc-600 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 shrink-0">Local</span>
                    )}
                </div>

                {description && <p className="text-xs text-zinc-500 pt-1">{description}</p>}
            </div>

            <div className="relative group">
                <input
                    type={isVisible ? "text" : "password"}
                    value={key}
                    onChange={handleKeyChange}
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

            {/* Contextual Security Note */}
            {!persist && key.length > 0 && (
                <div className="flex items-center gap-2 text-[10px] text-green-500/80 mt-1 animate-fade-in pl-1">
                    <Lock size={10} />
                    <span>Secure Mode: Key will be cleared when you close this tab.</span>
                </div>
            )}
            {persist && key.length > 0 && (
                <div className="flex items-center gap-2 text-[10px] text-yellow-600/80 mt-1 animate-fade-in pl-1">
                    <AlertTriangle size={10} />
                    <span>Convenience Mode: Key is stored in browser storage.</span>
                </div>
            )}
        </div>
    );
};
