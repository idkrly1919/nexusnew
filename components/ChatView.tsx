import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { Message, ChatHistory, PersonalityMode, Conversation, Role } from '../types';
import { streamGemini } from '../services/geminiService';
import { ThinkingProcess } from './ThinkingProcess';
import { useSession } from '../src/contexts/SessionContext';
import { supabase } from '../src/integrations/supabase/client';
import SpeechVisualizer from './SpeechVisualizer';

const NexusIconSmall = () => (
    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
        <svg className="text-white w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
    </div>
);

const OrbLogo = () => (
    <div className="relative w-24 h-24 flex items-center justify-center mb-8">
        <div className="absolute inset-0 rounded-full bg-blue-500 blur-2xl opacity-20 animate-pulse"></div>
        <div className="relative w-20 h-20 rounded-full bg-gradient-to-b from-slate-800 to-black border border-slate-700 shadow-2xl flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(56,189,248,0.4),transparent_70%)]"></div>
            <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-t from-blue-600/20 to-transparent"></div>
            <svg className="text-blue-400 w-10 h-10 drop-shadow-[0_0_15px_rgba(96,165,250,0.8)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        </div>
        <div className="absolute inset-0 border border-blue-500/30 rounded-full w-full h-full rotate-45 scale-110 opacity-40"></div>
        <div className="absolute inset-0 border border-cyan-400/20 rounded-full w-full h-full -rotate-12 scale-125 opacity-30"></div>
    </div>
);

