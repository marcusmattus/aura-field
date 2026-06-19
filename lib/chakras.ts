import type { Chakra, ChakraKey, SurfaceKey } from '@/lib/types';

/**
 * The nine-node field registry (Soul → Earth). Static reference data.
 * Frequencies / bija are config — surface them, never hardcode in components.
 */
export const CHAKRAS: Chakra[] = [
  {
    key: 'soul',
    name: 'Soul',
    bija: 'Aum',
    solfeggioHz: 963,
    color: '#eaf0ff',
    sign: 'The sign: A thousand petals turned inward',
    attributes: ['unity', 'surrender', 'source'],
    baseline: 52,
  },
  {
    key: 'crown',
    name: 'Crown',
    bija: 'Ah',
    solfeggioHz: 963,
    color: '#b14dff',
    sign: 'The sign: A violet lotus above the head',
    attributes: ['awareness', 'meaning', 'transcendence'],
    baseline: 60,
  },
  {
    key: 'third',
    name: 'Third Eye',
    bija: 'Om',
    solfeggioHz: 852,
    color: '#6b6bff',
    sign: 'The sign: Eye with two petals',
    attributes: ['intuition', 'insight', 'vision'],
    baseline: 50,
  },
  {
    key: 'throat',
    name: 'Throat',
    bija: 'Ham',
    solfeggioHz: 741,
    color: '#3db6ff',
    sign: 'The sign: A crescent within sixteen petals',
    attributes: ['voice', 'truth', 'expression'],
    baseline: 54,
  },
  {
    key: 'heart',
    name: 'Heart',
    bija: 'Yam',
    solfeggioHz: 639,
    color: '#36f5a6',
    sign: 'The sign: Two crossing triangles',
    attributes: ['love', 'connection', 'grief'],
    baseline: 61,
  },
  {
    key: 'solar',
    name: 'Solar Plexus',
    bija: 'Ram',
    solfeggioHz: 528,
    color: '#ffd23d',
    sign: 'The sign: A downward triangle, ten petals',
    attributes: ['will', 'power', 'confidence'],
    baseline: 58,
  },
  {
    key: 'sacral',
    name: 'Sacral',
    bija: 'Vam',
    solfeggioHz: 417,
    color: '#ff8a3d',
    sign: 'The sign: A crescent moon, six petals',
    attributes: ['feeling', 'creativity', 'desire'],
    baseline: 71,
  },
  {
    key: 'root',
    name: 'Root',
    bija: 'Lam',
    solfeggioHz: 396,
    color: '#ff4d5e',
    sign: 'The sign: A square within four petals',
    attributes: ['safety', 'body', 'ground'],
    baseline: 62,
  },
  {
    key: 'earth',
    name: 'Earth',
    bija: 'Lam',
    solfeggioHz: 174,
    color: '#c0433a',
    sign: "The sign: The body's base, rooted below",
    attributes: ['stability', 'belonging', 'base'],
    baseline: 47,
  },
];

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
