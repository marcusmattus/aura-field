/**
 * Frequency registry — single source of truth for the nine-node field.
 * Colours are derived at runtime via colorFromFrequency (never stored as authority).
 */

import { colorFromFrequency, type DerivedPalette } from '@/lib/frequency/color';
import type { Chakra, ChakraKey } from '@/lib/types';

export interface FrequencyNode {
  key: ChakraKey;
  name: string;
  sanskrit: string;
  element: string;
  bija: string | null;
  noteName: string | null;
  baseFrequencyHz: number;
  beatFrequencyHz: number;
  brainwaveBand: string;
  solfeggioIntent: string;
  attributes: [string, string, string];
  sign: string;
  baseline: number;
  tags: string[];
}

/** Map uploaded dataset keys → app ChakraKey. */
export const DATASET_KEY_TO_APP: Record<string, ChakraKey> = {
  earth_star: 'earth',
  root: 'root',
  sacral: 'sacral',
  solar_plexus: 'solar',
  heart: 'heart',
  throat: 'throat',
  third_eye: 'third',
  crown: 'crown',
  soul_star: 'soul',
};

export const FREQUENCY_REGISTRY: FrequencyNode[] = [
  {
    key: 'soul',
    name: 'Soul',
    sanskrit: 'Sutara',
    element: 'Source',
    bija: null,
    noteName: null,
    baseFrequencyHz: 1074,
    beatFrequencyHz: 35,
    brainwaveBand: 'gamma',
    solfeggioIntent: 'Field regeneration, higher alignment',
    attributes: ['unity', 'surrender', 'source'],
    sign: 'The sign: A thousand petals turned inward',
    baseline: 52,
    tags: ['soul', 'source', 'gamma'],
  },
  {
    key: 'crown',
    name: 'Crown',
    sanskrit: 'Sahasrara',
    element: 'Consciousness',
    bija: 'AUM',
    noteName: 'B',
    baseFrequencyHz: 963,
    beatFrequencyHz: 40,
    brainwaveBand: 'gamma',
    solfeggioIntent: 'Unity, divine connection',
    attributes: ['awareness', 'meaning', 'transcendence'],
    sign: 'The sign: A violet lotus above the head',
    baseline: 60,
    tags: ['crown', 'awareness', 'gamma'],
  },
  {
    key: 'third',
    name: 'Third Eye',
    sanskrit: 'Ajna',
    element: 'Light',
    bija: 'OM',
    noteName: 'A',
    baseFrequencyHz: 852,
    beatFrequencyHz: 4,
    brainwaveBand: 'theta',
    solfeggioIntent: 'Intuition, returning to spiritual order',
    attributes: ['intuition', 'insight', 'vision'],
    sign: 'The sign: Eye with two petals',
    baseline: 50,
    tags: ['third', 'insight', 'theta'],
  },
  {
    key: 'throat',
    name: 'Throat',
    sanskrit: 'Vishuddha',
    element: 'Ether',
    bija: 'HAM',
    noteName: 'G',
    baseFrequencyHz: 741,
    beatFrequencyHz: 8,
    brainwaveBand: 'alpha',
    solfeggioIntent: 'Expression, solutions, cleansing',
    attributes: ['voice', 'truth', 'expression'],
    sign: 'The sign: A crescent within sixteen petals',
    baseline: 54,
    tags: ['throat', 'voice', 'alpha'],
  },
  {
    key: 'heart',
    name: 'Heart',
    sanskrit: 'Anahata',
    element: 'Air',
    bija: 'YAM',
    noteName: 'F',
    baseFrequencyHz: 639,
    beatFrequencyHz: 10,
    brainwaveBand: 'alpha',
    solfeggioIntent: 'Connection, relationships, balance',
    attributes: ['love', 'connection', 'grief'],
    sign: 'The sign: Two crossing triangles',
    baseline: 61,
    tags: ['heart', 'love', 'alpha'],
  },
  {
    key: 'solar',
    name: 'Solar Plexus',
    sanskrit: 'Manipura',
    element: 'Fire',
    bija: 'RAM',
    noteName: 'E',
    baseFrequencyHz: 528,
    beatFrequencyHz: 10,
    brainwaveBand: 'alpha',
    solfeggioIntent: "Transformation, repair ('miracle tone')",
    attributes: ['will', 'power', 'energy'],
    sign: 'The sign: A downward triangle, ten petals',
    baseline: 58,
    tags: ['solar', 'will', 'alpha'],
  },
  {
    key: 'sacral',
    name: 'Sacral',
    sanskrit: 'Svadhisthana',
    element: 'Water',
    bija: 'VAM',
    noteName: 'D',
    baseFrequencyHz: 417,
    beatFrequencyHz: 6,
    brainwaveBand: 'theta',
    solfeggioIntent: 'Facilitating change, undoing trauma',
    attributes: ['feeling', 'creativity', 'desire'],
    sign: 'The sign: A crescent moon, six petals',
    baseline: 71,
    tags: ['sacral', 'flow', 'theta'],
  },
  {
    key: 'root',
    name: 'Root',
    sanskrit: 'Muladhara',
    element: 'Earth',
    bija: 'LAM',
    noteName: 'C',
    baseFrequencyHz: 396,
    beatFrequencyHz: 7.83,
    brainwaveBand: 'theta',
    solfeggioIntent: 'Releasing fear and guilt',
    attributes: ['safety', 'body', 'ground'],
    sign: 'The sign: A square within four petals',
    baseline: 62,
    tags: ['root', 'grounding', 'theta'],
  },
  {
    key: 'earth',
    name: 'Earth',
    sanskrit: 'Vasundhara',
    element: 'Earth core',
    bija: null,
    noteName: null,
    baseFrequencyHz: 174,
    beatFrequencyHz: 2.5,
    brainwaveBand: 'delta',
    solfeggioIntent: 'Foundation, safety, pain relief',
    attributes: ['stability', 'belonging', 'base'],
    sign: "The sign: The body's base, rooted below",
    baseline: 47,
    tags: ['earth', 'grounding', 'delta'],
  },
];

