/**
 * FREQUENCY ENGINE — The generative heart of chakraOS
 */

import { frequencyToColor, bandFromBeat, nearestChakra, type Brainwave } from '@/lib/sound';
import type { ChakraKey } from '@/lib/types';
import type { FieldState } from './field-state';
import type {
  DerivedSession,
  ColorPalette,
  GradientSet,
  AudioParameters,
  VisualizationParameters,
  XPMultiplier,
  CoachRecommendation,
  FrequencyEngineOutput
} from './types';

// Re-export the frequency engine function
export { FrequencyEngine } from '@/lib/frequency';