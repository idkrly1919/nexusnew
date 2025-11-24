import React, { useEffect, useRef } from 'react';

const Starfield = () => {
    // This component now just renders the containers for the CSS-based starfield.
    // The actual stars and animations are handled entirely by CSS in index.html for better performance.
    return (
        <div className="fixed inset-0 z-0 overflow-hidden">
            <div id="stars" className="star-layer"></div>
            <div id="stars2" className="star-layer"></div>
            <div id="stars3" className="star-layer"></div>
            <div className="shooting-star-container">
                <div className="shooting-star"></div>
                <div className="shooting-star" style={{ animationDelay: '1.4s', top: '60%', left: '40%' }}></div>
                <div className="shooting-star" style={{ animationDelay: '3.2s', top: '20%', left: '80%' }}></div>
            </div>
        </div>
    );
};


interface CosmosViewProps {
    onSelectPlanet: (url: string | 'chat') => void;
    isActive: boolean;
}

const CosmosView: React.FC<CosmosViewProps> = ({ onSelectPlanet, isActive }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const starLayersRef = useRef<NodeListOf<HTMLDivElement> | null>(null);

    useEffect(() => {
        if (!isActive) return;

        starLayersRef.current = document.querySelectorAll('.star-layer');

        const handleMouseMove = (e: MouseEvent) => {
            if (!containerRef.current || !starLayersRef.current) return;
            const { clientX, clientY } = e;
            const width = window.innerWidth;
            const height = window.innerHeight;
            
            const moveX = (clientX - width / 2) / (width / 2);
            const moveY = (clientY - height / 2) / (height / 2);

            // Parallax for stars
            if (starLayersRef.current) {
                starLayersRef.current[0].style.transform = `translate(${moveX * -5}px, ${moveY * -5}px)`;
                starLayersRef.current[1].style.transform = `translate(${moveX * -15}px, ${moveY * -15}px)`;
                starLayersRef.current[2].style.transform = `translate(${moveX * -30}px, ${moveY * -30}px)`;
            }

            // Gravity for planets
            const planets = containerRef.current.querySelectorAll('.planet-interactive') as NodeListOf<HTMLElement>;
            planets.forEach(planet => {
                const rect = planet.getBoundingClientRect();
                const planetX = rect.left + rect.width / 2;
                const planetY = rect.top + rect.height / 2;
                const distanceX = clientX - planetX;
                const distanceY = clientY - planetY;
                const distance = Math.sqrt(distanceX * distanceX + distanceY * distanceY);

                let pullX = 0;
                let pullY = 0;
                const gravityRadius = 400;

                if (distance < gravityRadius) {
                    const pullFactor = (1 - distance / gravityRadius) * 15; // Max pull of 15px
                    pullX = (distanceX / distance) * pullFactor;
                    pullY = (distanceY / distance) * pullFactor;
                }

                planet.style.transform = `translate(${pullX}px, ${pullY}px)`;
            });
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [isActive]);

    if (!isActive) {
        return null;
    }

    return (
        <div 
            ref={containerRef}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black animate-in fade-in duration-1000 overflow-hidden"
        >
            <Starfield />

            <div className="relative w-full max-w-7xl h-full flex justify-center items-center">
                {/* Center Planet: Main Chat */}
                <div className="absolute text-center cursor-pointer group z-10" onClick={() => onSelectPlanet('chat')}>
                    <div className="planet-interactive w-64 h-64 liquid-planet rounded-full relative flex items-center justify-center" style={{ animation: 'pulse-glow 4s ease-in-out infinite' }}>
                        <img src="/nexus-logo.png" alt="Nexus Logo" className="w-32 h-32 opacity-90 relative z-10" style={{ filter: 'grayscale(100%) brightness(1.5)' }} />
                    </div>
                    <h3 className="mt-6 text-2xl font-bold text-white tracking-wider group-hover:text-zinc-100 transition-colors">Nexus Chat</h3>
                    <p className="text-md text-zinc-300">Advanced Reasoning Engine</p>
                </div>

                {/* Left Planet: Video Generator */}
                <div className="absolute left-[15%] top-1/2 -translate-y-1/2 text-center cursor-pointer group z-10" onClick={() => onSelectPlanet('https://veoaifree.com/veo-video-generator/')}>
                    <div className="planet-interactive w-48 h-48 liquid-planet rounded-full relative flex items-center justify-center">
                        <svg className="w-16 h-16 text-white opacity-80 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>
                    </div>
                    <h3 className="mt-8 text-lg font-bold text-white tracking-wider group-hover:text-zinc-100 transition-colors">Video Generator</h3>
                    <p className="text-sm text-zinc-400">Create with VEO AI</p>
                </div>

                {/* Right Planet: Image Generator */}
                <div className="absolute right-[15%] top-1/2 -translate-y-1/2 text-center cursor-pointer group z-10" onClick={() => onSelectPlanet('https://nanobananafree.ai/')}>
                    <div className="planet-interactive w-48 h-48 liquid-planet rounded-full relative flex items-center justify-center">
                        <svg className="w-16 h-16 text-white opacity-80 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                    </div>
                    <h3 className="mt-8 text-lg font-bold text-white tracking-wider group-hover:text-zinc-100 transition-colors">4K Image Generator</h3>
                    <p className="text-sm text-zinc-400">Powered by NanoBanana</p>
                </div>
            </div>
        </div>
    );
};

export default CosmosView;