import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { Message, ChatHistory, PersonalityMode, Conversation, Role } from '../types';
import { streamGemini } from '../services/geminiService';
import { ThinkingProcess } from './ThinkingProcess';
import { useSession } from '../src/contexts/SessionContext';
import { supabase } from '../src/integrations/supabase/client';
import SpeechVisualizer from './SpeechVisualizer';
import DynamicBackground from './DynamicBackground';
import CosmosView from './CosmosView';
import EmbeddedView from './EmbeddedView';
import AuthPage from '../src/pages/AuthPage';

const NexusIconSmall = () => (
    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/10 shadow-lg">
        <img src="/nexus-logo.png" alt="Nexus Logo" className="w-5 h-5" />
    </div>
);

const OrbLogo = () => (
    <div className="relative w-24 h-24 flex items-center justify-center mb-8">
        <div className="absolute inset-0 rounded-full bg-indigo-500 blur-2xl opacity-30"></div>
        <img src="/nexus-logo.png" alt="Nexus Logo" className="w-20 h-20 animate-spin-slow" />
    </div>
);

const ChatView: React.FC = () => {
    const { session, profile } = useSession();
    const [messages, setMessages] = useState<Message[]>([]);
    const [chatHistory, setChatHistory] = useState<ChatHistory>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [thinkingMode, setThinkingMode] = useState<'reasoning' | 'image'>('reasoning');
    
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [personality, setPersonality] = useState<PersonalityMode>('conversational');
    const [imageModelPref, setImageModelPref] = useState(profile?.image_model_preference || 'img4');
    
    const [attachedFile, setAttachedFile] = useState<{name: string, content: string, type: string} | null>(null);

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
    const [backgroundStatus, setBackgroundStatus] = useState<'idle' | 'loading-text' | 'loading-image'>('idle');

    const [cosmosViewActive, setCosmosViewActive] = useState(false);
    const [embeddedUrl, setEmbeddedUrl] = useState<string | null>(null);

    const [guestMessageCount, setGuestMessageCount] = useState(0);
    const [showLoginPrompt, setShowLoginPrompt] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const recognition = useRef<any>(null);
    const abortControllerRef = useRef<AbortController | null>(null);
    const transcriptRef = useRef('');
    const manualStop = useRef(false);
    const isListeningRef = useRef(false);

    useEffect(() => {
        if (profile?.image_model_preference) {
            setImageModelPref(profile.image_model_preference);
        }
    }, [profile]);

    const handleImageModelChange = async (model: string) => {
        setImageModelPref(model);
        if (session) {
            const { error } = await supabase
                .from('profiles')
                .update({ image_model_preference: model })
                .eq('id', session.user.id);
            if (error) console.error("Error updating image model preference:", error);
        }
    };

    useEffect(() => {
        if (session && showLoginPrompt) {
            setShowLoginPrompt(false);
        }
    }, [session, showLoginPrompt]);

    useEffect(() => {
        if (isLoading) {
            setBackgroundStatus(thinkingMode === 'image' ? 'loading-image' : 'loading-text');
        } else {
            setBackgroundStatus('idle');
        }
    }, [isLoading, thinkingMode]);

    useEffect(() => {
        transcriptRef.current = transcript;
    }, [transcript]);

    useEffect(() => {
        isListeningRef.current = isListening;
    }, [isListening]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages, isLoading]);

    useEffect(() => {
        const handleImageDownload = async (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const downloadButton = target.closest('.download-image-btn');

            if (downloadButton) {
                e.preventDefault();
                const imageUrl = downloadButton.getAttribute('href');
                if (imageUrl) {
                    let blobUrl: string | null = null;
                    try {
                        const { data, error } = await supabase.functions.invoke('proxy-download', {
                            body: { url: imageUrl },
                            // @ts-ignore
                            responseType: 'blob'
                        });

                        if (error) throw error;
                        if (!(data instanceof Blob)) throw new Error('Invalid response');

                        blobUrl = window.URL.createObjectURL(data);
                        const a = document.createElement('a');
                        a.style.display = 'none';
                        a.href = blobUrl;
                        
                        const filename = 'nexus-generated-image.png';
                        a.download = filename;
                        
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                    } catch (error) {
                        console.error('Proxy download failed, falling back to direct:', error);
                        window.open(imageUrl, '_blank');
                    } finally {
                        if (blobUrl) window.URL.revokeObjectURL(blobUrl);
                    }
                }
            }
        };
        const chatView = document.getElementById('chat-view');
        chatView?.addEventListener('click', handleImageDownload);
        return () => {
            chatView?.removeEventListener('click', handleImageDownload);
        };
    }, []);
    useEffect(() => {
        if (!session) return;
        const fetchConversations = async () => {
            const { data, error } = await supabase.from('conversations').select('*').order('created_at', { ascending: false });
            if (error) console.error('Error fetching conversations:', error);
            else setConversations(data as Conversation[]);
        };
        fetchConversations();
    }, [session]);
    useEffect(() => {
        if (!currentConversationId || !session) {
            setMessages([]);
            setChatHistory([]);
            return;
        }
        const fetchMessages = async () => {
            const { data, error } = await supabase.from('messages').select('*').eq('conversation_id', currentConversationId).order('created_at', { ascending: true });
            if (error) {
                console.error('Error fetching messages:', error);
            } else {
                const loadedMessages: Message[] = data.map((msg: { id: string; role: string; content: string; }) => ({ id: msg.id, role: msg.role as Role, text: msg.content }));
                setMessages(loadedMessages);
                const history: ChatHistory = data.map((msg: { role: 'user' | 'assistant'; content: string; }) => ({ role: msg.role as 'user' | 'assistant', content: msg.content }));
                setChatHistory(history);
            }
        };
        fetchMessages();
    }, [currentConversationId, session]);
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const setFile = (content: string) => setAttachedFile({ name: file.name, content, type: file.type });
        const reader = new FileReader();
        if (file.type.startsWith('image/')) {
            reader.onload = (event) => setFile(event.target?.result as string);
            reader.readAsDataURL(file);
        } else {
            reader.onload = (event) => setFile(event.target?.result as string);
            reader.readAsText(file);
        }
    };
    const triggerFileSelect = () => fileInputRef.current?.click();
    const removeFile = () => {
        setAttachedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };
    const submitTranscript = (text: string) => {
        if (recognition.current && isListeningRef.current) {
            manualStop.current = true;
            recognition.current.stop();
        }
        if (text.trim()) {
            processSubmission(text.trim());
        }
        setTranscript('');
    };
    useEffect(() => {
        if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            // @ts-ignore
            const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
            recognition.current = new SpeechRecognition();
            recognition.current.continuous = true;
            recognition.current.interimResults = true;
            recognition.current.lang = 'en-US';
            recognition.current.onstart = () => { manualStop.current = false; setIsListening(true); setTranscript(''); };
            recognition.current.onresult = (event: any) => {
                if (silenceTimer.current) clearTimeout(silenceTimer.current);
                const fullTranscript = Array.from(event.results).map((result: any) => result[0].transcript).join('');
                setTranscript(fullTranscript);
                silenceTimer.current = setTimeout(() => { if (transcriptRef.current.trim()) { submitTranscript(transcriptRef.current); } }, 3000);
            };
            recognition.current.onend = () => {
                if (silenceTimer.current) clearTimeout(silenceTimer.current);
                if (manualStop.current) { setIsListening(false); manualStop.current = false; return; }
                if (isListeningRef.current) { try { recognition.current.start(); } catch (e) { console.error("Could not restart recognition:", e); setIsListening(false); } } else { setIsListening(false); }
            };
            recognition.current.onerror = (event: any) => { console.error("Speech recognition error", event.error); if (silenceTimer.current) clearTimeout(silenceTimer.current); setIsListening(false); };
        }
    }, []);
    const startListening = () => { if (recognition.current && !isListening) { recognition.current.start(); } };
    const stopListening = () => { if (recognition.current && isListeningRef.current) { submitTranscript(transcriptRef.current); } };
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    useEffect(() => {
        const synth = window.speechSynthesis;
        if (synth) {
            const loadVoices = () => setVoices(synth.getVoices());
            synth.onvoiceschanged = loadVoices;
            loadVoices();
            return () => { synth.onvoiceschanged = null; };
        }
    }, []);
    const handleTTS = (text: string) => {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            const preferredVoiceNames = ['Daniel', 'Microsoft David - English (United States)', 'Google UK English Male', 'Alex'];
            let selectedVoice = null;
            for (const name of preferredVoiceNames) { selectedVoice = voices.find(v => v.name === name); if (selectedVoice) break; }
            if (!selectedVoice) { selectedVoice = voices.find(v => v.lang === 'en-US' && v.name.toLowerCase().includes('male')); }
            if (!selectedVoice) { selectedVoice = voices.find(v => v.lang === 'en-US'); }
            if (selectedVoice) { utterance.voice = selectedVoice; }
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            window.speechSynthesis.speak(utterance);
        }
    };
    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setIsLoading(false);
    };
    const processSubmission = async (userText: string) => {
        if (isLoading || (!userText.trim() && !attachedFile)) return;

        if (!session) {
            if (guestMessageCount >= 5) {
                setShowLoginPrompt(true);
                return;
            }
        }
        
        const imageKeywords = ['draw', 'paint', 'generate image', 'create an image', 'visualize', 'edit image', 'modify image', 'make an image'];
        const isImage = imageKeywords.some(k => userText.toLowerCase().includes(k));
        setThinkingMode(isImage ? 'image' : 'reasoning');
        setIsLoading(true);
        setInputValue('');

        if (textareaRef.current) textareaRef.current.style.height = '52px';
        let userDisplay = userText;
        if (attachedFile) {
            const isImg = attachedFile.type.startsWith('image/');
            const fileIcon = isImg ? `<img src="${attachedFile.content}" class="w-8 h-8 rounded object-cover border border-white/20" />` : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`;
            userDisplay = `${userText} <br/><div class="inline-flex items-center gap-2 mt-2 px-2 py-1 rounded-full bg-white/10 text-xs font-mono">${fileIcon}<span>${attachedFile.name}</span></div>`;
        }
        const userMessage: Message = { id: `user-${Date.now()}`, role: 'user', text: userDisplay };
        setMessages(prev => [...prev, userMessage]);
        
        let conversationId = currentConversationId;
        if (session && !conversationId) {
            const { data, error } = await supabase.from('conversations').insert({ user_id: session.user.id, title: "New Chat" }).select().single();
            if (error) { console.error("Error creating conversation", error); setIsLoading(false); return; }
            conversationId = data.id;
            setCurrentConversationId(data.id);
            setConversations(prev => [data as Conversation, ...prev]);

            supabase.functions.invoke('generate-title', { body: { message: userText } })
                .then(({ data: titleData, error: titleError }) => {
                    if (!titleError && titleData.title) {
                        supabase.from('conversations').update({ title: titleData.title }).eq('id', conversationId!).then();
                        setConversations(prev => prev.map(c => c.id === conversationId ? { ...c, title: titleData.title } : c));
                    } else if (titleError) {
                        console.error('Error generating title:', titleError);
                    }
                });
        }

        const userContentForDb = attachedFile ? `[User attached file: ${attachedFile.name}]\n${userText}` : userText;
        if (session && conversationId) {
            await supabase.from('messages').insert({ conversation_id: conversationId, user_id: session.user.id, role: 'user', content: userContentForDb });
        }
        
        if (!session) {
            setGuestMessageCount(prev => prev + 1);
        }

        setAttachedFile(null);
        const controller = new AbortController();
        abortControllerRef.current = controller;
        try {
            const stream = streamGemini(userText, chatHistory, true, personality, imageModelPref, attachedFile, controller.signal);
            let assistantMessageExists = false;
            let accumulatedText = "";
            const aiMsgId = `ai-${Date.now()}`;
            for await (const update of stream) {
                if (update.mode) { setThinkingMode(update.mode); }
                if (!assistantMessageExists) { setMessages(prev => [...prev, { id: aiMsgId, role: 'assistant', text: '' }]); assistantMessageExists = true; }
                if (update.text) {
                    accumulatedText = update.text;
                    setMessages(prev => prev.map(msg => msg.id === aiMsgId ? { ...msg, text: accumulatedText } : msg));
                }
                if (update.isComplete) {
                    if (session && conversationId) {
                        await supabase.from('messages').insert({ conversation_id: conversationId, user_id: session.user.id, role: 'assistant', content: accumulatedText });
                    }
                    if (update.newHistoryEntry) { setChatHistory(prev => [...prev, { role: 'user', content: userContentForDb }, update.newHistoryEntry!]); }
                }
            }
        } catch (err: any) {
            if (err.name === 'AbortError') {
                console.log("Stream stopped by user.");
                setMessages(prev => {
                    const newMessages = [...prev];
                    const lastMsg = newMessages[newMessages.length - 1];
                    if (lastMsg && lastMsg.role === 'assistant' && lastMsg.text) { lastMsg.text += "\n\n*(Response stopped by user.)*"; }
                    return newMessages;
                });
            } else {
                console.error("Streaming error", err);
                setMessages(prev => [...prev, { id: `error-${Date.now()}`, role: 'assistant', text: `**System Error:** ${err.message || "An unexpected error occurred."}` }]);
            }
        } finally {
            setIsLoading(false);
            abortControllerRef.current = null;
        }
    };
    const handleChatSubmit = (e: FormEvent) => { e.preventDefault(); processSubmission(inputValue.trim()); };
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            const scrollHeight = textareaRef.current.scrollHeight;
            textareaRef.current.style.height = `${Math.min(scrollHeight, 200)}px`;
        }
    }, [inputValue]);
    const resetChat = () => { 
        if (!session) {
            setGuestMessageCount(0);
        }
        setCurrentConversationId(null); 
    };
    const handleDeleteConversation = async (conversationId: string) => {
        if (window.confirm('Are you sure you want to delete this chat?')) {
            await supabase.from('messages').delete().eq('conversation_id', conversationId);
            await supabase.from('conversations').delete().eq('id', conversationId);
            setConversations(prev => prev.filter(c => c.id !== conversationId));
            if (currentConversationId === conversationId) { resetChat(); }
        }
    };
    const parseMarkdown = (text: string) => {
        if (!text) return '';
        let parsed = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => {
            const downloadIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`;
            const fullscreenIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>`;
            return `<div class="relative group mt-3 mb-3 block w-full">
                <img src="${url}" alt="${alt}" class="rounded-xl shadow-lg border border-white/10 w-full h-auto object-cover" />
                <div class="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                    <a href="${url}" target="_blank" title="View Fullscreen" class="bg-black/60 hover:bg-black/80 backdrop-blur-md text-white w-10 h-10 flex items-center justify-center rounded-full shadow-xl border border-white/10 interactive-lift">
                        ${fullscreenIcon}
                    </a>
                    <a href="${url}" title="Download Image" class="download-image-btn bg-black/60 hover:bg-black/80 backdrop-blur-md text-white w-10 h-10 flex items-center justify-center rounded-full shadow-xl border border-white/10 interactive-lift">
                        ${downloadIcon}
                    </a>
                </div>
            </div>`;
        });
        parsed = parsed.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>').replace(/`([^`]+)`/g, '<code class="bg-black/20 px-1.5 py-0.5 rounded text-sm font-mono text-cyan-300 border border-white/10">$1</code>').replace(/\n/g, '<br />');
        return parsed;
    };

    const handleSelectPlanet = (url: string | 'chat') => {
        if (url === 'chat') {
            setCosmosViewActive(false);
        } else {
            setEmbeddedUrl(url);
        }
    };

    return (
        <div id="chat-view" className="fixed inset-0 z-50 flex flex-col bg-transparent text-zinc-100 font-sans overflow-hidden">
            <DynamicBackground status={backgroundStatus} />
            
            <CosmosView isActive={cosmosViewActive} onSelectPlanet={handleSelectPlanet} />
            {embeddedUrl && <EmbeddedView url={embeddedUrl} onClose={() => setEmbeddedUrl(null)} />}
            {showLoginPrompt && (
                <AuthPage onExit={() => setShowLoginPrompt(false)} />
            )}

            {isListening && (
                <SpeechVisualizer 
                    transcript={transcript}
                    onClose={stopListening}
                    onSend={() => submitTranscript(transcript)}
                />
            )}

            {showSettings && (
                <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowSettings(false)}>
                    <div data-liquid-glass className="liquid-glass w-full max-w-md shadow-2xl animate-pop-in" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6 border-b border-white/10 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white font-brand">Settings</h2>
                            <button onClick={() => setShowSettings(false)} className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"><svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-3">Personality Mode</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[{ id: 'conversational', name: 'Conversational', desc: 'Friendly and helpful.' }, { id: 'academic', name: 'Academic', desc: 'Formal and technical.' }, { id: 'brainrot', name: 'Brainrot', desc: 'Chaotic Gen Z slang.' }, { id: 'roast-master', name: 'Roast Master', desc: 'Sarcastic and witty.' }, { id: 'formal', name: 'Business Formal', desc: 'Strictly professional.' }, { id: 'zesty', name: 'Zesty', desc: 'Flamboyant and sassy.' }].map((mode) => (
                                        <button key={mode.id} onClick={() => setPersonality(mode.id as PersonalityMode)} className={`text-left px-4 py-3 rounded-xl border transition-all duration-300 ${personality === mode.id ? 'bg-indigo-500/20 border-indigo-500/50 text-white shadow-lg' : 'bg-white/5 border-white/10 text-zinc-300 hover:border-white/20 hover:bg-white/10'}`}>
                                            <div className="font-medium text-sm">{mode.name}</div>
                                            <div className="text-xs opacity-60">{mode.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-3">Image Model Preference</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => handleImageModelChange('img3')} className={`text-left px-4 py-3 rounded-xl border transition-all duration-300 ${imageModelPref === 'img3' ? 'bg-indigo-500/20 border-indigo-500/50 text-white shadow-lg' : 'bg-white/5 border-white/10 text-zinc-300 hover:border-white/20 hover:bg-white/10'}`}>
                                        <div className="font-medium text-sm">Nexus K3</div>
                                        <div className="text-xs opacity-60">Fast generation (~5s).</div>
                                    </button>
                                    <button onClick={() => handleImageModelChange('img4')} className={`text-left px-4 py-3 rounded-xl border transition-all duration-300 relative overflow-hidden ${imageModelPref === 'img4' ? 'bg-indigo-500/20 border-indigo-500/50 text-white shadow-lg' : 'bg-white/5 border-white/10 text-zinc-300 hover:border-white/20 hover:bg-white/10'}`}>
                                        <span className="absolute top-2 right-2 bg-indigo-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">Recommended</span>
                                        <div className="font-medium text-sm">Nexus K4</div>
                                        <div className="text-xs opacity-60">Highest quality (~10s).</div>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div data-liquid-glass className={`fixed inset-y-0 left-0 z-40 w-72 liquid-glass border-l-0 border-t-0 border-b-0 rounded-none rounded-r-2xl transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex flex-col h-full p-4 space-y-4">
                    <div className="flex justify-between items-center"><div className="font-bold tracking-wide text-white flex items-center gap-2"><img src="/nexus-logo.png" alt="Nexus Logo" className="w-6 h-6 animate-spin-slow" />Nexus</div><button onClick={() => setIsSidebarOpen(false)} className="text-zinc-400 hover:text-white p-1 rounded-full hover:bg-white/10"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg></button></div>
                    <button onClick={() => { resetChat(); setIsSidebarOpen(false); }} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-white hover:bg-zinc-200 text-black rounded-full transition-colors duration-300 text-sm font-semibold interactive-lift"><svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none"><path d="M12 5v14"/><path d="M5 12h14"/></svg>New Chat</button>
                    {session && (
                        <div className="flex-1 overflow-y-auto space-y-1 pr-2 -mr-2 scrollbar-hide">
                            <div className="text-xs font-semibold text-zinc-500 px-2 py-1 uppercase tracking-wider mb-1">Recent Chats</div>
                            {conversations.map(chat => (
                                <div key={chat.id} className="relative group">
                                    <button onClick={() => setCurrentConversationId(chat.id)} className={`w-full text-left pl-3 pr-8 py-2 text-sm rounded-lg transition-colors duration-200 truncate ${currentConversationId === chat.id ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}>
                                        <div className="truncate">{chat.title || 'New Chat'}</div>
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteConversation(chat.id); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" title="Delete Chat"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                                </div>
                            ))}
                        </div>
                    )}
                    <div className="space-y-2">
                        <button onClick={() => setShowSettings(true)} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.35a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>Settings</button>
                        {session && (
                            <div className="flex items-center justify-between gap-3 px-3 py-2 bg-white/5 rounded-lg">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 shrink-0"></div>
                                    <div className="text-sm text-zinc-200 truncate">
                                        {profile?.first_name && profile?.last_name 
                                            ? `${profile.first_name} ${profile.last_name}` 
                                            : session.user.email}
                                    </div>
                                </div>
                                <button onClick={() => supabase.auth.signOut()} className="text-zinc-300 hover:text-white p-1.5 hover:bg-white/10 rounded-md" title="Log Out"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-30" onClick={() => setIsSidebarOpen(false)}></div>}

            <main className="flex-1 relative flex flex-col overflow-hidden transition-all duration-300 ease-in-out" style={{ marginLeft: isSidebarOpen ? '18rem' : '0' }}>
                <header className="h-16 flex items-center justify-between px-6 shrink-0 border-b border-white/10 backdrop-blur-md bg-black/10">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/5 rounded-full text-zinc-400 hover:text-white transition-colors" title="Menu"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg></button>
                        <span className="font-semibold text-sm tracking-wide text-zinc-300">{currentConversationId && session ? conversations.find(c => c.id === currentConversationId)?.title : 'Nexus'}</span>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto relative z-10 scrollbar-hide">
                    {messages.length === 0 && !isLoading ? (
                        <div className={`h-full flex flex-col items-center justify-center pb-32 transition-all duration-700 ${cosmosViewActive ? 'opacity-0 scale-90 pointer-events-none' : 'opacity-100 scale-100'}`}>
                            <OrbLogo />
                            <h1 className="text-2xl font-medium text-white mb-2 tracking-tight">How can I help you?</h1>
                            <button 
                                onClick={() => setCosmosViewActive(true)}
                                data-liquid-glass
                                className="liquid-glass mt-8 px-8 py-3 rounded-full font-semibold text-white border border-white/10 interactive-lift"
                            >
                                Enter the Cosmos
                            </button>
                        </div>
                    ) : (
                        <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
                            {messages.map((msg) => (
                                <div key={msg.id} className={`flex items-start gap-4 animate-pop-in ${msg.role === 'user' ? 'justify-end' : ''}`}>
                                    {msg.role === 'assistant' && <div className="shrink-0 mt-1"><NexusIconSmall /></div>}
                                    <div data-liquid-glass className={`max-w-[85%] leading-relaxed ${msg.role === 'user' ? 'light-liquid-glass text-white px-5 py-3 rounded-3xl rounded-br-lg' : 'dark-liquid-glass px-5 py-3 rounded-3xl rounded-bl-lg'}`}>
                                        {msg.role === 'assistant' && <div className="font-medium text-sm text-zinc-400 mb-2">Nexus</div>}
                                        <div className={`${msg.role === 'assistant' ? 'text-zinc-100 prose prose-invert prose-sm max-w-none' : ''}`} dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.text) }} />
                                        {msg.role === 'assistant' && !isLoading && (<div className="flex items-center gap-2 mt-3"><button onClick={() => handleTTS(msg.text)} className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-white/5 rounded-md transition-colors" title="Read Aloud"><svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg></button></div>)}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="animate-pop-in">
                                    <ThinkingProcess thought="" isThinking={true} mode={thinkingMode} />
                                </div>
                            )}
                            <div ref={messagesEndRef} className="h-48"></div>
                        </div>
                    )}
                </div>

                <div className="w-full max-w-3xl mx-auto p-4 z-20">
                    {isLoading ? (
                        <div className="flex flex-col items-center gap-3">
                            <button onClick={handleStop} className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-5 py-2.5 rounded-full font-medium transition-all shadow-lg flex items-center gap-2 text-sm interactive-lift">
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h12v12H6z"></path></svg>
                                Stop Generating
                            </button>
                        </div>
                    ) : (
                        <div className="relative">
                            <form onSubmit={handleChatSubmit} className="relative">
                                <div data-liquid-glass className="liquid-glass rounded-full flex items-center p-2 transition-all duration-300 focus-within:shadow-2xl focus-within:shadow-indigo-500/20">
                                    <button type="button" onClick={triggerFileSelect} className="p-2 rounded-full text-zinc-300 hover:text-white hover:bg-white/10 transition-colors ml-1" title="Attach File"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></button>
                                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,application/pdf,text/plain,text/code,application/json" />
                                    <textarea ref={textareaRef} value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSubmit(e); } }} rows={1} placeholder="Message Nexus..." className="flex-1 bg-transparent border-none text-white placeholder-zinc-500 focus:ring-0 resize-none py-3 px-3 max-h-[120px] overflow-y-auto scrollbar-hide"></textarea>
                                    <button type="button" onClick={startListening} className="p-2 rounded-full text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg></button>
                                    <button type="submit" disabled={isLoading || (!inputValue.trim() && !attachedFile)} className={`w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 ml-1 ${(inputValue.trim() || attachedFile) && !isLoading ? 'bg-white text-black hover:bg-zinc-200 shadow-lg' : 'bg-white/10 text-zinc-500 cursor-not-allowed'}`}><svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></button>
                                </div>
                                {attachedFile && (<div className="absolute bottom-full left-4 mb-2"><div className="inline-flex items-center gap-2 bg-black/50 backdrop-blur-md text-zinc-200 text-xs px-3 py-1.5 rounded-full border border-white/10 animate-pop-in"><div className="w-4 h-4 flex items-center justify-center">{attachedFile.type.startsWith('image/') ? <svg className="w-3 h-3" viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg> : <svg className="w-3 h-3" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>}</div><span className="max-w-[150px] truncate font-medium">{attachedFile.name}</span><button type="button" onClick={removeFile} className="ml-1 hover:text-white p-0.5 rounded-full hover:bg-white/10 transition-colors"><svg className="w-3 h-3" viewBox="0 0 24 24"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button></div></div>)}
                            </form>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ChatView;