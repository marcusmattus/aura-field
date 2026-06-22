import { THEME_SIGNAL } from '@/lib/agents/awareness';
import { CHAKRA_BY_KEY, CHAKRA_ORDER, FIELD_INDEX_WEIGHTS } from '@/lib/chakras';
import type { ChakraKey, ChakraState, CompletedSession, JournalEntry } from '@/lib/types';

/**
 * Field agent (deterministic core). Folds journal tags + surfaced signals +
 * session activity + circadian factors into each node's energy, per-node 7d
 * trend, and the daily field index. The LLM only narrates edge harmonics —
 * it never writes the numbers. Scoring constants live here as config.
 *
 * Energy moves away from a per-node baseline by accumulating decayed lift/drain
 * pressure, then mapping each direction through a saturating curve toward the
 * available headroom — so values grade smoothly and approach (rather than slam)
 * 1/100. Old influence simply decays, which reverts energy to baseline over time.
 */
const CONFIG = {
  /** half-life of a journal tag's influence, in days */
  tagHalfLifeDays: 5,
  /** points of pressure a single fresh, full-weight tag contributes */
  tagMaxImpact: 22,
  /** a neutral (reflection) tag contributes this fraction of a full tag, as lift */
  neutralFactor: 0.2,
  /** lift pressure from completing a session for the matching node (10-min ref) */
  sessionLift: 8,
  sessionHalfLifeDays: 4,
  /** reference session length the lift is normalised to (seconds) */
  sessionRefDurationS: 600,
  /** late-night depression applied to third/crown */
  lateNightPenalty: 6,
  /** floor on the 7-days-ago denominator so tiny pasts don't explode the trend % */
  trendDenominatorFloor: 25,
  /** cap on the reported 7d trend magnitude (%) to keep it meaningful + legible */
  trendCap: 99,
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
    // Percent change vs the 7-days-ago snapshot, with a denominator floor so a
    // near-zero past can't yield an absurd swing, then capped for legibility.
    const denom = Math.max(past, CONFIG.trendDenominatorFloor);
    const raw = Math.round(((energy - past) / denom) * 100);
    const trend7d = clamp(raw, -CONFIG.trendCap, CONFIG.trendCap);
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
    // Accumulate lift and drain pressure separately so each saturates toward its
    // own headroom — a node can be strongly lifted and lightly drained at once.
    let pos = 0;
    let neg = 0;
    let lateNightHits = 0;

    for (const entry of entries) {
      if (entry.createdAt > at) continue;
      const ageDays = (at - entry.createdAt) / DAY_MS;
      const d = decay(ageDays, CONFIG.tagHalfLifeDays);
      for (const tag of entry.tags) {
        if (tag.chakra !== key) continue;
        const pressure = tag.weight * CONFIG.tagMaxImpact * d;
        const signal = THEME_SIGNAL[tag.theme];
        if (signal === 'high') pos += pressure;
        else if (signal === 'low') neg += pressure;
        else pos += pressure * CONFIG.neutralFactor; // neutral reflection nudges up
      }
      if ((key === 'third' || key === 'crown') && entry.themes.includes('late-night')) {
        lateNightHits += d;
      }
    }

    neg += lateNightHits * CONFIG.lateNightPenalty;

    for (const s of sessions) {
      if (s.completedAt > at || s.chakra !== key) continue;
      const ageDays = (at - s.completedAt) / DAY_MS;
      const durScale = clamp(s.durationS / CONFIG.sessionRefDurationS, 0.5, 1.5);
      pos += CONFIG.sessionLift * durScale * decay(ageDays, CONFIG.sessionHalfLifeDays);
    }

    result[key] = baseline + saturate(pos, 100 - baseline) - saturate(neg, baseline - 1);
  }

  return result;
}

/**
 * Map unbounded pressure into [0, headroom). Initial slope is 1 (so a small
 * single tag moves energy by roughly its raw points, preserving responsiveness)
 * and it asymptotes to `headroom`, so energy approaches but never slams the rail.
 */
function saturate(pressure: number, headroom: number): number {
  if (headroom <= 0) return 0;
  return headroom * (1 - Math.exp(-pressure / headroom));
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
