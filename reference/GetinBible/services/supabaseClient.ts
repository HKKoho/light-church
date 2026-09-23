import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types matching database schema
export interface User {
  id: string;
  name: string;
  created_at: string;
  last_login: string;
}

export interface UserProgress {
  id: string;
  user_id: string;
  module_id: number;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Response {
  id: string;
  user_id: string;
  module_id: number;
  question_key: string;
  question_type: 'life_question' | 'discussion' | 'summary';
  question_index: number | null;
  response_text: string | null;
  response_value: string | null;
  ai_feedback: string | null;
  created_at: string;
  updated_at: string;
}
