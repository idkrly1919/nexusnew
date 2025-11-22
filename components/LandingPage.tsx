import React from 'react';

const OrbLogo = () => (
    <div className="relative w-24 h-24 flex items-center justify-center mb-8">
        <div className="absolute inset-0 rounded-full bg-blue-500 blur-2xl opacity-20 animate-pulse"></div>
        <div className="relative w-20 h-20 rounded-full bg-gradient-to-b from-slate-800 to-black border border-slate-700 shadow-2xl flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(56,189,248,0.4),transparent_70%)]"></div>
            <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-blue-600/20 to-transparent"></div>
            <svg className="text-blue-400 w-10 h-10 drop-shadow-[0_0_15px_rgba(96,165,250,0.8)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        </div>
        <div className="absolute inset-0 border border-blue-500/30 rounded-full w-full h-full rotate-45 scale-110 opacity-40"></div>
        <div className="absolute inset-0 border border-cyan-400/20 rounded-full w-full h-full -rotate-12 scale-125 opacity-30"></div>
    </div>
);

interface LandingPageProps {
    onLoginClick: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLoginClick }) => {
    return (
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen text-center px-4">
            <OrbLogo />
            <h1 className="text-5xl md:text-7xl font-bold brand-font gradient-text mb-4">
                Nexus Reasoning Engine
            </h1>
            <p className="text-lg md:text-xl text-zinc-300 max-w-2xl mx-auto mb-8">
                An advanced mathematical and logical reasoning engine powered by Gemini, designed to solve complex problems and provide detailed, step-by-step thinking processes.
            </p>
            <button 
                onClick={onLoginClick}
                className="bg-white text-black font-bold py-3 px-8 rounded-full text-lg hover:bg-zinc-200 transition-all duration-300 shadow-lg hover:shadow-white/20 transform hover:scale-105"
            >
                Get Started
            </button>
        </div>
    );
};

export default LandingPage;