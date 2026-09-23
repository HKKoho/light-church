import { supabase } from './supabaseClient';
import { ContentAnalysisSettings, ReportWordLimit } from '../types';

const SETTINGS_KEY = 'content_analysis_settings';
const DEFAULT_WORD_LIMIT: ReportWordLimit = 250;

// Get settings from localStorage (fallback) or Supabase
export async function getContentAnalysisSettings(): Promise<ContentAnalysisSettings> {
  try {
    // Try to get from Supabase first
    const { data, error } = await supabase
      .from('app_settings')
      .select('value')
      .eq('key', SETTINGS_KEY)
      .single();

    if (!error && data?.value) {
      const settings = data.value as ContentAnalysisSettings;
      // Cache locally
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      return settings;
    }
  } catch (e) {
    console.error('Error fetching settings from Supabase:', e);
  }

  // Fallback to localStorage
  try {
    const cached = localStorage.getItem(SETTINGS_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    console.error('Error reading settings from localStorage:', e);
  }

  // Return default
  return { wordLimit: DEFAULT_WORD_LIMIT, michaelEnabled: true };
}

// Get settings synchronously from localStorage only (for immediate use)
export function getContentAnalysisSettingsSync(): ContentAnalysisSettings {
  try {
    const cached = localStorage.getItem(SETTINGS_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    console.error('Error reading settings from localStorage:', e);
  }
  return { wordLimit: DEFAULT_WORD_LIMIT, michaelEnabled: true };
}

// Save settings to both localStorage and Supabase
export async function saveContentAnalysisSettings(
  settings: ContentAnalysisSettings,
  userId?: string
): Promise<boolean> {
  const updatedSettings: ContentAnalysisSettings = {
    ...settings,
    updatedAt: new Date().toISOString(),
    updatedBy: userId,
  };

  // Save to localStorage immediately
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(updatedSettings));
  } catch (e) {
    console.error('Error saving settings to localStorage:', e);
  }

  // Save to Supabase
  try {
    const { error } = await supabase
      .from('app_settings')
      .upsert({
        key: SETTINGS_KEY,
        value: updatedSettings,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'key',
      });

    if (error) {
      console.error('Error saving settings to Supabase:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Error saving settings:', e);
    return false;
  }
}

// Get the appropriate max tokens based on word limit
export function getMaxTokensForWordLimit(wordLimit: ReportWordLimit): number {
  // Chinese characters are roughly 1.5-2 tokens each
  // Add buffer for markdown formatting
  const tokenMultiplier = 2.5;
  return Math.round(wordLimit * tokenMultiplier);
}
