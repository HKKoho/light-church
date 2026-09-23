import { supabase } from './supabaseClient';

export interface OverallStats {
  totalUsers: number;
  totalStudents: number;
  totalModules: number;
  publishedModules: number;
  totalCompletions: number;
  averageCompletionRate: number;
}

export interface ModuleCompletionStat {
  moduleId: number;
  moduleTitle: string;
  completionCount: number;
  uniqueUsers: number;
}

export interface CycleCompletionStat {
  cycleId: number;
  cycleTitle: string;
  completionCount: number;
  moduleCount: number;
}

export interface UserProgressDetail {
  userId: string;
  userName: string;
  completedModules: number[];
  completionRate: number;
  lastActivity: string;
}

/**
 * Get overall statistics for the admin dashboard
 */
export async function getOverallStats(): Promise<OverallStats> {
  try {
    // Get total users (students only)
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, role');

    if (usersError) throw usersError;

    const totalUsers = users?.length || 0;
    const totalStudents = users?.filter(u => u.role === 'student').length || 0;

    // Get module stats
    const { data: modules, error: modulesError } = await supabase
      .from('modules')
      .select('id, status');

    if (modulesError) throw modulesError;

    const totalModules = modules?.length || 0;
    const publishedModules = modules?.filter(m => m.status === 'published').length || 0;

    // Get completion stats (handle empty table gracefully)
    const { data: progress, error: progressError } = await supabase
      .from('user_progress')
      .select('id, user_id, module_id')
      .eq('completed', true);

    if (progressError) {
      console.error('Error fetching progress:', progressError);
      // Continue with 0 completions instead of failing
    }

    const totalCompletions = progress?.length || 0;

    // Calculate average completion rate
    const averageCompletionRate = totalStudents > 0 && publishedModules > 0
      ? (totalCompletions / (totalStudents * publishedModules)) * 100
      : 0;

    return {
      totalUsers,
      totalStudents,
      totalModules,
      publishedModules,
      totalCompletions,
      averageCompletionRate: Math.round(averageCompletionRate * 10) / 10
    };
  } catch (error) {
    console.error('Error fetching overall stats:', error);
    throw new Error('Failed to fetch overall statistics');
  }
}

/**
 * Get completion statistics for each module
 */
export async function getModuleCompletionStats(): Promise<ModuleCompletionStat[]> {
  try {
    const { data: modules, error: modulesError } = await supabase
      .from('modules')
      .select('id, title');

    if (modulesError) throw modulesError;

    const { data: progress, error: progressError } = await supabase
      .from('user_progress')
      .select('module_id, user_id')
      .eq('completed', true);

    if (progressError) {
      console.error('Error fetching progress:', progressError);
      // Continue with empty progress instead of failing
    }

    // Count completions per module
    const stats: ModuleCompletionStat[] = (modules || []).map(module => {
      const completions = progress?.filter(p => p.module_id === module.id) || [];
      const uniqueUsers = new Set(completions.map(c => c.user_id)).size;

      return {
        moduleId: module.id,
        moduleTitle: module.title,
        completionCount: completions.length,
        uniqueUsers
      };
    });

    return stats.sort((a, b) => b.completionCount - a.completionCount);
  } catch (error) {
    console.error('Error fetching module completion stats:', error);
    // Return empty array instead of throwing
    return [];
  }
}

/**
 * Get completion statistics for each cycle
 */
