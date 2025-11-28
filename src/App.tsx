import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { SessionProvider } from './contexts/SessionContext';
import { ThemeProvider } from './contexts/ThemeContext';
import AppContent from './AppContent';

const App: React.FC = () => {
    return (
        <BrowserRouter>
            <ThemeProvider>
                <SessionProvider>
                    <AppContent />
                </SessionProvider>
            </ThemeProvider>
        </BrowserRouter>
    );
};

export default App;