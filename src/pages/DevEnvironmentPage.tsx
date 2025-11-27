import React, { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ChatPanel from '../components/ChatPanel';
import WorkspacePanel from '../components/WorkspacePanel';
import DynamicBackground from '../components/DynamicBackground';
import { Message, Role } from '../types';
import { streamGemini } from '../services/geminiService';
import { useSession } from '../contexts/SessionContext';
import { supabase } from '../integrations/supabase/client';
import OpenAI from 'openai';

const DevEnvironmentPage: React.FC = () => {
    const { session, profile } = useSession();
    const { conversationId: paramConversationId } = useParams<{ conversationId?: string }>();
    const navigate = useNavigate();

    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activeFile, setActiveFile] = useState<{ path: string; content: string } | null>(null);
    const [buildVersion, setBuildVersion] = useState(0);
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        setCurrentConversationId(paramConversationId || null);
    }, [paramConversationId]);

    useEffect(() => {
        if (!currentConversationId || !session) {
            setMessages([]);
            setActiveFile(null);
            return;
        }
        const fetchConversation = async () => {
            const { data: convoData, error: convoError } = await supabase
                .from('conversations')
                .select('context')
                .eq('id', currentConversationId)
                .single();
            
            if (convoError) console.error("Error fetching conversation context:", convoError);
            else if (convoData?.context?.file) {
                setActiveFile(convoData.context.file);
                setBuildVersion(v => v + 1);
            }

            const { data, error } = await supabase.from('messages').select('*').eq('conversation_id', currentConversationId).order('created_at', { ascending: true });
            if (error) {
                console.error('Error fetching messages:', error);
            } else {
                const loadedMessages: Message[] = data.map((msg: { id: string; role: string; content: string; }) => ({ id: msg.id, role: msg.role as Role, text: msg.content }));
                setMessages(loadedMessages);
            }
        };
        fetchConversation();
    }, [currentConversationId, session]);

    const handleBuild = (files: { path: string; content: string }[]) => {
        if (files.length > 0) {
            setBuildVersion(prev => prev + 1);
            setMessages(prev => [...prev, { id: `build-start-${Date.now()}`, role: 'system', text: "Build process initiated..." }]);
            files.forEach((file, index) => {
                setTimeout(() => {
                    setMessages(prev => [...prev, { id: `build-file-${index}`, role: 'system', text: `✅ Synced file: ${file.path}` }]);
                }, (index + 1) * 500);
            });
            setTimeout(() => {
                setMessages(prev => [...prev, { id: `build-end-${Date.now()}`, role: 'system', text: "Build complete! Preview updated." }]);
            }, (files.length + 1) * 500);
        }
    };

    const handleInitialFile = async (file: { path: string; content: string }) => {
        setActiveFile(file);
        setBuildVersion(prev => prev + 1);
        setMessages([{ id: `system-${Date.now()}`, role: 'system', text: `Started with file: ${file.path}` }]);
        if (currentConversationId && session) {
            await supabase.from('conversations').update({ context: { file } }).eq('id', currentConversationId);
        }
    };

    const generateTitle = async (userMessage: string, conversationId: string) => {
        // @ts-ignore
        const apiKey = process.env.API_KEY;
        if (!apiKey) return;
        const client = new OpenAI({ baseURL: "https://openrouter.ai/api/v1", apiKey, dangerouslyAllowBrowser: true });
        const prompt = `Based on the user's first request in a web dev session, create a concise title (5 words or less). User request: "${userMessage}". Respond ONLY with the title.`;
        try {
            const res = await client.chat.completions.create({ model: 'mistralai/mistral-7b-instruct-v0.2', messages: [{ role: 'user', content: prompt }], max_tokens: 20 });
            const title = res.choices[0].message.content?.trim().replace(/["']/g, "") || "New Dev Session";
            await supabase.from('conversations').update({ title }).eq('id', conversationId);
        } catch (error) {
            console.error("Failed to generate title:", error);
        }
    };

    const handleUserSubmit = async (userText: string, attachedFiles: {id: string, name: string, content: string, type: string}[]) => {
        if (isLoading || (!userText.trim() && attachedFiles.length === 0)) return;

        setIsLoading(true);
        const userMessage: Message = { id: `user-${Date.now()}`, role: 'user', text: userText };
        setMessages(prev => [...prev, userMessage]);
        
        let conversationId = currentConversationId;
        let isNewConversation = false;

        if (session && !conversationId) {
            isNewConversation = true;
            const { data: newConvo, error } = await supabase
                .from('conversations')
                .insert({ user_id: session.user.id, title: "New Dev Session", type: 'dev', context: activeFile ? { file: activeFile } : null })
                .select()
                .single();
            
            if (error) {
                console.error("Error creating dev session:", error);
                setIsLoading(false);
                return;
            }
            conversationId = newConvo.id;
            navigate(`/dev/${conversationId}`, { replace: true });
        }

        if (session && conversationId) {
            await supabase.from('messages').insert({ conversation_id: conversationId, user_id: session.user.id, role: 'user', content: userText });
        }

        const controller = new AbortController();
        abortControllerRef.current = controller;

        const devSystemPrompt = "You are an expert AI web developer. Your task is to help the user build and modify a web application. When asked to create or modify a file, respond ONLY with the complete file content in a single markdown code block. Do not include any other text, explanation, or conversation. The code block must start with `// path: path/to/file.ext`. You can receive images for context (e.g., bug screenshots, mockups).";

        try {
            const devHistory = messages.filter(m => m.role === 'user' || m.role === 'assistant').map(m => ({ role: m.role as 'user' | 'assistant', content: m.text }));
            const stream = streamGemini(devSystemPrompt + "\n\nUser Request: " + userText, devHistory, false, 'formal', 'img4', attachedFiles, controller.signal, profile?.first_name, []);
            
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

                    const codeBlockRegex = /```(?:\w+)?\n\/\/ path: ([\w\/\.-]+)\n([\s\S]*)/;
                    const match = accumulatedText.match(codeBlockRegex);
                    if (match) {
                        const path = match[1].trim();
                        const content = match[2].replace(/```$/, '').trim();
                        const newFile = { path, content };
                        setActiveFile(newFile);
                        if (conversationId) {
                            await supabase.from('conversations').update({ context: { file: newFile } }).eq('id', conversationId);
                        }
                    }
                }
                if (update.isComplete) {
                    if (session && conversationId) {
                        await supabase.from('messages').insert({ conversation_id: conversationId, user_id: session.user.id, role: 'assistant', content: accumulatedText });
                    }
                    if (isNewConversation && conversationId) {
                        generateTitle(userText, conversationId);
                    }
                    const codeBlockRegex = /```(?:\w+)?\n\/\/ path: ([\w\/\.-]+)\n([\s\S]*?)```/g;
                    const matches = [...accumulatedText.matchAll(codeBlockRegex)];
                    if (matches.length > 0) {
                        const files = matches.map(m => ({ path: m[1].trim(), content: m[2].trim() }));
                        handleBuild(files);
                    }
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

    return (
        <>
            <DynamicBackground status="idle" />
            <div className="fixed inset-0 z-10 flex bg-transparent text-zinc-100 font-sans overflow-hidden">
                <ChatPanel 
                    messages={messages}
                    isLoading={isLoading}
                    onSubmit={handleUserSubmit}
                    onInitialFile={handleInitialFile} 
                />
                <WorkspacePanel 
                    activeFile={activeFile} 
                    buildVersion={buildVersion}
                    isLoading={isLoading}
                />
            </div>
        </>
    );
};

export default DevEnvironmentPage;