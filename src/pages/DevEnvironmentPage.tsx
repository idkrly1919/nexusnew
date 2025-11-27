import React, { useState, useRef } from 'react';
import ChatPanel from '../components/ChatPanel';
import WorkspacePanel from '../components/WorkspacePanel';
import DynamicBackground from '../components/DynamicBackground';
import { Message } from '../types';
import { streamGemini } from '../services/geminiService';
import { useSession } from '../contexts/SessionContext';

const DevEnvironmentPage: React.FC = () => {
    const { profile } = useSession();
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [activeFile, setActiveFile] = useState<{ path: string; content: string } | null>(null);
    const [buildVersion, setBuildVersion] = useState(0);
    const abortControllerRef = useRef<AbortController | null>(null);

    const handleBuild = (files: { path: string; content: string }[]) => {
        if (files.length > 0) {
            // The streaming logic now handles activeFile, this is for the animation
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

    const handleInitialFile = (file: { path: string; content: string }) => {
        setActiveFile(file);
        setBuildVersion(prev => prev + 1);
        setMessages([{ id: `system-${Date.now()}`, role: 'system', text: `Started with file: ${file.path}` }]);
    };

    const handleUserSubmit = async (userText: string, attachedFiles: {id: string, name: string, content: string, type: string}[]) => {
        if (isLoading || (!userText.trim() && attachedFiles.length === 0)) return;

        setIsLoading(true);
        const userMessage: Message = { id: `user-${Date.now()}`, role: 'user', text: userText };
        setMessages(prev => [...prev, userMessage]);
        
        const controller = new AbortController();
        abortControllerRef.current = controller;

        const devSystemPrompt = "You are an expert AI web developer. Your task is to help the user build and modify a web application. When asked to create or modify a file, respond ONLY with the complete file content in a single markdown code block. Do not include any other text, explanation, or conversation. The code block must start with `// path: path/to/file.ext`. You can receive images for context (e.g., bug screenshots, mockups).";

        try {
            const devHistory = messages
                .filter(m => m.role === 'user' || m.role === 'assistant')
                .map(m => ({ role: m.role as 'user' | 'assistant', content: m.text }));

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
                        const content = match[2].replace(/```$/, '').trim(); // Clean trailing backticks
                        setActiveFile({ path, content });
                    }
                }
                if (update.isComplete) {
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