import React from 'react';
import LoginPage from '../pages/Login';

interface LoginModalProps {
    isVisible: boolean;
    onClose: () => void;
    promptText?: string;
    isDismissible?: boolean;
}

const LoginModal: React.FC<LoginModalProps> = ({ isVisible, onClose, promptText, isDismissible = true }) => {
    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-lg flex flex-col items-center justify-center p-4 animate-pop-in">
            {isDismissible && (
                <div className="absolute top-4 right-4 z-10">
                    <button onClick={onClose} className="p-2 rounded-full text-zinc-300 hover:text-white bg-black/20 hover:bg-black/40 backdrop-blur-md border border-white/10 transition-colors">
                        <svg width="24" height="24" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
            )}
            <div className="w-full max-w-md">
                {promptText && <p className="text-center text-lg text-zinc-300 mb-4">{promptText}</p>}
                <LoginPage />
            </div>
        </div>
    );
};

export default LoginModal;