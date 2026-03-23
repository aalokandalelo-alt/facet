-- ============================================================
-- CADENCE — RLS Infinite Recursion Fix
-- Run this in: Supabase → SQL Editor → New query
--
-- Problem: workspace_members policies query workspace_members,
-- causing infinite recursion. Fix: SECURITY DEFINER helper
-- functions that bypass RLS for internal membership checks.
-- ============================================================

-- ─── Step 1: Create helper functions (bypass RLS) ──────────

CREATE OR REPLACE FUNCTION public.is_workspace_member(p_workspace_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_admin(p_workspace_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = p_user_id
      AND role IN ('owner', 'admin')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_workspace_owner(p_workspace_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.workspace_members
    WHERE workspace_id = p_workspace_id
      AND user_id = p_user_id
      AND role = 'owner'
  );
$$;

-- ─── Step 2: Fix workspace_members policies (root cause) ───

DROP POLICY IF EXISTS "Workspace members can see membership" ON workspace_members;
DROP POLICY IF EXISTS "Owners and admins can add members" ON workspace_members;
DROP POLICY IF EXISTS "Owners and admins can remove members" ON workspace_members;
DROP POLICY IF EXISTS "Owners can update member roles" ON workspace_members;

CREATE POLICY "Workspace members can see membership"
  ON workspace_members FOR SELECT
  USING (is_workspace_member(workspace_id, auth.uid()));

CREATE POLICY "Owners and admins can add members"
  ON workspace_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR is_workspace_admin(workspace_id, auth.uid())
  );

CREATE POLICY "Owners and admins can remove members"
  ON workspace_members FOR DELETE
  USING (
    is_workspace_owner(workspace_id, auth.uid())
    OR (
      is_workspace_admin(workspace_id, auth.uid())
      AND role = 'member'
    )
  );

CREATE POLICY "Owners can update member roles"
  ON workspace_members FOR UPDATE
  USING (is_workspace_owner(workspace_id, auth.uid()));

-- ─── Step 3: Update workspaces policies to use helpers ─────

DROP POLICY IF EXISTS "Workspace members can view workspace" ON workspaces;
DROP POLICY IF EXISTS "Owner and admin can update workspace" ON workspaces;

CREATE POLICY "Workspace members can view workspace"
  ON workspaces FOR SELECT
  USING (is_workspace_member(id, auth.uid()));

CREATE POLICY "Owner and admin can update workspace"
  ON workspaces FOR UPDATE
  USING (is_workspace_admin(id, auth.uid()));

-- ─── Done ──────────────────────────────────────────────────
-- Run: SELECT is_workspace_member(null::uuid, auth.uid());
-- Expected: false (no error = functions work)
