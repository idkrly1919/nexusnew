import React, { useState, FormEvent } from 'react';
import { supabase } from '../integrations/supabase/client';
import DynamicBackground from '../components/DynamicBackground';
import LegalModal from '../components/LegalModal';

const AuthPage: React.FC = () => {
    const [step, setStep] = useState<'email' | 'login' | 'signup' | 'verify'>('email');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [legalModal, setLegalModal] = useState<{ title: string, content: string } | null>(null);

    const handleEmailSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        try {
            const { data, error: rpcError } = await supabase.rpc('user_exists', { user_email: email });
            if (rpcError) throw rpcError;
            setStep(data ? 'login' : 'signup');
        } catch (err: any) { setError(err.message || 'Error checking email.'); } finally { setIsLoading(false); }
    };

    const handleLogin = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setError(error.message);
        setIsLoading(false);
    };

    const handleSignup = async (e: FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) { setError("Passwords do not match."); return; }
        setIsLoading(true);
        const { error } = await supabase.auth.signUp({ email, password, options: { data: { first_name: firstName, last_name: lastName } } });
        if (error) setError(error.message); else setStep('verify');
        setIsLoading(false);
    };

    return (
        <>
            <DynamicBackground status="idle" />
            {legalModal && <LegalModal title={legalModal.title} content={legalModal.content} onClose={() => setLegalModal(null)} />}
            <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4">
                <div className="glass-panel w-full max-w-[400px] p-8 rounded-3xl shadow-2xl animate-fade-in-up">
                    <div className="text-center mb-8">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-xl mx-auto mb-4 shadow-lg">Q</div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                            {step === 'login' ? 'Welcome back' : step === 'signup' ? 'Create account' : step === 'verify' ? 'Check your email' : 'Sign in to Quillix'}
                        </h1>
                        <p className="text-[var(--text-secondary)] text-sm mt-2">
                            {step === 'login' ? 'Enter your password to continue.' : step === 'signup' ? 'Get started with your free account.' : step === 'verify' ? `We sent a link to ${email}` : 'Enter your email to get started.'}
                        </p>
                    </div>

                    {error && <div className="mb-4 p-3 rounded-lg bg-red-50 text-red-500 text-sm text-center">{error}</div>}

                    {step === 'email' && (
                        <form onSubmit={handleEmailSubmit} className="space-y-4">
                            <input type="email" placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} required className="w-full p-3 rounded-xl bg-[var(--bg-secondary)] border border-transparent focus:bg-[var(--bg-primary)] focus:border-[var(--accent)] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                            <button type="submit" disabled={isLoading} className="w-full btn-primary py-3 rounded-xl font-medium">{isLoading ? 'Checking...' : 'Continue'}</button>
                        </form>
                    )}

                    {step === 'login' && (
                        <form onSubmit={handleLogin} className="space-y-4">
                            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full p-3 rounded-xl bg-[var(--bg-secondary)] border border-transparent focus:bg-[var(--bg-primary)] focus:border-[var(--accent)] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                            <button type="submit" disabled={isLoading} className="w-full btn-primary py-3 rounded-xl font-medium">{isLoading ? 'Signing in...' : 'Sign In'}</button>
                            <button type="button" onClick={() => setStep('email')} className="w-full text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Use a different email</button>
                        </form>
                    )}

                    {step === 'signup' && (
                        <form onSubmit={handleSignup} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <input type="text" placeholder="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} required className="w-full p-3 rounded-xl bg-[var(--bg-secondary)] border border-transparent focus:bg-[var(--bg-primary)] focus:border-[var(--accent)] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                                <input type="text" placeholder="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} required className="w-full p-3 rounded-xl bg-[var(--bg-secondary)] border border-transparent focus:bg-[var(--bg-primary)] focus:border-[var(--accent)] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                            </div>
                            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full p-3 rounded-xl bg-[var(--bg-secondary)] border border-transparent focus:bg-[var(--bg-primary)] focus:border-[var(--accent)] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                            <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="w-full p-3 rounded-xl bg-[var(--bg-secondary)] border border-transparent focus:bg-[var(--bg-primary)] focus:border-[var(--accent)] focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                            <button type="submit" disabled={isLoading} className="w-full btn-primary py-3 rounded-xl font-medium">{isLoading ? 'Creating account...' : 'Create Account'}</button>
                        </form>
                    )}
                </div>
            </div>
        </>
    );
};

export default AuthPage;