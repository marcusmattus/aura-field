/**
 * Local + best-effort cloud persistence for Goals & Habits (M9). Mirrors the
 * pattern in lib/virtueStore.ts and lib/vision/mudraAlignmentStore.ts:
 * optimistic local state, XP awarded through the shared chakraOS store, and
 * a non-blocking cloud sync.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import {
  createGoal as createGoalRemote,
  createHabit as createHabitRemote,
  listGoals,
  listHabitEvents,
  listHabits,
  logHabitEvent as logHabitEventRemote,
  updateGoalStatus,
} from '@/lib/db/goals';
import { hasBackend } from '@/lib/supabase';
import { useChakraStore } from '@/lib/store';
import { isCompletedThisPeriod } from '@/lib/agents/goalCoach';
import type { ChakraKey, Goal, GoalStatus, Habit, HabitCadence, HabitEvent } from '@/lib/types';

const HABIT_XP = 5;
const GOAL_COMPLETE_XP = 25;

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

interface GoalState {
  hydrated: boolean;
  goals: Goal[];
  habits: Habit[];
  habitEvents: HabitEvent[];

  createGoal: (input: { title: string; intention?: string; chakra?: ChakraKey; targetDate?: number }) => void;
  setGoalStatus: (id: string, status: GoalStatus) => void;
  createHabit: (input: { title: string; cadence: HabitCadence; goalId?: string }) => void;
  archiveHabit: (id: string) => void;
  /** Logs a habit for the current period. No-ops if already logged — never
   * penalizes a skipped day, and never double-counts a re-tap. */
  logHabit: (habitId: string) => void;
  loadFromCloud: () => Promise<void>;
}

export const useGoalStore = create<GoalState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      goals: [],
      habits: [],
      habitEvents: [],

      createGoal: ({ title, intention, chakra, targetDate }) => {
        const goal: Goal = {
          id: uid(),
          title,
          intention: intention ?? '',
          chakra,
          status: 'active',
          createdAt: Date.now(),
          targetDate: targetDate ?? null,
          completedAt: null,
        };
        set((s) => ({ goals: [goal, ...s.goals] }));
        if (hasBackend) {
          void createGoalRemote({
            title,
            intention,
            chakra,
            targetDate: targetDate ? new Date(targetDate).toISOString().slice(0, 10) : undefined,
          })
            .then((row) => {
              set((s) => ({ goals: s.goals.map((g) => (g.id === goal.id ? { ...g, id: row.id } : g)) }));
            })
            .catch(() => undefined);
        }
      },

      setGoalStatus: (id, status) => {
        set((s) => ({
          goals: s.goals.map((g) =>
            g.id === id ? { ...g, status, completedAt: status === 'completed' ? Date.now() : null } : g,
          ),
        }));
        if (status === 'completed') useChakraStore.getState().awardXp(GOAL_COMPLETE_XP);
        if (hasBackend) void updateGoalStatus(id, status).catch(() => undefined);
      },

      createHabit: ({ title, cadence, goalId }) => {
        const habit: Habit = {
          id: uid(),
          goalId: goalId ?? null,
          title,
          cadence,
          createdAt: Date.now(),
          archivedAt: null,
        };
        set((s) => ({ habits: [habit, ...s.habits] }));
        if (hasBackend) {
          void createHabitRemote({ title, cadence, goalId })
            .then((row) => {
              set((s) => ({ habits: s.habits.map((h) => (h.id === habit.id ? { ...h, id: row.id } : h)) }));
            })
            .catch(() => undefined);
        }
      },

      archiveHabit: (id) => {
        set((s) => ({
          habits: s.habits.map((h) => (h.id === id ? { ...h, archivedAt: Date.now() } : h)),
        }));
      },

      logHabit: (habitId) => {
        const habit = get().habits.find((h) => h.id === habitId);
        if (!habit) return;
        const existing = get().habitEvents.filter((e) => e.habitId === habitId);
        if (isCompletedThisPeriod(habit.cadence, existing, Date.now())) return;

        const event: HabitEvent = { id: uid(), habitId, completedAt: Date.now() };
        set((s) => ({ habitEvents: [event, ...s.habitEvents] }));
        useChakraStore.getState().awardXp(HABIT_XP);
        if (hasBackend) void logHabitEventRemote(habitId).catch(() => undefined);
      },

      loadFromCloud: async () => {
        if (!hasBackend) return;
        try {
          const [goalRows, habitRows, eventRows] = await Promise.all([
            listGoals(),
            listHabits(),
            listHabitEvents(Date.now() - 400 * 86_400_000),
          ]);
          set({
            goals: goalRows.map((g) => ({
              id: g.id,
              title: g.title,
              intention: g.intention,
              chakra: (g.chakra_key as ChakraKey | null) ?? undefined,
              status: g.status,
              createdAt: new Date(g.created_at).getTime(),
              targetDate: g.target_date ? new Date(g.target_date).getTime() : null,
              completedAt: g.completed_at ? new Date(g.completed_at).getTime() : null,
            })),
            habits: habitRows.map((h) => ({
              id: h.id,
              goalId: h.goal_id,
              title: h.title,
              cadence: h.cadence,
              createdAt: new Date(h.created_at).getTime(),
              archivedAt: h.archived_at ? new Date(h.archived_at).getTime() : null,
            })),
            habitEvents: eventRows.map((e) => ({
              id: e.id,
              habitId: e.habit_id,
              completedAt: new Date(e.completed_at).getTime(),
            })),
          });
        } catch {
          // stay on local data
        }
      },
    }),
    {
      name: 'chakraos-goals-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ goals: s.goals, habits: s.habits, habitEvents: s.habitEvents }),
      onRehydrateStorage: () => (state) => {
        useGoalStore.setState({ hydrated: true });
        if (state) void useGoalStore.getState().loadFromCloud();
      },
    },
  ),
);
