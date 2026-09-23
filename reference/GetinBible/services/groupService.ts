import { supabase } from './supabaseClient';

export interface DiscussionGroup {
  id: string;
  module_id: number;
  group_number: number;
  max_size: number;
  created_at: string;
}

export interface GroupMembership {
  id: string;
  group_id: string;
  user_id: string;
  module_id: number;
  joined_at: string;
}

export interface GroupMember {
  id: string;
  name: string;
  joined_at: string;
}

export interface GroupWithMembers {
  group: DiscussionGroup;
  members: GroupMember[];
  memberCount: number;
}

/**
 * Get or create a discussion group for a user in a module
 * Implements random assignment by finding available groups or creating new ones
 */
export async function getOrAssignUserToGroup(
  userId: string,
  moduleId: number
): Promise<GroupWithMembers> {
  // Check if user is already in a group for this module
  const { data: existingMembership, error: membershipError } = await supabase
    .from('group_memberships')
    .select(`
      *,
      discussion_groups (*)
    `)
    .eq('user_id', userId)
    .eq('module_id', moduleId)
    .single();

  if (existingMembership && existingMembership.discussion_groups) {
    // User already has a group
    const members = await getGroupMembers(existingMembership.group_id);
    return {
      group: existingMembership.discussion_groups as any,
      members,
      memberCount: members.length
    };
  }

  // Find an available group (has < max_size members)
  const { data: availableGroups, error: groupsError } = await supabase
    .from('discussion_groups')
    .select('*, group_memberships(count)')
    .eq('module_id', moduleId)
    .order('group_number', { ascending: true });

  if (groupsError) {
    console.error('Error fetching groups:', groupsError);
    throw new Error('Failed to fetch discussion groups');
  }

  // Find a group with available space
  let targetGroup: DiscussionGroup | null = null;

  if (availableGroups) {
    for (const group of availableGroups) {
      const memberCount = (group as any).group_memberships?.[0]?.count || 0;
      if (memberCount < group.max_size) {
        targetGroup = group;
        break;
      }
    }
  }

  // If no available group, create a new one
  if (!targetGroup) {
    const nextGroupNumber = availableGroups ? availableGroups.length + 1 : 1;

    const { data: newGroup, error: createError } = await supabase
      .from('discussion_groups')
      .insert({
        module_id: moduleId,
        group_number: nextGroupNumber,
        max_size: 5
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating group:', createError);
      throw new Error('Failed to create discussion group');
    }

    targetGroup = newGroup;
  }

  // Add user to the group
  const { error: joinError } = await supabase
    .from('group_memberships')
    .insert({
      group_id: targetGroup.id,
      user_id: userId,
      module_id: moduleId
    });

  if (joinError) {
    console.error('Error joining group:', joinError);
    throw new Error('Failed to join discussion group');
  }

  // Get updated member list
  const members = await getGroupMembers(targetGroup.id);

  return {
    group: targetGroup,
    members,
    memberCount: members.length
  };
}

/**
 * Get all members of a discussion group
 */
export async function getGroupMembers(groupId: string): Promise<GroupMember[]> {
  const { data, error } = await supabase
    .from('group_memberships')
    .select(`
      id,
      user_id,
      joined_at,
      users (
        id,
        name
      )
    `)
    .eq('group_id', groupId)
    .order('joined_at', { ascending: true });

  if (error) {
    console.error('Error fetching group members:', error);
    return [];
  }

  return data.map((membership: any) => ({
    id: membership.users.id,
    name: membership.users.name,
    joined_at: membership.joined_at
  }));
}

/**
 * Get discussion responses from all group members
 */
export async function getGroupDiscussionResponses(
  groupId: string,
  moduleId: number
): Promise<Array<{ userId: string; userName: string; responses: Record<string, string> }>> {
  // Get all member IDs
  const members = await getGroupMembers(groupId);
  const memberIds = members.map(m => m.id);

  if (memberIds.length === 0) {
    return [];
  }

  // Get all discussion responses from group members
  const { data, error } = await supabase
    .from('responses')
    .select(`
      user_id,
      question_key,
      response_text,
      users (
        id,
        name
      )
    `)
    .eq('module_id', moduleId)
    .eq('question_type', 'discussion')
    .in('user_id', memberIds);

  if (error) {
    console.error('Error fetching group responses:', error);
    return [];
  }

  // Group responses by user
  const responsesByUser = new Map<string, { userId: string; userName: string; responses: Record<string, string> }>();

  members.forEach(member => {
    responsesByUser.set(member.id, {
      userId: member.id,
      userName: member.name,
      responses: {}
    });
  });

  data?.forEach((response: any) => {
    const userResponse = responsesByUser.get(response.user_id);
    if (userResponse && response.response_text) {
      userResponse.responses[response.question_key] = response.response_text;
    }
  });

  return Array.from(responsesByUser.values());
}

/**
 * Get group statistics for a module
 */
export async function getModuleGroupStats(moduleId: number): Promise<{
  totalGroups: number;
  totalMembers: number;
  averageGroupSize: number;
}> {
  const { data: groups, error: groupsError } = await supabase
    .from('discussion_groups')
    .select('id')
    .eq('module_id', moduleId);

  if (groupsError || !groups) {
    return { totalGroups: 0, totalMembers: 0, averageGroupSize: 0 };
  }

  const { data: memberships, error: membershipsError } = await supabase
    .from('group_memberships')
    .select('id')
    .eq('module_id', moduleId);

  if (membershipsError || !memberships) {
    return { totalGroups: groups.length, totalMembers: 0, averageGroupSize: 0 };
  }

  const totalGroups = groups.length;
  const totalMembers = memberships.length;
  const averageGroupSize = totalGroups > 0 ? totalMembers / totalGroups : 0;

  return {
    totalGroups,
    totalMembers,
    averageGroupSize: Math.round(averageGroupSize * 10) / 10
  };
}
