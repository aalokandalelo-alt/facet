# Workspace Creation Fix — Design Spec
**Date:** 2026-03-24
**Status:** Approved (revised after spec review)
**Goal:** Make workspace creation work end-to-end in production using the correct Next.js 15 + Supabase SSR architecture.

---

## Problem Summary

Workspace creation is blocked by two issues:

### Issue 1 — Missing `/dashboard/[slug]` page (the actual 404)
After any successful workspace creation, the app redirects to `/dashboard/<slug>`. That route does not exist — there is no `app/dashboard/[slug]/` directory. This causes a Next.js 404 regardless of whether the workspace was created correctly in the database. This is the primary blocker.

### Issue 2 — `server.js` createClient setAll is no-op (good-practice fix)
`lib/supabase/server.js` exports `createClient()` with `setAll() {}` (no-op). The official `@supabase/ssr` docs recommend implementing `setAll` with a try-catch so the same client works correctly in Server Components (try-catch absorbs the write — middleware handles refresh) and in future Server Actions if added (write succeeds). This is not strictly required for the current Route Handler (which only reads cookies) but is the correct production pattern per Supabase docs.

---

## What Is Already Working

The Route Handler at `app/api/workspaces/route.js` (added in the previous fix) is architecturally correct:
- Auth is verified server-side via `getUser()` before any writes
- Uses the admin client to bypass RLS (intentional; auth verified in code)
- Validates inputs (name required, slug format, max lengths)
- Auto-creates profile row as FK safety net
- Checks slug uniqueness before insert
- Rolls back the workspace row if the membership insert fails
- Creates 7 default pillars (non-critical; logs and continues on failure)
- Returns proper error objects the form can display

The client-side form (`new/page.js`) already calls this route via fetch and handles errors. This does not need to change.

The dev server may need a restart to detect the new route file if it was added while the server was running.

---

## Solution: Two targeted changes

### Change 1 — Create `app/dashboard/[slug]/page.js` (critical)

A new Server Component page at `app/dashboard/[slug]/page.js`.

**Responsibilities:**
- Accept `params.slug` from the URL
- Load the workspace from Supabase by slug, joined with `workspace_members` to verify the current user is a member (security: no info leak for workspaces you don't belong to)
- If workspace not found or user is not a member → `notFound()` (Next.js 404)
- Render a working placeholder UI: workspace name, slug, creation date, and a "Calendar coming soon" message styled to match the rest of the dashboard
- Uses the existing dashboard layout automatically

This page will be replaced with the real calendar in Phase 2. Its purpose now is to (a) confirm workspace creation works end-to-end and (b) give Phase 2 a file to build on.

### Change 2 — Fix `lib/supabase/server.js` setAll (production hygiene)

Replace the no-op `setAll() {}` with the official try-catch pattern:

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

This makes the same `createClient()` work correctly in all server contexts without needing separate read/write client variants.

---

## Data Flow (After Fix)

```
User fills form → handleCreate() → fetch POST /api/workspaces
                                         ↓ (server route handler)
                               createClient().auth.getUser()  ← reads cookie
                                         ↓
                               createAdminClient() insert workspace
                                         ↓
                               insert workspace_members (owner)
                                         ↓
                               insert workspace_pillars (7 defaults)
                                         ↓
                               returns { workspace } 201
                                         ↓ (client)
                          router.push(`/dashboard/${workspace.slug}`)
                                         ↓
                          app/dashboard/[slug]/page.js loads workspace
                                         ↓
                                  User sees workspace ✓
```

---

## Files Changed

| File | Change |
|------|--------|
| `lib/supabase/server.js` | Fix setAll to use try-catch |
| `app/dashboard/[slug]/page.js` | CREATE — stub workspace page |
| `app/api/workspaces/route.js` | No change — already correct |
| `app/dashboard/new/page.js` | No change — already correct |

---

## Production Quality Checklist

- [ ] Workspace page verifies membership before rendering (no info leak)
- [ ] `notFound()` on missing workspace or unauthorized access
- [ ] `createClient()` works correctly in all server contexts (setAll fix)
- [ ] No orphaned rows — rollback on partial failure (already in route handler)
- [ ] Admin key stays server-only, never imported in Client Components
- [ ] All user-facing errors displayed in form (already in new/page.js)

---

## Out of Scope

- Full calendar view (Phase 2)
- Workspace settings / editing (Phase 2)
- Inviting team members (Phase 2)
- Real-time sync (Phase 2)
- Converting workspace creation to Server Actions (Route Handler is correct; conversion would add churn with no benefit)
