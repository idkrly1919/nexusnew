import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { SignInWithChatGPT } from '@openai-oauth/react';
import DynamicBackground from '../components/DynamicBackground';
import LegalModal from '../components/LegalModal';
import { termsOfService, privacyPolicy } from '../legal';

const AuthPage: React.FC = () => {
    const [legalModal, setLegalModal] = useState<{ title: string, content: string } | null>(null);

    return (
        <>
            <DynamicBackground status="idle" />
            {legalModal && <LegalModal title={legalModal.title} content={legalModal.content} onClose={() => setLegalModal(null)} />}
            <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-lg flex flex-col items-center justify-center p-4 animate-pop-in">
                <div className="absolute top-4 right-4 z-10">
                    <Link to="/chat" className="p-2 rounded-full text-zinc-300 hover:text-white bg-black/20 hover:bg-black/40 backdrop-blur-md border border-white/10 transition-colors">
                        <svg width="24" height="24" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </Link>
                </div>
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center animate-pop-in">
                        <div className="flex items-center justify-center gap-2 mb-4 interactive-lift cursor-pointer">
                            <img src="/quillix-logo.png" alt="Quillix Logo" className="w-10 h-10" />
                            <span className="text-3xl font-bold tracking-tight brand-font">Quillix</span>
                        </div>
                        <h1 className="text-2xl font-bold text-white">Sign in to Quillix</h1>
                        <p className="text-zinc-400">Use your ChatGPT account to access Quillix AI</p>
                    </div>
                    <div data-liquid-glass className="liquid-glass p-8 rounded-2xl animate-pop-in flex flex-col items-center" style={{ animationDelay: '100ms' }}>
                        <SignInWithChatGPT 
                            onSuccess={(session) => console.log('Signed in:', session.accountId)}
                            onError={(error) => console.error('Auth error:', error.message)}
                        />
                        <div className="mt-6 text-center">
                            <p className="text-xs text-zinc-500 px-4">
                                By signing in, you agree to the{' '}
                                <a href="#" onClick={(e) => { e.preventDefault(); setLegalModal({ title: 'Terms of Service', content: termsOfService }); }} className="underline hover:text-indigo-400">Terms and Conditions</a>{' '}
                                and{' '}
                                <a href="#" onClick={(e) => { e.preventDefault(); setLegalModal({ title: 'Privacy Policy', content: privacyPolicy }); }} className="underline hover:text-indigo-400">Privacy Policy</a>.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default AuthPage;
