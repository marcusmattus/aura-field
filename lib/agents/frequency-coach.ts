/**
 * FREQUENCY COACH — AI Agent that generates dynamic frequencies
 *
 * Replaces static session selection with intelligent frequency generation.
 * Analyzes user state, journal entries, and current field to recommend
 * optimal frequencies, binaural beats, and session durations.
 *
 * PRINCIPLE: Never recommend prebuilt sessions. Always generate frequencies
 * based on current needs and field state.
 */

import type { ChakraKey, ChakraState, JournalEntry, Protocol, FieldState } from '@/lib/types';
import { FrequencyEngine, generateFieldState, type CoachRecommendation } from '@/lib/frequency';
import { findBestRecipe, type Intent, type RecipeContext } from '@/lib/recipes';
import { frequencyToColor, nearestChakra } from '@/lib/sound';
import { CHAKRA_BY_KEY } from '@/lib/chakras';

const DAY_MS = 86_400_000;

export interface FrequencyCoachReply {
  content: string;
  protocols: FrequencyProtocol[];
  crisis: boolean;
  /** Recommended field state for optimal session */
  recommendedState?: FieldState;
  /** AI reasoning for the frequency choice */
  reasoning: string;
}

export interface FrequencyProtocol extends Omit<Protocol, 'type'> {
  type: 'frequency' | 'breath' | 'reflect';
  /** Generated frequency for this protocol */
  frequency?: number;
  /** Binaural beat offset */
  beatHz?: number;
  /** Derived from frequency */
  color?: string;
  /** Session parameters */
  fieldState?: FieldState;
}

const CRISIS_MESSAGE =
  'I want to pause the practice for a moment. What you wrote sounds really heavy, and you deserve real human support right now — more than an app can give. If you are in the US you can call or text 988 (Suicide & Crisis Lifeline), any time. If you might be in danger, please reach emergency services. I am still here when you are ready to come back.';

/**
 * Enhanced coach that generates frequencies dynamically
 */
export function frequencyCoachRespond(args: {
  userText: string;
  states: ChakraState[];
  entries: JournalEntry[];
  distress: boolean;
  now: number;
}): FrequencyCoachReply {
  const { userText, states, entries, distress, now } = args;

  if (distress) {
    return { 
      content: CRISIS_MESSAGE, 
      protocols: [], 
      crisis: true, 
      reasoning: 'Crisis detected - prioritizing human support over frequency work'
    };
  }

  // Analyze current field state
  const recentMood = extractMoodFromEntries(entries, now);
  const stressLevel = calculateStressLevel(states, entries, now);
  const energyLevel = states.reduce((sum, s) => sum + s.energy, 0) / states.length;
  const timeOfDay = new Date(now).getHours();
  
  // Build context for recipe selection
  const context: RecipeContext = {
    chakraStates: states,
    recentMood,
    timeOfDay,
    stressLevel,
    energyLevel,
    availableTime: 600 // Default 10 minutes
  };

  // Determine primary intent from user text and field analysis
  const intent = determineIntent(userText, states, entries, context);
  
  // Generate optimal field state
  const recommendedState = generateOptimalFieldState(intent, context, userText);
  
  // Get AI reasoning for this frequency choice
  const engineOutput = FrequencyEngine(recommendedState);
  const reasoning = engineOutput.coaching.reasoning;

  // Build contextual response
  const cites = buildFieldCitations(states, entries, now);
  const opener = userText.trim() ? "I've been listening. " : "Here's what I see in your field. ";
  const content = `${opener}${cites.join(' ')} I'm generating a frequency specifically for where you are right now. ${reasoning}`;

  // Generate frequency protocols
  const protocols = generateFrequencyProtocols(recommendedState, intent, context);

  return { 
    content, 
    protocols, 
    crisis: false, 
    recommendedState, 
    reasoning 
  };
}

/**
 * Determine primary intent from user input and field analysis
 */
function determineIntent(
  userText: string, 
  states: ChakraState[], 
  entries: JournalEntry[],
  context: RecipeContext
): Intent {
  const text = userText.toLowerCase();
  
  // Explicit intent keywords
  if (text.includes('stress') || text.includes('anxious') || text.includes('overwhelm')) {
    return 'stress-relief';
  }
  if (text.includes('tired') || text.includes('energy') || text.includes('exhausted')) {
    return 'energy';
  }
  if (text.includes('focus') || text.includes('concentrate') || text.includes('clear')) {
    return 'clarity';
  }
  if (text.includes('heart') || text.includes('love') || text.includes('connect')) {
    return 'heart-coherence';
  }
  if (text.includes('ground') || text.includes('steady') || text.includes('stable')) {
    return 'grounding';
  }
  if (text.includes('sleep') || text.includes('rest') || text.includes('deep')) {
    return 'deep-rest';
  }
  
  // Analyze field state for automatic intent detection
  if (context.stressLevel > 70) return 'stress-relief';
  if (context.energyLevel < 40) return 'energy';
  if (context.timeOfDay < 6 || context.timeOfDay > 22) return 'deep-rest';
  
  // Find most depleted chakra and match intent
  const weakest = [...states].sort((a, b) => a.energy - b.energy)[0];
  if (weakest.key === 'root' || weakest.key === 'earth') return 'grounding';
  if (weakest.key === 'solar') return 'energy';
  if (weakest.key === 'heart') return 'heart-coherence';
  if (weakest.key === 'throat' || weakest.key === 'third') return 'clarity';
  
  return 'clarity'; // Default fallback
}

