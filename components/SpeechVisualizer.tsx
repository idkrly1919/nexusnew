import React from 'react';

interface SpeechVisualizerProps {
    transcript: string;
    onClose: () => void;
    onSend: () => void;
}

const SpeechVisualizer: React.FC<SpeechVisualizerProps> = ({ transcript, onClose, onSend }) => {
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-lg z-[100] flex flex-col items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="absolute top-4 right-4">
                <button onClick={onClose} className="p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors">
                    <svg width="24" height="24" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>

            <div className="w-full max-w-4xl text-center flex flex-col items-center">
                {/* Visualizer Element */}
                <div className="relative w-32 h-32 flex items-center justify-center mb-8">
                    <div className="absolute inset-0 bg-blue-500 rounded-full animate-pulse opacity-50 blur-xl"></div>
                    <div className="absolute inset-2 bg-blue-400 rounded-full animate-pulse [animation-delay:200ms] opacity-40 blur-lg"></div>
                    <div className="relative w-20 h-20 liquid-glass rounded-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-blue-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>
                    </div>
                </div>

                {/* Transcript */}
                <p className="text-2xl md:text-4xl font-medium text-white min-h-[80px]">
                    {transcript || <span className="text-zinc-500">Listening...</span>}
                </p>

                {/* Send Button */}
                <div className="mt-12">
                    <button 
                        onClick={onSend}
                        className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-black shadow-2xl shadow-white/20 hover:bg-zinc-200 transition-all transform hover:scale-105"
                        title="Send Message"
                    >
                        <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SpeechVisualizer;