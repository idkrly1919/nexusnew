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
        // Safety Net: Add a timeout to prevent infinite loading
        const loadingTimeout = setTimeout(() => {
            if (isLoading) {
                console.error("Authentication timed out after 4 seconds. Forcing logout.");
                // Force logout and stop loading
                supabase.auth.signOut(); 
                setIsLoading(false);
            }
        }, 4000);

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
            // We have a response from Supabase, so clear the safety net timeout
            clearTimeout(loadingTimeout);

            setSession(session);
            setUser(session?.user ?? null);
            
            // IMPORTANT: Stop loading the main UI as soon as we know the auth state.
            // The profile can load in the background.
            setIsLoading(false);

            if (session?.user) {
                try {
                    const { data: profileData, error } = await supabase
                        .from('profiles')
                        .select('*')
                        .eq('id', session.user.id)
                        .single();
                    
                    if (error && error.code !== 'PGRST116') {
                        console.error("Error fetching profile:", error);
                        setProfile(null);
                    } else {
                        setProfile(profileData);
                    }
                } catch (e) {
                    console.error("A critical error occurred while fetching the profile:", e);
                    setProfile(null);
                }
            } else {
                setProfile(null);
            }
        });

        return () => {
            subscription.unsubscribe();
            clearTimeout(loadingTimeout); // Clean up timeout on component unmount
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