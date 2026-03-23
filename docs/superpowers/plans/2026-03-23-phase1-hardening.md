# Phase 1 Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the `tslib` build error that breaks the app, then harden all Phase 1 code against silent failures and security gaps.

**Architecture:** Seven targeted file edits — one per issue. No new files needed. No dependencies to install. Each task is self-contained and can be verified independently. The webpack alias fix (Task 1) unblocks everything else; all other tasks are independent of each other.

**Tech Stack:** Next.js 15 App Router, @supabase/ssr v0.5.2, @supabase/supabase-js v2.45.0, Tailwind CSS v4, Node.js (ES Modules), no test framework installed.

**Spec:** `docs/superpowers/specs/2026-03-23-phase1-hardening-design.md`

---

## Initialisation

- [ ] **Init git repo** (no history exists yet)

```bash
cd C:\Users\anura\Cadence\Cadence\cadence
git init
git add .
git commit -m "chore: initial commit — Phase 1 foundation before hardening"
```

---

## Task 1: Fix tslib webpack alias (BLOCKER — do this first)

**Files:**
- Modify: `next.config.mjs`

**What:** Add a `createRequire`-based webpack alias so webpack can always locate `tslib` in the middleware bundle.

**Why:** The ESM build of `@supabase/auth-js` imports `tslib` as a bare module specifier. The edge/middleware webpack bundler can't resolve it even though it's installed. An explicit alias tells webpack exactly where the file is.

- [ ] **Step 1: Edit `next.config.mjs`**

Replace the entire file with the following:

```js
import { createRequire } from 'module'
const _require = createRequire(import.meta.url)

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Fix: webpack can't resolve tslib inside Supabase packages in the middleware
  // bundle unless we explicitly alias it to the installed location.
  transpilePackages: [
    '@supabase/supabase-js',
    '@supabase/auth-js',
    '@supabase/ssr',
    '@supabase/functions-js',
    '@supabase/realtime-js',
    '@supabase/storage-js',
    '@supabase/postgrest-js',
  ],

  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      tslib: _require.resolve('tslib'),
    }
    return config
  },

  // Allow images from Supabase storage
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        ],
      },
      {
        source: '/api/(.*)',
        headers: [
          { key: 'Cache-Control', value: 'private, no-store' },
        ],
      },
    ]
  },
}

export default nextConfig
```

- [ ] **Step 2: Stop dev server** (Ctrl+C in the terminal running `npm run dev`)

- [ ] **Step 3: Clear Next.js cache and restart**

```powershell
Remove-Item -Recurse -Force .next
npm run dev
```

- [ ] **Step 4: Verify fix**

Open http://localhost:3000 in the browser. Expected: no Build Error overlay, page loads (shows login or dashboard depending on session).

If still failing: check terminal for any new error message and report it.

- [ ] **Step 5: Commit**

```bash
git add next.config.mjs
git commit -m "fix: resolve tslib in middleware via webpack alias"
```

---

## Task 2: Fix admin client ES module import

**Files:**
- Modify: `lib/supabase/server.js`

**What:** Replace the `require('@supabase/supabase-js')` call inside `createAdminClient` with a top-level ES import. Using `require()` inside an ES module (`.js` file in a Next.js 15 project) is fragile and will break in future Node.js versions.

**Why:** The file already uses `import` at the top — mixing `require()` inside a function is inconsistent and will cause a hard error in stricter environments.

- [ ] **Step 1: Edit `lib/supabase/server.js`**

Replace the entire file with:

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

- [ ] **Step 2: Verify dev server still runs with no errors**

