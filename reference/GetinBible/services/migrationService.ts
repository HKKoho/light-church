import { supabase } from './supabaseClient';
import { MODULES, CYCLES } from '../constants';
import { PerspectiveType } from '../types';

/**
 * Migration Service - One-time data migration from constants.ts to Supabase
 *
 * This service migrates all hardcoded module and cycle data to the database.
 * Run this ONCE after creating the database schema.
 */

export interface MigrationReport {
  success: boolean;
  cyclesMigrated: number;
  modulesMigrated: number;
  errors: string[];
}

export interface ExistingDataCheck {
  hasData: boolean;
  modulesCount: number;
  cyclesCount: number;
  lifeQuestionsCount: number;
  perspectivesCount: number;
  discussionPromptsCount: number;
  lastModified?: string;
  warnings: string[];
}

/**
 * Check if database already has data that would be overwritten
 * SAFETY CHECK: Prevents accidental data loss
 */
export async function checkExistingData(): Promise<ExistingDataCheck> {
  const warnings: string[] = [];

  try {
    // Check modules
    const { data: modules, error: modulesError } = await supabase
      .from('modules')
      .select('id, updated_at')
      .order('updated_at', { ascending: false })
      .limit(1);

    if (modulesError) throw modulesError;

    const modulesCount = modules?.length || 0;
    const lastModified = modules?.[0]?.updated_at;

    // Check cycles
    const { count: cyclesCount } = await supabase
      .from('cycles')
      .select('*', { count: 'exact', head: true });

    // Check life questions
    const { count: lifeQuestionsCount } = await supabase
      .from('life_questions')
      .select('*', { count: 'exact', head: true });

    // Check perspectives
    const { count: perspectivesCount } = await supabase
      .from('perspectives')
      .select('*', { count: 'exact', head: true });

    // Check discussion prompts
    const { count: discussionPromptsCount } = await supabase
      .from('discussion_prompts')
      .select('*', { count: 'exact', head: true });

    const hasData = (modulesCount || 0) > 0 ||
                    (cyclesCount || 0) > 0 ||
                    (lifeQuestionsCount || 0) > 0;

    // Generate warnings if data exists
    if (hasData) {
      warnings.push('⚠️ 數據庫中已存在內容！');
      warnings.push('⚠️ WARNING: Database already contains data!');

      if ((modulesCount || 0) > 0) {
        warnings.push(`發現 ${modulesCount} 個月課 / Found ${modulesCount} modules`);
      }
      if ((lifeQuestionsCount || 0) > 0) {
        warnings.push(`發現 ${lifeQuestionsCount} 個人生問題 / Found ${lifeQuestionsCount} life questions`);
      }
      if ((perspectivesCount || 0) > 0) {
        warnings.push(`發現 ${perspectivesCount} 個觀點 / Found ${perspectivesCount} perspectives`);
      }
      if ((discussionPromptsCount || 0) > 0) {
        warnings.push(`發現 ${discussionPromptsCount} 個討論提示 / Found ${discussionPromptsCount} discussion prompts`);
      }

      if (lastModified) {
        const modifiedDate = new Date(lastModified).toLocaleString('zh-TW');
        warnings.push(`最後編輯時間：${modifiedDate} / Last modified: ${modifiedDate}`);
      }

      warnings.push('🚨 執行遷移將會刪除所有現有內容！');
      warnings.push('🚨 Running migration will DELETE all existing content!');
    }

    return {
      hasData,
      modulesCount: modulesCount || 0,
      cyclesCount: cyclesCount || 0,
      lifeQuestionsCount: lifeQuestionsCount || 0,
      perspectivesCount: perspectivesCount || 0,
      discussionPromptsCount: discussionPromptsCount || 0,
      lastModified,
      warnings
    };

  } catch (error: any) {
    console.error('Error checking existing data:', error);
    return {
      hasData: false,
      modulesCount: 0,
      cyclesCount: 0,
      lifeQuestionsCount: 0,
      perspectivesCount: 0,
      discussionPromptsCount: 0,
      warnings: [`檢查數據時發生錯誤: ${error.message}`]
    };
  }
}

