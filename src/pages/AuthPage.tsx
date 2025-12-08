import React, { useState, FormEvent, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import DynamicBackground from '../components/DynamicBackground';
import LegalModal from '../components/LegalModal';
import { termsOfService, privacyPolicy } from '../legal';

const AuthPage: React.FC = () => {
    const [step, setStep] = useState<'email' | 'login' | 'signup' | 'verify' | 'forgot-password'>('email');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [infoMessage, setInfoMessage] = useState<string | null>(null);

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [legalModal, setLegalModal] = useState<{ title: string, content: string } | null>(null);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [isResending, setIsResending] = useState(false);

    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => {
                setResendCooldown(resendCooldown - 1);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    const handleEmailSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        
        try {
            const checkUserPromise = supabase.rpc('user_exists', { user_email: email });
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Request timed out.')), 5000));

            // @ts-ignore
            const { data, error: rpcError } = await Promise.race([checkUserPromise, timeoutPromise]);

            if (rpcError) throw rpcError;

            if (data) {
                setStep('login');
            } else {
                setStep('signup');
            }
        } catch (err: any) {
            setError(err.message || 'Could not verify email.');
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
                data: { first_name: firstName, last_name: lastName },
                emailRedirectTo: 'https://quillixai.com/chat'
            }
        });
        if (error) {
            setError(error.message);
        } else {
            setStep('verify');
        }
        setIsLoading(false);
    };

    const handleForgotPassword = async (e: FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);
        setInfoMessage(null);

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `https://quillixai.com/reset-password`,
        });

        if (error) {
            setError(error.message);
        } else {
            setInfoMessage("If an account exists, a password reset link has been sent.");
        }
        setIsLoading(false);
    };

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        setError(null);
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: `https://quillixai.com/chat` }
        });
        if (error) {
            setError(error.message);
            setIsLoading(false);
        }
    };

    const handleResendVerification = async () => {
        setIsResending(true);
        setError(null);
        setInfoMessage(null);

        const { error } = await supabase.auth.resend({
            type: 'signup',
            email: email,
        });

        if (error) {
            setError(error.message);
        } else {
            setInfoMessage("Verification email sent again.");
            setResendCooldown(30);
        }
        setIsResending(false);
    };

    const renderForm = () => {
        switch (step) {
            case 'email':
                return (
                    <div className="space-y-6">
                        <form onSubmit={handleEmailSubmit} className="space-y-6">
                            <div>
                                <label htmlFor="email" className="block text-sm font-medium text-zinc-300">Email address</label>
                                <div className="mt-1">
                                    <input id="email" name="email" type="email" value={email} onChange={e => setEmail(e.target.value)} required className="w-full bg-white/5 border border-white/10 rounded-full px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/30 transition-all duration-300" />
                                </div>
                            </div>
                            <button type="submit" disabled={isLoading} className="w-full flex justify-center py-3 px-4 border rounded-full shadow-sm text-sm font-medium text-white liquid-glass transition-colors border-indigo-500/50 hover:bg-indigo-500/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:border-zinc-700 disabled:text-zinc-400 disabled:bg-transparent">
                                {isLoading ? 'Checking...' : 'Continue with Email'}
                            </button>
                        </form>
                        
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
                            <div className="relative flex justify-center text-sm"><span className="px-2 bg-[#18181b] text-zinc-500 rounded-full">Or continue with</span></div>
                        </div>

                        <button onClick={handleGoogleLogin} disabled={isLoading} className="no-invert w-full flex items-center justify-center gap-3 py-3 px-4 border border-white/10 bg-white text-black hover:bg-zinc-200 rounded-full shadow-sm text-sm font-medium transition-colors disabled:opacity-50">
                            <svg className="w-5 h-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                            Google
                        </button>
                    </div>
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
                             <div className="text-right">
                                <button type="button" onClick={() => setStep('forgot-password')} className="text-xs text-indigo-400 hover:text-indigo-300">Forgot Password?</button>
                            </div>
                        </div>
                        <button type="submit" disabled={isLoading} className="w-full flex justify-center py-3 px-4 border rounded-full shadow-sm text-sm font-medium text-white liquid-glass transition-colors border-indigo-500/50 hover:bg-indigo-500/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:border-zinc-700 disabled:text-zinc-400 disabled:bg-transparent">
                            {isLoading ? 'Signing In...' : 'Sign In'}
                        </button>
                        <button onClick={() => setStep('email')} className="w-full text-center text-sm text-zinc-400 hover:text-white">Use a different email</button>
                    </form>
                );
            case 'forgot-password':
                return (
                    <form onSubmit={handleForgotPassword} className="space-y-6 animate-pop-in">
                        <div className="text-center">
                            <h3 className="text-lg font-medium text-white">Reset Password</h3>
                            <p className="text-sm text-zinc-400 mt-2">Enter your email and we'll send you a link to reset your password.</p>
                        </div>
                        <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="Enter your email" className="w-full bg-white/5 border border-white/10 rounded-full px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/30" />
                        
                        {infoMessage && <div className="p-3 bg-indigo-500/20 text-indigo-200 text-sm rounded-lg text-center">{infoMessage}</div>}
                        
                        <button type="submit" disabled={isLoading} className="w-full flex justify-center py-3 px-4 border rounded-full shadow-sm text-sm font-medium text-white liquid-glass transition-colors border-indigo-500/50 hover:bg-indigo-500/20 disabled:border-zinc-700 disabled:text-zinc-400 disabled:bg-transparent">
                            {isLoading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                         <button type="button" onClick={() => setStep('login')} className="w-full text-center text-sm text-zinc-400 hover:text-white">Back to Login</button>
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
                        <p className="text-xs text-zinc-500 text-center px-4">
                            By signing up, you agree to the{' '}
                            <a href="#" onClick={(e) => { e.preventDefault(); setLegalModal({ title: 'Terms of Service', content: termsOfService }); }} className="underline hover:text-indigo-400">Terms and Conditions</a> and{' '}
                            <a href="#" onClick={(e) => { e.preventDefault(); setLegalModal({ title: 'Privacy Policy', content: privacyPolicy }); }} className="underline hover:text-indigo-400">Privacy Policy</a>.
                        </p>
                        <button type="submit" disabled={isLoading} className="w-full flex justify-center py-3 px-4 border rounded-full shadow-sm text-sm font-medium text-white liquid-glass transition-colors border-indigo-500/50 hover:bg-indigo-500/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:border-zinc-700 disabled:text-zinc-400 disabled:bg-transparent">
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
                        {infoMessage && <p className="text-sm text-green-400">{infoMessage}</p>}
                        <div className="pt-2">
                            <button
                                onClick={handleResendVerification}
                                disabled={isResending || resendCooldown > 0}
                                className="text-sm text-indigo-400 hover:text-indigo-300 disabled:text-zinc-500 disabled:cursor-not-allowed transition-colors"
                            >
                                {isResending
                                    ? 'Sending...'
                                    : resendCooldown > 0
                                    ? `Resend in ${resendCooldown}s`
                                    : 'Resend verification email'}
                            </button>
                        </div>
                    </div>
                );
        }
    };

    return (
        <>
            <DynamicBackground status="idle" />
            {legalModal && <LegalModal title={legalModal.title} content={legalModal.content} onClose={() => setLegalModal(null)} />}
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
                            {step === 'login' ? 'Welcome Back' : step === 'signup' ? 'Create your Account' : step === 'verify' ? 'One Last Step' : step === 'forgot-password' ? 'Recover Account' : 'Welcome to Quillix'}
                        </h1>
                        <p className="text-zinc-400">
                            {step === 'login' ? 'Sign in to continue' : step === 'signup' ? 'Just a few details to get started' : step === 'verify' ? 'Verify your email to continue' : step === 'forgot-password' ? 'Get back into your account' : 'Sign in or create an account'}
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