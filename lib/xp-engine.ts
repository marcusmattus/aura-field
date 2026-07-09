/**
 * DYNAMIC XP ENGINE — Procedural Experience Point System
 *
 * Generates XP based on real-time metrics instead of static rewards:
 * - Consistency: Daily practice streaks and habit formation
 * - Completion: Session duration vs intended duration
 * - Breathing: Heart rate variability and coherence patterns
 * - Heart Coherence: Real-time HRV measurements during sessions
 * - Mood Improvement: Journal sentiment analysis before/after
 * - Field Growth: Chakra energy improvements over time
 *
 * PRINCIPLE: XP should never be static. It emerges from actual
 * physiological and psychological improvements.
 */

import type { ChakraState, JournalEntry, CompletedSession, FieldState } from '@/lib/types';

const DAY_MS = 86_400_000;
const WEEK_MS = 7 * DAY_MS;

// ─────────────────────────────────────────────────────────────────────────
// XP Engine Types
// ─────────────────────────────────────────────────────────────────────────

export interface XPBreakdown {
  /** Base XP from session completion */
  base: number;
  
  /** Bonus from consistency streaks */
  consistency: number;
  
  /** Bonus from session completion percentage */
  completion: number;
  
  /** Bonus from breathing coherence during session */
  breathing: number;
  
  /** Bonus from heart rate variability */
  heartCoherence: number;
  
  /** Bonus from mood improvement (pre/post session) */
  moodImprovement: number;
  
  /** Bonus from chakra field improvements */
  fieldGrowth: number;
  
  /** Total XP awarded */
  total: number;
  
  /** Multiplier applied based on various factors */
  multiplier: number;
}

export interface SessionMetrics {
  /** Intended session duration in seconds */
  intendedDuration: number;
  
  /** Actual session duration in seconds */
  actualDuration: number;
  
  /** Average breathing coherence (0-100) during session */
  breathingCoherence?: number;
  
  /** Average heart rate variability coherence (0-100) */
  hrv?: number;
  
  /** Pre-session mood (-5 to +5) */
  preMood?: number;
  
  /** Post-session mood (-5 to +5) */
  postMood?: number;
  
  /** Chakra states before session */
  preStates: ChakraState[];
  
  /** Chakra states after session */
  postStates: ChakraState[];
  
  /** Session field state */
  fieldState: FieldState;
}

export interface XPLevel {
  level: number;
  currentXP: number;
  xpForNextLevel: number;
  xpToNext: number;
  progression: number; // 0-1
  title: string;
  description: string;
}

// ─────────────────────────────────────────────────────────────────────────
// XP Calculation Functions
// ─────────────────────────────────────────────────────────────────────────

/**
 * Calculate XP for a completed session with full metrics
 */
export function calculateSessionXP(
  metrics: SessionMetrics,
  streakDays: number,
  recentSessions: CompletedSession[]
): XPBreakdown {
  // Base XP from session duration (1 XP per minute)
  const baseMinutes = Math.min(60, metrics.actualDuration / 60);
  const base = Math.round(baseMinutes);
  
  // Consistency bonus (streak multiplier)
  const consistency = calculateConsistencyBonus(streakDays, recentSessions);
  
  // Completion bonus (how much of intended duration was completed)
  const completion = calculateCompletionBonus(metrics.intendedDuration, metrics.actualDuration);
  
  // Breathing coherence bonus
  const breathing = calculateBreathingBonus(metrics.breathingCoherence);
  
  // Heart coherence bonus
  const heartCoherence = calculateHeartCoherenceBonus(metrics.hrv);
  
  // Mood improvement bonus
  const moodImprovement = calculateMoodImprovementBonus(metrics.preMood, metrics.postMood);
  
  // Field growth bonus (chakra energy improvements)
  const fieldGrowth = calculateFieldGrowthBonus(metrics.preStates, metrics.postStates);
  
  // Calculate multiplier based on session quality
  const multiplier = calculateSessionMultiplier(metrics);
  
  // Total XP with multiplier
  const rawTotal = base + consistency + completion + breathing + heartCoherence + moodImprovement + fieldGrowth;
  const total = Math.round(rawTotal * multiplier);
  
  return {
    base,
    consistency,
    completion,
    breathing,
    heartCoherence,
    moodImprovement,
    fieldGrowth,
    total,
    multiplier
  };
}

