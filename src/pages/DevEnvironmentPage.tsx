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
    const [isBuilding, setIsBuilding] = useState(false);
    
    const [projectFiles, setProjectFiles] = useState<{ path: string; content: string }[]>([]);
    const [activePath, setActivePath] = useState<string | null>(null);

    const [buildVersion, setBuildVersion] = useState(0);
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
    const abortControllerRef = useRef<AbortController | null>(null);

    useEffect(() => {
        setCurrentConversationId(paramConversationId || null);
    }, [paramConversationId]);

    useEffect(() => {
        if (!currentConversationId || !session) {
            setMessages([]);
            setProjectFiles([]);
            setActivePath(null);
            return;
        }
        const fetchConversation = async () => {
            setIsBuilding(true);
            const { data: convoData, error: convoError } = await supabase
                .from('conversations')
                .select('context')
                .eq('id', currentConversationId)
                .single();
            
            if (convoError) console.error("Error fetching conversation context:", convoError);
            else if (convoData?.context?.files) {
                setProjectFiles(convoData.context.files);
                setActivePath(convoData.context.activePath || (convoData.context.files.find((f: { path: string }) => f.path === 'index.html')?.path || convoData.context.files[0]?.path || null));
                setBuildVersion(v => v + 1);
            }

            const { data, error } = await supabase.from('messages').select('*').eq('conversation_id', currentConversationId).order('created_at', { ascending: true });
            if (error) {
                console.error('Error fetching messages:', error);
            } else {
                const loadedMessages: Message[] = data.map((msg: { id: string; role: string; content: string; }) => ({ id: msg.id, role: msg.role as Role, text: msg.content }));
                setMessages(loadedMessages);
            }
            setIsBuilding(false);
        };
        fetchConversation();
    }, [currentConversationId, session]);

    const handleBuild = (newFiles: { path: string; content: string }[]) => {
        setProjectFiles(newFiles);
        setActivePath(newFiles.find(f => f.path === 'index.html')?.path || newFiles[0]?.path || null);
        setBuildVersion(prev => prev + 1);
    };

    const handleInitialProject = async (files: { path: string; content: string }[]) => {
        setIsBuilding(true);
        const initialPath = files.find(f => f.path === 'index.html')?.path || files[0]?.path || null;
        setProjectFiles(files);
        setActivePath(initialPath);
        setBuildVersion(prev => prev + 1);
        setMessages([{ id: `system-${Date.now()}`, role: 'system', text: `Started with project: ${files.length} files.` }]);
        if (currentConversationId && session) {
            await supabase.from('conversations').update({ context: { files, activePath: initialPath } }).eq('id', currentConversationId);
        }
        setTimeout(() => setIsBuilding(false), 1000);
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
        setIsBuilding(true);
        const userMessage: Message = { id: `user-${Date.now()}`, role: 'user', text: userText };
        setMessages(prev => [...prev, userMessage]);
        
        let conversationId = currentConversationId;
        let isNewConversation = false;

        if (session && !conversationId) {
            isNewConversation = true;
            const { data: newConvo, error } = await supabase
                .from('conversations')
                .insert({ user_id: session.user.id, title: "New Dev Session", type: 'dev', context: { files: projectFiles, activePath } })
                .select()
                .single();
            
            if (error) {
                console.error("Error creating dev session:", error);
                setIsLoading(false);
                setIsBuilding(false);
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

        const devSystemPrompt = `You are an expert AI web developer. Your task is to help the user build and modify a web application.
**Prioritize creating high-quality, visually appealing, and functional websites over speed.** Take the time to write clean, well-structured code.

You can manage the project as a collection of separate files (HTML, CSS, JavaScript, TypeScript, etc.). When the user asks for changes, you can create new files or modify existing ones.

When you provide code, you MUST follow this format:
1.  Provide all complete file content(s) in one or more markdown code blocks. Each code block must start with \`// path: path/to/file.ext\`.
2.  After ALL code blocks, write a special separator token: \`---SUMMARY---\`.
3.  After the separator, provide a brief, non-technical, one-sentence summary of the changes you made. For example: "I added a new blue button to the main page."
Do not include any other text, explanation, or conversation outside of this format.

**CRITICAL PREVIEW REQUIREMENT:** For the live preview to work, you must ensure there is always an \`index.html\` file. All necessary CSS and JavaScript for the preview must be **inlined** into this single \`index.html\` file using \`<style>\` and \`<script>\` tags. You can manage them as separate files conceptually, but the final output for the preview must be one self-contained HTML file.

You can receive images for context (e.g., bug screenshots, mockups).`;

        try {
            const devHistory = messages.filter(m => m.role === 'user' || m.role === 'assistant').map(m => ({ role: m.role as 'user' | 'assistant', content: m.text }));
            const stream = streamGemini(devSystemPrompt + "\n\nUser Request: " + userText, devHistory, false, 'formal', 'img4', attachedFiles, controller.signal, profile?.first_name, []);
            
            let accumulatedText = "";
            const aiMsgId = `ai-${Date.now()}`;
            
            for await (const update of stream) {
                if (update.text) {
                    accumulatedText = update.text;
                }
                if (update.isComplete) {
                    const separator = '---SUMMARY---';
                    const parts = accumulatedText.split(separator);
                    const codePart = parts[0];
                    const summaryPart = parts.length > 1 ? parts[1].trim() : "I've updated the code as you requested.";

                    setMessages(prev => [...prev, { id: aiMsgId, role: 'assistant', text: summaryPart }]);

                    if (session && conversationId) {
                        await supabase.from('messages').insert({ conversation_id: conversationId, user_id: session.user.id, role: 'assistant', content: accumulatedText });
                    }
                    if (isNewConversation && conversationId) {
                        generateTitle(userText, conversationId);
                    }
                    const codeBlockRegex = /```(?:[a-zA-Z0-9]+)?\n\/\/ path: ([\w\/\.-]+)\n([\s\S]*?)```/g;
                    const matches = [...codePart.matchAll(codeBlockRegex)];
                    if (matches.length > 0) {
                        const newFiles = matches.map(m => ({ path: m[1].trim(), content: m[2].trim() }));
                        
                        const updatedFiles = [...projectFiles];
                        newFiles.forEach(newFile => {
                            const existingIndex = updatedFiles.findIndex(f => f.path === newFile.path);
                            if (existingIndex !== -1) {
                                updatedFiles[existingIndex] = newFile;
                            } else {
                                updatedFiles.push(newFile);
                            }
                        });

                        if (conversationId) {
                            await supabase.from('conversations').update({ context: { files: updatedFiles, activePath } }).eq('id', conversationId);
                        }
                        handleBuild(updatedFiles);
                    }
                }
            }
        } catch (err: any) {
            if (err.name !== 'AbortError') {
                setMessages(prev => [...prev, { id: `error-${Date.now()}`, role: 'assistant', text: `**System Error:** ${err.message}` }]);
            }
        } finally {
            setIsLoading(false);
            setIsBuilding(false);
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
                    onInitialProject={handleInitialProject} 
                />
                <WorkspacePanel 
                    projectFiles={projectFiles}
                    activePath={activePath}
                    setActivePath={setActivePath}
                    buildVersion={buildVersion}
                    isBuilding={isBuilding}
                />
            </div>
        </>
    );
};

export default DevEnvironmentPage;