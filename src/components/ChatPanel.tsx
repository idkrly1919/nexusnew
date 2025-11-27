import React, { useState, useRef, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Message } from '../types';
import { ThinkingProcess } from './ThinkingProcess';
import JSZip from 'jszip';

interface ChatPanelProps {
    messages: Message[];
    isLoading: boolean;
    onSubmit: (prompt: string, files: {id: string, name: string, content: string, type: string}[]) => void;
    onInitialProject: (files: { path: string; content: string }[]) => void;
    devStatus: string | null;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ messages, isLoading, onSubmit, onInitialProject, devStatus }) => {
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

    const handleProjectUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && (file.type === 'application/zip' || file.name.endsWith('.zip'))) {
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const content = event.target?.result as ArrayBuffer;
                    const jszip = new JSZip();
                    const zip = await jszip.loadAsync(content);
                    const files: { path: string; content: string }[] = [];
                    for (const filename in zip.files) {
                        if (!zip.files[filename].dir) {
                            const fileContent = await zip.files[filename].async('string');
                            files.push({ path: filename, content: fileContent });
                        }
                    }
                    onInitialProject(files);
                } catch (error) {
                    console.error("Error reading zip file:", error);
                    alert("Could not read the zip file. Please ensure it's a valid format.");
                }
            };
            reader.readAsArrayBuffer(file);
        } else {
            alert('Please upload a valid .zip file.');
        }
    };

    return (
        <div className="order-2 md:order-1 w-full h-1/2 md:w-3/8 md:max-w-lg md:h-full flex flex-col bg-black/30 md:border-r border-t md:border-t-0 border-white/10 shrink-0">
            <header className="h-16 flex items-center justify-between px-6 shrink-0 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <button onClick={() => navigate('/chat')} className="p-2 hover:bg-white/5 rounded-full text-zinc-400 hover:text-white transition-colors" title="Back to Chat">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
                    </button>
                    <span className="font-semibold text-sm tracking-wide text-zinc-300">AI Developer</span>
                </div>
                <button onClick={() => initialFileInputRef.current?.click()} className="text-xs bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-full font-medium">Upload .zip</button>
                <input type="file" ref={initialFileInputRef} onChange={handleProjectUpload} className="hidden" accept=".zip,application/zip" />
            </header>
            <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-hide">
                {messages.map(msg => (
                    <div key={msg.id} className={`flex items-start gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                        {msg.role === 'assistant' && <img src="/quillix-logo.png" className="w-7 h-7 rounded-full" />}
                        <div data-liquid-glass className={`max-w-xs md:max-w-md p-3 rounded-2xl prose prose-invert prose-sm max-w-none ${msg.role === 'user' ? 'light-liquid-glass text-white' : msg.role === 'system' ? 'bg-transparent text-green-400 font-mono' : 'dark-liquid-glass'}`}>
                           <div dangerouslySetInnerHTML={{ __html: msg.text.replace(/\n/g, '<br/>') }} />
                        </div>
                    </div>
                ))}
                {isLoading && <div className="flex items-start gap-3"><img src="/quillix-logo.png" className="w-7 h-7 rounded-full" /><div data-liquid-glass className="p-3 dark-liquid-glass rounded-2xl"><ThinkingProcess isThinking devStatus={devStatus} /></div></div>}
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