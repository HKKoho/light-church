import { supabase, UserProgress } from './supabaseClient';
import { generateCycleAnalysis } from './analysisService';

export async function getUserProgress(userId: string): Promise<number[]> {
  const { data, error } = await supabase
    .from('user_progress')
    .select('module_id')
    .eq('user_id', userId)
    .eq('completed', true);

  if (error) {
    console.error('Failed to fetch progress:', error);
    return [];
  }

  return data?.map(p => p.module_id) || [];
}

export async function markModuleComplete(
  userId: string,
  moduleId: number
): Promise<void> {
  const { error } = await supabase
    .from('user_progress')
    .upsert({
      user_id: userId,
      module_id: moduleId,
      completed: true,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'user_id,module_id'
    });

  if (error) {
    console.error('Failed to mark module complete:', error);
    throw error;
  }

  // AUTO-TRIGGER: Check if cycle is 50% complete (modules 3, 9, 15, 21 are halfway points)
  const cycleHalfwayModules = [3, 9, 15, 21];
  if (cycleHalfwayModules.includes(moduleId)) {
    const cycleId = Math.floor((moduleId - 1) / 6) + 1; // Calculate cycle ID

    console.log(`[Progress] Module ${moduleId} hits 50% of cycle ${cycleId}, triggering partial analysis generation`);

    // Generate partial analysis asynchronously (non-blocking - don't await)
    generateCycleAnalysis(userId, cycleId, true).catch(err => {
      console.error(`[Progress] Failed to auto-generate partial analysis for cycle ${cycleId}, user ${userId}:`, err);
      // In production, log to error tracking service (e.g., Sentry)
    });
  }

  // AUTO-TRIGGER: Check if cycle is complete (modules 6, 12, 18, 24 end each cycle)
  const cycleEndModules = [6, 12, 18, 24];
  if (cycleEndModules.includes(moduleId)) {
    const cycleId = Math.floor((moduleId - 1) / 6) + 1; // Calculate cycle ID

    console.log(`[Progress] Module ${moduleId} completes cycle ${cycleId}, triggering complete analysis generation`);

    // Generate complete analysis asynchronously (non-blocking - don't await)
    // This will overwrite the partial analysis if one exists
    generateCycleAnalysis(userId, cycleId, false).catch(err => {
      console.error(`[Progress] Failed to auto-generate complete analysis for cycle ${cycleId}, user ${userId}:`, err);
      // In production, log to error tracking service (e.g., Sentry)
    });
  }
}
