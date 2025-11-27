import React, { useState } from 'react';

const PersonaManager: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="my-2">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
            >
                <div className="flex items-center gap-3">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                    <span>My Personas</span>
                </div>
                <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            {isOpen && (
                <div className="pl-4 mt-2 space-y-2 border-l-2 border-zinc-700 ml-4 animate-pop-in">
                    {/* Persona list will go here */}
                    <p className="text-xs text-zinc-500 p-2">This feature is in development.</p>
                    <button className="w-full text-left text-xs text-indigo-400 hover:text-indigo-300 p-2 rounded-lg hover:bg-white/5">+ Create New Persona</button>
                </div>
            )}
        </div>
    );
};

export default PersonaManager;