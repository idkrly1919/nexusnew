export type Role = 'user' | 'assistant' | 'system';

export interface Message {
  id: string;
  conversation_id?: string;
  role: Role;
  content: string;
  created_at?: string;
}

export interface Conversation {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at?: string;
  type?: 'chat' | 'dev';
  context?: any;
}

export interface User {
  id: string;
  email: string;
  user_metadata: {
    first_name?: string;
    last_name?: string;
  };
}

export interface QuizQuestion {
  question: string;
  type: 'multiple-choice' | 'short-answer' | 'fill-in-the-blank';
  options?: string[];
  correct_answer: string;
}

export interface Quiz {
  topic: string;
  questions: QuizQuestion[];
}