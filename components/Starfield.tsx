import { useState, useEffect, useRef } from 'react';

const generateStars = (count: number, size: number) => {
    return Array.from({ length: count }).map((_, i) => ({
        id: `star-${size}-${i}`,
        cx: `${Math.random() * 100}%`,
        cy: `${Math.random() * 100}%`,
        r: Math.random() * size + 0.5,
    }));
};

const Starfield = () => {
    const [stars1] = useState(() => generateStars(300, 0.8)); // Small, distant stars
    const [stars2] = useState(() => generateStars(150, 1.2)); // Medium stars
    const [stars3] = useState(() => generateStars(50, 1.8));  // Large, close stars
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

    return (
        <div className="fixed inset-0 z-0 overflow-hidden bg-black">
            <svg className="absolute inset-0 w-full h-full">
                <g ref={layer1Ref} className="transition-transform duration-500 ease-out">
                    {stars1.map(star => (
                        <circle key={star.id} cx={star.cx} cy={star.cy} r={star.r} fill="white" className="twinkle" style={{ animationDelay: `${Math.random() * 5}s`, opacity: Math.random() * 0.5 + 0.2 }} />
                    ))}
                </g>
                <g ref={layer2Ref} className="transition-transform duration-500 ease-out">
                    {stars2.map(star => (
                        <circle key={star.id} cx={star.cx} cy={star.cy} r={star.r} fill="white" className="twinkle" style={{ animationDelay: `${Math.random() * 5}s`, opacity: Math.random() * 0.6 + 0.3 }} />
                    ))}
                </g>
                <g ref={layer3Ref} className="transition-transform duration-500 ease-out">
                    {stars3.map(star => (
                        <circle key={star.id} cx={star.cx} cy={star.cy} r={star.r} fill="white" className="twinkle" style={{ animationDelay: `${Math.random() * 5}s`, opacity: Math.random() * 0.7 + 0.4 }} />
                    ))}
                </g>
            </svg>
        </div>
    );
};

export default Starfield;