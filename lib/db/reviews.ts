/**
 * Typed Supabase helpers for weekly/monthly reviews, backed by the existing
 * public.reflection_summaries table. The `reflect` edge function writes
 * here too (with optional LLM narration) — this module additionally lets
 * the client insert a purely deterministic review directly when the edge
 * function is unavailable, so a review is never lost to a network blip.
 */

import { supabase } from '@/lib/supabase';
import type { ChakraKey, ReviewPeriod } from '@/lib/types';

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

export interface ReflectionSummaryRow {
  id: string;
  period: string;
  summary: string;
  mood_analysis: string | null;
  themes: string[];
  alignment_insights: unknown;
  suggested_actions: string[];
  created_at: string;
}

/** Direct, deterministic-only insert — used when the `reflect` edge
 * function couldn't be reached, so the review is still saved. */
export async function saveDeterministicReview(
  period: ReviewPeriod,
  summary: string,
  topRisingChakra: ChakraKey | null,
): Promise<ReflectionSummaryRow> {
  const client = requireClient();
  const userId = await requireUserId();
  const { data, error } = await client
    .from('reflection_summaries')
    .insert({
      user_id: userId,
      period,
      summary,
      themes: topRisingChakra ? [topRisingChakra] : [],
      alignment_insights: {},
      suggested_actions: [],
      source_refs: [{ type: 'review-deterministic' }],
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as ReflectionSummaryRow;
}

export async function listReviews(period: ReviewPeriod, limit = 12): Promise<ReflectionSummaryRow[]> {
  const client = requireClient();
  const userId = await requireUserId();
  const { data, error } = await client
    .from('reflection_summaries')
    .select('*')
    .eq('user_id', userId)
    .eq('period', period)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data as ReflectionSummaryRow[];
}