/**
 * Generate optimal field state for the determined intent
 */
function generateOptimalFieldState(
  intent: Intent, 
  context: RecipeContext, 
  userText: string
): FieldState {
  // Find best recipe for this context
  const recipe = findBestRecipe(context, intent);
  
  // Generate base field state from recipe
  let fieldState = recipe.generate(context);
  
  // Apply user text modifications
  fieldState = applyUserTextModifications(fieldState, userText);
  
  // Apply time-of-day adjustments
  fieldState = applyTimeAdjustments(fieldState, context.timeOfDay || 12);
  
  return fieldState;
}

/**
 * Modify field state based on user text analysis
 */
function applyUserTextModifications(fieldState: FieldState, userText: string): FieldState {
  const text = userText.toLowerCase();
  
  // Intensity modifiers
  if (text.includes('deep') || text.includes('intense')) {
    return {
      ...fieldState,
      duration: Math.min(1800, fieldState.duration * 1.5), // Longer session
      beatHz: fieldState.beatHz ? fieldState.beatHz * 0.8 : 6 // Slower beats
    };
  }
  
  if (text.includes('gentle') || text.includes('soft')) {
    return {
      ...fieldState,
      beatHz: fieldState.beatHz ? fieldState.beatHz * 0.9 : 10, // Slightly faster, gentler
      duration: Math.max(300, fieldState.duration * 0.7) // Shorter session
    };
  }
  
  if (text.includes('quick') || text.includes('short')) {
    return {
      ...fieldState,
      duration: Math.min(600, fieldState.duration * 0.5), // Much shorter
      beatHz: fieldState.beatHz ? fieldState.beatHz * 1.2 : 12 // Faster engagement
    };
  }
  
  return fieldState;
}

/**
 * Apply time-of-day adjustments to field state
 */
function applyTimeAdjustments(fieldState: FieldState, timeOfDay: number): FieldState {
  // Early morning (5-9 AM): More energizing
  if (timeOfDay >= 5 && timeOfDay <= 9) {
    return {
      ...fieldState,
      baseHz: Math.min(741, fieldState.baseHz * 1.1), // Slightly higher frequency
      beatHz: fieldState.beatHz ? Math.min(15, fieldState.beatHz * 1.2) : 12 // More alerting beats
    };
  }
  
  // Late evening (9-11 PM): More calming
  if (timeOfDay >= 21 && timeOfDay <= 23) {
    return {
      ...fieldState,
      baseHz: Math.max(174, fieldState.baseHz * 0.9), // Lower frequency
      beatHz: fieldState.beatHz ? Math.max(2, fieldState.beatHz * 0.7) : 6 // Slower beats
    };
  }
  
  // Night time (11 PM - 5 AM): Sleep oriented
  if (timeOfDay >= 23 || timeOfDay <= 5) {
    return {
      ...fieldState,
      baseHz: 174, // Earth frequency for deep grounding
      beatHz: 2, // Delta waves for sleep
      duration: Math.max(900, fieldState.duration) // Longer sleep sessions
    };
  }
  
  return fieldState;
}

/**
 * Generate dynamic frequency protocols
 */
function generateFrequencyProtocols(
  fieldState: FieldState, 
  intent: Intent,
  context: RecipeContext
): FrequencyProtocol[] {
  const protocols: FrequencyProtocol[] = [];
  const targetChakra = nearestChakra(fieldState.baseHz);
  const color = frequencyToColor(fieldState.baseHz);
  
  // Primary frequency protocol
  protocols.push({
    key: `frequency-${fieldState.baseHz}`,
    type: 'frequency',
    eyebrow: `FREQUENCY · ${fieldState.baseHz} HZ · ${Math.round(fieldState.duration / 60)} MIN`,
    title: `${CHAKRA_BY_KEY[targetChakra].name} Resonance`,
    subtitle: fieldState.beatHz 
      ? `${fieldState.beatHz} Hz binaural beats for ${getBrainwaveDescription(fieldState.beatHz)}`
      : 'Pure sine wave drone',
    chakra: targetChakra,
    frequency: fieldState.baseHz,
    beatHz: fieldState.beatHz || undefined,
    durationS: fieldState.duration,
    color,
    fieldState
  });
  
  // Alternative shorter protocol
  const quickState = {
    ...fieldState,
    duration: Math.min(300, fieldState.duration * 0.5),
    beatHz: fieldState.beatHz ? fieldState.beatHz * 1.1 : 10
  };
  
  protocols.push({
    key: `quick-${quickState.baseHz}`,
    type: 'frequency',
    eyebrow: `QUICK · ${quickState.baseHz} HZ · ${Math.round(quickState.duration / 60)} MIN`,
    title: 'Quick Attunement',
    subtitle: 'Same frequency, shorter duration',
    chakra: targetChakra,
    frequency: quickState.baseHz,
    beatHz: quickState.beatHz || undefined,
    durationS: quickState.duration,
    color,
    fieldState: quickState
  });
  
  // Breathing protocol synced to the binaural beat
  if (fieldState.beatHz) {
    const breathRate = Math.max(4, Math.min(8, 60 / fieldState.beatHz)); // Breaths per minute
    protocols.push({
      key: 'breath-synced',
      type: 'breath',
      eyebrow: `BREATH · ${breathRate.toFixed(1)} BPM · 5 MIN`,
      title: 'Frequency-Synced Breathing',
      subtitle: `Breathe at ${breathRate.toFixed(1)} breaths/minute to match ${fieldState.beatHz} Hz`,
      chakra: targetChakra,
      durationS: 300,
      color
    });
  }
  
  return protocols;
}

