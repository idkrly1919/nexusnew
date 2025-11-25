import React, { useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useSession } from '../contexts/SessionContext';

const SupabaseKeepAlive: React.FC = () => {
    const { user } = useSession();

    useEffect(() => {
        if (!user) return;

        // The channel name can be anything unique. Using the user's ID ensures it's specific.
        const channelName = `keep-alive:${user.id}`;
        const channel = supabase.channel(channelName);

        // The act of subscribing opens and maintains a WebSocket connection,
        // which signals to the browser that the tab is active.
        channel.subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('Supabase Realtime channel subscribed. Tab will be kept active.');
            }
        });

        // Cleanup function to remove the subscription when the component unmounts.
        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    return null; // This component renders nothing.
};

export default SupabaseKeepAlive;