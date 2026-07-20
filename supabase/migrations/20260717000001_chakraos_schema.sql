-- ChakraOS cloud-first vertical slice schema
-- Profiles, check-ins, journals, conversations, memory (pgvector),
-- chakra scores, frequency/meditation sessions, sound library, analytics.

create extension if not exists "pgcrypto";
create extension if not exists "vector";

-- ---------------------------------------------------------------------------
-- Profiles (extends auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  birthdate date,
  focus_areas text[] default '{}',
  baseline_mood smallint check (baseline_mood between 1 and 5),
  experience_level text check (experience_level in ('new', 'some', 'devoted')),
  primary_intention text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- User preferences (created before auth trigger so handle_new_user can insert)
-- ---------------------------------------------------------------------------
create table if not exists public.user_preferences (
  user_id uuid primary key references auth.users (id) on delete cascade,
  ai_provider text not null default 'anthropic'
    check (ai_provider in ('anthropic', 'openai')),
  morning_reminder boolean not null default true,
  evening_reminder boolean not null default true,
  reduce_motion boolean not null default false,
  high_contrast boolean not null default false,
  preferred_session_minutes int not null default 10,
  locale text not null default 'en',
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Daily check-ins
-- ---------------------------------------------------------------------------
create table if not exists public.daily_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('morning', 'evening')),
  checkin_date date not null default (timezone('utc', now()))::date,
  mood smallint check (mood between 1 and 10),
  energy smallint check (energy between 1 and 10),
  focus smallint check (focus between 1 and 10),
  stress smallint check (stress between 1 and 10),
  sleep smallint check (sleep between 1 and 10),
  purpose smallint check (purpose between 1 and 10),
  confidence smallint check (confidence between 1 and 10),
  body smallint check (body between 1 and 10),
  breathing smallint check (breathing between 1 and 10),
  wins text,
  challenges text,
  gratitude text,
  lessons text,
  journal_note text,
  ai_summary text,
  created_at timestamptz not null default now(),
  unique (user_id, kind, checkin_date)
);

create index if not exists daily_checkins_user_date_idx
  on public.daily_checkins (user_id, checkin_date desc);

-- ---------------------------------------------------------------------------
-- Journal + voice
-- ---------------------------------------------------------------------------
create table if not exists public.journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  body text not null default '',
  modality text not null default 'text' check (modality in ('text', 'voice')),
  themes text[] not null default '{}',
  tags jsonb not null default '[]',
  seeded_chakra text,
  voice_storage_path text,
  voice_duration_s numeric,
  transcript text,
  emotional_themes text[] not null default '{}',
  action_items text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists journal_entries_user_created_idx
  on public.journal_entries (user_id, created_at desc);

create table if not exists public.voice_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  journal_entry_id uuid references public.journal_entries (id) on delete set null,
  storage_path text not null,
  duration_s numeric,
  transcript text,
  summary text,
  emotional_themes text[] not null default '{}',
  goals text[] not null default '{}',
  action_items text[] not null default '{}',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Conversations
-- ---------------------------------------------------------------------------
create table if not exists public.conversation_folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  folder_id uuid references public.conversation_folders (id) on delete set null,
  title text,
  mode text not null default 'general',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conversations_user_updated_idx
  on public.conversations (user_id, updated_at desc);

create table if not exists public.conversation_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  content text not null default '',
  protocols jsonb not null default '[]',
  created_at timestamptz not null default now()
);

create index if not exists conversation_messages_conv_idx
  on public.conversation_messages (conversation_id, created_at);

-- ---------------------------------------------------------------------------
-- Memory (pgvector)
-- ---------------------------------------------------------------------------
create table if not exists public.memory_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  source_type text not null
    check (source_type in (
      'journal', 'checkin', 'conversation', 'session', 'reflection', 'preference'
    )),
  source_id uuid,
  summary text not null,
  themes text[] not null default '{}',
  chakra_keys text[] not null default '{}',
  embedding vector(1536),
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists memory_items_user_created_idx
  on public.memory_items (user_id, created_at desc);

