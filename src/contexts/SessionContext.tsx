import React, { createContext, useState, useEffect, useContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../integrations/supabase/client';

interface Profile {
    onboarding_completed: boolean;
    image_model_preference?: string;
    first_name?: string;
    last_name?: string;
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
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            try {
                if (session?.user) {
                    setSession(session);
                    setUser(session.user);

                    // Fetch profile with a timeout to prevent infinite loading.
                    // This is the critical safety net.
                    const profilePromise = supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', session.user.id)
                        .single();
                    
                    const timeoutPromise = new Promise((_, reject) => 
                        setTimeout(() => reject(new Error('Profile fetch timed out after 5 seconds.')), 5000)
                    );

                    // @ts-ignore
                    const { data: profileData, error } = await Promise.race([profilePromise, timeoutPromise]);

                    if (error) {
                        // Don't throw the error, as it would crash the app.
                        // Log it and continue loading the app without profile data.
                        // The chat will still be functional.
                        console.error("Error fetching profile:", error.message);
                        setProfile(null);
                    } else {
                        setProfile(profileData);
                    }
                } else {
                    // User is logged out, clear all session data.
                    setSession(null);
                    setUser(null);
                    setProfile(null);
                }
            } catch (e: any) {
                console.error("A critical error occurred during the authentication process:", e.message);
                // Clear everything on a critical failure to prevent a broken state.
                setSession(null);
                setUser(null);
                setProfile(null);
            } finally {
                // This is the key: Only set isLoading to false after the session AND profile check is complete.
                // This guarantees that the rest of the app has the correct, fully-authenticated data before it renders.
                setIsLoading(false);
            }
        });

        return () => {
            subscription.unsubscribe();
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