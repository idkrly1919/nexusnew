import React, { useState } from 'react';
import ChatPanel from '../components/ChatPanel';
import WorkspacePanel from '../components/WorkspacePanel';
import DynamicBackground from '../components/DynamicBackground';

const DevEnvironmentPage: React.FC = () => {
    const [activeFile, setActiveFile] = useState<{ path: string; content: string } | null>(null);
    const [buildVersion, setBuildVersion] = useState(0);

    const handleBuild = (files: { path: string; content: string }[]) => {
        // For now, just display the first file. A more complex UI could have tabs.
        if (files.length > 0) {
            setActiveFile(files[0]);
            setBuildVersion(prev => prev + 1); // Trigger iframe refresh
        }
    };

    return (
        <>
            <DynamicBackground status="idle" />
            <div className="fixed inset-0 z-10 flex bg-transparent text-zinc-100 font-sans overflow-hidden">
                <ChatPanel onBuild={handleBuild} />
                <WorkspacePanel activeFile={activeFile} buildVersion={buildVersion} />
            </div>
        </>
    );
};

export default DevEnvironmentPage;