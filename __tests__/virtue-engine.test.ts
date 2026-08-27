import { describe, expect, it } from 'vitest';

import { analyzeVirtueEntry, computePracticeIndex, weeklyVirtueReview } from '../lib/agents/virtue';
import {
  CAPITAL_VIRTUES,
  CARDINAL_VIRTUES,
  THEOLOGICAL_VIRTUES,
  VIRTUES,
  visibleVirtues,
} from '../lib/virtues';

describe('Virtue registry', () => {
  it('has the expected tier counts and unique keys', () => {
    expect(THEOLOGICAL_VIRTUES).toHaveLength(3);
    expect(CARDINAL_VIRTUES).toHaveLength(4);
    expect(CAPITAL_VIRTUES).toHaveLength(8);
    const keys = new Set(VIRTUES.map((v) => v.key));
    expect(keys.size).toBe(VIRTUES.length);
  });

  it('never surfaces the vice a capital virtue counters in any user-facing text', () => {
    // "Never label a user as sinful" (spec §44) — the counterpart is
    // internal metadata only; it must not leak into copy shown to the user.
    for (const v of CAPITAL_VIRTUES) {
      const vice = v.counterpart!;
      const userFacingText = [v.name, v.description, ...v.reflectionThemes, ...v.journalPrompts, ...v.practices]
        .join(' ')
        .toLowerCase();
      expect(userFacingText.includes(vice)).toBe(false);
    }
  });

  it('never claims moral worth in any virtue description', () => {
    const bannedPhrases = ['sinful', 'immoral', 'bad person', 'evil', 'unworthy', 'shame'];
    for (const v of VIRTUES) {
      const text = `${v.description} ${v.journalPrompts.join(' ')} ${v.practices.join(' ')}`.toLowerCase();
      for (const phrase of bannedPhrases) {
        expect(text.includes(phrase)).toBe(false);
      }
    }
  });
});

describe('visibleVirtues framework gating', () => {
  it('shows nothing when the virtue framework is off', () => {
    expect(visibleVirtues({ virtueFramework: false, christianMode: true })).toHaveLength(0);
  });

  it('hides theological virtues unless Christian Reflection Mode is also on', () => {
    const withoutChristian = visibleVirtues({ virtueFramework: true, christianMode: false });
    expect(withoutChristian.some((v) => v.category === 'theological')).toBe(false);
    expect(withoutChristian.some((v) => v.category === 'cardinal')).toBe(true);
    expect(withoutChristian.some((v) => v.category === 'capital')).toBe(true);

    const withChristian = visibleVirtues({ virtueFramework: true, christianMode: true });
    expect(withChristian.some((v) => v.category === 'theological')).toBe(true);
    expect(withChristian).toHaveLength(VIRTUES.length);
  });
});

describe('analyzeVirtueEntry (deterministic)', () => {
  it('surfaces fortitude from courage-adjacent language', () => {
    const result = analyzeVirtueEntry('I found the courage to face it and pushed through anyway.');
    expect(result.tags.some((t) => t.virtue === 'fortitude')).toBe(true);
  });

  it('respects the enabled-keys filter (e.g. Christian mode off hides faith)', () => {
    const enabled = new Set(['fortitude']);
    const result = analyzeVirtueEntry('I had faith and courage today.', enabled);
    expect(result.tags.some((t) => t.virtue === 'faith')).toBe(false);
    expect(result.tags.some((t) => t.virtue === 'fortitude')).toBe(true);
  });

  it('is a pure function — same input, same output', () => {
    const a = analyzeVirtueEntry('I was patient and grateful today.');
    const b = analyzeVirtueEntry('I was patient and grateful today.');
    expect(a).toEqual(b);
  });

  it('never fabricates a tag with no matching text', () => {
    const result = analyzeVirtueEntry('The weather was nice.');
    expect(result.tags).toHaveLength(0);
  });
});

describe('computePracticeIndex (product activity only)', () => {
  const now = Date.now();

  it('is zero with no activity', () => {
    const score = computePracticeIndex({ virtueKey: 'patience', reflectionAt: [], practiceAt: [], now });
    expect(score).toBe(0);
  });

  it('stays within 0-100 bounds even with heavy activity', () => {
    const manyEvents = Array.from({ length: 200 }, (_, i) => now - i * 1000);
    const score = computePracticeIndex({
      virtueKey: 'patience',
      reflectionAt: manyEvents,
      practiceAt: manyEvents,
      now,
    });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  it('weighs recent activity more than equally-sized old activity', () => {
    const recent = computePracticeIndex({
      virtueKey: 'patience',
      reflectionAt: [now - 86_400_000],
      practiceAt: [],
      now,
    });
    const old = computePracticeIndex({
      virtueKey: 'patience',
      reflectionAt: [now - 200 * 86_400_000],
      practiceAt: [],
      now,
    });
    expect(recent).toBeGreaterThan(old);
  });
});

describe('weeklyVirtueReview', () => {
  it('separates observation (counts) from reflection (a question, not an answer)', () => {
    const review = weeklyVirtueReview('gratitude', { reflections: 3, practices: 2 });
    expect(review.observation).toEqual({ reflections: 3, practices: 2 });
    expect(review.prompt.trim().endsWith('?')).toBe(true);
  });
});
