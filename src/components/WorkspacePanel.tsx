import React, { useState, useEffect } from 'react';
import CodeViewer from './CodeViewer';

interface WorkspacePanelProps {
    activeFile: { path: string; content: string } | null;
    buildVersion: number;
    isLoading: boolean;
}

const WorkspacePanel: React.FC<WorkspacePanelProps> = ({ activeFile, buildVersion, isLoading }) => {
    const [view, setView] = useState<'preview' | 'code'>('preview');
    const [iframeContent, setIframeContent] = useState('');

    useEffect(() => {
        if (activeFile) {
            if (activeFile.path.endsWith('.html')) {
                setIframeContent(activeFile.content);
            }
            // Always switch to code view when new code is being generated
            if (isLoading) {
                setView('code');
            }
        }
    }, [activeFile, isLoading]);
    
    useEffect(() => {
        if (activeFile && activeFile.path.endsWith('.html')) {
            setIframeContent(activeFile.content);
        }
    }, [buildVersion]);


    return (
        <div className="flex-1 flex flex-col h-full">
            <header className="h-16 flex items-center justify-between px-6 shrink-0 border-b border-white/10 bg-black/30">
                <span className="font-mono text-sm text-zinc-400">{activeFile ? activeFile.path : 'Workspace'}</span>
                <div className="flex items-center gap-2 bg-zinc-800/50 p-1 rounded-full border border-zinc-700">
                    <button onClick={() => setView('preview')} className={`px-3 py-1.5 text-xs font-semibold rounded-full ${view === 'preview' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'}`}>Preview</button>
                    <button onClick={() => setView('code')} className={`px-3 py-1.5 text-xs font-semibold rounded-full ${view === 'code' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'}`}>Code</button>
                </div>
            </header>
            <div className="flex-1 bg-zinc-900/50 overflow-auto relative">
                {!activeFile ? (
                    <div className="flex items-center justify-center h-full text-zinc-500">
                        <p>Ask the AI to create a file or upload an HTML file to get started.</p>
                    </div>
                ) : view === 'preview' ? (
                    <iframe
                        key={buildVersion}
                        srcDoc={iframeContent}
                        title="Live Preview"
                        className="w-full h-full border-none bg-white"
                        sandbox="allow-scripts"
                    />
                ) : (
                    <CodeViewer code={activeFile.content} language={activeFile.path.split('.').pop() || 'javascript'} />
                )}
                {isLoading && view === 'code' && (
                    <div className="absolute inset-0 bg-zinc-900/50 flex items-center justify-center pointer-events-none">
                        <div className="flex items-center gap-3 py-2 px-4 rounded-full bg-black/50 border border-white/10">
                            <svg className="animate-spin h-5 w-5 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            <span className="text-sm font-medium text-zinc-300">AI is generating code...</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WorkspacePanel;