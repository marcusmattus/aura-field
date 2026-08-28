/**
 * GoalCoach (deterministic core). Habit streaks and goal progress are pure
 * math over completion timestamps — never an LLM guess, and never
 * dependent on whether the AI provider is reachable. Qualitative coaching
 * ("what should I do about this goal") stays in the existing Coach chat
 * (Conversation Mode 'goal_planning') — this module only ever produces
 * numbers and deterministic status text.
 */

import type { Habit, HabitCadence, HabitEvent } from '@/lib/types';

const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function startOfWeek(ts: number): number {
  const day = startOfDay(ts);
  const dow = new Date(day).getDay(); // 0=Sun
  return day - dow * DAY_MS;
}

/** True if this habit has already been logged for the current period
 * (today for daily habits, this week for weekly ones). */
export function isCompletedThisPeriod(
  cadence: HabitCadence,
  events: HabitEvent[],
  now: number,
): boolean {
  const periodStart = cadence === 'daily' ? startOfDay(now) : startOfWeek(now);
  return events.some((e) => e.completedAt >= periodStart);
}

/**
 * Current streak in periods (days or weeks), counting backward from the
 * most recent completed period. A single missed period ends the streak.
 */
export function computeHabitStreak(cadence: HabitCadence, events: HabitEvent[], now: number): number {
  if (events.length === 0) return 0;
  const step = cadence === 'daily' ? DAY_MS : WEEK_MS;
  const periodStart = cadence === 'daily' ? startOfDay : startOfWeek;
  const completedPeriods = new Set(events.map((e) => periodStart(e.completedAt)));

  let cursor = periodStart(now);
  // A streak still "counts" if today's/this-week's period simply hasn't
  // happened yet — start from the most recent period that has a completion
  // at or before now, walking backward one step at a time.
  if (!completedPeriods.has(cursor)) cursor -= step;

  let streak = 0;
  while (completedPeriods.has(cursor)) {
    streak += 1;
    cursor -= step;
  }
  return streak;
}

export interface HabitProgress {
  habit: Habit;
  streak: number;
  completedThisPeriod: boolean;
  /** completions in the last 30 days, for a lightweight activity readout */
  last30Days: number;
}

export function computeHabitProgress(habit: Habit, events: HabitEvent[], now: number): HabitProgress {
  const habitEvents = events.filter((e) => e.habitId === habit.id);
  return {
    habit,
    streak: computeHabitStreak(habit.cadence, habitEvents, now),
    completedThisPeriod: isCompletedThisPeriod(habit.cadence, habitEvents, now),
    last30Days: habitEvents.filter((e) => e.completedAt > now - 30 * DAY_MS).length,
  };
}

export interface GoalProgress {
  /** 0-100, mean of linked habits' 30-day completion rate against their
   * expected cadence — product activity, not a claim the goal is "on track"
   * in any deeper sense. Empty (no linked habits) reads as null. */
  activityScore: number | null;
  habitsLinked: number;
}

/** Deterministic activity readout for one goal from its linked habits. */
export function computeGoalProgress(goalId: string, habits: Habit[], events: HabitEvent[], now: number): GoalProgress {
  const linked = habits.filter((h) => h.goalId === goalId && !h.archivedAt);
  if (linked.length === 0) return { activityScore: null, habitsLinked: 0 };

  const scores = linked.map((h) => {
    const habitEvents = events.filter((e) => e.habitId === h.id && e.completedAt > now - 30 * DAY_MS);
    const expectedPeriods = h.cadence === 'daily' ? 30 : Math.ceil(30 / 7);
    const completedPeriods = new Set(
      habitEvents.map((e) => (h.cadence === 'daily' ? startOfDay(e.completedAt) : startOfWeek(e.completedAt))),
    ).size;
    return Math.min(100, Math.round((completedPeriods / expectedPeriods) * 100));
  });

  const activityScore = Math.round(scores.reduce((s, v) => s + v, 0) / scores.length);
  return { activityScore, habitsLinked: linked.length };
}
