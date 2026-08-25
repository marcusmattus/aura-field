/**
 * Mudra Vision library — one hand shape per field node.
 *
 * The camera is a mirror: it shows the user their own hand beside the reference
 * shape. chakraOS times the hold and folds it into the field the same way a
 * frequency session does. It does not grade or verify hand position.
 */

import { CHAKRA_ORDER } from '@/lib/chakras';
import { FREQUENCY_BY_KEY } from '@/lib/frequency/registry';
import type { ChakraKey, CompletedSession } from '@/lib/types';

/** Sessions recorded from a mudra hold carry this session-key prefix. */
export const MUDRA_SESSION_PREFIX = 'mudra:';

export interface MudraDefinition {
  key: string;
  chakra: ChakraKey;
  name: string;
  sanskrit: string;
  /** short intent line */
  intent: string;
  /** ordered shape instructions */
  steps: [string, string, string];
  /** palm points the shape is said to gather toward, used to light the guide */
  gathers: ChakraKey[];
  /** suggested hold lengths in seconds */
  holds: [number, number, number];
  /** one-line cue while holding */
  cue: string;
}

export const MUDRAS: MudraDefinition[] = [
  {
    key: 'dhyana',
    chakra: 'soul',
    name: 'Dhyana',
    sanskrit: 'ध्यान',
    intent: 'Open the far end of the channel and stop reaching.',
    steps: [
      'Rest both hands in your lap, right cupped inside left.',
      'Let the thumb tips touch lightly above the palms.',
      'Let the shoulders drop and the jaw go slack.',
    ],
    gathers: ['soul', 'crown'],
    holds: [120, 300, 600],
    cue: 'Nothing to hold. Let the hands be a bowl.',
  },
  {
    key: 'sahasrara',
    chakra: 'crown',
    name: 'Sahasrara',
    sanskrit: 'सहस्रार',
    intent: 'Meet the top of the channel without straining upward.',
    steps: [
      'Press the pads of both middle fingers together.',
      'Fold the ring fingers in and let the thumbs cross beneath.',
      'Raise the shape to the height of your forehead.',
    ],
    gathers: ['crown', 'soul'],
    holds: [90, 180, 300],
    cue: 'Fingertips light. Let the arms be held, not lifted.',
  },
  {
    key: 'hakini',
    chakra: 'third',
    name: 'Hakini',
    sanskrit: 'हाकिनी',
    intent: 'Gather scattered attention back into one place.',
    steps: [
      'Bring all five fingertips of each hand to meet their twin.',
      'Keep the palms apart, fingers domed like a cage.',
      'Breathe in through the nose, out through the mouth.',
    ],
    gathers: ['third', 'crown'],
    holds: [90, 180, 300],
    cue: 'Eyes soft toward the space between your hands.',
  },
  {
    key: 'granthita',
    chakra: 'throat',
    name: 'Granthita',
    sanskrit: 'ग्रन्थित',
    intent: 'Loosen what is held back before it becomes resentment.',
    steps: [
      'Interlace the fingers of both hands, palms inward.',
      'Press the thumb tips together and the index tips together.',
      'Hold the shape at the base of the throat.',
    ],
    gathers: ['throat', 'heart'],
    holds: [90, 180, 300],
    cue: 'Long exhale. Let a sound leave on it if one wants to.',
  },
  {
    key: 'padma',
    chakra: 'heart',
    name: 'Padma',
    sanskrit: 'पद्म',
    intent: 'Open the hollow of the palm without asking anything of it.',
    steps: [
      'Join the heels of the hands, thumbs and little fingers touching.',
      'Let the other six fingers open outward like petals.',
      'Hold the lotus in front of the sternum.',
    ],
    gathers: ['heart', 'throat', 'solar'],
    holds: [120, 300, 600],
    cue: 'Breathe into the width of the chest, not the height.',
  },
  {
    key: 'rudra',
    chakra: 'solar',
    name: 'Rudra',
    sanskrit: 'रुद्र',
    intent: 'Return weight to the centre when will has gone thin.',
    steps: [
      'Touch the thumb tip to the index and ring fingertips.',
      'Extend the middle and little fingers straight.',
      'Rest both hands on the thighs, palms up.',
    ],
    gathers: ['solar', 'sacral'],
    holds: [90, 180, 300],
    cue: 'Firm fingers, soft belly. Breathe low.',
  },
  {
    key: 'shakti',
    chakra: 'sacral',
    name: 'Shakti',
    sanskrit: 'शक्ति',
    intent: 'Let movement return to what has gone still.',
    steps: [
      'Fold the thumbs into the palms and cover them with the index and middle fingers.',
      'Press the ring and little fingertips of both hands together.',
      'Hold the shape at the level of the lower belly.',
    ],
    gathers: ['sacral', 'root'],
    holds: [90, 180, 300],
    cue: 'Unclench the pelvis. Let the breath reach it.',
  },
  {
    key: 'muladhara',
    chakra: 'root',
    name: 'Muladhara',
    sanskrit: 'मूलाधार',
    intent: 'Ask the body whether it is actually unsafe right now.',
    steps: [
      'Join the little fingers and thumb tips of both hands.',
      'Fold the remaining fingers into the palms.',
      'Rest the shape low, in front of the pelvis.',
    ],
    gathers: ['root', 'earth'],
    holds: [120, 300, 600],
    cue: 'Feel both feet. Name one thing that is holding you.',
  },
  {
    key: 'prithvi',
    chakra: 'earth',
    name: 'Prithvi',
    sanskrit: 'पृथ्वी',
    intent: 'Put weight back into the ground under the hand.',
    steps: [
      'Touch the thumb tip to the ring fingertip on each hand.',
      'Extend the other three fingers, relaxed.',
      'Rest the backs of the hands on the knees.',
    ],
    gathers: ['earth', 'root'],
    holds: [120, 300, 600],
    cue: 'Slow the breath until it feels heavier than the thoughts.',
  },
];

export const MUDRA_BY_KEY: Record<string, MudraDefinition> = MUDRAS.reduce<
  Record<string, MudraDefinition>
>((acc, m) => {
  acc[m.key] = m;
  return acc;
}, {});

export const MUDRA_BY_CHAKRA: Record<ChakraKey, MudraDefinition> = CHAKRA_ORDER.reduce(
  (acc, key) => {
    const found = MUDRAS.find((m) => m.chakra === key);
    if (found) acc[key] = found;
    return acc;
  },
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- every chakra key has exactly one mudra in MUDRAS
  {} as Record<ChakraKey, MudraDefinition>,
);

/** Session key written when a mudra hold completes. */
export function mudraSessionKey(mudraKey: string): string {
  return `${MUDRA_SESSION_PREFIX}${mudraKey}`;
}

/** True when a completed session came from a mudra hold rather than a sound session. */
export function isMudraSession(s: CompletedSession): boolean {
  return s.sessionKey.startsWith(MUDRA_SESSION_PREFIX);
}

/** Mudra holds recorded against a node, newest first. */
export function mudraSessionsFor(chakra: ChakraKey, sessions: CompletedSession[]) {
  return sessions.filter((s) => isMudraSession(s) && s.chakra === chakra);
}

/** Carrier frequency a mudra hold is filed under — the node's own solfeggio tone. */
export function mudraHz(chakra: ChakraKey): number {
  return FREQUENCY_BY_KEY[chakra].baseFrequencyHz;
}
