import React, { useState, useEffect } from 'react';

interface ThinkingProcessProps {
    thought: string;
    isThinking?: boolean;
    mode?: 'reasoning' | 'image';
}

const GlobeAnimation = () => (
    <div className="globe-container">
        <div className="globe"></div>
    </div>
);

const ThinkingDotsAnimation = () => (
    <div className="thinking-dots w-4 h-4 flex items-center justify-center">
        <span></span>
        <span></span>
        <span></span>
    </div>
);

export const ThinkingProcess: React.FC<ThinkingProcessProps> = ({ isThinking = false, mode = 'reasoning' }) => {
    const [stage, setStage] = useState<'searching' | 'thinking'>('searching');
    const [statusText, setStatusText] = useState("Searching the web...");

    useEffect(() => {
        if (!isThinking) return;

        let textInterval: NodeJS.Timeout;

        if (mode === 'image') {
            const imageStatuses = [
                "Constructing wireframe...",
                "Calculating geometry...",
                "Scanning spatial data...",
                "Rendering textures...",
                "Finalizing output..."
            ];
            let index = 0;
            setStatusText(imageStatuses[0]);
            textInterval = setInterval(() => {
                index = (index + 1) % imageStatuses.length;
                setStatusText(imageStatuses[index]);
            }, 1500);

        } else { // Reasoning mode
            setStage('searching');
            setStatusText("Searching the web...");

            const searchTimer = setTimeout(() => {
                setStage('thinking');
                const thinkingStatuses = [
                    "Analyzing results...",
                    "Pattern matching...",
                    "Verifying sources...",
                    "Optimizing solution...",
                    "Generating response..."
                ];
                let index = 0;
                setStatusText(thinkingStatuses[0]);
                textInterval = setInterval(() => {
                    index = (index + 1) % thinkingStatuses.length;
                    setStatusText(thinkingStatuses[index]);
                }, 1500);
            }, 2500);

            return () => {
                clearTimeout(searchTimer);
                if (textInterval) clearInterval(textInterval);
            };
        }
        
        return () => clearInterval(textInterval);
    }, [isThinking, mode]);

    if (!isThinking) return null;

    const renderAnimation = () => {
        if (mode === 'image') {
            return <ThinkingDotsAnimation />;
        }
        if (stage === 'searching') {
            return <GlobeAnimation />;
        }
        return <ThinkingDotsAnimation />;
    };

    return (
        <div data-liquid-glass className="liquid-glass inline-flex items-center gap-3 py-2 px-4 rounded-full">
            {renderAnimation()}
            <div className="text-sm font-mono text-zinc-400">
                {statusText}
            </div>
        </div>
    );
};