import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import OpenAI from 'openai';
import { Message, ChatHistory, PersonalityMode, Conversation, Role, Persona } from '../types';
import { streamGemini, summarizeHistory } from '../services/geminiService';
import { ThinkingProcess } from './ThinkingProcess';
import { useSession } from '../contexts/SessionContext';
import { supabase } from '../integrations/supabase/client';
import DynamicBackground from './DynamicBackground';
import EmbeddedView from './EmbeddedView';
import VoiceInputView from './VoiceInputView';
import FileGenerator from './FileGenerator';
import FileIcon from './FileIcon';
import PersonaManager from './PersonaManager';
import WeatherWidget from './widgets/WeatherWidget';
import StockWidget from './widgets/StockWidget';
import Whiteboard from './widgets/Whiteboard';
import { motion, AnimatePresence } from 'framer-motion';

const ChatView: React.FC = () => {
    const { session, profile, refreshProfile } = useSession();
    const { conversationId: paramConversationId } = useParams<{ conversationId?: string }>();
    const navigate = useNavigate();

    // State
    const [messages, setMessages] = useState<Message[]>([]);
    const [chatHistory, setChatHistory] = useState<ChatHistory>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [thinkingMode, setThinkingMode] = useState<'reasoning' | 'image'>('reasoning');
    
    // UI State
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showPersonaManager, setShowPersonaManager] = useState(false);
    const [showWhiteboard, setShowWhiteboard] = useState(false);
    
    // Preferences
    const [personality, setPersonality] = useState<PersonalityMode>('conversational');
    const [imageModelPref, setImageModelPref] = useState(profile?.image_model_preference || 'img4');
    
    // Files & Attachments
    const [attachedFiles, setAttachedFiles] = useState<{id: string, name: string, content: string, type: string}[]>([]);
    const [isDragging, setIsDragging] = useState(false);

    // Data
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [personas, setPersonas] = useState<Persona[]>([]);
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
    const [activePersona, setActivePersona] = useState<Persona | null>(null);
    const [expandedPersonas, setExpandedPersonas] = useState<Record<string, boolean>>({});
    
    // Modes
    const [isVoiceMode, setIsVoiceMode] = useState(false);
    const [embeddedUrl, setEmbeddedUrl] = useState<string | null>(null);
    
    const [personalizationEntries, setPersonalizationEntries] = useState<{id: string, entry: string}[]>([]);

    // Refs
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const avatarFileRef = useRef<HTMLInputElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    // --- Effects & Data Fetching ---

    const fetchData = async () => {
        if (!session) {
            setIsDataLoading(false);
            return;
        }
        setIsDataLoading(true);
        const { data: convos } = await supabase.from('conversations').select('*').order('updated_at', { ascending: false });
        if (convos) setConversations(convos as Conversation[]);

        const { data: personasData } = await supabase.from('personas').select('*').order('created_at', { ascending: false });
        if (personasData) setPersonas(personasData as Persona[]);
        
        setIsDataLoading(false);
    };

    useEffect(() => { fetchData(); }, [session]);

    useEffect(() => {
        setCurrentConversationId(paramConversationId || null);
        if (!paramConversationId) setActivePersona(null);
    }, [paramConversationId]);

    useEffect(() => {
        if (profile?.image_model_preference) setImageModelPref(profile.image_model_preference);
    }, [profile]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    // Load Conversation Messages
    useEffect(() => {
        if (!currentConversationId || !session) {
            setMessages([]);
            setChatHistory([]);
            return;
        }
        const fetchMessages = async () => {
            const { data } = await supabase.from('messages').select('*').eq('conversation_id', currentConversationId).order('created_at', { ascending: true });
            if (data) {
                const currentConvo = conversations.find(c => c.id === currentConversationId);
                if (currentConvo?.persona_id) {
                    const persona = personas.find(p => p.id === currentConvo.persona_id);
                    setActivePersona(persona || null);
                } else {
                    setActivePersona(null);
                }
                setMessages(data.map((msg: any) => ({ id: msg.id, role: msg.role as Role, text: msg.content })));
                setChatHistory(data.map((msg: any) => ({ role: msg.role, content: msg.content })));
            }
        };
        fetchMessages();
    }, [currentConversationId, session, conversations, personas]);


    // --- Handlers ---

    const processSubmission = async (userText: string) => {
        if (isLoading || (!userText.trim() && attachedFiles.length === 0)) return;

        // Special Command: Weather
        if (userText.toLowerCase().includes('weather')) {
             const userMsg: Message = { id: `user-${Date.now()}`, role: 'user', text: userText };
             const aiMsg: Message = { id: `ai-${Date.now()}`, role: 'assistant', text: '<WIDGET_WEATHER />' };
             setMessages(prev => [...prev, userMsg, aiMsg]);
             setInputValue('');
             return;
        }
        
        // Special Command: Stock
        if (userText.toLowerCase().includes('stock') || userText.toLowerCase().includes('price of')) {
             const userMsg: Message = { id: `user-${Date.now()}`, role: 'user', text: userText };
             const symbol = userText.toUpperCase().match(/(?:NVDA|AAPL|TSLA|MSFT|GOOGL|AMZN|BTC|ETH)/)?.[0] || 'NVDA';
             const aiMsg: Message = { id: `ai-${Date.now()}`, role: 'assistant', text: `<WIDGET_STOCK symbol="${symbol}" />` };
             setMessages(prev => [...prev, userMsg, aiMsg]);
             setInputValue('');
             return;
        }

        setIsLoading(true);
        setInputValue('');
        if (textareaRef.current) textareaRef.current.style.height = '52px';

        // Prepare User Message
        let userDisplay = userText;
        if (attachedFiles.length > 0) {
            userDisplay += `\n[Attached ${attachedFiles.length} file(s)]`;
        }
        const userMessage: Message = { id: `user-${Date.now()}`, role: 'user', text: userDisplay };
        setMessages(prev => [...prev, userMessage]);

        // Conversation Logic
        let conversationId = currentConversationId;
        if (session && !conversationId) {
            const { data: newConvo } = await supabase.from('conversations').insert({ 
                user_id: session.user.id, 
                title: "New Conversation",
                persona_id: activePersona?.id || null,
            }).select().single();
            if (newConvo) {
                conversationId = newConvo.id;
                setConversations(prev => [newConvo as Conversation, ...prev]);
                navigate(`/chat/${conversationId}`, { replace: true });
            }
        }

        if (session && conversationId) {
            await supabase.from('messages').insert({ conversation_id: conversationId, user_id: session.user.id, role: 'user', content: userText });
        }

        // Streaming
        const controller = new AbortController();
        abortControllerRef.current = controller;
        const filesToProcess = [...attachedFiles];
        setAttachedFiles([]);

        try {
            const stream = streamGemini(userText, chatHistory, true, personality, imageModelPref, filesToProcess, controller.signal, profile?.first_name, [], activePersona?.instructions || null);
            let aiMsgId = `ai-${Date.now()}`;
            let hasStarted = false;
            let accText = "";

            for await (const update of stream) {
                if (update.mode) setThinkingMode(update.mode);
                if (!hasStarted) {
                    setMessages(prev => [...prev, { id: aiMsgId, role: 'assistant', text: '' }]);
                    hasStarted = true;
                }
                if (update.text) {
                    accText = update.text;
                    setMessages(prev => prev.map(m => m.id === aiMsgId ? { ...m, text: accText } : m));
                }
                if (update.isComplete) {
                     if (session && conversationId) {
                        await supabase.from('messages').insert({ conversation_id: conversationId, user_id: session.user.id, role: 'assistant', content: accText });
                    }
                }
            }
        } catch (error: any) {
            if (error.name !== 'AbortError') {
                setMessages(prev => [...prev, { id: `err-${Date.now()}`, role: 'assistant', text: `Error: ${error.message}` }]);
            }
        } finally {
            setIsLoading(false);
            abortControllerRef.current = null;
        }
    };

    // --- Render Helpers ---

    const renderMessageContent = (text: string) => {
        if (text.includes('<WIDGET_WEATHER />')) return <WeatherWidget />;
        if (text.includes('<WIDGET_STOCK')) {
            const match = text.match(/symbol="([^"]+)"/);
            return <StockWidget symbol={match ? match[1] : undefined} />;
        }
        
        // Simple file block parser
        const parts = text.split(/(```[\s\S]*?```)/g);
        return parts.map((part, i) => {
            if (part.startsWith('```')) {
                const match = part.match(/```(\w+)\n([\s\S]*?)```/);
                if (match) {
                     // Check if it's our file generation format
                     const content = match[2];
                     const fileMatch = content.match(/filename:\s*(.*?)\n---\n([\s\S]*)/);
                     if (fileMatch) {
                         return <FileGenerator key={i} fileType={match[1]} filename={fileMatch[1]} content={fileMatch[2]} />;
                     }
                     return <pre key={i} className="bg-black/40 p-4 rounded-xl overflow-x-auto text-sm font-mono my-4 border border-white/5"><code className="text-zinc-300">{match[2]}</code></pre>;
                }
            }
            // Image handling
            if (part.match(/!\[.*?\]\(.*?\)/)) {
                 const imgMatch = part.match(/!\[(.*?)\]\((.*?)\)/);
                 if (imgMatch) {
                     return (
                         <div key={i} className="my-4 rounded-2xl overflow-hidden border border-white/10 shadow-2xl relative group">
                             <img src={imgMatch[2]} alt={imgMatch[1]} className="w-full h-auto" />
                             <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                 <a href={imgMatch[2]} download className="p-3 bg-white text-black rounded-full hover:scale-110 transition-transform">
                                     <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                 </a>
                             </div>
                         </div>
                     );
                 }
            }
            return <div key={i} className="whitespace-pre-wrap leading-relaxed text-zinc-300" dangerouslySetInnerHTML={{ __html: part.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>').replace(/\n/g, '<br/>') }} />;
        });
    };

    // --- Components ---

    return (
        <div id="chat-view" className="fixed inset-0 z-50 flex bg-[#09090b] text-zinc-100 font-sans overflow-hidden">
            {/* Background */}
            <div className="absolute inset-0 pointer-events-none z-0">
                 <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/10 blur-[120px]" />
                 <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-900/10 blur-[120px]" />
            </div>

            {showWhiteboard && <Whiteboard onClose={() => setShowWhiteboard(false)} />}
            <PersonaManager isOpen={showPersonaManager} onClose={() => setShowPersonaManager(false)} onPersonaUpdate={fetchData} />

            {/* Sidebar */}
            <motion.div 
                initial={false}
                animate={{ width: isSidebarOpen ? 280 : 0, opacity: isSidebarOpen ? 1 : 0 }}
                className="h-full border-r border-white/5 bg-[#0c0c0e] flex-shrink-0 overflow-hidden relative z-20"
            >
                <div className="w-[280px] h-full flex flex-col">
                    <div className="h-16 flex items-center px-4 border-b border-white/5">
                        <div className="font-brand font-bold text-lg tracking-tight flex items-center gap-2">
                             <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
                                 <img src="/quillix-logo.png" className="w-5 h-5" />
                             </div>
                             Quillix
                        </div>
                    </div>
                    
                    <div className="p-4 space-y-2">
                        <button onClick={() => { navigate('/chat'); setCurrentConversationId(null); setMessages([]); if(window.innerWidth < 768) setIsSidebarOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 bg-white text-black rounded-xl font-medium hover:bg-zinc-200 transition-colors shadow-lg shadow-white/5">
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                            New Chat
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto px-2 py-2 space-y-4">
                        {/* Personas Section */}
                        <div>
                             <div className="flex items-center justify-between px-4 mb-2">
                                 <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Personas</span>
                                 <button onClick={() => setShowPersonaManager(true)} className="text-zinc-500 hover:text-white transition-colors text-xs">+</button>
                             </div>
                             <div className="space-y-1">
                                 {personas.map(p => (
                                     <button key={p.id} onClick={() => { setActivePersona(p); navigate('/chat'); setIsSidebarOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-white text-sm transition-colors text-left">
                                         <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-xs font-bold text-indigo-400">
                                             {p.name[0]}
                                         </div>
                                         {p.name}
                                     </button>
                                 ))}
                             </div>
                        </div>

                        {/* Recent Chats */}
                        <div>
                             <div className="px-4 mb-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Recent</div>
                             <div className="space-y-1">
                                 {conversations.map(c => (
                                     <button key={c.id} onClick={() => { navigate(`/chat/${c.id}`); if(window.innerWidth < 768) setIsSidebarOpen(false); }} className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-colors truncate ${currentConversationId === c.id ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-200'}`}>
                                         {c.title}
                                     </button>
                                 ))}
                             </div>
                        </div>
                    </div>
                    
                    {/* User Profile */}
                    {session && (
                        <div className="p-4 border-t border-white/5">
                            <div className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group" onClick={() => setShowSettings(true)}>
                                <img src={profile?.avatar_url || "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix"} className="w-9 h-9 rounded-full bg-zinc-800" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-medium text-white truncate">{profile?.first_name || 'User'}</div>
                                    <div className="text-xs text-zinc-500">Free Plan</div>
                                </div>
                                <svg className="w-4 h-4 text-zinc-500 group-hover:text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                            </div>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col relative z-10 h-full">
                
                {/* Header */}
                <header className="h-16 flex items-center justify-between px-6 shrink-0 z-20">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition-colors">
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
                        </button>
                        <span className="font-medium text-zinc-200">{activePersona ? activePersona.name : (currentConversationId ? conversations.find(c => c.id === currentConversationId)?.title : 'New Chat')}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={() => setShowWhiteboard(true)} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-full text-xs font-medium text-zinc-300 transition-colors">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                            Whiteboard
                        </button>
                    </div>
                </header>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto px-4 py-6 scrollbar-hide">
                    <div className="max-w-3xl mx-auto space-y-8">
                        {messages.length === 0 ? (
                            <div className="mt-20 text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                                <div className="inline-flex items-center justify-center w-20 h-20 rounded-[2rem] bg-gradient-to-br from-indigo-500 to-purple-600 shadow-2xl shadow-indigo-500/20 mb-4">
                                    <img src="/quillix-logo.png" className="w-10 h-10 invert brightness-0" />
                                </div>
                                <h1 className="text-3xl font-bold text-white tracking-tight">How can I help you create?</h1>
                                
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-2xl mx-auto">
                                    {[
                                        { l: 'Weather', i: '☀️', a: () => processSubmission('Check the weather') },
                                        { l: 'Stock', i: '📈', a: () => processSubmission('Show me stock price of NVDA') },
                                        { l: 'Image', i: '🎨', a: () => { setInputValue('Generate an image of '); textareaRef.current?.focus(); } },
                                        { l: 'Code', i: '💻', a: () => navigate('/dev') },
                                    ].map((action, i) => (
                                        <button key={i} onClick={action.a} className="group p-4 rounded-3xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all text-left">
                                            <div className="text-2xl mb-2 group-hover:scale-110 transition-transform duration-300">{action.i}</div>
                                            <div className="text-sm font-medium text-zinc-300 group-hover:text-white">{action.l}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            messages.map((msg, idx) => (
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    key={msg.id} 
                                    className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : ''}`}
                                >
                                    {msg.role === 'assistant' && (
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex-shrink-0 flex items-center justify-center text-xs font-bold text-white shadow-lg shadow-indigo-500/20">
                                            Q
                                        </div>
                                    )}
                                    
                                    <div className={`max-w-[85%] ${msg.role === 'user' ? 'bg-zinc-800 text-white rounded-[20px] rounded-tr-sm px-5 py-3' : 'space-y-2'}`}>
                                        {renderMessageContent(msg.text)}
                                    </div>
                                </motion.div>
                            ))
                        )}
                        {isLoading && (
                            <div className="flex gap-4">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex-shrink-0 flex items-center justify-center text-xs font-bold text-white">Q</div>
                                <ThinkingProcess isThinking={true} mode={thinkingMode} />
                            </div>
                        )}
                        <div ref={messagesEndRef} className="h-24" />
                    </div>
                </div>

                {/* Input Area */}
                <div className="w-full max-w-3xl mx-auto px-4 pb-6 z-20">
                     <div className="relative rounded-[2rem] bg-[#18181b] border border-white/10 shadow-2xl shadow-black/50 transition-all focus-within:border-indigo-500/50 focus-within:shadow-indigo-500/10">
                         {attachedFiles.length > 0 && (
                             <div className="px-4 pt-4 flex gap-2 overflow-x-auto scrollbar-hide">
                                 {attachedFiles.map(f => (
                                     <div key={f.id} className="relative group shrink-0">
                                         <div className="w-16 h-16 rounded-xl bg-zinc-800 border border-white/10 flex items-center justify-center overflow-hidden">
                                             {f.type.startsWith('image') ? <img src={f.content} className="w-full h-full object-cover" /> : <FileIcon fileType={f.type} />}
                                         </div>
                                         <button onClick={() => setAttachedFiles(prev => prev.filter(x => x.id !== f.id))} className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"><svg className="w-3 h-3" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path d="M18 6L6 18M6 6l12 12"/></svg></button>
                                     </div>
                                 ))}
                             </div>
                         )}
                         <div className="flex items-end gap-2 p-2">
                             <button onClick={() => fileInputRef.current?.click()} className="p-3 text-zinc-400 hover:text-white hover:bg-white/5 rounded-full transition-colors">
                                 <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14M5 12h14"/></svg>
                             </button>
                             <textarea 
                                 ref={textareaRef}
                                 value={inputValue}
                                 onChange={e => setInputValue(e.target.value)}
                                 onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); processSubmission(inputValue); } }}
                                 placeholder="Ask anything..."
                                 rows={1}
                                 className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder-zinc-500 py-3 resize-none max-h-32"
                             />
                             {isLoading ? (
                                 <button onClick={() => abortControllerRef.current?.abort()} className="p-3 bg-zinc-800 text-white rounded-full hover:bg-zinc-700">
                                     <div className="w-3 h-3 bg-white rounded-sm" />
                                 </button>
                             ) : (
                                 <button 
                                     onClick={() => processSubmission(inputValue)}
                                     disabled={!inputValue.trim() && attachedFiles.length === 0}
                                     className="p-3 bg-white text-black rounded-full hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                 >
                                     <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                                 </button>
                             )}
                         </div>
                     </div>
                     <input type="file" ref={fileInputRef} className="hidden" multiple onChange={(e) => e.target.files && Array.from(e.target.files).forEach(f => { const r = new FileReader(); r.onload = (ev) => setAttachedFiles(p => [...p, { id: Math.random().toString(), name: f.name, content: ev.target?.result as string, type: f.type }]); r.readAsDataURL(f); })} />
                </div>
            </div>
        </div>
    );
};

export default ChatView;