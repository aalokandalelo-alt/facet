# Cadence

Your team's content rhythm, in one place.

A multi-workspace content calendar SaaS built with Next.js 16, Supabase, and Tailwind CSS.

---

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Set up environment variables
Copy `.env.example` to `.env.local` and fill in your values:
```bash
cp .env.example .env.local
```

Then open `.env.local` and add your:
- Supabase URL and keys (from Supabase → Settings → API)
- VAPID keys (generate with `npx web-push generate-vapid-keys`)
- App URL

### 3. Set up the database
1. Go to your Supabase project → SQL Editor → New query
2. Paste the entire contents of `supabase-schema.sql`
3. Click Run
4. Enable Realtime: go to Supabase → Database → Replication, and enable it for the `posts` and `notifications` tables

### 4. Run locally
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deployment (Vercel)

1. Push this repo to GitHub
2. Go to [vercel.com](https://vercel.com) → New Project → Import your GitHub repo
3. In Project Settings → Environment Variables, add all variables from `.env.local`
4. Deploy — every push to `main` auto-deploys

---

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database + Auth**: Supabase (PostgreSQL + RLS)
- **Real-time**: Supabase Realtime
- **Styling**: Tailwind CSS v4
- **Push notifications**: Web Push API + VAPID
- **Hosting**: Vercel
