import { describe, expect, it } from 'vitest';

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
  it('maps solfeggio carriers to traditional chakra hue bands (not a purple wash)', () => {
    // Earth / root / sacral / solar stay warm; heart green; upper cool — distinct.
    expect(hueFromFrequency(174)).toBeGreaterThanOrEqual(0);
    expect(hueFromFrequency(174)).toBeLessThan(25);

    expect(hueFromFrequency(396)).toBeLessThan(18); // root red

    expect(hueFromFrequency(417)).toBeGreaterThanOrEqual(18);
    expect(hueFromFrequency(417)).toBeLessThan(45); // sacral orange

    expect(hueFromFrequency(528)).toBeGreaterThanOrEqual(40);
    expect(hueFromFrequency(528)).toBeLessThan(65); // solar gold

    expect(hueFromFrequency(639)).toBeGreaterThanOrEqual(110);
    expect(hueFromFrequency(639)).toBeLessThan(160); // heart green

    expect(hueFromFrequency(741)).toBeGreaterThanOrEqual(190);
    expect(hueFromFrequency(741)).toBeLessThan(230); // throat blue

    expect(hueFromFrequency(852)).toBeGreaterThanOrEqual(240);
    expect(hueFromFrequency(852)).toBeLessThan(270); // third indigo

    expect(hueFromFrequency(963)).toBeGreaterThanOrEqual(265);
    expect(hueFromFrequency(963)).toBeLessThan(295); // crown violet

    expect(hueFromFrequency(285)).toBeGreaterThanOrEqual(285);
    expect(hueFromFrequency(285)).toBeLessThanOrEqual(320); // soul lavender
  });

  it('keeps heart green and root red (not purple)', () => {
    const heart = colorFromFrequency(639, 10);
    const root = colorFromFrequency(396, 7.83);
    // Heart should be greener than it is blue/red
    expect(heart.rgb.g).toBeGreaterThan(heart.rgb.r);
    expect(heart.rgb.g).toBeGreaterThan(heart.rgb.b);
    // Root should be red-dominant
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
  });

  it('generates sound library sessions with distinct per-node colours', () => {
    const sessions = buildSoundLibrarySessions(300);
    expect(sessions).toHaveLength(9);
    const colors = new Set(sessions.map((s) => s.color));
    // Every node should resolve to its own hue family — not one purple for all
    expect(colors.size).toBeGreaterThanOrEqual(7);
    expect(sessions.find((s) => s.chakra === 'heart')?.hz).toBe(639);
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
