import { supabase } from './supabaseClient';
import {
  Module,
  Cycle,
  FullModule,
  ModuleInput,
  ModuleStatus,
  PerspectiveType,
  LifeQuestion,
  PerspectiveDB,
  DiscussionPrompt,
  ScripturePoint,
  LifeQuestionInput,
  ScripturePainPointDocument
} from '../types';

/**
 * Module Service - Handles all CRUD operations for modules and cycles
 *
 * IMPORTANT: This service transforms between database snake_case and TypeScript camelCase
 * - Database uses: cycle_id, question_text, media_url, etc.
 * - TypeScript uses: cycleId, questionText, mediaUrl, etc.
 */

// ============================================================================
// CYCLES
// ============================================================================

export async function getAllCycles(): Promise<Cycle[]> {
  const { data, error } = await supabase
    .from('cycles')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    console.error('Error fetching cycles:', error);
    throw new Error('Failed to fetch cycles');
  }

  return data || [];
}

export async function getCycleById(id: number): Promise<Cycle | null> {
  const { data, error } = await supabase
    .from('cycles')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching cycle:', error);
    return null;
  }

  return data;
}

/**
 * Create a new cycle
 */
export async function createCycle(cycleData: { title: string; description: string; sort_order: number }): Promise<Cycle> {
  const { data, error } = await supabase
    .from('cycles')
    .insert(cycleData)
    .select()
    .single();

  if (error) {
    console.error('Error creating cycle:', error);
    throw new Error('Failed to create cycle');
  }

  return data;
}

/**
 * Update an existing cycle
 */
export async function updateCycle(id: number, cycleData: { title: string; description: string; sort_order: number }): Promise<Cycle> {
  const { data, error } = await supabase
    .from('cycles')
    .update(cycleData)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating cycle:', error);
    throw new Error('Failed to update cycle');
  }

  return data;
}

/**
 * Delete a cycle (will fail if it has modules)
 */
export async function deleteCycle(id: number): Promise<void> {
  const { error } = await supabase
    .from('cycles')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting cycle:', error);
    throw new Error('Failed to delete cycle. Make sure it has no associated modules.');
  }
}

// ============================================================================
// MODULES - READ OPERATIONS
// ============================================================================

/**
 * Helper function to transform database rows into Module object
 * Converts snake_case from DB to camelCase for TypeScript
 */
async function transformDBToModule(moduleRow: any): Promise<Module> {
  // Fetch related data (already transformed to camelCase)
  const [lifeQuestions, perspectives, discussionPrompts, tensionDocuments] = await Promise.all([
    fetchLifeQuestions(moduleRow.id),
    fetchPerspectives(moduleRow.id),
    fetchDiscussionPrompts(moduleRow.id),
    fetchTensionDocuments(moduleRow.id)
  ]);

  // Transform perspectives array to Record
  const perspectivesRecord: Record<PerspectiveType, ScripturePoint> = {
    [PerspectiveType.ORDER]: {
      book: '',
      theme: '',
      description: ''
    },
    [PerspectiveType.VANITY]: {
      book: '',
      theme: '',
      description: ''
    },
    [PerspectiveType.COLLAPSE]: {
      book: '',
      theme: '',
      description: ''
    }
  };

  perspectives.forEach(p => {
    perspectivesRecord[p.perspectiveType as PerspectiveType] = {
      book: p.book,
      theme: p.theme,
      description: p.description,
      writingPurpose: p.writingPurpose || undefined
    };
  });

  // Parse tensionGuides - handle both old string format and new JSON array format
  let tensionGuides: string[] = [];
  if (moduleRow.tension_guide) {
    try {
      const parsed = JSON.parse(moduleRow.tension_guide);
      tensionGuides = Array.isArray(parsed) ? parsed : [moduleRow.tension_guide];
    } catch {
      // Old format: single string - convert to array
      tensionGuides = [moduleRow.tension_guide];
    }
  }

  return {
    id: moduleRow.id,
    cycleId: moduleRow.cycle_id,
    title: moduleRow.title,
    subtitle: moduleRow.subtitle,
    lifeQuestions: lifeQuestions,
    perspectives: perspectivesRecord,
    tensionGuides: tensionGuides,
    tensionDocuments: tensionDocuments.length > 0 ? tensionDocuments : undefined,
    discussionPrompts: discussionPrompts.map(p => p.promptText),
    summary: moduleRow.summary || '' // Convert NULL to empty string
  };
}

