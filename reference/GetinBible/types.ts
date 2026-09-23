
export enum PerspectiveType {
  ORDER = 'PROVERBS',     // 箴言：理應如何
  VANITY = 'ECCLESIASTES', // 傳道書：實際常如何
  COLLAPSE = 'JOB'        // 約伯記：有時完全崩潰
}

export interface ScripturePoint {
  book: string;
  theme: string;
  description: string;
  writingPurpose?: string; // 估計寫作目的
}

export type UserRole = 'student' | 'admin';

export interface User {
  id: string;          // Supabase UUID
  name: string;
  role: UserRole;      // User role for access control
  loginTime: Date;     // Keep for backward compatibility
  createdAt?: string;  // From Supabase
  lastLogin?: string;  // From Supabase
  email?: string;
  hasPassword?: boolean;
}

export interface Module {
  id: number;
  cycleId: number;
  title: string;
  subtitle: string;
  lifeQuestions: LifeQuestion[];
  perspectives: Record<PerspectiveType, ScripturePoint>;
  tensionGuides: string[];
  tensionDocuments?: ScripturePainPointDocument[][]; // Documents per tension guide index
  discussionPrompts: string[];
  summary: string;
}

export interface Cycle {
  id: number;
  title: string;
  description: string;
}

// Database-specific types for admin CMS
export type ModuleStatus = 'draft' | 'published' | 'archived';

export type QuestionType = 'open' | 'multi_choice';

export interface LifeQuestion {
  id: string;
  moduleId: number;
  questionText: string;
  questionOrder: number;
  questionType: QuestionType;
  options?: string[]; // For multi-choice questions
  mediaUrl?: string; // Universal media/resource URL (YouTube, Vimeo, Bilibili, Google Drive, or any link)
  youtubeUrl?: string; // DEPRECATED: Use mediaUrl instead (kept for backward compatibility)
  createdAt?: string;
}

export interface PerspectiveDB {
  id: string;
  moduleId: number;
  perspectiveType: PerspectiveType;
  book: string;
  theme: string;
  description: string;
  writingPurpose?: string;
  createdAt?: string;
}

export interface DiscussionPrompt {
  id: string;
  moduleId: number;
  promptText: string;
  promptOrder: number;
  createdAt?: string;
}

export interface FullModule {
  id: number;
  cycleId: number;
  title: string;
  subtitle: string;
  lifeQuestions: LifeQuestion[]; // Array of full question objects
  perspectives: Record<PerspectiveType, ScripturePoint>;
  tensionGuides: string[];
  tensionDocuments?: ScripturePainPointDocument[][]; // Documents per tension guide index
  discussionPrompts: string[];
  summary: string;
  status: ModuleStatus;
  createdAt: string;
  updatedAt: string;
}

// Life question input for creating/updating
export interface LifeQuestionInput {
  questionText: string;
  questionType: QuestionType;
  options?: string[]; // For multi-choice questions
  mediaUrl?: string; // Universal media/resource URL (YouTube, Vimeo, Bilibili, Google Drive, or any link)
  youtubeUrl?: string; // DEPRECATED: Use mediaUrl instead (kept for backward compatibility)
}

// Input type for creating/updating modules
export interface ModuleInput {
  cycleId: number;
  title: string;
  subtitle: string;
  lifeQuestions: LifeQuestionInput[];
  perspectives: Record<PerspectiveType, ScripturePoint>;
  tensionGuides: string[];
  discussionPrompts: string[];
  summary: string;
  status?: ModuleStatus;
}

// Michael AI Conversation Types
export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  message: string;
  audioData: string | null;
  createdAt: string;
}

// ============================================================================
// CYCLE ANALYSIS TYPES
// ============================================================================

// Cycle analysis record from database
export interface CycleAnalysis {
  id: string;
  userId: string;
  cycleId: number;
  analysisText: string;
  generatedAt: string;
  regeneratedCount: number;
  studentViewed: boolean;
  studentViewedAt: string | null;
  aiModel: string;
  tokenCount: number | null;
  generationDurationMs: number | null;
  createdAt: string;
  updatedAt: string;
  // Partial analysis support
  isPartial: boolean;
  completionPercentage: number;
  modulesCompleted: number;
}

// Cycle analysis list item for student view
export interface CycleAnalysisListItem {
  cycleId: number;
  cycleTitle: string;
  analysisExists: boolean;
  analysis?: CycleAnalysis;
}

// Response with question context for analysis
export interface ResponseWithQuestion {
  questionText: string;
  questionType: 'life_question' | 'discussion' | 'summary';
  responseText: string;
  responseValue?: string | null;
  aiFeedback?: string | null;
  moduleTitle: string;
}

// Student analysis overview for admin
export interface StudentAnalysisOverview {
  userId: string;
  userName: string;
  cycle1?: CycleAnalysis;
  cycle2?: CycleAnalysis;
  cycle3?: CycleAnalysis;
  cycle4?: CycleAnalysis;
}

// Scripture Pain Point Document type for file uploads
export interface ScripturePainPointDocument {
  id: string;
  moduleId: number;
  painPointIndex: number;
  fileName: string;
  fileType: 'pdf' | 'doc' | 'docx';
  storagePath: string;
  fileSizeBytes?: number;
  publicUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Media embed types for smart media component
export type MediaPlatform = 'youtube' | 'vimeo' | 'bilibili' | 'google-drive' | 'link';

export interface MediaEmbedProps {
  url: string;
  title?: string;
}

// ============================================================================
// CONTENT ANALYSIS TYPES
// ============================================================================

export type ContentAnalysisContentType = 'youtube' | 'document' | 'image' | 'audio' | 'transcript' | 'websearch';

export type ContentAnalysisStatus = 'idle' | 'fetching' | 'analyzing' | 'completed' | 'error';

export interface ContentAnalysisResult {
  id?: string;
  contentType: ContentAnalysisContentType;
  contentTitle: string;
  sourceUrl?: string;
  originalFilename?: string;
  summary: string;
  learningAreas?: string[];
  christianityPerspectives?: string[];
  educationalPurpose?: string;
  coreTopics?: string[];
  biblicalConnections: string[];
  practicalApplications?: string[];
  webSearchSources?: string[];
  fullAnalysisMarkdown: string;
  aiModel: string;
  tokenCount?: number;
  generationDurationMs?: number;
  contentHash?: string;
  wordLimit?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface ContentAnalysisInput {
  contentType: ContentAnalysisContentType;
  content: string | File;
  title?: string;
}

export interface ContentAnalysisHistoryItem {
  id: string;
  contentType: ContentAnalysisContentType;
  contentTitle: string;
  summary: string;
  createdAt: string;
}

// Report size configuration
export type ReportWordLimit = 150 | 250 | 400 | 700 | 1000;

export interface ContentAnalysisSettings {
  wordLimit: ReportWordLimit;
  michaelEnabled?: boolean; // Enable/disable Michael AI assistant (default: true)
  updatedAt?: string;
  updatedBy?: string;
}