-- HNSW works on empty tables; ivfflat needs training rows.
create index if not exists memory_items_embedding_idx
  on public.memory_items
  using hnsw (embedding vector_cosine_ops);

-- Semantic search helper
create or replace function public.match_memory_items(
  query_embedding vector(1536),
  match_user_id uuid,
  match_count int default 8,
  match_threshold float default 0.7
)
returns table (
  id uuid,
  summary text,
  themes text[],
  chakra_keys text[],
  source_type text,
  source_id uuid,
  similarity float
)
language sql
stable
as $$
  select
    m.id,
    m.summary,
    m.themes,
    m.chakra_keys,
    m.source_type,
    m.source_id,
    1 - (m.embedding <=> query_embedding) as similarity
  from public.memory_items m
  where m.user_id = match_user_id
    and m.embedding is not null
    and 1 - (m.embedding <=> query_embedding) >= match_threshold
  order by m.embedding <=> query_embedding
  limit match_count;
$$;

-- ---------------------------------------------------------------------------
-- Chakra scores
-- ---------------------------------------------------------------------------
create table if not exists public.chakra_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  chakra_key text not null,
  score numeric not null check (score between 0 and 100),
  trend_7d numeric not null default 0,
  source text not null default 'system',
  note text,
  created_at timestamptz not null default now()
);

create index if not exists chakra_scores_user_key_idx
  on public.chakra_scores (user_id, chakra_key, created_at desc);

