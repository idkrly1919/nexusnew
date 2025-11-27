import React from 'react';

interface BuildingStatusProps {
    status: 'thinking' | 'building';
}

const BuildingStatus: React.FC<BuildingStatusProps> = ({ status }) => {
    const text = status === 'thinking' ? 'Thinking...' : 'Building...';
    return (
        <div className="absolute inset-0 bg-zinc-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-center animate-in fade-in duration-300">
            <div className="w-16 h-16 mb-4 text-zinc-500">
                <svg viewBox="0 0 100 100" fill="currentColor">
                    <path d="M43.2,0H6.8C3.1,0,0,3.1,0,6.8v19c0,3.8,3.1,6.8,6.8,6.8h36.4c3.8,0,6.8-3.1,6.8-6.8v-19C50,3.1,46.9,0,43.2,0z"/>
                    <path d="M93.2,0H56.8C53.1,0,50,3.1,50,6.8v19c0,3.8,3.1,6.8,6.8,6.8h36.4c3.8,0,6.8-3.1,6.8-6.8v-19C100,3.1,96.9,0,93.2,0z"/>
                    <path d="M69.1,37.5H30.9c-3.8,0-6.8,3.1-6.8,6.8v19c0,3.8,3.1,6.8,6.8,6.8h38.2c3.8,0,6.8-3.1,6.8-6.8v-19 C75.9,40.6,72.9,37.5,69.1,37.5z"/>
                    <path d="M43.2,75H6.8C3.1,75,0,78.1,0,81.8v11.4C0,96.9,3.1,100,6.8,100h36.4c3.8,0,6.8-3.1,6.8-6.8V81.8 C50,78.1,46.9,75,43.2,75z"/>
                    <path d="M93.2,75H56.8c-3.8,0-6.8,3.1-6.8,6.8v11.4c0,3.8,3.1,6.8,6.8,6.8h36.4c3.8,0,6.8-3.1,6.8-6.8V81.8 C100,78.1,96.9,75,93.2,75z"/>
                </svg>
            </div>
            <h3 className="text-xl font-bold text-zinc-200">{text}</h3>
            <p className="text-zinc-400">Preview will appear when the agent is done working</p>
        </div>
    );
};

export default BuildingStatus;