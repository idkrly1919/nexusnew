import React from 'react';

interface DynamicBackgroundProps {
    status: 'idle' | 'loading-text' | 'loading-image';
}

const DynamicBackground: React.FC<DynamicBackgroundProps> = ({ status }) => {
    const orbCount = 10;
    const orbs = Array.from({ length: orbCount });

    return (
        <div className={`dynamic-background-container ${status}`}>
            {orbs.map((_, i) => (
                <div key={i} className={`orb orb-${i + 1}`} />
            ))}
        </div>
    );
};

export default DynamicBackground;