/**
 * The Mudra Vision registry. Every mudra the alignment system knows about is
 * configured here — nothing about a mudra's shape, duration, or traditional
 * framing is hardcoded into a screen or component. Adding an eleventh mudra
 * is adding one entry to MUDRAS below.
 */

import type { ChakraKey } from '@/lib/types';
import type { FingerKey, Handedness, HandPose } from '@/lib/vision/types';
import type { FingerInstruction, ReferencePoseSpec } from '@/lib/vision/ReferencePose';
import { buildReferenceHandPose, buildReferencePose } from '@/lib/vision/ReferencePose';

export type MudraDifficulty = 'beginner' | 'intermediate' | 'advanced';

export interface Mudra {
  key: string;
  name: string;
  sanskrit: string;
  description: string;
  hand: Handedness | 'both';
  fingers: Record<FingerKey, FingerInstruction>;
  /** derived lazily by referencePose() below — never hand-authored */
  traditionalAssociations: {
    chakras: ChakraKey[];
    themes: string[];
    bija?: string;
  };
  recommendedDuration: number; // seconds
  difficulty: MudraDifficulty;
}

const fingers = (
  thumb: FingerInstruction,
  index: FingerInstruction,
  middle: FingerInstruction,
  ring: FingerInstruction,
  pinky: FingerInstruction,
): Record<FingerKey, FingerInstruction> => ({ thumb, index, middle, ring, pinky });

const extended = (instruction: string, spreadDeg = 0): FingerInstruction => ({
  curl: 'extended',
  spreadDeg,
  instruction,
});
const relaxed = (instruction: string): FingerInstruction => ({ curl: 'relaxed', instruction });
const folded = (instruction: string): FingerInstruction => ({ curl: 'folded', instruction });
const touching = (
  target: FingerKey,
  instruction: string,
  curl: FingerInstruction['curl'] = 'curled',
): FingerInstruction => ({ curl, contact: { target, point: 'pad' }, instruction });

