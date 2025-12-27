import React from 'react';
import { Home, Search, Library } from 'lucide-react';

interface MobileNavbarProps {
    activeTab: 'home' | 'search' | 'media';
    onTabChange: (tab: 'home' | 'search' | 'media') => void;
}

export const MobileNavbar: React.FC<MobileNavbarProps> = ({
    activeTab,
    onTabChange
}) => {
    return (
        <div className="fixed bottom-0 left-0 right-0 h-20 bg-zinc-900/90 backdrop-blur-xl border-t border-zinc-800 px-12 flex items-center justify-between z-50">
            {/* Home Link */}
            <button
                onClick={() => onTabChange('home')}
                className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'home' ? 'text-primary' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
            >
                <div className={`p-2 rounded-xl transition-all ${activeTab === 'home' ? 'bg-primary/10' : ''}`}>
                    <Home size={24} />
                </div>
                <span className="text-[10px] font-medium uppercase tracking-wider">Home</span>
            </button>

            {/* Circular Search Button */}
            <div className="absolute left-1/2 -translate-x-1/2 -top-6">
                <button
                    onClick={() => onTabChange('search')}
                    className={`w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-2xl shadow-primary/30 active:scale-95 transition-transform border-4 border-background ${activeTab === 'search' ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
                        }`}
                >
                    <Search className="text-white" size={28} />
                </button>
            </div>

            {/* Media Link */}
            <button
                onClick={() => onTabChange('media')}
                className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'media' ? 'text-primary' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
            >
                <div className={`p-2 rounded-xl transition-all ${activeTab === 'media' ? 'bg-primary/10' : ''}`}>
                    <Library size={24} />
                </div>
                <span className="text-[10px] font-medium uppercase tracking-wider">Media</span>
            </button>
        </div>
    );
};
