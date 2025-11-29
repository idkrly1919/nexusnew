import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSession } from './contexts/SessionContext';
import ChatView from './components/ChatView';
import LandingPage from './components/LandingPage';
import Onboarding from './components/Onboarding';
import AuthPage from './pages/AuthPage';
import SupabaseKeepAlive from './components/SupabaseKeepAlive';
import QuizPage from './pages/QuizPage';
import DevEnvironmentPage from './pages/DevEnvironmentPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import SearchPage from './pages/SearchPage';

const AppContent: React.FC = () => {
    const { session, profile, isLoading } = useSession();

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

    if (session && profile && !profile.onboarding_completed) {
        // If the user is logged in but hasn't finished onboarding,
        // force them to the onboarding page regardless of the URL.
        return (
            <Routes>
                <Route path="*" element={<Onboarding />} />
            </Routes>
        );
    }

    return (
        <>
            {session && <SupabaseKeepAlive />}
            <Routes>
                <Route 
                    path="/" 
                    element={session ? <Navigate to="/chat" replace /> : <LandingPage />} 
                />
                <Route 
                    path="/auth" 
                    element={session ? <Navigate to="/chat" replace /> : <><ChatView /><AuthPage /></>} 
                />
                <Route 
                    path="/reset-password" 
                    element={<ResetPasswordPage />} 
                />
                <Route 
                    path="/chat" 
                    element={<ChatView />} 
                />
                <Route 
                    path="/chat/:conversationId" 
                    element={session ? <ChatView /> : <Navigate to="/auth" replace />} 
                />
                <Route
                    path="/quiz"
                    element={session ? <QuizPage /> : <Navigate to="/auth" replace />}
                />
                <Route
                    path="/dev"
                    element={session ? <DevEnvironmentPage /> : <Navigate to="/auth" replace />}
                />
                 <Route
                    path="/dev/:conversationId"
                    element={session ? <DevEnvironmentPage /> : <Navigate to="/auth" replace />}
                />
                <Route
                    path="/search"
                    element={session ? <SearchPage /> : <Navigate to="/auth" replace />}
                />
                {/* Fallback route to redirect any unknown URL to the correct starting point */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </>
    );
};

export default AppContent;