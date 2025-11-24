import React from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../integrations/supabase/client';

const LoginPage: React.FC = () => {
    return (
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-4">
            <div className="w-full max-w-md space-y-8">
                <div className="text-center animate-pop-in">
                    <div className="flex items-center justify-center gap-2 mb-4 interactive-lift cursor-pointer">
                        <img src="/nexus-logo.png" alt="Nexus Logo" className="w-10 h-10 animate-spin-slow" />
                        <span className="text-3xl font-bold tracking-tight brand-font">Nexus</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white">Welcome to Nexus</h1>
                    <p className="text-zinc-400">Sign in to enter the fluid workspace</p>
                </div>
                <div data-liquid-glass className="liquid-glass p-8 rounded-2xl animate-pop-in" style={{ animationDelay: '100ms' }}>
                     <Auth
                        supabaseClient={supabase}
                        appearance={{ 
                            theme: ThemeSupa,
                            variables: {
                                default: {
                                    colors: {
                                        brand: '#818cf8',
                                        brandAccent: '#6366f1',
                                        defaultButtonBackground: 'rgba(255, 255, 255, 0.05)',
                                        defaultButtonBackgroundHover: 'rgba(255, 255, 255, 0.1)',
                                        inputBackground: 'rgba(0, 0, 0, 0.2)',
                                        inputBorder: 'rgba(255, 255, 255, 0.1)',
                                        inputBorderHover: '#a78bfa',
                                        inputText: 'white',
                                        messageText: '#a1a1aa',
                                        anchorTextColor: '#a78bfa',
                                        anchorTextHoverColor: '#c4b5fd',
                                    },
                                    radii: {
                                        borderRadiusButton: '9999px',
                                        inputBorderRadius: '9999px',
                                    }
                                }
                            }
                        }}
                        providers={[]}
                        theme="dark"
                     />
                </div>
            </div>
        </div>
    );
};

export default LoginPage;