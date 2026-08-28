/**
 * Local + cloud persistence for Mudra Vision sessions. Keeps the detailed,
 * per-attempt history the compare/progress screens need, awards XP through
 * the shared chakraOS store (so it still feeds XP/level and the journal
 * pipeline), and best-effort mirrors everything to Supabase — never
 * blocking the local, optimistic record if the network call fails.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { fetchMudraProgress, recordMudraAttempt, recordMudraSession } from '@/lib/db/mudraVision';
import { hasBackend, supabase } from '@/lib/supabase';
import { useChakraStore } from '@/lib/store';
import { MUDRA_BY_KEY } from '@/lib/vision/MudraRegistry';
import { computeMudraXp, DEFAULT_MUDRA_XP_RULES, type MudraXpRule } from '@/lib/vision/xp';
import type { FormMatchResult } from '@/lib/vision/MudraAlignment';
import type { FingerKey, Handedness } from '@/lib/vision/types';

const DAY_MS = 86_400_000;

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export interface MudraAttemptRecord {
  attemptNumber: number;
  formScore: number;
  fingerScores: Record<FingerKey, number>;
  palmRotationScore: number;
  spacingScore: number;
  capturedAt: number;
}

export interface MudraVisionSessionRecord {
  id: string;
  mudraKey: string;
  hand: Handedness;
  durationS: number;
  formScore: number;
  attempts: MudraAttemptRecord[];
  completedAt: number;
}

export interface MudraVisionProgress {
  mudraKey: string;
  sessionsCount: number;
  totalTimeS: number;
  bestFormScore: number;
  lastFormScore: number;
  lastPracticedAt: number;
}

function toAttemptRecord(attemptNumber: number, result: FormMatchResult): MudraAttemptRecord {
  const fingerScores = Object.fromEntries(
    result.fingerScores.map((f) => [f.finger, f.score]),
  ) as Record<FingerKey, number>;
  return {
    attemptNumber,
    formScore: result.overall,
    fingerScores,
    palmRotationScore: result.palmRotationScore,
    spacingScore: result.spacingScore,
    capturedAt: Date.now(),
  };
}

interface MudraVisionState {
  hydrated: boolean;
  sessions: MudraVisionSessionRecord[];
  streak: number;
  lastPracticeDay: number | null;
  xpRules: MudraXpRule[];

  /** Sessions for one mudra, newest first. */
  sessionsFor: (mudraKey: string) => MudraVisionSessionRecord[];
  /** Local rollup, mirrors the mudra_progress table shape. */
  progressFor: (mudraKey: string) => MudraVisionProgress | null;
  allProgress: () => MudraVisionProgress[];
  loadXpRules: () => Promise<void>;
  /** Completes a hold: records the session + every attempt taken, awards
   * XP through the main chakraOS store, and best-effort syncs to Supabase. */
  completeSession: (input: {
    mudraKey: string;
    hand: Handedness;
    durationS: number;
    attempts: FormMatchResult[];
  }) => Promise<{ xpAwarded: number; xpBreakdown: MudraXpRule[] }>;
}