/**
 * Fetch all modules (admin view - includes all statuses)
 */
export async function getAllModules(): Promise<FullModule[]> {
  const { data, error } = await supabase
    .from('modules')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    console.error('Error fetching modules:', error);
    throw new Error('Failed to fetch modules');
  }

  const modules = await Promise.all(
    (data || []).map(async (row) => {
      const baseModule = await transformDBToModule(row);
      return {
        ...baseModule,
        status: row.status as ModuleStatus,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      } as FullModule;
    })
  );

  return modules;
}

/**
 * Fetch only published modules (student view)
 */
export async function getPublishedModules(): Promise<Module[]> {
  const { data, error } = await supabase
    .from('modules')
    .select('*')
    .eq('status', 'published')
    .order('id', { ascending: true });

  if (error) {
    console.error('Error fetching published modules:', error);
    throw new Error('Failed to fetch published modules');
  }

  console.log('🔍 Database query returned rows:', data?.length || 0);
  console.log('🔍 Module IDs from database:', data?.map(row => `Module ${row.id} (${row.title})`));

  const modules = await Promise.all(
    (data || []).map(async (row) => {
      try {
        const transformed = await transformDBToModule(row);
        console.log(`✅ Successfully transformed Module ${row.id}`);
        return transformed;
      } catch (err) {
        console.error(`❌ Failed to transform Module ${row.id}:`, err);
        throw err; // Re-throw to see the error
      }
    })
  );

  console.log('🔍 Final modules array length:', modules.length);
  return modules;
}

/**
 * Fetch a single module by ID
 */
export async function getModuleById(id: number): Promise<FullModule | null> {
  const { data, error } = await supabase
    .from('modules')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching module:', error);
    return null;
  }

  if (!data) return null;

  const baseModule = await transformDBToModule(data);
  return {
    ...baseModule,
    status: data.status as ModuleStatus,
    createdAt: data.created_at,
    updatedAt: data.updated_at
  } as FullModule;
}

/**
 * Fetch modules by cycle
 */
export async function getModulesByCycle(cycleId: number): Promise<Module[]> {
  const { data, error } = await supabase
    .from('modules')
    .select('*')
    .eq('cycle_id', cycleId)
    .eq('status', 'published')
    .order('id', { ascending: true });

  if (error) {
    console.error('Error fetching modules by cycle:', error);
    throw new Error('Failed to fetch modules by cycle');
  }

  const modules = await Promise.all(
    (data || []).map(row => transformDBToModule(row))
  );

  return modules;
}

// ============================================================================
// MODULES - CREATE/UPDATE OPERATIONS
// ============================================================================

/**
 * Create a new module with all related data
 */
export async function createModule(moduleData: ModuleInput): Promise<FullModule> {
  // 1. Insert module (convert camelCase to snake_case for DB)
  const { data: moduleRow, error: moduleError } = await supabase
    .from('modules')
    .insert({
      cycle_id: moduleData.cycleId,
      title: moduleData.title,
      subtitle: moduleData.subtitle,
      tension_guide: JSON.stringify(moduleData.tensionGuides || []),
      summary: moduleData.summary,
      status: moduleData.status || 'draft'
    })
    .select()
    .single();

  if (moduleError || !moduleRow) {
    console.error('Error creating module:', moduleError);
    throw new Error('Failed to create module');
  }

  const moduleId = moduleRow.id;

  try {
    // 2. Insert life questions
    await insertLifeQuestions(moduleId, moduleData.lifeQuestions);

    // 3. Insert perspectives
    await insertPerspectives(moduleId, moduleData.perspectives);

    // 4. Insert discussion prompts
    await insertDiscussionPrompts(moduleId, moduleData.discussionPrompts);

    // 5. Fetch and return the complete module
    const newModule = await getModuleById(moduleId);
    if (!newModule) {
      throw new Error('Failed to fetch created module');
    }

    return newModule;
  } catch (error) {
    // Rollback: delete the module if related inserts failed
    await supabase.from('modules').delete().eq('id', moduleId);
    throw error;
  }
}

