import React, { useState, useEffect } from 'react';
import jsPDF from 'jspdf';
import FileIcon from './FileIcon';

interface FileGeneratorProps {
    fileType: string;
    filename: string;
    content: string;
}

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
                    const margin = 15;
                    const listIndent = 5;
                    const pageWidth = doc.internal.pageSize.getWidth();
                    const pageHeight = doc.internal.pageSize.getHeight();
                    const maxLineWidth = pageWidth - margin * 2;
                    let y = margin;

                    const checkPageBreak = (requiredHeight: number) => {
                        if (y + requiredHeight > pageHeight - margin) {
                            doc.addPage();
                            y = margin;
                        }
                    };

                    const lines = content.split('\n');
                    for (const line of lines) {
                        if (line.trim() === '') {
                            y += 6;
                            checkPageBreak(0);
                            continue;
                        }

                        let text = line.replace(/\*\*(.*?)\*\*/g, '$1');
                        let size = 11;
                        let style: 'normal' | 'bold' = 'normal';
                        let x = margin;
                        let wrapWidth = maxLineWidth;

                        if (line.startsWith('# ')) {
                            text = line.substring(2); size = 18; style = 'bold';
                        } else if (line.startsWith('## ')) {
                            text = line.substring(3); size = 15; style = 'bold';
                        } else if (line.startsWith('### ')) {
                            text = line.substring(4); size = 12; style = 'bold';
                        } else if (line.startsWith('- ')) {
                            text = line.substring(2);
                            x = margin + listIndent;
                            wrapWidth = maxLineWidth - listIndent;
                            doc.setFontSize(size);
                            doc.text('•', margin, y);
                        }

                        doc.setFontSize(size);
                        doc.setFont('helvetica', style);
                        const splitText = doc.splitTextToSize(text, wrapWidth);
                        const lineHeight = (size / 2.5) + 1;
                        const blockHeight = splitText.length * lineHeight;
                        
                        checkPageBreak(blockHeight);
                        
                        doc.text(splitText, x, y);
                        y += blockHeight;
                    }

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

        const timer = setTimeout(generateFile, 500);

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