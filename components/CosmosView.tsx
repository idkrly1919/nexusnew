import React, { useEffect, useRef } from 'react';

interface CosmosViewProps {
    onSelectPlanet: (url: string | 'chat') => void;
    isActive: boolean;
}

const CosmosView: React.FC<CosmosViewProps> = ({ onSelectPlanet, isActive }) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return;
            const { clientX, clientY } = e;
            const { innerWidth, innerHeight } = window;
            const moveX = (clientX - innerWidth / 2) / (innerWidth / 2);
            const moveY = (clientY - innerHeight / 2) / (innerHeight / 2);

            const planets = containerRef.current.querySelectorAll('.planet') as NodeListOf<HTMLElement>;
            planets.forEach(planet => {
                const depth = parseFloat(planet.dataset.depth || '0');
                const x = moveX * depth * -1;
                const y = moveY * depth * -1;
                planet.style.transform = `translate(${x}px, ${y}px) scale(1)`;
            });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    return (
        <div 
            ref={containerRef}
            className={`fixed inset-0 z-50 flex items-center justify-center bg-black transition-opacity duration-1000 ${isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        >
            {/* Background Stars */}
            <div className="absolute inset-0 opacity-50" style={{ backgroundImage: 'radial-gradient(white 0.5px, transparent 0)', backgroundSize: '30px 30px' }}></div>
            <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(white 0.5px, transparent 0)', backgroundSize: '60px 60px' }}></div>

            <div className="relative w-full max-w-6xl flex justify-around items-center">
                {/* Left Planet: Video Generator */}
                <div 
                    className="planet-container text-center cursor-pointer group"
                    onClick={() => onSelectPlanet('https://veoaifree.com/veo-video-generator/')}
                >
                    <div data-depth="40" className="planet w-48 h-48 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 shadow-2xl shadow-purple-500/30 transition-all duration-300 group-hover:scale-110 border-2 border-purple-400/50 flex items-center justify-center">
                        <svg className="w-16 h-16 text-white opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>
                    </div>
                    <h3 className="mt-4 text-lg font-bold text-white tracking-wider group-hover:text-purple-300 transition-colors">Video Generator</h3>
                    <p className="text-sm text-zinc-400">Create with VEO AI</p>
                </div>

                {/* Center Planet: Main Chat */}
                <div 
                    className="planet-container text-center cursor-pointer group"
                    onClick={() => onSelectPlanet('chat')}
                >
                    <div data-depth="20" className="planet w-64 h-64 rounded-full bg-gradient-to-br from-indigo-500 to-blue-600 shadow-2xl shadow-indigo-500/40 transition-all duration-300 group-hover:scale-110 border-4 border-indigo-400/70 flex items-center justify-center">
                         <img src="/nexus-logo.png" alt="Nexus Logo" className="w-32 h-32 opacity-90" />
                    </div>
                    <h3 className="mt-6 text-2xl font-bold text-white tracking-wider group-hover:text-indigo-300 transition-colors">Nexus Chat</h3>
                    <p className="text-md text-zinc-300">Advanced Reasoning Engine</p>
                </div>

                {/* Right Planet: Image Generator */}
                <div 
                    className="planet-container text-center cursor-pointer group"
                    onClick={() => onSelectPlanet('https://nanobananafree.ai/')}
                >
                    <div data-depth="40" className="planet w-48 h-48 rounded-full bg-gradient-to-br from-cyan-500 to-teal-600 shadow-2xl shadow-cyan-500/30 transition-all duration-300 group-hover:scale-110 border-2 border-cyan-400/50 flex items-center justify-center">
                        <svg className="w-16 h-16 text-white opacity-80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                    </div>
                    <h3 className="mt-4 text-lg font-bold text-white tracking-wider group-hover:text-cyan-300 transition-colors">4K Image Generator</h3>
                    <p className="text-sm text-zinc-400">Powered by NanoBanana</p>
                </div>
            </div>
        </div>
    );
};

export default CosmosView;