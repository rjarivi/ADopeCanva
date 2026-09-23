import React from 'react';
import { Home, Search, Library } from 'lucide-react';

interface MobileNavbarProps {
    activeTab: 'home' | 'search' | 'media';
    onTabChange: (tab: 'home' | 'search' | 'media') => void;
    hidden?: boolean;
}

export const MobileNavbar: React.FC<MobileNavbarProps> = ({
    activeTab,
    onTabChange,
    hidden = false
}) => {
    if (hidden) return null;
    return (
        <div className="fixed bottom-0 left-0 right-0 h-20 bg-zinc-900/90 backdrop-blur-xl border-t border-zinc-800 px-12 flex items-center justify-between z-50">
            {/* Home Link */}
            <button
                onClick={() => onTabChange('home')}
                className={`h-full flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'home' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
            >
                <div className="p-1.5 rounded-xl transition-all" style={activeTab === 'home' ? { background: 'rgba(79,70,229,0.15)' } : undefined}>
                    <Home size={22} />
                </div>
                <span className="text-[9px] font-medium uppercase tracking-wider transition-colors" style={activeTab === 'home' ? { color: 'rgba(79,70,229,0.9)' } : undefined}>Home</span>
            </button>

            {/* Circular Search Button */}
            <div className="absolute left-1/2 -translate-x-1/2 -top-6">
                <button
                    onClick={() => onTabChange('search')}
                    className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center active:scale-95 transition-all border-4 border-background"
                    style={{
                        background: 'linear-gradient(135deg, #3f3f46, #18181b)',
                        boxShadow: activeTab === 'search' ? '0 0 24px rgba(79,70,229,0.4)' : '0 8px 16px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.05)',
                        borderColor: activeTab === 'search' ? 'rgba(79,70,229,0.3)' : undefined
                    }}
                >
                    <Search className="text-white" size={26} />
                </button>
            </div>

            {/* Media Link */}
            <button
                onClick={() => onTabChange('media')}
                className={`h-full flex flex-col items-center justify-center gap-1 transition-colors ${activeTab === 'media' ? 'text-white' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
            >
                <div className="p-1.5 rounded-xl transition-all" style={activeTab === 'media' ? { background: 'rgba(79,70,229,0.15)' } : undefined}>
                    <Library size={22} />
                </div>
                <span className="text-[9px] font-medium uppercase tracking-wider transition-colors" style={activeTab === 'media' ? { color: 'rgba(79,70,229,0.9)' } : undefined}>Media</span>
            </button>
        </div>
    );
};
