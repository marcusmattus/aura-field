/**
 * Typed database helpers for the cloud-first vertical slice.
 */

import { supabase } from '@/lib/supabase';
import type { ChakraKey, EntryTag, Modality, Protocol } from '@/lib/types';
import type { ConversationMode } from '@/lib/ai/types';

export type CheckInKind = 'morning' | 'evening';

export interface DailyCheckInInput {
  kind: CheckInKind;
  mood?: number;
  energy?: number;
  focus?: number;
  stress?: number;
  sleep?: number;
  purpose?: number;
  confidence?: number;
  body?: number;
  breathing?: number;
  wins?: string;
  challenges?: string;
  gratitude?: string;
  lessons?: string;
  journal_note?: string;
}

export interface JournalRow {
  id: string;
  user_id: string;
  body: string;
  modality: Modality;
  themes: string[];
  tags: EntryTag[];
  seeded_chakra: string | null;
  voice_storage_path: string | null;
  voice_duration_s: number | null;
  transcript: string | null;
  emotional_themes: string[];
  action_items: string[];
  created_at: string;
}

export interface ConversationRow {
  id: string;
  user_id: string;
  title: string | null;
  mode: string;
  created_at: string;
  updated_at: string;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  protocols: Protocol[];
  created_at: string;
}

export interface ChakraScoreRow {
  id: string;
  user_id: string;
  chakra_key: string;
  score: number;
  trend_7d: number;
  source: string;
  note: string | null;
  created_at: string;
}

function requireClient() {
  if (!supabase) throw new Error('Backend is not configured.');
  return supabase;
}

async function requireUserId(): Promise<string> {
  const client = requireClient();
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) throw new Error('Not authenticated.');
  return data.user.id;
}