export async function getCycleCompletionStats(): Promise<CycleCompletionStat[]> {
  try {
    const { data: cycles, error: cyclesError } = await supabase
      .from('cycles')
      .select('id, title')
      .order('sort_order');

    if (cyclesError) throw cyclesError;

    const { data: modules, error: modulesError } = await supabase
      .from('modules')
      .select('id, cycle_id');

    if (modulesError) throw modulesError;

    const { data: progress, error: progressError } = await supabase
      .from('user_progress')
      .select('module_id')
      .eq('completed', true);

    if (progressError) {
      console.error('Error fetching progress:', progressError);
      // Continue with empty progress instead of failing
    }

    // Count completions per cycle
    const stats: CycleCompletionStat[] = (cycles || []).map(cycle => {
      const cycleModules = modules?.filter(m => m.cycle_id === cycle.id) || [];
      const moduleIds = cycleModules.map(m => m.id);
      const completions = progress?.filter(p => moduleIds.includes(p.module_id)) || [];

      return {
        cycleId: cycle.id,
        cycleTitle: cycle.title,
        completionCount: completions.length,
        moduleCount: cycleModules.length
      };
    });

    return stats;
  } catch (error) {
    console.error('Error fetching cycle completion stats:', error);
    // Return empty array instead of throwing
    return [];
  }
}

/**
 * Get detailed progress for all users
 */
export async function getAllUserProgress(): Promise<UserProgressDetail[]> {
  try {
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, name, role, created_at')
      .eq('role', 'student');

    if (usersError) throw usersError;

    const { data: progress, error: progressError } = await supabase
      .from('user_progress')
      .select('user_id, module_id, completed_at')
      .eq('completed', true);

    if (progressError) {
      console.error('Error fetching progress:', progressError);
      // Continue with empty progress instead of failing
    }

    const { data: modules, error: modulesError } = await supabase
      .from('modules')
      .select('id')
      .eq('status', 'published');

    if (modulesError) throw modulesError;

    const totalPublishedModules = modules?.length || 1;

    // Build user progress details
    const userDetails: UserProgressDetail[] = (users || []).map(user => {
      const userProgress = progress?.filter(p => p.user_id === user.id) || [];
      const completedModules = userProgress.map(p => p.module_id);
      const completionRate = (completedModules.length / totalPublishedModules) * 100;

      // Find last activity
      const sortedProgress = userProgress.sort((a, b) =>
        new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()
      );
      const lastActivity = sortedProgress[0]?.completed_at || user.created_at;

      return {
        userId: user.id,
        userName: user.name,
        completedModules,
        completionRate: Math.round(completionRate * 10) / 10,
        lastActivity
      };
    });

    return userDetails.sort((a, b) => b.completionRate - a.completionRate);
  } catch (error) {
    console.error('Error fetching user progress:', error);
    // Return empty array instead of throwing
    return [];
  }
}

/**
 * Get recent activity (last 10 completions)
 */
export async function getRecentActivity(limit: number = 10): Promise<Array<{
  userName: string;
  moduleTitle: string;
  completedAt: string;
}>> {
  try {
    // First check if there's any data
    const { count } = await supabase
      .from('user_progress')
      .select('*', { count: 'exact', head: true })
      .eq('completed', true);

    // If no completions exist, return empty array instead of failing
    if (!count || count === 0) {
      console.log('No completed modules yet');
      return [];
    }

    const { data, error } = await supabase
      .from('user_progress')
      .select(`
        completed_at,
        user:users(name),
        module:modules(title)
      `)
      .eq('completed', true)
      .order('completed_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error in join query:', error);
      // If join fails, fall back to simple query without joins
      const { data: simpleData, error: simpleError } = await supabase
        .from('user_progress')
        .select('user_id, module_id, completed_at')
        .eq('completed', true)
        .order('completed_at', { ascending: false })
        .limit(limit);

      if (simpleError) throw simpleError;

      // Return with placeholder names
      return (simpleData || []).map((item, idx) => ({
        userName: `User ${idx + 1}`,
        moduleTitle: `Module ${item.module_id}`,
        completedAt: item.completed_at
      }));
    }

    return (data || []).map(item => ({
      userName: (item.user as any)?.name || 'Unknown',
      moduleTitle: (item.module as any)?.title || 'Unknown Module',
      completedAt: item.completed_at
    }));
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    // Return empty array instead of throwing to prevent analytics page from breaking
    return [];
  }
}
