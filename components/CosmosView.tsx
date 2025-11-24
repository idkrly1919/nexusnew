import React, { useState, useEffect, useRef } from 'react';

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
    const [stars, setStars] = useState<Star[]>([]);
    const orbit1Ref = useRef<HTMLDivElement>(null);
    const orbit2Ref = useRef<HTMLDivElement>(null);
    const baseSpeeds = useRef({ orbit1: 0, orbit2: 0 });

    useEffect(() => {
        // Generate a dense field of stars
        const numStars = 500;
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

        // Set initial random orbital speeds
        baseSpeeds.current = {
            orbit1: Math.random() * 20 + 25, // 25s to 45s
            orbit2: Math.random() * 20 + 40, // 40s to 60s
        };
        if (orbit1Ref.current) orbit1Ref.current.style.animationDuration = `${baseSpeeds.current.orbit1}s`;
        if (orbit2Ref.current) orbit2Ref.current.style.animationDuration = `${baseSpeeds.current.orbit2}s`;
    }, []);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const orbits = [
                { ref: orbit1Ref, baseSpeed: baseSpeeds.current.orbit1 },
                { ref: orbit2Ref, baseSpeed: baseSpeeds.current.orbit2 }
            ];

            orbits.forEach(orbit => {
                if (!orbit.ref.current) return;

                const orbitEl = orbit.ref.current;
                const planetEl = orbitEl.querySelector('.orbit-planet') as HTMLElement;
                if (!planetEl) return;

                const planetRect = planetEl.getBoundingClientRect();
                const planetX = planetRect.left + planetRect.width / 2;
                const planetY = planetRect.top + planetRect.height / 2;

                const transformMatrix = window.getComputedStyle(orbitEl).transform;
                const matrixValues = transformMatrix.match(/matrix.*\((.+)\)/);
                if (!matrixValues) return;
                const matrix = matrixValues[1].split(', ').map(parseFloat);
                const angleRad = Math.atan2(matrix[1], matrix[0]);

                const velocityX = -Math.sin(angleRad);
                const velocityY = Math.cos(angleRad);

                const toMouseX = e.clientX - planetX;
                const toMouseY = e.clientY - planetY;
                const toMouseMag = Math.sqrt(toMouseX * toMouseX + toMouseY * toMouseY);
                if (toMouseMag === 0) return;
                const toMouseNormX = toMouseX / toMouseMag;
                const toMouseNormY = toMouseY / toMouseMag;

                const dotProduct = velocityX * toMouseNormX + velocityY * toMouseNormY;
                
                const maxSpeed = 2.5;
                const minSpeed = 0.25;
                const speedFactor = minSpeed + (maxSpeed - minSpeed) * (dotProduct + 1) / 2;
                orbitEl.style.animationDuration = `${orbit.baseSpeed / speedFactor}s`;

                let pullX = 0;
                let pullY = 0;
                const pullRadius = 400;
                if (toMouseMag < pullRadius) {
                    const pullStrength = (1 - toMouseMag / pullRadius) * 20;
                    pullX = toMouseNormX * pullStrength;
                    pullY = toMouseNormY * pullStrength;
                }
                planetEl.style.transform = `translate(calc(-50% + ${pullX}px), calc(-50% + ${pullY}px))`;
            });
        };

        const resetSpeeds = () => {
            if (orbit1Ref.current) orbit1Ref.current.style.animationDuration = `${baseSpeeds.current.orbit1}s`;
            if (orbit2Ref.current) orbit2Ref.current.style.animationDuration = `${baseSpeeds.current.orbit2}s`;
            document.querySelectorAll('.orbit-planet').forEach(el => {
                (el as HTMLElement).style.transform = 'translate(-50%, -50%)';
            });
        };

        if (isActive) {
            window.addEventListener('mousemove', handleMouseMove);
            document.body.addEventListener('mouseleave', resetSpeeds);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            document.body.removeEventListener('mouseleave', resetSpeeds);
        };
    }, [isActive]);

    if (!isActive) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black animate-in fade-in duration-1000">
            <div className="absolute inset-0 overflow-hidden">
                {stars.map(star => (
                    <div key={star.id} className="star" style={{ left: star.x, top: star.y, width: star.size, height: star.size, animationDelay: star.animationDelay, ['--start-opacity' as any]: star.opacity }} />
                ))}
            </div>

            <div className="relative w-full h-full flex justify-center items-center">
                <div className="planet-container text-center cursor-pointer group z-10" onClick={() => onSelectPlanet('chat')}>
                    <div className="w-64 h-64 relative flex items-center justify-center">
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-zinc-300 to-zinc-800 border-4 border-white/50" style={{ animation: 'pulse-glow 4s ease-in-out infinite' }}></div>
                        <img src="/nexus-logo.png" alt="Nexus Logo" className="w-32 h-32 opacity-90 relative z-10" style={{ filter: 'grayscale(100%) brightness(1.5)' }} />
                    </div>
                    <h3 className="mt-6 text-2xl font-bold text-white tracking-wider group-hover:text-zinc-100 transition-colors">Nexus Chat</h3>
                    <p className="text-md text-zinc-300">Advanced Reasoning Engine</p>
                </div>

                <div ref={orbit1Ref} className="orbit" style={{ width: 'clamp(300px, 80vw, 900px)', height: 'clamp(150px, 40vw, 450px)' }}>
                    <div className="orbit-planet">
                         <div className="planet-container text-center cursor-pointer group" onClick={() => onSelectPlanet('https://veoaifree.com/veo-video-generator/')}>
                            <div className="w-48 h-48 relative flex items-center justify-center">
                                <div className="absolute inset-0 rounded-full overflow-hidden shadow-2xl border-2 border-white/20"><div className="absolute inset-0 bg-gradient-to-br from-white via-zinc-400 to-black" style={{ backgroundSize: '200% 200%', animation: 'swirl 25s linear infinite' }}></div></div>
                                <div className="absolute w-[180%] h-[180%] border-2 border-white/30 rounded-full transform rotate-[-30deg] scale-y-[0.3]"></div>
                                <div className="absolute w-[180%] h-[180%] border border-white/20 rounded-full transform rotate-[-30deg] scale-y-[0.3] scale-x-[0.95]"></div>
                                <svg className="w-16 h-16 text-white opacity-80 relative z-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>
                            </div>
                            <h3 className="mt-8 text-lg font-bold text-white tracking-wider group-hover:text-zinc-100 transition-colors">Video Generator</h3>
                            <p className="text-sm text-zinc-400">Create with VEO AI</p>
                        </div>
                    </div>
                </div>

                 <div ref={orbit2Ref} className="orbit" style={{ width: 'clamp(450px, 95vw, 1200px)', height: 'clamp(225px, 50vw, 600px)', animationDirection: 'reverse' }}>
                    <div className="orbit-planet">
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