/**
 * Migrate cycles from constants.ts to database
 */
async function migrateCyclesToDB(): Promise<number> {
  console.log('Starting cycles migration...');

  // Transform CYCLES to database format
  const cycleRows = CYCLES.map((cycle, index) => ({
    id: cycle.id,
    title: cycle.title,
    description: cycle.description,
    sort_order: index
  }));

  const { data, error } = await supabase
    .from('cycles')
    .upsert(cycleRows, { onConflict: 'id' })
    .select();

  if (error) {
    console.error('Error migrating cycles:', error);
    throw new Error(`Failed to migrate cycles: ${error.message}`);
  }

  console.log(`✓ Migrated ${data?.length || 0} cycles`);
  return data?.length || 0;
}

/**
 * Migrate modules from constants.ts to database
 */
async function migrateModulesToDB(): Promise<number> {
  console.log('Starting modules migration...');

  let migratedCount = 0;
  const errors: string[] = [];

  for (const module of MODULES) {
    try {
      // 1. Insert or update the module
      const { data: moduleRow, error: moduleError } = await supabase
        .from('modules')
        .upsert({
          id: module.id,
          cycle_id: module.cycleId,
          title: module.title,
          subtitle: module.subtitle,
          tension_guide: JSON.stringify(module.tensionGuides || []),
          summary: module.summary,
          status: 'published' // All existing modules are published by default
        }, { onConflict: 'id' })
        .select()
        .single();

      if (moduleError) {
        throw new Error(`Module ${module.id}: ${moduleError.message}`);
      }

      const moduleId = moduleRow.id;

      // 2. Delete existing related data (for clean re-migration)
      await Promise.all([
        supabase.from('life_questions').delete().eq('module_id', moduleId),
        supabase.from('perspectives').delete().eq('module_id', moduleId),
        supabase.from('discussion_prompts').delete().eq('module_id', moduleId)
      ]);

      // 3. Insert life questions
      if (module.lifeQuestions && module.lifeQuestions.length > 0) {
        const questionRows = module.lifeQuestions.map((question, index) => ({
          module_id: moduleId,
          question_text: question,
          question_order: index
        }));

        const { error: questionsError } = await supabase
          .from('life_questions')
          .insert(questionRows);

        if (questionsError) {
          throw new Error(`Life questions for module ${module.id}: ${questionsError.message}`);
        }
      }

      // 4. Insert perspectives
      const perspectiveRows = Object.entries(module.perspectives).map(([type, point]) => ({
        module_id: moduleId,
        perspective_type: type,
        book: point.book,
        theme: point.theme,
        description: point.description
      }));

      const { error: perspectivesError } = await supabase
        .from('perspectives')
        .insert(perspectiveRows);

      if (perspectivesError) {
        throw new Error(`Perspectives for module ${module.id}: ${perspectivesError.message}`);
      }

      // 5. Insert discussion prompts
      if (module.discussionPrompts && module.discussionPrompts.length > 0) {
        const promptRows = module.discussionPrompts.map((prompt, index) => ({
          module_id: moduleId,
          prompt_text: prompt,
          prompt_order: index
        }));

        const { error: promptsError } = await supabase
          .from('discussion_prompts')
          .insert(promptRows);

        if (promptsError) {
          throw new Error(`Discussion prompts for module ${module.id}: ${promptsError.message}`);
        }
      }

      migratedCount++;
      console.log(`✓ Migrated module ${module.id}: ${module.title}`);

    } catch (error: any) {
      const errorMsg = `Failed to migrate module ${module.id}: ${error.message}`;
      console.error(errorMsg);
      errors.push(errorMsg);
    }
  }

  if (errors.length > 0) {
    console.warn(`Migration completed with ${errors.length} errors`);
    errors.forEach(err => console.error(`  - ${err}`));
  } else {
    console.log(`✓ Successfully migrated all ${migratedCount} modules`);
  }

  return migratedCount;
}

