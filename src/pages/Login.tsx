import React, { useState, FormEvent } from 'react';
import { supabase } from '../integrations/supabase/client';

const LoginPage: React.FC = () => {
    const [step, setStep] = useState<'email' | 'login' | 'signup'>('email');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const handleEmailSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        
        const { data, error: rpcError } = await supabase.rpc('user_exists', { user_email: email });

        if (rpcError) {
            setError('Could not verify email. Please try again.');
        } else if (data) {
            setStep('login');
        } else {
            setStep('signup');
        }
        setIsLoading(false);
    };

    const handleLogin = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setError(error.message);
        // On success, the onAuthStateChange listener will handle the redirect.
        setIsLoading(false);
    };

    const handleSignup = async (e: FormEvent) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
        }
        setIsLoading(true);
        setError(null);
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    first_name: firstName,
                    last_name: lastName,
                }
            }
        });
        if (error) setError(error.message);
        // On success, the onAuthStateChange listener will trigger the onboarding flow.
        setIsLoading(false);
    };

    const renderForm = () => {
        switch (step) {
            case 'email':
                return (
                    <form onSubmit={handleEmailSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-zinc-300">Email address</label>
                            <div className="mt-1">
                                <input id="email" name="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-white/5 border border-white/10 rounded-full px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/30 transition-all duration-300" />
                            </div>
                        </div>
                        <button type="submit" disabled={isLoading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-zinc-700">
                            {isLoading ? 'Checking...' : 'Continue'}
                        </button>
                    </form>
                );
            case 'login':
                return (
                    <form onSubmit={handleLogin} className="space-y-6 animate-pop-in">
                        <input type="email" value={email} readOnly className="w-full bg-black/20 border border-white/10 rounded-full px-4 py-3 text-zinc-400 cursor-not-allowed" />
                        <div>
                            <label htmlFor="password"className="block text-sm font-medium text-zinc-300">Password</label>
                            <div className="mt-1">
                                <input id="password" name="password" type="password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full bg-white/5 border border-white/10 rounded-full px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/30 transition-all duration-300" />
                            </div>
                        </div>
                        <button type="submit" disabled={isLoading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-zinc-700">
                            {isLoading ? 'Signing In...' : 'Sign In'}
                        </button>
                        <button onClick={() => setStep('email')} className="w-full text-center text-sm text-zinc-400 hover:text-white">Use a different email</button>
                    </form>
                );
            case 'signup':
                return (
                    <form onSubmit={handleSignup} className="space-y-4 animate-pop-in">
                        <input type="email" value={email} readOnly className="w-full bg-black/20 border border-white/10 rounded-full px-4 py-3 text-zinc-400 cursor-not-allowed" />
                        <div className="grid grid-cols-2 gap-4">
                            <input type="text" placeholder="First Name" value={firstName} onChange={e => setFirstName(e.target.value)} required className="w-full bg-white/5 border border-white/10 rounded-full px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/30 transition-all duration-300" />
                            <input type="text" placeholder="Last Name" value={lastName} onChange={e => setLastName(e.target.value)} required className="w-full bg-white/5 border border-white/10 rounded-full px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/30 transition-all duration-300" />
                        </div>
                        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required className="w-full bg-white/5 border border-white/10 rounded-full px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/30 transition-all duration-300" />
                        <input type="password" placeholder="Confirm Password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required className="w-full bg-white/5 border border-white/10 rounded-full px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/30 transition-all duration-300" />
                        <button type="submit" disabled={isLoading} className="w-full flex justify-center py-3 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-zinc-700">
                            {isLoading ? 'Creating Account...' : 'Create Account'}
                        </button>
                        <button onClick={() => setStep('email')} className="w-full text-center text-sm text-zinc-400 hover:text-white">Use a different email</button>
                    </form>
                );
        }
    };

    return (
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center animate-pop-in">
                    <div className="flex items-center justify-center gap-2 mb-4 interactive-lift cursor-pointer">
                        <img src="/nexus-logo.png" alt="Nexus Logo" className="w-10 h-10 animate-spin-slow" />
                        <span className="text-3xl font-bold tracking-tight brand-font">Nexus</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white">
                        {step === 'login' ? 'Welcome Back' : step === 'signup' ? 'Create your Account' : 'Welcome to Nexus'}
                    </h1>
                    <p className="text-zinc-400">
                        {step === 'login' ? 'Sign in to continue' : step === 'signup' ? 'Just a few details to get started' : 'Sign in or create an account'}
                    </p>
                </div>
                <div data-liquid-glass className="liquid-glass p-8 rounded-2xl animate-pop-in" style={{ animationDelay: '100ms' }}>
                    {renderForm()}
                    {error && <p className="mt-4 text-center text-sm text-red-400">{error}</p>}
                </div>
            </div>
        </div>
    );
};

export default LoginPage;