import React, { FormEvent, useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DynamicBackground from './DynamicBackground';
import { supabase } from '../integrations/supabase/client';

const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const [isFindingSpace, setIsFindingSpace] = useState(false);
    const [spaceStatus, setSpaceStatus] = useState('');
    const [userCount, setUserCount] = useState(0);
    const lastFetchedCount = useRef(0);

    useEffect(() => {
        let animationFrameId: number;
        
        const animateCount = (start: number, end: number) => {
            const duration = 2000;
            const range = end - start;
            if (range <= 0) {
                setUserCount(end);
                return;
            }
            let startTime: number | null = null;
    
            const step = (currentTime: number) => {
                if (startTime === null) startTime = currentTime;
                const elapsedTime = currentTime - startTime;
                const progress = Math.min(elapsedTime / duration, 1);
                setUserCount(Math.floor(start + range * progress));
    
                if (progress < 1) {
                    animationFrameId = requestAnimationFrame(step);
                }
            };
            animationFrameId = requestAnimationFrame(step);
        };
    
        const fetchCount = async () => {
            const { data, error } = await supabase.rpc('get_total_users_count');
            if (!error && data && data > lastFetchedCount.current) {
                animateCount(lastFetchedCount.current, data);
                lastFetchedCount.current = data;
            }
        };
    
        const initialFetch = async () => {
            const { data, error } = await supabase.rpc('get_total_users_count');
            if (!error && data) {
                setUserCount(data);
                lastFetchedCount.current = data;
            }
        };

        initialFetch();
        const intervalId = setInterval(fetchCount, 15000);
    
        return () => {
            clearInterval(intervalId);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);


    const handleSignup = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setSpaceStatus('Finding you a space...');
        setIsFindingSpace(true);

        setTimeout(() => {
            setSpaceStatus('Space found!');
        }, 2000);

        setTimeout(() => {
            setIsFindingSpace(false);
            navigate('/auth');
        }, 3000);
    };

    const scrollToSection = (id: string) => {
        const element = document.getElementById(id);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    };

    return (
        <>
            <DynamicBackground status="loading-text" />
            {isFindingSpace && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-lg flex items-center justify-center">
                    <div className="text-center space-y-4 animate-pop-in">
                        <div className="relative w-16 h-16 mx-auto">
                            <div className="absolute inset-0 rounded-full bg-indigo-500 animate-pulse"></div>
                            <div className="absolute inset-2 rounded-full bg-black"></div>
                            <img src="/quillix-logo.png" alt="Quillix Logo" className="w-16 h-16 relative" />
                        </div>
                        <p className="text-lg font-medium text-zinc-300">{spaceStatus}</p>
                    </div>
                </div>
            )}
            <div id="landing-view" className="relative z-10">
                <nav className="fixed w-full z-50 top-0 bg-zinc-900/10 backdrop-blur-md border-b border-zinc-700/20">
                    <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                        <div className="flex items-center gap-2 interactive-lift cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                            <img src="/quillix-logo.png" alt="Quillix Logo" className="w-8 h-8" />
                            <span className="text-xl font-bold tracking-tight brand-font text-zinc-100">Quillix</span>
                        </div>
                        
                        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-300">
                            <button onClick={() => scrollToSection('features')} className="hover:text-zinc-100 transition-colors duration-300">Features</button>
                            <button onClick={() => scrollToSection('research')} className="hover:text-zinc-100 transition-colors duration-300">Research</button>
                            <button onClick={() => scrollToSection('pricing')} className="hover:text-zinc-100 transition-colors duration-300">Pricing</button>
                            <button onClick={() => scrollToSection('docs')} className="hover:text-zinc-100 transition-colors duration-300">Docs</button>
                        </div>

                        <div className="flex items-center gap-4">
                            <Link to="/auth" className="text-sm font-medium text-zinc-300 hover:text-zinc-100 hidden sm:block transition-colors duration-300">Log in</Link>
                            <Link to="/auth" className="bg-zinc-800/50 backdrop-blur-md border border-zinc-700/50 text-zinc-100 px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-zinc-700/50 transition-all duration-300 interactive-lift">
                                Get Access
                            </Link>
                        </div>
                    </div>
                </nav>

                <main className="pt-32 pb-20">
                    {/* Hero Section */}
                    <div className="max-w-5xl mx-auto px-6 text-center space-y-8 mb-32">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-medium interactive-lift">
                            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                            Quillix v2.0 is now live
                        </div>

                        <h1 className="text-5xl md:text-7xl font-bold leading-tight tracking-tighter">
                            Compute at the <br />
                            <span className="liquid-gradient-text">speed of thought.</span>
                        </h1>

                        <p className="text-lg md:text-xl text-zinc-400 max-w-3xl mx-auto leading-relaxed">
                            Quillix is the best free <span className="text-zinc-100 font-medium">ChatGPT / Claude Pro alternative</span>. Access the smartest models, enjoy <span className="text-zinc-100 font-medium">unlimited uploads</span>, take AI quizzes, and more—completely free. Solves complex logic, proofs, and data analysis with a fluid, intuitive interface.
                        </p>

                        <div className="max-w-md mx-auto mt-10">
                            <form className="relative" onSubmit={handleSignup}>
                                <input type="email" placeholder="Enter your email..." required
                                    className="w-full bg-zinc-800/50 border border-zinc-700/50 rounded-full px-6 py-4 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/30 transition-all duration-300"/>
                                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-full font-medium transition-all duration-300 shadow-[0_0_20px_rgba(129,140,248,0.4)] hover:shadow-[0_0_30px_rgba(129,140,248,0.6)] interactive-lift">
                                    Join Waitlist
                                </button>
                            </form>
                            <p className="text-xs text-zinc-600 mt-4">No spam. Unsubscribe anytime. <span className="text-zinc-500">{userCount.toLocaleString()} total users have joined.</span></p>
                        </div>
                    </div>

                    {/* Features Section */}
                    <div id="features" className="max-w-6xl mx-auto px-6 py-20">
                        <h2 className="text-3xl font-bold text-center mb-16 text-zinc-100">Advanced Capabilities</h2>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                            <div data-liquid-glass className="liquid-glass p-6 rounded-2xl text-center interactive-lift group bw-to-color-hover">
                                <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center mb-4 border border-zinc-800 group-hover:border-indigo-500/50 transition-colors duration-300">
                                    <svg className="text-indigo-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                                </div>
                                <h3 className="text-lg font-bold mb-2 text-zinc-100">Make a video</h3>
                            </div>
                            <div data-liquid-glass className="liquid-glass p-6 rounded-2xl text-center interactive-lift group bw-to-color-hover">
                                <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center mb-4 border border-zinc-800 group-hover:border-purple-500/50 transition-colors duration-300">
                                    <svg className="text-purple-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                                </div>
                                <h3 className="text-lg font-bold mb-2 text-zinc-100">AI Web Developer</h3>
                            </div>
                            <div data-liquid-glass className="liquid-glass p-6 rounded-2xl text-center interactive-lift group bw-to-color-hover">
                                <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center mb-4 border border-zinc-800 group-hover:border-cyan-500/50 transition-colors duration-300">
                                    <svg className="text-cyan-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                                </div>
                                <h3 className="text-lg font-bold mb-2 text-zinc-100">Make an image</h3>
                            </div>
                            <div data-liquid-glass className="liquid-glass p-6 rounded-2xl text-center interactive-lift group bw-to-color-hover">
                                <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center mb-4 border border-zinc-800 group-hover:border-amber-500/50 transition-colors duration-300">
                                    <svg className="text-amber-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                                </div>
                                <h3 className="text-lg font-bold mb-2 text-zinc-100">Quiz me on...</h3>
                            </div>
                        </div>
                    </div>

                    {/* Research Section */}
                    <div id="research" className="max-w-5xl mx-auto px-6 py-20 border-t border-zinc-700/20">
                        <div className="flex flex-col md:flex-row gap-12 items-center">
                            <div className="flex-1 space-y-6">
                                <h2 className="text-3xl md:text-4xl font-bold text-zinc-100">Research & Architecture</h2>
                                <p className="text-zinc-400 text-lg">
                                    Built on the proprietary Quillix-7B architecture, our model introduces a novel attention mechanism specifically designed for multi-step reasoning tasks.
                                </p>
                                <div className="space-y-4">
                                    <div className="flex items-start gap-4">
                                        <div className="mt-1 bg-indigo-500/20 p-2 rounded-lg text-indigo-400">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-zinc-100">Zero-Shot Chain of Thought</h4>
                                            <p className="text-sm text-zinc-500">Achieves 89% accuracy on MATH benchmark without fine-tuning.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="mt-1 bg-purple-500/20 p-2 rounded-lg text-purple-400">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-zinc-100">Hybrid Symbolic Engine</h4>
                                            <p className="text-sm text-zinc-500">Combines neural networks with formal logic verifiers.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 w-full flex justify-center">
                                <div className="relative w-full max-w-sm aspect-square bg-gradient-to-tr from-indigo-500/20 via-purple-500/20 to-pink-500/20 rounded-full blur-3xl opacity-50 animate-pulse"></div>
                                <div data-liquid-glass className="absolute liquid-glass p-8 rounded-2xl max-w-sm border border-zinc-700/30">
                                    <div className="space-y-4 font-mono text-xs">
                                        <div className="flex justify-between text-zinc-400"><span>Parameters</span><span className="text-zinc-100">7.2B</span></div>
                                        <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden"><div className="bg-indigo-500 w-3/4 h-full"></div></div>
                                        <div className="flex justify-between text-zinc-400"><span>Context Window</span><span className="text-zinc-100">128k</span></div>
                                        <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden"><div className="bg-purple-500 w-full h-full"></div></div>
                                        <div className="flex justify-between text-zinc-400"><span>Latency</span><span className="text-zinc-100">12ms</span></div>
                                        <div className="w-full bg-zinc-800 h-1 rounded-full overflow-hidden"><div className="bg-green-500 w-1/4 h-full"></div></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Pricing Section */}
                    <div id="pricing" className="max-w-4xl mx-auto px-6 py-20 text-center border-t border-zinc-700/20">
                        <h2 className="text-3xl font-bold mb-4 text-zinc-100">Simple, Transparent Pricing</h2>
                        <p className="text-zinc-400 mb-12">Powerful tools shouldn't be locked behind a paywall.</p>
                        
                        <div className="relative group">
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                            <div data-liquid-glass className="relative liquid-glass p-10 rounded-3xl border border-zinc-700/30">
                                <h3 className="text-2xl font-bold text-zinc-100 mb-2">Researcher Edition</h3>
                                <div className="text-5xl font-bold text-zinc-100 mb-6">$0<span className="text-lg text-zinc-400 font-normal">/forever</span></div>
                                <p className="text-zinc-300 mb-8 max-w-lg mx-auto">
                                    Full access to the Quillix reasoning engine, chat history, and visualization tools. No credit card required.
                                </p>
                                <ul className="text-left max-w-xs mx-auto space-y-4 mb-8 text-zinc-400">
                                    <li className="flex items-center gap-3"><svg className="text-green-400 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Unlimited Queries</li>
                                    <li className="flex items-center gap-3"><svg className="text-green-400 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Long-term Memory</li>
                                    <li className="flex items-center gap-3"><svg className="text-green-400 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> API Access (Beta)</li>
                                    <li className="flex items-center gap-3"><svg className="text-green-400 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Community Support</li>
                                </ul>
                                <button onClick={() => navigate('/auth')} className="bg-white text-black px-8 py-3 rounded-full font-bold hover:bg-zinc-200 transition-colors w-full md:w-auto">Start Building for Free</button>
                            </div>
                        </div>
                    </div>

                    {/* Docs / Integration Section */}
                    <div id="docs" className="max-w-5xl mx-auto px-6 py-20 border-t border-zinc-700/20">
                        <div className="flex flex-col md:flex-row gap-12 items-center">
                            <div className="flex-1 w-full order-2 md:order-1">
                                <div data-liquid-glass className="liquid-glass rounded-2xl overflow-hidden interactive-lift">
                                    <div className="flex items-center gap-2 px-4 py-3 bg-zinc-900 border-b border-zinc-700/30">
                                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                        <div className="ml-2 text-xs text-zinc-500 font-mono">main.py</div>
                                    </div>
                                    <div className="p-4 overflow-x-auto bg-zinc-900/50">
                                        <pre className="text-sm font-mono leading-relaxed" dangerouslySetInnerHTML={{__html: `<span class="text-purple-400">import</span> <span class="text-zinc-100">quillix_sdk</span> <span class="text-purple-400">as</span> <span class="text-zinc-100">qx</span>\n\n<span class="text-zinc-500"># Initialize the solver</span>\n<span class="text-zinc-100">client</span> = <span class="text-zinc-100">qx.Client</span>(<span class="text-green-400">"api_key_..."</span>)\n\n<span class="text-zinc-500"># Define a complex query</span>\n<span class="text-zinc-100">response</span> = <span class="text-zinc-100">client.solve</span>(\n    <span class="text-orange-300">problem</span>=<span class="text-green-400">"Calculate the trajectory of..."</span>,\n    <span class="text-orange-300">model</span>=<span class="text-green-400">"quillix-math-v2"</span>,\n    <span class="text-orange-300">precision</span>=<span class="text-blue-400">64</span>\n)\n\n<span class="text-purple-400">print</span>(<span class="text-zinc-100">response.solution</span>)`}}></pre>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 space-y-6 order-1 md:order-2">
                                <h2 className="text-3xl md:text-4xl font-bold text-zinc-100">Seamless Integration</h2>
                                <p className="text-zinc-400 text-lg">
                                    Connect Quillix to your existing workflow with our robust API. Python, Node, and Rust SDKs available.
                                </p>
                                <ul className="space-y-3 text-zinc-300">
                                    <li className="flex items-center gap-3">
                                        <svg className="text-green-400" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                        Type-safe responses
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <svg className="text-green-400" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                        Streaming support
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <svg className="text-green-400" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                        99.99% uptime SLA
                                    </li>
                                </ul>
                                <button className="text-indigo-400 font-medium hover:text-indigo-300 flex items-center gap-2">Read Documentation <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg></button>
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-32 border-t border-zinc-700/20 pt-20 pb-10 text-center">
                        <p className="text-zinc-600 text-sm uppercase tracking-wider mb-8 font-semibold">Trusted by teams at</p>
                        <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-8">
                            <div className="trusted-logo text-xl font-bold text-zinc-100 flex items-center gap-2"><div className="w-6 h-6 bg-zinc-100 rounded-full"></div> ACME Corp</div>
                            <div className="trusted-logo text-xl font-bold text-zinc-100 flex items-center gap-2"><div className="w-6 h-6 border-2 border-zinc-100 rounded-sm"></div> Globex</div>
                            <div className="trusted-logo text-xl font-bold text-zinc-100 flex items-center gap-2"><div className="w-6 h-6 bg-zinc-100 transform rotate-45"></div> Umbrellla</div>
                            <div className="trusted-logo text-xl font-bold text-zinc-100 flex items-center gap-2"><div className="w-6 h-6 rounded-full border-2 border-zinc-100 border-dashed"></div> Massive</div>
                        </div>
                        <div className="mt-20 text-zinc-700 text-sm">
                            © 2025 Quillix Intelligence Inc. All rights reserved.
                        </div>
                    </div>

                </main>
            </div>
        </>
    );
};

export default LandingPage;