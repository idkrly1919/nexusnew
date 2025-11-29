import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import DynamicBackground from '../components/DynamicBackground';

const ResetPasswordPage: React.FC = () => {
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const navigate = useNavigate();

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const { error } = await supabase.auth.updateUser({ password: password });

        if (error) {
            setError(error.message);
        } else {
            setMessage("Password updated successfully! Redirecting...");
            setTimeout(() => {
                navigate('/chat');
            }, 2000);
        }
        setIsLoading(false);
    };

    return (
        <>
            <DynamicBackground status="idle" />
            <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-lg flex flex-col items-center justify-center p-4">
                <div className="w-full max-w-md space-y-8 animate-pop-in">
                    <div className="text-center">
                         <div className="flex items-center justify-center gap-2 mb-4">
                            <img src="/quillix-logo.png" alt="Quillix Logo" className="w-10 h-10" />
                        </div>
                        <h2 className="text-2xl font-bold text-white">Reset Password</h2>
                        <p className="text-zinc-400">Enter your new password below.</p>
                    </div>

                    <div data-liquid-glass className="liquid-glass p-8 rounded-2xl">
                        {message ? (
                            <div className="text-green-400 text-center">{message}</div>
                        ) : (
                            <form onSubmit={handleReset} className="space-y-6">
                                <div>
                                    <label className="block text-sm font-medium text-zinc-300">New Password</label>
                                    <input
                                        type="password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        className="mt-1 w-full bg-white/5 border border-white/10 rounded-full px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/30"
                                    />
                                </div>
                                {error && <p className="text-sm text-red-400 text-center">{error}</p>}
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full flex justify-center py-3 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-zinc-700"
                                >
                                    {isLoading ? 'Updating...' : 'Update Password'}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default ResetPasswordPage;