import React, { useState, useEffect } from 'react';
import CodeViewer from './CodeViewer';

interface WorkspacePanelProps {
    activeFile: { path: string; content: string } | null;
    buildVersion: number;
}

const WorkspacePanel: React.FC<WorkspacePanelProps> = ({ activeFile, buildVersion }) => {
    const [view, setView] = useState<'preview' | 'code'>('preview');
    const [iframeContent, setIframeContent] = useState('');

    useEffect(() => {
        if (activeFile) {
            if (activeFile.path.endsWith('.html')) {
                setIframeContent(activeFile.content);
                setView('preview');
            } else {
                // For non-HTML files, default to code view
                setView('code');
            }
        }
    }, [activeFile, buildVersion]);

    return (
        <div className="flex-1 flex flex-col h-full">
            <header className="h-16 flex items-center justify-between px-6 shrink-0 border-b border-white/10 bg-black/30">
                <span className="font-mono text-sm text-zinc-400">{activeFile ? activeFile.path : 'Workspace'}</span>
                <div className="flex items-center gap-2 bg-zinc-800/50 p-1 rounded-full border border-zinc-700">
                    <button onClick={() => setView('preview')} className={`px-3 py-1.5 text-xs font-semibold rounded-full ${view === 'preview' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'}`}>Preview</button>
                    <button onClick={() => setView('code')} className={`px-3 py-1.5 text-xs font-semibold rounded-full ${view === 'code' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'}`}>Code</button>
                </div>
            </header>
            <div className="flex-1 bg-zinc-900/50 overflow-auto">
                {!activeFile ? (
                    <div className="flex items-center justify-center h-full text-zinc-500">
                        <p>Ask the AI to create a file to get started.</p>
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
            </div>
        </div>
    );
};

export default WorkspacePanel;