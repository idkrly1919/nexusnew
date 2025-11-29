import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { performWebSearch, summarizeUrl, getTrustScore, SearchResult } from '../services/geminiService';
import DynamicBackground from '../components/DynamicBackground';

const SearchPage: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const initialQuery = searchParams.get('q') || '';
    
    const [query, setQuery] = useState(initialQuery);
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [hasSearched, setHasSearched] = useState(!!initialQuery);
    
    // Feature states
    const [activeSummary, setActiveSummary] = useState<{ index: number, text: string } | null>(null);
    const [activeTrust, setActiveTrust] = useState<{ index: number, score: number, reason: string } | null>(null);
    const [loadingAction, setLoadingAction] = useState<{ index: number, type: 'summary' | 'trust' } | null>(null);

    useEffect(() => {
        if (initialQuery) {
            executeSearch(initialQuery);
        }
    }, []);

    const executeSearch = async (q: string) => {
        if (!q.trim()) return;
        setHasSearched(true);
        setIsSearching(true);
        setResults([]);
        setSearchParams({ q }); // Update URL
        
        try {
            const data = await performWebSearch(q);
            setResults(data);
        } catch (error) {
            console.error("Search failed:", error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        executeSearch(query);
    };

    const handleSummarize = async (index: number, result: SearchResult) => {
        if (activeSummary?.index === index) {
            setActiveSummary(null); // Toggle off
            return;
        }
        setLoadingAction({ index, type: 'summary' });
        try {
            const text = await summarizeUrl(result.link, result.snippet);
            setActiveSummary({ index, text });
            setActiveTrust(null); // Close other open drawers
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingAction(null);
        }
    };

    const handleTrustScore = async (index: number, result: SearchResult) => {
        if (activeTrust?.index === index) {
            setActiveTrust(null);
            return;
        }
        setLoadingAction({ index, type: 'trust' });
        try {
            const data = await getTrustScore(result.link);
            setActiveTrust({ index, ...data });
            setActiveSummary(null);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingAction(null);
        }
    };

    return (
        <div className="min-h-screen text-white relative overflow-x-hidden">
            <DynamicBackground status={isSearching ? 'loading-text' : 'idle'} />
            
            {/* Header / Search Bar Area */}
            <div className={`transition-all duration-500 ease-in-out flex flex-col ${hasSearched ? 'pt-6 px-6' : 'h-screen justify-center items-center px-4'}`}>
                
                {/* Logo */}
                <div className={`flex items-center gap-3 transition-all duration-500 ${hasSearched ? 'mb-6' : 'mb-8 flex-col'}`}>
                    <div className="cursor-pointer flex items-center gap-3" onClick={() => { setHasSearched(false); setQuery(''); setResults([]); navigate('/search'); }}>
                        <img src="/quillix-logo.png" alt="Quillix" className={`transition-all duration-500 ${hasSearched ? 'w-8 h-8' : 'w-20 h-20'}`} />
                        <span className={`font-brand font-bold tracking-tight transition-all duration-500 ${hasSearched ? 'text-xl' : 'text-4xl'}`}>Quillix Search</span>
                    </div>
                </div>

                {/* Search Input */}
                <form onSubmit={handleSearchSubmit} className={`relative w-full transition-all duration-500 ${hasSearched ? 'max-w-3xl' : 'max-w-2xl'}`}>
                    <div data-liquid-glass className="liquid-glass rounded-full flex items-center p-2 border border-white/10 focus-within:border-indigo-500/50 transition-colors">
                        <svg className="w-5 h-5 text-zinc-400 ml-3 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        <input 
                            type="text" 
                            value={query} 
                            onChange={(e) => setQuery(e.target.value)} 
                            placeholder="Search the web with AI..." 
                            className="flex-1 bg-transparent border-none text-white placeholder-zinc-500 focus:ring-0 focus:outline-none h-10 px-2"
                        />
                        {query && (
                            <button type="button" onClick={() => setQuery('')} className="p-2 text-zinc-500 hover:text-white">
                                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                        )}
                        <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-full p-2.5 transition-colors ml-1">
                            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                        </button>
                    </div>
                </form>

                {/* Navigation (Only when searched) */}
                {hasSearched && (
                    <div className="flex gap-6 mt-6 ml-2 border-b border-white/10 text-sm text-zinc-400">
                        <button className="pb-3 border-b-2 border-indigo-500 text-white font-medium">All</button>
                        <button className="pb-3 border-b-2 border-transparent hover:text-zinc-200 transition-colors">Images</button>
                        <button className="pb-3 border-b-2 border-transparent hover:text-zinc-200 transition-colors">News</button>
                        <button onClick={() => navigate('/chat')} className="pb-3 border-b-2 border-transparent hover:text-indigo-400 transition-colors ml-auto flex items-center gap-2">
                            <span>Chat Mode</span>
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                        </button>
                    </div>
                )}
            </div>

            {/* Results Area */}
            {hasSearched && (
                <div className="max-w-4xl px-6 py-8 space-y-8 animate-pop-in">
                    {isSearching ? (
                        <div className="space-y-6">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="animate-pulse space-y-3">
                                    <div className="h-4 bg-white/10 rounded w-1/4"></div>
                                    <div className="h-6 bg-white/10 rounded w-3/4"></div>
                                    <div className="h-4 bg-white/5 rounded w-full"></div>
                                    <div className="h-4 bg-white/5 rounded w-5/6"></div>
                                </div>
                            ))}
                        </div>
                    ) : results.length > 0 ? (
                        results.map((result, index) => (
                            <div key={index} className="group relative">
                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2 text-sm text-zinc-400">
                                        <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-[10px] overflow-hidden">
                                            {/* Favicon fallback */}
                                            <img 
                                                src={`https://www.google.com/s2/favicons?domain=${new URL(result.link).hostname}&sz=32`} 
                                                alt="" 
                                                className="w-4 h-4"
                                                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                            />
                                        </div>
                                        <span className="truncate max-w-[200px]">{new URL(result.link).hostname}</span>
                                        {result.date && <span className="text-zinc-600">• {result.date}</span>}
                                    </div>
                                    <a href={result.link} target="_blank" rel="noopener noreferrer" className="text-xl text-indigo-400 hover:underline font-medium visited:text-purple-400 block mt-1">
                                        {result.title}
                                    </a>
                                    <p className="text-zinc-300 text-sm leading-relaxed max-w-2xl mt-1">
                                        {result.snippet}
                                    </p>
                                </div>

                                {/* AI Actions */}
                                <div className="flex items-center gap-2 mt-3">
                                    <button 
                                        onClick={() => handleSummarize(index, result)}
                                        disabled={loadingAction?.index === index}
                                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors flex items-center gap-2 ${activeSummary?.index === index ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'}`}
                                    >
                                        {loadingAction?.index === index && loadingAction.type === 'summary' ? <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> : <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>}
                                        Summarize
                                    </button>
                                    <button 
                                        onClick={() => handleTrustScore(index, result)}
                                        disabled={loadingAction?.index === index}
                                        className={`text-xs px-3 py-1.5 rounded-full border transition-colors flex items-center gap-2 ${activeTrust?.index === index ? 'bg-green-600 border-green-500 text-white' : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white hover:bg-white/10'}`}
                                    >
                                        {loadingAction?.index === index && loadingAction.type === 'trust' ? <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> : <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>}
                                        Trust Score
                                    </button>
                                </div>

                                {/* Expanded Content Drawers */}
                                {activeSummary?.index === index && (
                                    <div className="mt-3 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl animate-pop-in">
                                        <h4 className="text-indigo-300 text-xs font-bold uppercase mb-2">AI Summary</h4>
                                        <p className="text-sm text-zinc-200">{activeSummary.text}</p>
                                    </div>
                                )}
                                {activeTrust?.index === index && (
                                    <div className="mt-3 p-4 bg-green-500/10 border border-green-500/20 rounded-xl animate-pop-in flex items-start gap-4">
                                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold border-4 shrink-0 ${activeTrust.score >= 80 ? 'border-green-500 text-green-400' : activeTrust.score >= 50 ? 'border-yellow-500 text-yellow-400' : 'border-red-500 text-red-400'}`}>
                                            {activeTrust.score}
                                        </div>
                                        <div>
                                            <h4 className="text-green-300 text-xs font-bold uppercase mb-1">Trust Analysis</h4>
                                            <p className="text-sm text-zinc-200">{activeTrust.reason}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    ) : (
                        <div className="text-center py-20 text-zinc-500">
                            <p>No results found for "{query}".</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchPage;