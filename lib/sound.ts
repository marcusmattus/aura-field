/**
 * SOUND & FREQUENCY·COLOR SYSTEM — the derivation core.
 *
 * The one principle: everything visual and sonic is DERIVED from a session's
 * `baseHz` + `beatHz`. Nothing is hand-authored per sound. A Session is just a
 * few numbers; `deriveSession()` turns it into color, gradient, glow, band,
 * palette, and the readout label. Adding a sound = appending one object to
 * `SOUND_LIBRARY`. If you ever need to touch a component to add a sound, the
 * pipeline is wrong — fix the pipeline, not the data.
 */

import type { ChakraKey } from '@/lib/types';

// ─────────────────────────────────────────────────────────────────────────
// 1) The Session schema (the minimum a sound stores)
// ─────────────────────────────────────────────────────────────────────────

export type Noise = 'pink' | 'brown';

/** A sound is just a handful of numbers + a few tags. Everything else derives. */
export interface Session {
  id: string;
  name: string;
  packId: string;
  /** carrier / solfeggio tone */
  baseHz: number;
  /** binaural offset; omit for a pure drone */
  beatHz?: number;
  durationSec: number;
  /** optional texture layer */
  noise?: Noise | null;
  /** OPTIONAL override; else nearest anchor to baseHz */
  chakraKey?: ChakraKey;
  /** free labels e.g. 'restorative','sleep' */
  tags?: string[];
}

// ─────────────────────────────────────────────────────────────────────────
// 2) frequencyToColor — the color engine (OKLab, log-frequency interpolation)
//    Anchored on the nine node colors; returns the EXACT anchor hex at each
//    anchor and a perceptually smooth ramp between. Color is NEVER stored on a
//    Session — always computed from baseHz.
// ─────────────────────────────────────────────────────────────────────────

const ANCHORS: { hz: number; hex: string }[] = [
  { hz: 174, hex: '#C0433A' },
  { hz: 396, hex: '#FF4D5E' },
  { hz: 417, hex: '#FF8A3D' },
  { hz: 528, hex: '#FFD23D' },
  { hz: 639, hex: '#36F5A6' },
  { hz: 741, hex: '#3DB6FF' },
  { hz: 852, hex: '#6B6BFF' },
  { hz: 963, hex: '#B14DFF' },
];
const SOUL = '#EAF0FF'; // luminous terminus (>= 1000 Hz)

const hexToRgb = (h: string): number[] => {
  const s = h.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(s.slice(i, i + 2), 16) / 255);
};
const rgbToHex = ([r, g, b]: number[]): string =>
  '#' +
  [r, g, b]
    .map((v) =>
      Math.round(Math.min(1, Math.max(0, v)) * 255)
        .toString(16)
        .padStart(2, '0'),
    )
    .join('')
    .toUpperCase();

const sToL = (c: number): number => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lToS = (c: number): number => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

function rgbToOklab([r0, g0, b0]: number[]): number[] {
  const r = sToL(r0);
  const g = sToL(g0);
  const b = sToL(b0);
  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b;
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b;
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b;
  const lc = Math.cbrt(l);
  const mc = Math.cbrt(m);
  const sc = Math.cbrt(s);
  return [
    0.2104542553 * lc + 0.793617785 * mc - 0.0040720468 * sc,
    1.9779984951 * lc - 2.428592205 * mc + 0.4505937099 * sc,
    0.0259040371 * lc + 0.7827717662 * mc - 0.808675766 * sc,
  ];
}

