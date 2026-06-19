import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { analyzeEntry } from '@/lib/agents/awareness';
import { coachRespond, type CoachReply } from '@/lib/agents/coach';
import { computeFieldIndex, recomputeField } from '@/lib/agents/field';
import { detectBreakthroughs } from '@/lib/agents/oracle';
import { remoteAnalyze, remoteCoach } from '@/lib/agents/remote';
import { CHAKRA_ORDER } from '@/lib/chakras';
import type {
  Breakthrough,
  ChakraKey,
  ChakraState,
  CoachMessage,
  CompletedSession,
  Intention,
  JournalEntry,
  Modality,
} from '@/lib/types';

const DAY_MS = 86_400_000;

function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

interface ChakraOSState {
  hydrated: boolean;
  entries: JournalEntry[];
  sessions: CompletedSession[];
  states: ChakraState[];
  fieldIndex: number;
  coachMessages: CoachMessage[];
  breakthroughs: Breakthrough[];
  xp: number;
  level: number;
  streak: number;
  lastJournalDay: number | null;
  intention: Intention;

  // actions
  addEntry: (body: string, modality: Modality, seededChakra?: ChakraKey) => Promise<void>;
  recompute: () => void;
  sendCoachMessage: (text: string) => Promise<void>;
  completeSession: (s: {
    sessionKey: string;
    chakra: ChakraKey;
    hz: number;
    durationS: number;
  }) => void;
  setIntention: (text: string) => void;
}

function levelForXp(xp: number): number {
  // simple curve: 400 xp per level
  return Math.max(1, Math.floor(xp / 400) + 1);
}

const initialStates: ChakraState[] = CHAKRA_ORDER.map((key) => ({ key, energy: 50, trend7d: 0 }));

/** Demo entries so a fresh install shows a living field (matches the kit). */
function seedEntries(now: number): JournalEntry[] {
  const drafts: { body: string; ago: number; modality: Modality }[] = [
    {
      body: 'I felt the tension move out of my chest tonight. The drums under the breath did something I can\u2019t explain.',
      ago: 0.2,
      modality: 'text',
    },
    {
      body: 'Woke up tired again. Couldn\u2019t stop the late-night scrolling and now I can\u2019t focus.',
      ago: 1.1,
      modality: 'text',
    },
    {
      body: 'Spoke my truth in the meeting instead of biting my tongue. Felt grounded after.',
      ago: 2.3,
      modality: 'voice',
    },
    {
      body: 'Anxious and a little drained, but I sat with it instead of running.',
      ago: 3.4,
      modality: 'text',
    },
    {
      body: 'A small moment of clarity on the walk \u2014 saw what I\u2019ve been avoiding.',
      ago: 4.6,
      modality: 'text',
    },
    { body: 'Exhausted. Stress about money kept me up past midnight.', ago: 5.5, modality: 'text' },
  ];
  return drafts.map((d) => {
    const createdAt = now - d.ago * DAY_MS;
    const a = analyzeEntry(d.body, d.modality);
    return {
      id: uid(),
      body: d.body,
      modality: d.modality,
      createdAt,
      tags: a.tags,
      themes: a.themes,
    };
  });
}

