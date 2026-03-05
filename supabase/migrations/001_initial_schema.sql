-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table (extended from Supabase auth.users)
create table public.users (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  name text,
  role text not null check (role in ('coach', 'client')) default 'client',
  created_at timestamptz default now()
);

-- Client profiles
create table public.client_profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade unique not null,
  package_type text check (package_type in ('kickstart', 'foundation', 'transformation')),
  start_date date,
  goals text,
  active boolean default true,
  created_at timestamptz default now()
);

-- Workout logs
create table public.workout_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  date date not null,
  exercises jsonb default '[]'::jsonb,
  notes text,
  duration_min int,
  created_at timestamptz default now()
);

-- Nutrition logs
create table public.nutrition_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  date date not null,
  meals jsonb default '[]'::jsonb,
  calories int,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  notes text,
  created_at timestamptz default now()
);

-- Body composition logs
create table public.body_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  date date not null,
  weight_lbs numeric,
  body_fat_pct numeric,
  waist_in numeric,
  hip_in numeric,
  notes text,
  created_at timestamptz default now()
);

-- Daily check-ins
create table public.daily_checkins (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  date date not null,
  energy int check (energy between 1 and 5),
  mood int check (mood between 1 and 5),
  sleep_hrs numeric,
  sleep_quality int check (sleep_quality between 1 and 5),
  notes text,
  created_at timestamptz default now()
);

-- Cycle logs
create table public.cycle_logs (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  cycle_start_date date not null,
  cycle_length_days int default 28,
  created_at timestamptz default now()
);

-- Nutrition goals
create table public.nutrition_goals (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references public.users(id) on delete cascade not null,
  set_by text check (set_by in ('client', 'coach')) default 'client',
  calories int,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  phase_adjustments jsonb default '{}'::jsonb,
  active boolean default true,
  created_at timestamptz default now()
);

-- Workout & nutrition plans
create table public.plans (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references public.users(id) on delete cascade not null,
  type text check (type in ('workout', 'nutrition')) not null,
  content text,
  active boolean default true,
  created_at timestamptz default now()
);

-- AI feedback drafts and sent messages
create table public.feedback (
  id uuid primary key default uuid_generate_v4(),
  client_id uuid references public.users(id) on delete cascade not null,
  coach_id uuid references public.users(id) on delete cascade not null,
  ai_draft text,
  coach_edit text,
  sent_at timestamptz,
  created_at timestamptz default now()
);

-- RLS Policies

-- Enable RLS
alter table public.users enable row level security;
alter table public.client_profiles enable row level security;
alter table public.workout_logs enable row level security;
alter table public.nutrition_logs enable row level security;
alter table public.body_logs enable row level security;
alter table public.daily_checkins enable row level security;
alter table public.cycle_logs enable row level security;
alter table public.nutrition_goals enable row level security;
alter table public.plans enable row level security;
alter table public.feedback enable row level security;

-- Users: can read own row; coach can read all
create policy "users_self_read" on public.users for select using (auth.uid() = id);
create policy "users_coach_read" on public.users for select using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'coach')
);
create policy "users_insert" on public.users for insert with check (auth.uid() = id);
create policy "users_self_update" on public.users for update using (auth.uid() = id);

-- Client can read/write own logs; coach can read all
create policy "workout_self" on public.workout_logs for all using (auth.uid() = user_id);
create policy "workout_coach" on public.workout_logs for select using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'coach')
);

create policy "nutrition_self" on public.nutrition_logs for all using (auth.uid() = user_id);
create policy "nutrition_coach" on public.nutrition_logs for select using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'coach')
);

create policy "body_self" on public.body_logs for all using (auth.uid() = user_id);
create policy "body_coach" on public.body_logs for select using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'coach')
);

create policy "checkin_self" on public.daily_checkins for all using (auth.uid() = user_id);
create policy "checkin_coach" on public.daily_checkins for select using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'coach')
);

create policy "cycle_self" on public.cycle_logs for all using (auth.uid() = user_id);
create policy "cycle_coach" on public.cycle_logs for select using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'coach')
);

create policy "goals_client" on public.nutrition_goals for all using (auth.uid() = client_id);
create policy "goals_coach" on public.nutrition_goals for all using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'coach')
);

create policy "plans_client" on public.plans for select using (auth.uid() = client_id);
create policy "plans_coach" on public.plans for all using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'coach')
);

create policy "feedback_client" on public.feedback for select using (auth.uid() = client_id);
create policy "feedback_coach" on public.feedback for all using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'coach')
);

create policy "profiles_self" on public.client_profiles for all using (auth.uid() = user_id);
create policy "profiles_coach" on public.client_profiles for all using (
  exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'coach')
);
