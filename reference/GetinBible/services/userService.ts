import { supabase } from './supabaseClient';
import { UserRole } from '../types';

// Using simplified User interface for database operations (camelCase)
interface UserDB {
  id: string;
  name: string;
  role: UserRole;
  createdAt: string;
  lastLogin: string;
  email?: string;
  hasPassword?: boolean;
}

// Transform database row to camelCase
function transformUser(row: any): UserDB {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    createdAt: row.created_at,
    lastLogin: row.last_login,
    email: row.email || undefined,
    hasPassword: row.has_password || false
  };
}

// Simple encoding for password storage (not production-grade)
function encodePassword(password: string): string {
  return btoa(password);
}

function decodePassword(hash: string): string {
  return atob(hash);
}

/**
 * Verify a user's password
 */
export async function verifyPassword(name: string, password: string): Promise<{ valid: boolean; user?: UserDB }> {
  const trimmedName = name.trim();

  const { data: users } = await supabase
    .from('users')
    .select('*')
    .ilike('name', trimmedName);

  const user = users && users.length > 0 ? users[0] : null;

  if (!user) {
    return { valid: false };
  }

  // Admin uses hardcoded password
  if (user.role === 'admin') {
    if (password === 'CKLBCKOHO') {
      return { valid: true, user: transformUser(user) };
    }
    return { valid: false };
  }

  // Student with password
  if (user.has_password && user.password_hash) {
    const decoded = decodePassword(user.password_hash);
    if (decoded === password) {
      return { valid: true, user: transformUser(user) };
    }
    return { valid: false };
  }

  // Student without password - always valid
  return { valid: true, user: transformUser(user) };
}

/**
 * Set password and optional email for a student
 */
export async function setStudentPassword(userId: string, password: string, email?: string): Promise<void> {
  const updateData: any = {
    password_hash: encodePassword(password),
    has_password: true
  };
  if (email) {
    updateData.email = email;
  }

  const { error } = await supabase
    .from('users')
    .update(updateData)
    .eq('id', userId);

  if (error) {
    throw new Error(`Failed to set password: ${error.message}`);
  }
}

/**
 * Check if a user exists and has a password set
 */
export async function checkUserPassword(name: string): Promise<{ exists: boolean; hasPassword: boolean }> {
  const trimmedName = name.trim();
  const { data: users } = await supabase
    .from('users')
    .select('id, has_password')
    .ilike('name', trimmedName);

  const user = users && users.length > 0 ? users[0] : null;
  if (!user) {
    return { exists: false, hasPassword: false };
  }
  return { exists: true, hasPassword: user.has_password || false };
}

export async function findOrCreateUser(name: string): Promise<UserDB> {
  const trimmedName = name.trim();

  // First, try to find existing user (case-insensitive search)
  const { data: users, error: findError } = await supabase
    .from('users')
    .select('*')
    .ilike('name', trimmedName);  // Case-insensitive search

  // If we found user(s), use the first match
  const existingUser = users && users.length > 0 ? users[0] : null;

  if (existingUser) {

    // Update last_login
    const { data: updatedUser } = await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', existingUser.id)
      .select()
      .single();

    return transformUser(updatedUser || existingUser);
  }

  // Create new user with trimmed name
  console.log(`Creating new user: ${trimmedName}`);
  const { data: newUser, error: createError } = await supabase
    .from('users')
    .insert({ name: trimmedName })
    .select()
    .single();

  if (createError) {
    throw new Error(`Failed to create user: ${createError.message}`);
  }

  return transformUser(newUser);
}

export async function getUserById(userId: string): Promise<UserDB | null> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) return null;
  return transformUser(data);
}

/**
 * Check if a user is an admin
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', userId)
    .single();

  if (error || !data) return false;
  return data.role === 'admin';
}

/**
 * Update a user's role
 */
export async function updateUserRole(userId: string, role: 'student' | 'admin'): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ role })
    .eq('id', userId);

  if (error) {
    throw new Error(`Failed to update user role: ${error.message}`);
  }
}

/**
 * Get all users by role
 */
export async function getUsersByRole(role: 'student' | 'admin'): Promise<UserDB[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('role', role)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get users by role: ${error.message}`);
  }

  return (data || []).map(transformUser);
}

/**
 * Get all users (admin function)
 */
export async function getAllUsers(): Promise<UserDB[]> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(`Failed to get all users: ${error.message}`);
  }

  return (data || []).map(transformUser);
}

/**
 * Delete a user (admin function)
 * Note: This will cascade delete user progress and responses
 */
export async function deleteUser(userId: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .delete()
    .eq('id', userId);

  if (error) {
    throw new Error(`Failed to delete user: ${error.message}`);
  }
}
