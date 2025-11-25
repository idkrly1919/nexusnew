export type Role = 'user' | 'assistant' | 'system' | 'typing' | 'searching' | 'error';

export interface Message {
  id: string; // UI ID
  db_id?: string; // Database UUID
  conversation_id?: string;
  role: Role;
  text: string;
  thought?: string;
  groundingChunks?: any[];
}

export interface OpenAIMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
    name?: string;
    reasoning_details?: unknown; 
}

export type ChatHistory = OpenAIMessage[];

export type PersonalityMode = 'conversational' | 'brainrot' | 'roast-master' | 'formal' | 'academic' | 'zesty';

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
}