export const FREQUENCY_BY_KEY: Record<ChakraKey, FrequencyNode> = FREQUENCY_REGISTRY.reduce(
  (acc, node) => {
    acc[node.key] = node;
    return acc;
  },
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- seeded from full registry
  {} as Record<ChakraKey, FrequencyNode>,
);

export function paletteForNode(node: FrequencyNode): DerivedPalette {
  return colorFromFrequency(node.baseFrequencyHz, node.beatFrequencyHz);
}

export function paletteForKey(key: ChakraKey): DerivedPalette {
  return paletteForNode(FREQUENCY_BY_KEY[key]);
}

/** Build the Chakra view-model used by the rest of the app (color derived). */
export function toChakra(node: FrequencyNode): Chakra {
  const palette = paletteForNode(node);
  return {
    key: node.key,
    name: node.name,
    bija: node.bija ?? '',
    solfeggioHz: node.baseFrequencyHz,
    noteName: node.noteName ?? '',
    binauralOffsetHz: node.beatFrequencyHz,
    brainwaveBand: node.brainwaveBand,
    color: palette.color,
    sign: node.sign,
    attributes: node.attributes,
    baseline: node.baseline,
  };
}

export function buildSoundLibrarySessions(durationS = 600) {
  return FREQUENCY_REGISTRY.map((node) => {
    const palette = paletteForNode(node);
    return {
      key: `freq-${node.key}`,
      chakra: node.key,
      hz: node.baseFrequencyHz,
      beatHz: node.beatFrequencyHz,
      brainwaveBand: `${node.brainwaveBand} ${node.beatFrequencyHz} Hz`,
      durationS,
      title: `${node.name} · ${node.baseFrequencyHz} Hz`,
      intent: node.solfeggioIntent,
      tags: node.tags,
      color: palette.color,
      gradient: palette.gradient,
      glow: palette.glow,
      pulseHz: palette.pulseHz,
    };
  });
}
