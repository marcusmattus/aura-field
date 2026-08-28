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

/** A virtue theme surfaced from a journal entry — see lib/agents/virtue.ts.
 * `virtue` is a key into lib/virtues.ts's VIRTUE_BY_KEY. */
export interface VirtueTag {
  virtue: string;
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
  /** virtue themes surfaced from this entry, if the Virtue framework is on */
  virtueTags?: VirtueTag[];
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

export interface SoundSession {
  key: string;
  chakra: ChakraKey;
  hz: number;
  brainwaveBand: string; // "alpha 8 Hz"
  durationS: number;
  title: string;
  intent: string;
  tags: string[];
}

export interface CompletedSession {
  id: string;
  sessionKey: string;
  chakra: ChakraKey;
  hz: number;
  durationS: number;
  completedAt: number;
}

/** Which hand a palm scan was framed with. */
export type PalmHand = 'left' | 'right';

/**
 * A saved reading of the chakraOS palm visualisation. Records the field state
 * that was projected onto the hand — never anything measured from the camera.
 */
export interface PalmScan {
  id: string;
  capturedAt: number;
  hand: PalmHand;
  /** field index at capture time (the "palm field" score) */
  fieldIndex: number;
  /** how evenly the channel ran fingertip → wrist, 0-100 */
  continuity: number;
  energies: Record<ChakraKey, number>;
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

// ---------------------------------------------------------------------------
// Goals & habits (M9 — Advanced Personal OS)
// ---------------------------------------------------------------------------

export type GoalStatus = 'active' | 'completed' | 'archived';

export interface Goal {
  id: string;
  title: string;
  /** why this goal matters, in the user's own words */
  intention: string;
  chakra?: ChakraKey;
  status: GoalStatus;
  createdAt: number;
  targetDate: number | null;
  completedAt: number | null;
}

export type HabitCadence = 'daily' | 'weekly';

export interface Habit {
  id: string;
  goalId: string | null;
  title: string;
  cadence: HabitCadence;
  createdAt: number;
  archivedAt: number | null;
}

/** One voluntary completion of a habit. */
export interface HabitEvent {
  id: string;
  habitId: string;
  completedAt: number;
}

export type ReviewPeriod = 'weekly' | 'monthly';

/** Deterministic stats a review is built from — see lib/agents/review.ts. */
export interface ReviewStats {
  period: ReviewPeriod;
  windowStart: number;
  windowEnd: number;
  journalEntryCount: number;
  fieldIndexStart: number;
  fieldIndexEnd: number;
  topRisingChakra: ChakraKey | null;
  topFallingChakra: ChakraKey | null;
  virtueReflectionCount: number;
  virtuePracticeCount: number;
  mudraSessionCount: number;
  habitsCompleted: number;
  habitsScheduled: number;
  activeGoalCount: number;
  completedGoalCount: number;
}