/**
 * Calculate consistency bonus from streak and recent practice patterns
 */
function calculateConsistencyBonus(streakDays: number, recentSessions: CompletedSession[]): number {
  let bonus = 0;
  
  // Streak bonus (exponential growth up to 30 days)
  const streakBonus = Math.min(30, streakDays * 0.5);
  bonus += streakBonus;
  
  // Weekly consistency bonus (sessions per week)
  const weeklySessionCount = recentSessions.filter(
    s => Date.now() - s.completedAt < WEEK_MS
  ).length;
  
  if (weeklySessionCount >= 7) bonus += 10; // Daily practice
  else if (weeklySessionCount >= 5) bonus += 7; // Almost daily
  else if (weeklySessionCount >= 3) bonus += 5; // Regular practice
  
  // Time of day consistency (same time each day)
  const sessionTimes = recentSessions
    .filter(s => Date.now() - s.completedAt < WEEK_MS)
    .map(s => new Date(s.completedAt).getHours());
  
  if (sessionTimes.length >= 3) {
    const timeVariance = calculateVariance(sessionTimes);
    if (timeVariance < 2) bonus += 5; // Very consistent timing
    else if (timeVariance < 4) bonus += 3; // Somewhat consistent
  }
  
  return Math.round(bonus);
}

/**
 * Calculate completion bonus based on session duration
 */
function calculateCompletionBonus(intended: number, actual: number): number {
  if (intended === 0) return 0;
  
  const completionRatio = Math.min(1, actual / intended);
  
  if (completionRatio >= 1.0) return 15; // Completed full session
  if (completionRatio >= 0.9) return 12; // 90% completion
  if (completionRatio >= 0.8) return 10; // 80% completion
  if (completionRatio >= 0.7) return 7;  // 70% completion
  if (completionRatio >= 0.5) return 5;  // 50% completion
  
  return Math.round(completionRatio * 5); // Partial credit
}

/**
 * Calculate breathing coherence bonus
 */
function calculateBreathingBonus(coherence?: number): number {
  if (!coherence) return 0;
  
  if (coherence >= 90) return 20; // Exceptional coherence
  if (coherence >= 80) return 15; // High coherence
  if (coherence >= 70) return 12; // Good coherence
  if (coherence >= 60) return 8;  // Moderate coherence
  if (coherence >= 50) return 5;  // Basic coherence
  
  return Math.round(coherence * 0.1); // Partial credit
}

/**
 * Calculate heart rate variability coherence bonus
 */
function calculateHeartCoherenceBonus(hrv?: number): number {
  if (!hrv) return 0;
  
  if (hrv >= 85) return 25; // Exceptional HRV
  if (hrv >= 75) return 20; // High HRV
  if (hrv >= 65) return 15; // Good HRV
  if (hrv >= 55) return 10; // Moderate HRV
  if (hrv >= 45) return 5;  // Basic HRV
  
  return Math.round(hrv * 0.15); // Partial credit
}

/**
 * Calculate mood improvement bonus
 */
function calculateMoodImprovementBonus(preMood?: number, postMood?: number): number {
  if (preMood === undefined || postMood === undefined) return 0;
  
  const improvement = postMood - preMood;
  
  if (improvement >= 3) return 20; // Major improvement
  if (improvement >= 2) return 15; // Significant improvement
  if (improvement >= 1) return 10; // Moderate improvement
  if (improvement >= 0.5) return 5; // Slight improvement
  
  // No penalty for mood staying same or getting slightly worse
  // (sometimes processing emotions can temporarily decrease mood)
  return 0;
}

/**
 * Calculate field growth bonus from chakra energy changes
 */
function calculateFieldGrowthBonus(preStates: ChakraState[], postStates: ChakraState[]): number {
  let totalImprovement = 0;
  let improvementCount = 0;
  
  preStates.forEach(preState => {
    const postState = postStates.find(s => s.key === preState.key);
    if (postState) {
      const improvement = postState.energy - preState.energy;
      if (improvement > 0) {
        totalImprovement += improvement;
        improvementCount++;
      }
    }
  });
  
  if (improvementCount === 0) return 0;
  
  // Bonus based on average improvement and number of chakras improved
  const avgImprovement = totalImprovement / improvementCount;
  const baseBonus = avgImprovement * 0.3; // 0.3 XP per energy point improvement
  const diversityBonus = improvementCount * 2; // Bonus for improving multiple chakras
  
  return Math.round(baseBonus + diversityBonus);
}

