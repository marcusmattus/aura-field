/**
 * RECIPE TYPES
 */

import type { ChakraKey, FieldState } from '@/lib/types';

export type Intent = 
  | 'grounding'
  | 'energy'
  | 'focus' 
  | 'clarity'
  | 'heart-coherence'
  | 'deep-rest'
  | 'emotional-release'
  | 'spiritual-connection'
  | 'creative-flow'
  | 'stress-relief'
  | 'mental-reset'
  | 'physical-healing'
  | 'manifestation'
  | 'protection'
  | 'joy';

export interface Recipe {
  id: string;
  name: string;
  intent: Intent;
  description: string;
  
  /** Function that generates FieldState based on current conditions */
  generate: (context: RecipeContext) => FieldState;
  
  /** Conditions when this recipe is most beneficial */
  bestWhen: string[];
  
  /** Tags for categorization */
  tags: string[];
  
  /** Minimum and maximum durations in seconds */
  durationRange: [number, number];
}

export interface RecipeContext {
  /** Current chakra energy states */
  chakraStates: { key: ChakraKey; energy: number }[];
  
  /** Recent mood assessment (-5 to +5) */
  recentMood?: number;
  
  /** Time of day (0-23) */
  timeOfDay?: number;
  
  /** Stress level (0-100) */
  stressLevel?: number;
  
  /** Energy level (0-100) */
  energyLevel?: number;
  
  /** Target chakra if specified */
  targetChakra?: ChakraKey;
  
  /** Available session duration in seconds */
  availableTime?: number;
}