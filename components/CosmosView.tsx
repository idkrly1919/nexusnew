import React, { useEffect, useRef, useState } from 'react';

interface CosmosViewProps {
    onSelectPlanet: (url: string | 'chat') => void;
    isActive: boolean;
}

interface Star {
    id: number;
    x: string;
    y: string;
    size: string;
    opacity: number;
    animationDelay: string;
}

const CosmosView: React.FC<CosmosViewProps> = ({ onSelectPlanet, isActive }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [stars, setStars] = useState<Star[]>([]);

    useEffect(() => {
        const numStars = 250;
        const newStars: Star[] = [];
        for (let i = 0; i < numStars; i++) {
            newStars.push({
                id: i,
                x: `${Math.random() * 100}%`,
                y: `${Math.random() * 100}%`,
                size: `${Math.random() * 1.5 + 0.5}px`,
                opacity: Math.random() * 0.6 + 0.2,
                animationDelay: `${Math.random() * 5}s`,
            });
        }
        setStars(newStars);
    }, []);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current) return;
            const { clientX, clientY } = e;
            const { innerWidth, innerHeight } = window;
            const moveX = (clientX - innerWidth / 2) / (innerWidth / 2);
            const moveY = (clientY - innerHeight / 2) / (innerHeight / 2);

            const planets = containerRef.current.querySelectorAll('.planet') as NodeListOf<HTMLElement>;
            planets.forEach(planet => {
                // Parallax effect
                const depth = parseFloat(planet.dataset.depth || '0');
                const parallaxX = moveX * depth * -1;
                const parallaxY = moveY * depth * -1;

                // Gravity pull effect
                const rect = planet.getBoundingClientRect();
                const planetX = rect.left + rect.width / 2;
                const planetY = rect.top + rect.height / 2;
                const distanceX = clientX - planetX;
                const distanceY = clientY - planetY;
                const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

                let gravityX = 0;
                let gravityY = 0;
                const gravityRadius = 350;

                if (distance < gravityRadius) {
                    const pullFactor = (1 - distance / gravityRadius) * 15;
                    gravityX = (distanceX / distance) * pullFactor;
                    gravityY = (distanceY / distance) * pullFactor;
                }

                planet.style.transform = `translate(${parallaxX + gravityX}px, ${parallaxY + gravityY}px)`;
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
            {/* Randomized Starfield */}
            <div className="absolute inset-0 overflow-hidden">
                {stars.map(star => (
                    <div
                        key={star.id}
                        className="star"
                        style={{
                            left: star.x,
                            top: star.y,
                            width: star.size,
                            height: star.size,
                            animationDelay: star.animationDelay,
                            ['--start-opacity' as any]: star.opacity,
                        }}
                    />
                ))}
            </div>

            <div className="relative w-full max-w-6xl flex justify-around items-center">
                {/* Left Planet: Video Generator */}
                <div className="planet-container text-center cursor-pointer group" onClick={() => onSelectPlanet('https://veoaifree.com/veo-video-generator/')}>
                    <div className="planet-orbit drift-1">
                        <div data-depth="40" className="planet w-48 h-48 transition-transform duration-300 ease-out relative flex items-center justify-center">
                            <div className="absolute inset-0 rounded-full overflow-hidden shadow-2xl border-2 border-white/20">
                                <div className="absolute inset-0 bg-gradient-to-br from-white via-zinc-400 to-black" style={{ backgroundSize: '200% 200%', animation: 'swirl 25s linear infinite' }}></div>
                            </div>
                            <div className="absolute w-[180%] h-[180%] border-2 border-white/30 rounded-full transform rotate-[-30deg] scale-y-[0.3]"></div>
                            <div className="absolute w-[180%] h-[180%] border border-white/20 rounded-full transform rotate-[-30deg] scale-y-[0.3] scale-x-[0.95]"></div>
                            <svg className="w-16 h-16 text-white opacity-80 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>
                        </div>
                    </div>
                    <h3 className="mt-8 text-lg font-bold text-white tracking-wider group-hover:text-zinc-100 transition-colors">Video Generator</h3>
                    <p className="text-sm text-zinc-400">Create with VEO AI</p>
                </div>

                {/* Center Planet: Main Chat */}
                <div className="planet-container text-center cursor-pointer group" onClick={() => onSelectPlanet('chat')}>
                    <div className="planet-orbit drift-2">
                        <div data-depth="20" className="planet w-64 h-64 transition-transform duration-300 ease-out relative flex items-center justify-center">
                            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-zinc-300 to-zinc-800 border-4 border-white/50" style={{ animation: 'pulse-glow 4s ease-in-out infinite' }}></div>
                            <img src="/nexus-logo.png" alt="Nexus Logo" className="w-32 h-32 opacity-90 relative z-10" style={{ filter: 'grayscale(100%) brightness(1.5)' }} />
                        </div>
                    </div>
                    <h3 className="mt-6 text-2xl font-bold text-white tracking-wider group-hover:text-zinc-100 transition-colors">Nexus Chat</h3>
                    <p className="text-md text-zinc-300">Advanced Reasoning Engine</p>
                </div>

                {/* Right Planet: Image Generator */}
                <div className="planet-container text-center cursor-pointer group" onClick={() => onSelectPlanet('https://nanobananafree.ai/')}>
                    <div className="planet-orbit drift-3">
                        <div data-depth="40" className="planet w-48 h-48 transition-transform duration-300 ease-out relative flex items-center justify-center">
                            <div className="absolute inset-0 rounded-full overflow-hidden shadow-2xl border-2 border-white/20">
                                <div className="absolute inset-0 bg-gradient-to-br from-zinc-200 to-zinc-600"></div>
                                <div className="absolute inset-[-50%] opacity-20" style={{ backgroundImage: 'url(https://www.transparenttextures.com/patterns/subtle-white-feathers.png)', animation: 'swirl 40s linear infinite reverse' }}></div>
                            </div>
                            <svg className="w-16 h-16 text-white opacity-80 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                        </div>
                    </div>
                    <h3 className="mt-8 text-lg font-bold text-white tracking-wider group-hover:text-zinc-100 transition-colors">4K Image Generator</h3>
                    <p className="text-sm text-zinc-400">Powered by NanoBanana</p>
                </div>
            </div>
        </div>
    );
};

export default CosmosView;