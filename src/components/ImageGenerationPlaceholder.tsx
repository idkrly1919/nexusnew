import React from 'react';

const ImageGenerationPlaceholder: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center h-full w-full relative overflow-hidden">
            {/* Mountain Animation */}
            <div className="flex items-end gap-1.5 h-32 mb-8">
                <style>
                    {`
                    @keyframes mountain-grow-1 { 0%, 100% { height: 20%; opacity: 0.3; } 50% { height: 40%; opacity: 0.8; } }
                    @keyframes mountain-grow-2 { 0%, 100% { height: 30%; opacity: 0.3; } 50% { height: 70%; opacity: 0.9; } }
                    @keyframes mountain-grow-3 { 0%, 100% { height: 40%; opacity: 0.3; } 50% { height: 100%; opacity: 1; } }
                    
                    .mountain-bar {
                        width: 24px;
                        background: linear-gradient(to top, #4f46e5, #818cf8);
                        border-radius: 4px;
                        box-shadow: 0 0 20px rgba(79, 70, 229, 0.4);
                    }
                    `}
                </style>
                <div className="mountain-bar" style={{ animation: 'mountain-grow-1 2s infinite ease-in-out', animationDelay: '0s' }}></div>
                <div className="mountain-bar" style={{ animation: 'mountain-grow-2 2s infinite ease-in-out', animationDelay: '0.2s' }}></div>
                <div className="mountain-bar" style={{ animation: 'mountain-grow-3 2s infinite ease-in-out', animationDelay: '0.4s' }}></div>
                <div className="mountain-bar" style={{ animation: 'mountain-grow-2 2s infinite ease-in-out', animationDelay: '0.2s' }}></div>
                <div className="mountain-bar" style={{ animation: 'mountain-grow-1 2s infinite ease-in-out', animationDelay: '0s' }}></div>
            </div>

            {/* Text at the bottom */}
            <div className="absolute bottom-8 text-center space-y-2">
                <div className="text-lg font-medium text-white tracking-wide">Creating Masterpiece</div>
                <div className="text-sm text-zinc-400">Using advanced diffusion models...</div>
            </div>
        </div>
    );
};

export default ImageGenerationPlaceholder;