/**
 * Update an existing module with all related data
 */
export async function updateModule(id: number, moduleData: ModuleInput): Promise<FullModule> {
  // 1. Update module (convert camelCase to snake_case for DB)
  const { error: moduleError } = await supabase
    .from('modules')
    .update({
      cycle_id: moduleData.cycleId,
      title: moduleData.title,
      subtitle: moduleData.subtitle,
      tension_guide: JSON.stringify(moduleData.tensionGuides || []),
      summary: moduleData.summary,
      status: moduleData.status || 'draft'
    })
    .eq('id', id);

  if (moduleError) {
    console.error('Error updating module:', moduleError);
    throw new Error('Failed to update module');
  }

  // 2. Delete and re-insert life questions
  await supabase.from('life_questions').delete().eq('module_id', id);
  await insertLifeQuestions(id, moduleData.lifeQuestions);

  // 3. Delete and re-insert perspectives
  await supabase.from('perspectives').delete().eq('module_id', id);
  await insertPerspectives(id, moduleData.perspectives);

  // 4. Delete and re-insert discussion prompts
  await supabase.from('discussion_prompts').delete().eq('module_id', id);
  await insertDiscussionPrompts(id, moduleData.discussionPrompts);

  // 5. Fetch and return the updated module
  const updatedModule = await getModuleById(id);
  if (!updatedModule) {
    throw new Error('Failed to fetch updated module');
  }

  return updatedModule;
}

/**
 * Delete a module (cascade deletes all related data)
 */
export async function deleteModule(id: number): Promise<void> {
  const { error } = await supabase
    .from('modules')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting module:', error);
    throw new Error('Failed to delete module');
  }
}

/**
 * Update module status (publish/archive/draft)
 */
export async function updateModuleStatus(id: number, status: ModuleStatus): Promise<void> {
  const { error } = await supabase
    .from('modules')
    .update({ status })
    .eq('id', id);

  if (error) {
    console.error('Error updating module status:', error);
    throw new Error('Failed to update module status');
  }
}

// ============================================================================
// HELPER FUNCTIONS - FETCH RELATED DATA (DB snake_case → TS camelCase)
// ============================================================================

async function fetchLifeQuestions(moduleId: number): Promise<LifeQuestion[]> {
  const { data, error } = await supabase
    .from('life_questions')
    .select('*')
    .eq('module_id', moduleId)
    .order('question_order', { ascending: true });

  if (error) {
    console.error('Error fetching life questions:', error);
    return [];
  }

  // Transform snake_case to camelCase and handle JSONB parsing
  return (data || []).map(q => {
    let parsedOptions = q.options;

    // If options exists and is a string, parse it
    if (parsedOptions && typeof parsedOptions === 'string') {
      try {
        parsedOptions = JSON.parse(parsedOptions);
      } catch (e) {
        console.error('Failed to parse question options:', e);
        parsedOptions = undefined;
      }
    }

    return {
      id: q.id,
      moduleId: q.module_id,
      questionText: q.question_text,
      questionOrder: q.question_order,
      questionType: q.question_type || 'open',
      options: parsedOptions || undefined,
      mediaUrl: q.media_url || q.youtube_url, // Prefer media_url, fallback to youtube_url
      youtubeUrl: q.youtube_url, // DEPRECATED: Keep for backward compatibility
      createdAt: q.created_at
    };
  });
}

async function fetchPerspectives(moduleId: number): Promise<PerspectiveDB[]> {
  const { data, error } = await supabase
    .from('perspectives')
    .select('*')
    .eq('module_id', moduleId);

  if (error) {
    console.error('Error fetching perspectives:', error);
    return [];
  }

  // Transform snake_case to camelCase
  return (data || []).map(p => ({
    id: p.id,
    moduleId: p.module_id,
    perspectiveType: p.perspective_type,
    book: p.book,
    theme: p.theme,
    description: p.description,
    writingPurpose: p.writing_purpose || undefined,
    createdAt: p.created_at
  }));
}

