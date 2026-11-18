import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

/** localStorage key holding the signed-in user and their session token. */
export const SESSION_STORAGE_KEY = 'wisdom_prism_user';

/** Session JWT issued by /api/auth/login, or null when signed out / expired. */
export function getSessionToken(): string | null {
  try {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    const token: unknown = raw ? JSON.parse(raw).token : null;
    if (typeof token !== 'string') return null;
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.exp === 'number' && payload.exp * 1000 > Date.now() ? token : null;
  } catch {
    return null;
  }
}

// Requests carry the signed-in user's session token, so database row security
// knows who is asking; signed-out requests use the public anon key.
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  accessToken: async () => getSessionToken() ?? supabaseAnonKey,
});

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