Check terminal — should be no new errors. Reload http://localhost:3000.

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/server.js
git commit -m "fix: use ES import for createAdminClient instead of require()"
```

---

## Task 3: Fix workspace creation error handling

**Files:**
- Modify: `app/dashboard/new/page.js`

**What:** Three fixes in the `handleCreate` function:
1. If the database rejects the workspace slug as a duplicate (unique constraint violation, error code `23505`), show "That URL is already taken" instead of a raw database error.
2. If inserting the user as a workspace member fails, show a clear error and stop — don't navigate away.
3. If inserting default pillars fails, log the warning but still navigate to the workspace (pillars can be recreated; missing membership cannot).

- [ ] **Step 1: Edit `app/dashboard/new/page.js` — replace the `handleCreate` function**

Find this block (starting at `async function handleCreate`):

```js
  async function handleCreate(e) {
    e.preventDefault()
    setError('')

    if (!name.trim()) { setError('Workspace name is required.'); return }
    if (!slug.trim()) { setError('Workspace slug is required.'); return }

    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Check slug uniqueness
    const { data: existing } = await supabase
      .from('workspaces')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (existing) {
      setError('That URL is already taken. Try a different name or slug.')
      setLoading(false)
      return
    }

    // Create workspace
    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .insert({ name: name.trim(), slug, owner_id: user.id })
      .select()
      .single()

    if (wsError) {
      setError(wsError.message)
      setLoading(false)
      return
    }

    // Add owner as workspace member
    await supabase.from('workspace_members').insert({
      workspace_id: workspace.id,
      user_id: user.id,
      role: 'owner',
    })

    // Create default content pillars
    const defaultPillars = [
      { name: 'Educational', color: '#3B82F6', sort_order: 0 },
      { name: 'Promotional', color: '#F59E0B', sort_order: 1 },
      { name: 'Behind the Scenes', color: '#8B5CF6', sort_order: 2 },
      { name: 'Repurposed', color: '#10B981', sort_order: 3 },
      { name: 'Trending / Reactive', color: '#EF4444', sort_order: 4 },
      { name: 'UGC', color: '#F97316', sort_order: 5 },
      { name: 'Entertainment', color: '#EC4899', sort_order: 6 },
    ]
    await supabase.from('workspace_pillars').insert(
      defaultPillars.map(p => ({ ...p, workspace_id: workspace.id, is_default: true }))
    )

    router.push(`/dashboard/${workspace.slug}`)
    router.refresh()
  }
```

Replace it with:

```js
  async function handleCreate(e) {
    e.preventDefault()
    setError('')

    if (!name.trim()) { setError('Workspace name is required.'); return }
    if (!slug.trim()) { setError('Workspace slug is required.'); return }

    setLoading(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/login'); return }

    // Check slug uniqueness client-side first (fast path)
    const { data: existing } = await supabase
      .from('workspaces')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()

    if (existing) {
      setError('That URL is already taken. Try a different name or slug.')
      setLoading(false)
      return
    }

    // Create workspace
    const { data: workspace, error: wsError } = await supabase
      .from('workspaces')
      .insert({ name: name.trim(), slug, owner_id: user.id })
      .select()
      .single()

    if (wsError) {
      // Handle database-level unique violation (race condition fallback)
      if (wsError.code === '23505') {
        setError('That URL is already taken. Try a different name or slug.')
      } else {
        setError(wsError.message)
      }
      setLoading(false)
      return
    }

    // Add owner as workspace member — critical: without this, user can't access the workspace
    const { error: memberError } = await supabase.from('workspace_members').insert({
      workspace_id: workspace.id,
      user_id: user.id,
      role: 'owner',
    })

    if (memberError) {
      setError('Workspace was created but we could not add you as a member. Please try again or contact support.')
      setLoading(false)
      return
    }

    // Create default content pillars — non-critical: failure doesn't block workspace use
    const defaultPillars = [
      { name: 'Educational', color: '#3B82F6', sort_order: 0 },
      { name: 'Promotional', color: '#F59E0B', sort_order: 1 },
      { name: 'Behind the Scenes', color: '#8B5CF6', sort_order: 2 },
      { name: 'Repurposed', color: '#10B981', sort_order: 3 },
      { name: 'Trending / Reactive', color: '#EF4444', sort_order: 4 },
      { name: 'UGC', color: '#F97316', sort_order: 5 },
      { name: 'Entertainment', color: '#EC4899', sort_order: 6 },
    ]
    const { error: pillarsError } = await supabase.from('workspace_pillars').insert(
      defaultPillars.map(p => ({ ...p, workspace_id: workspace.id, is_default: true }))
    )
    if (pillarsError) {
      console.warn('Default pillars failed to create — workspace still usable:', pillarsError.message)
    }

    router.push(`/dashboard/${workspace.slug}`)
    router.refresh()
  }
```

- [ ] **Step 2: Verify**

In the browser, try creating a workspace. Should work normally. Try creating a second workspace with the same slug — should show "That URL is already taken."

- [ ] **Step 3: Commit**

```bash
git add "app/dashboard/new/page.js"
git commit -m "fix: add error handling for workspace member/pillars insert and slug conflicts"
```

---

## Task 4: Add current-password verification before password change

**Files:**
- Modify: `app/dashboard/profile/page.js`

**What:** The password change form currently has no "Current password" field. Add one, and before updating the password, call `signInWithPassword` with the current password to verify the user knows it. If verification fails, show an error and stop.

- [ ] **Step 1: Edit `app/dashboard/profile/page.js` — replace the password change section**

The `handleChangePassword` function currently starts with `async function handleChangePassword(e)`. Replace it with:

```js
  async function handleChangePassword(e) {
    e.preventDefault()
    setPasswordMsg(null)

    if (!currentPassword) {
      setPasswordMsg({ type: 'error', text: 'Please enter your current password.' })
      return
    }
    if (newPassword.length < 8) {
      setPasswordMsg({ type: 'error', text: 'New password must be at least 8 characters.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: 'error', text: 'Passwords do not match.' })
      return
    }

    setSavingPassword(true)
    const supabase = createClient()

    // Verify current password before allowing the change
    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })

    if (verifyError) {
      setPasswordMsg({ type: 'error', text: 'Current password is incorrect.' })
      setSavingPassword(false)
      return
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword })

    setPasswordMsg(error
      ? { type: 'error', text: error.message }
      : { type: 'success', text: 'Password updated successfully.' }
    )
    if (!error) {
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }
    setSavingPassword(false)
  }
