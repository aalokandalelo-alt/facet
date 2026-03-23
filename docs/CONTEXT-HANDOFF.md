# Cadence — Project Handoff Context

Use this document to start a new conversation without re-explaining the project.

---

## What Cadence Is

A multi-workspace content calendar SaaS app. Users can create workspaces (one per brand/client/project), plan social media posts on a calendar, tag them with content pillars, and track their status from Idea → Draft → Ready → Scheduled → Posted.

**GitHub:** https://github.com/aalokandalelo-alt/cadence

---

## Tech Stack

- **Framework:** Next.js 15.5 (App Router, Server Components)
- **Database + Auth:** Supabase (PostgreSQL + `@supabase/ssr` v0.5.2)
- **Styling:** Tailwind CSS v4 + inline styles (dark theme throughout)
- **Language:** JavaScript (no TypeScript)
- **Node:** v22

**Key architectural patterns:**
- Server Components do all data fetching via `createClient()` from `lib/supabase/server.js`
- Mutations go through API Route Handlers in `app/api/` using `createAdminClient()` (service role, bypasses RLS, auth verified server-side first)
- Interactive UI (hover effects, forms, event handlers) lives in `'use client'` components inside `_components/` folders
- Middleware at `middleware.js` protects `/dashboard` routes and refreshes sessions

---

## What's Been Built (Phase 1 — Complete)

| Route | What it does |
|-------|-------------|
| `/login` | Email + password login |
| `/signup` | Account creation with full name |
| `/forgot-password` | Send reset email |
| `/reset-password` | Set new password from email link |
| `/dashboard` | Workspace list with cards; auto-redirects if only one workspace |
| `/dashboard/new` | Create a workspace (name + slug); auto-creates 7 default content pillars |
| `/dashboard/[slug]` | Workspace stub page — shows name, role, "Calendar coming soon" placeholder |
| `/dashboard/profile` | Change name, change password (with current password verification), delete account |
| `/api/workspaces` | POST — creates workspace + owner membership + default pillars |
| `/api/profile` | DELETE — deletes account (CSRF protected) |
| `/api/auth/callback` | Handles Supabase email auth callback |

---

## Database Tables (All Created in Supabase)

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (mirrors auth.users) |
| `workspaces` | Workspaces with name, slug, owner_id |
| `workspace_members` | Who belongs to which workspace + role (owner/admin/member) |
| `workspace_invites` | Pending email invitations |
| `workspace_pillars` | Content categories per workspace (colour-coded) |
| `posts` | The actual content posts — see schema below |
| `post_reminders` | Scheduled reminders per post per user |
| `push_subscriptions` | Web push tokens |
| `notifications` | In-app notification feed |

**Posts table fields:**
- `platform` (text) — e.g. "Instagram", "TikTok", "LinkedIn"
- `content_pillar` (text) — references a pillar name
- `topic` (text, required) — the post topic/title
- `status` (text) — `'Idea' | 'Draft' | 'Ready' | 'Scheduled' | 'Posted'`
- `post_date` (date) — scheduled date
- `post_time` (text) — scheduled time as string
- `notes` (text) — optional notes
- `attachment_url` (text) — optional media attachment

**Default content pillars** (created automatically per workspace):
Educational, Promotional, Behind the Scenes, Repurposed, Trending / Reactive, UGC, Entertainment

---

## File Structure

```
app/
  (auth)/               — login, signup, forgot-password, reset-password
  api/
    auth/callback/      — Supabase email callback
    profile/            — DELETE account
    workspaces/         — POST create workspace
  dashboard/
    _components/
      workspace-grid.js — 'use client' — workspace cards with hover
    [slug]/
      _components/
        workspace-nav-buttons.js — 'use client' — nav buttons
      page.js           — workspace stub page (REPLACE IN PHASE 2)
    layout.js           — sidebar + auth check
    new/page.js         — create workspace form
    page.js             — workspace list
    profile/page.js     — user settings
  layout.js             — root layout
  page.js               — redirects to /dashboard
lib/
  supabase/
    client.js           — createBrowserClient (for Client Components)
    server.js           — createClient() + createAdminClient() (for Server Components + API routes)
  actions/              — (empty, ready for Server Actions in Phase 2)
components/
  ui/
    Sidebar.js          — main navigation sidebar
middleware.js           — session refresh + route protection
```

---

## What Comes Next (Phase 2)

The workspace page currently shows "Calendar coming soon." Phase 2 replaces it with the real calendar. The recommended build order:

**Phase 2A — Calendar view + Post creation (do these together)**
- Monthly calendar grid inside `/dashboard/[slug]` — posts shown on their scheduled dates, colour-coded by content pillar
- Slide-out panel or modal to create/edit a post (platform, pillar, topic, date, time, status, notes)
- The `posts` table and `workspace_pillars` table are already in the database, ready to use

**Phase 2B — Stats bar**
- Strip at the top of the calendar showing: total posts this month, breakdown by status, breakdown by platform

**Phase 2C — Pillars management**
- Page/panel to view, rename, recolour, add, or delete content pillars for the workspace

**Phase 2D — Team invitations**
- Invite a collaborator by email; they receive a link and join the workspace with member/admin role

---

## Design System

Dark theme. All colours:
- Background: `#07070E`
- Surface: `#0F0F1A`, border: `#1E1E35`
- Surface 2: `#16162A`, border 2: `#2A2A45`
- Text primary: `#F0F0F8`, muted: `#8080A0`, dim: `#4A4A6A`
- Accent cyan: `#00D4FF`
- Success: `#00C896`, Warning: `#F0A020`, Error: `#FF4060`
- Font body: Figtree / Inter; Font display (headings): Bricolage Grotesque

CSS classes available: `.btn.btn-primary`, `.btn.btn-secondary`, `.card`, `.input`

---

## Key Rules to Follow

1. **Server Components fetch data.** Never use `useState` or `useEffect` in pages — use async Server Components with `createClient()`.
2. **Mutations go through API Route Handlers** in `app/api/` using `createAdminClient()`. Always verify auth with `getUser()` before any write.
3. **Event handlers go in `'use client'` components** in `_components/` folders. Never put `onClick`, `onMouseEnter` etc. in Server Component files.
4. **`params` must be awaited** in Next.js 15: `const { slug } = await params`.
5. **Never use `.eq('relation.column', value)`** in Supabase — that doesn't work in PostgREST. Use two separate queries instead.
6. **No TypeScript** — this project is plain JavaScript.