/**
 * Calculate session quality multiplier
 */
function calculateSessionMultiplier(metrics: SessionMetrics): number {
  let multiplier = 1.0;
  
  // Session length multiplier (longer sessions get slight bonus)
  const minutes = metrics.actualDuration / 60;
  if (minutes >= 20) multiplier += 0.2;
  else if (minutes >= 15) multiplier += 0.15;
  else if (minutes >= 10) multiplier += 0.1;
  
  // Deep frequency multiplier (lower frequencies get bonus for difficulty)
  if (metrics.fieldState.baseHz <= 200) multiplier += 0.15; // Deep earth frequencies
  else if (metrics.fieldState.baseHz <= 400) multiplier += 0.1; // Root frequencies
  
  // Binaural beat difficulty multiplier
  if (metrics.fieldState.beatHz) {
    if (metrics.fieldState.beatHz <= 4) multiplier += 0.1; // Delta (hardest to achieve)
    else if (metrics.fieldState.beatHz <= 8) multiplier += 0.05; // Theta
  }
  
  // Overall coherence multiplier
  const avgCoherence = ((metrics.breathingCoherence || 0) + (metrics.hrv || 0)) / 2;
  if (avgCoherence >= 80) multiplier += 0.25;
  else if (avgCoherence >= 60) multiplier += 0.15;
  else if (avgCoherence >= 40) multiplier += 0.1;
  
  return Math.min(2.0, multiplier); // Cap at 2x multiplier
}

// ─────────────────────────────────────────────────────────────────────────
// XP Level System
// ─────────────────────────────────────────────────────────────────────────

/**
 * Calculate level progression from total XP
 */
export function calculateXPLevel(totalXP: number): XPLevel {
  const level = Math.floor(Math.pow(totalXP / 100, 0.55)) + 1; // Curved progression
  const xpForCurrentLevel = Math.pow(level - 1, 1.82) * 100;
  const xpForNextLevel = Math.pow(level, 1.82) * 100;
  const xpToNext = xpForNextLevel - totalXP;
  const progression = Math.max(0, Math.min(1, (totalXP - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel)));
  
  const { title, description } = getLevelInfo(level);
  
  return {
    level,
    currentXP: totalXP,
    xpForNextLevel: Math.round(xpForNextLevel),
    xpToNext: Math.round(xpToNext),
    progression,
    title,
    description
  };
}

/**
 * Get level title and description based on level number
 */
function getLevelInfo(level: number): { title: string; description: string } {
  if (level >= 50) return { title: 'Frequency Master', description: 'One with the cosmic frequencies' };
  if (level >= 40) return { title: 'Resonance Keeper', description: 'Maintains harmony across all dimensions' };
  if (level >= 35) return { title: 'Field Weaver', description: 'Shapes reality through frequency mastery' };
  if (level >= 30) return { title: 'Chakra Sage', description: 'Deep wisdom of the energy centers' };
  if (level >= 25) return { title: 'Coherence Guardian', description: 'Protector of heart rhythm harmony' };
  if (level >= 20) return { title: 'Frequency Adept', description: 'Advanced practitioner of sound healing' };
  if (level >= 15) return { title: 'Vibration Walker', description: 'Moves skillfully between frequencies' };
  if (level >= 12) return { title: 'Field Tender', description: 'Nurtures the growth of energy centers' };
  if (level >= 10) return { title: 'Breath Keeper', description: 'Master of coherent breathing patterns' };
  if (level >= 8) return { title: 'Sound Traveler', description: 'Explorer of healing frequencies' };
  if (level >= 6) return { title: 'Harmony Seeker', description: 'Dedicated to finding inner balance' };
  if (level >= 4) return { title: 'Frequency Student', description: 'Learning the ways of sound healing' };
  if (level >= 2) return { title: 'Resonance Novice', description: 'Beginning to understand vibration' };
  return { title: 'Field Explorer', description: 'Taking first steps on the frequency path' };
}

// ─────────────────────────────────────────────────────────────────────────
// Achievement System
// ─────────────────────────────────────────────────────────────────────────

export interface Achievement {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  unlocked: boolean;
  unlockedAt?: number;
  progress: number; // 0-1
  requirement: string;
}

