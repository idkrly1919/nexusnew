import React, { useState, FormEvent, useRef } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useSession } from '../contexts/SessionContext';

interface AccountSettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const AccountSettingsModal: React.FC<AccountSettingsModalProps> = ({ isOpen, onClose }) => {
    const { session, profile, refreshProfile } = useSession();
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

    // Form states
    const [firstName, setFirstName] = useState(profile?.first_name || '');
    const [lastName, setLastName] = useState(profile?.last_name || '');
    const [email, setEmail] = useState(session?.user?.email || '');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Deletion states
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);

    const avatarFileRef = useRef<HTMLInputElement>(null);

    if (!isOpen) return null;

    const handleProfileUpdate = async (e: FormEvent) => {
        e.preventDefault();
        if (!session) return;
        setIsLoading(true);
        setMessage(null);

        // Update profile (first/last name)
        const { error: profileError } = await supabase
            .from('profiles')
            .update({ first_name: firstName, last_name: lastName })
            .eq('id', session.user.id);

        if (profileError) {
            setMessage({ type: 'error', text: profileError.message });
            setIsLoading(false);
            return;
        }

        // Update email if changed
        if (email !== session.user.email) {
            const { error: emailError } = await supabase.auth.updateUser({ email });
            if (emailError) {
                setMessage({ type: 'error', text: emailError.message });
                setIsLoading(false);
                return;
            }
        }

        await refreshProfile();
        setMessage({ type: 'success', text: 'Profile updated successfully!' });
        setIsLoading(false);
    };

    const handlePasswordUpdate = async (e: FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setMessage({ type: 'error', text: 'Passwords do not match.' });
            return;
        }
        if (!password) {
            setMessage({ type: 'error', text: 'Password cannot be empty.' });
            return;
        }
        setIsLoading(true);
        setMessage(null);

        const { error } = await supabase.auth.updateUser({ password });
        if (error) {
            setMessage({ type: 'error', text: error.message });
        } else {
            setMessage({ type: 'success', text: 'Password updated successfully!' });
            setPassword('');
            setConfirmPassword('');
        }
        setIsLoading(false);
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!session) return;
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const fileExt = file.name.split('.').pop();
            const filePath = `${session.user.id}/${Date.now()}.${fileExt}`;

            const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file);
            if (uploadError) throw uploadError;

            const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
            if (!data.publicUrl) throw new Error("Could not get public URL for avatar.");

            const { error: updateError } = await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', session.user.id);
            if (updateError) throw updateError;

            await refreshProfile();
            setMessage({ type: 'success', text: 'Avatar updated!' });
        } catch (error: any) {
            setMessage({ type: 'error', text: `Avatar upload failed: ${error.message}` });
        }
    };

    const handleAccountDeletion = async (e: FormEvent) => {
        e.preventDefault();
        if (!session || !deletePassword) return;

        setIsDeleting(true);
        setMessage(null);
        try {
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email: session.user.email!,
                password: deletePassword,
            });
            if (signInError) throw new Error("Incorrect password. Please try again.");

            const { error: functionError } = await supabase.functions.invoke('delete-account');
            if (functionError) throw functionError;

            await supabase.auth.signOut();
            window.location.href = '/';
        } catch (error: any) {
            setMessage({ type: 'error', text: error.message });
        } finally {
            setIsDeleting(false);
            setDeletePassword('');
        }
    };

    return (
        <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
            <div data-liquid-glass className="liquid-glass w-full max-w-lg shadow-2xl animate-pop-in rounded-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-black/20">
                    <h2 className="text-xl font-bold text-white font-brand">Account Settings</h2>
                    <button onClick={onClose} className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-white/10 transition-colors">
                        <svg width="20" height="20" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>

                <div className="p-6 max-h-[70vh] overflow-y-auto scrollbar-hide space-y-8">
                    {message && (
                        <div className={`p-3 rounded-lg text-sm text-center ${message.type === 'success' ? 'bg-green-500/20 text-green-300' : 'bg-red-500/20 text-red-300'}`}>
                            {message.text}
                        </div>
                    )}

                    <div className="flex items-center gap-4">
                        <input type="file" ref={avatarFileRef} onChange={handleAvatarUpload} className="hidden" accept="image/png, image/jpeg" />
                        <button onClick={() => avatarFileRef.current?.click()} className="shrink-0 group relative" title="Change profile picture">
                            {profile?.avatar_url ? (
                                <img src={profile.avatar_url} alt="User Avatar" className="w-16 h-16 rounded-full object-cover group-hover:opacity-80 transition-opacity" />
                            ) : (
                                <div className="w-16 h-16 rounded-full liquid-glass flex items-center justify-center border border-white/10 group-hover:border-white/20 transition-colors">
                                    <svg className="w-8 h-8 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                            </div>
                        </button>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-white">{profile?.first_name} {profile?.last_name}</h3>
                            <p className="text-sm text-zinc-400">{session?.user?.email}</p>
                        </div>
                    </div>

                    <form onSubmit={handleProfileUpdate} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className="block text-xs font-medium text-zinc-400 mb-1">First Name</label><input type="text" value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" /></div>
                            <div><label className="block text-xs font-medium text-zinc-400 mb-1">Last Name</label><input type="text" value={lastName} onChange={e => setLastName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" /></div>
                        </div>
                        <div><label className="block text-xs font-medium text-zinc-400 mb-1">Email</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" /></div>
                        <button type="submit" disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg font-medium transition-colors disabled:opacity-50">Save Profile</button>
                    </form>

                    <form onSubmit={handlePasswordUpdate} className="space-y-4 pt-4 border-t border-white/10">
                        <h3 className="font-semibold text-white">Change Password</h3>
                        <input type="password" placeholder="New Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
                        <input type="password" placeholder="Confirm New Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm" />
                        <button type="submit" disabled={isLoading} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg font-medium transition-colors disabled:opacity-50">Update Password</button>
                    </form>

                    <div className="pt-4 border-t border-white/10">
                        <h3 className="font-semibold text-red-400">Danger Zone</h3>
                        <div className="mt-2 flex justify-between items-center bg-red-500/10 p-4 rounded-lg border border-red-500/20">
                            <div>
                                <p className="font-medium text-white">Delete Account</p>
                                <p className="text-xs text-zinc-400">Permanently delete your account and all data.</p>
                            </div>
                            <button onClick={() => setShowDeleteConfirm(true)} className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium text-sm">Delete</button>
                        </div>
                    </div>
                </div>

                {showDeleteConfirm && (
                    <div className="absolute inset-0 bg-zinc-900/80 backdrop-blur-sm flex items-center justify-center p-6 animate-pop-in">
                        <div className="w-full max-w-sm text-center">
                            <h3 className="text-xl font-bold text-white">Are you absolutely sure?</h3>
                            <p className="text-zinc-400 my-4">This action is irreversible. To confirm, please type your password.</p>
                            <form onSubmit={handleAccountDeletion}>
                                <input
                                    type="password"
                                    placeholder="Enter your password"
                                    value={deletePassword}
                                    onChange={(e) => setDeletePassword(e.target.value)}
                                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white mb-4 text-center"
                                    required
                                    autoComplete="new-password" // Prevents browser autofill
                                />
                                <div className="flex justify-center gap-3">
                                    <button type="button" onClick={() => setShowDeleteConfirm(false)} className="px-4 py-2 text-zinc-300 hover:text-white hover:bg-white/10 rounded-lg">Cancel</button>
                                    <button type="submit" disabled={isDeleting} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium disabled:opacity-50">
                                        {isDeleting ? 'Deleting...' : 'Delete My Account'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AccountSettingsModal;