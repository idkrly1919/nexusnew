import React, { useState, useRef, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Message } from '../types';
import { ThinkingProcess } from './ThinkingProcess';

interface ChatPanelProps {
    messages: Message[];
    isLoading: boolean;
    onSubmit: (prompt: string, files: {id: string, name: string, content: string, type: string}[]) => void;
    onInitialFile: (file: { path: string; content: string }) => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ messages, isLoading, onSubmit, onInitialFile }) => {
    const navigate = useNavigate();
    const [inputValue, setInputValue] = useState('');
    const [attachedFiles, setAttachedFiles] = useState<{id: string, name: string, content: string, type: string}[]>([]);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const initialFileInputRef = useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        onSubmit(inputValue, attachedFiles);
        setInputValue('');
        setAttachedFiles([]);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const files = Array.from(e.target.files);
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (event) => {
                const content = event.target?.result as string;
                setAttachedFiles(prev => [...prev, { id: file.name, name: file.name, content, type: file.type }]);
            };
            reader.readAsDataURL(file);
        });
    };

    const handleInitialFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && file.type === 'text/html') {
            const reader = new FileReader();
            reader.onload = (event) => {
                const content = event.target?.result as string;
                onInitialFile({ path: file.name, content });
            };
            reader.readAsText(file);
        } else {
            alert('Please upload a valid HTML file.');
        }
    };

    return (
        <div className="w-1/3 max-w-lg h-full flex flex-col bg-black/30 border-r border-white/10">
            <header className="h-16 flex items-center justify-between px-6 shrink-0 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/chat')} className="p-2 hover:bg-white/5 rounded-full text-zinc-400 hover:text-white transition-colors" title="Back to Chat">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
                    </button>
                    <span className="font-semibold text-sm tracking-wide text-zinc-300">AI Developer</span>
                </div>
                <button onClick={() => initialFileInputRef.current?.click()} className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-full font-medium">Upload HTML</button>
                <input type="file" ref={initialFileInputRef} onChange={handleInitialFileChange} className="hidden" accept=".html" />
            </header>
            <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                        {msg.role === 'assistant' && <img src="/quillix-logo.png" className="w-7 h-7 rounded-full" />}
                        <div className={`max-w-xs md:max-w-md p-3 rounded-2xl prose prose-invert prose-sm max-w-none ${msg.role === 'user' ? 'bg-indigo-600 text-white' : msg.role === 'system' ? 'bg-transparent text-green-400 font-mono' : 'bg-zinc-800'}`}>
                           <div dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br/>') }} />
                        </div>
                    </div>
                ))}
                {isLoading && <div className="flex items-start gap-3"><img src="/quillix-logo.png" className="w-7 h-7 rounded-full" /><div className="p-3 bg-zinc-800 rounded-2xl"><ThinkingProcess isThinking /></div></div>}
                <div ref={messagesEndRef} />
            </div>
            <div className="p-4 border-t border-white/10">
                <form onSubmit={handleSubmit} className="relative">
                    <input type="text" value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder="e.g., 'Add a blue button to the page'" className="w-full bg-zinc-800/50 border border-zinc-700 rounded-full px-12 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                    <button type="button" onClick={() => fileInputRef.current?.click()} className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full text-zinc-400 hover:text-white hover:bg-white/10">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*" multiple />
                </form>
            </div>
        </div>
    );
};

export default ChatPanel;