import React from 'react';

interface EmbeddedViewProps {
    url: string;
    title?: string;
    onClose: () => void;
    hideTopPercent?: number;
}

const EmbeddedView: React.FC<EmbeddedViewProps> = ({ url, title = "External Tool", onClose, hideTopPercent = 0 }) => {
    // Validate and clamp hideTopPercent to reasonable bounds (0-20%)
    const safeHideTopPercent = Math.max(0, Math.min(20, hideTopPercent || 0));
    
    return (
        <div className="fixed inset-0 z-[99] bg-black/80 backdrop-blur-lg flex flex-col animate-in fade-in duration-300">
            <div className="flex-shrink-0 h-16 flex items-center justify-between px-6 border-b border-white/10">
                <span className="font-semibold text-sm tracking-wide text-zinc-300">{title}</span>
                <button onClick={onClose} className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors">
                    <svg width="24" height="24" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
            <div className="flex-1 overflow-hidden relative">
                <iframe
                    src={url}
                    className="w-full border-none"
                    style={{
                        height: safeHideTopPercent > 0 ? `${100 + safeHideTopPercent}%` : '100%',
                        marginTop: safeHideTopPercent > 0 ? `-${safeHideTopPercent}%` : '0'
                    }}
                    title={title}
                    allow="microphone; camera; display-capture; autoplay; clipboard-write"
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-presentation"
                ></iframe>
            </div>
        </div>
    );
};

export default EmbeddedView;