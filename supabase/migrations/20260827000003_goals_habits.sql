-- Goals & habits (M9 — Advanced Personal OS). Weekly/monthly reviews reuse
-- the existing public.reflection_summaries table from the vertical-slice
-- schema (period already supports 'weekly'/'monthly') — nothing new needed
-- there beyond a direct-insert RLS policy, which it already has.

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  intention text not null default '',
  chakra_key text,
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  target_date date,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists goals_user_status_idx
  on public.goals (user_id, status, created_at desc);

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  goal_id uuid references public.goals (id) on delete set null,
  title text not null,
  cadence text not null default 'daily' check (cadence in ('daily', 'weekly')),
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists habits_user_idx
  on public.habits (user_id, created_at desc);

create table if not exists public.habit_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  habit_id uuid not null references public.habits (id) on delete cascade,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists habit_events_habit_idx
  on public.habit_events (habit_id, completed_at desc);
create index if not exists habit_events_user_idx
  on public.habit_events (user_id, completed_at desc);

alter table public.goals enable row level security;
alter table public.habits enable row level security;
alter table public.habit_events enable row level security;

create policy "goals_all_own" on public.goals for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "habits_all_own" on public.habits for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "habit_events_all_own" on public.habit_events for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
