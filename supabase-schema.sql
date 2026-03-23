-- ============================================================
-- CADENCE — Full Database Schema
-- Run this in: Supabase → SQL Editor → New query
-- ============================================================
-- IMPORTANT: All tables are created FIRST, then all RLS policies.
-- This avoids "relation does not exist" errors during policy creation.
-- ============================================================

-- ─── Extensions ────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ════════════════════════════════════════════════════════════
-- PART 1: CREATE ALL TABLES
-- ════════════════════════════════════════════════════════════

-- ─── 1. profiles ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text,
  full_name   text,
  avatar_url  text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now()
);

-- ─── 2. workspaces ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS workspaces (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  slug        text UNIQUE NOT NULL,
  owner_id    uuid REFERENCES profiles(id) ON DELETE SET NULL,
  settings    jsonb DEFAULT '{}',
  created_at  timestamptz DEFAULT now()
);

-- ─── 3. workspace_members ──────────────────────────────────
CREATE TABLE IF NOT EXISTS workspace_members (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role         text NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  invited_by   uuid REFERENCES profiles(id),
  joined_at    timestamptz DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);

-- ─── 4. workspace_invites ──────────────────────────────────
CREATE TABLE IF NOT EXISTS workspace_invites (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  email        text NOT NULL,
  role         text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  token        uuid UNIQUE DEFAULT gen_random_uuid(),
  invited_by   uuid REFERENCES profiles(id),
  expires_at   timestamptz NOT NULL DEFAULT (now() + INTERVAL '7 days'),
  used_at      timestamptz,
  created_at   timestamptz DEFAULT now()
);

-- ─── 5. workspace_pillars ──────────────────────────────────
CREATE TABLE IF NOT EXISTS workspace_pillars (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name         text NOT NULL,
  color        text NOT NULL DEFAULT '#8080A0',
  is_default   boolean DEFAULT false,
  sort_order   integer DEFAULT 0,
  created_at   timestamptz DEFAULT now()
);

-- ─── 6. posts ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS posts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id   uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  created_by     uuid REFERENCES profiles(id) ON DELETE SET NULL,
  post_date      date,
  day_name       text,
  post_time      text,
  platform       text NOT NULL,
  content_pillar text,
  topic          text NOT NULL,
  status         text NOT NULL DEFAULT 'Idea' CHECK (status IN ('Idea', 'Draft', 'Ready', 'Scheduled', 'Posted')),
  notes          text,
  attachment_url text,
  created_at     timestamptz DEFAULT now(),
  updated_at     timestamptz DEFAULT now()
);

-- ─── 7. post_reminders ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS post_reminders (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  remind_at  timestamptz NOT NULL,
  sent_at    timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ─── 8. push_subscriptions ─────────────────────────────────
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subscription jsonb NOT NULL,
  created_at   timestamptz DEFAULT now()
);

-- Expression-based unique index (expressions not allowed in UNIQUE constraints)
CREATE UNIQUE INDEX IF NOT EXISTS push_subscriptions_user_endpoint_idx
  ON push_subscriptions (user_id, (subscription->>'endpoint'));

-- ─── 9. notifications ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  type         text NOT NULL,
  message      text NOT NULL,
  data         jsonb DEFAULT '{}',
  read_at      timestamptz,
  created_at   timestamptz DEFAULT now()
);

-- ════════════════════════════════════════════════════════════
-- PART 2: FUNCTIONS & TRIGGERS
-- ════════════════════════════════════════════════════════════

-- Auto-create profile row when a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update posts.updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS posts_updated_at ON posts;
CREATE TRIGGER posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ════════════════════════════════════════════════════════════
-- PART 3: ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ════════════════════════════════════════════════════════════

ALTER TABLE profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces         ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_invites  ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_pillars  ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts              ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_reminders     ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications      ENABLE ROW LEVEL SECURITY;

