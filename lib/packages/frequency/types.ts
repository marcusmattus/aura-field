/**
 * FREQUENCY TYPES — All types related to frequency engine
 */

import type { ChakraKey } from '@/lib/types';
import type { Brainwave } from '@/lib/sound';

export interface DerivedSession {
  baseHz: number;
  beatHz: number | null;
  duration: number;
  chakra: ChakraKey;
  name: string;
  intent: string;
}

export interface ColorPalette {
  /** Primary color derived from baseHz */
  primary: string;
  /** Accent color (fifth up from primary) */
  accent: string;
  /** Background color with frequency-based opacity */
  background: string;
  /** Glow/halo color with alpha */
  glow: string;
  /** Ring/particle color */
  ring: string;
  /** Core orb color */
  core: string;
}

export interface GradientSet {
  /** Main UI gradient */
  primary: [string, string];
  /** Radial background gradient */
  radial: [string, string, string];
  /** Particle trail gradient */
  particle: [string, string];
}

export interface AudioParameters {
  /** Left ear frequency */
  leftHz: number;
  /** Right ear frequency */
  rightHz: number;
  /** Noise type and amplitude */
  noise: { type: 'pink' | 'brown' | null; amplitude: number };
  /** Fade in/out duration in seconds */
  fadeDuration: number;
  /** Volume envelope based on field energy */
  volume: number;
}

export interface VisualizationParameters {
  /** Animation tempo in seconds per cycle */
  tempoS: number;
  /** Number of rings/particles */
  rings: number;
  /** Glow intensity 0-1 */
  glow: number;
  /** Particle density multiplier */
  particleDensity: number;
  /** Motion intensity 0-1 */
  motionIntensity: number;
  /** Orb size multiplier */
  orbScale: number;
}

export interface XPMultiplier {
  /** Base XP multiplier */
  base: number;
  /** Coherence bonus */
  coherence: number;
  /** Consistency bonus */
  consistency: number;
  /** Total effective multiplier */
  total: number;
}

export interface CoachRecommendation {
  /** Recommended frequency */
  frequency: number;
  /** Recommended beat offset */
  beat: number | null;
  /** Session duration */
  duration: number;
  /** Explanation of why this frequency was chosen */
  reasoning: string;
  /** Chakra to focus on */
  targetChakra: ChakraKey;
}

export interface FrequencyEngineOutput {
  session: DerivedSession;
  colors: ColorPalette;
  gradients: GradientSet;
  audio: AudioParameters;
  brainwave: Brainwave | null;
  visualization: VisualizationParameters;
  xp: XPMultiplier;
  coaching: CoachRecommendation;
}