/**
 * Check for new achievements based on session data and history
 */
export function checkAchievements(
  sessions: CompletedSession[],
  entries: JournalEntry[],
  streakDays: number,
  totalXP: number
): Achievement[] {
  const achievements: Achievement[] = [];
  
  // Streak achievements
  achievements.push({
    id: 'streak-7',
    title: 'Week Warrior',
    description: '7 days of consistent practice',
    xpReward: 100,
    unlocked: streakDays >= 7,
    unlockedAt: streakDays >= 7 ? Date.now() : undefined,
    progress: Math.min(1, streakDays / 7),
    requirement: `${Math.min(streakDays, 7)}/7 days`
  });
  
  achievements.push({
    id: 'streak-30',
    title: 'Monthly Master',
    description: '30 days of unwavering dedication',
    xpReward: 500,
    unlocked: streakDays >= 30,
    unlockedAt: streakDays >= 30 ? Date.now() : undefined,
    progress: Math.min(1, streakDays / 30),
    requirement: `${Math.min(streakDays, 30)}/30 days`
  });
  
  // Session count achievements
  const sessionCount = sessions.length;
  achievements.push({
    id: 'sessions-100',
    title: 'Century Seeker',
    description: '100 frequency sessions completed',
    xpReward: 250,
    unlocked: sessionCount >= 100,
    unlockedAt: sessionCount >= 100 ? Date.now() : undefined,
    progress: Math.min(1, sessionCount / 100),
    requirement: `${Math.min(sessionCount, 100)}/100 sessions`
  });
  
  // Deep session achievements
  const longSessions = sessions.filter(s => s.durationS >= 1200); // 20+ minutes
  achievements.push({
    id: 'deep-10',
    title: 'Deep Diver',
    description: '10 sessions of 20+ minutes',
    xpReward: 200,
    unlocked: longSessions.length >= 10,
    unlockedAt: longSessions.length >= 10 ? Date.now() : undefined,
    progress: Math.min(1, longSessions.length / 10),
    requirement: `${Math.min(longSessions.length, 10)}/10 deep sessions`
  });
  
  // Frequency range achievements
  const uniqueFrequencies = new Set(sessions.map(s => Math.floor(s.hz / 50) * 50));
  achievements.push({
    id: 'spectrum-explorer',
    title: 'Spectrum Explorer',
    description: 'Experience 10 different frequency ranges',
    xpReward: 150,
    unlocked: uniqueFrequencies.size >= 10,
    unlockedAt: uniqueFrequencies.size >= 10 ? Date.now() : undefined,
    progress: Math.min(1, uniqueFrequencies.size / 10),
    requirement: `${Math.min(uniqueFrequencies.size, 10)}/10 ranges`
  });
  
  return achievements;
}

// ─────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────

function calculateVariance(values: number[]): number {
  if (values.length === 0) return 0;
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
  return squaredDiffs.reduce((sum, diff) => sum + diff, 0) / values.length;
}

/**
 * Calculate streak continuation bonus for maintaining practice
 */
export function calculateStreakBonus(currentStreak: number): number {
  if (currentStreak < 3) return 1.0;
  if (currentStreak < 7) return 1.1;
  if (currentStreak < 14) return 1.2;
  if (currentStreak < 30) return 1.3;
  if (currentStreak < 60) return 1.4;
  return 1.5; // Maximum 50% bonus for 60+ day streaks
}

/**
 * Export the main XP calculation function with real-world parameters
 */
export function awardSessionXP(
  sessionData: {
    intendedDuration: number;
    actualDuration: number;
    fieldState: FieldState;
    preStates: ChakraState[];
    postStates: ChakraState[];
    preMood?: number;
    postMood?: number;
    breathingCoherence?: number;
    hrv?: number;
  },
  streakDays: number,
  recentSessions: CompletedSession[]
): XPBreakdown {
  const metrics: SessionMetrics = {
    intendedDuration: sessionData.intendedDuration,
    actualDuration: sessionData.actualDuration,
    preStates: sessionData.preStates,
    postStates: sessionData.postStates,
    fieldState: sessionData.fieldState,
    preMood: sessionData.preMood,
    postMood: sessionData.postMood,
    breathingCoherence: sessionData.breathingCoherence,
    hrv: sessionData.hrv
  };
  
  return calculateSessionXP(metrics, streakDays, recentSessions);
}