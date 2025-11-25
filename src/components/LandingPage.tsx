import React, { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DynamicBackground from './DynamicBackground';

const LandingPage: React.FC = () => {
    const navigate = useNavigate();
    const [isFindingSpace, setIsFindingSpace] = useState(false);
    const [spaceStatus, setSpaceStatus] = useState('');

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

    return (
        <>
            <DynamicBackground status="loading-text" />
            {isFindingSpace && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-lg flex items-center justify-center">
                    <div className="text-center space-y-4 animate-pop-in">
                        <div className="relative w-16 h-16 mx-auto">
                            <div className="absolute inset-0 rounded-full bg-indigo-500 animate-pulse"></div>
                            <div className="absolute inset-2 rounded-full bg-black"></div>
                            <img src="/nexus-logo.png" alt="Nexus Logo" className="w-16 h-16 animate-spin-slow relative" />
                        </div>
                        <p className="text-lg font-medium text-zinc-300">{spaceStatus}</p>
                    </div>
                </div>
            )}
            <div id="landing-view" className="relative z-10">
                <nav className="fixed w-full z-50 top-0">
                    <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                        <div className="flex items-center gap-2 interactive-lift cursor-pointer">
                            <img src="/nexus-logo.png" alt="Nexus Logo" className="w-8 h-8 animate-spin-slow" />
                            <span className="text-xl font-bold tracking-tight brand-font">Nexus</span>
                        </div>
                        
                        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-600 dark:text-zinc-300">
                            <a href="#" className="hover:text-zinc-900 dark:hover:text-white transition-colors duration-300">Features</a>
                            <a href="#" className="hover:text-zinc-900 dark:hover:text-white transition-colors duration-300">Research</a>
                            <a href="#" className="hover:text-zinc-900 dark:hover:text-white transition-colors duration-300">Pricing</a>
                            <a href="#" className="hover:text-zinc-900 dark:hover:text-white transition-colors duration-300">Docs</a>
                        </div>

                        <div className="flex items-center gap-4">
                            <Link to="/auth" className="text-sm font-medium text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hidden sm:block transition-colors duration-300">Log in</Link>
                            <Link to="/auth" className="bg-zinc-900/5 dark:bg-white/10 backdrop-blur-md border border-zinc-900/10 dark:border-white/20 text-zinc-900 dark:text-white px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-zinc-900/10 dark:hover:bg-white/20 transition-all duration-300 interactive-lift">
                                Get Access
                            </Link>
                        </div>
                    </div>
                </nav>

                <main className="pt-32 pb-20">
                    <div className="max-w-5xl mx-auto px-6 text-center space-y-8">
                        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-500 dark:text-indigo-300 text-xs font-medium interactive-lift">
                            <span className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse"></span>
                            Nexus v2.0 is now live
                        </div>

                        <h1 className="text-5xl md:text-7xl font-bold leading-tight tracking-tighter">
                            Compute at the <br />
                            <span className="liquid-gradient-text">speed of thought.</span>
                        </h1>

                        <p className="text-lg md:text-xl text-zinc-600 dark:text-zinc-400 max-w-3xl mx-auto leading-relaxed">
                            The next generation reasoning engine. Solves complex logic, proofs, and data analysis with a fluid, intuitive interface.
                        </p>

                        <div className="max-w-md mx-auto mt-10">
                            <form className="relative" onSubmit={handleSignup}>
                                <input type="email" placeholder="Enter your email..." required
                                    className="w-full bg-zinc-900/5 dark:bg-white/5 border border-zinc-900/10 dark:border-white/10 rounded-full px-6 py-4 text-zinc-900 dark:text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/30 transition-all duration-300"/>
                                <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-full font-medium transition-all duration-300 shadow-[0_0_20px_rgba(129,140,248,0.4)] hover:shadow-[0_0_30px_rgba(129,140,248,0.6)] interactive-lift">
                                    Join Waitlist
                                </button>
                            </form>
                            <p className="text-xs text-zinc-500 dark:text-zinc-600 mt-4">No spam. Unsubscribe anytime. <span className="text-zinc-400 dark:text-zinc-500">2,400+ joined today.</span></p>
                        </div>
                    </div>

                    <div className="max-w-6xl mx-auto px-6 mt-32">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div data-liquid-glass className="liquid-glass p-8 interactive-lift group bw-to-color-hover rounded-3xl">
                                <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-900 rounded-xl flex items-center justify-center mb-6 border border-zinc-200 dark:border-zinc-800 group-hover:border-indigo-500/50 transition-colors duration-300">
                                    <svg className="text-indigo-500 dark:text-indigo-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                                </div>
                                <h3 className="text-xl font-bold mb-3 text-zinc-800 dark:text-zinc-100">Symbolic Logic</h3>
                                <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
                                    Advanced pattern matching and symbolic computation capabilities that go beyond standard LLM arithmetic.
                                </p>
                            </div>
                            <div data-liquid-glass className="liquid-glass p-8 interactive-lift group bw-to-color-hover rounded-3xl">
                                <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-900 rounded-xl flex items-center justify-center mb-6 border border-zinc-200 dark:border-zinc-800 group-hover:border-purple-500/50 transition-colors duration-300">
                                    <svg className="text-purple-500 dark:text-purple-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                                </div>
                                <h3 className="text-xl font-bold mb-3 text-zinc-800 dark:text-zinc-100">Real-time Solver</h3>
                                <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
                                    Low-latency inference engine optimized for mathematical queries and complex data structuring tasks.
                                </p>
                            </div>
                            <div data-liquid-glass className="liquid-glass p-8 interactive-lift group bw-to-color-hover rounded-3xl">
                                <div className="w-12 h-12 bg-zinc-100 dark:bg-zinc-900 rounded-xl flex items-center justify-center mb-6 border border-zinc-200 dark:border-zinc-800 group-hover:border-cyan-500/50 transition-colors duration-300">
                                    <svg className="text-cyan-500 dark:text-cyan-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                                </div>
                                <h3 className="text-xl font-bold mb-3 text-zinc-800 dark:text-zinc-100">Visual Proofs</h3>
                                <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
                                    Generate LaTeX and visual graph representations of your proofs instantly for easy export and sharing.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="max-w-5xl mx-auto px-6 mt-32">
                        <div className="flex flex-col md:flex-row gap-12 items-center">
                            <div className="flex-1 space-y-6">
                                <h2 className="text-3xl md:text-4xl font-bold">Seamless Integration</h2>
                                <p className="text-zinc-600 dark:text-zinc-400 text-lg">
                                    Connect Nexus to your existing workflow with our robust API. Python, Node, and Rust SDKs available.
                                </p>
                                <ul className="space-y-3 text-zinc-700 dark:text-zinc-300">
                                    <li className="flex items-center gap-3">
                                        <svg className="text-green-500 dark:text-green-400" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                        Type-safe responses
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <svg className="text-green-500 dark:text-green-400" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                        Streaming support
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <svg className="text-green-500 dark:text-green-400" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                        99.99% uptime SLA
                                    </li>
                                </ul>
                            </div>
                            <div className="flex-1 w-full">
                                <div data-liquid-glass className="liquid-glass rounded-2xl overflow-hidden interactive-lift">
                                    <div className="flex items-center gap-2 px-4 py-3 bg-zinc-200/50 dark:bg-black/20 border-b border-zinc-900/10 dark:border-white/10">
                                        <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                        <div className="ml-2 text-xs text-zinc-500 font-mono">main.py</div>
                                    </div>
                                    <div className="p-4 overflow-x-auto bg-zinc-100/50 dark:bg-black/10">
                                        <pre className="text-sm font-mono leading-relaxed" dangerouslySetInnerHTML={{__html: `<span class="text-purple-500 dark:text-purple-400">import</span> <span class="text-zinc-800 dark:text-white">nexus_sdk</span> <span class="text-purple-500 dark:text-purple-400">as</span> <span class="text-zinc-800 dark:text-white">nx</span>\n\n<span class="text-zinc-500"># Initialize the solver</span>\n<span class="text-zinc-800 dark:text-white">client</span> = <span class="text-zinc-800 dark:text-white">nx.Client</span>(<span class="text-green-500 dark:text-green-400">"api_key_..."</span>)\n\n<span class="text-zinc-500"># Define a complex query</span>\n<span class="text-zinc-800 dark:text-white">response</span> = <span class="text-zinc-800 dark:text-white">client.solve</span>(\n    <span class="text-orange-500 dark:text-orange-300">problem</span>=<span class="text-green-500 dark:text-green-400">"Calculate the trajectory of..."</span>,\n    <span class="text-orange-500 dark:text-orange-300">model</span>=<span class="text-green-500 dark:text-green-400">"nexus-math-v2"</span>,\n    <span class="text-orange-500 dark:text-orange-300">precision</span>=<span class="text-blue-500 dark:text-blue-400">64</span>\n)\n\n<span class="text-purple-500 dark:text-purple-400">print</span>(<span class="text-zinc-800 dark:text-white">response.solution</span>)`}}></pre>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="mt-32 border-t border-zinc-900/10 dark:border-white/10 pt-20 pb-10 text-center">
                        <p className="text-zinc-500 text-sm uppercase tracking-widest mb-8 font-semibold">Trusted by teams at</p>
                        <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-8 text-zinc-800 dark:text-white">
                            <div className="trusted-logo text-xl font-bold flex items-center gap-2"><div className="w-6 h-6 bg-zinc-800 dark:bg-white rounded-full"></div> ACME Corp</div>
                            <div className="trusted-logo text-xl font-bold flex items-center gap-2"><div className="w-6 h-6 border-2 border-zinc-800 dark:border-white rounded-sm"></div> Globex</div>
                            <div className="trusted-logo text-xl font-bold flex items-center gap-2"><div className="w-6 h-6 bg-zinc-800 dark:bg-white transform rotate-45"></div> Umbrellla</div>
                            <div className="trusted-logo text-xl font-bold flex items-center gap-2"><div className="w-6 h-6 rounded-full border-2 border-zinc-800 dark:border-white border-dashed"></div> Massive</div>
                        </div>
                        <div className="mt-20 text-zinc-500 dark:text-zinc-600 text-sm">
                            © 2024 Nexus Intelligence Inc. All rights reserved.
                        </div>
                    </div>

                </main>
            </div>
        </>
    );
};

export default LandingPage;