// chakraOS shared types

export type ChakraKey =
  | 'soul'
  | 'crown'
  | 'third'
  | 'throat'
  | 'heart'
  | 'solar'
  | 'sacral'
  | 'root'
  | 'earth';

/**
 * FieldState — The core state that drives everything in chakraOS.
 * Every visual, sound, animation, recommendation and experience
 * is procedurally generated from this state instead of static assets.
 */
export interface FieldState {
  /** Base frequency in Hz (174-1074 anchored on chakra nodes) */
  baseHz: number;
  /** Binaural beat offset in Hz (null for pure drone) */
  beatHz: number | null;
  /** Breathing rate/coherence (0-100) */
  breath: number;
  /** Heart rate variability coherence (0-100) */
  coherence: number;
  /** Overall energy level (0-100) */
  energy: number;
  /** Mental focus clarity (0-100) */
  focus: number;
  /** Stress level (0-100, inverted) */
  stress: number;
  /** Emotional state (-100 to 100, negative=heavy, positive=light) */
  emotion: number;
  /** Session duration in seconds */
  duration: number;
}

export type SurfaceKey = 'body' | 'journal' | 'coach' | 'sound' | 'you';

export interface Chakra {
  key: ChakraKey;
  name: string;
  bija: string;
  solfeggioHz: number;
  /** Western pitch nearest the solfeggio carrier (equal temperament, A440) */
  noteName: string;
  /** binaural beat offset in Hz applied between ears during a session */
  binauralOffsetHz: number;
  /** target brainwave band the offset entrains, e.g. "alpha" */
  brainwaveBand: string;
  /** hex color */
  color: string;
  sign: string;
  attributes: [string, string, string];
  /** baseline resting energy used before any journaling */
  baseline: number;
}

export interface ChakraState {
  key: ChakraKey;
  energy: number; // 0-100
  trend7d: number; // signed percentage
}

export type Modality = 'text' | 'voice';

export interface EntryTag {
  chakra: ChakraKey;
  theme: string;
  weight: number; // 0-1
}

export interface SurfacedSignal {
  phrase: string;
  signal: string;
  count: number;
}

export interface JournalEntry {
  id: string;
  body: string;
  modality: Modality;
  createdAt: number;
  tags: EntryTag[];
  themes: string[];
  /** chakra this entry was pre-seeded to, if any */
  seededChakra?: ChakraKey;
  /** local file URI of the recorded voice note, if modality is voice */
  voiceUrl?: string;
  /** recorded length in seconds, if a voice note was captured */
  voiceDurationS?: number;
}

export interface CoachMessage {
  id: string;
  role: 'user' | 'coach';
  content: string;
  createdAt: number;
  protocols?: Protocol[];
}

export type ProtocolType = 'breath' | 'sound' | 'reflect';

export interface Protocol {
  key: string;
  type: ProtocolType;
  eyebrow: string; // "BREATHWORK · 5 MIN"
  title: string;
  subtitle: string;
  chakra?: ChakraKey;
  hz?: number;
  durationS?: number;
}

export interface CompletedSession {
  id: string;
  sessionKey: string;
  chakra: ChakraKey;
  hz: number;
  durationS: number;
  completedAt: number;
}

export interface Breakthrough {
  id: string;
  label: string;
  type: string;
  occurredAt: number;
}

export interface Intention {
  text: string;
  day: number;
  totalDays: number;
  startedAt: number;
}

export interface Observation {
  text: string;
  chips: { label: string; surface: SurfaceKey; hz?: number; chakra?: ChakraKey }[];
}

/** Self-reported baseline mood, 1 (heavy) – 5 (clear). */
export type BaselineMood = 1 | 2 | 3 | 4 | 5;

/** How long the user has worked with this kind of practice. */
export type ExperienceLevel = 'new' | 'some' | 'devoted';

/**
 * Identity + wellbeing intake. Collected during onboarding to personalize the
 * field. `id` matches the Supabase auth user id; the row lives in
 * `public.profiles`.
 */
export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  birthdate: string | null; // ISO yyyy-mm-dd
  focusAreas: ChakraKey[];
  baselineMood: BaselineMood | null;
  experienceLevel: ExperienceLevel | null;
  primaryIntention: string;
}
