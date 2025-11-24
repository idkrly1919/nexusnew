import React, { useState, useEffect } from 'react';

interface ThinkingProcessProps {
    thought: string;
    isThinking?: boolean;
    mode?: 'reasoning' | 'image';
}

export const ThinkingProcess: React.FC<ThinkingProcessProps> = ({ isThinking = false, mode = 'reasoning' }) => {
    const [statusText, setStatusText] = useState("Accessing neural web...");
    
    useEffect(() => {
        if (!isThinking) return;
        
        const reasoningStatuses = [
            "Accessing neural web...",
            "Pattern matching...",
            "Verifying sources...",
            "Optimizing solution...",
            "Generating response..."
        ];

        const imageStatuses = [
            "Constructing wireframe...",
            "Calculating geometry...",
            "Scanning spatial data...",
            "Rendering textures...",
            "Finalizing output..."
        ];

        const statuses = mode === 'image' ? imageStatuses : reasoningStatuses;
        
        let index = 0;
        // Set initial
        setStatusText(statuses[0]);

        const interval = setInterval(() => {
            index = (index + 1) % statuses.length;
            setStatusText(statuses[index]);
        }, 1500);
        
        return () => clearInterval(interval);
    }, [isThinking, mode]);

    if (!isThinking) return null;

    return (
        <div className="liquid-glass inline-flex items-center gap-3 py-2 px-4 rounded-full">
            {/* Animation based on mode */}
            {mode === 'reasoning' ? (
                // Subtle Circular Video-Style Spinner
                <div className="relative w-5 h-5 shrink-0">
                    <svg className="animate-spin w-full h-full text-white opacity-90" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" strokeOpacity="0.1" />
                        <path d="M12 2C6.47715 2 2 6.47715 2 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                </div>
            ) : (
                // Image Gen Wireframe Rectangle
                <div className="relative w-6 h-6 shrink-0 flex items-center justify-center">
                     <svg className="w-full h-full text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.5)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" className="animate-draw-wireframe" />
                        <line x1="3" y1="12" x2="21" y2="12" className="animate-scan-line opacity-50 text-white" />
                    </svg>
                </div>
            )}
            
            {/* Status Text */}
            <div className="text-sm font-mono text-zinc-400 animate-pulse">
                {statusText}
            </div>
        </div>
    );
};