```

- [ ] **Step 2: Add "Current password" input field to the password form UI**

In the JSX, find the password form. It currently has two fields: "New password" and "Confirm new password". Add a "Current password" field as the FIRST field in the form:

Find this in the JSX (inside the `<form onSubmit={handleChangePassword}` section):
```jsx
          <div>
            <label style={{ display: 'block', fontSize: 13, color: '#8080A0', marginBottom: 6 }}>
              New password
            </label>
```

Insert this block BEFORE it:
```jsx
          <div>
            <label style={{ display: 'block', fontSize: 13, color: '#8080A0', marginBottom: 6 }}>
              Current password
            </label>
            <input
              className="input"
              type="password"
              value={currentPassword}
              onChange={e => setCurrentPassword(e.target.value)}
              placeholder="Your current password"
              autoComplete="current-password"
            />
          </div>
```

- [ ] **Step 3: Update the submit button disabled condition**

Find:
```jsx
              disabled={savingPassword || !newPassword || !confirmPassword}
```

Replace with:
```jsx
              disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
```

- [ ] **Step 4: Verify**

Go to /dashboard/profile. The password section should now have 3 fields: Current password, New password, Confirm new password. Try changing password with wrong current password — should show "Current password is incorrect."

- [ ] **Step 5: Commit**

```bash
git add "app/dashboard/profile/page.js"
git commit -m "fix: require current password verification before password change"
```

---

## Task 5: Add CSRF protection to account deletion endpoint

**Files:**
- Modify: `app/api/profile/route.js`

**What:** The DELETE `/api/profile` endpoint currently accepts requests from any origin. Add an `Origin` header check: if the request doesn't come from the app's own URL, return 403 Forbidden.

**Why:** Without this, a malicious website could embed a hidden request that deletes a logged-in user's account when they visit the page.

- [ ] **Step 1: Edit `app/api/profile/route.js`**

Replace the entire file with:

```js
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// DELETE /api/profile — deletes the authenticated user's account
export async function DELETE(request) {
  // CSRF protection: only allow requests from our own app
  const origin = request.headers.get('origin')
  const appUrl = process.env.NEXT_PUBLIC_APP_URL

  if (!origin || !appUrl || origin !== appUrl) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createClient()
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (!user || userError) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Use admin client to delete the auth user (which cascades via RLS)
  const adminClient = createAdminClient()
  const { error } = await adminClient.auth.admin.deleteUser(user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
```

- [ ] **Step 2: Verify `NEXT_PUBLIC_APP_URL` is set in `.env.local`**

Open `.env.local` and confirm this line exists:
```
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

If missing, add it.

- [ ] **Step 3: Verify**

The delete account button in /dashboard/profile should still work normally (since the browser sends the correct `Origin` header for same-site requests).

- [ ] **Step 4: Commit**

```bash
git add "app/api/profile/route.js"
git commit -m "fix: add CSRF origin check to DELETE /api/profile"
```

---

## Task 6: Validate NEXT_PUBLIC_APP_URL in auth pages

**Files:**
- Modify: `app/(auth)/signup/page.js`
- Modify: `app/(auth)/forgot-password/page.js`

**What:** If `NEXT_PUBLIC_APP_URL` is missing or empty, email confirmation and password reset links will be silently broken (Supabase will redirect to `undefined/api/auth/callback`). Catch this and show a clear error instead.

- [ ] **Step 1: Edit `app/(auth)/signup/page.js` — add env check to `handleSignup`**

Find this line at the start of `handleSignup`:
```js
    if (password.length < 8) {
```

Insert BEFORE it:
```js
    if (!process.env.NEXT_PUBLIC_APP_URL) {
      setError('Configuration error: NEXT_PUBLIC_APP_URL is not set. Please contact support.')
      return
    }
```

- [ ] **Step 2: Edit `app/(auth)/forgot-password/page.js` — add env check to `handleReset`**

Find this line at the start of `handleReset`:
```js
    const supabase = createClient()
```

Insert BEFORE it:
```js
    if (!process.env.NEXT_PUBLIC_APP_URL) {
      setError('Configuration error: NEXT_PUBLIC_APP_URL is not set. Please contact support.')
      setLoading(false)
      return
    }
```

- [ ] **Step 3: Verify**

Both signup and forgot-password forms should work normally when `NEXT_PUBLIC_APP_URL` is set in `.env.local`.

- [ ] **Step 4: Commit**

```bash
git add "app/(auth)/signup/page.js" "app/(auth)/forgot-password/page.js"
git commit -m "fix: validate NEXT_PUBLIC_APP_URL before sending email links"
```

---

## Task 7: Final verification

- [ ] **Step 1: Restart dev server clean**

```powershell
Remove-Item -Recurse -Force .next
npm run dev
```

- [ ] **Step 2: Verify app loads**

Open http://localhost:3000 — should redirect to `/login` with no errors.

- [ ] **Step 3: Verify auth flow**

Sign up with a new email → check email for confirmation link → click it → should land on /dashboard.

- [ ] **Step 4: Verify workspace creation**

Click "Create workspace" → fill in name → submit. Should redirect to `/dashboard/<slug>`. Try creating a second workspace with the same slug — should show "That URL is already taken."

- [ ] **Step 5: Verify password change**

Go to /dashboard/profile → try changing password with wrong current password → should see error. Try with correct current password → should succeed.

- [ ] **Step 6: Final commit**

```bash
git add .
git commit -m "chore: Phase 1 hardening complete — all critical and important issues resolved"
```

---

## Summary of Changes

| Task | File | Change |
|---|---|---|
| 1 | `next.config.mjs` | Add webpack tslib alias (BLOCKER fix) |
| 2 | `lib/supabase/server.js` | Fix createAdminClient ES import |
| 3 | `app/dashboard/new/page.js` | Error handling for member/pillars/slug |
| 4 | `app/dashboard/profile/page.js` | Current password verification |
| 5 | `app/api/profile/route.js` | CSRF origin check on DELETE |
| 6 | `app/(auth)/signup/page.js` | Validate NEXT_PUBLIC_APP_URL |
| 6 | `app/(auth)/forgot-password/page.js` | Validate NEXT_PUBLIC_APP_URL |