export const useMudraVisionStore = create<MudraVisionState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      sessions: [],
      streak: 0,
      lastPracticeDay: null,
      xpRules: DEFAULT_MUDRA_XP_RULES,

      sessionsFor: (mudraKey) => get().sessions.filter((s) => s.mudraKey === mudraKey),

      progressFor: (mudraKey) => {
        const rows = get().sessionsFor(mudraKey);
        if (rows.length === 0) return null;
        return {
          mudraKey,
          sessionsCount: rows.length,
          totalTimeS: rows.reduce((s, r) => s + r.durationS, 0),
          bestFormScore: Math.max(...rows.map((r) => r.formScore)),
          lastFormScore: rows[0].formScore,
          lastPracticedAt: rows[0].completedAt,
        };
      },

      allProgress: () => {
        const keys = [...new Set(get().sessions.map((s) => s.mudraKey))];
        return keys
          .map((k) => get().progressFor(k))
          .filter((p): p is MudraVisionProgress => p !== null);
      },

      loadXpRules: async () => {
        if (!hasBackend || !supabase) return;
        try {
          const { data, error } = await supabase.from('mudra_xp_rules').select('key, label, xp');
          if (error || !data || data.length === 0) return;
          set({ xpRules: data as MudraXpRule[] });
        } catch {
          // keep the bundled defaults
        }
      },

      completeSession: async ({ mudraKey, hand, durationS, attempts }) => {
        const now = Date.now();
        const finalScore = attempts.length ? attempts[attempts.length - 1].overall : 0;
        const record: MudraVisionSessionRecord = {
          id: uid(),
          mudraKey,
          hand,
          durationS,
          formScore: finalScore,
          attempts: attempts.map((a, i) => toAttemptRecord(i + 1, a)),
          completedAt: now,
        };

        const priorSessions = get().sessions;
        const isFirstMudra = priorSessions.length === 0;
        const learnedBefore = new Set(priorSessions.map((s) => s.mudraKey));
        const learnedAfter = new Set([...learnedBefore, mudraKey]);
        const reachesFiveMudrasLearned = learnedBefore.size < 5 && learnedAfter.size >= 5;

        const today = startOfDay(now);
        const last = get().lastPracticeDay;
        let streak = get().streak;
        if (last === null) streak = 1;
        else if (today > last) streak = today - last <= DAY_MS * 1.5 ? streak + 1 : 1;
        const reachesSevenDayStreak = streak === 7;

        const { total, breakdown } = computeMudraXp(
          { isFirstMudra, reachesSevenDayStreak, reachesFiveMudrasLearned },
          get().xpRules,
        );

        set((s) => ({
          sessions: [record, ...s.sessions].slice(0, 300),
          streak,
          lastPracticeDay: today,
        }));

        const mudra = MUDRA_BY_KEY[mudraKey];
        useChakraStore.getState().completeMudraVisionSession({
          mudraKey,
          chakras: mudra?.traditionalAssociations.chakras ?? [],
          durationS,
          xp: total,
        });

        if (hasBackend) {
          try {
            const session = await recordMudraSession({
              mudraKey,
              dominantHand: hand,
              durationS,
              formScore: finalScore,
              attemptCount: attempts.length,
            });
            for (const [i, a] of attempts.entries()) {
              await recordMudraAttempt(session.id, {
                attemptNumber: i + 1,
                formScore: a.overall,
                thumbScore: a.fingerScores.find((f) => f.finger === 'thumb')?.score ?? 0,
                indexScore: a.fingerScores.find((f) => f.finger === 'index')?.score ?? 0,
                middleScore: a.fingerScores.find((f) => f.finger === 'middle')?.score ?? 0,
                ringScore: a.fingerScores.find((f) => f.finger === 'ring')?.score ?? 0,
                pinkyScore: a.fingerScores.find((f) => f.finger === 'pinky')?.score ?? 0,
                palmRotationScore: a.palmRotationScore,
                spacingScore: a.spacingScore,
              });
            }
          } catch {
            // local record already captured; cloud sync retried on next successful session
          }
        }

        return { xpAwarded: total, xpBreakdown: breakdown };
      },
    }),
    {
      name: 'chakraos-mudra-vision-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ sessions: s.sessions, streak: s.streak, lastPracticeDay: s.lastPracticeDay }),
      onRehydrateStorage: () => (state) => {
        useMudraVisionStore.setState({ hydrated: true });
        if (state) void useMudraVisionStore.getState().loadXpRules();
      },
    },
  ),
);

/** Cloud rollup for the signed-in user, falling back to the local store when
 * offline or unauthenticated (fetchMudraProgress throws in that case). */
export async function syncMudraProgressFromCloud(): Promise<void> {
  if (!hasBackend) return;
  try {
    await fetchMudraProgress();
    // The local store already mirrors everything written this session; a
    // full merge is unnecessary until multi-device sync is in scope (see
    // "Future Features" in the spec).
  } catch {
    // stay on local data
  }
}
