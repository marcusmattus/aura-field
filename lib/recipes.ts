/**
 * RECIPE ENGINE — Procedural Session Generation
 *
 * Replaces static session lists with dynamic recipes that generate
 * frequencies, durations, and parameters based on intent and field state.
 * 
 * PRINCIPLE: No hardcoded sessions. Everything is procedurally generated
 * from recipes that encode the logic of frequency selection.
 */

import type { ChakraKey, FieldState } from '@/lib/types';
import { generateFieldState, FrequencyEngine } from '@/lib/frequency';

// ─────────────────────────────────────────────────────────────────────────
// Recipe System Types
// ─────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────
// Core Recipes
// ─────────────────────────────────────────────────────────────────────────

const RECIPES: Recipe[] = [
  {
    id: 'mental-reset',
    name: 'Mental Reset',
    intent: 'clarity',
    description: 'Clear mental fog and restore cognitive clarity',
    generate: (ctx) => ({
      baseHz: 741, // Throat chakra for expression and clarity
      beatHz: 14,  // Beta waves for alertness
      breath: 60,
      coherence: 55,
      energy: ctx.energyLevel ?? 65,
      focus: 80,   // High focus target
      stress: ctx.stressLevel ?? 30,
      emotion: 10,
      duration: Math.min(ctx.availableTime ?? 720, 720)
    }),
    bestWhen: ['mental fatigue', 'brain fog', 'need focus'],
    tags: ['focus', 'clarity', 'cognitive'],
    durationRange: [300, 900]
  },

  {
    id: 'deep-grounding',
    name: 'Deep Grounding',
    intent: 'grounding',
    description: 'Root into Earth energy for stability and security',
    generate: (ctx) => {
      // Determine depth based on stress level
      const isHighStress = (ctx.stressLevel ?? 0) > 70;
      return {
        baseHz: 174, // Earth frequency
        beatHz: isHighStress ? 2 : 4, // Delta for high stress, theta for normal
        breath: 50,
        coherence: 45,
        energy: 40,
        focus: 30,
        stress: ctx.stressLevel ?? 80,
        emotion: -20, // Initially heavy, will improve
        duration: isHighStress ? 1200 : 600
      };
    },
    bestWhen: ['anxiety', 'feeling unmoored', 'overwhelm', 'insomnia'],
    tags: ['grounding', 'stability', 'earth', 'calming'],
    durationRange: [600, 1800]
  },

  {
    id: 'heart-coherence',
    name: 'Heart Coherence',
    intent: 'heart-coherence',
    description: 'Synchronize heart rhythm for emotional balance',
    generate: (ctx) => ({
      baseHz: 639, // Heart chakra
      beatHz: 10,  // Alpha waves for coherence
      breath: 75,  // Higher breath coherence
      coherence: 85, // Target high coherence
      energy: ctx.energyLevel ?? 70,
      focus: 60,
      stress: Math.max(20, (ctx.stressLevel ?? 50) - 30),
      emotion: 30, // Positive emotional target
      duration: ctx.availableTime ?? 660
    }),
    bestWhen: ['emotional turbulence', 'relationship stress', 'need compassion'],
    tags: ['heart', 'coherence', 'emotional', 'balance'],
    durationRange: [420, 1200]
  },

  {
    id: 'solar-activation',
    name: 'Solar Activation',
    intent: 'energy',
    description: 'Ignite personal power and vital energy',
    generate: (ctx) => ({
      baseHz: 528, // Solar plexus
      beatHz: 12,  // Alpha-beta for activation
      breath: 70,
      coherence: 60,
      energy: 90,  // High energy target
      focus: 75,
      stress: Math.max(15, (ctx.stressLevel ?? 40) - 25),
      emotion: 40, // Confident and empowered
      duration: ctx.availableTime ?? 480
    }),
    bestWhen: ['low energy', 'lack motivation', 'need confidence'],
    tags: ['energy', 'power', 'confidence', 'motivation'],
    durationRange: [300, 600]
  },

  {
    id: 'third-eye-opening',
    name: 'Third Eye Opening',
    intent: 'spiritual-connection',
    description: 'Awaken intuition and inner vision',
    generate: (ctx) => {
      const isBeginner = ctx.chakraStates.find(s => s.key === 'third')?.energy ?? 50 < 60;
      return {
        baseHz: 852, // Third eye chakra
        beatHz: isBeginner ? 8 : 6, // Alpha for beginners, theta for experienced
        breath: 65,
        coherence: 70,
        energy: 60,
        focus: 85,
        stress: 25,
        emotion: 15,
        duration: isBeginner ? 600 : 900
      };
    },
    bestWhen: ['seeking guidance', 'need insight', 'spiritual practice'],
    tags: ['intuition', 'spiritual', 'insight', 'meditation'],
    durationRange: [600, 1200]
  },

  {
    id: 'crown-connection',
    name: 'Crown Connection',
    intent: 'spiritual-connection',
    description: 'Connect to universal consciousness and divine wisdom',
    generate: (ctx) => ({
      baseHz: 963, // Crown chakra
      beatHz: 6,   // Theta for deep states
      breath: 60,
      coherence: 80,
      energy: 50,
      focus: 90,
      stress: 20,
      emotion: 20,
      duration: ctx.availableTime ?? 900
    }),
    bestWhen: ['spiritual seeking', 'meditation', 'need perspective'],
    tags: ['spiritual', 'consciousness', 'transcendence', 'wisdom'],
    durationRange: [600, 1800]
  },

  {
    id: 'sacral-flow',
    name: 'Sacral Flow',
    intent: 'creative-flow',
    description: 'Unlock creativity and emotional flow',
    generate: (ctx) => ({
      baseHz: 417, // Sacral chakra
      beatHz: 10,  // Alpha for flow states
      breath: 75,
      coherence: 70,
      energy: 75,
      focus: 60,
      stress: 30,
      emotion: 35, // Creative joy
      duration: ctx.availableTime ?? 540
    }),
    bestWhen: ['creative blocks', 'need inspiration', 'emotional stagnation'],
    tags: ['creativity', 'flow', 'inspiration', 'emotional'],
    durationRange: [300, 900]
  },

  {
    id: 'stress-dissolution',
    name: 'Stress Dissolution',
    intent: 'stress-relief',
    description: 'Dissolve tension and restore nervous system balance',
    generate: (ctx) => {
      const stressLevel = ctx.stressLevel ?? 60;
      // Higher stress = lower frequency and slower beats
      const baseHz = stressLevel > 80 ? 174 : stressLevel > 60 ? 396 : 528;
      const beatHz = stressLevel > 80 ? 2 : stressLevel > 60 ? 4 : 8;
      
      return {
        baseHz,
        beatHz,
        breath: 40,
        coherence: 35,
        energy: 30,
        focus: 25,
        stress: stressLevel,
        emotion: -10,
        duration: Math.max(600, ctx.availableTime ?? 720)
      };
    },
    bestWhen: ['high stress', 'overwhelm', 'anxiety', 'tension'],
    tags: ['stress-relief', 'calming', 'nervous-system', 'restoration'],
    durationRange: [600, 1800]
  },

  {
    id: 'joy-activation',
    name: 'Joy Activation',
    intent: 'joy',
    description: 'Elevate mood and cultivate inner joy',
    generate: (ctx) => ({
      baseHz: 528, // Love frequency
      beatHz: 15,  // Beta for uplifting
      breath: 80,
      coherence: 85,
      energy: 85,
      focus: 70,
      stress: 15,
      emotion: 50, // High positive emotion
      duration: ctx.availableTime ?? 420
    }),
    bestWhen: ['low mood', 'depression', 'need uplift', 'celebration'],
    tags: ['joy', 'mood', 'uplifting', 'positive'],
    durationRange: [240, 600]
  },

  {
    id: 'deep-sleep',
    name: 'Deep Sleep',
    intent: 'deep-rest',
    description: 'Prepare for restorative deep sleep',
    generate: (ctx) => ({
      baseHz: 174, // Grounding frequency
      beatHz: 1.5, // Delta waves for sleep
      breath: 30,
      coherence: 40,
      energy: 20,
      focus: 15,
      stress: 20,
      emotion: -5,
      duration: Math.max(900, ctx.availableTime ?? 1200)
    }),
    bestWhen: ['insomnia', 'restless sleep', 'bedtime', 'need deep rest'],
    tags: ['sleep', 'rest', 'delta', 'restoration'],
    durationRange: [900, 2400]
  }
];

