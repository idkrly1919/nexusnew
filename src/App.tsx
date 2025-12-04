import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { SessionProvider } from './contexts/SessionContext';
import AppContent from './AppContent';

const App: React.FC = () => {
    return (
        <BrowserRouter>
            <SessionProvider>
                <AppContent />
            </SessionProvider>
        </BrowserRouter>
    );
};

export default App;