import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ChatView from './components/ChatView';
import LandingPage from './components/LandingPage';
import Onboarding from './components/Onboarding';
import AuthPage from './pages/AuthPage';
import QuizPage from './pages/QuizPage';
import DevEnvironmentPage from './pages/DevEnvironmentPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import SearchPage from './pages/SearchPage';

const AppContent: React.FC = () => {
    return (
        <Routes>
            <Route 
                path="/" 
                element={<LandingPage />} 
            />
            <Route 
                path="/auth" 
                element={<AuthPage />} 
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
                element={<ChatView />} 
            />
            <Route
                path="/quiz"
                element={<QuizPage />}
            />
            <Route
                path="/dev"
                element={<DevEnvironmentPage />}
            />
             <Route
                path="/dev/:conversationId"
                element={<DevEnvironmentPage />}
            />
            <Route
                path="/search"
                element={<SearchPage />}
            />
            {/* Fallback route to redirect any unknown URL to the correct starting point */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

export default AppContent;