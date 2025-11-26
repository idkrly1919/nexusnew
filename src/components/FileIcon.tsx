import React from 'react';

const FileIcon: React.FC<{ fileType: string }> = ({ fileType }) => {
    const iconMap: { [key: string]: React.ReactNode } = {
        pdf: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><path d="M10.4 12.6c.2-.2.5-.3.8-.3.4 0 .7.1.9.3.2.2.4.5.4.9 0 .4-.1.7-.4.9-.2.2-.5.3-.9.3-.3 0-.6-.1-.8-.3-.2-.2-.3-.5-.3-.9 0-.4.1-.7.3-.9z" /><path d="M14.1 18h-1.2v-6h1.2v2.4h.1c.1-.8.5-1.6 1.4-1.6.3 0 .6 0 .8.1V14c-.2 0-.5-.1-.8-.1-.5 0-.9.2-1.1.7v3.4z" /></svg>,
        html: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>,
        txt: <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><line x1="10" y1="9" x2="8" y2="9" /></svg>,
    };
    return <div className="w-10 h-10 flex items-center justify-center bg-zinc-700 rounded-lg text-zinc-300 shrink-0">{iconMap[fileType] || iconMap['txt']}</div>;
};

export default FileIcon;