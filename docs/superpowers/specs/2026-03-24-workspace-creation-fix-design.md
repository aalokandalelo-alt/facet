# Workspace Creation Fix — Design Spec
**Date:** 2026-03-24
**Status:** Approved
**Goal:** Make workspace creation work end-to-end in production using the correct Next.js 15 + Supabase SSR architecture.

---

## Problem Summary

Workspace creation is completely broken due to three compounding issues:

### Issue 1 — Missing `/dashboard/[slug]` page (main 404)
After any successful workspace creation, the app redirects to `/dashboard/<slug>`. That route does not exist in the codebase — there is no `app/dashboard/[slug]/` directory. This causes a Next.js 404 regardless of whether the workspace was created successfully.

### Issue 2 — `server.js` createClient is read-only (breaks Server-side auth in mutations)
`lib/supabase/server.js` exports `createClient()` with `setAll() {}` (no-op). The official `@supabase/ssr` docs require `setAll` to be implemented with a try-catch so it works in:
- Server Components (try-catch silently absorbs the error; middleware handles refresh)
- Server Actions and Route Handlers (try-catch succeeds; cookies are written)

Without this, any Server Action or Route Handler that triggers a session token refresh will fail silently, causing `getUser()` to return null even for authenticated users.

### Issue 3 — Workspace mutation uses client-side Supabase (RLS auth.uid() returns null)
The original workspace creation called Supabase directly from the browser client. The PostgREST RLS policy `auth.uid() IS NOT NULL AND auth.uid() = owner_id` was consistently failing. Root cause: `@supabase/ssr` cookie-based sessions are not always forwarded correctly to PostgREST in the current version when doing direct client mutations. The previous fix attempt moved this to a Route Handler (`/api/workspaces/route.js`), which was the right direction but has the Issue 2 problem and also requires a dev server restart to detect new files.

---

## Solution Architecture

### Chosen Pattern: Next.js 15 Server Actions

Server Actions are the idiomatic Next.js 15 approach for form mutations. They:
- Run on the server (access to cookies, env vars, admin client)
- Are called directly from Client Components — no HTTP endpoint to register
- Cannot return 404 (they're RPC calls, not routes)
- Handle redirects natively via `redirect()` from `next/navigation`
- Are progressively enhanced (work even without JavaScript)
- Receive errors back as return values (so the form can display them)

This is the architecture Vercel recommends for all form mutations in App Router apps.

---

## Files Changed

### 1. `lib/supabase/server.js` — Fix createClient setAll

**Change:** Replace `setAll() {}` with the official try-catch pattern.

```js
setAll(cookiesToSet) {
  try {
    cookiesToSet.forEach(({ name, value, options }) =>
      cookieStore.set(name, value, options)
    )
  } catch {
    // Called from a Server Component — middleware handles the refresh
  }
}
```

This makes the same `createClient()` work correctly in Server Components, Server Actions, and Route Handlers.

### 2. `lib/actions/workspaces.js` — New Server Action (replaces API route)

A new file containing the `createWorkspace` Server Action marked `'use server'`.

**Responsibilities:**
1. Authenticate caller via `createClient().auth.getUser()` — throws if not authenticated
2. Validate inputs: name (required, max 80 chars), slug (required, lowercase/numbers/hyphens only, max 60 chars)
3. Ensure a profile row exists for the user (auto-create if missing — safety net for the DB FK constraint)
4. Check slug uniqueness via admin client
5. Insert workspace with `owner_id: user.id` via admin client (bypasses RLS, auth already verified in step 1)
6. Insert owner membership row (`role: 'owner'`) — critical; roll back workspace if this fails
7. Insert 7 default content pillars — non-critical; log and continue on failure
8. Return `{ error: string }` on any failure, or call `redirect()` on success

**Error handling contract:**
- Returns `{ error: 'message' }` for all user-facing errors
- The calling page checks for this and displays it in the form
- `redirect()` is called only on full success — Next.js handles the navigation

### 3. `app/dashboard/new/page.js` — Wire up Server Action

**Change:** Remove `fetch('/api/workspaces', ...)` and replace with `useTransition` + direct Server Action call.

The page remains a Client Component (`'use client'`) so the live slug preview and loading spinner still work. The Server Action is imported and called inside `startTransition`. Error state is set from the action's return value.

This pattern is the standard Next.js 15 approach for calling Server Actions from Client Components with loading state.

### 4. `app/dashboard/[slug]/page.js` — New stub workspace page

A new Server Component at `app/dashboard/[slug]/page.js`.

**Responsibilities:**
- Accept `params.slug` from the URL
- Load the workspace data from Supabase (name, slug, created_at, owner_id) via the server client
- Verify the current user is a member of this workspace (via `workspace_members` join) — return 404 if not
- Render a placeholder UI: workspace name header + "Calendar coming soon" message
- Uses the existing dashboard layout (sidebar etc.)

This page will be replaced with the real calendar view in Phase 2. Its purpose here is to (a) prove workspace creation worked end-to-end and (b) give Phase 2 a file to build on.

### 5. `app/api/workspaces/route.js` — Delete

This Route Handler was a transitional fix attempt. It is fully replaced by the Server Action and should be deleted to avoid confusion.

---

## Data Flow (After Fix)

```
User fills form → handleCreate() → startTransition(createWorkspace(name, slug))
                                         ↓ (server)
                               createClient().auth.getUser()  ← reads cookie
                                         ↓
                               createAdminClient() insert workspace
                                         ↓
                               insert workspace_members (owner)
                                         ↓
                               insert workspace_pillars (7 defaults)
                                         ↓
                               redirect(`/dashboard/${slug}`)
                                         ↓
                          app/dashboard/[slug]/page.js loads workspace
                                         ↓
                                  User sees workspace ✓
```

---

## Production Quality Checklist

- [ ] No client-side secrets — admin key stays server-only
- [ ] Input validation on both client (instant feedback) and server (security)
- [ ] Auth check before every mutation
- [ ] Atomic workspace+member creation (rollback workspace if member fails)
- [ ] Proper HTTP semantics — 409 for slug conflict, 401 for unauth, 500 for unexpected
- [ ] No silent failures — all errors surfaced to user or logged
- [ ] No orphaned rows — rollback on partial failure
- [ ] Workspace page verifies membership before rendering (no info leak)
- [ ] Uses `createAdminClient` only server-side, never imported in Client Components

---

## Out of Scope

- Full calendar view (Phase 2)
- Workspace settings / editing (Phase 2)
- Inviting team members (Phase 2)
- Real-time sync (Phase 2)
