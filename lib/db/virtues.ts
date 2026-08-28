/**
 * Typed Supabase helpers for the Virtues framework. See
 * supabase/migrations/20260827000002_virtues.sql for the schema.
 */

import { supabase } from '@/lib/supabase';
import type { VirtueTag } from '@/lib/types';

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

export interface VirtueActivityRow {
  virtue_key: string;
  reflections_count: number;
  practices_count: number;
  last_activity_at: string | null;
}

export interface VirtueJourneyRow {
  id: string;
  virtue_key: string;
  total_days: number;
  started_at: string;
  ended_at: string | null;
}

/** Records one journal entry's surfaced virtue themes as reflection rows. */
export async function recordVirtueReflections(
  journalEntryId: string | undefined,
  tags: VirtueTag[],
): Promise<void> {
  if (tags.length === 0) return;
  const client = requireClient();
  const userId = await requireUserId();
  const { error } = await client.from('virtue_reflections').insert(
    tags.map((t) => ({
      user_id: userId,
      virtue_key: t.virtue,
      journal_entry_id: journalEntryId ?? null,
      theme: t.theme,
      weight: t.weight,
    })),
  );
  if (error) throw error;
}

/** Records one voluntary virtue-practice completion. */
export async function recordVirtuePractice(virtueKey: string, practiceText: string): Promise<void> {
  const client = requireClient();
  const userId = await requireUserId();
  const { error } = await client
    .from('virtue_practices')
    .insert({ user_id: userId, virtue_key: virtueKey, practice_text: practiceText });
  if (error) throw error;
}

/** Rolled-up activity across every virtue the user has engaged with. */
export async function fetchVirtueActivity(): Promise<VirtueActivityRow[]> {
  const client = requireClient();
  const userId = await requireUserId();
  const { data, error } = await client
    .from('virtue_activity')
    .select('virtue_key, reflections_count, practices_count, last_activity_at')
    .eq('user_id', userId);
  if (error) throw error;
  return data as VirtueActivityRow[];
}

/** Sets whether one virtue is hidden for this user (framework stays on). */
export async function setVirtueHidden(virtueKey: string, hidden: boolean): Promise<void> {
  const client = requireClient();
  const userId = await requireUserId();
  const { error } = await client
    .from('user_virtues')
    .upsert(
      { user_id: userId, virtue_key: virtueKey, hidden, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,virtue_key' },
    );
  if (error) throw error;
}

export async function fetchHiddenVirtues(): Promise<string[]> {
  const client = requireClient();
  const userId = await requireUserId();
  const { data, error } = await client
    .from('user_virtues')
    .select('virtue_key')
    .eq('user_id', userId)
    .eq('hidden', true);
  if (error) throw error;
  return (data ?? []).map((r: { virtue_key: string }) => r.virtue_key);
}

/** Starts a new time-boxed focus on one virtue, ending any still-open one. */
export async function startVirtueJourney(virtueKey: string, totalDays: number): Promise<VirtueJourneyRow> {
  const client = requireClient();
  const userId = await requireUserId();
  await client
    .from('virtue_journeys')
    .update({ ended_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('ended_at', null);
  const { data, error } = await client
    .from('virtue_journeys')
    .insert({ user_id: userId, virtue_key: virtueKey, total_days: totalDays })
    .select('*')
    .single();
  if (error) throw error;
  return data as VirtueJourneyRow;
}

export async function fetchActiveVirtueJourney(): Promise<VirtueJourneyRow | null> {
  const client = requireClient();
  const userId = await requireUserId();
  const { data, error } = await client
    .from('virtue_journeys')
    .select('*')
    .eq('user_id', userId)
    .is('ended_at', null)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return (data as VirtueJourneyRow | null) ?? null;
}
