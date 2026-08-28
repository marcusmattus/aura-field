/**
 * Local + best-effort cloud persistence for the Virtues framework: practice
 * completions, per-virtue visibility, and the optional journey (a
 * time-boxed focus on one virtue, mirroring the existing 30-day Intention).
 *
 * Kept as its own store — separate from useChakraStore — because the
 * Virtues framework is meant to stay conceptually independent from the
 * chakra field (spec §41), including being toggled off entirely without
 * touching anything else.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  fetchActiveVirtueJourney,
  fetchHiddenVirtues,
  recordVirtuePractice,
  setVirtueHidden as setVirtueHiddenRemote,
  startVirtueJourney as startVirtueJourneyRemote,
} from '@/lib/db/virtues';
import { hasBackend } from '@/lib/supabase';
import { useChakraStore } from '@/lib/store';

const DAY_MS = 86_400_000;
const PRACTICE_XP = 5;

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export interface VirtuePracticeRecord {
  id: string;
  virtueKey: string;
  practiceText: string;
  completedAt: number;
}

export interface VirtueJourney {
  virtueKey: string;
  totalDays: number;
  startedAt: number;
}

interface VirtueState {
  hydrated: boolean;
  practices: VirtuePracticeRecord[];
  hiddenVirtues: string[];
  activeJourney: VirtueJourney | null;

  hasPracticedToday: (virtueKey: string) => boolean;
  practiceCountFor: (virtueKey: string, sinceMs?: number) => number;
  /** Logs one voluntary practice completion. Never penalizes skipping. */
  logPractice: (virtueKey: string, practiceText: string) => void;
  setVirtueHidden: (virtueKey: string, hidden: boolean) => void;
  startJourney: (virtueKey: string, totalDays: number) => void;
  clearJourney: () => void;
  loadFromCloud: () => Promise<void>;
}

export const useVirtueStore = create<VirtueState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      practices: [],
      hiddenVirtues: [],
      activeJourney: null,

      hasPracticedToday: (virtueKey) => {
        const today = startOfDay(Date.now());
        return get().practices.some(
          (p) => p.virtueKey === virtueKey && startOfDay(p.completedAt) === today,
        );
      },

      practiceCountFor: (virtueKey, sinceMs) =>
        get().practices.filter((p) => p.virtueKey === virtueKey && (!sinceMs || p.completedAt >= sinceMs))
          .length,

      logPractice: (virtueKey, practiceText) => {
        const record: VirtuePracticeRecord = {
          id: uid(),
          virtueKey,
          practiceText,
          completedAt: Date.now(),
        };
        set((s) => ({ practices: [record, ...s.practices].slice(0, 500) }));
        useChakraStore.getState().awardXp(PRACTICE_XP);
        if (hasBackend) {
          void recordVirtuePractice(virtueKey, practiceText).catch(() => {
            // local record already captured; retried on next successful sync
          });
        }
      },

      setVirtueHidden: (virtueKey, hidden) => {
        set((s) => ({
          hiddenVirtues: hidden
            ? [...new Set([...s.hiddenVirtues, virtueKey])]
            : s.hiddenVirtues.filter((k) => k !== virtueKey),
        }));
        if (hasBackend) void setVirtueHiddenRemote(virtueKey, hidden).catch(() => undefined);
      },

      startJourney: (virtueKey, totalDays) => {
        set({ activeJourney: { virtueKey, totalDays, startedAt: Date.now() } });
        if (hasBackend) void startVirtueJourneyRemote(virtueKey, totalDays).catch(() => undefined);
      },

      clearJourney: () => set({ activeJourney: null }),

      loadFromCloud: async () => {
        if (!hasBackend) return;
        try {
          const [hidden, journey] = await Promise.all([
            fetchHiddenVirtues(),
            fetchActiveVirtueJourney(),
          ]);
          set({
            hiddenVirtues: hidden,
            activeJourney: journey
              ? {
                  virtueKey: journey.virtue_key,
                  totalDays: journey.total_days,
                  startedAt: new Date(journey.started_at).getTime(),
                }
              : null,
          });
        } catch {
          // stay on local data
        }
      },
    }),
    {
      name: 'chakraos-virtues-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        practices: s.practices,
        hiddenVirtues: s.hiddenVirtues,
        activeJourney: s.activeJourney,
      }),
      onRehydrateStorage: () => (state) => {
        useVirtueStore.setState({ hydrated: true });
        if (state) void useVirtueStore.getState().loadFromCloud();
      },
    },
  ),
);

export { DAY_MS as VIRTUE_DAY_MS };