export const useChakraStore = create<ChakraOSState>()(
  persist(
    (set, get) => ({
      hydrated: false,
      entries: [],
      sessions: [],
      states: initialStates,
      fieldIndex: 50,
      coachMessages: [],
      breakthroughs: [],
      xp: 0,
      level: 1,
      streak: 0,
      lastJournalDay: null,
      intention: {
        text: 'Sleep before midnight. Speak the truth before the resentment.',
        day: 1,
        totalDays: 30,
        startedAt: Date.now(),
      },

      recompute: () => {
        const { entries, sessions } = get();
        const now = Date.now();
        const states = recomputeField({ entries, sessions, now });
        const fieldIndex = computeFieldIndex(states);
        const earned = detectBreakthroughs({
          entries,
          sessions,
          states,
          existing: get().breakthroughs,
          streak: get().streak,
          now,
        });
        set((s) => ({
          states,
          fieldIndex,
          breakthroughs: earned.length ? [...earned, ...s.breakthroughs] : s.breakthroughs,
        }));
      },

      addEntry: async (body, modality, seededChakra) => {
        const now = Date.now();
        // optimistic local analysis
        let analysis = analyzeEntry(body, modality, seededChakra);
        const entry: JournalEntry = {
          id: uid(),
          body,
          modality,
          createdAt: now,
          tags: analysis.tags,
          themes: analysis.themes,
          seededChakra,
        };

        // streak: increment if first entry of a new day
        const today = startOfDay(now);
        const last = get().lastJournalDay;
        let streak = get().streak;
        if (last === null) streak = 1;
        else if (today > last) {
          streak = today - last <= DAY_MS * 1.5 ? streak + 1 : 1;
        }

        const xp = get().xp + 25;
        set((s) => ({
          entries: [entry, ...s.entries],
          streak,
          lastJournalDay: today,
          xp,
          level: levelForXp(xp),
        }));
        get().recompute();

        // try remote agent to enrich tags; reconcile if available
        try {
          const remote = await remoteAnalyze(body, modality, seededChakra);
          if (remote) {
            analysis = remote;
            set((s) => ({
              entries: s.entries.map((e) =>
                e.id === entry.id ? { ...e, tags: remote.tags, themes: remote.themes } : e,
              ),
            }));
            get().recompute();
          }
        } catch {
          // deterministic result already applied — never blank the screen
        }
      },

      sendCoachMessage: async (text) => {
        const now = Date.now();
        const userMsg: CoachMessage = {
          id: uid(),
          role: 'user',
          content: text,
          createdAt: now,
        };
        set((s) => ({ coachMessages: [...s.coachMessages, userMsg] }));

        const { states, entries } = get();
        const distress = analyzeEntry(text, 'text').distress;

        let reply: CoachReply = coachRespond({ userText: text, states, entries, distress, now });
        try {
          const remote = await remoteCoach({ userText: text, states, entries, distress });
          if (remote) reply = remote;
        } catch {
          // keep deterministic reply
        }

        const coachMsg: CoachMessage = {
          id: uid(),
          role: 'coach',
          content: reply.content,
          createdAt: Date.now(),
          protocols: reply.protocols,
        };
        set((s) => ({ coachMessages: [...s.coachMessages, coachMsg] }));
      },

      completeSession: ({ sessionKey, chakra, hz, durationS }) => {
        const session: CompletedSession = {
          id: uid(),
          sessionKey,
          chakra,
          hz,
          durationS,
          completedAt: Date.now(),
        };
        const xp = get().xp + 40;
        set((s) => ({ sessions: [session, ...s.sessions], xp, level: levelForXp(xp) }));
        get().recompute();
      },

      setIntention: (text) => {
        set((s) => ({ intention: { ...s.intention, text } }));
      },
    }),
    {
      name: 'chakraos-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        entries: s.entries,
        sessions: s.sessions,
        coachMessages: s.coachMessages,
        breakthroughs: s.breakthroughs,
        xp: s.xp,
        level: s.level,
        streak: s.streak,
        lastJournalDay: s.lastJournalDay,
        intention: s.intention,
      }),
      onRehydrateStorage: () => (state) => {
        if (state && state.entries.length === 0) {
          const now = Date.now();
          state.entries = seedEntries(now);
          state.sessions = [
            {
              id: uid(),
              sessionKey: 'heart-639',
              chakra: 'heart',
              hz: 639,
              durationS: 720,
              completedAt: now - 0.5 * DAY_MS,
            },
          ];
          state.xp = 2847;
          state.level = levelForXp(2847);
          state.streak = 14;
          state.lastJournalDay = startOfDay(now);
        }
        state?.recompute();
        useChakraStore.setState({ hydrated: true });
      },
    },
  ),
);
