import React, { createContext, useState, useEffect, useContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../integrations/supabase/client';

interface Profile {
    onboarding_completed: boolean;
    image_model_preference?: string;
    first_name?: string;
    last_name?: string;
    avatar_url?: string;
}

interface SessionContextType {
    session: Session | null;
    user: User | null;
    profile: Profile | null;
    isLoading: boolean;
    refreshProfile: () => Promise<void>;
}

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const refreshProfile = async () => {
        if (session?.user) {
            const { data: profileData, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();
            if (profileData) {
                setProfile(profileData);
            }
            if(error) {
                console.error("Error refreshing profile:", error);
            }
        }
    };

    useEffect(() => {
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            try {
                if (session?.user) {
                    setSession(session);
                    setUser(session.user);

                    try {
                        const profilePromise = supabase
                            .from('profiles')
                            .select('*')
                            .eq('id', session.user.id)
                            .single();
                        
                        const timeoutPromise = new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('Profile fetch timed out after 3 seconds.')), 3000)
                        );

                        // @ts-ignore
                        const { data: profileData, error } = await Promise.race([profilePromise, timeoutPromise]);

                        if (error) {
                            console.error("Error fetching profile:", error.message);
                            setProfile(null);
                        } else {
                            setProfile(profileData);
                        }
                    } catch (profileError: any) {
                        console.error("Caught error during profile fetch:", profileError.message);
                        setProfile(null);
                    }

                } else if (event === 'SIGNED_OUT') {
                    setSession(null);
                    setUser(null);
                    setProfile(null);
                }
            } catch (e: any) {
                console.error("A critical error occurred during the authentication process:", e.message);
                setSession(null);
                setUser(null);
                setProfile(null);
            } finally {
                setIsLoading(false);
            }
        });

        return () => {
            subscription.unsubscribe();
        };
    }, []);

    useEffect(() => {
        const handleVisibilityChange = () => {
            // This helps refresh the session if the user was away for a long time.
            // The Supabase client handles background token refreshing automatically,
            // but this ensures the session state is synced on tab focus.
            if (document.visibilityState === 'visible') {
                supabase.auth.getSession();
            }
        };
        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    return (
        <SessionContext.Provider value={{ session, user, profile, isLoading, refreshProfile }}>
            {children}
        </SessionContext.Provider>
    );
};

export const useSession = () => {
    const context = useContext(SessionContext);
    if (context === undefined) {
        throw new Error('useSession must be used within a SessionProvider');
    }
    return context;
};