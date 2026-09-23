import { supabase } from './supabaseClient';
import {
  ContentAnalysisResult,
  ContentAnalysisContentType,
  ContentAnalysisHistoryItem
} from '../types';
import { analyzeEducationalContent, searchWebContent } from './geminiService';

const CACHE_KEY = 'content_analysis_cache';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_CACHE_ENTRIES = 20;

interface CacheEntry {
  result: ContentAnalysisResult;
  timestamp: number;
}

interface LocalCache {
  entries: Record<string, CacheEntry>;
}

// Generate a simple hash for content deduplication
async function generateContentHash(content: string | File): Promise<string> {
  let text: string;
  if (content instanceof File) {
    text = `${content.name}:${content.size}:${content.lastModified}`;
  } else {
    text = content.slice(0, 1000); // Use first 1000 chars for hash
  }

  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Local storage cache functions
function getLocalCache(): LocalCache {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
  } catch (e) {
    console.error('Error reading cache:', e);
  }
  return { entries: {} };
}

function setLocalCache(cache: LocalCache): void {
  try {
    // Prune old entries if over limit
    const entries = Object.entries(cache.entries);
    if (entries.length > MAX_CACHE_ENTRIES) {
      const sorted = entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
      cache.entries = Object.fromEntries(sorted.slice(0, MAX_CACHE_ENTRIES));
    }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch (e) {
    console.error('Error writing cache:', e);
  }
}

function getCachedResult(hash: string): ContentAnalysisResult | null {
  const cache = getLocalCache();
  const entry = cache.entries[hash];

  if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
    return entry.result;
  }

  return null;
}

function setCachedResult(hash: string, result: ContentAnalysisResult): void {
  const cache = getLocalCache();
  cache.entries[hash] = {
    result,
    timestamp: Date.now(),
  };
  setLocalCache(cache);
}

// Extract YouTube video ID from URL
export function extractYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }

  return null;
}

// Fetch YouTube transcript using a proxy service
async function fetchYouTubeTranscript(videoId: string): Promise<string> {
  // Try to get transcript from YouTube's timedtext API via a CORS proxy
  // In production, this should be done via a backend service
  try {
    // Use a simple approach: return a message indicating we need server-side support
    // For now, we'll analyze based on the video URL metadata
    throw new Error('YouTube transcript fetching requires server-side implementation');
  } catch (error) {
    console.error('Failed to fetch YouTube transcript:', error);
    throw new Error('無法獲取 YouTube 字幕。請嘗試手動輸入內容摘要。');
  }
}

