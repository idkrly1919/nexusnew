import React from 'react';
import { SessionProvider } from './contexts/SessionContext';
import AppContent from './AppContent';

const App: React.FC = () => {
    return (
        <SessionProvider>
            <AppContent />
        </SessionProvider>
    );
};

export default App;