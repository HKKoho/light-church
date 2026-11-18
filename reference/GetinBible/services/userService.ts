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

interface AuthResult {
  token?: string;
  user?: Record<string, unknown>;
  error?: { message?: string };
}

async function callAuth(path: string, body: unknown, token?: string): Promise<AuthResult> {
  const res = await fetch(`/api/auth/${path}`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  const data: AuthResult = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || '登入失敗');
  return data;
}

/**
 * Sign in on the server. Passwords are checked in the database (bcrypt) and
 * never leave the server; a new name without a password creates a student.
 * Returns the user and a session token for later requests.
 */
export async function signIn(name: string, password?: string): Promise<{ user: UserDB; token: string }> {
  const data = await callAuth('login', { name: name.trim(), password: password || undefined });
  if (!data.token || !data.user) throw new Error('登入失敗');
  return { user: transformUser(data.user), token: data.token };
}

/**
 * Set (or change) the signed-in user's own password and optional email.
 * `current` is required when the account already has a password.
 */
export async function setOwnPassword(
  token: string,
  password: string,
  email?: string,
  current?: string,
): Promise<UserDB> {
  const data = await callAuth('password', { password, email, current }, token);
  if (!data.user) throw new Error('Failed to set password');
  return transformUser(data.user);
}

/**
 * Check if a user exists and has a password set
 */
export async function checkUserPassword(name: string): Promise<{ exists: boolean; hasPassword: boolean }> {
  const trimmedName = name.trim();
  const { data: users } = await supabase
    .from('users')
    .select('id, has_password')
    .ilike('name', trimmedName.replace(/[\\%_]/g, '\\$&'));

  const user = users && users.length > 0 ? users[0] : null;
  if (!user) {
    return { exists: false, hasPassword: false };
  }
  return { exists: true, hasPassword: user.has_password || false };
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
