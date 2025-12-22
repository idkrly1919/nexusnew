import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import ChatView from '../components/ChatView';
import ExplorePage from './ExplorePage';
import GalleryPage from './GalleryPage';

const MainApp: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    
    // Determine active tab based on route
    const getActiveTab = () => {
        if (location.pathname.startsWith('/chat')) return 'chats';
        if (location.pathname === '/explore') return 'explore';
        if (location.pathname === '/gallery') return 'gallery';
        return 'chats';
    };

    const [activeTab, setActiveTab] = useState<'chats' | 'explore' | 'gallery'>(getActiveTab());

    // Sync tab state with URL changes (back/forward navigation)
    useEffect(() => {
        setActiveTab(getActiveTab());
    }, [location.pathname]);

    const handleTabChange = (tab: 'chats' | 'explore' | 'gallery') => {
        setActiveTab(tab);
        if (tab === 'chats') navigate('/chat');
        else if (tab === 'explore') navigate('/explore');
        else if (tab === 'gallery') navigate('/gallery');
    };

    return (
        <div className="h-screen flex flex-col bg-[var(--copilot-color-background)]">
            {/* Main Content */}
            <div className="flex-1 overflow-hidden">
                {activeTab === 'chats' && <ChatView />}
                {activeTab === 'explore' && <ExplorePage />}
                {activeTab === 'gallery' && <GalleryPage />}
            </div>

            {/* Bottom Navigation (Copilot Mobile Style) */}
            <nav className="flex-shrink-0 bg-white border-t border-[var(--copilot-color-border)] px-4 py-2 safe-area-bottom">
                <div className="flex justify-around items-center max-w-md mx-auto">
                    <button
                        onClick={() => handleTabChange('chats')}
                        className={`flex flex-col items-center px-4 py-2 transition-colors ${
                            activeTab === 'chats'
                                ? 'text-[var(--copilot-color-primary)]'
                                : 'text-[var(--copilot-color-on-surface-secondary)]'
                        }`}
                    >
                        <svg className="w-6 h-6 mb-1" fill={activeTab === 'chats' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'chats' ? 0 : 2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span className="text-xs font-medium">Chats</span>
                    </button>

                    <button
                        onClick={() => handleTabChange('explore')}
                        className={`flex flex-col items-center px-4 py-2 transition-colors ${
                            activeTab === 'explore'
                                ? 'text-[var(--copilot-color-primary)]'
                                : 'text-[var(--copilot-color-on-surface-secondary)]'
                        }`}
                    >
                        <svg className="w-6 h-6 mb-1" fill={activeTab === 'explore' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'explore' ? 0 : 2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <span className="text-xs font-medium">Explore</span>
                    </button>

                    <button
                        onClick={() => handleTabChange('gallery')}
                        className={`flex flex-col items-center px-4 py-2 transition-colors ${
                            activeTab === 'gallery'
                                ? 'text-[var(--copilot-color-primary)]'
                                : 'text-[var(--copilot-color-on-surface-secondary)]'
                        }`}
                    >
                        <svg className="w-6 h-6 mb-1" fill={activeTab === 'gallery' ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={activeTab === 'gallery' ? 0 : 2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-xs font-medium">Gallery</span>
                    </button>
                </div>
            </nav>
        </div>
    );
};

export default MainApp;
