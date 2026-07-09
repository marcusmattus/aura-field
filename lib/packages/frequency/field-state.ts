/**
 * FIELD STATE — The core state that drives all chakraOS experiences
 */

import type { ChakraKey } from '@/lib/types';

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