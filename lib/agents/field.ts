import { CHAKRA_BY_KEY, CHAKRA_ORDER, FIELD_INDEX_WEIGHTS } from '@/lib/chakras';
import type { ChakraKey, ChakraState, CompletedSession, JournalEntry } from '@/lib/types';

/**
 * Field agent (deterministic core). Folds journal tags + surfaced signals +
 * session activity + circadian factors into each node's energy, per-node 7d
 * trend, and the daily field index. The LLM only narrates edge harmonics —
 * it never writes the numbers. Scoring constants live here as config.
 */
const CONFIG = {
  /** half-life of a journal tag's influence, in days */
  tagHalfLifeDays: 5,
  /** max points a single decayed tag can move a node */
  tagMaxImpact: 22,
  /** lift from completing a session for the matching node */
  sessionLift: 8,
  sessionHalfLifeDays: 4,
  /** late-night depression applied to third/crown */
  lateNightPenalty: 6,
  /** how fast energy reverts toward baseline per day with no input */
  baselineReversion: 0.12,
};

const DAY_MS = 86_400_000;

function decay(ageDays: number, halfLife: number): number {
  return Math.pow(0.5, ageDays / halfLife);
}

interface RecomputeInput {
  entries: JournalEntry[];
  sessions: CompletedSession[];
  now: number;
}

/**
 * Compute energy (0-100) for every node from history.
 */
export function recomputeField(input: RecomputeInput): ChakraState[] {
  const { entries, sessions, now } = input;
  return computeAt(entries, sessions, now);
}

function computeAt(
  entries: JournalEntry[],
  sessions: CompletedSession[],
  at: number,
): ChakraState[] {
  // 7-days-ago snapshot for trend, derived from the same history.
  const sevenAgo = at - 7 * DAY_MS;

  const energyNow = energyMap(entries, sessions, at);
  const energyPast = energyMap(
    entries.filter((e) => e.createdAt <= sevenAgo),
    sessions.filter((s) => s.completedAt <= sevenAgo),
    sevenAgo,
  );

  return CHAKRA_ORDER.map((key) => {
    const energy = energyNow[key];
    const past = energyPast[key];
    const trend7d = past > 0 ? Math.round(((energy - past) / past) * 100) : 0;
    return { key, energy: Math.round(energy), trend7d };
  });
}

function energyMap(
  entries: JournalEntry[],
  sessions: CompletedSession[],
  at: number,
): Record<ChakraKey, number> {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- seed is fully populated by the loop over all CHAKRA_ORDER keys
  const result = {} as Record<ChakraKey, number>;

  for (const key of CHAKRA_ORDER) {
    const baseline = CHAKRA_BY_KEY[key].baseline;
    let delta = 0;
    let lateNightHits = 0;

    for (const entry of entries) {
      if (entry.createdAt > at) continue;
      const ageDays = (at - entry.createdAt) / DAY_MS;
      const d = decay(ageDays, CONFIG.tagHalfLifeDays);
      for (const tag of entry.tags) {
        if (tag.chakra !== key) continue;
        const dir = directionForTheme(tag.theme);
        delta += dir * tag.weight * CONFIG.tagMaxImpact * d;
      }
      if ((key === 'third' || key === 'crown') && entry.themes.includes('late-night')) {
        lateNightHits += d;
      }
    }

    delta -= lateNightHits * CONFIG.lateNightPenalty;

    for (const s of sessions) {
      if (s.completedAt > at || s.chakra !== key) continue;
      const ageDays = (at - s.completedAt) / DAY_MS;
      delta += CONFIG.sessionLift * decay(ageDays, CONFIG.sessionHalfLifeDays);
    }

    result[key] = clamp(baseline + delta, 1, 100);
  }

  return result;
}

/** Map a theme to a signed direction. Low themes pull down, high lift up. */
function directionForTheme(theme: string): number {
  const lowThemes = ['exhaustion', 'overwhelm', 'silence', 'grief', 'doubt', 'flatness', 'unsafe'];
  const highThemes = ['insight', 'meaning', 'expression', 'release', 'will', 'flow', 'ground'];
  if (lowThemes.includes(theme)) return -1;
  if (highThemes.includes(theme)) return 1;
  return 0.2; // neutral reflection nudges slightly up
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

/** Daily field index — configurable weighted mean of the nine. */
export function computeFieldIndex(states: ChakraState[]): number {
  let sum = 0;
  let wsum = 0;
  for (const s of states) {
    const w = FIELD_INDEX_WEIGHTS[s.key];
    sum += s.energy * w;
    wsum += w;
  }
  return Math.round(sum / wsum);
}

export { CONFIG as FIELD_CONFIG };
