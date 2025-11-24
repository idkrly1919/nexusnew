import React, { useState } from 'react';
import { SessionProvider, useSession } from './src/contexts/SessionContext';
import ChatView from './components/ChatView';
import LoginPage from './src/pages/Login';
import LandingPage from './components/LandingPage';

const AppContent: React.FC = () => {
    const { session, isLoading } = useSession();
    const [showLogin, setShowLogin] = useState(false);

    if (isLoading) {
        return (
            <div className="fixed inset-0 bg-[#111014] flex items-center justify-center">
                <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            </div>
        );
    }

    return (
        <>
            {/* New Liquid Background */}
            <div className="liquid-bg">
                <div className="blob bg-purple-600 top-[-20%] left-[-10%] w-[50vw] h-[50vw] animate-move-blob-1"></div>
                <div className="blob bg-indigo-600 bottom-[-20%] right-[-10%] w-[45vw] h-[45vw] animate-move-blob-2"></div>
                <div className="blob bg-pink-600 bottom-[15%] left-[10%] w-[35vw] h-[35vw] animate-move-blob-3"></div>
            </div>

            {session ? (
                <ChatView />
            ) : showLogin ? (
                <LoginPage />
            ) : (
                <LandingPage onGetAccess={() => setShowLogin(true)} />
            )}
        </>
    );
};

const App: React.FC = () => {
    return (
        <SessionProvider>
            <AppContent />
        </SessionProvider>
    );
};

export default App;