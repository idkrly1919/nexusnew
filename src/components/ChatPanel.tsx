import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Message } from '../types';
import { streamGemini } from '../services/geminiService';
import { useSession } from '../contexts/SessionContext';
import { ThinkingProcess } from './ThinkingProcess';

interface ChatPanelProps {
    onBuild: (files: { path: string; content: string }[]) => void;
    onInitialFile: (file: { path: string; content: string }) => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ onBuild, onInitialFile }) => {
    const { profile } = useSession();
    const navigate = useNavigate();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [attachedFiles, setAttachedFiles] = useState<{id: string, name: string, content: string, type: string}[]>([]);
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const initialFileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handleBuildCommand = (responseText: string) => {
        const codeBlockRegex = /```(?:\w+)?\n\/\/ path: ([\w\/\.-]+)\n([\s\S]*?)```/g;
        const matches = [...responseText.matchAll(codeBlockRegex)];
        
        if (matches.length === 0) {
            // No files to build, maybe it was just a chat message
            return;
        }

        const filesToBuild = matches.map(match => ({ path: match[1].trim(), content: match[2].trim() }));
        onBuild(filesToBuild);

        setMessages(prev => [...prev, { id: `build-start-${Date.now()}`, role: 'system', text: "Build process initiated..." }]);
        
        filesToBuild.forEach((file, index) => {
            setTimeout(() => {
                setMessages(prev => [...prev, { id: `build-file-${index}`, role: 'system', text: `✅ Created file: ${file.path}` }]);
            }, (index + 1) * 700);
        });

        setTimeout(() => {
            setMessages(prev => [...prev, { id: `build-end-${Date.now()}`, role: 'system', text: "Build complete! Preview updated." }]);
        }, (filesToBuild.length + 1) * 700);
    };

    const processSubmission = async (userText: string) => {
        if (isLoading || (!userText.trim() && attachedFiles.length === 0)) return;

        setIsLoading(true);
        setInputValue('');
        const userMessage: Message = { id: `user-${Date.now()}`, role: 'user', text: userText };
        setMessages(prev => [...prev, userMessage]);
        
        const controller = new AbortController();
        abortControllerRef.current = controller;

        const devSystemPrompt = "You are an expert AI web developer... Your instructions are the same, but now you can receive images. The user might send a screenshot of a bug, a design mockup, or an asset. Use this visual context to inform your code generation.";

        try {
            const devHistory = messages
                .filter(m => m.role === 'user' || m.role === 'assistant')
                .map(m => ({ role: m.role as 'user' | 'assistant', content: m.text }));

            const filesToProcess = [...attachedFiles];
            setAttachedFiles([]);

            const stream = streamGemini(devSystemPrompt + "\n\nUser Request: " + userText, devHistory, false, 'formal', 'img4', filesToProcess, controller.signal, profile?.first_name, []);
            
            let assistantMessageExists = false;
            let accumulatedText = "";
            const aiMsgId = `ai-${Date.now()}`;

            for await (const update of stream) {
                if (!assistantMessageExists) {
                    setMessages(prev => [...prev, { id: aiMsgId, role: 'assistant', text: '' }]);
                    assistantMessageExists = true;
                }
                if (update.text) {
                    accumulatedText = update.text;
                    setMessages(prev => prev.map(msg => msg.id === aiMsgId ? { ...msg, text: accumulatedText } : msg));
                }
                if (update.isComplete) {
                    handleBuildCommand(accumulatedText);
                }
            }
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                setMessages(prev => [...prev, { id: `error-${Date.now()}`, role: 'assistant', text: `**System Error:** ${err.message}` }]);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        processSubmission(inputValue);
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
                setMessages([{ id: `system-${Date.now()}`, role: 'system', text: `Started with file: ${file.name}` }]);
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
                        <div className={`max-w-xs md:max-w-md p-3 rounded-2xl ${msg.role === 'user' ? 'bg-indigo-600 text-white' : msg.role === 'system' ? 'bg-transparent text-green-400 text-sm font-mono' : 'bg-zinc-800'}`}>
                            {msg.text}
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