// ─────────────────────────────────────────────────────────────────────────
// Recipe Engine Functions
// ─────────────────────────────────────────────────────────────────────────

/**
 * Find the best recipe for the current context
 */
export function findBestRecipe(context: RecipeContext, intent?: Intent): Recipe {
  let candidates = RECIPES;
  
  // Filter by intent if specified
  if (intent) {
    candidates = RECIPES.filter(r => r.intent === intent);
  }
  
  // If no candidates, return a default recipe
  if (candidates.length === 0) {
    return RECIPES[0]; // Mental reset as fallback
  }
  
  // Score recipes based on current context
  const scored = candidates.map(recipe => ({
    recipe,
    score: scoreRecipe(recipe, context)
  }));
  
  // Return highest scoring recipe
  scored.sort((a, b) => b.score - a.score);
  return scored[0].recipe;
}

/**
 * Score a recipe based on how well it matches the current context
 */
function scoreRecipe(recipe: Recipe, context: RecipeContext): number {
  let score = 0;
  
  const { stressLevel = 50, energyLevel = 50, timeOfDay = 12 } = context;
  
  // Score based on stress level match
  if (recipe.intent === 'stress-relief' && stressLevel > 70) score += 30;
  if (recipe.intent === 'grounding' && stressLevel > 60) score += 20;
  if (recipe.intent === 'deep-rest' && stressLevel > 80) score += 25;
  
  // Score based on energy level match
  if (recipe.intent === 'energy' && energyLevel < 40) score += 25;
  if (recipe.intent === 'clarity' && energyLevel < 50) score += 15;
  
  // Time of day scoring
  if (timeOfDay < 6 || timeOfDay > 22) {
    if (recipe.intent === 'deep-rest') score += 20;
  } else if (timeOfDay >= 6 && timeOfDay <= 10) {
    if (recipe.intent === 'energy') score += 15;
  } else if (timeOfDay >= 14 && timeOfDay <= 18) {
    if (recipe.intent === 'focus' || recipe.intent === 'clarity') score += 10;
  }
  
  // Duration availability
  const availableTime = context.availableTime ?? 600;
  const [minDur, maxDur] = recipe.durationRange;
  if (availableTime >= minDur && availableTime <= maxDur) {
    score += 10;
  }
  
  return score;
}