const ChatView: React.FC = () => {
    const { session } = useSession();
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
    
    const [attachedFile, setAttachedFile] = useState<{name: string, content: string, type: string} | null>(null);

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

    const isReasoningEnabled = true;
    
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const silenceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const recognition = useRef<any>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const scrollToBottom = () => {
        if (messagesEndRef.current) {
            messagesEndRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
        }
    };

    useEffect(scrollToBottom, [messages]);

    // Fetch conversations on load
    useEffect(() => {
        const fetchConversations = async () => {
            if (!session) return;
            const { data, error } = await supabase
                .from('conversations')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) console.error('Error fetching conversations:', error);
            else setConversations(data as Conversation[]);
        };
        fetchConversations();
    }, [session]);

    // Fetch messages when a conversation is selected
    useEffect(() => {
        const fetchMessages = async () => {
            if (!currentConversationId) {
                setMessages([]);
                setChatHistory([]);
                return;
            }

            const { data, error } = await supabase
                .from('messages')
                .select('*')
                .eq('conversation_id', currentConversationId)
                .order('created_at', { ascending: true });

            if (error) {
                console.error('Error fetching messages:', error);
            } else {
                const loadedMessages: Message[] = data.map((msg: { id: string; role: string; content: string; }) => ({
                    id: msg.id,
                    role: msg.role as Role,
                    text: msg.content,
                }));
                setMessages(loadedMessages);

                const history: ChatHistory = data.map((msg: { role: 'user' | 'assistant'; content: string; }) => ({
                    role: msg.role as 'user' | 'assistant',
                    content: msg.content,
                }));
                setChatHistory(history);
            }
        };
        fetchMessages();
    }, [currentConversationId]);


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
        if (recognition.current) {
            recognition.current.stop();
        }
        if (text.trim()) {
            processSubmission(text.trim());
        }
        setTranscript('');
        setIsListening(false);
    };

    useEffect(() => {
        if (typeof window !== 'undefined' && ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)) {
            // @ts-ignore
            const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
            recognition.current = new SpeechRecognition();
            recognition.current.continuous = true;
            recognition.current.interimResults = true;
            recognition.current.lang = 'en-US';
            
            recognition.current.onstart = () => {
                setIsListening(true);
                setTranscript('');
            };

            recognition.current.onresult = (event: any) => {
                if (silenceTimer.current) clearTimeout(silenceTimer.current);

                let fullTranscript = '';
                for (let i = 0; i < event.results.length; i++) {
                    fullTranscript += event.results[i][0].transcript;
                }
                setTranscript(fullTranscript);

                silenceTimer.current = setTimeout(() => {
                    submitTranscript(fullTranscript);
                }, 3000);
            };

            recognition.current.onend = () => {
                if (silenceTimer.current) clearTimeout(silenceTimer.current);
                setIsListening(false);
            };

            recognition.current.onerror = (event: any) => {
                console.error("Speech recognition error", event.error);
                if (silenceTimer.current) clearTimeout(silenceTimer.current);
                setIsListening(false);
            };
        }
    }, []);

    const startListening = () => {
        if (recognition.current && !isListening) {
            recognition.current.start();
        }
    };

    const stopListening = () => {
        if (recognition.current && isListening) {
            recognition.current.stop();
        }
    };

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
            
            const preferredVoiceNames = [
                'Daniel', // UK premium male
                'Microsoft David - English (United States)', // Edge/Windows male
                'Google UK English Male', // Chrome male
                'Alex', // macOS default male
            ];

            let selectedVoice = null;
            for (const name of preferredVoiceNames) {
                selectedVoice = voices.find(v => v.name === name);
                if (selectedVoice) break;
            }

            if (!selectedVoice) {
                selectedVoice = voices.find(v => v.lang === 'en-US' && v.name.toLowerCase().includes('male'));
            }
            
            if (!selectedVoice) {
                selectedVoice = voices.find(v => v.lang === 'en-US');
            }

            if (selectedVoice) {
                utterance.voice = selectedVoice;
            }
            
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
        if (isLoading || (!userText.trim() && !attachedFile) || !session) return;
        
        setIsLoading(true);
        setInputValue('');
        
        const imageKeywords = ['draw', 'paint', 'generate image', 'create an image', 'visualize', 'edit image', 'modify image', 'make an image'];
        const isImage = imageKeywords.some(k => userText.toLowerCase().includes(k));
        setThinkingMode(isImage ? 'image' : 'reasoning');

        if (textareaRef.current) textareaRef.current.style.height = '52px';

        let userDisplay = userText;
        if (attachedFile) {
            const isImg = attachedFile.type.startsWith('image/');
            const fileIcon = isImg 
                ? `<img src="${attachedFile.content}" class="w-8 h-8 rounded object-cover border border-white/20" />`
                : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`;
            userDisplay = `${userText} <br/><div class="inline-flex items-center gap-2 mt-2 px-2 py-1 rounded bg-white/10 text-xs font-mono">${fileIcon}<span>${attachedFile.name}</span></div>`;
        }

        const userMessage: Message = { id: `user-${Date.now()}`, role: 'user', text: userDisplay };
        const typingMessage: Message = { id: `typing-${Date.now()}`, role: 'typing', text: 'Thinking...' };
        
        setMessages(prev => [...prev, userMessage, typingMessage]);
        
        let conversationId = currentConversationId;
        if (!conversationId) {
            const { data, error } = await supabase
                .from('conversations')
                .insert({ user_id: session.user.id, title: userText.substring(0, 50) })
                .select()
                .single();
            if (error) { console.error("Error creating conversation", error); setIsLoading(false); return; }
            conversationId = data.id;
            setCurrentConversationId(data.id);
            setConversations(prev => [data as Conversation, ...prev]);
        }

        const userContentForDb = attachedFile ? `[User attached file: ${attachedFile.name}]\n${userText}` : userText;
        await supabase.from('messages').insert({ conversation_id: conversationId, user_id: session.user.id, role: 'user', content: userContentForDb });
        setAttachedFile(null);

        const controller = new AbortController();
        abortControllerRef.current = controller;

        try {
            const stream = streamGemini(userText, chatHistory, true, personality, attachedFile, controller.signal);
            let isFirstChunk = true;
            let accumulatedText = "";
            const aiMsgId = `ai-${Date.now()}`;

            for await (const update of stream) {
                if (isFirstChunk) {
                    setMessages(prev => prev.filter(m => m.role !== 'typing'));
                    setMessages(prev => [...prev, { id: aiMsgId, role: 'assistant', text: '' }]);
                    isFirstChunk = false;
                }
                if (update.text) {
                    accumulatedText = update.text;
                    setMessages(prev => prev.map(msg => msg.id === aiMsgId ? { ...msg, text: accumulatedText } : msg));
                }
                if (update.isComplete) {
                    await supabase.from('messages').insert({ conversation_id: conversationId, user_id: session.user.id, role: 'assistant', content: accumulatedText });
                    if (update.newHistoryEntry) {
                        setChatHistory(prev => [...prev, { role: 'user', content: userContentForDb }, update.newHistoryEntry!]);
                    }
                }
            }
        } catch (err: any) {
            if (err.name === 'AbortError') {
                console.log("Stream stopped by user.");
                setMessages(prev => {
                    const newMessages = [...prev];
                    const lastMsg = newMessages[newMessages.length - 1];
                    if (lastMsg && lastMsg.role === 'assistant' && lastMsg.text) {
                        lastMsg.text += "\n\n*(Response stopped by user.)*";
                    }
                    return newMessages.filter(m => m.role !== 'typing');
                });
            } else {
                console.error("Streaming error", err);
                setMessages(prev => prev.filter(m => m.role !== 'typing'));
                setMessages(prev => [...prev, { id: `error-${Date.now()}`, role: 'assistant', text: `**System Error:** ${err.message || "An unexpected error occurred."}` }]);
            }
        } finally {
            setIsLoading(false);
            abortControllerRef.current = null;
        }
    };

    const handleChatSubmit = (e: FormEvent) => {
        e.preventDefault();
        processSubmission(inputValue.trim());
    };

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = '52px';
            const scrollHeight = textareaRef.current.scrollHeight;
            textareaRef.current.style.height = `${Math.min(scrollHeight, 200)}px`;
        }
    }, [inputValue]);

    const resetChat = () => {
        setCurrentConversationId(null);
    };

    const parseMarkdown = (text: string) => {
        if (!text) return '';
        let parsed = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => `<div class="relative group mt-3 mb-3 inline-block max-w-full"><img src="${url}" alt="${alt}" class="rounded-xl shadow-lg border border-white/10 max-w-full h-auto" /><a href="${url}" target="_blank" download="generated-image" class="absolute top-3 right-3 bg-black/60 hover:bg-black/80 backdrop-blur-md text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-xl border border-white/10 transform scale-95 group-hover:scale-100"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg></a></div>`);
        parsed = parsed.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>').replace(/`([^`]+)`/g, '<code class="bg-zinc-800 px-1.5 py-0.5 rounded text-sm font-mono text-cyan-300 border border-zinc-700">$1</code>').replace(/\n/g, '<br />');
        return parsed;
    };

    return (
        <div id="chat-view" className="fixed inset-0 z-50 flex flex-col bg-[#18181b] text-zinc-100 font-sans overflow-hidden">
            {isListening && (
                <SpeechVisualizer 
                    transcript={transcript}
                    onClose={stopListening}
                    onSend={() => submitTranscript(transcript)}
                />
            )}

            {showSettings && (
                <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-[#18181b] border border-zinc-800 rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white font-brand">Settings</h2>
                            <button onClick={() => setShowSettings(false)} className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"><svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                        </div>
                        <div className="p-6 space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-3">Personality Mode</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {[{ id: 'conversational', name: 'Conversational', desc: 'Friendly, helpful, and standard.' }, { id: 'academic', name: 'Academic', desc: 'Formal, cited, and highly technical.' }, { id: 'brainrot', name: 'Brainrot', desc: 'Gen Z slang, chaotic, and barely coherent.' }, { id: 'roast-master', name: 'Roast Master', desc: 'Ruthless sarcasm and brutal honesty.' }, { id: 'formal', name: 'Business Formal', desc: 'Strictly professional and distant.' }, { id: 'zesty', name: 'Zesty', desc: 'Flamboyant, extra, and full of sass ✨.' }].map((mode) => (
                                        <button key={mode.id} onClick={() => setPersonality(mode.id as PersonalityMode)} className={`text-left px-4 py-3 rounded-lg border transition-all ${personality === mode.id ? 'bg-blue-500/10 border-blue-500/50 text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-600'}`}>
                                            <div className="font-medium text-sm">{mode.name}</div>
                                            <div className="text-xs opacity-60">{mode.desc}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#101012] border-r border-white/5 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex flex-col h-full">
                    <div className="p-4 border-b border-white/5 flex justify-between items-center"><div className="font-bold tracking-wide text-white flex items-center gap-2"><div className="w-6 h-6 bg-blue-600/20 rounded flex items-center justify-center text-blue-400"><svg width="14" height="14" viewBox="0 0 24 24"><path d="M2 20h20"/><path d="m12 10 4 10"/><path d="m12 10-4 10"/><circle cx="12" cy="5" r="3"/></svg></div>Nexus</div><button onClick={() => setIsSidebarOpen(false)} className="text-zinc-400 hover:text-white"><svg width="16" height="16" viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg></button></div>
                    <div className="p-3"><button onClick={() => { resetChat(); setIsSidebarOpen(false); }} className="w-full flex items-center gap-2 px-3 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors text-sm font-medium border border-white/5"><svg width="16" height="16" viewBox="0 0 24 24"><path d="M12 5v14"/><path d="M5 12h14"/></svg>New Chat</button></div>
                    <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
                        <div className="text-xs font-semibold text-zinc-600 px-2 py-1 uppercase tracking-wider mb-1">Recent Chats</div>
                        {conversations.map(chat => (
                            <button key={chat.id} onClick={() => setCurrentConversationId(chat.id)} className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors group truncate ${currentConversationId === chat.id ? 'bg-white/10 text-white' : 'text-zinc-400 hover:bg-white/5 hover:text-white'}`}>
                                <div className="truncate">{chat.title || 'New Chat'}</div>
                            </button>
                        ))}
                    </div>
                    <div className="p-4 border-t border-white/5 space-y-2">
                        <button onClick={() => setShowSettings(true)} className="w-full flex items-center gap-3 px-2 py-2 text-sm text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"><svg width="16" height="16" viewBox="0 0 24 24"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.35a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>Settings</button>
                        <div className="flex items-center justify-between gap-3 px-2 py-2">
                             <div className="flex items-center gap-3"><div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500 to-blue-500"></div><div className="text-sm text-zinc-200 truncate">{session?.user?.email}</div></div>
                             <button onClick={() => supabase.auth.signOut()} className="text-zinc-300 hover:text-white p-1.5 hover:bg-white/10 rounded-md" title="Log Out"><svg width="16" height="16" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></button>
                        </div>
                    </div>
                </div>
            </div>

            {isSidebarOpen && <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30" onClick={() => setIsSidebarOpen(false)}></div>}

            <header className="h-14 flex items-center justify-between px-4 border-b border-white/5 bg-[#18181b]/80 backdrop-blur-md z-20 shrink-0">
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors" title="Menu"><svg width="20" height="20" viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg></button>
                    <button onClick={resetChat} className="p-2 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors" title="New Chat"><svg width="20" height="20" viewBox="0 0 24 24"><path d="M5 12h14"/><path d="M12 5v14"/></svg></button>
                    <span className="font-semibold text-sm tracking-wide text-zinc-300">{currentConversationId ? conversations.find(c => c.id === currentConversationId)?.title : 'Nexus'}</span>
                </div>
                <div className="flex items-center gap-2"><button onClick={() => setShowSettings(true)} className="text-xs font-medium text-zinc-500 hover:text-zinc-300 cursor-pointer px-2 py-1 rounded transition-colors">{personality !== 'conversational' ? personality.charAt(0).toUpperCase() + personality.slice(1) + ' Mode' : 'Settings'}</button></div>
            </header>

            <main className="flex-1 relative flex flex-col overflow-hidden">
                <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden"><div className="relative w-full h-full"><div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 transition-opacity duration-700 ${isLoading ? 'opacity-100' : 'opacity-0'}`}><div className="absolute inset-0 bg-blue-500/30 blur-[60px] rounded-full animate-pulse"></div></div><div className={`absolute w-[400px] h-[400px] bg-blue-900/10 blur-[80px] rounded-full transition-all duration-1000 ${isLoading ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[200px] animate-orbit-cw' : 'top-1/4 left-1/4 animate-float-1'}`}></div><div className={`absolute w-[300px] h-[300px] bg-indigo-900/10 blur-[70px] rounded-full transition-all duration-1000 ${isLoading ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[150px] h-[150px] animate-orbit-ccw' : 'bottom-1/3 right-1/4 animate-float-2'}`}></div><div className={`absolute w-[350px] h-[350px] bg-cyan-900/10 blur-[90px] rounded-full transition-all duration-1000 ${isLoading ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[180px] h-[180px] animate-orbit-cw' : 'top-1/3 right-1/3 animate-float-3'}`}></div><div className={`absolute w-[250px] h-[250px] bg-purple-900/10 blur-[60px] rounded-full transition-all duration-1000 ${isLoading ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120px] h-[120px] animate-orbit-ccw' : 'bottom-1/4 left-1/3 animate-float-4'}`}></div><div className={`absolute w-[300px] h-[300px] bg-slate-800/20 blur-[80px] rounded-full transition-all duration-1000 ${isLoading ? 'top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140px] h-[140px] animate-orbit-cw' : 'top-20 right-20 animate-float-5'}`}></div></div></div>
                <div className="flex-1 overflow-y-auto relative z-10 scrollbar-hide">
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center pb-32 animate-in fade-in duration-700"><OrbLogo /><h1 className="text-2xl font-medium text-white mb-2 tracking-tight">How can I help you?</h1></div>
                    ) : (
                        <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
                            {messages.map((msg) => {
                                if (msg.role === 'typing') return <div key={msg.id} className="animate-in fade-in slide-in-from-bottom-2"><ThinkingProcess thought="" isThinking={true} mode={thinkingMode} /></div>;
                                if (msg.role === 'user') return <div key={msg.id} className="flex justify-end animate-in fade-in slide-in-from-bottom-2"><div className="bg-[#27272a] text-white px-5 py-3 rounded-[24px] rounded-tr-sm max-w-[85%] leading-relaxed shadow-sm"><div dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.text) }} /></div></div>;
                                return (
                                    <div key={msg.id} className="flex gap-4 animate-in fade-in slide-in-from-bottom-2">
                                        <div className="shrink-0 mt-1"><NexusIconSmall /></div>
                                        <div className="flex-1 space-y-2 min-w-0">
                                            <div className="font-medium text-sm text-zinc-400">Nexus</div>
                                            <div className="text-zinc-100 leading-relaxed prose prose-invert prose-sm max-w-none"><div dangerouslySetInnerHTML={{ __html: parseMarkdown(msg.text) }} /></div>
                                            {!isLoading && (<div className="flex items-center gap-2 mt-2"><button onClick={() => handleTTS(msg.text)} className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-white/5 rounded-md transition-colors" title="Read Aloud"><svg className="w-4 h-4" viewBox="0 0 24 24"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg></button></div>)}
                                        </div>
                                    </div>
                                );
                            })}
                            <div ref={messagesEndRef} className="h-48"></div>
                        </div>
                    )}
                </div>

                <div className="absolute bottom-8 left-0 right-0 px-4 z-20 flex justify-center">
                    {isLoading ? (
                        <div className="w-full max-w-3xl relative flex flex-col items-center gap-3">
                            <button onClick={handleStop} className="bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-white px-5 py-2.5 rounded-full font-medium transition-all shadow-[0_0_20px_rgba(39,39,42,0.5)] flex items-center gap-2 text-sm">
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h12v12H6z"></path></svg>
                                Stop Generating
                            </button>
                            <div className="text-center"><p className="text-[10px] text-zinc-600 font-medium tracking-wider uppercase flex justify-center gap-4"><span>Nexus v2.0</span><span>•</span><span>Real-time Reasoning</span></p></div>
                        </div>
                    ) : (
                        <div className="w-full max-w-3xl relative">
                            <form onSubmit={handleChatSubmit} className="relative group">
                                <div className="absolute inset-0 bg-zinc-800/50 rounded-3xl blur-xl transition-opacity duration-500 opacity-0 group-hover:opacity-100"></div>
                                <div className="relative flex flex-col bg-[#27272a] border border-zinc-700/50 rounded-3xl shadow-2xl overflow-hidden transition-colors focus-within:border-zinc-600">
                                    {attachedFile && (<div className="px-4 pt-3 pb-1"><div className="inline-flex items-center gap-2 bg-zinc-800/80 text-zinc-200 text-xs px-3 py-1.5 rounded-full border border-zinc-700 animate-in fade-in slide-in-from-bottom-2"><div className="w-4 h-4 flex items-center justify-center">{attachedFile.type.startsWith('image/') ? <svg className="w-3 h-3" viewBox="0 0 24 24"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg> : <svg className="w-3 h-3" viewBox="0 0 24 24"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>}</div><span className="max-w-[150px] truncate font-medium">{attachedFile.name}</span><button type="button" onClick={removeFile} className="ml-1 hover:text-white p-0.5 rounded-full hover:bg-white/10 transition-colors"><svg className="w-3 h-3" viewBox="0 0 24 24"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button></div></div>)}
                                    <textarea ref={textareaRef} value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSubmit(e); } }} rows={1} placeholder="Message Nexus..." className={`w-full bg-transparent border-none text-white placeholder-zinc-500 focus:ring-0 resize-none py-3.5 pl-5 pr-32 max-h-[200px] overflow-y-auto scrollbar-hide ${attachedFile ? 'pt-2' : ''}`} style={{ minHeight: '52px' }}></textarea>
                                    <div className="absolute bottom-2 right-2 flex items-center gap-1">
                                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,application/pdf,text/plain,text/code,application/json" />
                                        <button type="button" onClick={triggerFileSelect} className="p-2 rounded-full text-white/70 hover:text-white hover:bg-zinc-700/50 transition-colors" title="Attach File"><svg className="w-5 h-5" viewBox="0 0 24 24"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></button>
                                        <div className={`p-2 rounded-full transition-colors cursor-default ${isReasoningEnabled ? 'text-white/70' : 'text-zinc-600'}`} title="Reasoning Active"><svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/></svg></div>
                                        <button type="button" onClick={startListening} className={`p-2 rounded-full transition-all duration-200 text-white/70 hover:text-white hover:bg-zinc-700/50`}><svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg></button>
                                        <button type="submit" disabled={isLoading || (!inputValue.trim() && !attachedFile)} className={`p-2 rounded-full transition-all duration-200 ${(inputValue.trim() || attachedFile) && !isLoading ? 'bg-white text-black hover:bg-zinc-200 shadow-lg hover:shadow-white/20' : 'bg-zinc-700/50 text-zinc-500 cursor-not-allowed'}`}><svg className="w-5 h-5 ml-0.5" viewBox="0 0 24 24"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>
                                    </div>
                                </div>
                            </form>
                            <div className="text-center mt-3"><p className="text-[10px] text-zinc-600 font-medium tracking-wider uppercase flex justify-center gap-4"><span>Nexus v2.0</span><span>•</span><span>Real-time Reasoning</span></p></div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ChatView;