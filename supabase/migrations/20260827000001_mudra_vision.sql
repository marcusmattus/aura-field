-- Mudra Hand Alignment system: registry, sessions, per-attempt scores,
-- rolling progress, and configurable XP rules. No raw camera frames or
-- images are ever persisted here — only derived, numeric session data.

-- ---------------------------------------------------------------------------
-- Registry (read-only reference data, seeded below — mirrors sound_library)
-- ---------------------------------------------------------------------------
create table if not exists public.mudras (
  key text primary key,
  name text not null,
  sanskrit text,
  description text not null default '',
  hand text not null default 'both' check (hand in ('left', 'right', 'both')),
  difficulty text not null check (difficulty in ('beginner', 'intermediate', 'advanced')),
  fingers jsonb not null default '{}',
  reference_pose jsonb not null default '{}',
  traditional_associations jsonb not null default '{}',
  recommended_duration_s int not null default 120,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Sessions — one row per completed (or abandoned) mudra practice
-- ---------------------------------------------------------------------------
create table if not exists public.mudra_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  mudra_key text not null references public.mudras (key) on delete cascade,
  dominant_hand text not null default 'right' check (dominant_hand in ('left', 'right')),
  duration_s numeric not null,
  form_score numeric check (form_score between 0 and 100),
  attempt_count int not null default 1,
  completed boolean not null default true,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists mudra_sessions_user_idx
  on public.mudra_sessions (user_id, completed_at desc);
create index if not exists mudra_sessions_user_mudra_idx
  on public.mudra_sessions (user_id, mudra_key, completed_at desc);

-- ---------------------------------------------------------------------------
-- Attempts — the finger-by-finger breakdown for one attempt within a session
-- ---------------------------------------------------------------------------
create table if not exists public.mudra_attempts (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.mudra_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  attempt_number int not null default 1,
  form_score numeric not null check (form_score between 0 and 100),
  thumb_score numeric check (thumb_score between 0 and 100),
  index_score numeric check (index_score between 0 and 100),
  middle_score numeric check (middle_score between 0 and 100),
  ring_score numeric check (ring_score between 0 and 100),
  pinky_score numeric check (pinky_score between 0 and 100),
  palm_rotation_score numeric check (palm_rotation_score between 0 and 100),
  spacing_score numeric check (spacing_score between 0 and 100),
  created_at timestamptz not null default now()
);

create index if not exists mudra_attempts_session_idx
  on public.mudra_attempts (session_id, attempt_number);
create index if not exists mudra_attempts_user_idx
  on public.mudra_attempts (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Progress — one row per user per mudra, rolled up for the progress screen
-- ---------------------------------------------------------------------------
create table if not exists public.mudra_progress (
  user_id uuid not null references auth.users (id) on delete cascade,
  mudra_key text not null references public.mudras (key) on delete cascade,
  sessions_count int not null default 0,
  total_time_s numeric not null default 0,
  best_form_score numeric check (best_form_score between 0 and 100),
  last_form_score numeric check (last_form_score between 0 and 100),
  last_practiced_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, mudra_key)
);

-- ---------------------------------------------------------------------------
-- XP rules — configurable so payouts can be retuned without a release
-- ---------------------------------------------------------------------------
create table if not exists public.mudra_xp_rules (
  key text primary key,
  label text not null,
  xp int not null,
  updated_at timestamptz not null default now()
);

insert into public.mudra_xp_rules (key, label, xp) values
  ('complete_session', 'Complete a practice', 10),
  ('first_mudra', 'Complete your first mudra', 25),
  ('streak_7day', '7-day practice streak', 50),
  ('learn_5_mudras', 'Learn 5 mudras', 50)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Rollup trigger: keep mudra_progress in sync whenever a session completes
-- ---------------------------------------------------------------------------
create or replace function public.handle_mudra_session_upsert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.completed then
    insert into public.mudra_progress (
      user_id, mudra_key, sessions_count, total_time_s,
      best_form_score, last_form_score, last_practiced_at, updated_at
    )
    values (
      new.user_id, new.mudra_key, 1, new.duration_s,
      new.form_score, new.form_score, new.completed_at, now()
    )
    on conflict (user_id, mudra_key) do update set
      sessions_count = public.mudra_progress.sessions_count + 1,
      total_time_s = public.mudra_progress.total_time_s + excluded.total_time_s,
      best_form_score = greatest(
        coalesce(public.mudra_progress.best_form_score, 0),
        coalesce(excluded.best_form_score, 0)
      ),
      last_form_score = excluded.last_form_score,
      last_practiced_at = excluded.last_practiced_at,
      updated_at = now();
  end if;
  return new;
end;
$$;

drop trigger if exists on_mudra_session_insert on public.mudra_sessions;
create trigger on_mudra_session_insert
  after insert on public.mudra_sessions
  for each row execute function public.handle_mudra_session_upsert();

-- ---------------------------------------------------------------------------
-- Seed the ten-mudra registry (mirrors lib/vision/MudraRegistry.ts; the app
-- can run entirely off this table once cloud-first sync lands, and falls
-- back to the bundled TypeScript registry when offline or unauthenticated)
-- ---------------------------------------------------------------------------
insert into public.mudras (key, name, sanskrit, description, hand, difficulty, traditional_associations, recommended_duration_s) values
  ('gyan', 'Gyan Mudra', 'ज्ञान मुद्रा', 'The gesture of knowledge. Thumb and index meet in a gentle circle.', 'both', 'beginner',
    '{"chakras": ["third", "crown"], "themes": ["focus", "awareness", "reflection"], "bija": "OM"}', 120),
  ('chin', 'Chin Mudra', 'चिन् मुद्रा', 'Gyan Mudra turned palm-down — consciousness meeting the ground.', 'both', 'beginner',
    '{"chakras": ["root", "sacral"], "themes": ["grounding", "stillness"]}', 120),
  ('anjali', 'Anjali Mudra', 'अञ्जलि मुद्रा', 'The salutation seal — palms pressed evenly together at the heart.', 'both', 'beginner',
    '{"chakras": ["heart"], "themes": ["gratitude", "balance", "greeting"]}', 60),
  ('dhyana', 'Dhyana Mudra', 'ध्यान मुद्रा', 'The meditation seal — hands resting in a quiet, open bowl.', 'both', 'beginner',
    '{"chakras": ["crown", "soul"], "themes": ["stillness", "meditation", "surrender"]}', 300),
  ('prana', 'Prana Mudra', 'प्राण मुद्रा', 'The gesture of life-force — thumb joins ring and pinky.', 'both', 'beginner',
    '{"chakras": ["root", "sacral"], "themes": ["vitality", "energy", "renewal"]}', 180),
  ('apana', 'Apana Mudra', 'अपान मुद्रा', 'The gesture of release — thumb joins middle and ring.', 'both', 'beginner',
    '{"chakras": ["sacral", "root"], "themes": ["release", "letting go", "cleansing"]}', 180),
  ('shuni', 'Shuni Mudra', 'शूनी मुद्रा', 'The gesture of patience — thumb joins the middle finger.', 'both', 'intermediate',
    '{"chakras": ["root", "throat"], "themes": ["patience", "discipline", "restraint"]}', 150),
  ('surya', 'Surya Mudra', 'सूर्य मुद्रा', 'The gesture of the sun — the ring finger folds under the thumb.', 'both', 'intermediate',
    '{"chakras": ["solar", "root"], "themes": ["warmth", "vitality", "metabolism"]}', 150),
  ('buddhi', 'Buddhi Mudra', 'बुद्धि मुद्रा', 'The gesture of mental clarity — thumb joins the little finger.', 'both', 'beginner',
    '{"chakras": ["throat"], "themes": ["clarity", "communication", "intuition"]}', 120),
  ('hakini', 'Hakini Mudra', 'हाकिनी मुद्रा', 'The gesture of integration — every fingertip meets its twin, forming a dome.', 'both', 'advanced',
    '{"chakras": ["crown", "third"], "themes": ["integration", "memory", "wholeness"]}', 180)
on conflict (key) do update set
  name = excluded.name,
  sanskrit = excluded.sanskrit,
  description = excluded.description,
  hand = excluded.hand,
  difficulty = excluded.difficulty,
  traditional_associations = excluded.traditional_associations,
  recommended_duration_s = excluded.recommended_duration_s;

-- ---------------------------------------------------------------------------
-- RLS — every user table scoped to auth.uid(); mudras/xp rules are shared
-- read-only reference data.
-- ---------------------------------------------------------------------------
alter table public.mudras enable row level security;
alter table public.mudra_sessions enable row level security;
alter table public.mudra_attempts enable row level security;
alter table public.mudra_progress enable row level security;
alter table public.mudra_xp_rules enable row level security;

create policy "mudras_read" on public.mudras for select
  using (auth.role() = 'authenticated' or auth.role() = 'anon');

create policy "mudra_xp_rules_read" on public.mudra_xp_rules for select
  using (auth.role() = 'authenticated' or auth.role() = 'anon');

create policy "mudra_sessions_all_own" on public.mudra_sessions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "mudra_attempts_all_own" on public.mudra_attempts for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "mudra_progress_all_own" on public.mudra_progress for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
