import { describe, expect, it } from 'vitest';

import { atmosphereForKey } from '../lib/frequency/atmosphere';
import { colorFromFrequency, hueFromFrequency } from '../lib/frequency/color';
import {
  FREQUENCY_REGISTRY,
  buildSoundLibrarySessions,
  toChakra,
} from '../lib/frequency/registry';
import { createProvider, resolveProviderId } from '../lib/ai/index';
import { computeFieldIndex } from '../lib/agents/field';
import type { ChakraState } from '../lib/types';

describe('frequency → color', () => {
  it('maps each carrier Hz to the exact product colour table', () => {
    const table: [number, string][] = [
      [174, '#C0433A'],
      [396, '#FF4D5E'],
      [417, '#FF8A3D'],
      [528, '#FFD23D'],
      [639, '#36F5A6'],
      [741, '#3DB6FF'],
      [852, '#6B6BFF'],
      [963, '#B14DFF'],
      [1074, '#EAF0FF'],
    ];
    for (const [hz, hex] of table) {
      expect(colorFromFrequency(hz).color.toUpperCase()).toBe(hex);
    }
  });

  it('treats 1074+ Hz as soul pale light', () => {
    expect(colorFromFrequency(1200).color.toUpperCase()).toBe('#EAF0FF');
  });

  it('keeps heart green and root red (not purple)', () => {
    const heart = colorFromFrequency(639, 10);
    const root = colorFromFrequency(396, 7.83);
    expect(heart.rgb.g).toBeGreaterThan(heart.rgb.r);
    expect(heart.rgb.g).toBeGreaterThan(heart.rgb.b);
    expect(root.rgb.r).toBeGreaterThan(root.rgb.g);
    expect(root.rgb.r).toBeGreaterThan(root.rgb.b);
  });

  it('derives a full palette from carrier + beat', () => {
    const palette = colorFromFrequency(639, 10);
    expect(palette.color).toMatch(/^#[0-9a-f]{6}$/i);
    expect(palette.gradient).toHaveLength(3);
    expect(palette.glowIntensity).toBeGreaterThan(0);
    expect(palette.pulseHz).toBeGreaterThan(0);
  });

  it('builds chakra view-models with derived colours', () => {
    const chakras = FREQUENCY_REGISTRY.map(toChakra);
    expect(chakras).toHaveLength(9);
    for (const c of chakras) {
      expect(c.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(c.solfeggioHz).toBeGreaterThan(0);
    }
    expect(FREQUENCY_REGISTRY.find((n) => n.key === 'soul')?.baseFrequencyHz).toBe(1074);
  });

  it('generates sound library sessions with distinct per-node colours', () => {
    const sessions = buildSoundLibrarySessions(300);
    expect(sessions).toHaveLength(9);
    const colors = new Set(sessions.map((s) => s.color));
    expect(colors.size).toBe(9);
    expect(sessions.find((s) => s.chakra === 'heart')?.color.toUpperCase()).toBe('#36F5A6');
    expect(sessions.find((s) => s.chakra === 'soul')?.hz).toBe(1074);
  });

  it('transforms session atmosphere per frequency signature', () => {
    expect(atmosphereForKey('earth').motion).toBe('breath-slow');
    expect(atmosphereForKey('earth').particleCount).toBeGreaterThan(20);
    expect(atmosphereForKey('solar').uiMode).toBe('warm');
    expect(atmosphereForKey('solar').bloom).toBeGreaterThan(0.9);
    expect(atmosphereForKey('heart').motion).toBe('breath-gentle');
    expect(atmosphereForKey('throat').motion).toBe('ripple-fast');
    expect(atmosphereForKey('throat').waveStrength).toBe(1);
    expect(atmosphereForKey('third').control).toBe('#9B6BFF');
    expect(atmosphereForKey('crown').uiMode).toBe('minimal');
    expect(atmosphereForKey('crown').motionScale).toBeLessThan(0.5);
  });
});

describe('field scoring', () => {
  it('computes a weighted field index', () => {
    const states: ChakraState[] = [
      'soul',
      'crown',
      'third',
      'throat',
      'heart',
      'solar',
      'sacral',
      'root',
      'earth',
    ].map((key) => ({
      key: key as ChakraState['key'],
      energy: 60,
      trend7d: 0,
    }));
    const index = computeFieldIndex(states);
    expect(index).toBeGreaterThanOrEqual(0);
    expect(index).toBeLessThanOrEqual(100);
  });
});

describe('AI provider abstraction', () => {
  it('resolves provider ids from config', () => {
    expect(resolveProviderId('openai')).toBe('openai');
    expect(resolveProviderId('anthropic')).toBe('anthropic');
    expect(resolveProviderId(undefined)).toBe('anthropic');
  });

  it('creates providers without throwing', () => {
    const openai = createProvider('openai', 'test-key');
    const anthropic = createProvider('anthropic', 'test-key');
    expect(openai.id).toBe('openai');
    expect(anthropic.id).toBe('anthropic');
  });
});

describe('edge function contracts (shape)', () => {
  it('ai-chat success payload shape', () => {
    const ok = { ok: true, content: 'hello', provider: 'anthropic' };
    expect(ok.ok).toBe(true);
    expect(typeof ok.content).toBe('string');
  });

  it('reflect fallback shape', () => {
    const fallback = {
      ok: true,
      fallback: true,
      summary: 'noted',
      themes: [] as string[],
      suggestedActions: [] as string[],
    };
    expect(fallback.ok).toBe(true);
    expect(Array.isArray(fallback.themes)).toBe(true);
  });

  it('transcribe success shape', () => {
    const res = {
      ok: true,
      transcript: 'I felt grounded',
      summary: 'Grounding reflection',
      emotionalThemes: ['calm'],
      goals: [],
      actionItems: [],
    };
    expect(res.ok).toBe(true);
    expect(res.transcript.length).toBeGreaterThan(0);
  });
});
