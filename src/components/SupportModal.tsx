import React, { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useSession } from '../contexts/SessionContext';
import LiquidGlass from 'liquid-glass-react';

interface SupportModalProps {
    type: 'support' | 'suggestion';
    onClose: () => void;
}

const SupportModal: React.FC<SupportModalProps> = ({ type, onClose }) => {
    const { session, profile } = useSession();
    const [isLoading, setIsLoading] = useState(false);
    const [sent, setSent] = useState(false);
    
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        category: type === 'support' ? 'Account Issue' : 'Feature Request',
        customCategory: '',
        message: ''
    });

    useEffect(() => {
        if (profile && session?.user?.email) {
            setFormData(prev => ({
                ...prev,
                firstName: profile.first_name || '',
                lastName: profile.last_name || '',
                email: session.user.email || ''
            }));
        }
    }, [profile, session]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        const finalCategory = formData.category === 'Other' ? formData.customCategory : formData.category;
        const targetEmail = type === 'support' ? 'support@quillixai.com' : 'suggestions@quillixai.com';

        try {
            const { error } = await supabase.functions.invoke('send-support-email', {
                body: {
                    type,
                    targetEmail,
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    email: formData.email,
                    category: finalCategory,
                    message: formData.message
                }
            });

            if (error) throw error;
            setSent(true);
            setTimeout(onClose, 2000);
        } catch (error) {
            console.error('Error sending support request:', error);
            alert('Failed to send request. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const categories = type === 'support' 
        ? ['Account Issue', 'Billing', 'Bug Report', 'Technical Issue', 'Other']
        : ['Feature Request', 'UI/UX Improvement', 'Model Performance', 'New Integration', 'Other'];

    return (
        <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <LiquidGlass 
                className="w-full max-w-lg shadow-2xl animate-pop-in overflow-hidden" 
                onClick={(e) => e.stopPropagation()}
                padding="0"
                cornerRadius={16}
                elasticity={0.2}
            >
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/20">
                    <h2 className="text-xl font-bold text-white font-brand">
                        {type === 'support' ? 'Contact Support' : 'Share a Suggestion'}
                    </h2>
                    <button onClick={onClose} className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors">
                        <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>

                <div className="p-6">
                    {sent ? (
                        <div className="text-center py-8 space-y-4">
                            <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto">
                                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
                            </div>
                            <h3 className="text-xl font-bold text-white">Message Sent!</h3>
                            <p className="text-zinc-400">We've received your {type === 'support' ? 'request' : 'feedback'} and will get back to you soon.</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-medium text-zinc-400 mb-1">First Name</label>
                                    <input required type="text" value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500/50" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-zinc-400 mb-1">Last Name</label>
                                    <input required type="text" value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500/50" />
                                </div>
                            </div>
                            
                            <div>
                                <label className="block text-xs font-medium text-zinc-400 mb-1">Email Address</label>
                                <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500/50" />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-zinc-400 mb-1">{type === 'support' ? 'Support Type' : 'Suggestion Category'}</label>
                                <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full bg-zinc-900 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500/50">
                                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>

                            {formData.category === 'Other' && (
                                <div className="animate-pop-in">
                                    <label className="block text-xs font-medium text-zinc-400 mb-1">Please specify</label>
                                    <input required type="text" value={formData.customCategory} onChange={e => setFormData({...formData, customCategory: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500/50" placeholder="Type here..." />
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-medium text-zinc-400 mb-1">{type === 'support' ? 'What\'s the issue?' : 'Your Suggestion'}</label>
                                <textarea required rows={4} value={formData.message} onChange={e => setFormData({...formData, message: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-indigo-500/50 resize-none" placeholder={type === 'support' ? "Please describe the problem you're experiencing..." : "Tell us how we can improve..."}></textarea>
                            </div>

                            <button type="submit" disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-lg font-medium transition-colors disabled:opacity-50">
                                {isLoading ? 'Sending...' : 'Send Message'}
                            </button>
                        </form>
                    )}
                </div>
            </LiquidGlass>
        </div>
    );
};

export default SupportModal;