/**
 * FREQUENCY ENGINE — The generative heart of chakraOS
 *
 * This is the core system that derives everything from frequency:
 * - Session parameters (baseHz, beatHz, duration)
 * - Color palettes and gradients
 * - Audio synthesis parameters
 * - Brainwave targeting
 * - Visualization properties
 * - XP multipliers
 * - AI coach recommendations
 *
 * PRINCIPLE: Everything visual and sonic is DERIVED from FieldState.
 * Nothing is hardcoded. The engine transforms frequency into experience.
 */

import type { ChakraKey, FieldState } from '@/lib/types';
import { frequencyToColor, bandFromBeat, nearestChakra, type Brainwave } from '@/lib/sound';

// ─────────────────────────────────────────────────────────────────────────
// Engine Output Types
// ─────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────
// Derivation Functions
// ─────────────────────────────────────────────────────────────────────────

function deriveSession(field: FieldState): DerivedSession {
  const chakra = nearestChakra(field.baseHz);
  const chakraNames: Record<ChakraKey, string> = {
    earth: 'Earth Grounding',
    root: 'Root Security', 
    sacral: 'Sacral Flow',
    solar: 'Solar Power',
    heart: 'Heart Opening',
    throat: 'Throat Expression',
    third: 'Third Eye Insight',
    crown: 'Crown Connection',
    soul: 'Soul Unity'
  };

  const band = bandFromBeat(field.beatHz);
  const name = chakraNames[chakra];
  const intent = band?.intent ?? 'pure resonance';

  return {
    baseHz: field.baseHz,
    beatHz: field.beatHz,
    duration: field.duration,
    chakra,
    name,
    intent
  };
}

function deriveColors(field: FieldState): ColorPalette {
  const primary = frequencyToColor(field.baseHz);
  const accent = frequencyToColor(field.baseHz * 1.498); // perfect fifth up
  
  // Opacity based on energy level
  const energyAlpha = Math.round((field.energy / 100) * 255).toString(16).padStart(2, '0');
  const glowAlpha = Math.round((field.coherence / 100) * 80).toString(16).padStart(2, '0');
  
  return {
    primary,
    accent,
    background: `${primary}${energyAlpha}`,
    glow: `${primary}${glowAlpha}`,
    ring: accent,
    core: primary
  };
}

function deriveGradients(colors: ColorPalette, field: FieldState): GradientSet {
  return {
    primary: [colors.primary, colors.accent],
    radial: [colors.core, colors.ring, colors.background],
    particle: [colors.glow, colors.ring]
  };
}

function deriveAudio(field: FieldState): AudioParameters {
  const leftHz = field.baseHz;
  const rightHz = field.beatHz ? field.baseHz + field.beatHz : field.baseHz;
  
  // Noise type based on frequency range
  let noiseType: 'pink' | 'brown' | null = null;
  let noiseAmplitude = 0;
  
  if (field.baseHz < 300) {
    noiseType = 'brown';
    noiseAmplitude = 0.15;
  } else if (field.baseHz < 600) {
    noiseType = 'pink';
    noiseAmplitude = 0.08;
  }
  
  // Fade duration based on session length
  const fadeDuration = Math.min(30, field.duration * 0.05);
  
  // Volume based on energy level
  const volume = 0.3 + (field.energy / 100) * 0.4;

  return {
    leftHz,
    rightHz,
    noise: { type: noiseType, amplitude: noiseAmplitude },
    fadeDuration,
    volume
  };
}

function deriveVisualization(field: FieldState, brainwave: Brainwave | null): VisualizationParameters {
  const tempoS = brainwave?.tempoS ?? 6.0;
  const rings = brainwave?.rings ?? 5;
  const glow = brainwave?.soft ?? 0.6;
  
  // Motion based on energy and focus
  const motionIntensity = (field.energy + field.focus) / 200;
  
  // Particle density based on coherence
  const particleDensity = 0.5 + (field.coherence / 100) * 0.5;
  
  // Orb scale based on breath depth
  const orbScale = 0.8 + (field.breath / 100) * 0.4;

  return {
    tempoS,
    rings,
    glow,
    particleDensity,
    motionIntensity,
    orbScale
  };
}

function deriveXP(field: FieldState): XPMultiplier {
  // Base XP based on session duration (longer = more XP)
  const base = Math.min(2.0, field.duration / 600);
  
  // Coherence bonus (heart rate variability)
  const coherence = field.coherence > 70 ? 1.5 : field.coherence > 50 ? 1.2 : 1.0;
  
  // Consistency bonus (completing full session)
  const consistency = 1.0; // Will be calculated based on completion percentage
  
  const total = base * coherence * consistency;

  return { base, coherence, consistency, total };
}

