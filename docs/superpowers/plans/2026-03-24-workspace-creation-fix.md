# Workspace Creation Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix workspace creation end-to-end — correct the Supabase server client cookie pattern and create the missing workspace page that the creation flow redirects to.

**Architecture:** Two targeted changes only. The Route Handler at `app/api/workspaces/route.js` and the creation form at `app/dashboard/new/page.js` are already correct and must not be touched. Fix 1 corrects the Supabase `createClient` to follow the official `@supabase/ssr` pattern for cookie writes (try-catch setAll). Fix 2 creates the workspace page that has been missing, causing a 404 on every successful workspace creation.

**Tech Stack:** Next.js 15.5 App Router (Server Components), `@supabase/ssr` v0.5.2, Tailwind CSS v4, inline styles (existing project pattern)

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `lib/supabase/server.js` | **Modify** lines 13-15 | Replace no-op `setAll` with official try-catch pattern |
| `app/dashboard/[slug]/page.js` | **Create** | Stub workspace page — loads workspace, verifies membership, renders placeholder UI |

No other files change. Do not touch `app/api/workspaces/route.js`, `app/dashboard/new/page.js`, or `middleware.js`.

---

## Task 1: Fix `lib/supabase/server.js` — setAll cookie write pattern

**Context:** The current `createClient()` has `setAll() {}` — an empty no-op. The official `@supabase/ssr` docs require a try-catch implementation so the client works in Server Components (try-catch silently absorbs the cookie write; middleware handles session refresh) AND in Route Handlers / Server Actions (try-catch succeeds; cookies are written). Without this, any server context that needs to refresh a token will silently fail.

**File:** `lib/supabase/server.js`

Current code to replace (lines 13-15):
```js
        // Server Components are read-only — token refresh happens in middleware
        setAll() {},
```

- [ ] **Step 1: Open and read the current file**

Confirm the file looks like this before changing anything:

```js
import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        // Server Components are read-only — token refresh happens in middleware
        setAll() {},
      },
    }
  )
}

// Admin client using service role — server-side only, never import in client components
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
```

- [ ] **Step 2: Replace `setAll` with the official try-catch pattern**

The complete updated `lib/supabase/server.js`:

```js
import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component — middleware handles token refresh
          }
        },
      },
    }
  )
}

// Admin client — service role, server-side only. Never import in Client Components.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
```

- [ ] **Step 3: Verify the change looks correct**

Re-read the file and confirm:
- `setAll` now has a `try { ... } catch { }` body
- `getAll` is unchanged
- `createAdminClient` is unchanged
- No other lines were modified

- [ ] **Step 4: Commit**

```bash
cd /path/to/cadence
git add lib/supabase/server.js
git commit -m "fix: implement setAll try-catch in createClient per Supabase SSR docs"
```

Expected output: `[main xxxxxxx] fix: implement setAll try-catch in createClient per Supabase SSR docs`

---

## Task 2: Create `app/dashboard/[slug]/page.js` — Workspace stub page

**Context:** After a workspace is created, `new/page.js` calls `router.push('/dashboard/<slug>')`. That URL has no handler — `app/dashboard/[slug]/` does not exist. This causes a Next.js 404. This task creates the page that receives that redirect.

**Important Next.js 15 detail:** In Next.js 15, `params` in page/layout components is a **Promise** and must be awaited: `const { slug } = await params`. This is a breaking change from Next.js 14.

**Design system reference** (match all existing pages exactly):
- Background: `#07070E`
- Surface: `#0F0F1A`, border `#1E1E35`
- Text primary: `#F0F0F8`
- Text muted: `#8080A0`
- Text dim: `#4A4A6A`
- Accent: `#00D4FF`
- Font display: `var(--font-display, Bricolage Grotesque, sans-serif)`
- Card class: `className="card"` (defined in globals.css)

**File:** `app/dashboard/[slug]/page.js` (new file — create the directory first)

- [ ] **Step 1: Create the directory**

```bash
mkdir -p app/dashboard/\[slug\]
```

