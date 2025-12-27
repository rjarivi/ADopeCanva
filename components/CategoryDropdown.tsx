import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { ToolCategory } from '../types';

interface CategoryOption {
    id: string;
    label: string;
}

interface CategoryDropdownProps {
    activeCategory: string; // The ID of the active category
    onCategoryChange: (id: string) => void;
    categories: (string | CategoryOption)[];
    direction?: 'up' | 'down';
}

export const CategoryDropdown: React.FC<CategoryDropdownProps> = ({
    activeCategory,
    onCategoryChange,
    categories,
    direction = 'up'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const options = categories.map(cat =>
        typeof cat === 'string' ? { id: cat, label: cat } : cat
    );

    const activeLabel = options.find(c => c.id === activeCategory)?.label || activeCategory;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-100 text-sm font-medium hover:bg-zinc-800 transition-colors shadow-lg min-w-[120px] justify-between"
            >
                <span className="truncate mr-2">{activeLabel}</span>
                <ChevronDown size={16} className={`shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className={`absolute ${direction === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'} right-0 w-56 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-${direction === 'up' ? 'bottom' : 'top'}-2 duration-200`}>
                    <div className="py-1 max-h-64 overflow-y-auto no-scrollbar">
                        {options.map((cat) => (
                            <button
                                key={cat.id}
                                onClick={() => {
                                    onCategoryChange(cat.id);
                                    setIsOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-4 py-2.5 text-sm text-left transition-colors ${activeCategory === cat.id
                                    ? 'bg-primary/10 text-primary font-semibold'
                                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                                    }`}
                            >
                                <span>{cat.label}</span>
                                {activeCategory === cat.id && <Check size={14} />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};
