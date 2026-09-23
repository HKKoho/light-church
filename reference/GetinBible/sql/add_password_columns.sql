-- Migration: Add password authentication columns to users table
-- Run this in Supabase SQL Editor for existing databases

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS has_password BOOLEAN DEFAULT false;
