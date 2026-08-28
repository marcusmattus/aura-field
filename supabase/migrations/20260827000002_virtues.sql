-- Virtues framework: a reflection framework conceptually distinct from the
-- chakra system (see lib/virtues.ts). Practice activity only — never a
-- measure of moral worth, spiritual worth, or character quality.

-- ---------------------------------------------------------------------------
-- Registry (read-only reference data, seeded below — mirrors sound_library
-- and mudras). App keys must match lib/virtues.ts's VIRTUE_BY_KEY exactly.
-- ---------------------------------------------------------------------------
create table if not exists public.virtues (
  key text primary key,
  name text not null,
  category text not null check (category in ('theological', 'cardinal', 'capital')),
  description text not null default '',
  counterpart text,
  reflection_themes text[] not null default '{}',
  journal_prompts text[] not null default '{}',
  practices text[] not null default '{}',
  scripture_references text[] not null default '{}',
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Per-user virtue preferences — lets a user hide one specific virtue even
-- while the Virtue framework stays on (spec's per-virtue `enabled` flag,
-- applied per user rather than globally).
-- ---------------------------------------------------------------------------
create table if not exists public.user_virtues (
  user_id uuid not null references auth.users (id) on delete cascade,
  virtue_key text not null references public.virtues (key) on delete cascade,
  hidden boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, virtue_key)
);

-- ---------------------------------------------------------------------------
-- Voluntary practice completions
-- ---------------------------------------------------------------------------
create table if not exists public.virtue_practices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  virtue_key text not null references public.virtues (key) on delete cascade,
  practice_text text not null default '',
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists virtue_practices_user_virtue_idx
  on public.virtue_practices (user_id, virtue_key, completed_at desc);

-- ---------------------------------------------------------------------------
-- Journal-surfaced virtue reflections — one row per (journal entry, virtue)
-- pairing, written whenever an entry surfaces that virtue's themes.
-- ---------------------------------------------------------------------------
create table if not exists public.virtue_reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  virtue_key text not null references public.virtues (key) on delete cascade,
  journal_entry_id uuid references public.journal_entries (id) on delete cascade,
  theme text not null default '',
  weight numeric not null default 0.5 check (weight between 0 and 1),
  created_at timestamptz not null default now()
);

create index if not exists virtue_reflections_user_virtue_idx
  on public.virtue_reflections (user_id, virtue_key, created_at desc);

-- ---------------------------------------------------------------------------
-- Activity rollup — one row per user per virtue, kept in sync by triggers
-- below so the Virtues screen never has to scan raw history.
-- ---------------------------------------------------------------------------
create table if not exists public.virtue_activity (
  user_id uuid not null references auth.users (id) on delete cascade,
  virtue_key text not null references public.virtues (key) on delete cascade,
  reflections_count int not null default 0,
  practices_count int not null default 0,
  last_activity_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, virtue_key)
);

