import { CHAKRA_BY_KEY } from '@/lib/chakras';
import type {
  ChakraKey,
  ChakraState,
  JournalEntry,
  Protocol,
  SoundSession,
  SurfacedSignal,
} from '@/lib/types';

const DAY_MS = 86_400_000;

/**
 * Aggregate recurring phrases from the last 7 days into surfaced signals
 * for a given node (Inspector's "SURFACED IN JOURNAL · LAST 7D").
 */
export function surfacedSignalsFor(
  chakra: ChakraKey,
  entries: JournalEntry[],
  now: number,
): SurfacedSignal[] {
  const since = now - 7 * DAY_MS;
  const counts = new Map<string, { signal: string; count: number }>();

  for (const entry of entries) {
    if (entry.createdAt < since) continue;
    const text = entry.body.toLowerCase();
    for (const tag of entry.tags) {
      if (tag.chakra !== chakra) continue;
      const phrase = phraseForTheme(tag.theme, text);
      const existing = counts.get(phrase);
      if (existing) existing.count += 1;
      else counts.set(phrase, { signal: tag.theme, count: 1 });
    }
    // late-night affects third/crown
    if ((chakra === 'third' || chakra === 'crown') && entry.themes.includes('late-night')) {
      const key = 'late-night sleep entries';
      const existing = counts.get(key);
      if (existing) existing.count += 1;
      else counts.set(key, { signal: 'circadian', count: 1 });
    }
  }

  return [...counts.entries()]
    .map(([phrase, v]) => ({ phrase, signal: v.signal, count: v.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function phraseForTheme(theme: string, _text: string): string {
  const map: Record<string, string> = {
    exhaustion: 'mentions of "tired" or "drained"',
    insight: 'moments of clarity',
    overwhelm: 'mentions of feeling overwhelmed',
    meaning: 'mentions of gratitude',
    silence: 'things left unsaid',
    expression: 'speaking your truth',
    grief: 'tension carried in the chest',
    release: 'moments of opening',
    doubt: 'mentions of stress or anxiety',
    will: 'mentions of feeling capable',
    flatness: 'mentions of feeling stuck',
    flow: 'mentions of creative flow',
    unsafe: 'mentions of feeling ungrounded',
    ground: 'mentions of feeling steady',
    reflection: 'direct reflections on this node',
  };
  return map[theme] ?? `mentions of "${theme}"`;
}

/**
 * Frequency agent — maps current field state to a sound session.
 * Targets the most depressed weighted node.
 */
export function suggestSession(states: ChakraState[]): SoundSession {
  const target = [...states].sort((a, b) => a.energy - b.energy)[0];
  const chakra = CHAKRA_BY_KEY[target.key];
  const band = bandForChakra(target.key);
  const duration = target.energy < 35 ? 720 : 600; // 12 or 10 min

  return {
    key: `${target.key}-${chakra.solfeggioHz}`,
    chakra: target.key,
    hz: chakra.solfeggioHz,
    brainwaveBand: band,
    durationS: duration,
    title: `${chakra.name} Restoration`,
    intent: target.energy < 35 ? 'restorative' : 'rebalancing',
    tags: [chakra.name, target.energy < 35 ? 'RESTORATIVE' : 'BALANCING', 'SOLFEGGIO'],
  };
}

function bandForChakra(key: ChakraKey): string {
  // Derived from the canonical node data so the binaural offset + band stay in
  // one place (lib/chakras.ts). Format kept stable: "binaural beat N Hz · band".
  const chakra = CHAKRA_BY_KEY[key];
  return `binaural beat ${chakra.binauralOffsetHz} Hz · ${chakra.brainwaveBand}`;
}

/** Build a sound session object for a specific node + hz (e.g. Inspector launch). */
export function sessionForChakra(key: ChakraKey): SoundSession {
  const chakra = CHAKRA_BY_KEY[key];
  return {
    key: `${key}-${chakra.solfeggioHz}`,
    chakra: key,
    hz: chakra.solfeggioHz,
    brainwaveBand: bandForChakra(key),
    durationS: 720,
    title: `${chakra.name} Restoration`,
    intent: 'restorative',
    tags: [chakra.name, 'RESTORATIVE', 'SOLFEGGIO'],
  };
}

/**
 * Coach agent (deterministic core). Cites the user's own numbers and proposes
 * 1–3 protocols. Crisis path: if distress detected, hand off to human support.
 */
export interface CoachReply {
  content: string;
  protocols: Protocol[];
  crisis: boolean;
}

const CRISIS_MESSAGE =
  'I want to pause the practice for a moment. What you wrote sounds really heavy, and you deserve real human support right now — more than an app can give. If you are in the US you can call or text 988 (Suicide & Crisis Lifeline), any time. If you might be in danger, please reach emergency services. I am still here when you are ready to come back.';

export function coachRespond(args: {
  userText: string;
  states: ChakraState[];
  entries: JournalEntry[];
  distress: boolean;
  now: number;
}): CoachReply {
  const { userText, states, entries, distress, now } = args;

  if (distress) {
    return { content: CRISIS_MESSAGE, protocols: [], crisis: true };
  }

  // Find the most-strained node and a recurring theme to cite.
  const weakest = [...states].sort((a, b) => a.energy - b.energy)[0];
  const chakra = CHAKRA_BY_KEY[weakest.key];
  const themeCounts = countThemes(entries, now);
  const topTheme = [...themeCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  const cites: string[] = [];
  if (topTheme && topTheme[1] > 1) {
    cites.push(`Over the last 7 days your journal mentions ${topTheme[0]} ${topTheme[1]} times.`);
  }
  if (weakest.trend7d < 0) {
    cites.push(`Your ${chakra.name} energy dropped ${Math.abs(weakest.trend7d)}%.`);
  } else {
    cites.push(`Your ${chakra.name} is sitting low at ${weakest.energy}/100.`);
  }

  const opener = userText.trim() ? "I've been listening. " : "Here's what I'm noticing. ";
  const content = `${opener}${cites.join(' ')} Nothing to fix — just somewhere to place attention. Want to start with one of these?`;

  const protocols: Protocol[] = [
    {
      key: 'breath-box',
      type: 'breath',
      eyebrow: 'BREATHWORK · 5 MIN',
      title: 'Box breathing, 4-4-4-4',
      subtitle: 'Steady the nervous system',
      chakra: weakest.key,
      durationS: 300,
    },
    {
      key: `sound-${chakra.solfeggioHz}`,
      type: 'sound',
      eyebrow: `SOUND · ${chakra.solfeggioHz} HZ · 12 MIN`,
      title: `${chakra.name} restoration`,
      subtitle: 'Quiet binaural + low drone',
      chakra: weakest.key,
      hz: chakra.solfeggioHz,
      durationS: 720,
    },
    {
      key: 'reflect-drain',
      type: 'reflect',
      eyebrow: 'REFLECT · 2 MIN',
      title: 'One sentence on what drained you',
      subtitle: 'Loops back into pattern detection',
      chakra: weakest.key,
    },
  ];

  return { content, protocols, crisis: false };
}

function countThemes(entries: JournalEntry[], now: number): Map<string, number> {
  const since = now - 7 * DAY_MS;
  const m = new Map<string, number>();
  for (const e of entries) {
    if (e.createdAt < since) continue;
    for (const t of e.themes) {
      const word = THEME_NOUN[t] ?? t;
      m.set(word, (m.get(word) ?? 0) + 1);
    }
  }
  return m;
}

const THEME_NOUN: Record<string, string> = {
  exhaustion: 'tiredness',
  doubt: 'stress',
  overwhelm: 'overwhelm',
  grief: 'heaviness',
  silence: 'things left unsaid',
  flatness: 'feeling stuck',
  unsafe: 'unsteadiness',
  'late-night': 'late nights',
};