function deriveCoaching(field: FieldState): CoachRecommendation {
  // AI coaching logic - recommend frequencies based on current state
  let frequency = field.baseHz;
  let beat = field.beatHz;
  let duration = field.duration;
  let reasoning = '';
  let targetChakra = nearestChakra(field.baseHz);

  // If stress is high, recommend lower frequencies
  if (field.stress > 70) {
    frequency = 174; // Earth frequency for grounding
    beat = 2; // Delta waves for deep relaxation
    duration = Math.max(duration, 1200); // Minimum 20 minutes
    reasoning = 'High stress detected. Grounding with Earth frequency and delta waves for deep relaxation.';
    targetChakra = 'earth';
  }
  // If energy is low, recommend energizing frequencies
  else if (field.energy < 30) {
    frequency = 528; // Solar plexus for energy
    beat = 12; // Alpha-beta border for alertness
    reasoning = 'Low energy detected. Solar frequency to restore personal power and vitality.';
    targetChakra = 'solar';
  }
  // If focus is low, recommend clarity frequencies
  else if (field.focus < 40) {
    frequency = 741; // Throat chakra for clarity
    beat = 14; // Beta waves for focus
    reasoning = 'Focus scattered. Throat frequency to clear mental fog and enhance concentration.';
    targetChakra = 'throat';
  }
  // If coherence is low, recommend heart frequencies
  else if (field.coherence < 50) {
    frequency = 639; // Heart chakra
    beat = 10; // Alpha waves for coherence
    reasoning = 'Heart coherence low. Heart frequency to restore emotional balance and flow.';
    targetChakra = 'heart';
  }

  return {
    frequency,
    beat,
    duration,
    reasoning,
    targetChakra
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Main Engine Function
// ─────────────────────────────────────────────────────────────────────────

/**
 * The FrequencyEngine — transforms FieldState into all derived experiences.
 * This is the single source of truth for every visual, audio, and interactive
 * property in chakraOS. Nothing is hardcoded; everything emerges from frequency.
 */
export function FrequencyEngine(field: FieldState): FrequencyEngineOutput {
  const session = deriveSession(field);
  const colors = deriveColors(field);
  const gradients = deriveGradients(colors, field);
  const audio = deriveAudio(field);
  const brainwave = bandFromBeat(field.beatHz);
  const visualization = deriveVisualization(field, brainwave);
  const xp = deriveXP(field);
  const coaching = deriveCoaching(field);

  return {
    session,
    colors,
    gradients,
    audio,
    brainwave,
    visualization,
    xp,
    coaching
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────

/**
 * Create a default FieldState for initial app load
 */
export function createDefaultFieldState(): FieldState {
  return {
    baseHz: 639, // Heart chakra
    beatHz: 8,   // Alpha waves
    breath: 70,
    coherence: 60,
    energy: 65,
    focus: 55,
    stress: 40,
    emotion: 20,
    duration: 600 // 10 minutes
  };
}

/**
 * Update FieldState based on user input (journal, session completion, etc.)
 */
export function updateFieldState(
  current: FieldState,
  updates: Partial<FieldState>
): FieldState {
  return { ...current, ...updates };
}

/**
 * Generate a new FieldState based on current chakra states and recent entries
 */
export function generateFieldState(
  chakraStates: { key: ChakraKey; energy: number }[],
  recentMood?: number,
  targetChakra?: ChakraKey
): FieldState {
  // Find the most depleted chakra or use target
  const target = targetChakra 
    ? chakraStates.find(s => s.key === targetChakra) 
    : [...chakraStates].sort((a, b) => a.energy - b.energy)[0];

  if (!target) return createDefaultFieldState();

  // Map chakra to frequency
  const chakraHz: Record<ChakraKey, number> = {
    earth: 174, root: 396, sacral: 417, solar: 528, heart: 639,
    throat: 741, third: 852, crown: 963, soul: 1074
  };

  const baseHz = chakraHz[target.key];
  
  // Determine beat frequency based on energy level
  let beatHz: number | null = 8; // Default alpha
  if (target.energy < 30) beatHz = 6;      // Theta for restoration
  else if (target.energy < 50) beatHz = 8; // Alpha for balance
  else if (target.energy > 80) beatHz = 12; // Beta for activation
  
  // Calculate other parameters
  const energy = Math.round(chakraStates.reduce((sum, s) => sum + s.energy, 0) / chakraStates.length);
  const coherence = Math.max(30, Math.min(90, energy + (recentMood ?? 0) * 10));
  const stress = Math.max(10, 100 - energy);
  const emotion = (recentMood ?? 0) * 20;
  
  return {
    baseHz,
    beatHz,
    breath: coherence,
    coherence,
    energy,
    focus: Math.min(90, energy + 10),
    stress,
    emotion,
    duration: target.energy < 40 ? 720 : 600 // Longer sessions for depleted chakras
  };
}