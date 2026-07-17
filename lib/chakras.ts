import type { Chakra, ChakraKey, SurfaceKey } from '@/lib/types';
import { FREQUENCY_REGISTRY, toChakra } from '@/lib/frequency/registry';

/**
 * The nine-node field registry (Soul → Earth).
 * Frequencies come from the frequency registry; colours are derived from Hz.
 */
export const CHAKRAS: Chakra[] = FREQUENCY_REGISTRY.map(toChakra);

export const CHAKRA_BY_KEY: Record<ChakraKey, Chakra> = CHAKRAS.reduce(
  (acc, c) => {
    acc[c.key] = c;
    return acc;
  },
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- seed is fully populated by reduce over all 9 CHAKRAS entries
  {} as Record<ChakraKey, Chakra>,
);

/** Order from top (soul) to bottom (earth) along the central channel. */
export const CHAKRA_ORDER: ChakraKey[] = CHAKRAS.map((c) => c.key);

/** Type guard — narrows an unknown string to ChakraKey. */
export function isChakraKey(v: unknown): v is ChakraKey {
  return typeof v === 'string' && (CHAKRA_ORDER as readonly string[]).includes(v);
}

/** Per-surface accent colors (Tailwind token names → hex for native props). */
export const SURFACE_ACCENT: Record<SurfaceKey, string> = {
  body: '#36d6e7',
  journal: '#e8b23d',
  coach: '#3ddc97',
  sound: '#a56bff',
  you: '#ff5ca8',
};

/**
 * Field index weights — Heart/Throat/Third weighted slightly higher for daily life.
 * Lives in config so the field model can evolve without a release.
 */
export const FIELD_INDEX_WEIGHTS: Record<ChakraKey, number> = {
  soul: 0.8,
  crown: 0.9,
  third: 1.2,
  throat: 1.2,
  heart: 1.3,
  solar: 1.0,
  sacral: 1.0,
  root: 1.0,
  earth: 0.8,
};
