
import React, { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage';
import ChatView from './components/ChatView';

type View = 'landing' | 'chat';

const App: React.FC = () => {
    const [currentView, setCurrentView] = useState<View>('landing');
    const [isFading, setIsFading] = useState(false);

    const showChat = () => {
        setIsFading(true);
        document.body.classList.add('chat-active');
        setTimeout(() => {
            setCurrentView('chat');
            setIsFading(false);
        }, 500);
    };

    useEffect(() => {
        if (currentView === 'chat') {
            document.body.classList.add('chat-active');
        } else {
            document.body.classList.remove('chat-active');
        }
    }, [currentView]);

    return (
        <>
            {/* Shared Background Elements */}
            <div className="fixed inset-0 grid-bg z-0"></div>
            <div className="fixed top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 glow-bg"></div>
            <div className="fixed bottom-0 right-0 translate-x-1/3 translate-y-1/3 glow-bg bg-purple-900/20"></div>

            <div 
                className={`transition-opacity duration-500 ${isFading && currentView === 'landing' ? 'opacity-0' : 'opacity-100'}`}
            >
                {currentView === 'landing' && <LandingPage onGetAccess={showChat} />}
            </div>

            <div
                className={`transition-opacity duration-500 ${currentView === 'chat' && !isFading ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            >
                {currentView === 'chat' && <ChatView />}
            </div>
        </>
    );
};

export default App;
