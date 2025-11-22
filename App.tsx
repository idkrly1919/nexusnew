import React from 'react';
import { SessionProvider, useSession } from './contexts/SessionContext';
import ChatView from './components/ChatView';
import LoginPage from './pages/Login';

const AppContent: React.FC = () => {
    const { session } = useSession();

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

            {!session ? <LoginPage /> : <ChatView />}
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