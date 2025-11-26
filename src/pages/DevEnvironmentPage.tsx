import React, { useState } from 'react';
import ChatPanel from '../components/ChatPanel';
import WorkspacePanel from '../components/WorkspacePanel';
import DynamicBackground from '../components/DynamicBackground';

const DevEnvironmentPage: React.FC = () => {
    const [activeFile, setActiveFile] = useState<{ path: string; content: string } | null>(null);
    const [buildVersion, setBuildVersion] = useState(0);

    const handleBuild = (files: { path: string; content: string }[]) => {
        if (files.length > 0) {
            setActiveFile(files[0]);
            setBuildVersion(prev => prev + 1);
        }
    };

    const handleInitialFile = (file: { path: string; content: string }) => {
        setActiveFile(file);
        setBuildVersion(prev => prev + 1);
    };

    return (
        <>
            <DynamicBackground status="idle" />
            <div className="fixed inset-0 z-10 flex bg-transparent text-zinc-100 font-sans overflow-hidden">
                <ChatPanel onBuild={handleBuild} onInitialFile={handleInitialFile} />
                <WorkspacePanel activeFile={activeFile} buildVersion={buildVersion} />
            </div>
        </>
    );
};

export default DevEnvironmentPage;