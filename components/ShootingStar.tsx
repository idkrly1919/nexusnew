import { useState, useEffect } from 'react';

const getRandomPosition = () => {
    const side = Math.floor(Math.random() * 4);
    let top = '0px', left = '0px';
    // 0: top, 1: right, 2: bottom, 3: left
    switch (side) {
        case 0: // top edge
            top = '-2px';
            left = `${Math.random() * 100}vw`;
            break;
        case 1: // right edge
            top = `${Math.random() * 100}vh`;
            left = '100vw';
            break;
        case 2: // bottom edge
            top = '100vh';
            left = `${Math.random() * 100}vw`;
            break;
        case 3: // left edge
            top = `${Math.random() * 100}vh`;
            left = '-2px';
            break;
    }
    return { top, left };
};

const ShootingStar = () => {
    const [style, setStyle] = useState<React.CSSProperties>({});

    useEffect(() => {
        const resetStar = () => {
            const { top, left } = getRandomPosition();
            const duration = Math.random() * 3 + 2; // 2-5 seconds
            const delay = Math.random() * 10; // 0-10 seconds
            const angle = Math.random() * 60 + 210; // Pointing towards bottom-left quadrant

            setStyle({
                top,
                left,
                transform: `rotate(${angle}deg)`,
                animationDuration: `${duration}s`,
                animationDelay: `${delay}s`,
                animationName: 'shooting-star-fall',
            });

            setTimeout(resetStar, (duration + delay) * 1000);
        };

        resetStar();
    }, []);

    return <div className="shooting-star" style={style}></div>;
};

export default ShootingStar;