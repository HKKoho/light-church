-- ============================================================================
-- Secure sign-in (run once; safe to re-run)
-- ============================================================================
-- Replaces the old browser-side login:
--   * passwords were base64 (reversible) in users.password_hash, readable by
--     anyone holding the public anon key;
--   * admins shared one password hard-coded in the app bundle;
--   * any visitor could update any user row (e.g. make themselves admin).
--
-- After this script:
--   * passwords are bcrypt hashes in user_credentials, which the anon and
--     authenticated roles cannot read or write at all;
--   * login happens server-side (api/auth.ts) through gib_login(), callable
--     only with the service_role key; the server then issues a session JWT
--     (role "authenticated", sub = user id);
--   * only admins (checked in the database) may update/delete users or
--     change files in the scripture-documents bucket;
--   * every admin needs their own password: set it with
--     node scripts/getinbible-set-password.mjs "<name>"
--
-- Existing base64 passwords are converted, so members keep their password.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- ── credentials ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_credentials (
  user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  password_hash TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.user_credentials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.user_credentials FROM PUBLIC, anon, authenticated;

-- Convert legacy base64 passwords, then drop the readable column.
-- btoa() only accepts Latin-1, so decode as LATIN1 to get the exact original.
DO $$
DECLARE
  r RECORD;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'password_hash'
  ) THEN
    FOR r IN
      EXECUTE 'SELECT id, name, password_hash FROM public.users
               WHERE password_hash IS NOT NULL AND password_hash <> '''''
    LOOP
      BEGIN
        INSERT INTO public.user_credentials (user_id, password_hash)
        VALUES (
          r.id,
          extensions.crypt(
            convert_from(decode(r.password_hash, 'base64'), 'LATIN1'),
            extensions.gen_salt('bf', 10)
          )
        )
        ON CONFLICT (user_id) DO NOTHING;
      EXCEPTION WHEN OTHERS THEN
        -- Unreadable value: the account stays locked (has_password is kept)
        -- until an operator sets a new password.
        RAISE NOTICE 'Could not convert password for user %', r.name;
      END;
    END LOOP;
    ALTER TABLE public.users DROP COLUMN password_hash;
  END IF;
END $$;

-- ── helpers ─────────────────────────────────────────────────────────────────
-- The signed-in user's id from the session JWT. Reads both the current
-- (request.jwt.claims) and legacy (request.jwt.claim.sub) settings: PostgREST
-- sets the first, Storage the second, and self-hosted images without GoTrue
-- keep an old auth.uid() that only knows the legacy one.
CREATE OR REPLACE FUNCTION public.gib_current_user_id()
RETURNS UUID
LANGUAGE sql STABLE SET search_path = ''
AS $$
  SELECT nullif(
    coalesce(
      nullif(current_setting('request.jwt.claim.sub', true), ''),
      nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
    ),
    ''
  )::uuid;
$$;
REVOKE ALL ON FUNCTION public.gib_current_user_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gib_current_user_id() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.gib_is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users WHERE id = public.gib_current_user_id() AND role = 'admin'
  );
$$;
REVOKE ALL ON FUNCTION public.gib_is_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.gib_is_admin() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.gib_user_json(u public.users)
RETURNS JSON
LANGUAGE sql STABLE SET search_path = ''
AS $$
  SELECT json_build_object(
    'id', u.id, 'name', u.name, 'role', u.role,
    'created_at', u.created_at, 'last_login', u.last_login,
    'email', u.email, 'has_password', u.has_password
  );
$$;
REVOKE ALL ON FUNCTION public.gib_user_json(public.users) FROM PUBLIC, anon, authenticated;

-- ── login (service_role only — called by api/auth.ts) ──────────────────────
-- Returns the user as JSON, or NULL when the sign-in is refused.
--   * admins, and anyone who has set a password, must give the right password;
--   * students without a password sign in by name (the app's existing
--     behaviour); an unknown name creates a student when no password is given.
CREATE OR REPLACE FUNCTION public.gib_login(p_name TEXT, p_password TEXT)
RETURNS JSON
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_name TEXT := btrim(coalesce(p_name, ''));
  v_user public.users;
  v_hash TEXT;
BEGIN
  IF v_name = '' OR length(v_name) > 100 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO v_user FROM public.users
  WHERE lower(name) = lower(v_name)
  ORDER BY created_at
  LIMIT 1;

  IF NOT FOUND THEN
    IF coalesce(p_password, '') <> '' THEN
      RETURN NULL;
    END IF;
    INSERT INTO public.users (name) VALUES (v_name) RETURNING * INTO v_user;
    RETURN public.gib_user_json(v_user);
  END IF;

  IF v_user.role = 'admin' OR v_user.has_password THEN
    SELECT password_hash INTO v_hash FROM public.user_credentials WHERE user_id = v_user.id;
    IF v_hash IS NULL OR coalesce(p_password, '') = ''
       OR extensions.crypt(p_password, v_hash) <> v_hash THEN
      RETURN NULL;
    END IF;
  END IF;

  UPDATE public.users SET last_login = NOW() WHERE id = v_user.id RETURNING * INTO v_user;
  RETURN public.gib_user_json(v_user);
END;
$$;
REVOKE ALL ON FUNCTION public.gib_login(TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gib_login(TEXT, TEXT) TO service_role;

-- ── set own password (service_role only — api/auth.ts checks the session) ──
-- A user who already has a password must give it (p_current).
CREATE OR REPLACE FUNCTION public.gib_set_password(
  p_user_id UUID, p_current TEXT, p_new TEXT, p_email TEXT
)
RETURNS JSON
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_user public.users;
  v_hash TEXT;
BEGIN
  IF p_new IS NULL OR length(p_new) < 4 OR length(p_new) > 200 THEN
    RAISE EXCEPTION 'Password must be 4-200 characters' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_user FROM public.users WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No such user' USING ERRCODE = '22023';
  END IF;
  SELECT password_hash INTO v_hash FROM public.user_credentials WHERE user_id = p_user_id;
  IF v_hash IS NOT NULL AND (
    coalesce(p_current, '') = '' OR extensions.crypt(p_current, v_hash) <> v_hash
  ) THEN
    RAISE EXCEPTION 'Current password is incorrect' USING ERRCODE = '28P01';
  END IF;

  INSERT INTO public.user_credentials (user_id, password_hash, updated_at)
  VALUES (p_user_id, extensions.crypt(p_new, extensions.gen_salt('bf', 10)), NOW())
  ON CONFLICT (user_id) DO UPDATE
    SET password_hash = EXCLUDED.password_hash, updated_at = NOW();

  UPDATE public.users
  SET has_password = true,
      email = coalesce(nullif(btrim(coalesce(p_email, '')), ''), email)
  WHERE id = p_user_id
  RETURNING * INTO v_user;
  RETURN public.gib_user_json(v_user);
END;
$$;
REVOKE ALL ON FUNCTION public.gib_set_password(UUID, TEXT, TEXT, TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.gib_set_password(UUID, TEXT, TEXT, TEXT) TO service_role;

-- ── operator reset (database owner only — scripts/getinbible-set-password.mjs)
-- Creates the account when missing (p_role) and (re)sets its password.
CREATE OR REPLACE FUNCTION public.gib_admin_set_password(
  p_name TEXT, p_password TEXT, p_role TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql VOLATILE SET search_path = ''
AS $$
DECLARE
  v_id UUID;
BEGIN
  IF p_password IS NULL OR length(p_password) < 8 THEN
    RAISE EXCEPTION 'Use at least 8 characters';
  END IF;
  SELECT id INTO v_id FROM public.users WHERE lower(name) = lower(btrim(p_name))
  ORDER BY created_at LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO public.users (name, role) VALUES (btrim(p_name), coalesce(p_role, 'student'))
    RETURNING id INTO v_id;
  ELSIF p_role IS NOT NULL THEN
    UPDATE public.users SET role = p_role WHERE id = v_id;
  END IF;
  INSERT INTO public.user_credentials (user_id, password_hash, updated_at)
  VALUES (v_id, extensions.crypt(p_password, extensions.gen_salt('bf', 10)), NOW())
  ON CONFLICT (user_id) DO UPDATE
    SET password_hash = EXCLUDED.password_hash, updated_at = NOW();
  UPDATE public.users SET has_password = true WHERE id = v_id;
  RETURN (SELECT name || ' (' || role || ')' FROM public.users WHERE id = v_id);
END;
$$;
REVOKE ALL ON FUNCTION public.gib_admin_set_password(TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated, service_role;

-- ── users: everyone may read; only admins may change ───────────────────────
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users'
  LOOP
    EXECUTE format('DROP POLICY %I ON public.users', p.policyname);
  END LOOP;
END $$;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_read ON public.users
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY users_admin_update ON public.users
  FOR UPDATE TO authenticated USING (public.gib_is_admin()) WITH CHECK (public.gib_is_admin());
CREATE POLICY users_admin_delete ON public.users
  FOR DELETE TO authenticated USING (public.gib_is_admin());
-- New accounts only through gib_login / gib_admin_set_password. TRUNCATE
-- would skip row security entirely.
REVOKE INSERT, TRUNCATE, TRIGGER, REFERENCES ON public.users FROM anon, authenticated;

-- ── lesson documents: admin check that works without GoTrue ────────────────
DO $$
BEGIN
  IF to_regclass('public.scripture_pain_point_documents') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admins can manage scripture pain point documents"
      ON public.scripture_pain_point_documents;
    CREATE POLICY "Admins can manage scripture pain point documents"
      ON public.scripture_pain_point_documents
      FOR ALL TO authenticated
      USING (public.gib_is_admin()) WITH CHECK (public.gib_is_admin());
  END IF;
END $$;

-- ── keep other tables working for signed-in users ──────────────────────────
-- Policies written "TO anon" would otherwise lock out the authenticated role
-- the session JWT uses. (Tightening these tables is a separate step.)
DO $$
DECLARE p RECORD;
BEGIN
  FOR p IN
    SELECT tablename, policyname FROM pg_policies
    WHERE schemaname = 'public' AND tablename NOT IN ('users', 'user_credentials')
      AND roles = ARRAY['anon']::name[]
  LOOP
    EXECUTE format('ALTER POLICY %I ON public.%I TO anon, authenticated', p.policyname, p.tablename);
  END LOOP;
END $$;

-- ── document uploads: admins only ──────────────────────────────────────────
-- Reads go through the public bucket URL and need no policy.
DROP POLICY IF EXISTS gib_documents_admin_insert ON storage.objects;
DROP POLICY IF EXISTS gib_documents_admin_update ON storage.objects;
DROP POLICY IF EXISTS gib_documents_admin_delete ON storage.objects;
CREATE POLICY gib_documents_admin_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'scripture-documents' AND public.gib_is_admin());
CREATE POLICY gib_documents_admin_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'scripture-documents' AND public.gib_is_admin());
CREATE POLICY gib_documents_admin_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'scripture-documents' AND public.gib_is_admin());

NOTIFY pgrst, 'reload schema';
