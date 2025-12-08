import { supabase } from './supabase';
import { OpenAI } from 'openai';

// Initialize OpenAI client
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.EXPO_PUBLIC_API_KEY!,
  dangerouslyAllowBrowser: true,
});

// API endpoints
export const api = {
  // Auth
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  },

  signUp: async (email: string, password: string, firstName: string, lastName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
        },
      },
    });
    if (error) throw error;
    return data;
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  resetPassword: async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  },

  // Conversations
  getConversations: async (userId: string) => {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return data;
  },

  createConversation: async (userId: string, title: string, type: 'chat' | 'dev' = 'chat') => {
    const { data, error } = await supabase
      .from('conversations')
      .insert({ user_id: userId, title, type })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  deleteConversation: async (conversationId: string) => {
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);
    if (error) throw error;
  },

  // Messages
  getMessages: async (conversationId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data;
  },

  createMessage: async (conversationId: string, userId: string, role: string, content: string) => {
    const { data, error } = await supabase
      .from('messages')
      .insert({ conversation_id: conversationId, user_id: userId, role, content })
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  // AI Services
  streamGemini: async (prompt: string, history: any[], useSearch: boolean = false) => {
    // This would need to be implemented based on your backend API
    // For now, we'll use OpenAI's API as a fallback
    const response = await openai.chat.completions.create({
      model: 'x-ai/grok-4.1-fast',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        ...history,
        { role: 'user', content: prompt },
      ],
      stream: true,
    });

    return response;
  },

  // File operations
  uploadFile: async (file: File, bucket: string = 'avatars') => {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(`${Date.now()}_${file.name}`, file);
    if (error) throw error;
    return data;
  },

  getFileUrl: async (path: string, bucket: string = 'avatars') => {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data.publicUrl;
  },
};