-- ════════════════════════════════════════════════════════════
-- PART 4: RLS POLICIES
-- All tables exist by now, so cross-table references are safe.
-- ════════════════════════════════════════════════════════════

-- ─── profiles policies ─────────────────────────────────────
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ─── workspaces policies ───────────────────────────────────
-- workspace_members now exists, so this is safe
CREATE POLICY "Workspace members can view workspace"
  ON workspaces FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspaces.id
        AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create workspaces"
  ON workspaces FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = owner_id);

CREATE POLICY "Owner and admin can update workspace"
  ON workspaces FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspaces.id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owner can delete workspace"
  ON workspaces FOR DELETE
  USING (owner_id = auth.uid());

-- ─── workspace_members policies ────────────────────────────
CREATE POLICY "Workspace members can see membership"
  ON workspace_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm2
      WHERE wm2.workspace_id = workspace_members.workspace_id
        AND wm2.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners and admins can add members"
  ON workspace_members FOR INSERT
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM workspace_members wm2
      WHERE wm2.workspace_id = workspace_id
        AND wm2.user_id = auth.uid()
        AND wm2.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owners and admins can remove members"
  ON workspace_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm2
      WHERE wm2.workspace_id = workspace_members.workspace_id
        AND wm2.user_id = auth.uid()
        AND wm2.role = 'owner'
    )
    OR (
      EXISTS (
        SELECT 1 FROM workspace_members wm2
        WHERE wm2.workspace_id = workspace_members.workspace_id
          AND wm2.user_id = auth.uid()
          AND wm2.role = 'admin'
      )
      AND workspace_members.role = 'member'
    )
  );

CREATE POLICY "Owners can update member roles"
  ON workspace_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members wm2
      WHERE wm2.workspace_id = workspace_members.workspace_id
        AND wm2.user_id = auth.uid()
        AND wm2.role = 'owner'
    )
  );

-- ─── workspace_invites policies ────────────────────────────
CREATE POLICY "Admins can view invites"
  ON workspace_invites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspace_invites.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Admins can create invites"
  ON workspace_invites FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Admins can delete invites"
  ON workspace_invites FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspace_invites.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.role IN ('owner', 'admin')
    )
  );

-- ─── workspace_pillars policies ────────────────────────────
CREATE POLICY "Members can view pillars"
  ON workspace_pillars FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspace_pillars.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can insert pillars"
  ON workspace_pillars FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Admins can update pillars"
  ON workspace_pillars FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspace_pillars.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Admins can delete pillars"
  ON workspace_pillars FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspace_pillars.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.role IN ('owner', 'admin')
    )
  );

-- ─── posts policies ────────────────────────────────────────
CREATE POLICY "Members can view posts"
  ON posts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = posts.workspace_id
        AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can create posts"
  ON posts FOR INSERT
  WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = workspace_id
        AND workspace_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members edit own, admins edit all posts"
  ON posts FOR UPDATE
  USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = posts.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Members delete own, admins delete all posts"
  ON posts FOR DELETE
  USING (
    auth.uid() = created_by
    OR EXISTS (
      SELECT 1 FROM workspace_members
      WHERE workspace_members.workspace_id = posts.workspace_id
        AND workspace_members.user_id = auth.uid()
        AND workspace_members.role IN ('owner', 'admin')
    )
  );

-- ─── post_reminders policies ───────────────────────────────
CREATE POLICY "Users manage their own reminders"
  ON post_reminders FOR ALL
  USING (auth.uid() = user_id);

-- ─── push_subscriptions policies ──────────────────────────
CREATE POLICY "Users manage their own push subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id);

-- ─── notifications policies ────────────────────────────────
CREATE POLICY "Users view their own notifications"
  ON notifications FOR ALL
  USING (auth.uid() = user_id);

-- ════════════════════════════════════════════════════════════
-- DONE
-- All tables, triggers, RLS enabled, and policies applied.
-- To enable Realtime: Supabase → Database → Replication
-- → enable for posts and notifications tables.
-- ════════════════════════════════════════════════════════════
