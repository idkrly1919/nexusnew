import React, { FormEvent, useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DynamicBackground from './DynamicBackground';
import { supabase } from '../integrations/supabase/client';

const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const [isFindingSpace, setIsFindingSpace] = useState(false);
    const [userCount, setUserCount] = useState(0);
    const lastFetchedCount = useRef(0);

    useEffect(() => {
        let animationFrameId: number;
        const animateCount = (start: number, end: number) => {
            const duration = 2000;
            const range = end - start;
            if (range <= 0) { setUserCount(end); return; }
            let startTime: number | null = null;
            const step = (currentTime: number) => {
                if (startTime === null) startTime = currentTime;
                const progress = Math.min((currentTime - startTime) / duration, 1);
                setUserCount(Math.floor(start + range * progress));
                if (progress < 1) animationFrameId = requestAnimationFrame(step);
            };
            animationFrameId = requestAnimationFrame(step);
        };
        const fetchCount = async () => {
            const { data } = await supabase.rpc('get_total_users_count');
            if (data && data > lastFetchedCount.current) { animateCount(lastFetchedCount.current, data); lastFetchedCount.current = data; }
        };
        const initialFetch = async () => { const { data } = await supabase.rpc('get_total_users_count'); if (data) { setUserCount(data); lastFetchedCount.current = data; } };
        initialFetch();
        const intervalId = setInterval(fetchCount, 15000);
        return () => { clearInterval(intervalId); cancelAnimationFrame(animationFrameId); };
    }, []);

    const handleSignup = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsFindingSpace(true);
        setTimeout(() => { setIsFindingSpace(false); navigate('/auth'); }, 1500);
    };

    return (
        <>
            <DynamicBackground status="idle" />
            {isFindingSpace && (
                <div className="fixed inset-0 z-[100] bg-[var(--bg-primary)]/80 backdrop-blur-lg flex items-center justify-center">
                    <div className="text-center space-y-4 animate-fade-in-up">
                        <div className="w-12 h-12 border-4 border-[var(--accent)] border-t-transparent rounded-full animate-spin mx-auto"></div>
                        <p className="text-lg font-medium text-[var(--text-primary)]">Preparing your workspace...</p>
                    </div>
                </div>
            )}
            
            <div className="relative z-10 min-h-screen flex flex-col">
                <nav className="fixed w-full z-50 top-0 border-b border-[var(--glass-border)] bg-[var(--glass-bg)] backdrop-blur-md">
                    <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                        <div className="flex items-center gap-2 font-bold text-xl text-[var(--text-primary)]">
                            <div className="w-8 h-8 rounded-lg bg-[var(--text-primary)] text-[var(--bg-primary)] flex items-center justify-center">Q</div>
                            <span>Quillix</span>
                        </div>
                        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[var(--text-secondary)]">
                            <a href="#" className="hover:text-[var(--text-primary)] transition-colors">Product</a>
                            <a href="#" className="hover:text-[var(--text-primary)] transition-colors">Research</a>
                            <a href="#" className="hover:text-[var(--text-primary)] transition-colors">Company</a>
                        </div>
                        <div className="flex items-center gap-4">
                            <Link to="/auth" className="text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]">Log in</Link>
                            <Link to="/auth" className="btn-primary px-4 py-2 rounded-full text-sm font-semibold shadow-lg shadow-blue-500/20">Get Started</Link>
                        </div>
                    </div>
                </nav>

                <main className="pt-32 pb-20 flex-1">
                    <div className="max-w-5xl mx-auto px-6 text-center space-y-8">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--bg-secondary)] border border-[var(--glass-border)] text-xs font-medium text-[var(--text-secondary)]">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                            Quillix 2.0 is now available
                        </div>

                        <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-[var(--text-primary)]">
                            Intelligence, <br/>
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Reimagined.</span>
                        </h1>

                        <p className="text-xl text-[var(--text-secondary)] max-w-2xl mx-auto leading-relaxed">
                            A workspace that thinks with you. Solve complex problems, generate visuals, and write code at the speed of thought.
                        </p>

                        <div className="max-w-md mx-auto mt-10">
                            <form className="relative flex items-center" onSubmit={handleSignup}>
                                <input type="email" placeholder="Enter your email" required className="w-full h-12 pl-5 pr-32 rounded-full bg-[var(--bg-secondary)] border border-[var(--glass-border)] focus:ring-2 focus:ring-[var(--accent)] focus:outline-none transition-all" />
                                <button type="submit" className="absolute right-1 top-1 bottom-1 px-5 rounded-full bg-[var(--text-primary)] text-[var(--bg-primary)] font-medium hover:opacity-90 transition-opacity">
                                    Join Now
                                </button>
                            </form>
                            <p className="text-xs text-[var(--text-tertiary)] mt-3">{userCount.toLocaleString()} thinkers joined so far.</p>
                        </div>
                    </div>

                    <div className="max-w-6xl mx-auto px-6 mt-24">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            {[
                                { title: 'Reasoning Engine', desc: 'Symbolic logic and advanced problem solving.', icon: '🧠' },
                                { title: 'Generative Canvas', desc: 'Create stunning visuals and UI concepts instantly.', icon: '🎨' },
                                { title: 'Code Companion', desc: 'Full-stack development assistant with live preview.', icon: '⚡' }
                            ].map((feature, i) => (
                                <div key={i} className="glass-panel p-8 rounded-2xl hover:scale-[1.02] transition-transform duration-300">
                                    <div className="text-4xl mb-4">{feature.icon}</div>
                                    <h3 className="text-xl font-bold mb-2 text-[var(--text-primary)]">{feature.title}</h3>
                                    <p className="text-[var(--text-secondary)]">{feature.desc}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </main>
                
                <footer className="border-t border-[var(--glass-border)] py-12 bg-[var(--bg-secondary)]">
                    <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="text-sm text-[var(--text-tertiary)]">© 2024 Quillix Inc.</div>
                        <div className="flex gap-6 text-sm text-[var(--text-secondary)]">
                            <a href="#" className="hover:text-[var(--text-primary)]">Privacy</a>
                            <a href="#" className="hover:text-[var(--text-primary)]">Terms</a>
                            <a href="#" className="hover:text-[var(--text-primary)]">Twitter</a>
                        </div>
                    </div>
                </footer>
            </div>
        </>
    );
};

export default LandingPage;