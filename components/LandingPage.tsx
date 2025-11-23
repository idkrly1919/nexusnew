import React, { FormEvent } from 'react';

interface LandingPageProps {
    onGetAccess: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetAccess }) => {

    const handleSignup = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const input = form.querySelector('input');
        const btn = form.querySelector('button');
        
        if(input && input.value && btn) {
            btn.innerText = "Access Granted";
            btn.classList.remove('bg-indigo-600', 'hover:bg-indigo-500');
            btn.classList.add('bg-green-600', 'hover:bg-green-500');
            setTimeout(() => onGetAccess(), 1000);
        }
    };

    return (
        <div id="landing-view" className="relative z-10">
            {/* Navigation */}
            <nav className="fixed w-full z-50 top-0 border-b border-white/5 bg-black/50 backdrop-blur-md">
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <img src="/nexus-logo.png" alt="Nexus Logo" className="w-8 h-8 animate-spin-slow" />
                        <span className="text-xl font-bold tracking-tight brand-font">Nexus</span>
                    </div>
                    
                    <div className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
                        <a href="#" className="hover:text-white transition-colors">Features</a>
                        <a href="#" className="hover:text-white transition-colors">Research</a>
                        <a href="#" className="hover:text-white transition-colors">Pricing</a>
                        <a href="#" className="hover:text-white transition-colors">Docs</a>
                    </div>

                    <div className="flex items-center gap-4">
                        <a href="#" className="text-sm font-medium text-zinc-400 hover:text-white hidden sm:block transition-colors">Log in</a>
                        <button onClick={onGetAccess} className="bg-white text-black px-4 py-2 rounded-full text-sm font-semibold hover:bg-zinc-200 transition-colors">
                            Get Access
                        </button>
                    </div>
                </div>
            </nav>

            {/* Main Content */}
            <main className="pt-32 pb-20">
                
                {/* Hero Section */}
                <div className="max-w-5xl mx-auto px-6 text-center space-y-8">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-300 text-xs font-medium animate-float">
                        <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
                        Nexus v2.0 is now live
                    </div>

                    <h1 className="text-5xl md:text-7xl font-bold leading-tight tracking-tight">
                        Compute at the <br />
                        <span className="gradient-text">speed of thought.</span>
                    </h1>

                    <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed">
                        The next generation mathematical reasoning engine. Solves complex logic, proofs, and data analysis in milliseconds.
                    </p>

                    {/* Signup Form */}
                    <div className="max-w-md mx-auto mt-10">
                        <form className="flex flex-col sm:flex-row gap-2" onSubmit={handleSignup}>
                            <input type="email" placeholder="Enter your email address" required
                                className="flex-1 bg-zinc-900/80 border border-zinc-800 rounded-lg px-4 py-3 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"/>
                            <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-lg font-medium transition-all shadow-[0_0_20px_rgba(79,70,229,0.3)] hover:shadow-[0_0_30px_rgba(79,70,229,0.5)] whitespace-nowrap">
                                Join Waitlist
                            </button>
                        </form>
                        <p className="text-xs text-zinc-600 mt-4">No spam. Unsubscribe anytime. <span className="text-zinc-500">2,400+ joined today.</span></p>
                    </div>
                </div>

                {/* Feature Grid */}
                <div className="max-w-6xl mx-auto px-6 mt-32">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Cards omitted for brevity, they are static */}
                          <div className="glass-panel p-8 rounded-2xl hover:-translate-y-1 transition-transform duration-300 group">
                            <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center mb-6 border border-zinc-800 group-hover:border-indigo-500/50 transition-colors">
                                <svg className="text-indigo-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-zinc-100">Symbolic Logic</h3>
                            <p className="text-zinc-400 text-sm leading-relaxed">
                                Advanced pattern matching and symbolic computation capabilities that go beyond standard LLM arithmetic.
                            </p>
                        </div>
                        <div className="glass-panel p-8 rounded-2xl hover:-translate-y-1 transition-transform duration-300 group">
                            <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center mb-6 border border-zinc-800 group-hover:border-purple-500/50 transition-colors">
                                <svg className="text-purple-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-zinc-100">Real-time Solver</h3>
                            <p className="text-zinc-400 text-sm leading-relaxed">
                                Low-latency inference engine optimized for mathematical queries and complex data structuring tasks.
                            </p>
                        </div>
                        <div className="glass-panel p-8 rounded-2xl hover:-translate-y-1 transition-transform duration-300 group">
                            <div className="w-12 h-12 bg-zinc-900 rounded-xl flex items-center justify-center mb-6 border border-zinc-800 group-hover:border-cyan-500/50 transition-colors">
                                <svg className="text-cyan-400" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
                            </div>
                            <h3 className="text-xl font-bold mb-3 text-zinc-100">Visual Proofs</h3>
                            <p className="text-zinc-400 text-sm leading-relaxed">
                                Generate LaTeX and visual graph representations of your proofs instantly for easy export and sharing.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Code Demo Section */}
                 <div className="max-w-5xl mx-auto px-6 mt-32">
                    <div className="flex flex-col md:flex-row gap-12 items-center">
                        <div className="flex-1 space-y-6">
                            <h2 className="text-3xl md:text-4xl font-bold">Seamless Integration</h2>
                            <p className="text-zinc-400 text-lg">
                                Connect Nexus to your existing workflow with our robust API. Python, Node, and Rust SDKs available.
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
                        </div>
                        <div className="flex-1 w-full">
                            <div className="glass-panel rounded-xl overflow-hidden border border-zinc-800 shadow-2xl">
                                <div className="flex items-center gap-2 px-4 py-3 bg-zinc-900/50 border-b border-zinc-800">
                                    <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50"></div>
                                    <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50"></div>
                                    <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50"></div>
                                    <div className="ml-2 text-xs text-zinc-500 font-mono">main.py</div>
                                </div>
                                <div className="p-4 overflow-x-auto bg-[#0D0D0D]">
                                    <pre className="text-sm font-mono leading-relaxed" dangerouslySetInnerHTML={{__html: `<span class="text-purple-400">import</span> <span class="text-white">nexus_sdk</span> <span class="text-purple-400">as</span> <span class="text-white">nx</span>

<span class="text-zinc-500"># Initialize the solver</span>
<span class="text-white">client</span> = <span class="text-white">nx.Client</span>(<span class="text-green-400">"api_key_..."</span>)

<span class="text-zinc-500"># Define a complex query</span>
<span class="text-white">response</span> = <span class="text-white">client.solve</span>(
    <span class="text-orange-300">problem</span>=<span class="text-green-400">"Calculate the trajectory of..."</span>,
    <span class="text-orange-300">model</span>=<span class="text-green-400">"nexus-math-v2"</span>,
    <span class="text-orange-300">precision</span>=<span class="text-blue-400">64</span>
)

<span class="text-purple-400">print</span>(<span class="text-white">response.solution</span>)`}}></pre>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Trust Footer */}
                <div className="mt-32 border-t border-zinc-900 pt-20 pb-10 text-center">
                    <p className="text-zinc-500 text-sm uppercase tracking-widest mb-8 font-semibold">Trusted by teams at</p>
                    <div className="flex flex-wrap justify-center items-center gap-12 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                        <div className="text-xl font-bold text-white flex items-center gap-2"><div className="w-6 h-6 bg-white rounded-full"></div> ACME Corp</div>
                        <div className="text-xl font-bold text-white flex items-center gap-2"><div className="w-6 h-6 border-2 border-white rounded-sm"></div> Globex</div>
                        <div className="text-xl font-bold text-white flex items-center gap-2"><div className="w-6 h-6 bg-white transform rotate-45"></div> Umbrellla</div>
                        <div className="text-xl font-bold text-white flex items-center gap-2"><div className="w-6 h-6 rounded-full border-2 border-white border-dashed"></div> Massive</div>
                    </div>
                    <div className="mt-20 text-zinc-600 text-sm">
                        © 2024 Nexus Intelligence Inc. All rights reserved.
                    </div>
                </div>

            </main>
        </div>
    );
};

export default LandingPage;