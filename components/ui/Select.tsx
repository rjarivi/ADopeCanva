import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface SelectOption<T extends string | number = string> {
    value: T;
    label: string;
    description?: string;
    icon?: React.ElementType;
    disabled?: boolean;
}

export interface SelectProps<T extends string | number = string> {
    value: T;
    onChange: (value: T) => void;
    options: (SelectOption<T> | string)[];
    className?: string;
    menuClassName?: string;
    placeholder?: string;
    disabled?: boolean;
    size?: 'sm' | 'md';
    title?: string;
}

export function Select<T extends string | number = string>({
    value,
    onChange,
    options,
    className = '',
    menuClassName = '',
    placeholder = 'Select option',
    disabled = false,
    size = 'md',
    title
}: SelectProps<T>) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    // Normalize options
    const normalizedOptions: SelectOption<T>[] = options.map(opt => {
        if (typeof opt === 'string' || typeof opt === 'number') {
            return { value: opt as unknown as T, label: String(opt) };
        }
        return opt;
    });

    const selectedOption = normalizedOptions.find(opt => opt.value === value);

    const close = useCallback(() => setIsOpen(false), []);

    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = (event: MouseEvent | TouchEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                close();
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                close();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, close]);

    const sizeClasses = size === 'sm'
        ? 'px-2.5 py-1.5 text-xs rounded-lg'
        : 'px-3.5 py-2.5 text-xs rounded-xl';

    return (
        <div className="relative w-full" ref={containerRef}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
                title={title}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                className={`w-full flex items-center justify-between gap-2 bg-zinc-900 border border-zinc-800 text-zinc-200 transition-all focus:outline-none focus:ring-1 focus:ring-indigo-500/50 hover:border-zinc-700 active:border-indigo-500/50 disabled:opacity-50 disabled:cursor-not-allowed ${sizeClasses} ${isOpen ? 'border-indigo-500/50 ring-1 ring-indigo-500/30' : ''} ${className}`}
            >
                <div className="flex items-center gap-2 truncate min-w-0">
                    {selectedOption?.icon && (
                        <selectedOption.icon size={14} className="text-zinc-400 shrink-0" />
                    )}
                    <span className="truncate font-medium">
                        {selectedOption ? selectedOption.label : placeholder}
                    </span>
                </div>
                <ChevronDown
                    size={14}
                    className={`text-zinc-400 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-indigo-400' : ''}`}
                />
            </button>

            {isOpen && (
                <div
                    ref={menuRef}
                    role="listbox"
                    className={`absolute left-0 right-0 z-50 mt-1.5 bg-zinc-900/98 backdrop-blur-md border border-zinc-800 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 ${menuClassName}`}
                >
                    <div className="max-h-60 overflow-y-auto custom-scrollbar p-1 space-y-0.5">
                        {normalizedOptions.map((option) => {
                            const isSelected = option.value === value;
                            const Icon = option.icon;

                            return (
                                <button
                                    key={String(option.value)}
                                    type="button"
                                    role="option"
                                    aria-selected={isSelected}
                                    disabled={option.disabled}
                                    onClick={() => {
                                        if (option.disabled) return;
                                        onChange(option.value);
                                        close();
                                    }}
                                    className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-xs rounded-lg transition-all text-left disabled:opacity-40 disabled:cursor-not-allowed ${
                                        isSelected
                                            ? 'bg-indigo-500/15 text-indigo-300 font-semibold border border-indigo-500/30'
                                            : 'text-zinc-300 hover:bg-zinc-800/80 hover:text-white'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 truncate min-w-0">
                                        {Icon && <Icon size={14} className="text-zinc-400 shrink-0" />}
                                        <div className="truncate">
                                            <div className="truncate">{option.label}</div>
                                            {option.description && (
                                                <div className="text-[10px] text-zinc-500 font-normal truncate mt-0.5">
                                                    {option.description}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {isSelected && (
                                        <Check size={14} className="text-indigo-400 shrink-0 ml-1.5" />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

export default Select;
