import { CHAKRA_BY_KEY } from '@/lib/chakras';
import type {
  Breakthrough,
  ChakraState,
  CompletedSession,
  JournalEntry,
  Observation,
} from '@/lib/types';

/**
 * Oracle agent (deterministic core) — Today's Observation, breakthrough
 * detection. The mystical register: observational, never diagnostic.
 */
export function todaysObservation(states: ChakraState[]): Observation {
  const sorted = [...states].sort((a, b) => b.trend7d - a.trend7d);
  const rising = sorted[0];
  const falling = sorted[sorted.length - 1];
  const risingName = CHAKRA_BY_KEY[rising.key].name;
  const fallingChakra = CHAKRA_BY_KEY[falling.key];

  let text: string;
  if (falling.trend7d < -5) {
    text = `Your ${fallingChakra.name} dropped ${Math.abs(falling.trend7d)}% over 7 days. ${risingName} is climbing to meet it.`;
  } else if (rising.trend7d > 5) {
    text = `${risingName} and ${CHAKRA_BY_KEY[sorted[1].key].name} are climbing in harmony.`;
  } else {
    text = 'The field is quiet today. A single sentence would tell it something new.';
  }

  return {
    text,
    chips: [
      { label: '5 min breath', surface: 'coach' },
      {
        label: `${fallingChakra.solfeggioHz} Hz pack`,
        surface: 'sound',
        hz: fallingChakra.solfeggioHz,
        chakra: falling.key,
      },
    ],
  };
}

/**
 * Detect breakthroughs from new state vs prior. Returns newly-earned ones.
 */
export function detectBreakthroughs(args: {
  entries: JournalEntry[];
  sessions: CompletedSession[];
  states: ChakraState[];
  existing: Breakthrough[];
  streak: number;
  now: number;
}): Breakthrough[] {
  const { entries, sessions, states, existing, streak, now } = args;
  const have = new Set(existing.map((b) => b.type));
  const earned: Breakthrough[] = [];

  const add = (type: string, label: string) => {
    if (have.has(type)) return;
    earned.push({ id: `${type}-${now}`, type, label, occurredAt: now });
    have.add(type);
  };

  // First voice journal
  if (entries.some((e) => e.modality === 'voice')) {
    add('first-voice', 'First voice journal');
  }

  // Harmonic: two adjacent high nodes
  const heart = states.find((s) => s.key === 'heart');
  const throat = states.find((s) => s.key === 'throat');
  if (heart && throat && heart.energy >= 70 && throat.energy >= 70) {
    add('heart-throat-harmonic', 'Heart Throat harmonic appeared');
  }

  // Session milestones
  if (sessions.length >= 1) add('first-session', 'First sound session complete');
  if (sessions.length >= 10) add('ten-sessions', 'Ten sessions through the field');

  // Streak milestones
  if (streak >= 7) add('streak-7', '7-day streak held');
  if (streak >= 14) add('streak-14', '14-day streak held');

  // Journaling volume
  if (entries.length >= 1) add('first-entry', 'First entry into the field');
  if (entries.length >= 25) add('25-entries', '25 sentences offered');

  return earned;
}