/**
 * Generate all available recipes for browsing
 */
export function getAllRecipes(): Recipe[] {
  return [...RECIPES];
}

/**
 * Get recipes by intent
 */
export function getRecipesByIntent(intent: Intent): Recipe[] {
  return RECIPES.filter(r => r.intent === intent);
}

/**
 * Generate a session from a recipe and context
 */
export function executeRecipe(recipe: Recipe, context: RecipeContext) {
  const fieldState = recipe.generate(context);
  const engineOutput = FrequencyEngine(fieldState);
  
  return {
    recipe,
    fieldState,
    ...engineOutput
  };
}

/**
 * Get a quick session for immediate use
 */
export function getQuickSession(intent: Intent, availableMinutes: number = 10): ReturnType<typeof executeRecipe> {
  const context: RecipeContext = {
    chakraStates: [
      { key: 'root', energy: 50 },
      { key: 'sacral', energy: 50 },
      { key: 'solar', energy: 50 },
      { key: 'heart', energy: 50 },
      { key: 'throat', energy: 50 },
      { key: 'third', energy: 50 },
      { key: 'crown', energy: 50 },
    ],
    availableTime: availableMinutes * 60,
    timeOfDay: new Date().getHours()
  };
  
  const recipe = findBestRecipe(context, intent);
  return executeRecipe(recipe, context);
}