/**
 * Weekly / monthly review generation + local history. The numbers always
 * come from lib/agents/review.ts's deterministic composer; the `reflect`
 * edge function is only ever asked to write a warmer narration of those
 * same facts, and its own deterministic fallback (in that function) means
 * this never depends on the LLM being reachable — see lib/agents/review.ts.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { buildReflectionContent, computeReviewStats, deterministicNarrative } from '@/lib/agents/review';
import { invokeFunction } from '@/lib/db';
import { saveDeterministicReview } from '@/lib/db/reviews';
import { useGoalStore } from '@/lib/goalStore';
import { useChakraStore } from '@/lib/store';
import { hasBackend, supabase } from '@/lib/supabase';
import { useMudraVisionStore } from '@/lib/vision/mudraAlignmentStore';
import { useVirtueStore } from '@/lib/virtueStore';
import type { ReviewPeriod, ReviewStats } from '@/lib/types';

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface ReviewRecord {
  id: string;
  period: ReviewPeriod;
  summary: string;
  stats: ReviewStats;
  createdAt: number;
}

interface ReviewState {
  hydrated: boolean;
  reviews: ReviewRecord[];
  generating: boolean;
  generateReview: (period: ReviewPeriod) => Promise<ReviewRecord>;
  reviewsFor: (period: ReviewPeriod) => ReviewRecord[];
}

export const useReviewStore = create<ReviewState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      reviews: [],
      generating: false,

      reviewsFor: (period) => get().reviews.filter((r) => r.period === period),

      generateReview: async (period) => {
        set({ generating: true });
        try {
          const now = Date.now();
          const chakra = useChakraStore.getState();
          const virtue = useVirtueStore.getState();
          const mudra = useMudraVisionStore.getState();
          const goal = useGoalStore.getState();

          const stats = computeReviewStats({
            period,
            now,
            entries: chakra.entries,
            sessions: chakra.sessions,
            virtuePractices: virtue.practices,
            mudraSessions: mudra.sessions,
            habits: goal.habits,
            habitEvents: goal.habitEvents,
            goals: goal.goals,
          });

          let summary = deterministicNarrative(stats);

          if (hasBackend && supabase) {
            try {
              const { data: userData } = await supabase.auth.getUser();
              if (userData.user) {
                const result = await invokeFunction<{ summary?: string; fallback?: boolean }>('reflect', {
                  userId: userData.user.id,
                  period,
                  content: buildReflectionContent(stats),
                  fieldScores: Object.fromEntries(chakra.states.map((s) => [s.key, s.energy])),
                });
                if (result.data?.summary && !result.data.fallback) {
                  summary = result.data.summary;
                } else {
                  await saveDeterministicReview(period, summary, stats.topRisingChakra);
                }
              }
            } catch {
              try {
                await saveDeterministicReview(period, summary, stats.topRisingChakra);
              } catch {
                // local record below still captures it
              }
            }
          }

          const record: ReviewRecord = { id: uid(), period, summary, stats, createdAt: now };
          set((s) => ({ reviews: [record, ...s.reviews].slice(0, 100) }));
          return record;
        } finally {
          set({ generating: false });
        }
      },
    }),
    {
      name: 'chakraos-reviews-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ reviews: s.reviews }),
      onRehydrateStorage: () => () => {
        useReviewStore.setState({ hydrated: true });
      },
    },
  ),
);
