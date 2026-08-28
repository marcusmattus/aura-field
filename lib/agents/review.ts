/**
 * Weekly / monthly review composer (deterministic core). Every number in
 * ReviewStats is computed the same way the rest of chakraOS computes its
 * numbers — reusing the Field agent's own recomputeField/computeFieldIndex
 * at two points in time — so a review never depends on an LLM being
 * reachable. `deterministicNarrative` is the always-available fallback
 * text; `buildReflectionContent` is what gets handed to the `reflect` edge
 * function so an LLM can optionally write a warmer version of the same
 * facts (see lib/agents/review.ts callers in lib/reviewStore.ts).
 */

import { computeFieldIndex, recomputeField } from '@/lib/agents/field';
import { CHAKRA_BY_KEY } from '@/lib/chakras';
import type {
  ChakraKey,
  CompletedSession,
  Goal,
  Habit,
  HabitEvent,
  JournalEntry,
  ReviewPeriod,
  ReviewStats,
} from '@/lib/types';
import { entriesForVirtue } from '@/lib/agents/virtue';
import { VIRTUES } from '@/lib/virtues';
import type { MudraVisionSessionRecord } from '@/lib/vision/mudraAlignmentStore';
import type { VirtuePracticeRecord } from '@/lib/virtueStore';

const DAY_MS = 86_400_000;

export function windowFor(period: ReviewPeriod, now: number): { start: number; end: number } {
  const days = period === 'weekly' ? 7 : 30;
  return { start: now - days * DAY_MS, end: now };
}

export interface ReviewInputs {
  period: ReviewPeriod;
  now: number;
  entries: JournalEntry[];
  sessions: CompletedSession[];
  virtuePractices: VirtuePracticeRecord[];
  mudraSessions: MudraVisionSessionRecord[];
  habits: Habit[];
  habitEvents: HabitEvent[];
  goals: Goal[];
}

export function computeReviewStats(input: ReviewInputs): ReviewStats {
  const { period, now, entries, sessions, virtuePractices, mudraSessions, habits, habitEvents, goals } = input;
  const { start, end } = windowFor(period, now);

  const statesEnd = recomputeField({ entries, sessions, now: end });
  const statesStart = recomputeField({ entries, sessions, now: start });
  const fieldIndexEnd = computeFieldIndex(statesEnd);
  const fieldIndexStart = computeFieldIndex(statesStart);

  let topRisingChakra: ChakraKey | null = null;
  let topFallingChakra: ChakraKey | null = null;
  let maxRise = 0;
  let maxFall = 0;
  for (const s of statesEnd) {
    const prior = statesStart.find((p) => p.key === s.key)?.energy ?? s.energy;
    const delta = s.energy - prior;
    if (delta > maxRise) {
      maxRise = delta;
      topRisingChakra = s.key;
    }
    if (delta < maxFall) {
      maxFall = delta;
      topFallingChakra = s.key;
    }
  }

  const windowEntries = entries.filter((e) => e.createdAt > start && e.createdAt <= end);
  const virtueReflectionCount = VIRTUES.reduce(
    (sum, v) => sum + entriesForVirtue(windowEntries, v.key).length,
    0,
  );
  const virtuePracticeCount = virtuePractices.filter((p) => p.completedAt > start && p.completedAt <= end).length;
  const mudraSessionCount = mudraSessions.filter((s) => s.completedAt > start && s.completedAt <= end).length;

  const activeHabits = habits.filter((h) => !h.archivedAt);
  const windowSteps = period === 'weekly' ? 7 : 30;
  const habitsScheduled = activeHabits.reduce(
    (sum, h) => sum + (h.cadence === 'daily' ? windowSteps : Math.ceil(windowSteps / 7)),
    0,
  );
  const habitsCompleted = habitEvents.filter((e) => e.completedAt > start && e.completedAt <= end).length;

  return {
    period,
    windowStart: start,
    windowEnd: end,
    journalEntryCount: windowEntries.length,
    fieldIndexStart,
    fieldIndexEnd,
    topRisingChakra,
    topFallingChakra,
    virtueReflectionCount,
    virtuePracticeCount,
    mudraSessionCount,
    habitsCompleted,
    habitsScheduled,
    activeGoalCount: goals.filter((g) => g.status === 'active').length,
    completedGoalCount: goals.filter(
      (g) => g.status === 'completed' && (g.completedAt ?? 0) > start && (g.completedAt ?? 0) <= end,
    ).length,
  };
}

/** Always-available narrative — no network, no LLM, never blank. */
export function deterministicNarrative(stats: ReviewStats): string {
  const label = stats.period === 'weekly' ? 'this week' : 'this month';
  const delta = stats.fieldIndexEnd - stats.fieldIndexStart;
  const deltaText =
    delta === 0
      ? `held steady at ${stats.fieldIndexEnd}`
      : `moved from ${stats.fieldIndexStart} to ${stats.fieldIndexEnd}`;

  const parts: string[] = [`Your Field Index ${deltaText} ${label}.`];

  if (stats.journalEntryCount > 0) {
    parts.push(`You wrote ${stats.journalEntryCount} journal ${stats.journalEntryCount === 1 ? 'entry' : 'entries'}.`);
  } else {
    parts.push('No journal entries were recorded — the field ran on practice activity alone.');
  }

  if (stats.topRisingChakra) {
    parts.push(`${CHAKRA_BY_KEY[stats.topRisingChakra].name} rose the most.`);
  }
  if (stats.topFallingChakra) {
    parts.push(`${CHAKRA_BY_KEY[stats.topFallingChakra].name} eased back.`);
  }
  if (stats.habitsScheduled > 0) {
    const rate = Math.round((stats.habitsCompleted / stats.habitsScheduled) * 100);
    parts.push(`Habits were completed at roughly ${rate}% of their scheduled cadence.`);
  }
  if (stats.mudraSessionCount > 0) {
    parts.push(`${stats.mudraSessionCount} mudra ${stats.mudraSessionCount === 1 ? 'session' : 'sessions'} completed.`);
  }
  if (stats.virtueReflectionCount > 0 || stats.virtuePracticeCount > 0) {
    parts.push(
      `${stats.virtueReflectionCount} reflection${stats.virtueReflectionCount === 1 ? '' : 's'} and ${stats.virtuePracticeCount} voluntary practice${stats.virtuePracticeCount === 1 ? '' : 's'} touched a virtue.`,
    );
  }
  if (stats.completedGoalCount > 0) {
    parts.push(`${stats.completedGoalCount} goal${stats.completedGoalCount === 1 ? '' : 's'} completed.`);
  }

  return parts.join(' ');
}

/** Plain-text summary of the same facts, formatted for the `reflect` edge
 * function's `content` field so an LLM can optionally write a warmer
 * version — the numbers themselves never come from that call. */
export function buildReflectionContent(stats: ReviewStats): string {
  return [
    `Period: ${stats.period}`,
    `Field Index: ${stats.fieldIndexStart} -> ${stats.fieldIndexEnd}`,
    `Journal entries: ${stats.journalEntryCount}`,
    `Rising node: ${stats.topRisingChakra ?? 'none'}`,
    `Falling node: ${stats.topFallingChakra ?? 'none'}`,
    `Habits: ${stats.habitsCompleted}/${stats.habitsScheduled} scheduled completions`,
    `Mudra sessions: ${stats.mudraSessionCount}`,
    `Virtue reflections: ${stats.virtueReflectionCount}, practices: ${stats.virtuePracticeCount}`,
    `Goals completed: ${stats.completedGoalCount}`,
  ].join('\n');
}