/**
 * Main migration function - migrates both cycles and modules
 * @param forceOverwrite - Set to true to bypass safety checks (DANGEROUS!)
 */
export async function runMigration(forceOverwrite: boolean = false): Promise<MigrationReport> {
  const errors: string[] = [];
  let cyclesMigrated = 0;
  let modulesMigrated = 0;

  console.log('='.repeat(60));
  console.log('STARTING DATA MIGRATION FROM CONSTANTS.TS TO SUPABASE');
  console.log('='.repeat(60));
  console.log('');

  // SAFETY CHECK: Check for existing data
  if (!forceOverwrite) {
    console.log('Checking for existing data...');
    const dataCheck = await checkExistingData();

    if (dataCheck.hasData) {
      console.error('⚠️  SAFETY CHECK FAILED: Database already contains data!');
      console.error('Found:');
      console.error(`  - ${dataCheck.modulesCount} modules`);
      console.error(`  - ${dataCheck.lifeQuestionsCount} life questions`);
      console.error(`  - ${dataCheck.perspectivesCount} perspectives`);
      console.error(`  - ${dataCheck.discussionPromptsCount} discussion prompts`);
      if (dataCheck.lastModified) {
        console.error(`  - Last modified: ${dataCheck.lastModified}`);
      }
      console.error('');
      console.error('⚠️  Migration ABORTED to prevent data loss!');
      console.error('If you really want to overwrite existing data, use forceOverwrite=true');

      return {
        success: false,
        cyclesMigrated: 0,
        modulesMigrated: 0,
        errors: [
          '🚨 數據庫中已存在內容！為了防止數據丟失，遷移已取消。',
          '🚨 Database already contains data! Migration cancelled to prevent data loss.',
          ...dataCheck.warnings
        ]
      };
    }

    console.log('✓ No existing data found - safe to proceed');
    console.log('');
  } else {
    console.warn('⚠️  FORCE MODE ENABLED - Bypassing safety checks!');
    console.warn('⚠️  Existing data will be DELETED!');
    console.log('');
  }

  try {
    // Step 1: Migrate cycles first (modules depend on them)
    cyclesMigrated = await migrateCyclesToDB();
    console.log('');

    // Step 2: Migrate modules with all related data
    modulesMigrated = await migrateModulesToDB();
    console.log('');

    // Step 3: Validate migration
    const validation = await validateMigration();
    console.log('');

    console.log('='.repeat(60));
    if (validation.success) {
      console.log('✓ MIGRATION COMPLETED SUCCESSFULLY');
    } else {
      console.log('⚠ MIGRATION COMPLETED WITH WARNINGS');
      validation.errors.forEach(err => console.warn(`  - ${err}`));
      errors.push(...validation.errors);
    }
    console.log('='.repeat(60));

    return {
      success: validation.success,
      cyclesMigrated,
      modulesMigrated,
      errors
    };

  } catch (error: any) {
    console.error('CRITICAL ERROR DURING MIGRATION:', error);
    errors.push(error.message);

    return {
      success: false,
      cyclesMigrated,
      modulesMigrated,
      errors
    };
  }
}

/**
 * Validate migration completeness
 */
