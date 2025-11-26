import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import FileIcon from './FileIcon';

interface FileDropzoneProps {
    attachedFiles: File[];
    setAttachedFiles: React.Dispatch<React.SetStateAction<File[]>>;
    maxFiles?: number;
}

const FileDropzone: React.FC<FileDropzoneProps> = ({ attachedFiles, setAttachedFiles, maxFiles = 10 }) => {
    const onDrop = useCallback((acceptedFiles: File[]) => {
        setAttachedFiles(prev => {
            const newFiles = [...prev, ...acceptedFiles].slice(0, maxFiles);
            return newFiles;
        });
    }, [maxFiles, setAttachedFiles]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, maxFiles });

    const removeFile = (fileToRemove: File) => {
        setAttachedFiles(prev => prev.filter(file => file !== fileToRemove));
    };

    return (
        <div className="space-y-4">
            <div
                {...getRootProps()}
                className={`p-8 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-colors duration-300 ${isDragActive ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/20 hover:border-white/40'}`}
            >
                <input {...getInputProps()} />
                <svg className="w-12 h-12 text-zinc-500 mx-auto mb-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                <p className="text-zinc-300">Drag & drop files here, or click to select</p>
                <p className="text-xs text-zinc-500 mt-1">Up to {maxFiles} files. Paste from clipboard is also supported.</p>
            </div>
            {attachedFiles.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {attachedFiles.map((file, index) => (
                        <div key={index} className="relative bg-white/5 p-3 rounded-lg flex items-center gap-3 group animate-pop-in">
                            <FileIcon fileType={file.type.split('/')[1] || 'txt'} />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm text-zinc-200 truncate">{file.name}</p>
                                <p className="text-xs text-zinc-400">{(file.size / 1024).toFixed(1)} KB</p>
                            </div>
                            <button onClick={() => removeFile(file)} className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-zinc-800 hover:bg-red-500 border border-white/20 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-all" title={`Remove ${file.name}`}>
                                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default FileDropzone;