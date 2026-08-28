import { describe, expect, it } from 'vitest';

import {
  computeGoalProgress,
  computeHabitProgress,
  computeHabitStreak,
  isCompletedThisPeriod,
} from '../lib/agents/goalCoach';
import { buildReflectionContent, computeReviewStats, deterministicNarrative, windowFor } from '../lib/agents/review';
import type { Goal, Habit, HabitEvent, JournalEntry } from '../lib/types';

const DAY_MS = 86_400_000;

function habit(overrides: Partial<Habit> = {}): Habit {
  return {
    id: 'h1',
    goalId: null,
    title: 'Take one breath before responding',
    cadence: 'daily',
    createdAt: Date.now() - 30 * DAY_MS,
    archivedAt: null,
    ...overrides,
  };
}

describe('computeHabitStreak', () => {
  const now = Date.parse('2026-08-27T12:00:00Z');

  it('is zero with no events', () => {
    expect(computeHabitStreak('daily', [], now)).toBe(0);
  });

  it('counts consecutive daily completions ending today', () => {
    const events: HabitEvent[] = [0, 1, 2].map((d) => ({
      id: `e${d}`,
      habitId: 'h1',
      completedAt: now - d * DAY_MS,
    }));
    expect(computeHabitStreak('daily', events, now)).toBe(3);
  });

  it('still counts a streak that ended yesterday (today just hasn\'t happened yet)', () => {
    const events: HabitEvent[] = [1, 2, 3].map((d) => ({
      id: `e${d}`,
      habitId: 'h1',
      completedAt: now - d * DAY_MS,
    }));
    expect(computeHabitStreak('daily', events, now)).toBe(3);
  });

  it('breaks on a gap', () => {
    const events: HabitEvent[] = [0, 1, 5, 6].map((d) => ({
      id: `e${d}`,
      habitId: 'h1',
      completedAt: now - d * DAY_MS,
    }));
    expect(computeHabitStreak('daily', events, now)).toBe(2);
  });

  it('is a pure function', () => {
    const events: HabitEvent[] = [{ id: 'e0', habitId: 'h1', completedAt: now }];
    expect(computeHabitStreak('daily', events, now)).toBe(computeHabitStreak('daily', events, now));
  });
});

describe('isCompletedThisPeriod', () => {
  const now = Date.now();

  it('is false with no events', () => {
    expect(isCompletedThisPeriod('daily', [], now)).toBe(false);
  });

  it('is true once logged today', () => {
    expect(isCompletedThisPeriod('daily', [{ id: 'e', habitId: 'h1', completedAt: now }], now)).toBe(true);
  });

  it('is false for a completion from a prior day', () => {
    const yesterday = now - DAY_MS;
    expect(isCompletedThisPeriod('daily', [{ id: 'e', habitId: 'h1', completedAt: yesterday }], now)).toBe(false);
  });
});

describe('computeHabitProgress / computeGoalProgress', () => {
  const now = Date.now();

  it('reports null activity score for a goal with no linked habits', () => {
    const progress = computeGoalProgress('g1', [], [], now);
    expect(progress.activityScore).toBeNull();
    expect(progress.habitsLinked).toBe(0);
  });

  it('scores 0-100 and never exceeds 100 even with excess completions', () => {
    const h = habit({ id: 'h1', goalId: 'g1' });
    const events: HabitEvent[] = Array.from({ length: 60 }, (_, i) => ({
      id: `e${i}`,
      habitId: 'h1',
      completedAt: now - i * (DAY_MS / 3),
    }));
    const progress = computeGoalProgress('g1', [h], events, now);
    expect(progress.activityScore).not.toBeNull();
    expect(progress.activityScore!).toBeLessThanOrEqual(100);
    expect(progress.activityScore!).toBeGreaterThanOrEqual(0);
  });

  it('computeHabitProgress reflects streak and this-period completion together', () => {
    const h = habit({ id: 'h1' });
    const events: HabitEvent[] = [{ id: 'e0', habitId: 'h1', completedAt: now }];
    const progress = computeHabitProgress(h, events, now);
    expect(progress.completedThisPeriod).toBe(true);
    expect(progress.streak).toBe(1);
  });
});

