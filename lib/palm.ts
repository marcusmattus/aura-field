/**
 * The chakraOS palm map.
 *
 * This is a *visualisation system*, not a diagnostic one. chakraOS projects the
 * nine field nodes onto fixed anatomical landmarks of an open hand so the user
 * can see their own field state anchored to their own palm. Nothing here reads
 * the hand: no palm lines, skin, temperature or geometry is measured or
 * interpreted. Every number shown on the palm comes from the journal → field →
 * reflection loop that already drives the rest of the app.
 */

import { CHAKRA_BY_KEY, CHAKRA_ORDER } from '@/lib/chakras';
import type { ChakraKey, ChakraState, PalmHand, PalmScan } from '@/lib/types';

/** Shown wherever a palm scan is presented. Keeps the claim honest. */
export const PALM_DISCLAIMER =
  'chakraOS projects your field onto your hand. It does not read your palm — the numbers come from your journal and sessions, not from the camera.';

export interface PalmPoint {
  key: ChakraKey;
  /** normalised position inside the palm rig box, right hand, palm to camera */
  x: number;
  y: number;
  /** anatomical landmark the node is anchored to */
  zone: string;
  /** what the point represents in the visualisation */
  reading: string;
}

/**
 * Nine anchors, soul → earth, woven down an open right hand. Consecutive points
 * form the energy channel drawn over the palm, so order matters.
 */
const RIGHT_HAND_POINTS: readonly PalmPoint[] = [
  {
    key: 'soul',
    x: 0.492,
    y: 0.055,
    zone: 'middle fingertip',
    reading: 'the far edge of the channel, outside the body',
  },
  {
    key: 'crown',
    x: 0.505,
    y: 0.185,
    zone: 'middle phalanx',
    reading: 'where the channel enters the hand',
  },
  {
    key: 'third',
    x: 0.352,
    y: 0.3,
    zone: 'mount of jupiter',
    reading: 'index mount — direction and sight',
  },
  {
    key: 'throat',
    x: 0.642,
    y: 0.315,
    zone: 'mount of apollo',
    reading: 'ring mount — voice and expression',
  },
  {
    key: 'heart',
    x: 0.492,
    y: 0.445,
    zone: 'upper palm hollow',
    reading: 'the hollow of the palm — connection',
  },
  {
    key: 'solar',
    x: 0.492,
    y: 0.56,
    zone: 'plain of mars',
    reading: 'centre of the palm — will and heat',
  },
  {
    key: 'sacral',
    x: 0.362,
    y: 0.66,
    zone: 'mount of venus',
    reading: 'thumb mount — appetite and flow',
  },
  {
    key: 'root',
    x: 0.612,
    y: 0.705,
    zone: 'mount of luna',
    reading: 'outer heel — safety and weight',
  },
  {
    key: 'earth',
    x: 0.495,
    y: 0.845,
    zone: 'wrist gate',
    reading: 'where the field leaves the hand',
  },
];

/** Points for a given hand. The left hand is the mirror of the right. */
export function palmPointsFor(hand: PalmHand): PalmPoint[] {
  if (hand === 'right') return [...RIGHT_HAND_POINTS];
  return RIGHT_HAND_POINTS.map((p) => ({ ...p, x: 1 - p.x }));
}

/**
 * Stylised open-hand silhouette, normalised, right hand with the thumb on the
 * left. Smoothed into a path by the renderer. It is a guide outline the user
 * aligns to — not a detected contour.
 */
const RIGHT_HAND_OUTLINE: readonly (readonly [number, number])[] = [
  [0.36, 0.9],
  [0.27, 0.81],
  [0.16, 0.67],
  [0.07, 0.53],
  [0.055, 0.45],
  [0.125, 0.425],
  [0.205, 0.525],
  [0.272, 0.36],
  [0.282, 0.28],
  [0.3, 0.16],
  [0.368, 0.145],
  [0.4, 0.28],
  [0.442, 0.262],
  [0.455, 0.055],
  [0.527, 0.05],
  [0.55, 0.262],
  [0.588, 0.282],
  [0.617, 0.09],
  [0.686, 0.1],
  [0.702, 0.3],
  [0.736, 0.332],
  [0.776, 0.232],
  [0.836, 0.248],
  [0.846, 0.4],
  [0.86, 0.55],
  [0.802, 0.742],
  [0.7, 0.885],
];

export function palmOutlineFor(hand: PalmHand): (readonly [number, number])[] {
  if (hand === 'right') return [...RIGHT_HAND_OUTLINE];
  return RIGHT_HAND_OUTLINE.map(([x, y]) => [1 - x, y] as const);
}

function energyMap(states: ChakraState[]): Record<ChakraKey, number> {
  const out = CHAKRA_ORDER.reduce<Record<ChakraKey, number>>(
    (acc, key) => {
      acc[key] = states.find((s) => s.key === key)?.energy ?? 50;
      return acc;
    },
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- every chakra key is assigned in the reduce above
    {} as Record<ChakraKey, number>,
  );
  return out;
}

