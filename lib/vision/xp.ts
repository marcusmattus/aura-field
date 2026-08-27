/**
 * Mudra Vision XP rules. XP rewards showing up and completing a hold, never
 * the physical score achieved — see spec §20. Values live in one place so
 * they can be retuned (or, once `mudra_xp_rules` has rows, overridden from
 * Supabase — see lib/db/mudraVision.ts) without touching any screen.
 */

export type MudraXpRuleKey =
  | 'complete_session'
  | 'first_mudra'
  | 'streak_7day'
  | 'learn_5_mudras';

export interface MudraXpRule {
  key: MudraXpRuleKey;
  label: string;
  xp: number;
}

export const DEFAULT_MUDRA_XP_RULES: MudraXpRule[] = [
  { key: 'complete_session', label: 'Complete a practice', xp: 10 },
  { key: 'first_mudra', label: 'Complete your first mudra', xp: 25 },
  { key: 'streak_7day', label: '7-day practice streak', xp: 50 },
  { key: 'learn_5_mudras', label: 'Learn 5 mudras', xp: 50 },
];

export interface MudraXpContext {
  /** true if this is the very first mudra-vision session the user has ever completed */
  isFirstMudra: boolean;
  /** true if completing this session extends the practice streak to exactly 7 days */
  reachesSevenDayStreak: boolean;
  /** true if this session's mudra pushes the count of distinct mudras practiced to exactly 5 */
  reachesFiveMudrasLearned: boolean;
}

/** Total XP awarded for one completed mudra-vision session — completion
 * only, never a function of the form-match score. */
export function computeMudraXp(
  ctx: MudraXpContext,
  rules: MudraXpRule[] = DEFAULT_MUDRA_XP_RULES,
): { total: number; breakdown: MudraXpRule[] } {
  const byKey = Object.fromEntries(rules.map((r) => [r.key, r]));
  const breakdown: MudraXpRule[] = [];
  if (byKey.complete_session) breakdown.push(byKey.complete_session);
  if (ctx.isFirstMudra && byKey.first_mudra) breakdown.push(byKey.first_mudra);
  if (ctx.reachesSevenDayStreak && byKey.streak_7day) breakdown.push(byKey.streak_7day);
  if (ctx.reachesFiveMudrasLearned && byKey.learn_5_mudras) breakdown.push(byKey.learn_5_mudras);
  return { total: breakdown.reduce((s, r) => s + r.xp, 0), breakdown };
}
