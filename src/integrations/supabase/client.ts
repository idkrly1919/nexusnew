import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://tlkwgszwzsplpuiacaet.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsa3dnc3p3enNwbHB1aWFjYWV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4ODc0MTUsImV4cCI6MjA3OTQ2MzQxNX0.KInbSGLK7YzMbGceIAIsdtDcybK5EnKIkjG005BOv-0";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

// Explicitly configure the client to use localStorage for session persistence.
// This ensures the user remains logged in across browser sessions.
export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});