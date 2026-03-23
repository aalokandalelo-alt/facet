# Phase 1 Hardening — Design Spec
**Date:** 2026-03-23
**Status:** Approved
**Goal:** Make Phase 1 (auth + dashboard foundation) work correctly end-to-end with no crashes or silent failures.

---

## Problem Summary

Two categories of issues block Phase 1 from being production-ready:

### 1. Hard Blocker — tslib Build Error
The app crashes on every page load with `Module not found: Can't resolve 'tslib'`. This happens because:
- Next.js middleware bundles use the ESM version of `@supabase/auth-js`
- That ESM build imports `tslib` as a bare module specifier
- Webpack's edge/middleware bundler cannot locate `tslib` even though it's installed
- Result: entire app is broken

### 2. Code Quality Gaps — Silent Failure Risks
The code review identified issues that won't crash the app immediately but will cause data corruption or confusing errors for real users:

**Critical:**
- `app/dashboard/new/page.js` — `workspace_members` insert has no error check; user could own a workspace they can't access
- `app/dashboard/new/page.js` — `workspace_pillars` insert has no error check; workspace created without pillars breaks calendar in Phase 2
- `app/dashboard/new/page.js` — slug race condition handled only client-side; database unique violation surfaces as raw error
- `lib/supabase/server.js` — `createAdminClient` uses `require()` inside an ES module file (fragile, will break in future Node versions)
- `app/dashboard/profile/page.js` — password change doesn't verify current password (security gap)

**Important:**
- `app/api/profile/route.js` — DELETE endpoint has no CSRF protection; malicious site could delete a user's account
- `app/(auth)/signup/page.js`, `app/(auth)/forgot-password/page.js` — `NEXT_PUBLIC_APP_URL` not validated; missing env var sends broken email links silently

---

## Approach

### Fix 1 — tslib Webpack Alias (`next.config.mjs`)
Add `createRequire` from Node's built-in `module` package to get the absolute path to `tslib`, then register it as a webpack alias. This applies to all webpack builds including the middleware bundle.

```
import { createRequire } from 'module'
const _require = createRequire(import.meta.url)

webpack: (config) => {
  config.resolve.alias = { ...config.resolve.alias, tslib: _require.resolve('tslib') }
  return config
}
```

### Fix 2 — Admin Client Import (`lib/supabase/server.js`)
Replace the `require('@supabase/supabase-js')` call inside `createAdminClient` with a top-level ES import using a distinct name to avoid shadowing the exported `createClient`.

### Fix 3 — Workspace Creation Error Handling (`app/dashboard/new/page.js`)
- After `workspace_members.insert()`: if error, show message and return early
- After `workspace_pillars.insert()`: if error, log warning but continue (user can still use workspace)
- On workspace insert unique violation (`code === '23505'`): show "that URL is already taken" instead of raw DB error

### Fix 4 — Password Change Re-authentication (`app/dashboard/profile/page.js`)
Before calling `updateUser({ password })`, call `signInWithPassword({ email, password: currentPassword })`. If that fails, show "Current password is incorrect" and stop. Add a "current password" input field to the UI.

### Fix 5 — CSRF Protection on Account Delete (`app/api/profile/route.js`)
On DELETE requests, check that the `Origin` header matches `NEXT_PUBLIC_APP_URL`. If it doesn't match or is missing, return 403. This stops cross-site requests from deleting accounts.

### Fix 6 — App URL Validation (`signup/page.js`, `forgot-password/page.js`)
At the top of the signup and forgot-password handlers, check `process.env.NEXT_PUBLIC_APP_URL`. If undefined or empty, show a user-facing error: "Configuration error — please contact support." This prevents silently sending broken email links.

---

## Files Changed

| File | Changes |
|---|---|
| `next.config.mjs` | Add webpack alias for tslib |
| `lib/supabase/server.js` | Fix createAdminClient to use ES import |
| `app/dashboard/new/page.js` | Error handling for member/pillars insert, slug conflict |
| `app/dashboard/profile/page.js` | Add current password field + re-auth before password change |
| `app/api/profile/route.js` | Add CSRF origin check on DELETE |
| `app/(auth)/signup/page.js` | Validate NEXT_PUBLIC_APP_URL |
| `app/(auth)/forgot-password/page.js` | Validate NEXT_PUBLIC_APP_URL |

---

## Out of Scope (Planned for Later Phases)

| Item | Phase |
|---|---|
| Analytics / error tracking (Sentry) | Phase 5 — Production Readiness |
| Accessibility (aria labels, screen reader support) | Phase 5 — Polish |
| Design token extraction (colour constants file) | Phase 5 — Cleanup |
| OAuth login (Google, GitHub) | Phase 3 or 5 |
| Rate limiting on auth endpoints | Phase 5 |

---

## Success Criteria

After these fixes:
1. App loads at http://localhost:3000 with no build errors
2. Sign up → email confirm → login → dashboard flow works end-to-end
3. Workspace creation completes or shows a clear error (never silently breaks)
4. Password change requires the current password
5. Account deletion cannot be triggered from a third-party site
6. Missing `NEXT_PUBLIC_APP_URL` surfaces as a clear error, not a broken email
