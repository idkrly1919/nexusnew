import React, { useState } from 'react';
import { SessionProvider, useSession } from './src/contexts/SessionContext';
import ChatView from './components/ChatView';
import LoginPage from './src/pages/Login';
import LandingPage from './components/LandingPage';

const AppContent: React.FC = () => {
    const { session } = useSession();
    const [showLogin, setShowLogin] = useState(false);

    // Add a loading state while session is being determined
    if (session === undefined) {
        return null; // Or a loading spinner
    }

    return (
        <>
            {/* Shared Background Elements */}
            <div className="fixed inset-0 grid-bg z-0"></div>
            <div className="fixed top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 glow-bg"></div>
            <div className="fixed bottom-0 right-0 translate-x-1/3 translate-y-1/3 glow-bg bg-purple-900/20"></div>

            {session ? (
                <ChatView />
            ) : showLogin ? (
                <LoginPage />
            ) : (
                <LandingPage onLoginClick={() => setShowLogin(true)} />
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