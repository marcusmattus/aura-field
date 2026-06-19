import type { CoachReply } from '@/lib/agents/coach';
import type { AnalyzeResult } from '@/lib/agents/awareness';
import { supabase } from '@/lib/supabase';
import type { ChakraState, JournalEntry, Modality, Protocol } from '@/lib/types';

/**
 * Remote agent bridge. Each function calls a Supabase Edge Function that wraps
 * the Anthropic API. If the backend or the Anthropic key is absent, or the
 * call fails / times out, these return null and the caller falls back to the
 * deterministic core — the UI never stalls.
 */

const TIMEOUT_MS = 6000;

async function invoke<T>(fn: string, body: Record<string, unknown>): Promise<T | null> {
  if (!supabase) return null;
  try {
    const result = await Promise.race([
      supabase.functions.invoke(fn, { body }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), TIMEOUT_MS)),
    ]);
    if (result.error || !result.data) return null;
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- result.data is unknown; cast is necessary for Supabase edge function response
    const data = result.data as { ok?: boolean } & T;
    if (data.ok === false) return null;
    return data;
  } catch {
    return null;
  }
}

export async function remoteAnalyze(
  body: string,
  modality: Modality,
  seededChakra?: string,
): Promise<AnalyzeResult | null> {
  const data = await invoke<{ result?: AnalyzeResult }>('journal-analyze', {
    body,
    modality,
    seededChakra,
  });
  return data?.result ?? null;
}

export async function remoteCoach(args: {
  userText: string;
  states: ChakraState[];
  entries: JournalEntry[];
  distress: boolean;
}): Promise<CoachReply | null> {
  // Only send aggregate field state + counts, never raw entry bodies wholesale.
  const summary = args.entries.slice(0, 8).map((e) => ({
    themes: e.themes,
    createdAt: e.createdAt,
  }));
  const data = await invoke<{
    reply?: { content: string; protocols: Protocol[]; crisis: boolean };
  }>('coach-respond', {
    userText: args.userText,
    states: args.states,
    entrySummary: summary,
    distress: args.distress,
  });
  return data?.reply ?? null;
}
