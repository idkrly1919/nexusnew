import React from 'react';

interface DynamicBackgroundProps {
    status: 'idle' | 'loading-text' | 'loading-image';
}

const DynamicBackground: React.FC<DynamicBackgroundProps> = ({ status }) => {
    // We rely on CSS variables defined in index.html for colors to handle theming automatically
    
    return (
        <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none transition-opacity duration-1000">
            <div className={`absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] orb orb-1 animate-[spin-slow_20s_linear_infinite] opacity-40`} 
                 style={{ animationDuration: status === 'idle' ? '40s' : '10s' }} />
            
            <div className={`absolute top-[40%] right-[-10%] w-[40vw] h-[40vw] orb orb-2 animate-[pulse_10s_ease-in-out_infinite] opacity-30`}
                 style={{ animationDelay: '2s' }} />
                 
            <div className={`absolute bottom-[-10%] left-[20%] w-[60vw] h-[60vw] orb orb-3 animate-[bounce_30s_infinite] opacity-30`} 
                 style={{ animationDuration: status === 'idle' ? '30s' : '8s' }} />
                 
            <div className="absolute inset-0 backdrop-blur-[80px]" />
        </div>
    );
};

export default DynamicBackground;