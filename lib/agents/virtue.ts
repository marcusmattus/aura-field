/**
 * VirtueReflectionEngine (deterministic core). Mirrors the Awareness agent's
 * lexicon approach (lib/agents/awareness.ts) but surfaces virtue themes
 * instead of chakra energy signals — virtues are never scored up or down,
 * only noticed.
 *
 * Three things this engine keeps strictly separate (spec §48):
 *  - OBSERVATION  — what was literally written/done (counts, dates, phrases)
 *  - INTERPRETATION — a possible reading, always hedged, never asserted
 *  - REFLECTION   — a question handed back to the user, never an answer
 *
 * Never present interpretation as objective moral truth. Never infer moral
 * character. Never rank users as more or less virtuous.
 */

import type { JournalEntry, VirtueTag } from '@/lib/types';
import { VIRTUE_BY_KEY } from '@/lib/virtues';

interface VirtueLexEntry {
  virtue: string;
  theme: string;
  words: string[];
}

/** Keyword → virtue + theme. Deterministic and config-driven, same shape as
 * the chakra LEXICON — add an entry, it flows through automatically. */
export const VIRTUE_LEXICON: VirtueLexEntry[] = [
  { virtue: 'faith', theme: 'trust', words: ['faith', 'trust', 'believe', 'belief', 'surrender'] },
  { virtue: 'hope', theme: 'perseverance', words: ['hope', 'hoping', 'keep going', 'working toward', 'renewal'] },
  { virtue: 'charity', theme: 'love', words: ['charity', 'compassion', 'cared for', 'showed up for'] },
  { virtue: 'prudence', theme: 'discernment', words: ['thought it through', 'weighed', 'considered', 'discernment', 'careful decision'] },
  { virtue: 'justice', theme: 'fairness', words: ['fair', 'fairness', 'unfair', 'responsibility', 'accountable'] },
  { virtue: 'fortitude', theme: 'courage', words: ['courage', 'brave', 'faced it', 'pushed through', 'resilient'] },
  { virtue: 'temperance', theme: 'balance', words: ['balance', 'moderation', 'self-control', 'restrained myself'] },
  { virtue: 'humility', theme: 'humility', words: ['humbled', 'listened', 'admitted i was wrong', 'let go of being right'] },
  { virtue: 'generosity', theme: 'generosity', words: ['gave', 'generous', 'shared', 'donated', 'helped without being asked'] },
  { virtue: 'chastity', theme: 'intentionality', words: ['intentional', 'respectful', 'held back', 'present with'] },
  { virtue: 'gratitude', theme: 'gratitude', words: ['grateful', 'gratitude', 'thankful', 'appreciate', 'appreciated'] },
  { virtue: 'kindness', theme: 'kindness', words: ['kind', 'kindness', 'compliment', 'encouraged someone', 'gentle with'] },
  { virtue: 'moderation', theme: 'moderation', words: ['enough', 'paused before', 'didn’t overdo', 'stopped at one'] },
  { virtue: 'patience', theme: 'patience', words: ['patient', 'patience', 'waited', 'took a breath', 'didn’t snap'] },
  { virtue: 'diligence', theme: 'diligence', words: ['finished', 'followed through', 'showed up', 'diligent', 'stayed focused'] },
];

export interface VirtueAnalysis {
  tags: VirtueTag[];
  themes: string[];
  phrases: { phrase: string; virtue: string }[];
}

/** Deterministic theme surfacing — the virtue equivalent of analyzeEntry.
 * Never invoked with, or producing, any claim about the user's character. */
export function analyzeVirtueEntry(body: string, enabledVirtueKeys?: Set<string>): VirtueAnalysis {
  const text = body.toLowerCase();
  const tags: VirtueTag[] = [];
  const themes: string[] = [];
  const phrases: { phrase: string; virtue: string }[] = [];

  for (const lex of VIRTUE_LEXICON) {
    if (enabledVirtueKeys && !enabledVirtueKeys.has(lex.virtue)) continue;
    const matched = lex.words.filter((w) => text.includes(w));
    if (matched.length === 0) continue;
    const weight = Math.min(1, 0.4 + matched.length * 0.2);
    tags.push({ virtue: lex.virtue, theme: lex.theme, weight });
    if (!themes.includes(lex.theme)) themes.push(lex.theme);
    for (const m of matched) phrases.push({ phrase: m, virtue: lex.virtue });
  }

  return { tags, themes, phrases };
}

export interface VirtueActivityInput {
  virtueKey: string;
  /** timestamps (ms) of journal entries that surfaced this virtue */
  reflectionAt: number[];
  /** timestamps (ms) of voluntary practices marked complete for this virtue */
  practiceAt: number[];
  now: number;
}

/**
 * PRACTICE INDEX (spec §49) — measures product activity only: how often the
 * user has reflected on or practiced this virtue, weighted toward recency.
 * It is explicitly NOT a measure of moral worth, spiritual worth, goodness,
 * religious status, or character quality, and must never be described as
 * one anywhere it's displayed.
 */
export function computePracticeIndex({ reflectionAt, practiceAt, now }: VirtueActivityInput): number {
  const DAY_MS = 86_400_000;
  const HALF_LIFE_DAYS = 21;
  const decayed = (events: number[]) =>
    events.reduce((sum, t) => {
      const ageDays = Math.max(0, (now - t) / DAY_MS);
      return sum + Math.pow(0.5, ageDays / HALF_LIFE_DAYS);
    }, 0);

  const reflectionScore = decayed(reflectionAt) * 12;
  const practiceScore = decayed(practiceAt) * 16;
  const raw = reflectionScore + practiceScore;
  // Saturating curve so the index reads 0-100 without ever exceeding it,
  // and early activity moves the needle more than an already-high score.
  return Math.round(100 * (1 - Math.exp(-raw / 60)));
}

/** Journal entries whose virtueTags surfaced this virtue, newest first. */
export function entriesForVirtue(entries: JournalEntry[], virtueKey: string): JournalEntry[] {
  return entries.filter((e) => e.virtueTags?.some((t) => t.virtue === virtueKey));
}

export interface VirtueWeeklyReview {
  virtueKey: string;
  /** OBSERVATION — plain counts, no interpretation */
  observation: { reflections: number; practices: number };
  /** REFLECTION — a question, never an answer */
  prompt: string;
}

/** One deterministic weekly (or monthly, by passing a wider window before
 * calling) review per virtue — observation plus a question, nothing more. */
export function weeklyVirtueReview(
  virtueKey: string,
  activityInWindow: { reflections: number; practices: number },
): VirtueWeeklyReview {
  const virtue = VIRTUE_BY_KEY[virtueKey];
  const prompts = virtue?.journalPrompts ?? ['What did you notice this week?'];
  const prompt = prompts[activityInWindow.reflections % prompts.length];
  return { virtueKey, observation: activityInWindow, prompt };
}
