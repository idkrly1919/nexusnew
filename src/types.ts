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
    content: string | any[];
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
  updated_at?: string;
  type?: 'chat' | 'dev';
  context?: { file: { path: string; content: string } };
  persona_id?: string | null;
}

export interface Persona {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  instructions: string;
  created_at: string;
  updated_at?: string;
  file_context?: string | null; // Keeping for legacy/text context
  file_name?: string | null;
  file_path?: string | null; // New: Path in storage
  file_type?: string | null; // New: MIME type
}

// --- Quiz Feature Types ---

export type QuestionType = 'multiple-choice' | 'short-answer' | 'fill-in-the-blank';

export interface QuizQuestion {
  question: string;
  type: QuestionType;
  options?: string[]; // For multiple-choice
  correct_answer: string; // For MC and FITB, this is the exact answer. For SA, it's the ideal answer.
}

export interface Quiz {
  topic: string;
  questions: QuizQuestion[];
}

export interface UserAnswer {
    questionIndex: number;
    answer: string;
    isCorrect?: boolean;
    score: number; // 10 for correct MC, 0-10 for AI-graded
}