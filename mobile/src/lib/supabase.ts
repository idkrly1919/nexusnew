import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = "https://tlkwgszwzsplpuiacaet.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRsa3dnc3p3enNwbHB1aWFjYWV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4ODc0MTUsImV4cCI6MjA3OTQ2MzQxNX0.KInbSGLK7YzMbGceIAIsdtDcybK5EnKIkjG005BOv-0";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});