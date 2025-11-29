import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useSession } from '../contexts/SessionContext';
import { Persona } from '../types';
import { enhancePersonaInstructions } from '../services/geminiService';

interface PersonaManagerProps {
    isOpen: boolean;
    onClose: () => void;
    onPersonaUpdate: () => void;
}

const PersonaManager: React.FC<PersonaManagerProps> = ({ isOpen, onClose, onPersonaUpdate }) => {
    const { user } = useSession();
    const [personas, setPersonas] = useState<Persona[]>([]);
    const [view, setView] = useState<'list' | 'form'>('list');
    const [currentPersona, setCurrentPersona] = useState<Partial<Persona> | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isEnhancing, setIsEnhancing] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchPersonas = async () => {
        if (!user) return;
        const { data, error } = await supabase
            .from('personas')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });
        if (error) console.error("Error fetching personas:", error);
        else setPersonas(data as Persona[]);
    };

    useEffect(() => {
        if (isOpen) {
            fetchPersonas();
        }
    }, [isOpen]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setCurrentPersona(p => ({ ...p, file_name: file.name }));
        }
    };

    const removeFile = () => {
        setSelectedFile(null);
        setCurrentPersona(p => ({ ...p, file_path: null, file_type: null, file_name: null }));
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleSave = async () => {
        if (!user || !currentPersona || !currentPersona.name || !currentPersona.instructions) {
            alert("Name and Instructions are required.");
            return;
        }
        setIsSaving(true);

        let filePath = currentPersona.file_path;
        let fileType = currentPersona.file_type;

        // Handle File Upload
        if (selectedFile) {
            try {
                const fileExt = selectedFile.name.split('.').pop();
                const fileName = `${user.id}/${Date.now()}.${fileExt}`;
                const { error: uploadError } = await supabase.storage
                    .from('persona_files')
                    .upload(fileName, selectedFile);
                
                if (uploadError) throw uploadError;
                
                filePath = fileName;
                fileType = selectedFile.type;
            } catch (error: any) {
                console.error("File upload failed:", error);
                alert("Failed to upload file: " + error.message);
                setIsSaving(false);
                return;
            }
        }
        
        const personaData = {
            user_id: user.id,
            name: currentPersona.name,
            description: currentPersona.description,
            instructions: currentPersona.instructions,
            file_name: currentPersona.file_name,
            file_path: filePath,
            file_type: fileType,
            updated_at: new Date().toISOString(),
        };

        let error;
        if (currentPersona.id) {
            // @ts-ignore
            const { error: updateError } = await supabase.from('personas').update(personaData).eq('id', currentPersona.id);
            error = updateError;
        } else {
            // @ts-ignore
            const { error: insertError } = await supabase.from('personas').insert(personaData);
            error = insertError;
        }

        if (error) {
            console.error("Error saving persona:", error);
            alert("Could not save persona.");
        } else {
            await fetchPersonas();
            onPersonaUpdate();
            setView('list');
            setCurrentPersona(null);
            setSelectedFile(null);
        }
        setIsSaving(false);
    };

    const handleDelete = async (personaId: string) => {
        if (window.confirm("Are you sure you want to delete this persona?")) {
            const { error } = await supabase.from('personas').delete().eq('id', personaId);
            if (error) {
                console.error("Error deleting persona:", error);
            } else {
                setPersonas(prev => prev.filter(p => p.id !== personaId));
                onPersonaUpdate();
            }
        }
    };

    const handleEnhance = async () => {
        if (!currentPersona?.instructions) return;
        setIsEnhancing(true);
        try {
            const enhanced = await enhancePersonaInstructions(currentPersona.instructions);
            setCurrentPersona(p => ({ ...p, instructions: enhanced }));
        } catch (error) {
            console.error("Error enhancing instructions:", error);
            alert("Could not enhance instructions. Please try again.");
        } finally {
            setIsEnhancing(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div data-liquid-glass className="liquid-glass w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl animate-pop-in" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                    <h2 className="text-xl font-bold text-white font-brand">{view === 'list' ? 'My Personas' : (currentPersona?.id ? 'Edit Persona' : 'Create Persona')}</h2>
                    <button onClick={onClose} className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"><svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>
                </div>
                <div className="flex-1 p-6 overflow-y-auto scrollbar-hide">
                    {view === 'list' ? (
                        <div className="space-y-3">
                            {personas.map(p => (
                                <div key={p.id} className="bg-white/5 p-4 rounded-xl flex justify-between items-center group">
                                    <div>
                                        <h3 className="font-semibold text-white">{p.name}</h3>
                                        <p className="text-sm text-zinc-400 truncate max-w-md">{p.description || 'No description'}</p>
                                    </div>
                                    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => { setCurrentPersona(p); setSelectedFile(null); setView('form'); }} className="p-2 rounded-full hover:bg-white/10 text-zinc-300 hover:text-white">Edit</button>
                                        <button onClick={() => handleDelete(p.id)} className="p-2 rounded-full hover:bg-red-500/10 text-zinc-300 hover:text-red-400">Delete</button>
                                    </div>
                                </div>
                            ))}
                            <button onClick={() => { setCurrentPersona({}); setSelectedFile(null); setView('form'); }} className="w-full mt-4 p-4 border-2 border-dashed border-white/20 rounded-xl text-zinc-400 hover:border-white/40 hover:text-white transition-colors">
                                + Create New Persona
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <input type="text" placeholder="Persona Name (e.g., 'Expert Coder')" value={currentPersona?.name || ''} onChange={e => setCurrentPersona(p => ({ ...p, name: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-full px-4 py-3 text-white" />
                            <input type="text" placeholder="Description (e.g., 'Helps with programming questions')" value={currentPersona?.description || ''} onChange={e => setCurrentPersona(p => ({ ...p, description: e.target.value }))} className="w-full bg-white/5 border border-white/10 rounded-full px-4 py-3 text-white" />
                            <textarea placeholder="Instructions (e.g., 'You are an expert programmer...')" value={currentPersona?.instructions || ''} onChange={e => setCurrentPersona(p => ({ ...p, instructions: e.target.value }))} rows={8} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white resize-none" />
                            <div>
                                <label className="block text-sm font-medium text-zinc-400 mb-2">Persistent Attachment (Image, Video, Text, etc.)</label>
                                <p className="text-xs text-zinc-500 mb-2">This file will be visible to the AI in every chat with this persona.</p>
                                {currentPersona?.file_name ? (
                                    <div className="flex items-center justify-between bg-white/5 p-2.5 rounded-lg">
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <svg className="w-4 h-4 text-indigo-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                                            <p className="text-sm text-zinc-300 truncate">{currentPersona.file_name}</p>
                                        </div>
                                        <button onClick={removeFile} className="text-xs text-red-400 hover:text-red-300">Remove</button>
                                    </div>
                                ) : (
                                    <button onClick={() => fileInputRef.current?.click()} className="w-full p-3 border-2 border-dashed border-white/20 rounded-xl text-zinc-400 hover:border-white/40 hover:text-white transition-colors text-sm">
                                        Upload File
                                    </button>
                                )}
                                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                            </div>
                            <div className="flex justify-between items-center pt-2">
                                <button onClick={() => setView('list')} className="text-zinc-400 hover:text-white">Cancel</button>
                                <div className="flex items-center gap-3">
                                    <button onClick={handleEnhance} disabled={isEnhancing} className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-full text-sm font-medium disabled:opacity-50">
                                        {isEnhancing ? 'Enhancing...' : 'Enhance with AI'}
                                    </button>
                                    <button onClick={handleSave} disabled={isSaving} className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2 rounded-full font-medium">{isSaving ? 'Saving...' : 'Save'}</button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default PersonaManager;