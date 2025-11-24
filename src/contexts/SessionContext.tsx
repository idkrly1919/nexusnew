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
        // This subscription is the single source of truth for authentication state.
        // It fires once on initial load with the session from localStorage, and again whenever the auth state changes.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            try {
                setSession(session);
                setUser(session?.user ?? null);

                if (session?.user) {
                    // If a session exists, we MUST fetch the profile before we consider loading complete.
                    const { data: profileData, error } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', session.user.id)
                        .single();
                    
                    if (error && error.code !== 'PGRST116') { // PGRST116 means no row was found, which is not a critical error.
                        console.error("Error fetching profile:", error);
                        setProfile(null);
                    } else {
                        setProfile(profileData);
                    }
                } else {
                    // No session, so no profile.
                    setProfile(null);
                }
            } catch (e) {
                console.error("A critical error occurred in onAuthStateChange:", e);
                setProfile(null); // Clear profile on error to prevent inconsistent state.
            } finally {
                // This is the key: only set isLoading to false after the session AND profile check is complete.
                // This guarantees that the rest of the app has the correct data before it renders.
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