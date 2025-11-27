import React from 'react';

const BuildingStatus: React.FC = () => {
    const blockCommonClass = "absolute w-[36.4%] h-[25.8%] bg-zinc-500";
    const animationCommonClass = "animate-fly-in opacity-0";

    return (
        <div className="absolute inset-0 bg-zinc-900/80 backdrop-blur-sm flex flex-col items-center justify-center text-center animate-in fade-in duration-300">
            <style>
                {`
                @keyframes fly-in-1 { 0% { transform: translate(-100px, -100px) scale(0.5); opacity: 0; } 60%, 100% { transform: translate(0, 0) scale(1); opacity: 1; } }
                @keyframes fly-in-2 { 0% { transform: translate(100px, -100px) scale(0.5); opacity: 0; } 60%, 100% { transform: translate(0, 0) scale(1); opacity: 1; } }
                @keyframes fly-in-3 { 0% { transform: translate(0, 0) scale(0.5); opacity: 0; } 60%, 100% { transform: translate(0, 0) scale(1); opacity: 1; } }
                @keyframes fly-in-4 { 0% { transform: translate(-100px, 100px) scale(0.5); opacity: 0; } 60%, 100% { transform: translate(0, 0) scale(1); opacity: 1; } }
                @keyframes fly-in-5 { 0% { transform: translate(100px, 100px) scale(0.5); opacity: 0; } 60%, 100% { transform: translate(0, 0) scale(1); opacity: 1; } }
                .animate-fly-in { animation-duration: 2s; animation-timing-function: cubic-bezier(0.2, 0.8, 0.2, 1); animation-fill-mode: forwards; }
                `}
            </style>
            <div className="relative w-16 h-16 mb-4">
                <div className={`${blockCommonClass} top-0 left-[6.8%] ${animationCommonClass}`} style={{ animationName: 'fly-in-1', animationDelay: '0s' }}></div>
                <div className={`${blockCommonClass} top-0 right-[6.8%] ${animationCommonClass}`} style={{ animationName: 'fly-in-2', animationDelay: '0.1s' }}></div>
                <div className={`${blockCommonClass} top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[38.2%] ${animationCommonClass}`} style={{ animationName: 'fly-in-3', animationDelay: '0.2s' }}></div>
                <div className={`${blockCommonClass} bottom-0 left-[6.8%] ${animationCommonClass}`} style={{ animationName: 'fly-in-4', animationDelay: '0.3s' }}></div>
                <div className={`${blockCommonClass} bottom-0 right-[6.8%] ${animationCommonClass}`} style={{ animationName: 'fly-in-5', animationDelay: '0.4s' }}></div>
            </div>
            <h3 className="text-xl font-bold text-zinc-200">Building...</h3>
            <p className="text-zinc-400">Preview will appear when the agent is done working</p>
        </div>
    );
};

export default BuildingStatus;