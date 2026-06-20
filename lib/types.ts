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
