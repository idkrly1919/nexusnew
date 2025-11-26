import React from 'react';

interface LegalModalProps {
    title: string;
    content: string;
    onClose: () => void;
}

const LegalModal: React.FC<LegalModalProps> = ({ title, content, onClose }) => {
    return (
        <div className="fixed inset-0 z-[101] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-pop-in" onClick={onClose}>
            <div data-liquid-glass className="liquid-glass w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 border-b border-white/10 flex justify-between items-center flex-shrink-0">
                    <h2 className="text-xl font-bold text-white font-brand">{title}</h2>
                    <button onClick={onClose} className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors">
                        <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
                <div className="p-6 overflow-y-auto scrollbar-hide prose prose-invert prose-sm max-w-none text-zinc-300" dangerouslySetInnerHTML={{ __html: content }}>
                </div>
            </div>
        </div>
    );
};

export default LegalModal;