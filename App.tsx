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
            <div className="fixed inset-0 bg-[#18181b] flex items-center justify-center">
                <svg className="animate-spin h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
            </div>
        );
    }

    const isLandingPage = !session && !showLogin;

    return (
        <>
            {/* Shared Background Elements */}
            <div className="fixed inset-0 grid-bg z-0"></div>
            <div className="fixed top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 glow-bg"></div>
            <div className="fixed bottom-0 right-0 translate-x-1/3 translate-y-1/3 glow-bg bg-purple-900/20"></div>

            {/* Landing Page Specific Animations */}
            {isLandingPage && (
                <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                    <div className="relative w-full h-full">
                        <div className="absolute w-[400px] h-[400px] bg-blue-900/10 blur-[80px] rounded-full top-1/4 left-1/4 animate-float-1"></div>
                        <div className="absolute w-[300px] h-[300px] bg-indigo-900/10 blur-[70px] rounded-full bottom-1/3 right-1/4 animate-float-2"></div>
                        <div className="absolute w-[350px] h-[350px] bg-cyan-900/10 blur-[90px] rounded-full top-1/3 right-1/3 animate-float-3"></div>
                        <div className="absolute w-[250px] h-[250px] bg-purple-900/10 blur-[60px] rounded-full bottom-1/4 left-1/3 animate-float-4"></div>
                        <div className="absolute w-[300px] h-[300px] bg-slate-800/20 blur-[80px] rounded-full top-20 right-20 animate-float-5"></div>
                    </div>
                </div>
            )}

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