create or replace function public.bump_virtue_activity(
  p_user_id uuid, p_virtue_key text, p_reflection boolean, p_practice boolean, p_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.virtue_activity (
    user_id, virtue_key, reflections_count, practices_count, last_activity_at, updated_at
  )
  values (
    p_user_id, p_virtue_key, case when p_reflection then 1 else 0 end,
    case when p_practice then 1 else 0 end, p_at, now()
  )
  on conflict (user_id, virtue_key) do update set
    reflections_count = public.virtue_activity.reflections_count
      + case when p_reflection then 1 else 0 end,
    practices_count = public.virtue_activity.practices_count
      + case when p_practice then 1 else 0 end,
    last_activity_at = greatest(coalesce(public.virtue_activity.last_activity_at, p_at), p_at),
    updated_at = now();
end;
$$;

create or replace function public.handle_virtue_practice_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.bump_virtue_activity(new.user_id, new.virtue_key, false, true, new.completed_at);
  return new;
end;
$$;

drop trigger if exists on_virtue_practice_insert on public.virtue_practices;
create trigger on_virtue_practice_insert
  after insert on public.virtue_practices
  for each row execute function public.handle_virtue_practice_insert();

create or replace function public.handle_virtue_reflection_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.bump_virtue_activity(new.user_id, new.virtue_key, true, false, new.created_at);
  return new;
end;
$$;

drop trigger if exists on_virtue_reflection_insert on public.virtue_reflections;
create trigger on_virtue_reflection_insert
  after insert on public.virtue_reflections
  for each row execute function public.handle_virtue_reflection_insert();

-- ---------------------------------------------------------------------------
-- Journeys — an optional, time-boxed focus on one virtue (mirrors the
-- existing 30-day Intention pattern, scoped to a single virtue).
-- ---------------------------------------------------------------------------
create table if not exists public.virtue_journeys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  virtue_key text not null references public.virtues (key) on delete cascade,
  total_days int not null default 30 check (total_days > 0),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists virtue_journeys_user_idx
  on public.virtue_journeys (user_id, started_at desc);

-- ---------------------------------------------------------------------------
-- journal_entries gains a virtue_tags column alongside the existing
-- (chakra) tags column — see lib/agents/virtue.ts.
-- ---------------------------------------------------------------------------
alter table public.journal_entries
  add column if not exists virtue_tags jsonb not null default '[]';

-- ---------------------------------------------------------------------------
-- Seed the virtue registry from lib/virtues.ts
-- ---------------------------------------------------------------------------
insert into public.virtues (key, name, category, description, counterpart, reflection_themes, journal_prompts, practices, scripture_references) values
  ('faith', 'Faith', 'theological', 'Trust, belief, commitment, and relationship with God.', null,
    array['trust', 'belief', 'commitment', 'surrender'],
    array['What are you trusting with, even without full certainty?', 'Where did you choose belief over doubt today?'],
    array['Name one thing you are choosing to trust today.'],
    array['Hebrews 11:1']),
  ('hope', 'Hope', 'theological', 'Perseverance, renewal, and expectation of good.', null,
    array['perseverance', 'renewal', 'expectation'],
    array['What are you working toward that hasn''t arrived yet?', 'Where did you choose to keep going today?'],
    array['Write one thing you are working toward.'],
    array['Romans 5:3-5']),
  ('charity', 'Charity', 'theological', 'Love, generosity, compassion, and care for others.', null,
    array['love', 'generosity', 'compassion'],
    array['Who did you care for today, and how?', 'What would generosity look like in your next interaction?'],
    array['Perform one deliberate act of generosity.'],
    array['1 Corinthians 13:4-7']),
  ('prudence', 'Prudence', 'cardinal', 'Discernment, wisdom, and thoughtful decision-making.', null,
    array['discernment', 'wisdom', 'foresight'],
    array['What decision are you weighing right now?', 'What would thoughtful discernment look like today?'],
    array['Consider the consequences of one decision before acting on it.'], array[]::text[]),
  ('justice', 'Justice', 'cardinal', 'Fairness, responsibility, and integrity.', null,
    array['fairness', 'responsibility', 'integrity'],
    array['Where did fairness matter today — to you or someone else?', 'What responsibility have you been carrying?'],
    array['Consider one situation from another person''s perspective.'], array[]::text[]),
  ('fortitude', 'Fortitude', 'cardinal', 'Courage, resilience, and perseverance.', null,
    array['courage', 'resilience', 'perseverance'],
    array['What difficulty are you facing right now?', 'Where did courage show up today, even quietly?'],
    array['Name one difficulty you are willing to face.'], array[]::text[]),
  ('temperance', 'Temperance', 'cardinal', 'Moderation, balance, and self-control.', null,
    array['moderation', 'balance', 'restraint'],
    array['Where did you find balance today — or lose it?', 'What impulse asked for your attention today?'],
    array['Pause before one habitual impulse.'], array[]::text[]),
  ('humility', 'Humility', 'capital', 'A grounded, accurate sense of self — without needing to be first.', 'pride',
    array['humility', 'groundedness', 'listening'],
    array['Where did you listen more than you spoke today?'],
    array['Listen before responding.'], array[]::text[]),
  ('generosity', 'Charity', 'capital', 'Giving freely of time, attention, or resources.', 'greed',
    array['generosity', 'giving', 'sharing'],
    array['What did you give today — time, attention, or something material?'],
    array['Perform one deliberate act of generosity.'], array[]::text[]),
  ('chastity', 'Chastity', 'capital', 'Respect and intentionality in desire and attention.', 'lust',
    array['intentionality', 'respect', 'restraint'],
    array['Where were you intentional with your attention today?'],
    array['Notice one moment of impulse before acting on it.'], array[]::text[]),
  ('gratitude', 'Gratitude', 'capital', 'Noticing and naming what is already enough.', 'envy',
    array['gratitude', 'contentment', 'noticing'],
    array['What is one thing you have that you didn''t notice until now?'],
    array['Name one thing you''re grateful for, specifically.'], array[]::text[]),
  ('kindness', 'Kindness', 'capital', 'Wishing others well, even when it costs something.', 'envy',
    array['kindness', 'goodwill', 'generosity of spirit'],
    array['Who could use a kind word from you today?'],
    array['Offer one genuine compliment.'], array[]::text[]),
  ('moderation', 'Temperance', 'capital', 'Enough, not excess — in food, media, or stimulation.', 'gluttony',
    array['moderation', 'enough', 'restraint'],
    array['Where did "enough" show up today?'],
    array['Pause before a second helping — of anything.'], array[]::text[]),
  ('patience', 'Patience', 'capital', 'Staying present through friction instead of forcing an exit.', 'wrath',
    array['patience', 'composure', 'presence'],
    array['Where did you wait, when waiting was hard?'],
    array['Take one breath before responding.'], array[]::text[]),
  ('diligence', 'Diligence', 'capital', 'Showing up for the meaningful thing before the easy thing.', 'sloth',
    array['diligence', 'follow-through', 'discipline'],
    array['What meaningful task did you complete — or avoid — today?'],
    array['Complete one meaningful task before checking your phone.'], array[]::text[])
on conflict (key) do update set
  name = excluded.name,
  category = excluded.category,
  description = excluded.description,
  counterpart = excluded.counterpart,
  reflection_themes = excluded.reflection_themes,
  journal_prompts = excluded.journal_prompts,
  practices = excluded.practices,
  scripture_references = excluded.scripture_references;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.virtues enable row level security;
alter table public.user_virtues enable row level security;
alter table public.virtue_practices enable row level security;
alter table public.virtue_reflections enable row level security;
alter table public.virtue_activity enable row level security;
alter table public.virtue_journeys enable row level security;

create policy "virtues_read" on public.virtues for select
  using (auth.role() = 'authenticated' or auth.role() = 'anon');

create policy "user_virtues_all_own" on public.user_virtues for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "virtue_practices_all_own" on public.virtue_practices for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "virtue_reflections_all_own" on public.virtue_reflections for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "virtue_activity_all_own" on public.virtue_activity for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "virtue_journeys_all_own" on public.virtue_journeys for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