/**
 * Strength of each channel segment between consecutive palm points, 0..1.
 * A segment is strong when both ends are lit *and* close to each other — a big
 * gap between neighbours reads as a break in the channel.
 */
export function segmentStrengths(states: ChakraState[]): number[] {
  const energies = energyMap(states);
  const order = RIGHT_HAND_POINTS.map((p) => p.key);
  const out: number[] = [];
  for (let i = 0; i < order.length - 1; i += 1) {
    const a = energies[order[i]];
    const b = energies[order[i + 1]];
    const mean = (a + b) / 2 / 100;
    const gap = Math.abs(a - b) / 200;
    out.push(Math.max(0.05, mean * (1 - gap)));
  }
  return out;
}

/**
 * Channel continuity, 0-100. The mean segment strength — how evenly the field
 * runs from fingertip to wrist rather than how high it is.
 */
export function channelContinuity(states: ChakraState[]): number {
  const segs = segmentStrengths(states);
  if (segs.length === 0) return 0;
  const mean = segs.reduce((acc, s) => acc + s, 0) / segs.length;
  return Math.round(mean * 100);
}

/** Snapshot of everything a palm scan records. Time + id are added by the store. */
export function palmSnapshot(
  states: ChakraState[],
  fieldIndex: number,
): Pick<PalmScan, 'fieldIndex' | 'continuity' | 'energies'> {
  return {
    fieldIndex,
    continuity: channelContinuity(states),
    energies: energyMap(states),
  };
}

export interface PalmReading {
  headline: string;
  body: string;
  brightest: ChakraKey;
  dimmest: ChakraKey;
  weakestSegment: [ChakraKey, ChakraKey];
}

/** Deterministic read-out of the current palm field. Observational, never clinical. */
export function palmReading(states: ChakraState[], fieldIndex: number): PalmReading {
  const energies = energyMap(states);
  const order = RIGHT_HAND_POINTS.map((p) => p.key);
  let brightest = order[0];
  let dimmest = order[0];
  for (const key of order) {
    if (energies[key] > energies[brightest]) brightest = key;
    if (energies[key] < energies[dimmest]) dimmest = key;
  }

  const segs = segmentStrengths(states);
  let weakIndex = 0;
  segs.forEach((s, i) => {
    if (s < segs[weakIndex]) weakIndex = i;
  });
  const weakestSegment: [ChakraKey, ChakraKey] = [order[weakIndex], order[weakIndex + 1]];

  const continuity = channelContinuity(states);
  const bright = CHAKRA_BY_KEY[brightest];
  const dim = CHAKRA_BY_KEY[dimmest];
  const from = CHAKRA_BY_KEY[weakestSegment[0]];
  const to = CHAKRA_BY_KEY[weakestSegment[1]];

  const headline =
    continuity >= 70
      ? 'The channel runs clean'
      : continuity >= 50
        ? 'The channel runs, with a catch'
        : 'The channel is broken in places';

  const body =
    `${bright.name} holds the brightest point on your palm at ${energies[brightest]}. ` +
    `${dim.name} is the quietest at ${energies[dimmest]}. ` +
    `The thinnest stretch of channel sits between ${from.name} and ${to.name} — ` +
    `that is where a mudra or a sentence in the journal would show up first. ` +
    `Palm field reads ${fieldIndex}, continuity ${continuity}.`;

  return { headline, body, brightest, dimmest, weakestSegment };
}

export interface PalmDelta {
  key: ChakraKey | 'field' | 'channel';
  label: string;
  today: number;
  previous: number;
  delta: number;
  color: string;
}

/** Row-by-row difference between two scans of the chakraOS visualisation. */
export function comparePalmScans(current: PalmScan, previous: PalmScan): PalmDelta[] {
  const rows: PalmDelta[] = RIGHT_HAND_POINTS.map((p) => {
    const today = current.energies[p.key] ?? 0;
    const prev = previous.energies[p.key] ?? 0;
    return {
      key: p.key,
      label: CHAKRA_BY_KEY[p.key].name.split(' ')[0].toUpperCase(),
      today,
      previous: prev,
      delta: today - prev,
      color: CHAKRA_BY_KEY[p.key].color,
    };
  });

  rows.push({
    key: 'channel',
    label: 'CHANNEL',
    today: current.continuity,
    previous: previous.continuity,
    delta: current.continuity - previous.continuity,
    color: '#8a90a6',
  });
  rows.push({
    key: 'field',
    label: 'FIELD',
    today: current.fieldIndex,
    previous: previous.fieldIndex,
    delta: current.fieldIndex - previous.fieldIndex,
    color: '#36d6e7',
  });

  return rows;
}
