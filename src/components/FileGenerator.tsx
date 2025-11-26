import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';

interface FileGeneratorProps {
    fileType: string;
    filename: string;
    content: string;
}

const FileIcon: React.FC<{ fileType: string }> = ({ fileType }) => {
    const iconMap: { [key: string]: React.ReactNode } = {
        pdf: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><path d="M10.4 12.6c.2-.2.5-.3.8-.3.4 0 .7.1.9.3.2.2.4.5.4.9 0 .4-.1.7-.4.9-.2.2-.5.3-.9.3-.3 0-.6-.1-.8-.3-.2-.2-.3-.5-.3-.9 0-.4.1-.7.3-.9z" /><path d="M14.1 18h-1.2v-6h1.2v2.4h.1c.1-.8.5-1.6 1.4-1.6.3 0 .6 0 .8.1V14c-.2 0-.5-.1-.8-.1-.5 0-.9.2-1.1.7v3.4z" /></svg>,
        html: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>,
        txt: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" /></svg>,
    };
    return <div className="w-10 h-10 flex items-center justify-center bg-zinc-700 rounded-lg text-zinc-300 shrink-0">{iconMap[fileType] || iconMap['txt']}</div>;
};

const FileGenerator: React.FC<FileGeneratorProps> = ({ fileType, filename, content }) => {
    const [status, setStatus] = useState<'generating' | 'ready' | 'error'>('generating');
    const [fileUrl, setFileUrl] = useState<string | null>(null);
    const [fileSize, setFileSize] = useState<string>('');

    useEffect(() => {
        let url: string | null = null;
        const generateFile = () => {
            try {
                let blob: Blob;
                const mimeMap: { [key: string]: string } = {
                    pdf: 'application/pdf',
                    html: 'text/html',
                    txt: 'text/plain',
                };

                if (fileType === 'pdf') {
                    const doc = new jsPDF();
                    doc.text(content, 10, 10);
                    blob = doc.output('blob');
                } else {
                    blob = new Blob([content], { type: mimeMap[fileType] || 'application/octet-stream' });
                }

                url = URL.createObjectURL(blob);
                setFileUrl(url);
                setFileSize((blob.size / 1024).toFixed(2) + ' KB');
                setStatus('ready');
            } catch (e) {
                console.error("Error generating file:", e);
                setStatus('error');
            }
        };

        const timer = setTimeout(generateFile, 1500);

        return () => {
            clearTimeout(timer);
            if (url) {
                URL.revokeObjectURL(url);
            }
        };
    }, [fileType, filename, content]);

    if (status === 'error') {
        return (
            <div className="my-2 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
                Error generating file.
            </div>
        );
    }

    if (status === 'generating') {
        return (
            <div className="my-2 flex items-center gap-3 p-3 rounded-lg bg-zinc-800 border border-zinc-700 animate-pulse">
                <FileIcon fileType={fileType} />
                <div className="flex-1">
                    <div className="font-medium text-zinc-300">Generating {filename}...</div>
                    <div className="text-sm text-zinc-500">Please wait</div>
                </div>
            </div>
        );
    }

    return (
        <div className="my-2">
            <a
                href={fileUrl!}
                download={filename}
                className="flex items-center gap-3 p-3 rounded-lg bg-zinc-800 border border-zinc-700 hover:bg-zinc-700/50 transition-colors"
            >
                <FileIcon fileType={fileType} />
                <div className="flex-1 min-w-0">
                    <div className="font-medium text-indigo-400 truncate">{filename}</div>
                    <div className="text-sm text-zinc-400">{fileSize}</div>
                </div>
                <svg className="w-6 h-6 text-zinc-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
            </a>
        </div>
    );
};

export default FileGenerator;