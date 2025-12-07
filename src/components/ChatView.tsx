import React, { useState, useEffect, useRef, FormEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import OpenAI from 'openai';
import katex from 'katex';
import { Message, ChatHistory, PersonalityMode, Conversation, Role, Persona } from '../types';
import { streamGemini, summarizeHistory } from '../services/geminiService';
import { ThinkingProcess } from './ThinkingProcess';
import { useSession } from '../contexts/SessionContext';
import { supabase } from '../integrations/supabase/client';
import DynamicBackground from './DynamicBackground';
import EmbeddedView from './EmbeddedView';
import VoiceInputView from './VoiceInputView';
import GeminiLiveView from './GeminiLiveView';
import FileGenerator from './FileGenerator';
import FileIcon from './FileIcon';
import PersonaManager from './PersonaManager';
import StockWidget from './StockWidget';
import WeatherWidget from './WeatherWidget';
import LegalModal from './LegalModal';
import SupportModal from './SupportModal';
import AccountSettingsModal from './AccountSettingsModal';
import ImageGenerationPlaceholder from './ImageGenerationPlaceholder';
import { termsOfService, privacyPolicy } from '../legal';

const NexusIconSmall = () => (
    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/10 shadow-lg">
        <img src="/quillix-logo.png" alt="Quillix Logo" className="w-5 h-5" />
    </div>
);

const OrbLogo = () => (
    <div className="relative w-24 h-24 flex items-center justify-center mb-8">
        <div className="absolute inset-0 rounded-full bg-indigo-500 blur-2xl opacity-30"></div>
        <img src="/quillix-logo.png" alt="Quillix Logo" className="w-20 h-20 animate-spin-slow" />
    </div>
);

const ChatView: React.FC = () => {
    const { session, profile } = useSession();
    const { conversationId: paramConversationId } = useParams<{ conversationId?: string }>();
    const navigate = useNavigate();

    const [messages, setMessages] = useState<Message[]>([]);
    const [chatHistory, setChatHistory] = useState<ChatHistory>([]);
    const [inputValue, setInputValue] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [thinkingMode, setThinkingMode] = useState<'reasoning' | 'image'>('reasoning');
    
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showAccountSettings, setShowAccountSettings] = useState(false);
    const [showPersonaManager, setShowPersonaManager] = useState(false);
    const [personality, setPersonality] = useState<PersonalityMode>('conversational');
    const [imageModelPref, setImageModelPref] = useState(profile?.image_model_preference || 'nano-banana');
    
    const [attachedFiles, setAttachedFiles] = useState<{id: string, name: string, content: string, type: string}[]>([]);
    const [isDragging, setIsDragging] = useState(false);

    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [personas, setPersonas] = useState<Persona[]>([]);
    const [isDataLoading, setIsDataLoading] = useState(true);
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
    const [activePersona, setActivePersona] = useState<Persona | null>(null);
    const [activePersonaFile, setActivePersonaFile] = useState<{ name: string, content: string, type: string } | null>(null);
    const [isPersonaListOpen, setIsPersonaListOpen] = useState(true);
    const [backgroundStatus, setBackgroundStatus] = useState<'idle' | 'loading-text' | 'loading-image'>('idle');

    const [isVoiceMode, setIsVoiceMode] = useState(false);
    const [isGeminiLiveMode, setIsGeminiLiveMode] = useState(false); // New state for Gemini Live
    const [embeddedUrl, setEmbeddedUrl] = useState<string | null>(null);
    
    const [personalizationEntries, setPersonalizationEntries] = useState<{id: string, entry: string}[]>([]);
    const [showMemoryToast, setShowMemoryToast] = useState(false);

    const [fullscreenImage, setFullscreenImage] = useState<string | null>(null);

    const [legalModal, setLegalModal] = useState<{ title: string, content: string } | null>(null);
    const [supportModal, setSupportModal] = useState<'support' | 'suggestion' | null>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    const fetchData = async () => {
        if (!session) {
            setIsDataLoading(false);
            return;
        }
        setIsDataLoading(true);
        const { data: convos, error: convoError } = await supabase.from('conversations').select('*').order('updated_at', { ascending: false });
        if (convoError) console.error('Error fetching conversations:', convoError);
        else setConversations(convoError ? [] : (convos as Conversation[]));

        const { data: personasData, error: personaError } = await supabase.from('personas').select('*').order('created_at', { ascending: false });
        if (personaError) console.error('Error fetching personas:', personaError);
        else setPersonas(personaError ? [] : (personasData as Persona[]));
        
        setIsDataLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [session]);

    useEffect(() => {
        setCurrentConversationId(paramConversationId || null);
        if (!paramConversationId) {
            setActivePersona(null);
            setActivePersonaFile(null);
        }
    }, [paramConversationId]);

    useEffect(() => {
        const loadPersonaFile = async () => {
            if (activePersona && activePersona.file_path) {
                try {
                    const { data, error } = await supabase.storage.from('persona_files').download(activePersona.file_path);
                    if (error) throw error;
                    
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        const content = e.target?.result as string;
                        setActivePersonaFile({
                            name: activePersona.file_name || 'attached_file',
                            type: activePersona.file_type || data.type,
                            content: content
                        });
                    };
                    reader.readAsDataURL(data);
                } catch (error) {
                    console.error("Error loading persona file:", error);
                    setActivePersonaFile(null);
                }
            } else {
                setActivePersonaFile(null);
            }
        };
        loadPersonaFile();
    }, [activePersona]);

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

    const handleRegenerate = async () => {
        if (messages.length < 2 || isLoading) return;

        const lastUserMsgIndex = messages.findLastIndex(m => m.role === 'user');
        if (lastUserMsgIndex === -1) return;

        const lastUserMsg = messages[lastUserMsgIndex];
        
        setMessages(prev => prev.slice(0, lastUserMsgIndex + 1));
        
        setChatHistory(prev => {
            const newHistory = [...prev];
            if (newHistory.length > 0 && newHistory[newHistory.length - 1].role === 'assistant') {
                newHistory.pop();
            }
            return newHistory;
        });

        const div = document.createElement("div");
        div.innerHTML = lastUserMsg.text;
        const rawText = div.textContent || lastUserMsg.text; 
        
        reGenerateResponse(rawText);
    };

    const reGenerateResponse = async (userText: string) => {
        setIsLoading(true);
        setThinkingMode('reasoning');
        
        if (textareaRef.current) textareaRef.current.style.height = '52px';

        const controller = new AbortController();
        abortControllerRef.current = controller;
        
        let personalizationData: string[] = [];
        if (session) {
            const { data, error } = await supabase.from('user_personalization').select('entry').eq('user_id', session.user.id);
            if (!error && data) {
                personalizationData = data.map(item => item.entry);
            }
        }

        try {
            const stream = streamGemini(
                userText, 
                chatHistory, 
                true, 
                personality, 
                imageModelPref, 
                [], 
                controller.signal, 
                profile?.first_name, 
                personalizationData, 
                activePersona?.instructions || null,
                activePersonaFile
            );
            
            let assistantMessageExists = false;
            let accumulatedText = "";
            let accumulatedThought = "";
            const aiMsgId = `ai-${Date.now()}`;
            
            for await (const update of stream) {
                if (update.mode) { setThinkingMode(update.mode); }
                if (!assistantMessageExists) { 
                    setMessages(prev => [...prev, { id: aiMsgId, role: 'assistant', text: '', thought: '' }]); 
                    assistantMessageExists = true; 
                }
                
                if (update.thought) {
                    accumulatedThought = update.thought;
                }

                if (update.text) {
                    accumulatedText = update.text;
                }

                setMessages(prev => prev.map(msg => 
                    msg.id === aiMsgId ? { ...msg, text: accumulatedText, thought: accumulatedThought } : msg
                ));

                if (update.isComplete) {
                    const saveRegex = /<SAVE_PERSONALIZATION>(.*?)<\/SAVE_PERSONALIZATION>/s;
                    const match = accumulatedText.match(saveRegex);
                    let cleanedText = accumulatedText;

                    if (match && match[1]) {
                        const factToSave = match[1].trim();
                        handleAutoSavePersonalization(factToSave);
                        cleanedText = accumulatedText.replace(saveRegex, '').trim();
                        setMessages(prev => prev.map(msg => msg.id === aiMsgId ? { ...msg, text: cleanedText } : msg));
                    }

                    if (session && currentConversationId) {
                        await supabase.from('messages').insert({ conversation_id: currentConversationId, user_id: session.user.id, role: 'assistant', content: cleanedText });
                    }
                    if (update.newHistoryEntry) { 
                        const newEntry = { ...update.newHistoryEntry, content: cleanedText };
                        setChatHistory(prev => [...prev, newEntry]); 
                    }
                }
            }
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                 setMessages(prev => [...prev, { id: `error-${Date.now()}`, role: 'assistant', text: `**System Error:** ${err.message || "An unexpected error occurred."}` }]);
            }
        } finally {
            setIsLoading(false);
            abortControllerRef.current = null;
        }
    };

    useEffect(() => {
        const handleChatViewClick = async (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            const downloadButton = target.closest('.download-image-btn');
            const fullscreenButton = target.closest('.fullscreen-image-btn');
            const betterImageButton = target.closest('.better-image-btn');

            if (fullscreenButton) {
                e.preventDefault();
                const imageUrl = fullscreenButton.getAttribute('data-src');
                if (imageUrl) {
                    setFullscreenImage(imageUrl);
                }
            }

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
                        
                        const filename = `quillix-${Date.now()}.png`;
                        a.download = filename;
                        
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                    } catch (error) {
                        console.error('Proxy download failed, falling back to direct:', error);
                        const a = document.createElement('a');
                        a.href = imageUrl;
                        a.download = `quillix-${Date.now()}.png`;
                        a.target = '_blank';
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                    } finally {
                        if (blobUrl) window.URL.revokeObjectURL(blobUrl);
                    }
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

            reader.readAsDataURL(file);
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
            if (e.clipboardData?.files && e.clipboardData.files.length > 0) {
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

    const generateTitleOnClient = async (userMessage: string, conversationId: string) => {
        // @ts-ignore
        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            console.error("API Key for title generation is missing.");
            return;
        }
        const textClient = new OpenAI({
            baseURL: "https://openrouter.ai/api/v1",
            apiKey: apiKey,
            dangerouslyAllowBrowser: true
        });
    
        const systemPrompt = "You are a title generation expert. Based on the user's first message, create a concise and relevant title for the conversation. The title must be 4 words or less. Respond ONLY with the generated title, nothing else.";
    
        try {
            const response = await textClient.chat.completions.create({
                model: 'mistralai/mistral-7b-instruct-v0.2',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userMessage }
                ],
                max_tokens: 20,
                temperature: 0.5,
            });
    
            let title = response.choices[0].message.content?.trim() || "New Chat";
            title = title.replace(/^(title suggestion:|title:)\s*/i, '').replace(/["']/g, "");
            if (!title) {
                title = "New Chat"; 
            }
            
            await supabase
                .from('conversations')
                .update({ title: title })
                .eq('id', conversationId);
            
            setConversations(prev =>
                prev.map(c => (c.id === conversationId ? { ...c, title: title } : c))
            );
    
        } catch (error) {
            console.error("Failed to generate title on client:", error);
            await supabase
                .from('conversations')
                .update({ title: "New Chat" })
                .eq('id', conversationId);
            setConversations(prev =>
                prev.map(c => (c.id === conversationId ? { ...c, title: "New Chat" } : c))
            );
        }
    };

    const handleAutoSavePersonalization = async (fact: string) => {
        if (!session) return;
        const { data, error } = await supabase
            .from('user_personalization')
            .insert({ user_id: session.user.id, entry: fact })
            .select()
            .single();
        if (error) {
            console.error("Error auto-saving personalization", error);
        } else if (data) {
            setPersonalizationEntries(prev => [...prev, { id: data.id, entry: data.entry }]);
            setShowMemoryToast(true);
            setTimeout(() => setShowMemoryToast(false), 5000);
        }
    };

    const processSubmission = async (userText: string) => {
        if (isLoading || (!userText.trim() && attachedFiles.length === 0)) return;

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

        const videoKeywords = ['make a video', 'generate a video', 'create a video', 'video of'];
        const isVideoRequest = videoKeywords.some(k => userText.toLowerCase().includes(k));

        if (isVideoRequest) {
            if (!session) {
                navigate('/auth');
                return;
            }
            setEmbeddedUrl('https://veoaifree.com');
            const userMessage: Message = { id: `user-${Date.now()}`, role: 'user', text: userText };
            const assistantMessage: Message = { id: `ai-${Date.now()}`, role: 'assistant', text: "Of course! Opening the video generation tool for you now." };
            setMessages(prev => [...prev, userMessage, assistantMessage]);
            setInputValue('');
            if (textareaRef.current) textareaRef.current.style.height = '52px';
            return;
        }
        
        const imageKeywords = ['draw', 'paint', 'generate image', 'create an image', 'visualize', 'edit image', 'modify image', 'make an image'];
        const isImage = imageKeywords.some(k => userText.toLowerCase().includes(k));
        setThinkingMode(isImage ? 'image' : 'reasoning');
        setIsLoading(true);
        setInputValue('');

        if (textareaRef.current) textareaRef.current.style.height = '52px';
        
        let userDisplay = userText;
        if (attachedFiles.length > 0) {
            const filePreviews = attachedFiles.map(file => {
                const isImg = file.type.startsWith('image/');
                return isImg ? `<img src="${file.content}" class="w-8 h-8 rounded object-cover border border-white/20" />` : `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>`;
            }).join('');
            userDisplay = `${userText} <br/><div class="flex items-center gap-2 mt-2">${filePreviews}</div>`;
        }

        const userMessage: Message = { id: `user-${Date.now()}`, role: 'user', text: userDisplay };
        setMessages(prev => [...prev, userMessage]);
        
        let conversationId = currentConversationId;
        let isNewConversation = false;

        if (session && !conversationId) {
            isNewConversation = true;
            const { data: newConversation, error: createError } = await supabase
                .from('conversations')
                .insert({ 
                    user_id: session.user.id, 
                    title: "Generating title...",
                    persona_id: activePersona?.id || null,
                })
                .select()
                .single();

            if (createError) {
                console.error("Error creating conversation", createError);
                setIsLoading(false);
                return;
            }
            
            conversationId = newConversation.id;
            setConversations(prev => [newConversation as Conversation, ...prev]);
            navigate(`/chat/${conversationId}`, { replace: true });
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
            const { data, error } = await supabase.from('user_personalization').select('entry').eq('user_id', session.user.id);
            if (!error && data) {
                personalizationData = data.map(item => item.entry);
            }
        }

        try {
            const stream = streamGemini(
                userText, 
                currentChatHistory, 
                true, 
                personality, 
                imageModelPref, 
                filesToProcess, 
                controller.signal, 
                profile?.first_name, 
                personalizationData, 
                activePersona?.instructions || null,
                activePersonaFile
            );
            let assistantMessageExists = false;
            let accumulatedText = "";
            let accumulatedThought = "";
            const aiMsgId = `ai-${Date.now()}`;
            for await (const update of stream) {
                if (update.mode) { setThinkingMode(update.mode); }
                if (!assistantMessageExists) { setMessages(prev => [...prev, { id: aiMsgId, role: 'assistant', text: '', thought: '' }]); assistantMessageExists = true; }
                
                if (update.thought) {
                    accumulatedThought = update.thought;
                }

                if (update.text) {
                    accumulatedText = update.text;
                }

                setMessages(prev => prev.map(msg => 
                    msg.id === aiMsgId ? { ...msg, text: accumulatedText, thought: accumulatedThought } : msg
                ));

                if (update.isComplete) {
                    const saveRegex = /<SAVE_PERSONALIZATION>(.*?)<\/SAVE_PERSONALIZATION>/s;
                    const match = accumulatedText.match(saveRegex);
                    let cleanedText = accumulatedText;

                    if (match && match[1]) {
                        const factToSave = match[1].trim();
                        handleAutoSavePersonalization(factToSave);
                        cleanedText = accumulatedText.replace(saveRegex, '').trim();
                        setMessages(prev => prev.map(msg => msg.id === aiMsgId ? { ...msg, text: cleanedText } : msg));
                    }

                    if (session && conversationId) {
                        await supabase.from('messages').insert({ conversation_id: conversationId, user_id: session.user.id, role: 'assistant', content: cleanedText });
                    }
                    if (update.newHistoryEntry) { 
                        const newEntry = { ...update.newHistoryEntry, content: cleanedText };
                        setChatHistory(prev => [...prev, { role: 'user', content: userContentForDb }, newEntry]); 
                    }
                    
                    if (isNewConversation && conversationId) {
                        generateTitleOnClient(userText, conversationId);
                    }
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
            textareaRef.current.style.height = `${Math.min(Math.max(scrollHeight, 48), 200)}px`;
        }
    }, [inputValue]);
    
    const startNewPersonaChat = (persona: Persona) => {
        setActivePersona(persona);
        navigate('/chat');
        setIsSidebarOpen(false);
    };

    const resetChat = () => { 
        setActivePersona(null);
        navigate('/chat');
    };

    const handleDeleteConversation = async (conversationId: string) => {
        if (window.confirm('Are you sure you want to delete this chat?')) {
            await supabase.from('messages').delete().eq('conversation_id', conversationId);
            await supabase.from('conversations').delete().eq('id', conversationId);
            setConversations(prev => prev.filter(c => c.id !== conversationId));
            if (currentConversationId === conversationId) { 
                resetChat();
            }
        }
    };
    
    const renderMessageContent = (msg: Message) => {
        const text = msg.text;
        if (!text && !msg.thought) return null;

        // Widget Logic
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
                const symbolLine = lines.find(l => l.startsWith('symbol:'));
                const symbol = symbolLine?.split(':')[1]?.trim();
                if (symbol) {
                    widgetComponent = <StockWidget key="stock" symbol={symbol} />;
                }
            } else if (typeLine?.includes('weather')) {
                const locationLine = lines.find(l => l.startsWith('location:'));
                const location = locationLine?.split(':')[1]?.trim() || 'Current Location';
                widgetComponent = <WeatherWidget key="weather" locationQuery={location} />;
            }

            return (
                <div className="w-full">
                    {msg.thought && (
                        <details className="mb-4 bg-white/5 rounded-lg border border-white/10 overflow-hidden group/thought">
                            <summary className="cursor-pointer p-3 text-xs font-mono text-zinc-400 flex items-center gap-2 hover:bg-white/5 transition-colors select-none">
                                <svg className="w-4 h-4 transition-transform group-open/thought:rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
                                <span>Thought Process</span>
                            </summary>
                            <div className="p-3 pt-0 text-zinc-400 text-sm font-mono border-t border-white/5 bg-black/20 whitespace-pre-wrap leading-relaxed">
                                {msg.thought}
                            </div>
                        </details>
                    )}
                    {beforeText && <div dangerouslySetInnerHTML={{ __html: beforeText.replace(/\n/g, '<br/>') }} />}
                    {widgetComponent}
                    {afterText && <div className="mt-2" dangerouslySetInnerHTML={{ __html: afterText.replace(/\n/g, '<br/>') }} />}
                </div>
            );
        }
    
        const fileBlockRegex = /```(pdf|txt|html)\nfilename:\s*(.*?)\n---\n([\s\S]*)/;
        const match = text.match(fileBlockRegex);

        const extractSources = (inputText: string) => {
            const links: { title: string, url: string }[] = [];
            const mdLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
            let mdMatch;
            while ((mdMatch = mdLinkRegex.exec(inputText)) !== null) {
                links.push({ title: mdMatch[1], url: mdMatch[2] });
            }
            const urlRegex = /(https?:\/\/[^\s<)\]]+)/g;
            let urlMatch;
            while ((urlMatch = urlRegex.exec(inputText)) !== null) {
                const url = urlMatch[1];
                if (!links.some(l => l.url === url)) {
                    try {
                        const domain = new URL(url).hostname.replace(/^www\./, '');
                        links.push({ title: domain, url: url });
                    } catch (e) {
                        // Invalid URL, ignore
                    }
                }
            }
            const uniqueLinks = new Map();
            links.forEach(link => {
                if (!uniqueLinks.has(link.url)) {
                    uniqueLinks.set(link.url, link);
                }
            });
            return Array.from(uniqueLinks.values());
        };

        const sources = extractSources(text);
        let textToDisplay = text;
        if (sources.length > 0) {
            const sourceBlockRegex = /(?:\r\n|\r|\n|^)\s*(?:Sources?|References?|Citations?|SOURCE)(?::|)\s*(?:\[[^\]]+\]\([^)]+\)(?:[\s|,\u2022-]*))+$/im;
            textToDisplay = text.replace(sourceBlockRegex, '').trim();
        }
    
        const simpleParse = (str: string) => {
            let parsed = str;
            const placeholders: string[] = [];
            const addPlaceholder = (content: string) => {
                placeholders.push(content);
                return `__PLACEHOLDER_${placeholders.length - 1}__`;
            };

            // 1. Math Rendering (LaTeX) - Do this first to protect it
            parsed = parsed.replace(/\$\$([\s\S]*?)\$\$/g, (_, equation) => {
                try {
                    return addPlaceholder(`<div class="my-4 text-center overflow-x-auto">${katex.renderToString(equation, { displayMode: true, throwOnError: false })}</div>`);
                } catch (e) {
                    return `$$${equation}$$`;
                }
            });
            parsed = parsed.replace(/\\\[(.*?)\\\]/g, (_, equation) => {
                try {
                     return addPlaceholder(katex.renderToString(equation, { displayMode: true, throwOnError: false }));
                } catch(e) { return `\\[${equation}\\]`; }
            });
            parsed = parsed.replace(/\\\((.*?)\\\)/g, (_, equation) => {
                try {
                     return addPlaceholder(katex.renderToString(equation, { displayMode: false, throwOnError: false }));
                } catch(e) { return `\\(${equation}\\)`; }
            });

            // 2. Standard Image Parsing - Protect these from bare URL regex
            parsed = parsed.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (_, alt, url) => {
                const downloadIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>`;
                const fullscreenIcon = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>`;
                const imgHtml = `<div class="mt-3 mb-3 block w-full max-w-lg">
                    <div class="relative group">
                        <img src="${url}" alt="${alt}" class="rounded-xl shadow-lg border border-white/10 w-full h-auto object-cover" />
                        <div class="absolute top-3 right-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300">
                            <button title="View Fullscreen" class="fullscreen-image-btn bg-black/60 hover:bg-black/80 backdrop-blur-md text-white w-10 h-10 flex items-center justify-center rounded-full shadow-xl border border-white/10 interactive-lift" data-src="${url}">
                                ${fullscreenIcon}
                            </button>
                            <a href="${url}" title="Download Image" class="download-image-btn bg-black/60 hover:bg-black/80 backdrop-blur-md text-white w-10 h-10 flex items-center justify-center rounded-full shadow-xl border border-white/10 interactive-lift">
                                ${downloadIcon}
                            </a>
                        </div>
                    </div>
                </div>`;
                return addPlaceholder(imgHtml);
            });

            // 3. Tables
            parsed = parsed.replace(
                /^\|(.+)\|\r?\n\|([\s\-|:]+)\|\r?\n((?:\|.*(?:\r?\n|$))*)/gm,
                (_match, headerLine, _separatorLine, bodyLines) => {
                    const headers = headerLine.split('|').map((h: string) => h.trim()).filter(Boolean);
                    const rows = bodyLines.trim().split('\n').map((rowLine: string) => 
                        rowLine.split('|').map((c: string) => c.trim()).filter(Boolean)
                    );
                    const thead = `<thead><tr class="border-b border-white/20">${headers.map((h: string) => `<th class="p-3 text-left font-semibold">${h}</th>`).join('')}</tr></thead>`;
                    const tbody = `<tbody>${rows.map((row: string[]) => `<tr class="border-b border-white/10">${row.map((cell: string) => `<td class="p-3">${cell}</td>`).join('')}</tr>`).join('')}</tbody>`;
                    return addPlaceholder(`<div class="my-4 overflow-x-auto bg-black/20 border border-white/10 rounded-lg"><table class="w-full text-sm">${thead}${tbody}</table></div>`);
                }
            );

            // 4. Headers
            parsed = parsed.replace(/^#### (.*$)/gm, '<h4 class="text-base font-semibold text-zinc-200 mt-4 mb-2">$1</h4>');
            parsed = parsed.replace(/^### (.*$)/gm, '<h3 class="text-lg font-bold text-white mt-5 mb-3">$1</h3>');
            parsed = parsed.replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold text-white mt-6 mb-3">$1</h2>');
            parsed = parsed.replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold text-white mt-8 mb-4 border-b border-white/10 pb-2">$1</h1>');

            // 5. Markdown Links [text](url) -> <a ...>text</a>
            parsed = parsed.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" class="text-indigo-400 hover:text-indigo-300 hover:underline transition-colors">$1</a>');

            // 6. Bare URLs (Now safe because images/math are placeholders)
            parsed = parsed.replace(/(?<!href="|">)(https?:\/\/[^\s<]+)/g, (url) => {
                return `<a href="${url}" target="_blank" class="text-indigo-400 hover:text-indigo-300 hover:underline transition-colors break-all">${url}</a>`;
            });

            const emojiRegex = /([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g;
            parsed = parsed.replace(emojiRegex, '<span class="no-invert inline-block">$1</span>');

            parsed = parsed.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-semibold">$1</strong>')
                           .replace(/`([^`]+)`/g, '<code class="bg-black/20 px-1.5 py-0.5 rounded text-sm font-mono text-cyan-300 border border-white/10">$1</code>')
                           .replace(/\n/g, '<br />');

            // Restore Placeholders
            placeholders.forEach((content, i) => {
                parsed = parsed.replace(`__PLACEHOLDER_${i}__`, content);
            });

            return parsed;
        };
    
        if (match) {
            const [_, fileType, filename, content] = match;
            const startIndex = match.index!;
            const confirmationText = text.substring(0, startIndex).trim();
            const cleanConfirmationText = sources.length > 0 
                ? confirmationText.replace(/(?:\r\n|\r|\n|^)\s*(?:Sources?|References?|Citations?|SOURCE)(?::|)\s*(?:\[[^\]]+\]\([^)]+\)(?:[\s|,\u2022-]*))+$/im, '').trim()
                : confirmationText;

            const parts = [];
    
            if (cleanConfirmationText || msg.thought) {
                parts.push(
                    <div key="text-part">
                        {msg.thought && (
                            <details className="mb-4 bg-white/5 rounded-lg border border-white/10 overflow-hidden group/thought">
                                <summary className="cursor-pointer p-3 text-xs font-mono text-zinc-400 flex items-center gap-2 hover:bg-white/5 transition-colors select-none">
                                    <svg className="w-4 h-4 transition-transform group-open/thought:rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
                                    <span>Thought Process</span>
                                </summary>
                                <div className="p-3 pt-0 text-zinc-400 text-sm font-mono border-t border-white/5 bg-black/20 whitespace-pre-wrap leading-relaxed">
                                    {msg.thought}
                                </div>
                            </details>
                        )}
                        <div dangerouslySetInnerHTML={{ __html: simpleParse(cleanConfirmationText) }} />
                    </div>
                );
            }
    
            if (text.trim().endsWith('```')) {
                const finalContent = content.trim().slice(0, -3).trim();
                parts.push(<FileGenerator key="file-part" fileType={fileType.trim()} filename={filename.trim()} content={finalContent} />);
            } else {
                parts.push(
                    <div key="file-loading" className="my-2 flex items-center gap-3 p-3 rounded-lg bg-zinc-800 border border-zinc-700 animate-pulse">
                        <FileIcon fileType={fileType} />
                        <div className="flex-1">
                            <div className="font-medium text-zinc-300">Generating {filename.trim() || 'file'}...</div>
                            <div className="text-sm text-zinc-500">Receiving content...</div>
                        </div>
                    </div>
                );
            }
            if (sources.length > 0) {
                parts.push(
                    <div key="sources" className="mt-4 flex flex-wrap gap-2 pt-4 border-t border-white/10">
                        {sources.map((source, idx) => (
                            <a 
                                key={idx} 
                                href={source.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 bg-black/20 hover:bg-black/40 border border-white/5 hover:border-white/20 rounded-full px-3 py-1.5 text-xs text-zinc-300 hover:text-white transition-all duration-200 max-w-[200px]"
                            >
                                <img 
                                    src={`https://www.google.com/s2/favicons?domain=${new URL(source.url).hostname}&sz=32`}
                                    alt=""
                                    className="w-3.5 h-3.5 rounded-sm opacity-70"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                                <span className="truncate">{source.title}</span>
                            </a>
                        ))}
                    </div>
                );
            }
            return parts;
        }
    
        return (
            <div className="w-full">
                {msg.thought && (
                    <details className="mb-4 bg-white/5 rounded-lg border border-white/10 overflow-hidden group/thought">
                        <summary className="cursor-pointer p-3 text-xs font-mono text-zinc-400 flex items-center gap-2 hover:bg-white/5 transition-colors select-none">
                            <svg className="w-4 h-4 transition-transform group-open/thought:rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m9 18 6-6-6-6"/></svg>
                            <span>Thought Process</span>
                        </summary>
                        <div className="p-3 pt-0 text-zinc-400 text-sm font-mono border-t border-white/5 bg-black/20 whitespace-pre-wrap leading-relaxed">
                            {msg.thought}
                        </div>
                    </details>
                )}
                <div dangerouslySetInnerHTML={{ __html: simpleParse(textToDisplay) }} />
                {sources.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2 pt-4 border-t border-white/10">
                        {sources.map((source, idx) => (
                            <a 
                                key={idx} 
                                href={source.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 bg-black/20 hover:bg-black/40 border border-white/5 hover:border-white/20 rounded-full px-3 py-1.5 text-xs text-zinc-300 hover:text-white transition-all duration-200 max-w-[200px]"
                            >
                                <img 
                                    src={`https://www.google.com/s2/favicons?domain=${new URL(source.url).hostname}&sz=32`}
                                    alt=""
                                    className="w-3.5 h-3.5 rounded-sm opacity-70"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                                <span className="truncate">{source.title}</span>
                            </a>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const handleDeleteAllConversations = async () => {
        if (!session) return;
        const isConfirmed = window.confirm("Are you sure you want to delete all conversations? This action cannot be undone.");
        if (isConfirmed) {
            try {
                const { error } = await supabase.rpc('delete_all_user_data');
                if (error) throw error;
                setConversations([]);
                navigate('/chat');
            } catch (error: any) {
                console.error("Error deleting all conversations:", error);
                alert(`Error: ${error.message}`);
            }
        }
    };

    const openSettings = async () => {
        if (session) {
            const { data, error } = await supabase
                .from('user_personalization')
                .select('id, entry')
                .eq('user_id', session.user.id)
                .order('created_at', { ascending: true });
            if (error) {
                console.error("Error fetching personalization", error);
            } else {
                setPersonalizationEntries(data);
            }
        }
        setShowSettings(true);
    };

    const handleDeletePersonalization = async (id: string) => {
        const { error } = await supabase.from('user_personalization').delete().eq('id', id);
        if (error) {
            console.error("Error deleting personalization entry", error);
        } else {
            setPersonalizationEntries(prev => prev.filter(entry => entry.id !== id));
        }
    };

    const groupConversations = (conversations: Conversation[]) => {
        const groups: { [key: string]: Conversation[] } = {
            'Today': [],
            'Yesterday': [],
            'This Week': [],
            'This Month': [],
            'Longer Ago': [],
        };

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        const startOfWeek = new Date(today);
        startOfWeek.setDate(startOfWeek.getDate() - now.getDay());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        conversations.forEach(convo => {
            const convoDate = new Date(convo.updated_at || convo.created_at);
            if (convoDate >= today) {
                groups['Today'].push(convo);
            } else if (convoDate >= yesterday) {
                groups['Yesterday'].push(convo);
            } else if (convoDate >= startOfWeek) {
                groups['This Week'].push(convo);
            } else if (convoDate >= startOfMonth) {
                groups['This Month'].push(convo);
            } else {
                groups['Longer Ago'].push(convo);
            }
        });

        return groups;
    };

    const generalConversations = conversations.filter(c => !c.persona_id);
    const groupedConversations = groupConversations(generalConversations);

    return (
        <div id="chat-view" className="fixed inset-0 z-50 flex flex-col bg-transparent text-zinc-100 font-sans overflow-hidden">
            <DynamicBackground status={backgroundStatus} />
            
            {showMemoryToast && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50">
                    <div data-liquid-glass className="liquid-glass flex items-center gap-3 py-2 px-5 rounded-full animate-pop-in">
                        <svg className="w-5 h-5 text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M4 20h2"/><path d="M4 12h16"/><path d="M4 4h10"/><path d="M18 8h2"/><path d="M16 4v16"/></svg>
                        <span className="text-sm font-medium text-white">Memory Updated</span>
                    </div>
                </div>
            )}

            {fullscreenImage && (
                <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex items-center justify-center animate-in fade-in duration-200" onClick={() => setFullscreenImage(null)}>
                    <button className="absolute top-6 right-6 p-3 text-white/70 hover:text-white transition-colors bg-white/10 hover:bg-white/20 rounded-full z-50">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                    <img src={fullscreenImage} className="max-w-[95vw] max-h-[95vh] rounded-lg shadow-2xl object-contain animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()} />
                </div>
            )}

            {legalModal && <LegalModal title={legalModal.title} content={legalModal.content} onClose={() => setLegalModal(null)} />}
            {supportModal && <SupportModal type={supportModal} onClose={() => setSupportModal(null)} />}
            {showAccountSettings && <AccountSettingsModal isOpen={showAccountSettings} onClose={() => setShowAccountSettings(false)} />}

            {isDragging && (
                <div className="absolute inset-0 z-[101] bg-black/70 backdrop-blur-md flex items-center justify-center border-4 border-dashed border-indigo-500 rounded-3xl m-4 pointer-events-none">
                    <div className="text-center">
                        <svg className="w-16 h-16 text-indigo-400 mx-auto mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                        <h2 className="text-2xl font-bold text-white">Drop file to attach</h2>
                        <p className="text-zinc-400">You can attach images, text files, and more.</p>
                    </div>
                </div>
            )}

            {embeddedUrl && <EmbeddedView url={embeddedUrl} onClose={() => setEmbeddedUrl(null)} />}
            
            {isGeminiLiveMode && <GeminiLiveView onClose={() => setIsGeminiLiveMode(false)} />}

            <PersonaManager isOpen={showPersonaManager} onClose={() => setShowPersonaManager(false)} onPersonaUpdate={fetchData} />

            {showSettings && (
                <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setShowSettings(false)}>
                    <div data-liquid-glass className="liquid-glass w-full max-w-md shadow-2xl animate-pop-in" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6 border-b border-white/10 flex justify-between items-center">
                            <h2 className="text-xl font-bold text-white font-brand">Settings</h2>
                            <button onClick={() => setShowSettings(false)} className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"><svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                        </div>
                        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-hide">
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
                                        <div className="font-medium text-sm">Quillix K3</div>
                                        <div className="text-xs opacity-60">Fast generation (~15s).</div>
                                    </button>
                                    <button onClick={() => handleImageModelChange('nano-banana')} className={`text-left px-4 py-3 rounded-xl border transition-all duration-300 relative overflow-hidden ${imageModelPref === 'nano-banana' ? 'bg-indigo-500/20 border-indigo-500/50 text-white shadow-lg' : 'bg-white/5 border-white/10 text-zinc-300 hover:border-white/20 hover:bg-white/10'}`}>
                                        <span className="absolute top-2 right-2 bg-indigo-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">Recommended</span>
                                        <div className="font-medium text-sm">Quillix K4</div>
                                        <div className="text-xs opacity-60">Highest quality (~20s).</div>
                                    </button>
                                </div>
                            </div>
                            {session && (
                                <div>
                                    <label className="block text-sm font-medium text-zinc-400 mb-3">Personalization</label>
                                    <div className="space-y-2">
                                        {personalizationEntries.length > 0 ? (
                                            personalizationEntries.map(entry => (
                                                <div key={entry.id} className="flex items-center justify-between bg-white/5 p-2.5 rounded-lg animate-pop-in">
                                                    <p className="text-sm text-zinc-300">{entry.entry}</p>
                                                    <button onClick={() => handleDeletePersonalization(entry.id)} className="p-1.5 text-zinc-500 hover:text-red-400 rounded-full hover:bg-red-500/10 transition-colors" title="Delete Entry">
                                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                                    </button>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm text-zinc-500 text-center py-4">No personalization entries saved yet. The AI will suggest facts to save as you chat.</p>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Sidebar code */}
            <div data-liquid-glass className={`fixed inset-y-0 left-0 z-40 w-96 liquid-glass border-l-0 border-t-0 border-b-0 rounded-none rounded-r-2xl transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="flex flex-col h-full p-4 space-y-4">
                    <div className="flex justify-between items-center"><div className="font-bold tracking-wide text-white flex items-center gap-2"><img src="/quillix-logo.png" alt="Quillix Logo" className="w-6 h-6 animate-spin-slow" />Quillix</div><button onClick={() => setIsSidebarOpen(false)} className="text-zinc-400 hover:text-white p-1 rounded-full hover:bg-white/10"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg></button></div>
                    
                    <button onClick={() => setSupportModal('suggestion')} className="w-full text-xs text-center text-indigo-400 hover:text-indigo-300 hover:underline transition-colors pb-1">
                        Have suggestions?
                    </button>
                    
                    <button onClick={() => { resetChat(); setIsSidebarOpen(false); }} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-white hover:bg-zinc-200 text-black rounded-full transition-colors duration-300 text-sm font-semibold interactive-lift"><svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none"><path d="M12 5v14"/><path d="M5 12h14"/></svg>New Chat</button>
                    
                    <div className="flex-1 overflow-y-auto space-y-1 p-2 scrollbar-hide">
                        {isDataLoading ? (
                            <div className="flex items-center justify-center gap-2 p-2 text-sm text-zinc-400">
                                <svg className="animate-spin h-4 w-4 text-zinc-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                Loading...
                            </div>
                        ) : (
                            <>
                                <div className="border-b border-white/10 pb-2 mb-2">
                                    <div className="flex items-center justify-between px-2">
                                        <button onClick={() => setIsPersonaListOpen(prev => !prev)} className="w-full flex items-center justify-between text-left">
                                            <h3 className="text-sm font-semibold text-zinc-300">My Personas</h3>
                                            <svg className={`w-4 h-4 text-zinc-500 transition-transform ${isPersonaListOpen ? 'rotate-180' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                                        </button>
                                        <button onClick={() => setShowPersonaManager(true)} className="p-1.5 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full" title="Create New Persona">+</button>
                                    </div>
                                    {isPersonaListOpen && (
                                        <div className="mt-2 space-y-1">
                                            {personas.map(persona => (
                                                <div key={persona.id} className="group">
                                                    <div onClick={() => startNewPersonaChat(persona)} className={`p-2 rounded-lg cursor-pointer ${activePersona?.id === persona.id && !currentConversationId ? 'bg-indigo-500/20' : 'hover:bg-white/5'}`}>
                                                        <p className={`text-sm truncate ${activePersona?.id === persona.id && !currentConversationId ? 'text-indigo-300' : 'text-zinc-200'}`}>{persona.name}</p>
                                                    </div>
                                                    {conversations.filter(c => c.persona_id === persona.id).map(chat => (
                                                        <div key={chat.id} onClick={() => navigate(`/chat/${chat.id}`)} className={`pl-6 p-2 rounded-lg relative cursor-pointer ${currentConversationId === chat.id ? 'bg-white/10' : 'hover:bg-white/5'}`}>
                                                            <p className="text-xs text-zinc-400 truncate pr-6">{chat.title || 'New Chat'}</p>
                                                            <button onClick={(e) => { e.stopPropagation(); handleDeleteConversation(chat.id); }} className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" title="Delete Chat"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                                                        </div>
                                                    ))}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {Object.entries(groupedConversations).map(([groupName, groupConversations]) => (
                                    groupConversations.length > 0 && (
                                        <div key={groupName} className="mb-3">
                                            <div className="text-xs font-semibold text-zinc-500 px-2 py-1 uppercase tracking-wider mb-1">{groupName}</div>
                                            {groupConversations.map(chat => (
                                                <div key={chat.id} onClick={() => navigate(`/chat/${chat.id}`)} data-liquid-glass className={`liquid-glass p-3 rounded-xl my-1.5 group relative cursor-pointer transition-all duration-300 hover:scale-[1.03] hover:bg-white/10 ${currentConversationId === chat.id ? 'bg-white/10' : ''}`}>
                                                    <div className={`w-full text-left text-sm truncate pr-6 ${currentConversationId === chat.id ? 'text-white font-semibold' : 'text-zinc-300'}`}>{chat.title || 'New Chat'}</div>
                                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteConversation(chat.id); }} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity" title="Delete Chat"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg></button>
                                                </div>
                                            ))}
                                        </div>
                                    )
                                ))}
                            </>
                        )}
                    </div>
                    <div className="space-y-2">
                        <button onClick={() => window.open('https://gofund.me/4747854c6', '_blank')} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-green-400 hover:text-green-300 hover:bg-green-500/10 rounded-lg transition-colors">
                           <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
                            Keep this project alive
                        </button>
                        <button onClick={() => setSupportModal('support')} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                            Need help?
                        </button>
                        <button onClick={openSettings} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l-.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.47a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.35a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>Settings</button>
                        {session ? (
                            <button onClick={() => setShowAccountSettings(true)} className="w-full flex items-center justify-between gap-3 px-3 py-2 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="shrink-0 group relative">
                                        {profile?.avatar_url ? (
                                            <img src={profile.avatar_url} alt="User Avatar" className="w-8 h-8 rounded-full object-cover" />
                                        ) : (
                                            <div className="w-8 h-8 rounded-full liquid-glass flex items-center justify-center border border-white/10">
                                                <svg className="w-5 h-5 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-sm text-zinc-200 truncate text-left">
                                        {profile?.first_name && profile?.last_name 
                                            ? `${profile.first_name} ${profile.last_name}` 
                                            : session.user.email}
                                    </div>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); supabase.auth.signOut(); }} className="text-zinc-300 hover:text-white p-1.5 hover:bg-white/10 rounded-md" title="Log Out"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg></button>
                            </button>
                        ) : (
                            <button onClick={() => navigate('/auth')} className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-full transition-colors duration-300 text-sm font-semibold interactive-lift">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                                Sign In / Sign Up
                            </button>
                        )}
                        {session && (
                            <button onClick={handleDeleteAllConversations} className="w-full flex items-center gap-3 px-3 py-2 text-sm text-zinc-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                                Clear all chats
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-30" onClick={() => setIsSidebarOpen(false)}></div>}

            <main className="flex-1 relative flex flex-col overflow-hidden">
                <header className="h-16 flex items-center justify-between px-6 shrink-0 border-b border-white/10 backdrop-blur-md bg-black/10">
                    <div className="flex items-center gap-3">
                        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-white/5 rounded-full text-zinc-400 hover:text-white transition-colors" title="Menu"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg></button>
                        <span className="font-semibold text-sm tracking-wide text-zinc-300">{activePersona ? activePersona.name : (currentConversationId && session ? conversations.find(c => c.id === currentConversationId)?.title : 'Quillix')}</span>
                    </div>
                    {!session && (
                        <button onClick={() => navigate('/auth')} className="bg-white/10 backdrop-blur-md border border-white/20 text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-white/20 transition-all duration-300 interactive-lift">
                            Sign In / Sign Up
                        </button>
                    )}
                </header>

                <div className="flex-1 overflow-y-auto relative z-10 scrollbar-hide">
                    {messages.length === 0 && !isLoading && !currentConversationId ? (
                        <div className="h-full flex flex-col items-center justify-center">
                            <div className="flex-1 flex flex-col items-center justify-center text-center">
                                <OrbLogo />
                                <h1 className="text-2xl font-medium text-white tracking-tight">
                                    {activePersona ? `Chatting with ${activePersona.name}` : "What can I do for you today?"}
                                </h1>
                                {activePersona && <p className="text-zinc-400 mt-2 max-w-md">{activePersona.description}</p>}
                            </div>
                            <div className="w-full max-w-5xl mx-auto px-4 pb-8">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <button 
                                        onClick={() => {
                                            if (!session) { navigate('/auth'); return; }
                                            setEmbeddedUrl('https://veoaifree.com');
                                        }}
                                        data-liquid-glass
                                        className="liquid-glass p-4 rounded-2xl text-left interactive-lift space-y-2"
                                    >
                                        <h3 className="font-semibold text-white">Make a video</h3>
                                        <p className="text-sm text-zinc-400">Create a video from a text prompt.</p>
                                    </button>
                                    <button 
                                        onClick={() => navigate('/dev')}
                                        data-liquid-glass
                                        className="liquid-glass p-4 rounded-2xl text-left interactive-lift space-y-2"
                                    >
                                        <h3 className="font-semibold text-white">AI Web Developer</h3>
                                        <p className="text-sm text-zinc-400">Build and edit code with an AI partner.</p>
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setInputValue('Make an image of ');
                                            textareaRef.current?.focus();
                                        }}
                                        data-liquid-glass
                                        className="liquid-glass p-4 rounded-2xl text-left interactive-lift space-y-2"
                                    >
                                        <h3 className="font-semibold text-white">Make an image</h3>
                                        <p className="text-sm text-zinc-400">Generate an image from a prompt.</p>
                                    </button>
                                    <button 
                                        onClick={() => navigate('/quiz')}
                                        data-liquid-glass
                                        className="liquid-glass p-4 rounded-2xl text-left interactive-lift space-y-2"
                                    >
                                        <h3 className="font-semibold text-white">Quiz me on...</h3>
                                        <p className="text-sm text-zinc-400">Test your knowledge on any topic.</p>
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
                            {messages.map((msg, index) => (
                                <div key={msg.id} className={`flex items-start gap-4 animate-pop-in ${msg.role === 'user' ? 'justify-end' : ''} group`}>
                                    {msg.role === 'assistant' && <div className="shrink-0 mt-1"><NexusIconSmall /></div>}
                                    <div data-liquid-glass className={`relative max-w-[85%] leading-relaxed ${msg.role === 'user' ? 'light-liquid-glass text-white px-5 py-3 rounded-3xl rounded-br-lg' : 'dark-liquid-glass px-5 py-3 rounded-3xl rounded-bl-lg'}`}>
                                        <div className="font-medium text-sm text-zinc-400 mb-2">
                                            {msg.role === 'assistant' ? (activePersona?.name || 'Quillix') : 'You'}
                                        </div>
                                        <div className={`${msg.role === 'assistant' ? 'text-zinc-100 prose prose-invert prose-sm max-w-none' : ''}`}>
                                            {renderMessageContent(msg)}
                                        </div>
                                        {msg.role === 'assistant' && !isLoading && (
                                            <div className="flex items-center gap-2 mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => handleTTS(msg.text)} className="p-1.5 text-zinc-500 hover:text-zinc-300 hover:bg-white/5 rounded-md transition-colors" title="Read Aloud">
                                                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>
                                                </button>
                                                {/* Only show Regenerate for the LAST assistant message */}
                                                {index === messages.length - 1 && (
                                                    <button onClick={handleRegenerate} className="p-1.5 text-zinc-500 hover:text-indigo-400 hover:bg-white/5 rounded-md transition-colors" title="Regenerate Response">
                                                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 21h5v-5"/></svg>
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {isLoading && (
                                <div className="flex items-start gap-4 animate-pop-in group">
                                    <div className="shrink-0 mt-1"><NexusIconSmall /></div>
                                    {thinkingMode === 'image' ? (
                                        <div data-liquid-glass className="dark-liquid-glass p-4 rounded-3xl rounded-bl-lg">
                                            <div className="w-full max-w-lg aspect-[9/16] bg-black/20 rounded-xl flex items-center justify-center">
                                                <ImageGenerationPlaceholder />
                                            </div>
                                        </div>
                                    ) : (
                                        <ThinkingProcess isThinking={true} mode="reasoning" />
                                    )}
                                </div>
                            )}
                            <div ref={messagesEndRef} className="h-48"></div>
                        </div>
                    )}
                </div>

                <div className="w-full max-w-5xl mx-auto p-4 z-20">
                    {isLoading ? (
                        <div className="flex flex-col items-center gap-3">
                            <button onClick={handleStop} className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-5 py-2.5 rounded-full font-medium transition-all shadow-lg flex items-center gap-2 text-sm interactive-lift">
                                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M6 6h12v12H6z"></path></svg>
                                Stop Generating
                            </button>
                        </div>
                    ) : isVoiceMode ? (
                        <VoiceInputView
                            onClose={() => setIsVoiceMode(false)}
                            onFinalTranscript={(transcript) => {
                                processSubmission(transcript);
                                setIsVoiceMode(false);
                            }}
                        />
                    ) : (
                        <div className="relative">
                            <form onSubmit={handleChatSubmit} className="relative">
                                <div data-liquid-glass className="liquid-glass rounded-full flex items-center p-2 transition-all duration-300 focus-within:shadow-2xl focus-within:shadow-indigo-500/20">
                                    <button type="button" onClick={triggerFileSelect} className="p-2 rounded-full text-zinc-300 hover:text-white hover:bg-white/10 transition-colors ml-1" title="Attach File"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg></button>
                                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/*,application/pdf,text/plain,text/code,application/json" multiple />
                                    <textarea ref={textareaRef} value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleChatSubmit(e); } }} rows={1} placeholder="Message Quillix..." className="flex-1 bg-transparent border-none text-white placeholder-zinc-500 focus:ring-0 focus:outline-none resize-none py-3.5 px-3 h-auto max-h-[120px] overflow-y-auto scrollbar-hide"></textarea>
                                    
                                    <div className="flex items-center gap-1">
                                        <button type="button" onClick={() => setIsGeminiLiveMode(true)} className="p-2 rounded-full text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/20 transition-colors" title="Quillix Voice">
                                            <div className="flex items-end justify-center gap-0.5 w-5 h-5">
                                                <div className="w-1 bg-current rounded-full animate-[bounce_1s_infinite] h-2"></div>
                                                <div className="w-1 bg-current rounded-full animate-[bounce_1.2s_infinite] h-3"></div>
                                                <div className="w-1 bg-current rounded-full animate-[bounce_0.8s_infinite] h-2.5"></div>
                                                <div className="w-1 bg-current rounded-full animate-[bounce_1.1s_infinite] h-1.5"></div>
                                            </div>
                                        </button>
                                        <button type="button" onClick={() => setIsVoiceMode(true)} className="p-2 rounded-full text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"><svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg></button>
                                        <button type="submit" disabled={isLoading || (!inputValue.trim() && attachedFiles.length === 0)} className={`w-9 h-9 flex items-center justify-center rounded-full transition-all duration-200 ml-1 ${(inputValue.trim() || attachedFiles.length > 0) && !isLoading ? 'bg-white text-black hover:bg-zinc-200 shadow-lg' : 'bg-white/10 text-zinc-500 cursor-not-allowed'}`}><svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></button>
                                    </div>
                                </div>
                                {attachedFiles.length > 0 && (
                                    <div className="absolute bottom-full w-full left-0 mb-2 px-2">
                                        <div className="flex gap-3 flex-wrap p-2 bg-black/30 backdrop-blur-md rounded-xl border border-white/10">
                                            {attachedFiles.map(file => (
                                                <div key={file.id} className="relative w-20 h-20 bg-black/50 rounded-lg border border-white/10 group animate-pop-in">
                                                    {file.type.startsWith('image/') ? (
                                                        <img src={file.content} alt={file.name} className="w-full h-full object-cover rounded-lg" />
                                                    ) : (
                                                        <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                                                            <svg className="w-6 h-6 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
                                                            <span className="text-xs text-zinc-300 mt-1 truncate w-full">{file.name}</span>
                                                        </div>
                                                    )}
                                                    <button type="button" onClick={() => removeFile(file.id)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-zinc-800 hover:bg-red-500 border border-white/20 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all" title={`Remove ${file.name}`}>
                                                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </form>
                            {messages.length === 0 && (
                                <div className="text-xs text-zinc-500 mt-2 text-center">
                                    Quillix is an experimental AI. By using it, you agree to our <a href="#" onClick={(e) => { e.preventDefault(); setLegalModal({ title: 'Terms of Service', content: termsOfService }); }} className="underline hover:text-zinc-300">Terms of Service</a> and <a href="#" onClick={(e) => { e.preventDefault(); setLegalModal({ title: 'Privacy Policy', content: privacyPolicy }); }} className="underline hover:text-zinc-300">Privacy Policy</a>.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default ChatView;