async function fetchDiscussionPrompts(moduleId: number): Promise<DiscussionPrompt[]> {
  const { data, error } = await supabase
    .from('discussion_prompts')
    .select('*')
    .eq('module_id', moduleId)
    .order('prompt_order', { ascending: true });

  if (error) {
    console.error('Error fetching discussion prompts:', error);
    return [];
  }

  // Transform snake_case to camelCase
  return (data || []).map(p => ({
    id: p.id,
    moduleId: p.module_id,
    promptText: p.prompt_text,
    promptOrder: p.prompt_order,
    createdAt: p.created_at
  }));
}

// ============================================================================
// HELPER FUNCTIONS - INSERT RELATED DATA (TS camelCase → DB snake_case)
// ============================================================================

async function insertLifeQuestions(moduleId: number, questions: LifeQuestionInput[]): Promise<void> {
  if (questions.length === 0) return;

  // Convert camelCase to snake_case for DB
  const rows = questions.map((q, index) => ({
    module_id: moduleId,
    question_text: q.questionText,
    question_order: index,
    question_type: q.questionType || 'open',
    // Stringify for JSONB field - supabase-js expects string for JSONB
    options: q.options ? JSON.stringify(q.options) : null,
    media_url: q.mediaUrl || q.youtubeUrl || null, // Primary field
    youtube_url: q.mediaUrl || q.youtubeUrl || null // DEPRECATED: Keep synced for backward compatibility
  }));

  const { error } = await supabase
    .from('life_questions')
    .insert(rows);

  if (error) {
    console.error('Error inserting life questions:', error);
    throw new Error('Failed to insert life questions');
  }
}

async function insertPerspectives(
  moduleId: number,
  perspectives: Record<PerspectiveType, ScripturePoint>
): Promise<void> {
  // Convert to snake_case for DB
  const rows = Object.entries(perspectives).map(([type, point]) => ({
    module_id: moduleId,
    perspective_type: type,
    book: point.book,
    theme: point.theme,
    description: point.description,
    writing_purpose: point.writingPurpose || null
  }));

  const { error } = await supabase
    .from('perspectives')
    .insert(rows);

  if (error) {
    console.error('Error inserting perspectives:', error);
    throw new Error('Failed to insert perspectives');
  }
}

async function insertDiscussionPrompts(moduleId: number, prompts: string[]): Promise<void> {
  if (prompts.length === 0) return;

  // Convert to snake_case for DB
  const rows = prompts.map((text, index) => ({
    module_id: moduleId,
    prompt_text: text,
    prompt_order: index
  }));

  const { error } = await supabase
    .from('discussion_prompts')
    .insert(rows);

  if (error) {
    console.error('Error inserting discussion prompts:', error);
    throw new Error('Failed to insert discussion prompts');
  }
}

/**
 * Fetch tension documents for a module, grouped by pain point index
 */
async function fetchTensionDocuments(moduleId: number): Promise<ScripturePainPointDocument[][]> {
  const { data, error } = await supabase
    .from('scripture_pain_point_documents')
    .select('*')
    .eq('module_id', moduleId)
    .order('pain_point_index', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    // Table might not exist yet, return empty array
    console.warn('Could not fetch tension documents:', error.message);
    return [];
  }

  if (!data || data.length === 0) return [];

  // Get Supabase storage URL
  const { data: { publicUrl: baseUrl } } = supabase.storage
    .from('scripture-documents')
    .getPublicUrl('');

  // Group documents by pain_point_index
  const grouped: Record<number, ScripturePainPointDocument[]> = {};

  for (const doc of data) {
    const index = doc.pain_point_index;
    if (!grouped[index]) {
      grouped[index] = [];
    }

    grouped[index].push({
      id: doc.id,
      moduleId: doc.module_id,
      painPointIndex: doc.pain_point_index,
      fileName: doc.file_name,
      fileType: doc.file_type,
      storagePath: doc.storage_path,
      fileSizeBytes: doc.file_size_bytes,
      publicUrl: `${baseUrl}${doc.storage_path}`,
      createdAt: doc.created_at,
      updatedAt: doc.updated_at
    });
  }

  // Convert to array indexed by pain_point_index
  const maxIndex = Math.max(...Object.keys(grouped).map(Number), -1);
  const result: ScripturePainPointDocument[][] = [];

  for (let i = 0; i <= maxIndex; i++) {
    result[i] = grouped[i] || [];
  }

  return result;
}