function oklabToRgb([L, a, b]: number[]): number[] {
  const lp = L + 0.3963377774 * a + 0.2158037573 * b;
  const mp = L - 0.1055613458 * a - 0.0638541728 * b;
  const sp = L - 0.0894841775 * a - 1.291485548 * b;
  const l = lp ** 3;
  const m = mp ** 3;
  const s = sp ** 3;
  return [
    lToS(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    lToS(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    lToS(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s),
  ];
}

const lerp = (a: number[], b: number[], t: number): number[] => a.map((v, i) => v + (b[i] - v) * t);

/** The single source of truth for every sound color, gradient, glow and hue. */
export function frequencyToColor(hz: number): string {
  if (hz >= 1000) return SOUL;
  if (hz <= ANCHORS[0].hz) return ANCHORS[0].hex;
  if (hz >= ANCHORS[ANCHORS.length - 1].hz) return ANCHORS[ANCHORS.length - 1].hex;
  let lo = ANCHORS[0];
  let hi = ANCHORS[ANCHORS.length - 1];
  for (let i = 0; i < ANCHORS.length - 1; i++) {
    if (hz >= ANCHORS[i].hz && hz <= ANCHORS[i + 1].hz) {
      lo = ANCHORS[i];
      hi = ANCHORS[i + 1];
      break;
    }
  }
  const t = (Math.log(hz) - Math.log(lo.hz)) / (Math.log(hi.hz) - Math.log(lo.hz));
  return rgbToHex(oklabToRgb(lerp(rgbToOklab(hexToRgb(lo.hex)), rgbToOklab(hexToRgb(hi.hex)), t)));
}

// ─────────────────────────────────────────────────────────────────────────
// 3) Brainwave bands — bandFromBeat(beatHz) drives the visualizer's motion
// ─────────────────────────────────────────────────────────────────────────

export interface Brainwave {
  band: string;
  min: number;
  max: number;
  intent: string;
  /** visualizer breath period (seconds) */
  tempoS: number;
  /** ring density */
  rings: number;
  /** glow spread (0..1) */
  soft: number;
}

export const BRAINWAVES: Brainwave[] = [
  {
    band: 'delta',
    min: 0.5,
    max: 4,
    intent: 'deep rest · sleep',
    tempoS: 9.0,
    rings: 3,
    soft: 1.0,
  },
  {
    band: 'theta',
    min: 4,
    max: 8,
    intent: 'meditation · dream',
    tempoS: 6.0,
    rings: 4,
    soft: 0.85,
  },
  {
    band: 'alpha',
    min: 8,
    max: 13,
    intent: 'calm focus · restorative',
    tempoS: 4.0,
    rings: 5,
    soft: 0.6,
  },
  { band: 'beta', min: 13, max: 30, intent: 'alert · clarity', tempoS: 2.5, rings: 7, soft: 0.4 },
  { band: 'gamma', min: 30, max: 100, intent: 'insight · peak', tempoS: 1.4, rings: 9, soft: 0.25 },
];

/** Map a binaural offset to its brainwave band. Falsy beatHz → pure drone. */
export function bandFromBeat(beatHz?: number): Brainwave | null {
  if (!beatHz) return null;
  return (
    BRAINWAVES.find((b) => beatHz >= b.min && beatHz < b.max) ?? BRAINWAVES[BRAINWAVES.length - 1]
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 4) Frequency → nearest node
// ─────────────────────────────────────────────────────────────────────────

const CHAKRA_BY_HZ: [number, ChakraKey][] = [
  [174, 'earth'],
  [396, 'root'],
  [417, 'sacral'],
  [528, 'solar'],
  [639, 'heart'],
  [741, 'throat'],
  [852, 'third'],
  [963, 'crown'],
];

export function nearestChakra(hz: number): ChakraKey {
  if (hz >= 1000) return 'soul';
  return CHAKRA_BY_HZ.reduce((a, c) => (Math.abs(c[0] - hz) < Math.abs(a[0] - hz) ? c : a))[1];
}

// ─────────────────────────────────────────────────────────────────────────
// 5) deriveSession — turns the few numbers into everything the UI consumes
// ─────────────────────────────────────────────────────────────────────────

export interface DerivedSession extends Session {
  chakra: ChakraKey;
  color: string;
  accent: string;
  band: string;
  bandIntent: string;
  gradient: [string, string];
  glow: number;
  rings: number;
  tempoS: number;
  palette: { core: string; ring: string; halo: string; bg: string };
  label: string;
}

const BG = '#0A0E18';

export function deriveSession(s: Session): DerivedSession {
  const color = frequencyToColor(s.baseHz);
  const accent = frequencyToColor(s.baseHz * 1.5); // fifth up
  const band = bandFromBeat(s.beatHz);
  const chakra = s.chakraKey ?? nearestChakra(s.baseHz);
  const minutes = Math.round(s.durationSec / 60);
  const label = `${s.baseHz} Hz · ${band ? `${band.band} ${s.beatHz} Hz` : 'drone'} · ${minutes} min`;
  return {
    ...s,
    chakra,
    color,
    accent,
    band: band?.band ?? 'drone',
    bandIntent: band?.intent ?? 'ambient drone',
    gradient: [color, accent],
    glow: band?.soft ?? 0.7,
    rings: band?.rings ?? 4,
    tempoS: band?.tempoS ?? 8,
    palette: { core: color, ring: accent, halo: `${color}2E`, bg: BG },
    label,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// 6) Packs + the library (the list). To add a sound: append ONE object below.
// ─────────────────────────────────────────────────────────────────────────

export interface Pack {
  id: string;
  name: string;
  note: string;
}

export const PACKS: Pack[] = [
  { id: 'solfeggio-core', name: 'Solfeggio Core', note: 'one drone per node, Earth → Soul' },
  { id: 'restoration', name: 'Restoration', note: 'rebuild a depleted center' },
  { id: 'ground', name: 'Ground', note: 'low, slow, for the body' },
  { id: 'heart', name: 'Heart Coherence', note: 'breath-paced openness' },
  { id: 'clarity', name: 'Clarity', note: 'lift a quiet upper field' },
];

export const SOUND_LIBRARY: Session[] = [
  // Solfeggio Core — one drone per node (beatHz omitted = pure drone)
  {
    id: 'core-earth',
    name: 'Earth Drone',
    packId: 'solfeggio-core',
    baseHz: 174,
    durationSec: 600,
    noise: 'brown',
    tags: ['ground'],
  },
  {
    id: 'core-root',
    name: 'Root Drone',
    packId: 'solfeggio-core',
    baseHz: 396,
    durationSec: 600,
    tags: ['release'],
  },
  {
    id: 'core-sacral',
    name: 'Sacral Drone',
    packId: 'solfeggio-core',
    baseHz: 417,
    durationSec: 600,
    tags: ['flow'],
  },
  {
    id: 'core-solar',
    name: 'Solar Drone',
    packId: 'solfeggio-core',
    baseHz: 528,
    durationSec: 600,
    tags: ['will'],
  },
  {
    id: 'core-heart',
    name: 'Heart Drone',
    packId: 'solfeggio-core',
    baseHz: 639,
    durationSec: 600,
    tags: ['connection'],
  },
  {
    id: 'core-throat',
    name: 'Throat Drone',
    packId: 'solfeggio-core',
    baseHz: 741,
    durationSec: 600,
    tags: ['voice'],
  },
  {
    id: 'core-third',
    name: 'Third Eye Drone',
    packId: 'solfeggio-core',
    baseHz: 852,
    durationSec: 600,
    tags: ['intuition'],
  },
  {
    id: 'core-crown',
    name: 'Crown Drone',
    packId: 'solfeggio-core',
    baseHz: 963,
    durationSec: 600,
    tags: ['awareness'],
  },
  {
    id: 'core-soul',
    name: 'Soul · Aum',
    packId: 'solfeggio-core',
    baseHz: 1074,
    durationSec: 600,
    chakraKey: 'soul',
    tags: ['unity'],
  },

  // Restoration
  {
    id: 'third-eye-restoration',
    name: 'Third Eye Restoration',
    packId: 'restoration',
    baseHz: 852,
    beatHz: 8,
    durationSec: 720,
    tags: ['restorative', 'solfeggio'],
  },
  {
    id: 'crown-opening',
    name: 'Crown Opening',
    packId: 'restoration',
    baseHz: 963,
    beatHz: 6,
    durationSec: 900,
    tags: ['restorative'],
  },

  // Ground
  {
    id: 'deep-ground',
    name: 'Deep Ground',
    packId: 'ground',
    baseHz: 174,
    beatHz: 2,
    durationSec: 1200,
    noise: 'brown',
    tags: ['sleep'],
  },
  {
    id: 'root-hold',
    name: 'Root Hold',
    packId: 'ground',
    baseHz: 396,
    beatHz: 4,
    durationSec: 600,
    tags: ['safety'],
  },

  // Heart Coherence
  {
    id: 'heart-coherence',
    name: 'Heart Coherence',
    packId: 'heart',
    baseHz: 639,
    beatHz: 10,
    durationSec: 660,
    tags: ['breath'],
  },

  // Clarity
  {
    id: 'clear-sight',
    name: 'Clear Sight',
    packId: 'clarity',
    baseHz: 741,
    beatHz: 14,
    durationSec: 480,
    tags: ['focus'],
  },
  {
    id: 'focus-field',
    name: 'Focus Field',
    packId: 'clarity',
    baseHz: 528,
    beatHz: 12,
    durationSec: 480,
    tags: ['focus'],
  },
];

// ─────────────────────────────────────────────────────────────────────────
// 7) Lookups — convenience over the data above (still nothing hand-authored)
// ─────────────────────────────────────────────────────────────────────────

/** The whole library, derived. The Sound list renders straight from this. */
export const derivedLibrary = (): DerivedSession[] => SOUND_LIBRARY.map(deriveSession);

export const packById = (id: string): Pack | undefined => PACKS.find((p) => p.id === id);

export const sessionsInPack = (packId: string): DerivedSession[] =>
  SOUND_LIBRARY.filter((s) => s.packId === packId).map(deriveSession);

/** Find a session by id and derive it (used by the player). */
export function derivedById(id: string): DerivedSession | undefined {
  const s = SOUND_LIBRARY.find((x) => x.id === id);
  return s ? deriveSession(s) : undefined;
}

/** The Solfeggio Core drone for a node — used by Inspector's "Begin" launch. */
export function coreSessionForChakra(key: ChakraKey): DerivedSession | undefined {
  const s = SOUND_LIBRARY.find(
    (x) => x.packId === 'solfeggio-core' && (x.chakraKey ?? nearestChakra(x.baseHz)) === key,
  );
  return s ? deriveSession(s) : undefined;
}

/** The pack a given frequency belongs to (Body's "852 Hz pack" chip). */
export function packForHz(hz: number): Pack | undefined {
  const match = SOUND_LIBRARY.find((s) => s.baseHz === hz);
  return match ? packById(match.packId) : undefined;
}

// ─────────────────────────────────────────────────────────────────────────
// 8) Frequency agent — composes a Session for the current field state.
//    It may return a frequency that is not in the library; because everything
//    derives from Hz, it still colors, plays, and visualizes correctly.
// ─────────────────────────────────────────────────────────────────────────

const ANCHOR_HZ: Record<ChakraKey, number> = {
  earth: 174,
  root: 396,
  sacral: 417,
  solar: 528,
  heart: 639,
  throat: 741,
  third: 852,
  crown: 963,
  soul: 1074,
};

const NODE_NAME: Record<ChakraKey, string> = {
  earth: 'Earth',
  root: 'Root',
  sacral: 'Sacral',
  solar: 'Solar',
  heart: 'Heart',
  throat: 'Throat',
  third: 'Third Eye',
  crown: 'Crown',
  soul: 'Soul',
};

/** Target the most-depleted node; deeper depletion → slower (more restorative) beat. */
export function suggestFieldSession(states: { key: ChakraKey; energy: number }[]): Session {
  const low = [...states].sort((a, b) => a.energy - b.energy)[0] ?? { key: 'third', energy: 50 };
  const deep = low.energy < 35;
  return {
    id: `field-${low.key}`,
    name: `${NODE_NAME[low.key]} Restoration`,
    packId: 'restoration',
    baseHz: ANCHOR_HZ[low.key],
    beatHz: deep ? 6 : 8, // theta when depleted, alpha when rebalancing
    durationSec: deep ? 720 : 600,
    tags: ['suggested', deep ? 'restorative' : 'balancing'],
  };
}
