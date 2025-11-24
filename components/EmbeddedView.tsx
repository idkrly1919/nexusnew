import React from 'react';

interface EmbeddedViewProps {
    url: string;
    onClose: () => void;
}

const EmbeddedView: React.FC<EmbeddedViewProps> = ({ url, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-lg z-[100] flex flex-col items-center justify-center p-4 animate-pop-in">
            <div className="absolute top-4 right-4 z-10">
                <button onClick={onClose} className="p-2 rounded-full text-zinc-300 hover:text-white bg-black/20 hover:bg-black/40 backdrop-blur-md border border-white/10 transition-colors">
                    <svg width="24" height="24" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>

            <div className="w-full h-full max-w-6xl max-h-[90vh] flex flex-col liquid-glass rounded-2xl overflow-hidden">
                <div className="flex-shrink-0 p-4 bg-black/20 border-b border-white/10 flex items-center justify-between">
                    <p className="text-sm text-zinc-400">Third-Party Tool Integration</p>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                        Open in New Tab
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                    </a>
                </div>
                <div className="flex-1 bg-black/20">
                    <iframe
                        src={url}
                        className="w-full h-full border-0"
                        title="Embedded Tool"
                        sandbox="allow-scripts allow-same-origin"
                    ></iframe>
                </div>
            </div>
             <p className="text-xs text-zinc-600 mt-4">
                Note: You are viewing a third-party website. We cannot control its appearance or functionality.
            </p>
        </div>
    );
};

export default EmbeddedView;