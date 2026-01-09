
import React, { useState, useEffect } from 'react';
import { Eye, EyeOff, Key, Lock, AlertTriangle, CheckSquare, Square } from 'lucide-react';

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
    const [persist, setPersist] = useState(false);

    // Initial Load: Check Session first, then Local
    useEffect(() => {
        const sessionKey = sessionStorage.getItem(localStorageKey);
        const localKey = localStorage.getItem(localStorageKey);

        if (sessionKey) {
            setKey(sessionKey);
            onKeyChange(sessionKey);
            setPersist(false); // It was in session, so not persisted effectively? Or user didn't want it?
        } else if (localKey) {
            setKey(localKey);
            onKeyChange(localKey);
            setPersist(true); // Found in local, so user opted in previously
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
            sessionStorage.setItem(localStorageKey, val); // Sync to session just in case
        } else {
            localStorage.removeItem(localStorageKey);
            sessionStorage.setItem(localStorageKey, val);
        }
    };

    return (
        <div className="space-y-3 bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/80">
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-zinc-300 flex items-center gap-2">
                    <Key size={14} className="text-yellow-500" />
                    {serviceName} API Key
                </label>
                <div className="flex items-center gap-2">
                    <button
                        onClick={togglePersist}
                        className={`text-xs flex items-center gap-1.5 px-2 py-1 rounded transition-colors ${persist
                                ? 'text-indigo-400 bg-indigo-500/10 border border-indigo-500/20'
                                : 'text-zinc-500 hover:text-zinc-300'
                            }`}
                        title={persist ? "Key saved mostly securely in LocalStorage" : "Key clears when tab closes"}
                    >
                        {persist ? <CheckSquare size={12} /> : <Square size={12} />}
                        Keep me signed in
                    </button>
                    {persist && (
                        <span className="text-[10px] text-zinc-600 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800 ml-1">Local</span>
                    )}
                </div>
            </div>

            {description && <p className="text-xs text-zinc-500">{description}</p>}

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