// Convert File to base64 for Gemini multimodal
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data URL prefix (data:mime/type;base64,)
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Main analysis function
export async function analyzeContent(
  contentType: ContentAnalysisContentType,
  content: string | File,
  title?: string,
  userId?: string,
  wordLimit?: number
): Promise<ContentAnalysisResult> {
  const startTime = Date.now();

  // Generate content hash for caching
  const contentHash = await generateContentHash(content);

  // Check local cache first
  const cachedResult = getCachedResult(contentHash);
  if (cachedResult) {
    console.log('Returning cached analysis result');
    return cachedResult;
  }

  // Check Supabase cache if user is logged in
  if (userId) {
    const { data: existingAnalysis } = await supabase
      .from('content_analyses')
      .select('*')
      .eq('content_hash', contentHash)
      .single();

    if (existingAnalysis) {
      const result: ContentAnalysisResult = {
        id: existingAnalysis.id,
        contentType: existingAnalysis.content_type,
        contentTitle: existingAnalysis.content_title || title || '',
        sourceUrl: existingAnalysis.source_url,
        originalFilename: existingAnalysis.original_filename,
        summary: existingAnalysis.summary,
        educationalPurpose: existingAnalysis.educational_purpose,
        coreTopics: existingAnalysis.core_topics || [],
        biblicalConnections: existingAnalysis.biblical_connections || [],
        practicalApplications: existingAnalysis.practical_applications || [],
        fullAnalysisMarkdown: existingAnalysis.full_analysis_markdown,
        aiModel: existingAnalysis.ai_model,
        tokenCount: existingAnalysis.token_count,
        generationDurationMs: existingAnalysis.generation_duration_ms,
        contentHash: existingAnalysis.content_hash,
        createdAt: existingAnalysis.created_at,
        updatedAt: existingAnalysis.updated_at,
      };

      // Cache locally
      setCachedResult(contentHash, result);
      return result;
    }
  }

  // Prepare content for analysis
  let contentForAnalysis: string;
  let sourceUrl: string | undefined;
  let originalFilename: string | undefined;
  let mimeType: string | undefined;
  let base64Data: string | undefined;
  let webSearchSources: string[] = [];

  if (typeof content === 'string') {
    // Handle URL or text input
    if (contentType === 'youtube') {
      const videoId = extractYouTubeVideoId(content);
      if (!videoId) {
        throw new Error('無效的 YouTube 連結');
      }
      sourceUrl = content;
      // For YouTube, we'll pass the URL for Gemini to analyze
      contentForAnalysis = `YouTube Video URL: ${content}`;
    } else if (contentType === 'websearch') {
      // Perform web search first
      const searchResult = await searchWebContent(content);
      contentForAnalysis = searchResult.content;
      webSearchSources = searchResult.sources;
    } else if (contentType === 'transcript') {
      contentForAnalysis = content;
    } else {
      contentForAnalysis = content;
      sourceUrl = content;
    }
  } else {
    // Handle file upload
    originalFilename = content.name;
    mimeType = content.type;
    base64Data = await fileToBase64(content);
    contentForAnalysis = `File: ${content.name}`;
  }

  // Call Gemini for analysis
  const analysisResult = await analyzeEducationalContent(
    contentType,
    contentForAnalysis,
    title || originalFilename || 'Untitled',
    base64Data,
    mimeType,
    wordLimit
  );

  const generationDurationMs = Date.now() - startTime;

  const result: ContentAnalysisResult = {
    contentType,
    contentTitle: title || originalFilename || extractTitleFromContent(contentType, content),
    sourceUrl,
    originalFilename,
    summary: analysisResult.summary,
    educationalPurpose: analysisResult.educationalPurpose,
    coreTopics: analysisResult.coreTopics,
    biblicalConnections: analysisResult.biblicalConnections,
    practicalApplications: analysisResult.practicalApplications,
    webSearchSources: webSearchSources.length > 0 ? webSearchSources : undefined,
    fullAnalysisMarkdown: analysisResult.fullAnalysisMarkdown,
    aiModel: 'gemini-2.5-flash',
    tokenCount: analysisResult.tokenCount,
    generationDurationMs,
    contentHash,
    createdAt: new Date().toISOString(),
  };

  // Save to Supabase if user is logged in
  if (userId) {
    const { data: savedAnalysis, error } = await supabase
      .from('content_analyses')
      .insert({
        user_id: userId,
        content_type: contentType,
        content_title: result.contentTitle,
        source_url: sourceUrl,
        original_filename: originalFilename,
        summary: result.summary,
        educational_purpose: result.educationalPurpose,
        core_topics: result.coreTopics,
        biblical_connections: result.biblicalConnections,
        practical_applications: result.practicalApplications,
        full_analysis_markdown: result.fullAnalysisMarkdown,
        ai_model: result.aiModel,
        token_count: result.tokenCount,
        generation_duration_ms: generationDurationMs,
        content_hash: contentHash,
      })
      .select()
      .single();

    if (!error && savedAnalysis) {
      result.id = savedAnalysis.id;
    }
  }

  // Cache locally
  setCachedResult(contentHash, result);

  return result;
}

function extractTitleFromContent(
  contentType: ContentAnalysisContentType,
  content: string | File
): string {
  if (typeof content === 'string') {
    if (contentType === 'youtube') {
      return 'YouTube 影片';
    }
    return content.slice(0, 50) + (content.length > 50 ? '...' : '');
  }
  return content.name;
}

// Get analysis history for a user
export async function getAnalysisHistory(userId: string): Promise<ContentAnalysisHistoryItem[]> {
  const { data, error } = await supabase
    .from('content_analyses')
    .select('id, content_type, content_title, summary, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error('Error fetching analysis history:', error);
    return [];
  }

  return (data || []).map(item => ({
    id: item.id,
    contentType: item.content_type as ContentAnalysisContentType,
    contentTitle: item.content_title || 'Untitled',
    summary: item.summary || '',
    createdAt: item.created_at,
  }));
}

// Get a single analysis by ID
export async function getAnalysisById(id: string): Promise<ContentAnalysisResult | null> {
  const { data, error } = await supabase
    .from('content_analyses')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) {
    console.error('Error fetching analysis:', error);
    return null;
  }

  return {
    id: data.id,
    contentType: data.content_type,
    contentTitle: data.content_title || '',
    sourceUrl: data.source_url,
    originalFilename: data.original_filename,
    summary: data.summary,
    educationalPurpose: data.educational_purpose,
    coreTopics: data.core_topics || [],
    biblicalConnections: data.biblical_connections || [],
    practicalApplications: data.practical_applications || [],
    fullAnalysisMarkdown: data.full_analysis_markdown,
    aiModel: data.ai_model,
    tokenCount: data.token_count,
    generationDurationMs: data.generation_duration_ms,
    contentHash: data.content_hash,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

// Delete an analysis
export async function deleteAnalysis(id: string): Promise<boolean> {
  const { error } = await supabase
    .from('content_analyses')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting analysis:', error);
    return false;
  }

  return true;
}
