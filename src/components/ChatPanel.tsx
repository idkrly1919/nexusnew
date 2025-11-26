import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Message, Role } from '../types';
import { streamGemini } from '../services/geminiService';
import { useSession } from '../contexts/SessionContext';
import { supabase } from '../integrations/supabase/client';

interface ChatPanelProps {
    onBuild: (files: { path: string; content: string }[]) => void;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ onBuild }) => {
    const { session, profile } = useSession();
    const navigate = useNavigate();
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const processSubmission = async (userText: string) => {
        if (isLoading || !userText.trim()) return;

        if (userText.trim().toLowerCase() === '/build') {
            handleBuildCommand();
            return;
        }

        setIsLoading(true);
        setInputValue('');
        const userMessage: Message = { id: `user-${Date.now()}`, role: 'user', text: userText };
        setMessages(prev => [...prev, userMessage]);
        
        const controller = new AbortController();
        abortControllerRef.current = controller;

        const devSystemPrompt = "You are an expert AI web developer. Your task is to help the user build and modify a web application. When asked to create a file, respond ONLY with the file content inside a markdown code block. Include the file path as a comment at the top, like `// path: src/components/Button.tsx`. You can generate React components (tsx), TypeScript logic (ts), HTML, CSS, and Supabase Edge Functions (ts). You can also generate SQL for database migrations.";

        try {
            // We'll use a modified history for the dev environment to keep it focused
            const devHistory = messages.map(m => ({ role: m.role, content: m.text })).filter(m => m.role === 'user' || m.role === 'assistant');
            
            // Replace the last message content with our specialized system prompt
            const stream = streamGemini(devSystemPrompt + "\n\nUser Request: " + userText, devHistory, false, 'formal', 'img4', null, controller.signal, profile?.first_name, []);
            
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
            }
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                setMessages(prev => [...prev, { id: `error-${Date.now()}`, role: 'assistant', text: `**System Error:** ${err.message}` }]);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleBuildCommand = () => {
        const lastMessage = messages[messages.length - 1];
        if (!lastMessage || lastMessage.role !== 'assistant') {
            setMessages(prev => [...prev, { id: `err-${Date.now()}`, role: 'assistant', text: "Nothing to build. Please ask me to create a file first." }]);
            return;
        }

        const codeBlockRegex = /```(?:\w+)?\n\/\/ path: ([\w\/\.-]+)\n([\s\S]*?)```/g;
        const matches = [...lastMessage.text.matchAll(codeBlockRegex)];
        
        if (matches.length === 0) {
            setMessages(prev => [...prev, { id: `err-${Date.now()}`, role: 'assistant', text: "I couldn't find any code with a `// path:` comment to build." }]);
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

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        processSubmission(inputValue);
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
                <form onSubmit={handleSubmit}>
                    <input type="text" value={inputValue} onChange={e => setInputValue(e.target.value)} placeholder="e.g., 'Create a login form component'" className="w-full bg-zinc-800/50 border border-zinc-700 rounded-full px-5 py-3 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50" />
                </form>
                <p className="text-xs text-zinc-500 mt-2 text-center">Type <code className="bg-zinc-700 px-1 rounded">/build</code> to apply the AI's code changes.</p>
            </div>
        </div>
    );
};

export default ChatPanel;