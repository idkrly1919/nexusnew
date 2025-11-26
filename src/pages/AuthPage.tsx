import React, { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import DynamicBackground from '../components/DynamicBackground';

const AuthPage: React.FC = () => {
    const [step, setStep] = useState<'email' | 'login' | 'signup' | 'verify'>('email');
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
        
        try {
            const checkUserPromise = supabase.rpc('user_exists', { user_email: email });
            
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Request timed out. Please check your connection and try again.')), 5000)
            );

            // @ts-ignore
            const { data, error: rpcError } = await Promise.race([checkUserPromise, timeoutPromise]);

            if (rpcError) {
                throw rpcError;
            }

            if (data) {
                setStep('login');
            } else {
                setStep('signup');
            }
        } catch (err: any) {
            setError(err.message || 'Could not verify email. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleLogin = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) setError(error.message);
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
        if (error) {
            setError(error.message);
        } else {
            setStep('verify');
        }
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
                            {isLoading ? 'Checking...' : 'Continue with Email'}
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
            case 'verify':
                return (
                    <div className="text-center space-y-6 animate-pop-in">
                        <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto">
                            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        </div>
                        <h2 className="text-2xl font-bold text-white">Account Created!</h2>
                        <p className="text-zinc-400">
                            We've sent a verification link to <strong>{email}</strong>. Please check your inbox to complete the process.
                        </p>
                    </div>
                );
        }
    };

    return (
        <>
            <DynamicBackground status="idle" />
            <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-lg flex flex-col items-center justify-center p-4 animate-pop-in">
                 {step !== 'verify' && (
                    <div className="absolute top-4 right-4 z-10">
                        <Link to="/chat" className="p-2 rounded-full text-zinc-300 hover:text-white bg-black/20 hover:bg-black/40 backdrop-blur-md border border-white/10 transition-colors">
                            <svg width="24" height="24" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5" fill="none"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </Link>
                    </div>
                )}
                <div className="w-full max-w-md space-y-8">
                    <div className="text-center animate-pop-in">
                        <div className="flex items-center justify-center gap-2 mb-4 interactive-lift cursor-pointer">
                            <img src="/quillix-logo.png" alt="Quillix Logo" className="w-10 h-10" />
                            <span className="text-3xl font-bold tracking-tight brand-font">Quillix</span>
                        </div>
                        <h1 className="text-2xl font-bold text-white">
                            {step === 'login' ? 'Welcome Back' : step === 'signup' ? 'Create your Account' : step === 'verify' ? 'One Last Step' : 'Welcome to Quillix'}
                        </h1>
                        <p className="text-zinc-400">
                            {step === 'login' ? 'Sign in to continue' : step === 'signup' ? 'Just a few details to get started' : step === 'verify' ? 'Verify your email to continue' : 'Sign in or create an account'}
                        </p>
                    </div>
                    <div data-liquid-glass className="liquid-glass p-8 rounded-2xl animate-pop-in" style={{ animationDelay: '100ms' }}>
                        {renderForm()}
                        {error && <p className="mt-4 text-center text-sm text-red-400">{error}</p>}
                    </div>
                </div>
            </div>
        </>
    );
};

export default AuthPage;