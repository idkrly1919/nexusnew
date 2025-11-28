import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import OpenAI from 'openai';
import { Message, ChatHistory, PersonalityMode, Conversation, Role, Persona } from '../types';
import { streamGemini, summarizeHistory } from '../services/geminiService';
import { ThinkingProcess } from './ThinkingProcess';
import { useSession } from '../contexts/SessionContext';
import { useTheme } from '../contexts/ThemeContext';
import { supabase } from '../integrations/supabase/client';
import DynamicBackground from './DynamicBackground';
import EmbeddedView from './EmbeddedView';
import VoiceInputView from './VoiceInputView';
import FileGenerator from './FileGenerator';
import FileIcon from './FileIcon';
import PersonaManager from './PersonaManager';
import StockWidget from './StockWidget';
import WeatherWidget from './WeatherWidget';

// Minimalist Logo for Header
const LogoMinimal = () => (
    <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-md">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>
        </div>
        <span className="font-semibold text-lg tracking-tight" style={{ color: 'var(--text-primary)' }}>Quillix</span>
    </div>
);

const ChatView: React.FC = () => {
    const { session, profile, refreshProfile } = useSession();
    const { theme, toggleTheme } = useTheme();
    const { conversationId: paramConversationId } = useParams<{ conversationId?: string }>();
    const navigate = useNavigate();

    const [messages, setMessages] = useState<Message[]>([]);
    const [chatHistory, setChatHistory] = useState<ChatHistory>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [thinkingMode, setThinkingMode] = useState<'reasoning' | 'image'>('reasoning');
    
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showPersonaManager, setShowPersonaManager] = useState(false);
    const [personality, setPersonality] = useState<PersonalityMode>('conversational');
    const [imageModelPref, setImageModelPref] = useState(profile?.image_model_preference || 'img4');
    
    const [attachedFiles, setAttachedFiles] = useState<{id: string, name: string, content: string, type: string}[]>([]);
    const [isDragging, setIsDragging] = useState(false);

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [personas, setPersonas] = useState<Persona[]>([]);
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
    const [activePersona, setActivePersona] = useState<Persona | null>(null);
    const [backgroundStatus, setBackgroundStatus] = useState<'idle' | 'loading-text' | 'loading-image'>('idle');

    const [isVoiceMode, setIsVoiceMode] = useState(false);
    const [embeddedUrl, setEmbeddedUrl] = useState<string | null>(null);
    
    const [personalizationEntries, setPersonalizationEntries] = useState<{id: string, entry: string}[]>([]);
    const [showMemoryToast, setShowMemoryToast] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const avatarFileRef = useRef<HTMLInputElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const fetchData = async () => {
        if (!session) {
            return;
        }
        const { data: convos, error: convoError } = await supabase.from('conversations').select('*').order('updated_at', { ascending: false });
        if (convoError) console.error('Error fetching conversations:', convoError);
        else setConversations(convoError ? [] : (convos as Conversation[]));

        const { data: personasData, error: personaError } = await supabase.from('personas').select('*').order('created_at', { ascending: false });
        if (personaError) console.error('Error fetching personas:', personaError);
        else setPersonas(personaError ? [] : (personasData as Persona[]));
    };

    useEffect(() => {
        fetchData();
    }, [session]);

    useEffect(() => {
        setCurrentConversationId(paramConversationId || null);
        if (!paramConversationId) {
            setActivePersona(null);
        }
    }, [paramConversationId]);

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
        if (isLoading) {
            setBackgroundStatus(thinkingMode === 'image' ? 'loading-image' : 'loading-text');
        } else {
            setBackgroundStatus('idle');
        }
    }, [isLoading, thinkingMode]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(scrollToBottom, [messages, isLoading]);

    useEffect(() => {
        const handleChatViewClick = async (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const downloadButton = target.closest('.download-image-btn');
            const betterImageButton = target.closest('.better-image-btn');

            if (downloadButton) {
                e.preventDefault();
                const imageUrl = downloadButton.getAttribute('href');
                if (imageUrl) {
                    window.open(imageUrl, '_blank');
                }
            }

            if (betterImageButton) {
                e.preventDefault();
                const prompt = betterImageButton.getAttribute('data-prompt');
                if (prompt) {
                    navigator.clipboard.writeText(prompt);

                    const originalText = betterImageButton.innerHTML;
                    betterImageButton.innerHTML = "We've copied the prompt to your clipboard!";
                    (betterImageButton as HTMLButtonElement).disabled = true;

                    setTimeout(() => {
                        betterImageButton.innerHTML = "Redirecting in 3...";
                    }, 1500);
                    setTimeout(() => {
                        betterImageButton.innerHTML = "Redirecting in 2...";
                    }, 2500);
                    setTimeout(() => {
                        betterImageButton.innerHTML = "Redirecting in 1...";
                    }, 3500);

                    setTimeout(() => {
                        window.open('https://lmarena.ai/?mode=direct&chat-modality=image', '_blank');
                        betterImageButton.innerHTML = originalText;
                        (betterImageButton as HTMLButtonElement).disabled = false;
                    }, 4500);
                }
            }
        };

        const chatView = document.getElementById('chat-view');
        chatView?.addEventListener('click', handleChatViewClick);
        return () => {
            chatView?.removeEventListener('click', handleChatViewClick);
        };
    }, []);

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
                const currentConvo = conversations.find(c => c.id === currentConversationId);
                if (currentConvo?.persona_id) {
                    const persona = personas.find(p => p.id === currentConvo.persona_id);
                    setActivePersona(persona || null);
                } else {
                    setActivePersona(null);
                }
                const loadedMessages: Message[] = data.map((msg: { id: string; role: string; content: string; }) => ({ id: msg.id, role: msg.role as Role, text: msg.content }));
                setMessages(loadedMessages);
                const history: ChatHistory = data.map((msg: { role: 'user' | 'assistant'; content: string; }) => ({ role: msg.role as 'user' | 'assistant', content: msg.content }));
                setChatHistory(history);
            }
        };
        fetchMessages();
    }, [currentConversationId, session, conversations, personas]);

    const processFiles = (files: FileList) => {
        if (!files) return;
        const newFiles = Array.from(files).slice(0, 10 - attachedFiles.length);

        newFiles.forEach((file, index) => {
            const reader = new FileReader();
            const fileId = `${Date.now()}-${index}`;

            reader.onload = (event) => {
                const content = event.target?.result as string;
                if (content) {
                    setAttachedFiles(prev => [...prev, { id: fileId, name: file.name, content, type: file.type }]);
                }
            };

            if (file.type.startsWith('image/')) {
                reader.readAsDataURL(file);
            } else {
                reader.readAsText(file);
            }
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            processFiles(e.target.files);
        }
    };

    useEffect(() => {
        const chatViewElement = document.getElementById('chat-view');
        if (!chatViewElement) return;
    
        const handleDragOver = (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(true);
        };
    
        const handleDragLeave = (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
        };
    
        const handleDrop = (e: DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
            if (e.dataTransfer?.files) {
                processFiles(e.dataTransfer.files);
                e.dataTransfer.clearData();
            }
        };
    
        const handlePaste = (e: ClipboardEvent) => {
            if (e.clipboardData?.files) {
                e.preventDefault();
                processFiles(e.clipboardData.files);
            }
        };
    
        chatViewElement.addEventListener('dragover', handleDragOver);
        chatViewElement.addEventListener('dragleave', handleDragLeave);
        chatViewElement.addEventListener('drop', handleDrop);
        document.addEventListener('paste', handlePaste);
    
        return () => {
            chatViewElement.removeEventListener('dragover', handleDragOver);
            chatViewElement.removeEventListener('dragleave', handleDragLeave);
            chatViewElement.removeEventListener('drop', handleDrop);
            document.removeEventListener('paste', handlePaste);
        };
    }, [attachedFiles]);

    const triggerFileSelect = () => fileInputRef.current?.click();
    const removeFile = (fileId: string) => {
        setAttachedFiles(prev => prev.filter(f => f.id !== fileId));
    };
    
    const handleStop = () => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        setIsLoading(false);
    };

    const generateTitleOnClient = async (userMessage: string, conversationId: string) => {
        // @ts-ignore
        const apiKey = process.env.API_KEY;
        if (!apiKey) return;
        const textClient = new OpenAI({ baseURL: "https://openrouter.ai/api/v1", apiKey, dangerouslyAllowBrowser: true });
        const systemPrompt = "Respond ONLY with a concise (3-5 words) title for this conversation.";
        try {
            const response = await textClient.chat.completions.create({ model: 'mistralai/mistral-7b-instruct-v0.2', messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }], max_tokens: 20 });
            let title = response.choices[0].message.content?.trim().replace(/["']/g, "") || "New Chat";
            await supabase.from('conversations').update({ title: title }).eq('id', conversationId);
            setConversations(prev => prev.map(c => (c.id === conversationId ? { ...c, title: title } : c)));
        } catch (error) { console.error("Failed to generate title", error); }
    };

    const handleAutoSavePersonalization = async (fact: string) => {
        if (!session) return;
        const { data } = await supabase.from('user_personalization').insert({ user_id: session.user.id, entry: fact }).select().single();
        if (data) {
            setPersonalizationEntries(prev => [...prev, { id: data.id, entry: data.entry }]);
            setShowMemoryToast(true);
            setTimeout(() => setShowMemoryToast(false), 5000);
        }
    };

    const processSubmission = async (userText: string) => {
        if (isLoading || (!userText.trim() && attachedFiles.length === 0)) return;

        // --- Context Management ---
        let currentChatHistory = [...chatHistory];
        const historyText = currentChatHistory.map(m => m.content).join('\n');
        const CONTEXT_THRESHOLD = 1900000;
        const SUMMARIZE_THRESHOLD = 900000;

        if (historyText.length > CONTEXT_THRESHOLD) {
            setIsLoading(true);
            const summaryMessageId = `sys-summary-${Date.now()}`;
            setMessages(prev => [...prev, { id: summaryMessageId, role: 'system', text: 'Compressing conversation history to save space...' }]);
            
            let charCount = 0;
            let splitIndex = 0;
            for (let i = 0; i < currentChatHistory.length; i++) {
                charCount += currentChatHistory[i].content.length;
                if (charCount > SUMMARIZE_THRESHOLD) {
                    splitIndex = i;
                    break;
                }
            }

            if (splitIndex === 0 && currentChatHistory.length > 1) {
                splitIndex = 1;
            }

            const toSummarize = currentChatHistory.slice(0, splitIndex);
            const toKeep = currentChatHistory.slice(splitIndex);

            try {
                const summary = await summarizeHistory(toSummarize);
                currentChatHistory = [
                    { role: 'system', content: `This is a summary of the beginning of the conversation: ${summary}` },
                    ...toKeep
                ];
                setChatHistory(currentChatHistory);
                setMessages(prev => prev.map(m => m.id === summaryMessageId ? { ...m, text: 'History compressed successfully.' } : m));
            } catch (e) {
                setMessages(prev => prev.map(m => m.id === summaryMessageId ? { ...m, text: 'Could not compress history. Proceeding with full context.' } : m));
            }
        }
        // --- End Context Management ---

        const videoKeywords = ['make a video', 'generate a video', 'create a video', 'video of'];
        const isVideoRequest = videoKeywords.some(k => userText.toLowerCase().includes(k));

        if (isVideoRequest) {
            setEmbeddedUrl('https://veoaifree.com');
            const userMessage: Message = { id: `user-${Date.now()}`, role: 'user', text: userText };
            const assistantMessage: Message = { id: `ai-${Date.now()}`, role: 'assistant', text: "Of course! Opening the video generation tool for you now." };
            setMessages(prev => [...prev, userMessage, assistantMessage]);
            setInputValue('');
            if (textareaRef.current) textareaRef.current.style.height = 'auto';
            return;
        }
        
        const imageKeywords = ['draw', 'paint', 'generate image', 'create an image', 'visualize', 'edit image', 'modify image', 'make an image'];
        const isImage = imageKeywords.some(k => userText.toLowerCase().includes(k));
        setThinkingMode(isImage ? 'image' : 'reasoning');
        setIsLoading(true);
        setInputValue('');
        if (textareaRef.current) textareaRef.current.style.height = 'auto';
        
        let userDisplay = userText;
        if (attachedFiles.length > 0) {
            const filePreviews = attachedFiles.map(file => {
                const isImg = file.type.startsWith('image/');
                return isImg ? `<img src="${file.content}" class="w-8 h-8 rounded object-cover border border-black/10" />` : `<span class="bg-gray-100 text-xs px-2 py-1 rounded border border-gray-200">${file.name}</span>`;
            }).join('');
            userDisplay = `${userText} <br/><div class="flex items-center gap-2 mt-2">${filePreviews}</div>`;
        }

        const userMessage: Message = { id: `user-${Date.now()}`, role: 'user', text: userDisplay };
        setMessages(prev => [...prev, userMessage]);
        
        let conversationId = currentConversationId;
        let isNewConversation = false;

        if (session && !conversationId) {
            isNewConversation = true;
            const { data: newConversation } = await supabase.from('conversations').insert({ user_id: session.user.id, title: "New Chat", persona_id: activePersona?.id || null }).select().single();
            if (newConversation) {
                conversationId = newConversation.id;
                setConversations(prev => [newConversation as Conversation, ...prev]);
                navigate(`/chat/${conversationId}`, { replace: true });
            } else { setIsLoading(false); return; }
        }

        const userContentForDb = attachedFiles.length > 0 ? `[User attached ${attachedFiles.length} file(s): ${attachedFiles.map(f => f.name).join(', ')}]\n${userText}` : userText;
        if (session && conversationId) {
            await supabase.from('messages').insert({ conversation_id: conversationId, user_id: session.user.id, role: 'user', content: userContentForDb });
        }
        
        const filesToProcess = [...attachedFiles];
        setAttachedFiles([]);
        const controller = new AbortController();
        abortControllerRef.current = controller;
        
        let personalizationData: string[] = [];
        if (session) {
            const { data } = await supabase.from('user_personalization').select('entry').eq('user_id', session.user.id);
            if (data) personalizationData = data.map(item => item.entry);
        }

        try {
            const stream = streamGemini(userText, chatHistory, true, personality, imageModelPref, filesToProcess, controller.signal, profile?.first_name, personalizationData, activePersona?.instructions || null);
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
                    const saveRegex = /<SAVE_PERSONALIZATION>(.*?)<\/SAVE_PERSONALIZATION>/s;
                    const match = accumulatedText.match(saveRegex);
                    let cleanedText = accumulatedText;
                    if (match && match[1]) {
                        handleAutoSavePersonalization(match[1].trim());
                        cleanedText = accumulatedText.replace(saveRegex, '').trim();
                        setMessages(prev => prev.map(msg => msg.id === aiMsgId ? { ...msg, text: cleanedText } : msg));
                    }
                    if (session && conversationId) await supabase.from('messages').insert({ conversation_id: conversationId, user_id: session.user.id, role: 'assistant', content: cleanedText });
                    if (update.newHistoryEntry) setChatHistory(prev => [...prev, { role: 'user', content: userContentForDb }, { ...update.newHistoryEntry, content: cleanedText } as any]);
                    if (isNewConversation && conversationId) generateTitleOnClient(userText, conversationId);
                }
            }
        } catch (err: any) {
            if (err.name !== 'AbortError') setMessages(prev => [...prev, { id: `error-${Date.now()}`, role: 'assistant', text: `**System Error:** ${err.message || "An unexpected error occurred."}` }]);
        } finally {
            setIsLoading(false);
            abortControllerRef.current = null;
        }
    };
    const handleChatSubmit = (e: FormEvent) => { e.preventDefault(); processSubmission(inputValue.trim()); };
    useEffect(() => { if (textareaRef.current) { textareaRef.current.style.height = 'auto'; textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`; } }, [inputValue]);
    
    const startNewPersonaChat = (persona: Persona) => { setActivePersona(persona); navigate('/chat'); setIsSidebarOpen(false); };
    const resetChat = () => { setActivePersona(null); navigate('/chat'); };
    const handleDeleteConversation = async (conversationId: string) => { if (window.confirm('Delete chat?')) { await supabase.from('messages').delete().eq('conversation_id', conversationId); await supabase.from('conversations').delete().eq('id', conversationId); setConversations(prev => prev.filter(c => c.id !== conversationId)); if (currentConversationId === conversationId) resetChat(); } };
    
    const renderMessageContent = (text: string) => {
        if (!text) return null;
        const widgetRegex = /```widget\n([\s\S]*?)\n```/;
        const widgetMatch = text.match(widgetRegex);
        if (widgetMatch) {
            const widgetContent = widgetMatch[1];
            const lines = widgetContent.split('\n');
            const typeLine = lines.find(l => l.startsWith('type:'));
            const parts = text.split(widgetMatch[0]);
            const beforeText = parts[0].trim();
            const afterText = parts[1]?.trim() || '';
            let widgetComponent = null;
            if (typeLine?.includes('stock')) {
                const symbol = lines.find(l => l.startsWith('symbol:'))?.split(':')[1]?.trim();
                if (symbol) widgetComponent = <StockWidget key="stock" symbol={symbol} />;
            } else if (typeLine?.includes('weather')) {
                const location = lines.find(l => l.startsWith('location:'))?.split(':')[1]?.trim() || 'Current Location';
                widgetComponent = <WeatherWidget key="weather" locationQuery={location} />;
            }
            return (<div className="w-full">{beforeText && <div dangerouslySetInnerHTML={{ __html: beforeText.replace(/\n/g, '<br/>') }} />}{widgetComponent}{afterText && <div className="mt-2" dangerouslySetInnerHTML={{ __html: afterText.replace(/\n/g, '<br/>') }} />}</div>);
        }
        const fileBlockRegex = /```(pdf|txt|html)\nfilename:\s*(.*?)\n---\n([\s\S]*)/;
        const match = text.match(fileBlockRegex);
        const simpleParse = (str: string) => {
            let parsed = str.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => `<div class="my-4"><img src="${url}" alt="${alt}" class="rounded-2xl shadow-md border border-gray-100 dark:border-white/10 w-full max-w-md h-auto object-cover" /></div>`);
            parsed = parsed.replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-[var(--text-primary)]">$1</strong>').replace(/`([^`]+)`/g, '<code class="bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded text-sm font-mono text-pink-500">$1</code>').replace(/\n/g, '<br />');
            return parsed;
        };
        if (match) {
            const [_, fileType, filename, content] = match;
            const confirmationText = text.substring(0, match.index!).trim();
            const parts = [];
            if (confirmationText) parts.push(<div key="text-part" dangerouslySetInnerHTML={{ __html: simpleParse(confirmationText) }} />);
            if (text.trim().endsWith('```')) {
                const finalContent = content.trim().slice(0, -3).trim();
                parts.push(<FileGenerator key="file-part" fileType={fileType.trim()} filename={filename.trim()} content={finalContent} />);
            } else { parts.push(<div key="file-loading" className="my-2 flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--glass-border)] animate-pulse"><FileIcon fileType={fileType} /><div className="flex-1"><div className="font-medium">Generating {filename.trim() || 'file'}...</div></div></div>); }
            return parts;
        }
        return <div dangerouslySetInnerHTML={{ __html: simpleParse(text) }} />;
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!session || !e.target.files?.[0]) return;
        try {
            const file = e.target.files[0];
            const fileExt = file.name.split('.').pop();
            const filePath = `${session.user.id}/${Date.now()}.${fileExt}`;
            await supabase.storage.from('avatars').upload(filePath, file);
            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
            await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', session.user.id);
            await refreshProfile();
        } catch (error: any) { alert(`Error: ${error.message}`); }
    };

    const handleDeleteAllConversations = async () => { if (window.confirm("Delete all history?")) { await supabase.rpc('delete_all_user_data'); setConversations([]); navigate('/chat'); } };
    const openSettings = async () => { if (session) { const { data } = await supabase.from('user_personalization').select('id, entry').eq('user_id', session.user.id); setPersonalizationEntries(data || []); } setShowSettings(true); };
    const handleDeletePersonalization = async (id: string) => { await supabase.from('user_personalization').delete().eq('id', id); setPersonalizationEntries(prev => prev.filter(e => e.id !== id)); };

    const groupedConversations = (() => {
        const groups: { [key: string]: Conversation[] } = { 'Today': [], 'Previous': [] };
        const today = new Date().setHours(0,0,0,0);
        conversations.filter(c => !c.persona_id).forEach(convo => {
            const date = new Date(convo.updated_at || convo.created_at).setHours(0,0,0,0);
            if (date === today) groups['Today'].push(convo); else groups['Previous'].push(convo);
        });
        return groups;
    })();

    return (
        <div id="chat-view" className="flex h-screen w-full bg-[var(--bg-primary)] transition-colors duration-300">
            <DynamicBackground status={backgroundStatus} />
            
            {showMemoryToast && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[60]">
                    <div className="glass-panel flex items-center gap-3 py-2 px-5 rounded-full animate-fade-in-up">
                        <svg className="w-4 h-4 text-blue-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M4 20h2"/><path d="M4 12h16"/><path d="M4 4h10"/><path d="M18 8h2"/><path d="M16 4v16"/></svg>
                        <span className="text-sm font-medium">Memory Updated</span>
                    </div>
                </div>
            )}

            {isDragging && <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center pointer-events-none"><div className="glass-panel p-8 rounded-3xl text-center"><h2 className="text-2xl font-bold mb-2">Drop Files</h2><p>Attach them to the chat</p></div></div>}
            {embeddedUrl && <EmbeddedView url={embeddedUrl} onClose={() => setEmbeddedUrl(null)} />}
            <PersonaManager isOpen={showPersonaManager} onClose={() => setShowPersonaManager(false)} onPersonaUpdate={fetchData} />

            {/* Sidebar */}
            <div className={`glass-sidebar w-80 flex-shrink-0 flex flex-col transition-transform duration-300 absolute md:relative z-40 h-full ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
                <div className="p-4 flex items-center justify-between">
                    <LogoMinimal />
                    <button onClick={() => setIsSidebarOpen(false)} className="md:hidden p-2 rounded-full hover:bg-[var(--glass-border)] text-[var(--text-secondary)]"><svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                </div>
                
                <div className="px-4 mb-4">
                    <button onClick={() => { resetChat(); if(window.innerWidth < 768) setIsSidebarOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-[var(--bg-primary)] shadow-sm border border-[var(--glass-border)] hover:border-[var(--accent)] transition-all group">
                        <div className="w-8 h-8 rounded-full bg-[var(--bg-secondary)] flex items-center justify-center text-[var(--accent)] group-hover:scale-110 transition-transform"><svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none"><path d="M12 5v14"/><path d="M5 12h14"/></svg></div>
                        <span className="font-semibold text-sm">New Conversation</span>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-2 space-y-6 scrollbar-hide">
                    {/* Personas Section */}
                    <div>
                        <div className="flex items-center justify-between px-3 mb-2">
                            <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">Personas</span>
                            <button onClick={() => setShowPersonaManager(true)} className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14"/><path d="M5 12h14"/></svg></button>
                        </div>
                        {personas.map(p => (
                            <button key={p.id} onClick={() => startNewPersonaChat(p)} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--glass-border)] transition-colors text-left">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-pink-400 to-orange-400 flex-shrink-0" />
                                <span className="text-sm font-medium truncate">{p.name}</span>
                            </button>
                        ))}
                    </div>

                    {/* Chat History */}
                    {Object.entries(groupedConversations).map(([label, items]) => items.length > 0 && (
                        <div key={label}>
                            <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">{label}</div>
                            {items.map(chat => (
                                <div key={chat.id} onClick={() => { navigate(`/chat/${chat.id}`); if(window.innerWidth < 768) setIsSidebarOpen(false); }} className={`group flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${currentConversationId === chat.id ? 'bg-[var(--bg-primary)] shadow-sm' : 'hover:bg-[var(--glass-border)]'}`}>
                                    <span className={`text-sm truncate ${currentConversationId === chat.id ? 'font-semibold text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}>{chat.title || 'New Chat'}</span>
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteConversation(chat.id); }} className="opacity-0 group-hover:opacity-100 p-1 text-[var(--text-tertiary)] hover:text-red-500"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></button>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>

                <div className="p-4 border-t border-[var(--glass-border)] bg-[var(--sidebar-bg)]">
                    <div className="flex items-center justify-between">
                        {session && (
                            <button onClick={openSettings} className="flex items-center gap-3 text-sm font-medium hover:opacity-80 transition-opacity">
                                <img src={profile?.avatar_url || `https://ui-avatars.com/api/?name=${session.user.email}&background=random`} className="w-8 h-8 rounded-full" alt="Profile" />
                                <div className="text-left">
                                    <div className="truncate w-32 text-[var(--text-primary)]">{profile?.first_name || 'User'}</div>
                                    <div className="text-xs text-[var(--text-secondary)]">Pro Plan</div>
                                </div>
                            </button>
                        )}
                        <button onClick={toggleTheme} className="p-2 rounded-full hover:bg-[var(--glass-border)] text-[var(--text-secondary)]">
                            {theme === 'light' ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg> : <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>}
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col relative h-full">
                {/* Header */}
                <div className="h-16 flex items-center px-4 md:px-8 border-b border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-md z-30">
                    <button onClick={() => setIsSidebarOpen(true)} className="md:hidden p-2 mr-2 text-[var(--text-secondary)]"><svg width="24" height="24" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg></button>
                    <div className="font-semibold text-[var(--text-primary)]">{activePersona ? activePersona.name : (currentConversationId ? 'Chat' : 'Quillix')}</div>
                    <div className="ml-auto flex items-center gap-2">
                        <button onClick={() => navigate('/dev')} className="text-xs font-medium px-3 py-1.5 rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors">Dev Mode</button>
                        <button onClick={() => setEmbeddedUrl('https://veoaifree.com')} className="text-xs font-medium px-3 py-1.5 rounded-full bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] transition-colors">Video</button>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 md:p-8 scrollbar-hide">
                    {messages.length === 0 && !isLoading ? (
                        <div className="h-full flex flex-col items-center justify-center text-center space-y-8">
                            <div className="w-20 h-20 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-[2rem] flex items-center justify-center shadow-2xl shadow-indigo-500/20 mb-4 animate-fade-in-up">
                                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2z"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
                            </div>
                            <h2 className="text-3xl font-bold text-[var(--text-primary)] animate-fade-in-up" style={{ animationDelay: '0.1s' }}>Hello, {profile?.first_name || 'User'}</h2>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                                {['Create a React component', 'Explain quantum computing', 'Write a poem about rain', 'Analyze this data'].map((suggestion, i) => (
                                    <button key={i} onClick={() => setInputValue(suggestion)} className="p-4 rounded-2xl bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] text-left transition-all text-sm font-medium">
                                        {suggestion}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-3xl mx-auto space-y-6">
                            {messages.map((msg, idx) => (
                                <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in-up`}>
                                    {msg.role === 'assistant' && <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex-shrink-0 flex items-center justify-center text-white text-xs font-bold shadow-md">Q</div>}
                                    <div className={`max-w-[85%] px-5 py-3.5 rounded-[1.25rem] text-[15px] leading-relaxed shadow-sm ${
                                        msg.role === 'user' 
                                            ? 'bg-[var(--accent)] text-[var(--accent-text)] rounded-br-sm' 
                                            : 'bg-[var(--bg-secondary)] text-[var(--text-primary)] rounded-bl-sm border border-[var(--glass-border)]'
                                    }`}>
                                        <div className={msg.role === 'assistant' ? 'prose' : ''}>{renderMessageContent(msg.text)}</div>
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex gap-4 animate-pulse">
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex-shrink-0" />
                                    <div className="px-5 py-3.5 rounded-[1.25rem] rounded-bl-sm bg-[var(--bg-secondary)] border border-[var(--glass-border)]">
                                        <ThinkingProcess isThinking={true} mode={thinkingMode} />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} className="h-12" />
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 md:p-6 bg-gradient-to-t from-[var(--bg-primary)] to-transparent z-30">
                    <div className="max-w-3xl mx-auto relative">
                        {isLoading ? (
                            <div className="flex justify-center"><button onClick={handleStop} className="flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-primary)] text-sm font-medium hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="4" width="16" height="16" rx="2"/></svg>Stop Generating</button></div>
                        ) : isVoiceMode ? (
                            <VoiceInputView onClose={() => setIsVoiceMode(false)} onFinalTranscript={(t) => { processSubmission(t); setIsVoiceMode(false); }} />
                        ) : (
                            <form onSubmit={handleChatSubmit} className="relative group">
                                <div className="absolute bottom-full left-0 mb-2 flex flex-wrap gap-2">
                                    {attachedFiles.map(f => (
                                        <div key={f.id} className="relative group/file">
                                            {f.type.startsWith('image/') ? <img src={f.content} className="w-16 h-16 rounded-lg object-cover border border-[var(--glass-border)] shadow-sm" /> : <div className="w-16 h-16 bg-[var(--bg-secondary)] rounded-lg flex items-center justify-center border border-[var(--glass-border)]"><FileIcon fileType={f.type} /></div>}
                                            <button type="button" onClick={() => removeFile(f.id)} className="absolute -top-1 -right-1 bg-black text-white rounded-full p-0.5 opacity-0 group-hover/file:opacity-100 transition-opacity"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                                        </div>
                                    ))}
                                </div>
                                <div className="glass-panel p-2 rounded-[1.75rem] flex items-end shadow-lg transition-shadow duration-300 focus-within:shadow-xl focus-within:ring-1 focus-within:ring-[var(--glass-border)] bg-[var(--bg-primary)]">
                                    <button type="button" onClick={triggerFileSelect} className="p-3 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-full transition-all"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 5v14"/><path d="M5 12h14"/></svg></button>
                                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" multiple />
                                    <textarea ref={textareaRef} value={inputValue} onChange={e => setInputValue(e.target.value)} onKeyDown={e => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSubmit(e); } }} placeholder="Message Quillix..." rows={1} className="flex-1 bg-transparent border-none focus:ring-0 text-[var(--text-primary)] placeholder-[var(--text-tertiary)] py-3.5 max-h-32 resize-none" style={{ minHeight: '52px' }} />
                                    <button type="button" onClick={() => setIsVoiceMode(true)} className="p-3 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-full transition-all"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg></button>
                                    <button type="submit" disabled={!inputValue.trim() && attachedFiles.length === 0} className="p-3 ml-1 bg-[var(--text-primary)] text-[var(--bg-primary)] rounded-full disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:scale-105"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg></button>
                                </div>
                            </form>
                        )}
                        <div className="text-center mt-2 text-[10px] text-[var(--text-tertiary)]">Quillix can make mistakes. Check important info.</div>
                    </div>
                </div>
            </div>

            {/* Settings Modal */}
            {showSettings && (
                <div className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowSettings(false)}>
                    <div className="bg-[var(--bg-primary)] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-[var(--glass-border)] flex justify-between items-center"><h3 className="font-semibold text-[var(--text-primary)]">Settings</h3><button onClick={() => setShowSettings(false)} className="p-1 rounded-full hover:bg-[var(--bg-secondary)]"><svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button></div>
                        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
                            <div><label className="block text-xs font-semibold uppercase text-[var(--text-secondary)] mb-2">Personality</label><div className="grid grid-cols-2 gap-2">{['conversational', 'academic', 'formal', 'brainrot'].map(m => (<button key={m} onClick={() => setPersonality(m as any)} className={`p-2 rounded-lg text-sm border capitalize ${personality === m ? 'border-[var(--accent)] text-[var(--accent)] bg-[var(--accent)]/5' : 'border-[var(--glass-border)] text-[var(--text-secondary)]'}`}>{m}</button>))}</div></div>
                            <div><label className="block text-xs font-semibold uppercase text-[var(--text-secondary)] mb-2">Image Model</label><div className="grid grid-cols-2 gap-2"><button onClick={() => handleImageModelChange('img3')} className={`p-2 rounded-lg text-sm border ${imageModelPref === 'img3' ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--glass-border)] text-[var(--text-secondary)]'}`}>Fast (K3)</button><button onClick={() => handleImageModelChange('img4')} className={`p-2 rounded-lg text-sm border ${imageModelPref === 'img4' ? 'border-[var(--accent)] text-[var(--accent)]' : 'border-[var(--glass-border)] text-[var(--text-secondary)]'}`}>Quality (K4)</button></div></div>
                            {session && personalizationEntries.length > 0 && <div><label className="block text-xs font-semibold uppercase text-[var(--text-secondary)] mb-2">Memory</label><div className="space-y-2">{personalizationEntries.map(e => (<div key={e.id} className="flex justify-between items-center text-sm p-2 bg-[var(--bg-secondary)] rounded-lg"><span>{e.entry}</span><button onClick={() => handleDeletePersonalization(e.id)} className="text-red-400 hover:text-red-500">×</button></div>))}</div></div>}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ChatView;