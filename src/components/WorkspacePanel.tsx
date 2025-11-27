import React, { useState, useEffect, useRef } from 'react';
import CodeViewer from './CodeViewer';
import BuildingStatus from './BuildingStatus';

interface WorkspacePanelProps {
    projectFiles: { path: string; content: string }[];
    activePath: string | null;
    setActivePath: (path: string) => void;
    buildVersion: number;
    isBuilding: boolean;
}

const WorkspacePanel: React.FC<WorkspacePanelProps> = ({ projectFiles, activePath, setActivePath, buildVersion, isBuilding }) => {
    const [view, setView] = useState<'preview' | 'code'>('preview');
    const [iframeContent, setIframeContent] = useState('');
    const codeViewRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const indexHtml = projectFiles.find(f => f.path === 'index.html');
        if (indexHtml) {
            setIframeContent(indexHtml.content);
        }
    }, [projectFiles, buildVersion]);

    const activeFile = projectFiles.find(f => f.path === activePath);

    useEffect(() => {
        if (view === 'code' && codeViewRef.current) {
            codeViewRef.current.scrollTop = codeViewRef.current.scrollHeight;
        }
    }, [activeFile?.content, view]);


    return (
        <div className="flex-1 flex flex-col h-full">
            <header className="h-16 flex items-center justify-between px-6 shrink-0 border-b border-white/10 bg-black/30">
                <span className="font-mono text-sm text-zinc-400">{activePath || 'Workspace'}</span>
                <div className="flex items-center gap-2 bg-zinc-800/50 p-1 rounded-full border border-zinc-700">
                    <button 
                        onClick={() => !isBuilding && setView('preview')} 
                        className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-opacity ${view === 'preview' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'} ${isBuilding ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        Preview
                    </button>
                    <button onClick={() => setView('code')} className={`px-3 py-1.5 text-xs font-semibold rounded-full ${view === 'code' ? 'bg-indigo-600 text-white' : 'text-zinc-400 hover:text-white'}`}>Code</button>
                </div>
            </header>
            <div className="flex-1 flex overflow-hidden">
                {projectFiles.length > 0 && view === 'code' && (
                    <div className="w-56 bg-zinc-900/50 border-r border-white/10 p-2 overflow-y-auto scrollbar-hide">
                        <h3 className="text-xs font-bold uppercase text-zinc-500 px-2 mb-2">Files</h3>
                        {projectFiles.map(file => (
                            <button key={file.path} onClick={() => setActivePath(file.path)} className={`w-full text-left text-sm px-2 py-1.5 rounded truncate ${activePath === file.path ? 'bg-indigo-500/20 text-indigo-300' : 'text-zinc-400 hover:bg-white/5'}`}>
                                {file.path}
                            </button>
                        ))}
                    </div>
                )}
                <div ref={codeViewRef} className="flex-1 bg-zinc-900/50 overflow-auto relative">
                    {isBuilding && view === 'preview' ? (
                        <BuildingStatus />
                    ) : !projectFiles || projectFiles.length === 0 ? (
                        <div className="flex items-center justify-center h-full text-zinc-500 text-center p-4">
                            <p>Upload a .zip or ask the AI to get started.</p>
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
                        activeFile ? (
                            <CodeViewer code={activeFile.content} language={activeFile.path.split('.').pop() || 'javascript'} />
                        ) : (
                            <div className="flex items-center justify-center h-full text-zinc-500">
                                <p>Select a file to view its code.</p>
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

export default WorkspacePanel;