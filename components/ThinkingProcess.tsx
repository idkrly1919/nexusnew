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
        setStatusText(statuses[0]);

        const interval = setInterval(() => {
            index = (index + 1) % statuses.length;
            setStatusText(statuses[index]);
        }, 1500);
        
        return () => clearInterval(interval);
    }, [isThinking, mode]);

    if (!isThinking) return null;

    return (
        <div data-liquid-glass className="liquid-glass inline-flex items-center gap-3 py-2 px-4 rounded-full">
            <div className="text-sm font-mono text-zinc-400 animate-pulse">
                {statusText}
            </div>
        </div>
    );
};