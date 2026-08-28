/**
 * Typed Supabase helpers for Mudra Vision. Only derived session data ever
 * crosses this boundary — no camera frames, no images. See supabase/migrations/
 * 20260827000001_mudra_vision.sql for the schema these map onto.
 */

import { supabase } from '@/lib/supabase';
import type { Handedness } from '@/lib/vision/types';

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

export interface MudraSessionRow {
  id: string;
  user_id: string;
  mudra_key: string;
  dominant_hand: Handedness;
  duration_s: number;
  form_score: number | null;
  attempt_count: number;
  completed: boolean;
  completed_at: string;
}

export interface MudraAttemptInput {
  attemptNumber: number;
  formScore: number;
  thumbScore: number;
  indexScore: number;
  middleScore: number;
  ringScore: number;
  pinkyScore: number;
  palmRotationScore: number;
  spacingScore: number;
}

export interface MudraAttemptRow {
  id: string;
  session_id: string;
  attempt_number: number;
  form_score: number;
  thumb_score: number | null;
  index_score: number | null;
  middle_score: number | null;
  ring_score: number | null;
  pinky_score: number | null;
  palm_rotation_score: number | null;
  spacing_score: number | null;
  created_at: string;
}

export interface MudraProgressRow {
  mudra_key: string;
  sessions_count: number;
  total_time_s: number;
  best_form_score: number | null;
  last_form_score: number | null;
  last_practiced_at: string | null;
}

/** Records a completed mudra-vision session. Returns the new session id. */
export async function recordMudraSession(input: {
  mudraKey: string;
  dominantHand: Handedness;
  durationS: number;
  formScore: number;
  attemptCount: number;
}): Promise<MudraSessionRow> {
  const client = requireClient();
  const userId = await requireUserId();
  const { data, error } = await client
    .from('mudra_sessions')
    .insert({
      user_id: userId,
      mudra_key: input.mudraKey,
      dominant_hand: input.dominantHand,
      duration_s: input.durationS,
      form_score: input.formScore,
      attempt_count: input.attemptCount,
      completed: true,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as MudraSessionRow;
}

/** Records one attempt's per-finger breakdown within a session. */
export async function recordMudraAttempt(
  sessionId: string,
  attempt: MudraAttemptInput,
): Promise<MudraAttemptRow> {
  const client = requireClient();
  const userId = await requireUserId();
  const { data, error } = await client
    .from('mudra_attempts')
    .insert({
      session_id: sessionId,
      user_id: userId,
      attempt_number: attempt.attemptNumber,
      form_score: attempt.formScore,
      thumb_score: attempt.thumbScore,
      index_score: attempt.indexScore,
      middle_score: attempt.middleScore,
      ring_score: attempt.ringScore,
      pinky_score: attempt.pinkyScore,
      palm_rotation_score: attempt.palmRotationScore,
      spacing_score: attempt.spacingScore,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as MudraAttemptRow;
}

/** All attempts recorded for a session, in attempt order — powers /mudras/compare. */
export async function fetchMudraAttempts(sessionId: string): Promise<MudraAttemptRow[]> {
  const client = requireClient();
  const { data, error } = await client
    .from('mudra_attempts')
    .select('*')
    .eq('session_id', sessionId)
    .order('attempt_number', { ascending: true });
  if (error) throw error;
  return data as MudraAttemptRow[];
}

/** Recent sessions for one mudra, newest first. */
export async function fetchMudraSessions(mudraKey: string, limit = 10): Promise<MudraSessionRow[]> {
  const client = requireClient();
  const userId = await requireUserId();
  const { data, error } = await client
    .from('mudra_sessions')
    .select('*')
    .eq('user_id', userId)
    .eq('mudra_key', mudraKey)
    .order('completed_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as MudraSessionRow[];
}

/** Rolled-up progress across every mudra the user has practiced. */
export async function fetchMudraProgress(): Promise<MudraProgressRow[]> {
  const client = requireClient();
  const userId = await requireUserId();
  const { data, error } = await client
    .from('mudra_progress')
    .select('mudra_key, sessions_count, total_time_s, best_form_score, last_form_score, last_practiced_at')
    .eq('user_id', userId);
  if (error) throw error;
  return data as MudraProgressRow[];
}
