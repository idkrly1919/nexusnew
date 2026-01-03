import React, { useState } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useSession } from '../contexts/SessionContext';
import DynamicBackground from './DynamicBackground';

const Onboarding: React.FC = () => {
    const { user, refreshProfile } = useSession();
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSadFace, setShowSadFace] = useState(false);
    const [formData, setFormData] = useState({
        discovery_source: '',
        image_model_preference: 'nano-banana', // Default to the recommended option
        usage_reason: ''
    });

    const handleSelect = (field: keyof typeof formData, value: string) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (step < 3) {
            setTimeout(() => setStep(s => s + 1), 300);
        }
    };

    const handleSubmit = async () => {
        setIsSubmitting(true);
        if (!user) {
            alert("Error: User not found.");
            setIsSubmitting(false);
            return;
        }
        const { error } = await supabase
            .from('profiles')
            .update({ 
                ...formData,
                onboarding_completed: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', user.id);

        if (error) {
            console.error("Error updating profile:", error);
            alert("There was an error saving your preferences. Please try again.");
            setIsSubmitting(false);
        } else {
            setStep(4); // Move to donation step
        }
    };

    const handleDonationChoice = (choseToDonate: boolean) => {
        if (choseToDonate) {
            window.open('https://gofund.me/4747854c6', '_blank');
            setStep(5);
            setTimeout(() => {
                refreshProfile();
            }, 1000);
        } else {
            setShowSadFace(true);
            setTimeout(() => {
                setStep(5);
                setTimeout(() => {
                    refreshProfile();
                }, 1000);
            }, 1500);
        }
    };

    const renderStep = () => {
        switch (step) {
            case 1:
                return (
                    <div className="space-y-6 animate-pop-in">
                        <h2 className="text-2xl font-bold text-white">How did you find out about Quillix?</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {['Social Media (X, TikTok, etc.)', 'A Friend or Colleague', 'Google Search', 'Other'].map(option => (
                                <button key={option} onClick={() => handleSelect('discovery_source', option)} className="p-4 rounded-xl bg-white/5 border border-white/10 text-left hover:bg-white/10 hover:border-white/20 transition-all duration-300">
                                    {option}
                                </button>
                            ))}
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-6 animate-pop-in">
                        <h2 className="text-2xl font-bold text-white">Choose your preferred image model:</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <button onClick={() => handleSelect('image_model_preference', 'img3')} className={`p-4 rounded-xl border text-left transition-all duration-300 ${formData.image_model_preference === 'img3' ? 'bg-indigo-500/20 border-indigo-500/50' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                                <h3 className="font-semibold">Flux (Standard)</h3>
                                <p className="text-sm text-zinc-400">Pollinations AI - Fast and reliable image generation.</p>
                            </button>
                            <button onClick={() => handleSelect('image_model_preference', 'nano-banana')} className={`p-4 rounded-xl border text-left transition-all duration-300 relative overflow-hidden ${formData.image_model_preference === 'nano-banana' ? 'bg-indigo-500/20 border-indigo-500/50' : 'bg-white/5 border-white/10 hover:bg-white/10'}`}>
                                <span className="absolute top-2 right-2 bg-indigo-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">Recommended</span>
                                <h3 className="font-semibold">Flux (Enhanced)</h3>
                                <p className="text-sm text-zinc-400">Pollinations AI - Optimized for detailed visuals.</p>
                            </button>
                        </div>
                    </div>
                );
            case 3:
                return (
                    <div className="space-y-6 animate-pop-in">
                        <h2 className="text-2xl font-bold text-white">Why do you want to use Quillix?</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {['For Fun / It\'s Cool', 'For a Personal Project', 'For Work / Business', 'To Learn About AI'].map(option => (
                                <button key={option} onClick={() => handleSelect('usage_reason', option)} className="p-4 rounded-xl bg-white/5 border border-white/10 text-left hover:bg-white/10 hover:border-white/20 transition-all duration-300">
                                    {option}
                                </button>
                            ))}
                        </div>
                        <div className="pt-4">
                            <button onClick={handleSubmit} disabled={!formData.usage_reason || isSubmitting} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-full font-medium transition-all duration-300 disabled:bg-zinc-700 disabled:cursor-not-allowed">
                                {isSubmitting ? 'Saving...' : 'Finish'}
                            </button>
                        </div>
                    </div>
                );
            case 4:
                return (
                    <div className="text-center space-y-6 animate-pop-in">
                        {showSadFace ? (
                            <div className="text-6xl animate-pop-in">: (</div>
                        ) : (
                            <>
                                <h2 className="text-3xl font-bold text-white">One last thing...</h2>
                                <p className="text-zinc-400 text-lg max-w-md mx-auto">
                                    Quillix is a free, self-funded project. A small donation helps cover server costs and keeps the AI running for everyone.
                                </p>
                                <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
                                    <button onClick={() => handleDonationChoice(false)} className="bg-white/10 hover:bg-white/20 text-white px-8 py-3 rounded-full font-medium transition-all duration-300">
                                        Maybe later
                                    </button>
                                    <button onClick={() => handleDonationChoice(true)} className="bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded-full font-medium transition-all duration-300 shadow-[0_0_20px_rgba(34,197,94,0.4)] hover:shadow-[0_0_30px_rgba(34,197,94,0.6)] interactive-lift">
                                        I'll help out!
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                );
            case 5:
                return (
                    <div className="text-center space-y-6 animate-pop-in">
                        <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto">
                            <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
                        </div>
                        <h2 className="text-3xl font-bold text-white">Setup Complete!</h2>
                        <p className="text-zinc-400 text-lg max-w-md mx-auto">
                            Your preferences have been saved. Welcome to Quillix!
                        </p>
                        <p className="text-zinc-500 text-sm flex items-center justify-center gap-2">
                            <svg className="animate-spin h-4 w-4 text-zinc-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Redirecting to chat...
                        </p>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <>
            <DynamicBackground status="idle" />
            <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4 text-white">
                <div className="w-full max-w-2xl">
                    <div className="text-center mb-12">
                        <div className="flex items-center justify-center gap-2 mb-4">
                            <img src="/quillix-logo.png" alt="Quillix Logo" className="w-10 h-10" />
                            <span className="text-3xl font-bold tracking-tight brand-font">Quillix</span>
                        </div>
                        <h1 className="text-2xl font-bold text-white">Just a few questions to get you started...</h1>
                    </div>
                    <div data-liquid-glass className="liquid-glass p-8 rounded-2xl">
                        {renderStep()}
                    </div>
                </div>
            </div>
        </>
    );
};

export default Onboarding;