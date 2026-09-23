import { supabase, Response } from './supabaseClient';
import { ConversationMessage } from '../types';

export async function saveResponse(
  userId: string,
  moduleId: number,
  questionKey: string,
  value: string,
  aiFeedback?: string | null
): Promise<void> {
  // Parse question key to extract type and index
  const { questionType, questionIndex } = parseQuestionKey(questionKey);

  const responseData = {
    user_id: userId,
    module_id: moduleId,
    question_key: questionKey,
    question_type: questionType,
    question_index: questionIndex,
    response_text: value,
    response_value: isRadioValue(value) ? value : null,
    ai_feedback: aiFeedback || null,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from('responses')
    .upsert(responseData, {
      onConflict: 'user_id,module_id,question_key'
    });

  if (error) {
    console.error('Failed to save response:', error);
    throw error;
  }
}

export async function getUserResponses(
  userId: string,
  moduleId: number
): Promise<Record<string, string>> {
  const { data, error } = await supabase
    .from('responses')
    .select('question_key, response_text')
    .eq('user_id', userId)
    .eq('module_id', moduleId);

  if (error) {
    console.error('Failed to fetch responses:', error);
    return {};
  }

  // Convert to Record format matching current state structure
  const record: Record<string, string> = {};
  data?.forEach(r => {
    if (r.response_text) {
      record[r.question_key] = r.response_text;
    }
  });

  return record;
}

/**
 * Get chapters read for all modules for a specific user
 * Returns a map of moduleId -> chaptersRead
 */
export async function getUserChaptersRead(
  userId: string
): Promise<Record<number, string>> {
  const { data, error } = await supabase
    .from('responses')
    .select('module_id, response_text')
    .eq('user_id', userId)
    .eq('question_key', 'chapters_read');

  if (error) {
    console.error('Failed to fetch chapters read:', error);
    return {};
  }

  const record: Record<number, string> = {};
  data?.forEach(r => {
    if (r.response_text) {
      record[r.module_id] = r.response_text;
    }
  });

  return record;
}

export async function getAggregatedResponses(
  moduleId: number,
  questionKey: string
): Promise<{ responses: string[]; stats?: Record<string, number> }> {
  const { data, error } = await supabase
    .from('responses')
    .select('response_text, response_value')
    .eq('module_id', moduleId)
    .eq('question_key', questionKey);

  if (error) {
    console.error('Failed to fetch aggregated responses:', error);
    return { responses: [] };
  }

  // Separate text responses and radio stats
  const textResponses = data
    ?.filter(r => r.response_text && !isRadioValue(r.response_text))
    .map(r => r.response_text!)
    || [];

  // Calculate stats for radio responses
  const radioValues = data?.filter(r => r.response_value) || [];
  const stats: Record<string, number> = {};

  if (radioValues.length > 0) {
    radioValues.forEach(r => {
      const val = r.response_value!;
      stats[val] = (stats[val] || 0) + 1;
    });
  }

  return {
    responses: textResponses,
    stats: Object.keys(stats).length > 0 ? stats : undefined
  };
}

// Helper functions
function parseQuestionKey(key: string): { questionType: string; questionIndex: number | null } {
  if (key.startsWith('life_question_input_')) {
    const index = parseInt(key.replace('life_question_input_', ''));
    return { questionType: 'life_question', questionIndex: index };
  }
  if (key.startsWith('discussion_')) {
    const index = parseInt(key.replace('discussion_', ''));
    return { questionType: 'discussion', questionIndex: index };
  }
  if (key === 'summary_input') {
    return { questionType: 'summary', questionIndex: null };
  }
  if (key === 'chapters_read') {
    return { questionType: 'chapters_read', questionIndex: null };
  }
  return { questionType: 'life_question', questionIndex: null }; // Default to life_question for unknown keys
}

function isRadioValue(value: string): boolean {
  return ['是', '不是', '不知道'].includes(value);
}

// Michael AI Conversation Functions

/**
 * Transform ConversationMessage from database snake_case to TypeScript camelCase
 */
function transformConversationMessage(row: any): ConversationMessage {
  return {
    id: row.id,
    role: row.role,
    message: row.message,
    audioData: row.audio_data,
    createdAt: row.created_at
  };
}

/**
 * Create a new conversation session ID
 */
export function createNewSession(): string {
  return crypto.randomUUID();
}

/**
 * Save a conversation message (user or Michael)
 */
export async function saveConversationMessage(
  userId: string,
  moduleId: number,
  sessionId: string,
  role: 'user' | 'assistant',
  message: string,
  audioData: string | null = null
): Promise<void> {
  const { error } = await supabase
    .from('ai_conversations')
    .insert({
      user_id: userId,
      module_id: moduleId,
      session_id: sessionId,
      role,
      message,
      audio_data: audioData,
    });

  if (error) {
    console.error('Failed to save conversation message:', error);
    throw error;
  }
}

/**
 * Get conversation history for a session
 */
export async function getConversationHistory(
  userId: string,
  moduleId: number,
  sessionId: string
): Promise<ConversationMessage[]> {
  const { data, error } = await supabase
    .from('ai_conversations')
    .select('*')
    .eq('user_id', userId)
    .eq('module_id', moduleId)
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch conversation history:', error);
    return [];
  }

  // Transform to camelCase
  return (data || []).map(transformConversationMessage);
}

/**
 * Get user's response summary across all modules for memory context
 */
export async function getUserModuleResponsesSummary(
  userId: string,
  currentModuleId?: number
): Promise<ModuleResponseSummary[]> {
  const { data, error } = await supabase
    .from('responses')
    .select('module_id, question_key, question_type, response_text, ai_feedback')
    .eq('user_id', userId)
    .order('module_id', { ascending: true });

  if (error) {
    console.error('Failed to fetch user module responses:', error);
    return [];
  }

  // Group responses by module
  const moduleMap = new Map<number, ModuleResponseSummary>();

  data?.forEach(response => {
    if (!moduleMap.has(response.module_id)) {
      moduleMap.set(response.module_id, {
        moduleId: response.module_id,
        lifeQuestions: [],
        discussions: [],
        summary: null
      });
    }

    const moduleSummary = moduleMap.get(response.module_id)!;

    if (response.question_type === 'life_question' && response.response_text) {
      moduleSummary.lifeQuestions.push(response.response_text);
    } else if (response.question_type === 'discussion' && response.response_text) {
      moduleSummary.discussions.push(response.response_text);
    } else if (response.question_type === 'summary' && response.response_text) {
      moduleSummary.summary = response.response_text;
    }
  });

  return Array.from(moduleMap.values());
}

export interface ModuleResponseSummary {
  moduleId: number;
  lifeQuestions: string[];
  discussions: string[];
  summary: string | null;
}