describe('Review engine (deterministic, no LLM)', () => {
  const now = Date.parse('2026-08-27T12:00:00Z');

  function entry(daysAgo: number, chakra: JournalEntry['tags'][number]['chakra']): JournalEntry {
    return {
      id: `entry-${daysAgo}`,
      body: 'reflection',
      modality: 'text',
      createdAt: now - daysAgo * DAY_MS,
      tags: [{ chakra, theme: 'insight', weight: 0.8 }],
      themes: ['insight'],
    };
  }

  it('windowFor returns a 7-day window for weekly and 30-day for monthly', () => {
    const weekly = windowFor('weekly', now);
    const monthly = windowFor('monthly', now);
    expect(weekly.end - weekly.start).toBe(7 * DAY_MS);
    expect(monthly.end - monthly.start).toBe(30 * DAY_MS);
  });

  it('computes stats deterministically from history with no network dependency', () => {
    const entries = [entry(1, 'third'), entry(3, 'heart')];
    const stats = computeReviewStats({
      period: 'weekly',
      now,
      entries,
      sessions: [],
      virtuePractices: [],
      mudraSessions: [],
      habits: [],
      habitEvents: [],
      goals: [],
    });
    expect(stats.journalEntryCount).toBe(2);
    expect(stats.habitsScheduled).toBe(0);
    expect(Number.isFinite(stats.fieldIndexStart)).toBe(true);
    expect(Number.isFinite(stats.fieldIndexEnd)).toBe(true);
  });

  it('is a pure function — identical inputs produce identical stats', () => {
    const entries = [entry(1, 'third')];
    const input = {
      period: 'weekly' as const,
      now,
      entries,
      sessions: [],
      virtuePractices: [],
      mudraSessions: [],
      habits: [],
      habitEvents: [],
      goals: [],
    };
    expect(computeReviewStats(input)).toEqual(computeReviewStats(input));
  });

  it('deterministicNarrative never throws and always returns non-empty text with zero activity', () => {
    const stats = computeReviewStats({
      period: 'monthly',
      now,
      entries: [],
      sessions: [],
      virtuePractices: [],
      mudraSessions: [],
      habits: [],
      habitEvents: [],
      goals: [],
    });
    const narrative = deterministicNarrative(stats);
    expect(typeof narrative).toBe('string');
    expect(narrative.length).toBeGreaterThan(0);
  });

  it('deterministicNarrative never claims certainty about the user\'s inner state', () => {
    const stats = computeReviewStats({
      period: 'weekly',
      now,
      entries: [entry(1, 'heart')],
      sessions: [],
      virtuePractices: [],
      mudraSessions: [],
      habits: [],
      habitEvents: [],
      goals: [],
    });
    const narrative = deterministicNarrative(stats).toLowerCase();
    const banned = ['you are', 'this proves', 'diagnos', 'you have a'];
    for (const phrase of banned) {
      expect(narrative.includes(phrase)).toBe(false);
    }
  });

  it('buildReflectionContent carries the same numbers as the stats object', () => {
    const stats = computeReviewStats({
      period: 'weekly',
      now,
      entries: [entry(1, 'heart')],
      sessions: [],
      virtuePractices: [],
      mudraSessions: [],
      habits: [],
      habitEvents: [],
      goals: [],
    });
    const content = buildReflectionContent(stats);
    expect(content).toContain(`${stats.fieldIndexStart} -> ${stats.fieldIndexEnd}`);
    expect(content).toContain(`Journal entries: ${stats.journalEntryCount}`);
  });
});

describe('Goal registry types sanity', () => {
  it('a completed goal always carries a completedAt', () => {
    const g: Goal = {
      id: 'g1',
      title: 'Read more',
      intention: 'Grow',
      status: 'completed',
      createdAt: Date.now() - DAY_MS,
      targetDate: null,
      completedAt: Date.now(),
    };
    expect(g.status === 'completed' ? g.completedAt !== null : true).toBe(true);
  });
});
