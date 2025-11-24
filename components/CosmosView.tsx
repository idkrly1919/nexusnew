import React, { useState, useEffect } from 'react';

interface CosmosViewProps {
    onSelectPlanet: (url: string | 'chat') => void;
    isActive: boolean;
}

const CosmosView: React.FC<CosmosViewProps> = ({ onSelectPlanet, isActive }) => {
    const [speeds, setSpeeds] = useState({ orbit1: 0, orbit2: 0 });

    useEffect(() => {
        // Set random speeds on mount
        setSpeeds({
            orbit1: Math.random() * 20 + 25, // Duration between 25s and 45s
            orbit2: Math.random() * 20 + 40, // Duration between 40s and 60s
        });
    }, []);

    if (!isActive) {
        return null; // Render nothing if not active to ensure it's hidden on load
    }

    return (
        <div 
            className={`fixed inset-0 z-50 flex items-center justify-center bg-black animate-in fade-in duration-1000`}
        >
            {/* Animated Parallax Starfield */}
            <div className="stars-bg stars-1"></div>
            <div className="stars-bg stars-2"></div>
            <div className="stars-bg stars-3"></div>

            <div className="relative w-full h-full flex justify-center items-center">
                {/* Center Planet: Main Chat (The Sun) */}
                <div className="planet-container text-center cursor-pointer group z-10" onClick={() => onSelectPlanet('chat')}>
                    <div className="w-64 h-64 relative flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-zinc-300 to-zinc-800 border-4 border-white/50" style={{ animation: 'pulse-glow 4s ease-in-out infinite' }}></div>
                        <img src="/nexus-logo.png" alt="Nexus Logo" className="w-32 h-32 opacity-90 relative z-10" style={{ filter: 'grayscale(100%) brightness(1.5)' }} />
                    </div>
                    <h3 className="mt-6 text-2xl font-bold text-white tracking-wider group-hover:text-zinc-100 transition-colors">Nexus Chat</h3>
                    <p className="text-md text-zinc-300">Advanced Reasoning Engine</p>
                </div>

                {/* Orbit 1: Video Generator */}
                <div 
                    className="orbit" 
                    style={{ 
                        width: 'clamp(300px, 80vw, 900px)', 
                        height: 'clamp(150px, 40vw, 450px)',
                        animationDuration: `${speeds.orbit1}s`
                    }}
                >
                    <div className="orbit-planet" style={{ transform: 'translate(-50%, -50%)' }}>
                         <div className="planet-container text-center cursor-pointer group" onClick={() => onSelectPlanet('https://veoaifree.com/veo-video-generator/')}>
                            <div className="w-48 h-48 relative flex items-center justify-center">
                                <div className="absolute inset-0 rounded-full overflow-hidden shadow-2xl border-2 border-white/20">
                                    <div className="absolute inset-0 bg-gradient-to-br from-white via-zinc-400 to-black" style={{ backgroundSize: '200% 200%', animation: 'swirl 25s linear infinite' }}></div>
                                </div>
                                <div className="absolute w-[180%] h-[180%] border-2 border-white/30 rounded-full transform rotate-[-30deg] scale-y-[0.3]"></div>
                                <div className="absolute w-[180%] h-[180%] border border-white/20 rounded-full transform rotate-[-30deg] scale-y-[0.3] scale-x-[0.95]"></div>
                                <svg className="w-16 h-16 text-white opacity-80 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>
                            </div>
                            <h3 className="mt-8 text-lg font-bold text-white tracking-wider group-hover:text-zinc-100 transition-colors">Video Generator</h3>
                            <p className="text-sm text-zinc-400">Create with VEO AI</p>
                        </div>
                    </div>
                </div>

                {/* Orbit 2: Image Generator */}
                 <div 
                    className="orbit" 
                    style={{ 
                        width: 'clamp(450px, 95vw, 1200px)', 
                        height: 'clamp(225px, 50vw, 600px)',
                        animationDuration: `${speeds.orbit2}s`,
                        animationDirection: 'reverse'
                    }}
                >
                    <div className="orbit-planet" style={{ transform: 'translate(-50%, -50%)' }}>
                        <div className="planet-container text-center cursor-pointer group" onClick={() => onSelectPlanet('https://nanobananafree.ai/')}>
                            <div className="w-48 h-48 relative flex items-center justify-center">
                                <div className="absolute inset-0 rounded-full overflow-hidden shadow-2xl border-2 border-white/20">
                                    <div className="absolute inset-0 bg-gradient-to-br from-zinc-200 to-zinc-600"></div>
                                    <div className="absolute inset-[-50%] opacity-20" style={{ backgroundImage: 'url(https://www.transparenttextures.com/patterns/subtle-white-feathers.png)', animation: 'swirl 40s linear infinite reverse' }}></div>
                                </div>
                                <svg className="w-16 h-16 text-white opacity-80 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                            </div>
                            <h3 className="mt-8 text-lg font-bold text-white tracking-wider group-hover:text-zinc-100 transition-colors">4K Image Generator</h3>
                            <p className="text-sm text-zinc-400">Powered by NanoBanana</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CosmosView;