# Coaching App — Setup Guide

## Overview

Next.js 14 + Supabase + Tailwind + Anthropic Claude API coaching web app.
- Repo: https://github.com/zzhu0926-a11y/coaching-app
- Deploy: Vercel (connect repo, auto-deploy on push)

---

## Step 1: Create Supabase Project

1. Go to https://supabase.com → New project
2. Note down: **Project URL** and **Anon/Public Key** (from Settings → API)
3. Go to SQL Editor → run `supabase/migrations/001_initial_schema.sql`
4. (Optional) In Authentication → Providers → ensure Email is enabled

---

## Step 2: Configure Environment Variables

Edit `.env.local` (never commit this):

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
ANTHROPIC_API_KEY=your-anthropic-key
```

---

## Step 3: Create Users in Supabase

**Do NOT use the app sign-up flow** — create users via Supabase dashboard:

1. Authentication → Users → Add user (email + password)
2. After user is created, go to SQL Editor and run:

```sql
-- Create coach account (you — Zijing)
INSERT INTO public.users (id, email, name, role)
VALUES ('<user-uuid-from-auth>', 'zzhu0926@gmail.com', 'Zijing', 'coach');

-- Create client account
INSERT INTO public.users (id, email, name, role)
VALUES ('<client-uuid>', 'client@email.com', 'Client Name', 'client');

-- Create client profile
INSERT INTO public.client_profiles (user_id, package_type, start_date, goals)
VALUES ('<client-uuid>', 'foundation', '2026-03-01', 'Lose 15 lbs, build strength');
```

---

## Step 4: Deploy to Vercel

1. Go to https://vercel.com → New Project → Import from GitHub → `zzhu0926-a11y/coaching-app`
2. Add environment variables in Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `ANTHROPIC_API_KEY`
3. Deploy — done!

---

## App Routes

### Client routes
- `/dashboard` → smart redirect based on role
- `/client-dashboard` — dashboard with cycle phase, nutrition goals, quick-log
- `/log/workout` — log a workout session
- `/log/nutrition` — log meals + macros
- `/log/body` — log weight/BF%/measurements
- `/log/checkin` — daily energy/mood/sleep check-in
- `/log/cycle` — log cycle start date
- `/calculator` — calorie deficit + macro calculator (saves to goals)
- `/plan` — view active workout + nutrition plan
- `/feedback` — view coach messages

### Coach routes
- `/coach-dashboard` — all clients with activity status
- `/clients/[id]` — client detail: charts, logs, stats
- `/clients/[id]/analyze` — generate AI analysis → review → send
- `/clients/[id]/plan` — edit workout/nutrition plan
- `/clients/[id]/goals` — view/override client's nutrition goals

---

## AI Analysis Flow

1. Open a client's page → `/clients/[id]/analyze`
2. Click "Generate AI Analysis" → Claude Haiku analyzes last 4 weeks of data
3. Review the draft (edit inline if needed)
4. Click "Approve & Send" → feedback saved to DB, visible in client's `/feedback`

**Prompt includes**: workout frequency, nutrition averages, body composition trend, energy/mood/sleep averages, cycle phase coverage, and goal adherence (actual vs. target macros).

---

## Packages

| Package | Price | Notes |
|---|---|---|
| Fitness Kickstart | $249 | One-time |
| Fitness Foundation | $599/mo | `foundation` |
| Fitness Total Transformation | $699/mo | `transformation` |

Set `package_type` in client_profiles to: `kickstart`, `foundation`, or `transformation`.