Or create it however your OS prefers — the folder name must be literally `[slug]` with square brackets (Next.js dynamic route syntax).

- [ ] **Step 2: Create the page file**

Create `app/dashboard/[slug]/page.js` with the following content:

```js
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export async function generateMetadata({ params }) {
  const { slug } = await params
  return {
    title: `${slug} — Cadence`,
  }
}

export default async function WorkspacePage({ params }) {
  const { slug } = await params

  const supabase = await createClient()

  // Auth check (middleware already handles redirect, but double-check server-side)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  // Step 1: Load workspace by slug
  // Step 2: Verify the current user is a member (security: non-members get 404)
  // NOTE: .eq() on a foreign table relation does not work in PostgREST — use two
  // separate queries instead. This is the correct pattern for this case.
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id, name, slug, created_at')
    .eq('slug', slug)
    .maybeSingle()

  if (!workspace) notFound()

  const { data: memberRow } = await supabase
    .from('workspace_members')
    .select('role, joined_at')
    .eq('workspace_id', workspace.id)
    .eq('user_id', user.id)
    .maybeSingle()

  if (!memberRow) notFound()

  const role = memberRow.role

  const createdDate = new Date(workspace.created_at).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  })

  return (
    <div style={{ padding: '48px', flex: 1 }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 40 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            {/* Workspace avatar */}
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'linear-gradient(135deg, rgba(0,212,255,0.2), rgba(123,92,246,0.2))',
              border: '1px solid rgba(0,212,255,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 20, fontWeight: 800, color: '#00D4FF',
              fontFamily: 'var(--font-display, Bricolage Grotesque, sans-serif)',
              flexShrink: 0,
            }}>
              {workspace.name?.[0]?.toUpperCase() ?? 'W'}
            </div>
            <div>
              <h1 style={{
                fontFamily: 'var(--font-display, Bricolage Grotesque, sans-serif)',
                fontSize: 26, fontWeight: 800, color: '#F0F0F8',
                letterSpacing: '-0.03em', margin: 0,
              }}>
                {workspace.name}
              </h1>
              <p style={{ color: '#4A4A6A', fontSize: 13, margin: 0 }}>
                /{workspace.slug} · Created {createdDate}
              </p>
            </div>
          </div>
        </div>

        {/* Role badge */}
        <span style={{
          fontSize: 11, fontWeight: 600, color: '#8080A0',
          textTransform: 'uppercase', letterSpacing: '0.07em',
          background: '#16162A', border: '1px solid #1E1E35',
          padding: '4px 10px', borderRadius: 6,
        }}>
          {role}
        </span>
      </div>

      {/* Coming soon placeholder */}
      <div className="card" style={{ padding: '64px 48px', textAlign: 'center' }}>
        <div style={{
          width: 72, height: 72, borderRadius: 20, margin: '0 auto 28px',
          background: 'rgba(0,212,255,0.06)',
          border: '1px solid rgba(0,212,255,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {/* Calendar icon */}
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="3" stroke="#00D4FF" strokeWidth="1.5"/>
            <path d="M3 9h18" stroke="#00D4FF" strokeWidth="1.5"/>
            <path d="M8 2v4M16 2v4" stroke="#00D4FF" strokeWidth="1.5" strokeLinecap="round"/>
            <rect x="7" y="13" width="3" height="3" rx="0.5" fill="#00D4FF" opacity="0.6"/>
            <rect x="11" y="13" width="3" height="3" rx="0.5" fill="#00D4FF" opacity="0.4"/>
            <rect x="15" y="13" width="3" height="3" rx="0.5" fill="#00D4FF" opacity="0.2"/>
          </svg>
        </div>

        <h2 style={{
          fontFamily: 'var(--font-display, Bricolage Grotesque, sans-serif)',
          fontSize: 22, fontWeight: 700, color: '#F0F0F8',
          letterSpacing: '-0.02em', marginBottom: 10,
        }}>
          Calendar coming soon
        </h2>
        <p style={{
          color: '#8080A0', fontSize: 15, lineHeight: 1.65,
          maxWidth: 400, margin: '0 auto 32px',
        }}>
          Your workspace is set up and ready. The content calendar, post scheduling,
          and pillar management features are being built for Phase 2.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/dashboard" style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            color: '#8080A0', textDecoration: 'none', fontSize: 13,
            border: '1px solid #1E1E35', borderRadius: 10,
            padding: '9px 16px', transition: 'all 0.15s',
            background: '#0F0F1A',
          }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'rgba(0,212,255,0.3)'
              e.currentTarget.style.color = '#F0F0F8'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#1E1E35'
              e.currentTarget.style.color = '#8080A0'
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M19 12H5M12 5l-7 7 7 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            All workspaces
          </Link>
          <Link href="/dashboard/new" className="btn btn-primary" style={{ fontSize: 13, padding: '9px 18px' }}>
            New workspace
          </Link>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify the query logic**

Read the file back and check:
- `params` is awaited: `const { slug } = await params`
- There are **two** separate Supabase queries: first `.from('workspaces').eq('slug', slug)`, then `.from('workspace_members').eq('workspace_id', workspace.id).eq('user_id', user.id)`
- `notFound()` is called after the first query if `workspace` is null
- `notFound()` is called after the second query if `memberRow` is null
- `workspace.name?.[0]?.toUpperCase() ?? 'W'` uses optional chaining (null-safe)
- The workspace data (`name`, `slug`, `created_at`) and `role` from `memberRow` are used correctly

- [ ] **Step 4: Commit**

```bash
git add app/dashboard/\[slug\]/page.js
git commit -m "feat: add stub workspace page at /dashboard/[slug]"
```

Expected output: `[main xxxxxxx] feat: add stub workspace page at /dashboard/[slug]`

---

## Task 3: Verify end-to-end

- [ ] **Step 1: Restart the dev server**

Stop the current `npm run dev` process (Ctrl+C in the terminal) and start it again:

```bash
npm run dev
```

This is required so Next.js detects both the new `app/dashboard/[slug]/page.js` file and the `app/api/workspaces/route.js` file that was added in a previous session.

Watch for: the terminal should show the app compiled successfully with no errors.

- [ ] **Step 2: Test workspace creation flow**

1. Open `http://localhost:3000/login` in a browser
2. Log in with your test account
3. Navigate to `/dashboard/new`
4. Enter a workspace name (e.g. "Test Brand") — the slug should auto-fill as `test-brand`
5. Click "Create workspace"

