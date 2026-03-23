-- ============================================================
-- CADENCE — Workspace INSERT Fix
-- Run this in: Supabase → SQL Editor → New query
-- ============================================================

-- ── Step 1: Backfill profiles for any users missing one ────
-- (If your profile row wasn't created on signup, the workspace
--  foreign key check fails silently as an RLS error)
INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', ''),
  now(),
  now()
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- ── Step 2: Drop and cleanly recreate all workspaces policies
DROP POLICY IF EXISTS "Workspace members can view workspace"     ON workspaces;
DROP POLICY IF EXISTS "Authenticated users can create workspaces" ON workspaces;
DROP POLICY IF EXISTS "Owner and admin can update workspace"      ON workspaces;
DROP POLICY IF EXISTS "Owner can delete workspace"                ON workspaces;

-- Anyone authenticated whose uid matches owner_id can insert
CREATE POLICY "Authenticated users can create workspaces"
  ON workspaces FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = owner_id);

-- Only members can see their workspaces (uses helper fn from previous fix)
CREATE POLICY "Workspace members can view workspace"
  ON workspaces FOR SELECT
  USING (is_workspace_member(id, auth.uid()));

-- Only owner or admin can edit workspace settings
CREATE POLICY "Owner and admin can update workspace"
  ON workspaces FOR UPDATE
  USING (is_workspace_admin(id, auth.uid()));

-- Only owner can delete workspace
CREATE POLICY "Owner can delete workspace"
  ON workspaces FOR DELETE
  USING (owner_id = auth.uid());

-- ── Verify: should return a list of policy names ────────────
SELECT policyname, cmd FROM pg_policies WHERE tablename = 'workspaces';
