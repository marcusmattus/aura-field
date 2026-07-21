import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { analyzeEntry } from '@/lib/agents/awareness';
import { coachRespond, type CoachReply } from '@/lib/agents/coach';
import { computeFieldIndex, recomputeField } from '@/lib/agents/field';
import { detectBreakthroughs } from '@/lib/agents/oracle';
import { remoteAnalyze, remoteCoach } from '@/lib/agents/remote';
import { CHAKRA_ORDER } from '@/lib/chakras';
import {
  createJournalEntry,
  deleteJournalEntry,
  insertChakraScores,
  invokeFunction,
  recordFrequencySession,
  trackAnalytics,
  updateJournalEntry,
  uploadVoiceNote,
} from '@/lib/db';
import { FREQUENCY_BY_KEY } from '@/lib/frequency/registry';
import { fetchProfile, hasBackend, saveProfile, signOutUser, supabase } from '@/lib/supabase';
import { enqueueOutbox } from '@/lib/sync/outbox';
import type {
  Breakthrough,
  ChakraKey,
  ChakraState,
  CoachMessage,
  CompletedSession,
  Intention,
  JournalEntry,
  Modality,
  UserProfile,
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
  /** completed the intro carousel */
  onboarded: boolean;
  /** has active access ($30/yr unlock) */
  subscribed: boolean;
  /** epoch ms the current term renews / expires */
  subscriptionRenewsAt: number | null;
  /** true once the user has a valid Supabase auth session */
  authenticated: boolean;
  /** true once the user has completed the profile intake form */
  profileComplete: boolean;
  /** persisted user profile from the intake form */
  profile: UserProfile | null;
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
  setCoachMessages: (messages: CoachMessage[]) => void;
  syncEntriesFromCloud: (entries: JournalEntry[]) => void;
  syncSessionsFromCloud: (sessions: CompletedSession[]) => void;
  applyCloudScores: (scores: Record<string, { score: number; trend7d: number }>) => void;
  addEntry: (
    body: string,
    modality: Modality,
    opts?: { seededChakra?: ChakraKey; voiceUrl?: string; voiceDurationS?: number },
  ) => Promise<void>;
  updateEntry: (id: string, body: string) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  recompute: () => void;
  sendCoachMessage: (text: string) => Promise<void>;
  completeSession: (s: {
    sessionKey: string;
    chakra: ChakraKey;
    hz: number;
    durationS: number;
    beatHz?: number;
    brainwaveBand?: string;
  }) => void;
  setIntention: (text: string) => void;
  completeOnboarding: () => void;
  subscribe: () => void;
  cancelSubscription: () => void;
  /** Called after a successful Supabase auth event; reads the session user. */
  onAuthenticated: () => Promise<void>;
  /** Persist the user's profile intake data. Returns true on success. */
  saveUserProfile: (data: Omit<UserProfile, 'id' | 'email'>) => Promise<boolean>;
  /** Sign out of Supabase and clear auth state. */
  signOut: () => Promise<void>;
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
      onboarded: false,
      subscribed: false,
      subscriptionRenewsAt: null,
      authenticated: false,
      profileComplete: false,
      profile: null,
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

      setCoachMessages: (messages) => set({ coachMessages: messages }),

      syncEntriesFromCloud: (entries) => {
        set({ entries });
        get().recompute();
      },

      syncSessionsFromCloud: (sessions) => {
        set({ sessions });
        get().recompute();
      },

      applyCloudScores: (scores) => {
        const states: ChakraState[] = CHAKRA_ORDER.map((key) => ({
          key,
          energy: scores[key]?.score ?? 50,
          trend7d: scores[key]?.trend7d ?? 0,
        }));
        set({ states, fieldIndex: computeFieldIndex(states) });
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

      addEntry: async (body, modality, opts) => {
        const seededChakra = opts?.seededChakra;
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
          voiceUrl: opts?.voiceUrl,
          voiceDurationS: opts?.voiceDurationS,
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

        // Cloud-first persist
        if (hasBackend) {
          try {
            let voicePath: string | undefined;
            if (opts?.voiceUrl) {
              voicePath = await uploadVoiceNote(opts.voiceUrl);
            }
            const row = await createJournalEntry({
              body,
              modality,
              themes: analysis.themes,
              tags: analysis.tags,
              seededChakra,
              voiceStoragePath: voicePath,
              voiceDurationS: opts?.voiceDurationS,
            });
            // Replace temp id with cloud id
            set((s) => ({
              entries: s.entries.map((e) => (e.id === entry.id ? { ...e, id: row.id } : e)),
            }));

            if (voicePath) {
              const { data: userData } = await supabase!.auth.getUser();
              void invokeFunction('transcribe-voice', {
                storagePath: voicePath,
                journalEntryId: row.id,
                userId: userData.user?.id,
              });
            }

            const remote = await remoteAnalyze(body, modality, seededChakra);
            if (remote) {
              analysis = remote;
              set((s) => ({
                entries: s.entries.map((e) =>
                  e.id === row.id ? { ...e, tags: remote.tags, themes: remote.themes } : e,
                ),
              }));
              get().recompute();
              const scoreMap = new Map<ChakraKey, number>();
              for (const tag of remote.tags) {
                const prev = scoreMap.get(tag.chakra) ?? 50;
                scoreMap.set(tag.chakra, Math.min(100, prev + tag.weight * 12));
              }
              if (scoreMap.size) {
                await insertChakraScores(
                  [...scoreMap.entries()].map(([chakra, score]) => ({
                    chakra,
                    score,
                    source: 'journal',
                  })),
                );
              }
            }

            const { data: userData } = await supabase!.auth.getUser();
            if (userData.user) {
              void invokeFunction('reflect', {
                userId: userData.user.id,
                sourceType: 'journal',
                sourceId: row.id,
                content: body,
                fieldScores: Object.fromEntries(get().states.map((s) => [s.key, s.energy])),
                period: 'interaction',
              });
            }
            void trackAnalytics('journal_created', { modality });
          } catch {
            await enqueueOutbox({
              type: 'journal',
              payload: {
                body,
                modality,
                seededChakra,
                voiceUrl: opts?.voiceUrl,
                voiceDurationS: opts?.voiceDurationS,
              },
            });
          }
        } else {
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
            // deterministic result already applied
          }
        }
      },

      updateEntry: async (id, body) => {
        const trimmed = body.trim();
        if (!trimmed) return;
        set((s) => ({
          entries: s.entries.map((e) => (e.id === id ? { ...e, body: trimmed } : e)),
        }));
        get().recompute();
        if (hasBackend) {
          try {
            await updateJournalEntry(id, { body: trimmed });
            void trackAnalytics('journal_updated', {});
          } catch {
            /* optimistic local edit retained; next hydrate reconciles */
          }
        }
      },

      deleteEntry: async (id) => {
        set((s) => ({ entries: s.entries.filter((e) => e.id !== id) }));
        get().recompute();
        if (hasBackend) {
          try {
            await deleteJournalEntry(id);
            void trackAnalytics('journal_deleted', {});
          } catch {
            /* optimistic delete retained */
          }
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

      completeSession: ({ sessionKey, chakra, hz, durationS, beatHz, brainwaveBand }) => {
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

        const node = FREQUENCY_BY_KEY[chakra];
        const beat = beatHz ?? node.beatFrequencyHz;
        if (hasBackend) {
          void recordFrequencySession({
            chakra,
            baseFrequencyHz: hz,
            beatFrequencyHz: beat,
            durationS,
            brainwaveBand: brainwaveBand ?? node.brainwaveBand,
          })
            .then(async () => {
              const bump = Math.min(100, (get().states.find((s) => s.key === chakra)?.energy ?? 50) + 4);
              await insertChakraScores([{ chakra, score: bump, source: 'frequency_session' }]);
              const { data: userData } = await supabase!.auth.getUser();
              if (userData.user) {
                void invokeFunction('reflect', {
                  userId: userData.user.id,
                  sourceType: 'session',
                  content: `Completed ${chakra} frequency session at ${hz} Hz`,
                  fieldScores: Object.fromEntries(get().states.map((s) => [s.key, s.energy])),
                  period: 'interaction',
                });
              }
              void trackAnalytics('frequency_session_completed', { chakra, hz });
            })
            .catch(() => {
              void enqueueOutbox({
                type: 'frequency_session',
                payload: { chakra, hz, durationS, beatHz: beat },
              });
            });
        }
      },

      setIntention: (text) => {
        set((s) => ({ intention: { ...s.intention, text } }));
      },

      completeOnboarding: () => {
        set({ onboarded: true });
      },

      subscribe: () => {
        // NOTE: mock unlock. Payments are not enabled in this project — once
        // enabled, replace this with a real @biltme/iap purchase + receipt check.
        const YEAR_MS = 365 * DAY_MS;
        set({ subscribed: true, subscriptionRenewsAt: Date.now() + YEAR_MS });
      },

      cancelSubscription: () => {
        set({ subscribed: false, subscriptionRenewsAt: null });
      },

      onAuthenticated: async () => {
        const profile = await fetchProfile();
        set({
          authenticated: true,
          profile,
          profileComplete: Boolean(profile?.displayName),
        });
        // If a returning member already set a primary intention, mirror it into
        // the local 30-day intention so the You tab stays coherent.
        if (profile?.primaryIntention) {
          set((s) => ({ intention: { ...s.intention, text: profile.primaryIntention } }));
        }
      },

      saveUserProfile: async (patch) => {
        if (!hasBackend) {
          const profile: UserProfile = {
            id: 'local-profile',
            email: '',
            displayName: patch.displayName,
            birthdate: patch.birthdate,
            focusAreas: patch.focusAreas,
            baselineMood: patch.baselineMood,
            experienceLevel: patch.experienceLevel,
            primaryIntention: patch.primaryIntention,
          };
          set((s) => ({
            profile,
            profileComplete: Boolean(profile.displayName),
            intention: profile.primaryIntention
              ? { ...s.intention, text: profile.primaryIntention }
              : s.intention,
          }));
          return true;
        }
        const saved = await saveProfile(patch);
        if (!saved) return false;
        set((s) => ({
          profile: saved,
          profileComplete: Boolean(saved.displayName),
          intention: saved.primaryIntention
            ? { ...s.intention, text: saved.primaryIntention }
            : s.intention,
        }));
        return true;
      },

      signOut: async () => {
        await signOutUser();
        set({ authenticated: false, profile: null, profileComplete: false });
      },
    }),
    {
      name: 'chakraos-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({
        onboarded: s.onboarded,
        subscribed: s.subscribed,
        subscriptionRenewsAt: s.subscriptionRenewsAt,
        authenticated: s.authenticated,
        profileComplete: s.profileComplete,
        profile: s.profile,
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
        // Reconcile the persisted auth flag with the real Supabase session: a
        // session may have expired since last launch. If still valid, refresh
        // the profile from the backend.
        void (async () => {
          const { supabase } = await import('@/lib/supabase');
          if (!supabase) return;
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            await useChakraStore.getState().onAuthenticated();
          } else if (useChakraStore.getState().authenticated) {
            useChakraStore.setState({
              authenticated: false,
              profile: null,
              profileComplete: false,
            });
          }
        })();
      },
    },
  ),
);