/**
 * Get human-readable brainwave description
 */
function getBrainwaveDescription(beatHz: number): string {
  if (beatHz <= 4) return 'deep delta relaxation';
  if (beatHz <= 8) return 'theta meditation';
  if (beatHz <= 13) return 'alpha relaxation';
  if (beatHz <= 30) return 'beta alertness';
  return 'gamma clarity';
}

/**
 * Build contextual citations from field data
 */
function buildFieldCitations(states: ChakraState[], entries: JournalEntry[], now: number): string[] {
  const cites: string[] = [];
  const weakest = [...states].sort((a, b) => a.energy - b.energy)[0];
  const strongest = [...states].sort((a, b) => b.energy - a.energy)[0];
  
  // Energy level observations
  if (weakest.energy < 40) {
    cites.push(`Your ${CHAKRA_BY_KEY[weakest.key].name} is running low at ${weakest.energy}/100.`);
  } else if (strongest.energy > 80) {
    cites.push(`Your ${CHAKRA_BY_KEY[strongest.key].name} is vibrant at ${strongest.energy}/100.`);
  }
  
  // Trend observations
  if (weakest.trend7d < -10) {
    cites.push(`${CHAKRA_BY_KEY[weakest.key].name} energy has dropped ${Math.abs(weakest.trend7d)}% this week.`);
  }
  
  // Recent journal themes
  const recentThemes = extractRecentThemes(entries, now);
  if (recentThemes.length > 0) {
    cites.push(`Your recent reflections mention ${recentThemes.slice(0, 2).join(' and ')}.`);
  }
  
  return cites.slice(0, 2); // Max 2 citations to keep response concise
}

/**
 * Extract mood score from recent journal entries
 */
function extractMoodFromEntries(entries: JournalEntry[], now: number): number {
  const recent = entries.filter(e => now - e.createdAt < 2 * DAY_MS); // Last 2 days
  if (recent.length === 0) return 0;
  
  let moodSum = 0;
  let count = 0;
  
  recent.forEach(entry => {
    entry.themes.forEach(theme => {
      const moodWeight = THEME_MOOD_WEIGHTS[theme];
      if (moodWeight !== undefined) {
        moodSum += moodWeight;
        count++;
      }
    });
  });
  
  return count > 0 ? moodSum / count : 0;
}

/**
 * Calculate current stress level from field state
 */
function calculateStressLevel(states: ChakraState[], entries: JournalEntry[], now: number): number {
  // Base stress from energy depletion
  const avgEnergy = states.reduce((sum, s) => sum + s.energy, 0) / states.length;
  let stress = 100 - avgEnergy;
  
  // Increase stress if multiple chakras are low
  const lowChakras = states.filter(s => s.energy < 40).length;
  stress += lowChakras * 10;
  
  // Recent stress themes
  const recent = entries.filter(e => now - e.createdAt < DAY_MS);
  const stressThemes = recent.flatMap(e => e.themes).filter(t => STRESS_THEMES.includes(t));
  stress += stressThemes.length * 5;
  
  return Math.min(100, Math.max(0, stress));
}

/**
 * Extract dominant themes from recent entries
 */
function extractRecentThemes(entries: JournalEntry[], now: number): string[] {
  const recent = entries.filter(e => now - e.createdAt < 3 * DAY_MS); // Last 3 days
  const themeCounts = new Map<string, number>();
  
  recent.forEach(entry => {
    entry.themes.forEach(theme => {
      themeCounts.set(theme, (themeCounts.get(theme) || 0) + 1);
    });
  });
  
  return [...themeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([theme]) => theme);
}

// Mood weights for different themes (-5 to +5)
const THEME_MOOD_WEIGHTS: Record<string, number> = {
  exhaustion: -3,
  doubt: -2,
  overwhelm: -4,
  grief: -3,
  silence: -1,
  flatness: -2,
  unsafe: -3,
  insight: 3,
  meaning: 4,
  expression: 2,
  release: 3,
  will: 2,
  flow: 3,
  ground: 2,
  reflection: 1
};

// Themes that indicate stress
const STRESS_THEMES = ['exhaustion', 'overwhelm', 'doubt', 'unsafe', 'grief', 'flatness'];