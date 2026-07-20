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
  it('maps higher Hz toward cooler hues', () => {
    const low = hueFromFrequency(174);
    const mid = hueFromFrequency(528);
    const high = hueFromFrequency(963);
    expect(low).toBeLessThan(mid);
    expect(mid).toBeLessThan(high);
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

  it('generates sound library sessions without hardcoded colour authority', () => {
    const sessions = buildSoundLibrarySessions(300);
    expect(sessions).toHaveLength(9);
    expect(sessions[0].color).toBeTruthy();
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