export const MUDRAS: Mudra[] = [
  {
    key: 'gyan',
    name: 'Gyan Mudra',
    sanskrit: 'ज्ञान मुद्रा',
    description: 'The gesture of knowledge. Thumb and index meet in a gentle circle.',
    hand: 'both',
    fingers: fingers(
      touching('index', 'Create a gentle circular contact with the index fingertip.'),
      touching('thumb', 'Touch the thumb tip lightly — no pressure.'),
      extended('Remain naturally extended.'),
      extended('Remain naturally extended.'),
      extended('Remain naturally extended.'),
    ),
    traditionalAssociations: { chakras: ['third', 'crown'], themes: ['focus', 'awareness', 'reflection'], bija: 'OM' },
    recommendedDuration: 120,
    difficulty: 'beginner',
  },
  {
    key: 'chin',
    name: 'Chin Mudra',
    sanskrit: 'चिन् मुद्रा',
    description: 'Gyan Mudra turned palm-down — consciousness meeting the ground.',
    hand: 'both',
    fingers: fingers(
      touching('index', 'Create a gentle circular contact with the index fingertip.'),
      touching('thumb', 'Touch the thumb tip lightly — no pressure.'),
      extended('Remain naturally extended.'),
      extended('Remain naturally extended.'),
      extended('Remain naturally extended.'),
    ),
    traditionalAssociations: { chakras: ['root', 'sacral'], themes: ['grounding', 'stillness'] },
    recommendedDuration: 120,
    difficulty: 'beginner',
  },
  {
    key: 'anjali',
    name: 'Anjali Mudra',
    sanskrit: 'अञ्जलि मुद्रा',
    description: 'The salutation seal — palms pressed evenly together at the heart.',
    hand: 'both',
    fingers: fingers(
      relaxed('Rest alongside the palm, not pressed flat.'),
      extended('Fingers together, extended, pressed to their twin.'),
      extended('Fingers together, extended, pressed to their twin.'),
      extended('Fingers together, extended, pressed to their twin.'),
      extended('Fingers together, extended, pressed to their twin.'),
    ),
    traditionalAssociations: { chakras: ['heart'], themes: ['gratitude', 'balance', 'greeting'] },
    recommendedDuration: 60,
    difficulty: 'beginner',
  },
  {
    key: 'dhyana',
    name: 'Dhyana Mudra',
    sanskrit: 'ध्यान मुद्रा',
    description: 'The meditation seal — hands resting in a quiet, open bowl.',
    hand: 'both',
    fingers: fingers(
      touching('index', 'Let the thumb tip meet the index lightly above the cupped palm.', 'relaxed'),
      touching('thumb', 'Curl softly to meet the thumb.', 'relaxed'),
      relaxed('Curl softly, forming the edge of the bowl.'),
      relaxed('Curl softly, forming the edge of the bowl.'),
      relaxed('Curl softly, forming the edge of the bowl.'),
    ),
    traditionalAssociations: { chakras: ['crown', 'soul'], themes: ['stillness', 'meditation', 'surrender'] },
    recommendedDuration: 300,
    difficulty: 'beginner',
  },
  {
    key: 'prana',
    name: 'Prana Mudra',
    sanskrit: 'प्राण मुद्रा',
    description: 'The gesture of life-force — thumb joins ring and pinky.',
    hand: 'both',
    fingers: fingers(
      touching('ring', 'Touch the tips of the ring and little fingers together.'),
      extended('Remain naturally extended.'),
      extended('Remain naturally extended.'),
      touching('thumb', 'Bring the fingertip to meet the thumb.'),
      touching('thumb', 'Bring the fingertip to meet the thumb.'),
    ),
    traditionalAssociations: { chakras: ['root', 'sacral'], themes: ['vitality', 'energy', 'renewal'] },
    recommendedDuration: 180,
    difficulty: 'beginner',
  },
  {
    key: 'apana',
    name: 'Apana Mudra',
    sanskrit: 'अपान मुद्रा',
    description: 'The gesture of release — thumb joins middle and ring.',
    hand: 'both',
    fingers: fingers(
      touching('middle', 'Touch the tips of the middle and ring fingers together.'),
      extended('Remain naturally extended.'),
      touching('thumb', 'Bring the fingertip to meet the thumb.'),
      touching('thumb', 'Bring the fingertip to meet the thumb.'),
      extended('Remain naturally extended.'),
    ),
    traditionalAssociations: { chakras: ['sacral', 'root'], themes: ['release', 'letting go', 'cleansing'] },
    recommendedDuration: 180,
    difficulty: 'beginner',
  },
  {
    key: 'shuni',
    name: 'Shuni Mudra',
    sanskrit: 'शूनी मुद्रा',
    description: 'The gesture of patience — thumb joins the middle finger.',
    hand: 'both',
    fingers: fingers(
      touching('middle', 'Touch the middle fingertip.'),
      extended('Remain naturally extended.'),
      touching('thumb', 'Bring the fingertip to meet the thumb.'),
      extended('Remain naturally extended.'),
      extended('Remain naturally extended.'),
    ),
    traditionalAssociations: { chakras: ['root', 'throat'], themes: ['patience', 'discipline', 'restraint'] },
    recommendedDuration: 150,
    difficulty: 'intermediate',
  },
  {
    key: 'surya',
    name: 'Surya Mudra',
    sanskrit: 'सूर्य मुद्रा',
    description: 'The gesture of the sun — the ring finger folds under the thumb.',
    hand: 'both',
    fingers: fingers(
      folded('Press the ring finger down and hold it folded.'),
      extended('Remain naturally extended.'),
      extended('Remain naturally extended.'),
      touching('thumb', 'Fold under and let the thumb hold it down.', 'folded'),
      extended('Remain naturally extended.'),
    ),
    traditionalAssociations: { chakras: ['solar', 'root'], themes: ['warmth', 'vitality', 'metabolism'] },
    recommendedDuration: 150,
    difficulty: 'intermediate',
  },
  {
    key: 'buddhi',
    name: 'Buddhi Mudra',
    sanskrit: 'बुद्धि मुद्रा',
    description: 'The gesture of mental clarity — thumb joins the little finger.',
    hand: 'both',
    fingers: fingers(
      touching('pinky', 'Touch the little fingertip.'),
      extended('Remain naturally extended.'),
      extended('Remain naturally extended.'),
      extended('Remain naturally extended.'),
      touching('thumb', 'Bring the fingertip to meet the thumb.'),
    ),
    traditionalAssociations: { chakras: ['throat'], themes: ['clarity', 'communication', 'intuition'] },
    recommendedDuration: 120,
    difficulty: 'beginner',
  },
  {
    key: 'hakini',
    name: 'Hakini Mudra',
    sanskrit: 'हाकिनी मुद्रा',
    description: 'The gesture of integration — every fingertip meets its twin, forming a dome.',
    hand: 'both',
    fingers: fingers(
      extended('Extended and slightly spread, ready to meet its twin.', 12),
      extended('Extended and slightly spread, ready to meet its twin.', 8),
      extended('Extended and slightly spread, ready to meet its twin.', 4),
      extended('Extended and slightly spread, ready to meet its twin.', 6),
      extended('Extended and slightly spread, ready to meet its twin.', 10),
    ),
    traditionalAssociations: { chakras: ['crown', 'third'], themes: ['integration', 'memory', 'wholeness'] },
    recommendedDuration: 180,
    difficulty: 'advanced',
  },
];

export const MUDRA_BY_KEY: Record<string, Mudra> = MUDRAS.reduce<Record<string, Mudra>>(
  (acc, m) => {
    acc[m.key] = m;
    return acc;
  },
  {},
);

const referencePoseCache = new Map<string, ReferencePoseSpec>();
const referenceHandPoseCache = new Map<string, HandPose>();

/** The mudra's target landmark set + tolerance, built on first use and cached. */
export function referencePoseFor(mudra: Mudra): ReferencePoseSpec {
  const cached = referencePoseCache.get(mudra.key);
  if (cached) return cached;
  const built = buildReferencePose(mudra.fingers, mudra.difficulty);
  referencePoseCache.set(mudra.key, built);
  return built;
}

/** The mudra's target pose as a full HandPose, mirrored for the requested hand. */
export function referenceHandPoseFor(mudra: Mudra, hand: Handedness): HandPose {
  const cacheKey = `${mudra.key}:${hand}`;
  const cached = referenceHandPoseCache.get(cacheKey);
  if (cached) return cached;
  const built = buildReferenceHandPose(mudra.fingers, hand);
  referenceHandPoseCache.set(cacheKey, built);
  return built;
}

/** Two-hand mudras (Anjali, Dhyana, Hakini, …) are scored on a single tracked
 * hand's shape today — see "Future Features" in the spec for full two-hand
 * support. This flag lets the UI say so honestly instead of pretending. */
export function isTwoHandMudra(mudra: Mudra): boolean {
  return mudra.hand === 'both';
}