**Expected:** You should land on `/dashboard/test-brand` showing the workspace name, creation date, and "Calendar coming soon" card — no 404, no error.

- [ ] **Step 3: Test duplicate slug rejection**

Try to create another workspace with the same slug.

**Expected:** The form should show "That URL is already taken. Try a different name or slug." without reloading the page.

- [ ] **Step 4: Test unauthorized access**

Manually visit `/dashboard/some-slug-you-dont-own` in the browser.

**Expected:** Next.js 404 page (not the workspace UI). The page should not reveal whether the workspace exists.

- [ ] **Step 5: Commit a verification note if all tests pass**

```bash
git add -A
git commit -m "chore: workspace creation end-to-end verified working"
```

If any test fails, do not commit. File a bug note and debug before claiming complete.

---

## Task 4: Push to GitHub

- [ ] **Step 1: Push all commits**

```bash
git push https://YOUR_GITHUB_TOKEN@github.com/aalokandalelo-alt/cadence.git main
```

Replace `YOUR_GITHUB_TOKEN` with a fresh token from GitHub Settings → Developer settings → Personal access tokens. Do not reuse old tokens.

Expected output: `Branch 'main' set up to track remote branch 'main' from 'origin'.`

---

## Done criteria

- [ ] `lib/supabase/server.js` has `setAll` with try-catch
- [ ] `app/dashboard/[slug]/page.js` exists and shows workspace name + placeholder
- [ ] Creating a workspace navigates to `/dashboard/<slug>` without a 404
- [ ] Visiting a workspace slug you don't own returns a 404 (no info leak)
- [ ] All commits pushed to GitHub
