import React, { useState } from 'react';
import { MobileNavbar } from './MobileNavbar';
import { CategoryDropdown } from './CategoryDropdown';
import { ToolCategory } from '../types';
import { Dashboard } from '../views/Dashboard';
import { Search, X, Command } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

interface MobileLayoutProps {
    children: React.ReactNode;
    activeCategory: string;
    setActiveCategory: (cat: string) => void;
}

export const MobileLayout: React.FC<MobileLayoutProps> = ({
    children,
    activeCategory,
    setActiveCategory
}) => {
    const [activeTab, setActiveTab] = useState<'home' | 'search' | 'media'>('home');
    const navigate = useNavigate();
    const location = useLocation();

    const categories = ['All', ...Object.values(ToolCategory)];
    const isDashboard = location.pathname === '/';

    const handleTabChange = (tab: 'home' | 'search' | 'media') => {
        setActiveTab(tab);
        if (tab === 'home') {
            setActiveCategory('All');
            navigate('/');
        } else if (tab === 'media') {
            setActiveCategory('Media');
            navigate('/');
        } else if (tab === 'search') {
            navigate('/');
            // Small delay to ensure we are on dashboard and element is rendered
            setTimeout(() => {
                const searchInput = document.getElementById('mobile-tool-search');
                if (searchInput) {
                    searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    searchInput.focus();
                }
            }, 100);
        }
    };

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-background">
            {/* Small Mobile Header */}
            <header className="h-16 border-b border-zinc-800 flex items-center justify-center px-4 bg-background/95 backdrop-blur-md z-40 shrink-0">
                <div
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => navigate('/')}
                >
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/20">
                        <Command className="text-white" size={18} />
                    </div>
                    <span className="text-3xl font-bold text-white tracking-[0.1em] uppercase" style={{ fontFamily: '"Jersey 10", sans-serif' }}>
                        ADopeCanva
                    </span>
                </div>
            </header>

            {/* Main Scroll Area */}
            <main className="flex-1 overflow-y-auto pb-32 no-scrollbar">
                <div className="p-4">
                    {children}
                </div>
            </main>

            {/* Controls Layer (Floating above Navbar) */}
            {isDashboard && (
                <div className="fixed bottom-24 right-4 z-40">
                    <CategoryDropdown
                        activeCategory={activeCategory}
                        onCategoryChange={setActiveCategory}
                        categories={categories}
                    />
                </div>
            )}

            <MobileNavbar
                activeTab={activeTab}
                onTabChange={handleTabChange}
            />
        </div>
    );
};