export async function validateMigration(): Promise<MigrationReport> {
  console.log('Validating migration...');
  const errors: string[] = [];

  try {
    // Check cycles count
    const { data: cyclesData, error: cyclesError } = await supabase
      .from('cycles')
      .select('id', { count: 'exact' });

    if (cyclesError) {
      errors.push(`Failed to validate cycles: ${cyclesError.message}`);
    } else if (cyclesData.length !== CYCLES.length) {
      errors.push(`Cycles count mismatch: expected ${CYCLES.length}, got ${cyclesData.length}`);
    } else {
      console.log(`✓ Cycles validated: ${cyclesData.length}/${CYCLES.length}`);
    }

    // Check modules count
    const { data: modulesData, error: modulesError } = await supabase
      .from('modules')
      .select('id', { count: 'exact' });

    if (modulesError) {
      errors.push(`Failed to validate modules: ${modulesError.message}`);
    } else if (modulesData.length !== MODULES.length) {
      errors.push(`Modules count mismatch: expected ${MODULES.length}, got ${modulesData.length}`);
    } else {
      console.log(`✓ Modules validated: ${modulesData.length}/${MODULES.length}`);
    }

    // Check that all modules have perspectives (3 per module)
    const { data: perspectivesData, error: perspectivesError } = await supabase
      .from('perspectives')
      .select('module_id, perspective_type');

    if (perspectivesError) {
      errors.push(`Failed to validate perspectives: ${perspectivesError.message}`);
    } else {
      const expectedPerspectives = MODULES.length * 3; // 3 perspectives per module
      if (perspectivesData.length !== expectedPerspectives) {
        errors.push(`Perspectives count mismatch: expected ${expectedPerspectives}, got ${perspectivesData.length}`);
      } else {
        console.log(`✓ Perspectives validated: ${perspectivesData.length} (${MODULES.length} modules × 3)`);
      }

      // Check each module has all 3 perspective types
      const moduleIds = MODULES.map(m => m.id);
      for (const moduleId of moduleIds) {
        const modulePerspectives = perspectivesData.filter(p => p.module_id === moduleId);
        const types = new Set(modulePerspectives.map(p => p.perspective_type));

        if (!types.has('PROVERBS') || !types.has('ECCLESIASTES') || !types.has('JOB')) {
          errors.push(`Module ${moduleId} is missing one or more perspectives`);
        }
      }
    }

    // Check life questions
    const { data: questionsData, error: questionsError } = await supabase
      .from('life_questions')
      .select('module_id', { count: 'exact' });

    if (questionsError) {
      errors.push(`Failed to validate life questions: ${questionsError.message}`);
    } else {
      const totalQuestions = MODULES.reduce((sum, m) => sum + m.lifeQuestions.length, 0);
      if (questionsData.length !== totalQuestions) {
        errors.push(`Life questions count mismatch: expected ${totalQuestions}, got ${questionsData.length}`);
      } else {
        console.log(`✓ Life questions validated: ${questionsData.length}`);
      }
    }

    // Check discussion prompts
    const { data: promptsData, error: promptsError } = await supabase
      .from('discussion_prompts')
      .select('module_id', { count: 'exact' });

    if (promptsError) {
      errors.push(`Failed to validate discussion prompts: ${promptsError.message}`);
    } else {
      const totalPrompts = MODULES.reduce((sum, m) => sum + m.discussionPrompts.length, 0);
      if (promptsData.length !== totalPrompts) {
        errors.push(`Discussion prompts count mismatch: expected ${totalPrompts}, got ${promptsData.length}`);
      } else {
        console.log(`✓ Discussion prompts validated: ${promptsData.length}`);
      }
    }

    if (errors.length === 0) {
      console.log('✓ All validation checks passed');
    }

    return {
      success: errors.length === 0,
      cyclesMigrated: cyclesData?.length || 0,
      modulesMigrated: modulesData?.length || 0,
      errors
    };

  } catch (error: any) {
    errors.push(`Validation error: ${error.message}`);
    return {
      success: false,
      cyclesMigrated: 0,
      modulesMigrated: 0,
      errors
    };
  }
}

/**
 * Rollback migration - deletes all migrated data
 * USE WITH CAUTION - This will delete all modules, cycles, and related data
 */
export async function rollbackMigration(): Promise<void> {
  console.log('WARNING: Rolling back migration - deleting all data...');

  // Delete in reverse order due to foreign key constraints
  await supabase.from('discussion_prompts').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('perspectives').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('life_questions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('modules').delete().neq('id', 0);
  await supabase.from('cycles').delete().neq('id', 0);

  console.log('✓ Rollback complete - all migrated data deleted');
}