-- ---------------------------------------------------------------------------
-- Frequency registry + sessions
-- ---------------------------------------------------------------------------
create table if not exists public.sound_library (
  id uuid primary key default gen_random_uuid(),
  chakra_key text not null unique,
  name text not null,
  sanskrit text,
  element text,
  bija text,
  note_name text,
  base_frequency_hz numeric not null,
  beat_frequency_hz numeric not null,
  brainwave_band text not null,
  solfeggio_intent text,
  duration_s int not null default 600,
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists public.frequency_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  chakra_key text not null,
  base_frequency_hz numeric not null,
  beat_frequency_hz numeric not null,
  duration_s numeric not null,
  brainwave_band text,
  completed boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists frequency_sessions_user_idx
  on public.frequency_sessions (user_id, created_at desc);

create table if not exists public.meditation_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null default 'unguided',
  chakra_key text,
  duration_s numeric not null,
  breath_pattern text,
  completed boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Analytics (minimal)
-- ---------------------------------------------------------------------------
create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete set null,
  event_name text not null,
  properties jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_name_idx
  on public.analytics_events (event_name, created_at desc);

-- ---------------------------------------------------------------------------
-- Reflection summaries
-- ---------------------------------------------------------------------------
create table if not exists public.reflection_summaries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  period text not null check (period in ('interaction', 'daily', 'weekly', 'monthly')),
  summary text not null,
  mood_analysis text,
  themes text[] not null default '{}',
  alignment_insights jsonb not null default '{}',
  suggested_actions text[] not null default '{}',
  source_refs jsonb not null default '[]',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Seed sound library from frequency registry (no color columns — derived client-side)
-- App keys: earth, root, sacral, solar, heart, throat, third, crown, soul
-- ---------------------------------------------------------------------------
insert into public.sound_library (
  chakra_key, name, sanskrit, element, bija, note_name,
  base_frequency_hz, beat_frequency_hz, brainwave_band, solfeggio_intent, tags
) values
  ('earth', 'Earth', 'Vasundhara', 'Earth core', null, null, 174, 2.5, 'delta',
   'Foundation, safety, pain relief', array['earth', 'grounding', 'delta']),
  ('root', 'Root', 'Muladhara', 'Earth', 'LAM', 'C', 396, 7.83, 'theta',
   'Releasing fear and guilt', array['root', 'grounding', 'theta']),
  ('sacral', 'Sacral', 'Svadhisthana', 'Water', 'VAM', 'D', 417, 6.0, 'theta',
   'Facilitating change, undoing trauma', array['sacral', 'flow', 'theta']),
  ('solar', 'Solar Plexus', 'Manipura', 'Fire', 'RAM', 'E', 528, 10.0, 'alpha',
   'Transformation, repair', array['solar', 'will', 'alpha']),
  ('heart', 'Heart', 'Anahata', 'Air', 'YAM', 'F', 639, 10.0, 'alpha',
   'Connection, relationships, balance', array['heart', 'love', 'alpha']),
  ('throat', 'Throat', 'Vishuddha', 'Ether', 'HAM', 'G', 741, 8.0, 'alpha',
   'Expression, solutions, cleansing', array['throat', 'voice', 'alpha']),
  ('third', 'Third Eye', 'Ajna', 'Light', 'OM', 'A', 852, 4.0, 'theta',
   'Intuition, returning to spiritual order', array['third', 'insight', 'theta']),
  ('crown', 'Crown', 'Sahasrara', 'Consciousness', 'AUM', 'B', 963, 40.0, 'gamma',
   'Unity, divine connection', array['crown', 'awareness', 'gamma']),
  ('soul', 'Soul', 'Sutara', 'Source', null, null, 285, 35.0, 'gamma',
   'Field regeneration, higher alignment', array['soul', 'source', 'gamma'])
on conflict (chakra_key) do update set
  name = excluded.name,
  base_frequency_hz = excluded.base_frequency_hz,
  beat_frequency_hz = excluded.beat_frequency_hz,
  brainwave_band = excluded.brainwave_band,
  solfeggio_intent = excluded.solfeggio_intent;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.daily_checkins enable row level security;
alter table public.journal_entries enable row level security;
alter table public.voice_notes enable row level security;
alter table public.conversation_folders enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_messages enable row level security;
alter table public.memory_items enable row level security;
alter table public.chakra_scores enable row level security;
alter table public.sound_library enable row level security;
alter table public.frequency_sessions enable row level security;
alter table public.meditation_sessions enable row level security;
alter table public.analytics_events enable row level security;
alter table public.reflection_summaries enable row level security;

-- Profiles
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_insert_own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- Preferences
create policy "prefs_select_own" on public.user_preferences for select using (auth.uid() = user_id);
create policy "prefs_insert_own" on public.user_preferences for insert with check (auth.uid() = user_id);
create policy "prefs_update_own" on public.user_preferences for update using (auth.uid() = user_id);

-- Check-ins
create policy "checkins_all_own" on public.daily_checkins for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Journal
create policy "journal_all_own" on public.journal_entries for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "voice_all_own" on public.voice_notes for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Conversations
create policy "folders_all_own" on public.conversation_folders for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "conversations_all_own" on public.conversations for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "messages_all_own" on public.conversation_messages for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Memory / scores / sessions / reflections
create policy "memory_all_own" on public.memory_items for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "scores_all_own" on public.chakra_scores for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "freq_sessions_all_own" on public.frequency_sessions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "med_sessions_all_own" on public.meditation_sessions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "reflections_all_own" on public.reflection_summaries for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Sound library is read-only for authenticated users
create policy "sound_library_read" on public.sound_library for select
  using (auth.role() = 'authenticated' or auth.role() = 'anon');

-- Analytics: insert own or anonymous; select own
create policy "analytics_insert" on public.analytics_events for insert
  with check (user_id is null or auth.uid() = user_id);
create policy "analytics_select_own" on public.analytics_events for select
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- Storage: voice notes bucket
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'voice-notes',
  'voice-notes',
  false,
  52428800,
  array['audio/mpeg', 'audio/mp4', 'audio/m4a', 'audio/wav', 'audio/x-wav', 'audio/webm', 'audio/aac']
)
on conflict (id) do nothing;

create policy "voice_storage_select_own"
  on storage.objects for select
  using (bucket_id = 'voice-notes' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "voice_storage_insert_own"
  on storage.objects for insert
  with check (bucket_id = 'voice-notes' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "voice_storage_update_own"
  on storage.objects for update
  using (bucket_id = 'voice-notes' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "voice_storage_delete_own"
  on storage.objects for delete
  using (bucket_id = 'voice-notes' and auth.uid()::text = (storage.foldername(name))[1]);