export async function upsertDailyCheckIn(input: DailyCheckInInput) {
  const client = requireClient();
  const userId = await requireUserId();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await client
    .from('daily_checkins')
    .upsert(
      {
        user_id: userId,
        kind: input.kind,
        checkin_date: today,
        mood: input.mood ?? null,
        energy: input.energy ?? null,
        focus: input.focus ?? null,
        stress: input.stress ?? null,
        sleep: input.sleep ?? null,
        purpose: input.purpose ?? null,
        confidence: input.confidence ?? null,
        body: input.body ?? null,
        breathing: input.breathing ?? null,
        wins: input.wins ?? null,
        challenges: input.challenges ?? null,
        gratitude: input.gratitude ?? null,
        lessons: input.lessons ?? null,
        journal_note: input.journal_note ?? null,
      },
      { onConflict: 'user_id,kind,checkin_date' },
    )
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function fetchTodayCheckIns() {
  const client = requireClient();
  const userId = await requireUserId();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await client
    .from('daily_checkins')
    .select('*')
    .eq('user_id', userId)
    .eq('checkin_date', today);
  if (error) throw error;
  return data ?? [];
}

export async function createJournalEntry(input: {
  body: string;
  modality?: Modality;
  themes?: string[];
  tags?: EntryTag[];
  seededChakra?: ChakraKey;
  voiceStoragePath?: string;
  voiceDurationS?: number;
  transcript?: string;
}) {
  const client = requireClient();
  const userId = await requireUserId();
  const { data, error } = await client
    .from('journal_entries')
    .insert({
      user_id: userId,
      body: input.body,
      modality: input.modality ?? 'text',
      themes: input.themes ?? [],
      tags: input.tags ?? [],
      seeded_chakra: input.seededChakra ?? null,
      voice_storage_path: input.voiceStoragePath ?? null,
      voice_duration_s: input.voiceDurationS ?? null,
      transcript: input.transcript ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as JournalRow;
}

export async function listJournalEntries(limit = 50): Promise<JournalRow[]> {
  const client = requireClient();
  const userId = await requireUserId();
  const { data, error } = await client
    .from('journal_entries')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as JournalRow[];
}

export async function uploadVoiceNote(localUri: string, ext = 'm4a'): Promise<string> {
  const client = requireClient();
  const userId = await requireUserId();
  const path = `${userId}/${Date.now()}.${ext}`;

  const response = await fetch(localUri);
  const blob = await response.blob();

  const { error } = await client.storage.from('voice-notes').upload(path, blob, {
    contentType: blob.type || 'audio/m4a',
    upsert: false,
  });
  if (error) throw error;
  return path;
}

export async function createConversation(mode: ConversationMode = 'general', title?: string) {
  const client = requireClient();
  const userId = await requireUserId();
  const { data, error } = await client
    .from('conversations')
    .insert({
      user_id: userId,
      mode,
      title: title ?? null,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as ConversationRow;
}

export async function listConversations(limit = 30): Promise<ConversationRow[]> {
  const client = requireClient();
  const userId = await requireUserId();
  const { data, error } = await client
    .from('conversations')
    .select('*')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as ConversationRow[];
}

export async function appendMessage(input: {
  conversationId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  protocols?: Protocol[];
}) {
  const client = requireClient();
  const userId = await requireUserId();
  const { data, error } = await client
    .from('conversation_messages')
    .insert({
      conversation_id: input.conversationId,
      user_id: userId,
      role: input.role,
      content: input.content,
      protocols: input.protocols ?? [],
    })
    .select('*')
    .single();
  if (error) throw error;
  await client
    .from('conversations')
    .update({ updated_at: new Date().toISOString() })
    .eq('id', input.conversationId);
  return data as MessageRow;
}

export async function listMessages(conversationId: string): Promise<MessageRow[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('conversation_messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return (data ?? []) as MessageRow[];
}

export async function insertChakraScores(
  scores: { chakra: ChakraKey; score: number; trend7d?: number; source?: string; note?: string }[],
) {
  const client = requireClient();
  const userId = await requireUserId();
  const rows = scores.map((s) => ({
    user_id: userId,
    chakra_key: s.chakra,
    score: s.score,
    trend_7d: s.trend7d ?? 0,
    source: s.source ?? 'system',
    note: s.note ?? null,
  }));
  const { data, error } = await client.from('chakra_scores').insert(rows).select('*');
  if (error) throw error;
  return data as ChakraScoreRow[];
}

export async function fetchLatestChakraScores(): Promise<Record<ChakraKey, { score: number; trend7d: number }>> {
  const client = requireClient();
  const userId = await requireUserId();
  const { data, error } = await client
    .from('chakra_scores')
    .select('chakra_key, score, trend_7d, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(90);
  if (error) throw error;

  const latest = {} as Record<ChakraKey, { score: number; trend7d: number }>;
  for (const row of data ?? []) {
    const key = row.chakra_key as ChakraKey;
    if (!latest[key]) {
      latest[key] = { score: Number(row.score), trend7d: Number(row.trend_7d) };
    }
  }
  return latest;
}

export async function recordFrequencySession(input: {
  chakra: ChakraKey;
  baseFrequencyHz: number;
  beatFrequencyHz: number;
  durationS: number;
  brainwaveBand?: string;
}) {
  const client = requireClient();
  const userId = await requireUserId();
  const { data, error } = await client
    .from('frequency_sessions')
    .insert({
      user_id: userId,
      chakra_key: input.chakra,
      base_frequency_hz: input.baseFrequencyHz,
      beat_frequency_hz: input.beatFrequencyHz,
      duration_s: input.durationS,
      brainwave_band: input.brainwaveBand ?? null,
      completed: true,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data;
}

export async function trackAnalytics(eventName: string, properties: Record<string, unknown> = {}) {
  if (!supabase) return;
  try {
    const { data } = await supabase.auth.getUser();
    await supabase.from('analytics_events').insert({
      user_id: data.user?.id ?? null,
      event_name: eventName,
      properties,
    });
  } catch {
    /* analytics never blocks UX */
  }
}

export async function invokeFunction<T = unknown>(
  name: string,
  body: Record<string, unknown>,
): Promise<{ data: T | null; error: string | null; response: Response | null }> {
  if (!supabase) return { data: null, error: 'Backend is not configured.', response: null };
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return { data: null, error: 'Missing env', response: null };

  try {
    const response = await fetch(`${url}/functions/v1/${name}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token ?? key}`,
        apikey: key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('text/event-stream')) {
      return { data: null, error: null, response };
    }

    const json = (await response.json()) as T & { ok?: boolean; error?: string };
    if (!response.ok) {
      return {
        data: null,
        error: (json as { error?: string }).error ?? `Function ${name} failed`,
        response,
      };
    }
    return { data: json, error: null, response };
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : 'Invoke failed', response: null };
  }
}
