import type { ChakraKey, EntryTag } from '@/lib/types';

/**
 * Lexicon mapping keywords → chakra + theme + signal direction.
 * This is the deterministic core of the Awareness agent (journal-analyze).
 * Config-driven so the model can evolve without a release.
 */
interface LexEntry {
  chakra: ChakraKey;
  theme: string;
  /** negative pulls energy down, positive lifts it */
  signal: 'low' | 'high' | 'neutral';
  words: string[];
}

export const LEXICON: LexEntry[] = [
  // Third Eye — clarity / focus / intuition
  {
    chakra: 'third',
    theme: 'exhaustion',
    signal: 'low',
    words: [
      'tired',
      'drained',
      'exhausted',
      'foggy',
      'fog',
      'cant focus',
      "can't focus",
      'unfocused',
      'scattered',
      'distracted',
    ],
  },
  {
    chakra: 'third',
    theme: 'insight',
    signal: 'high',
    words: ['clear', 'clarity', 'insight', 'realized', 'understood', 'saw', 'vision', 'intuition'],
  },
  // Crown — meaning / awareness / overwhelm
  {
    chakra: 'crown',
    theme: 'overwhelm',
    signal: 'low',
    words: ['overwhelmed', 'meaningless', 'pointless', 'lost', 'disconnected', 'numb', 'empty'],
  },
  {
    chakra: 'crown',
    theme: 'meaning',
    signal: 'high',
    words: ['grateful', 'gratitude', 'meaning', 'purpose', 'aligned', 'awake', 'present'],
  },
  // Throat — voice / truth / expression
  {
    chakra: 'throat',
    theme: 'silence',
    signal: 'low',
    words: [
      'unsaid',
      'silent',
      'couldnt say',
      "couldn't say",
      'held back',
      'bit my tongue',
      'voiceless',
    ],
  },
  {
    chakra: 'throat',
    theme: 'expression',
    signal: 'high',
    words: ['spoke', 'said', 'expressed', 'told', 'honest', 'truth', 'sang', 'wrote'],
  },
  // Heart — love / grief / connection
  {
    chakra: 'heart',
    theme: 'grief',
    signal: 'low',
    words: [
      'lonely',
      'alone',
      'hurt',
      'grief',
      'heartbroken',
      'rejected',
      'tension in my chest',
      'tension',
    ],
  },
  {
    chakra: 'heart',
    theme: 'release',
    signal: 'high',
    words: [
      'love',
      'loved',
      'connected',
      'warm',
      'open',
      'release',
      'released',
      'forgave',
      'tender',
    ],
  },
  // Solar — will / power / confidence
  {
    chakra: 'solar',
    theme: 'doubt',
    signal: 'low',
    words: [
      'anxious',
      'anxiety',
      'stress',
      'stressed',
      'afraid',
      'doubt',
      'weak',
      'powerless',
      'small',
    ],
  },
  {
    chakra: 'solar',
    theme: 'will',
    signal: 'high',
    words: ['confident', 'strong', 'capable', 'decided', 'powerful', 'driven', 'motivated'],
  },
  // Sacral — feeling / creativity / desire
  {
    chakra: 'sacral',
    theme: 'flatness',
    signal: 'low',
    words: ['bored', 'flat', 'stuck', 'creatively blocked', 'uninspired', 'dry'],
  },
  {
    chakra: 'sacral',
    theme: 'flow',
    signal: 'high',
    words: ['creative', 'inspired', 'playful', 'flow', 'desire', 'alive', 'curious', 'excited'],
  },
  // Root — safety / body / ground
  {
    chakra: 'root',
    theme: 'unsafe',
    signal: 'low',
    words: ['unsafe', 'scared', 'shaky', 'ungrounded', 'restless', 'money', 'insecure'],
  },
  {
    chakra: 'root',
    theme: 'ground',
    signal: 'high',
    words: ['safe', 'grounded', 'steady', 'rooted', 'secure', 'calm', 'stable'],
  },
];

/**
 * Theme → signal direction, derived from the LEXICON so the field agent never
 * re-hardcodes which themes lift vs drain. This is the single source of truth:
 * add a lexicon entry and its direction flows into scoring automatically.
 */
export const THEME_SIGNAL: Record<string, 'low' | 'high'> = {};
for (const lex of LEXICON) {
  if (lex.signal !== 'neutral') THEME_SIGNAL[lex.theme] = lex.signal;
}

/** Circadian markers — late-night entries depress Third Eye / Crown. */
export const LATE_NIGHT_WORDS = [
  'late-night',
  'late night',
  "couldn't sleep",
  'cant sleep',
  'midnight',
  'scrolling',
  '2am',
  '3am',
  'insomnia',
  'awake at night',
];

export interface AnalyzeResult {
  tags: EntryTag[];
  themes: string[];
  /** raw signal direction per matched chakra, for the field agent */
  signals: { chakra: ChakraKey; signal: 'low' | 'high' }[];
  lateNight: boolean;
  /** phrases detected in the entry (for surfaced-signal aggregation) */
  phrases: { phrase: string; chakra: ChakraKey; signal: string }[];
  modality: 'text' | 'voice';
  /** distress detected — Coach should hand off, not coach */
  distress: boolean;
}

const DISTRESS_WORDS = [
  'kill myself',
  'end it all',
  'want to die',
  'suicide',
  'suicidal',
  'self harm',
  'self-harm',
  'hurt myself',
  'no reason to live',
  "can't go on",
  'cant go on',
];

export function detectDistress(text: string): boolean {
  const t = text.toLowerCase();
  return DISTRESS_WORDS.some((w) => t.includes(w));
}

/**
 * Awareness agent (deterministic core). Tags an entry with chakra + theme,
 * extracts recurring phrases, and flags distress / late-night signals.
 */
export function analyzeEntry(
  body: string,
  modality: 'text' | 'voice',
  seededChakra?: ChakraKey,
): AnalyzeResult {
  const text = body.toLowerCase();
  const tags: EntryTag[] = [];
  const themes: string[] = [];
  const signals: { chakra: ChakraKey; signal: 'low' | 'high' }[] = [];
  const phrases: { phrase: string; chakra: ChakraKey; signal: string }[] = [];

  for (const lex of LEXICON) {
    const matched = lex.words.filter((w) => text.includes(w));
    if (matched.length === 0) continue;
    const weight = Math.min(1, 0.45 + matched.length * 0.2);
    tags.push({ chakra: lex.chakra, theme: lex.theme, weight });
    if (!themes.includes(lex.theme)) themes.push(lex.theme);
    if (lex.signal !== 'neutral') {
      signals.push({ chakra: lex.chakra, signal: lex.signal });
    }
    for (const m of matched) {
      phrases.push({ phrase: m, chakra: lex.chakra, signal: lex.theme });
    }
  }

  const lateNight = LATE_NIGHT_WORDS.some((w) => text.includes(w));
  if (lateNight) {
    if (!themes.includes('late-night')) themes.push('late-night');
    phrases.push({ phrase: 'late-night sleep entries', chakra: 'third', signal: 'circadian' });
  }

  // If pre-seeded to a node and nothing matched, attribute lightly to that node.
  if (tags.length === 0 && seededChakra) {
    tags.push({ chakra: seededChakra, theme: 'reflection', weight: 0.4 });
  }

  return {
    tags,
    themes,
    signals,
    lateNight,
    phrases,
    modality,
    distress: detectDistress(body),
  };
}
