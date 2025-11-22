import React from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '../integrations/supabase/client';

const LoginPage: React.FC = () => {
    return (
        <div className="relative z-10 flex flex-col items-center justify-center min-h-screen">
            <div className="w-full max-w-md p-8 space-y-8">
                <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 20h20"></path><path d="m12 10 4 10"></path><path d="m12 10-4 10"></path><circle cx="12" cy="5" r="3"></circle></svg>
                        </div>
                        <span className="text-3xl font-bold tracking-tight brand-font">Nexus</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white">Welcome to Nexus</h1>
                    <p className="text-zinc-400">Sign in or create an account to continue</p>
                </div>
                <div className="glass-panel p-8 rounded-2xl">
                     <Auth
                        supabaseClient={supabase}
                        appearance={{ 
                            theme: ThemeSupa,
                            variables: {
                                default: {
                                    colors: {
                                        brand: '#4f46e5',
                                        brandAccent: '#4338ca',
                                        defaultButtonBackground: '#18181b',
                                        defaultButtonBackgroundHover: '#27272a',
                                        inputBackground: '#27272a',
                                        inputBorder: '#3f3f46',
                                        inputBorderHover: '#a78bfa',
                                        inputText: 'white',
                                        messageText: '#a1a1aa',
                                        anchorTextColor: '#a78bfa',
                                    },
                                    radii: {
                                        borderRadiusButton: '0.5rem',
                                        inputBorderRadius: '0.5rem',
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