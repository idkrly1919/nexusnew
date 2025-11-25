import { useState, useEffect, useRef } from 'react';

interface Star {
    id: string;
    cx: string;
    r: number;
    animationDelay: string;
    animationDuration: string;
}

const generateStars = (count: number, size: number, minDuration: number, maxDuration: number): Star[] => {
    return Array.from({ length: count }).map((_, i) => ({
        id: `star-${size}-${i}`,
        cx: `${Math.random() * 100}%`,
        r: Math.random() * size + 0.5,
        animationDelay: `${Math.random() * maxDuration}s`,
        animationDuration: `${Math.random() * (maxDuration - minDuration) + minDuration}s`,
    }));
};

const Starfield = () => {
    const [stars1] = useState(() => generateStars(300, 0.8, 20, 30)); // Small, distant stars (slowest)
    const [stars2] = useState(() => generateStars(150, 1.2, 15, 25)); // Medium stars
    const [stars3] = useState(() => generateStars(50, 1.8, 8, 15));  // Large, close stars (fastest)
    const layer1Ref = useRef<SVGGElement>(null);
    const layer2Ref = useRef<SVGGElement>(null);
    const layer3Ref = useRef<SVGGElement>(null);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const { clientX, clientY } = e;
            const width = window.innerWidth;
            const height = window.innerHeight;

            const moveX = (clientX - width / 2) / (width / 2);
            const moveY = (clientY - height / 2) / (height / 2);

            if (layer1Ref.current) {
                layer1Ref.current.style.transform = `translate(${moveX * -5}px, ${moveY * -5}px)`;
            }
            if (layer2Ref.current) {
                layer2Ref.current.style.transform = `translate(${moveX * -15}px, ${moveY * -15}px)`;
            }
            if (layer3Ref.current) {
                layer3Ref.current.style.transform = `translate(${moveX * -30}px, ${moveY * -30}px)`;
            }
        };

        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, []);

    const renderStars = (stars: Star[]) => {
        return stars.map(star => (
            <circle 
                key={star.id} 
                cx={star.cx} 
                cy="-1" 
                r={star.r} 
                fill="white" 
                className="twinkle star-fall-animation" 
                style={{ 
                    animationDelay: star.animationDelay, 
                    animationDuration: star.animationDuration,
                    opacity: Math.random() * 0.7 + 0.3 
                }} 
            />
        ));
    };

    return (
        <div className="fixed inset-0 z-0 overflow-hidden bg-black">
            <svg className="absolute inset-0 w-full h-full">
                <g ref={layer1Ref} className="transition-transform duration-500 ease-out">
                    {renderStars(stars1)}
                </g>
                <g ref={layer2Ref} className="transition-transform duration-500 ease-out">
                    {renderStars(stars2)}
                </g>
                <g ref={layer3Ref} className="transition-transform duration-500 ease-out">
                    {renderStars(stars3)}
                </g>
            </svg>
        </div>
    );
};

export default Starfield;