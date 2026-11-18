-- First start only: give the Supabase service logins this stack uses the
-- GETINBIBLE_POSTGRES_PASSWORD. Trimmed from supabase/docker/volumes/db/roles.sql
-- (no auth / functions / pooler services here).
\set pgpass `echo "$POSTGRES_PASSWORD"`

ALTER USER authenticator WITH PASSWORD :'pgpass';
ALTER USER supabase_storage_admin WITH PASSWORD :'pgpass';
