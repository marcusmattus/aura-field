/**
 * The Virtues framework — a reflection framework conceptually distinct from
 * the chakra system (spec §41). Three tiers:
 *
 *  - theological: Faith, Hope, Charity — explicitly Christian in origin,
 *    only surfaced when Christian Reflection Mode is on (see §51-52).
 *  - cardinal: Prudence, Justice, Fortitude, Temperance — classical/secular,
 *    available whenever the Virtue framework is on.
 *  - capital: the eight virtues traditionally framed as countering the
 *    seven deadly sins (§44) — also secular-friendly, available whenever
 *    the Virtue framework is on. The *sin* name never appears in anything
 *    shown to the user; only the virtue (`counterpart` is informational
 *    metadata, not user-facing copy) — see VIRTUE_SAFE_LABELS below.
 *
 * Never used to rank, diagnose, or assign moral worth. See
 * lib/agents/virtue.ts for the deterministic engine built on this registry.
 */

import type { ChakraKey } from '@/lib/types';

export type VirtueCategory = 'theological' | 'cardinal' | 'capital';

export interface Virtue {
  key: string;
  name: string;
  category: VirtueCategory;
  description: string;
  /** the classical vice this virtue is traditionally framed as countering
   * (capital tier only) — internal metadata; never shown as a label for
   * the user ("you have envy") anywhere in the UI. */
  counterpart?: string;
  reflectionThemes: string[];
  journalPrompts: string[];
  practices: string[];
  scriptureReferences?: string[];
  enabled: boolean;
}

export const THEOLOGICAL_VIRTUES: Virtue[] = [
  {
    key: 'faith',
    name: 'Faith',
    category: 'theological',
    description: 'Trust, belief, commitment, and relationship with God.',
    reflectionThemes: ['trust', 'belief', 'commitment', 'surrender'],
    journalPrompts: [
      'What are you trusting with, even without full certainty?',
      'Where did you choose belief over doubt today?',
    ],
    practices: ['Name one thing you are choosing to trust today.'],
    scriptureReferences: ['Hebrews 11:1'],
    enabled: true,
  },
  {
    key: 'hope',
    name: 'Hope',
    category: 'theological',
    description: 'Perseverance, renewal, and expectation of good.',
    reflectionThemes: ['perseverance', 'renewal', 'expectation'],
    journalPrompts: [
      'What are you working toward that hasn’t arrived yet?',
      'Where did you choose to keep going today?',
    ],
    practices: ['Write one thing you are working toward.'],
    scriptureReferences: ['Romans 5:3-5'],
    enabled: true,
  },
  {
    key: 'charity',
    name: 'Charity',
    category: 'theological',
    description: 'Love, generosity, compassion, and care for others.',
    reflectionThemes: ['love', 'generosity', 'compassion'],
    journalPrompts: [
      'Who did you care for today, and how?',
      'What would generosity look like in your next interaction?',
    ],
    practices: ['Perform one deliberate act of generosity.'],
    scriptureReferences: ['1 Corinthians 13:4-7'],
    enabled: true,
  },
];

export const CARDINAL_VIRTUES: Virtue[] = [
  {
    key: 'prudence',
    name: 'Prudence',
    category: 'cardinal',
    description: 'Discernment, wisdom, and thoughtful decision-making.',
    reflectionThemes: ['discernment', 'wisdom', 'foresight'],
    journalPrompts: [
      'What decision are you weighing right now?',
      'What would thoughtful discernment look like today?',
    ],
    practices: ['Consider the consequences of one decision before acting on it.'],
    enabled: true,
  },
  {
    key: 'justice',
    name: 'Justice',
    category: 'cardinal',
    description: 'Fairness, responsibility, and integrity.',
    reflectionThemes: ['fairness', 'responsibility', 'integrity'],
    journalPrompts: [
      'Where did fairness matter today — to you or someone else?',
      'What responsibility have you been carrying?',
    ],
    practices: ['Consider one situation from another person’s perspective.'],
    enabled: true,
  },
  {
    key: 'fortitude',
    name: 'Fortitude',
    category: 'cardinal',
    description: 'Courage, resilience, and perseverance.',
    reflectionThemes: ['courage', 'resilience', 'perseverance'],
    journalPrompts: [
      'What difficulty are you facing right now?',
      'Where did courage show up today, even quietly?',
    ],
    practices: ['Name one difficulty you are willing to face.'],
    enabled: true,
  },
  {
    key: 'temperance',
    name: 'Temperance',
    category: 'cardinal',
    description: 'Moderation, balance, and self-control.',
    reflectionThemes: ['moderation', 'balance', 'restraint'],
    journalPrompts: [
      'Where did you find balance today — or lose it?',
      'What impulse asked for your attention today?',
    ],
    practices: ['Pause before one habitual impulse.'],
    enabled: true,
  },
];

export const CAPITAL_VIRTUES: Virtue[] = [
  {
    key: 'humility',
    name: 'Humility',
    category: 'capital',
    description: 'A grounded, accurate sense of self — without needing to be first.',
    counterpart: 'pride',
    reflectionThemes: ['humility', 'groundedness', 'listening'],
    journalPrompts: ['Where did you listen more than you spoke today?'],
    practices: ['Listen before responding.'],
    enabled: true,
  },
  {
    key: 'generosity',
    name: 'Charity',
    category: 'capital',
    description: 'Giving freely of time, attention, or resources.',
    counterpart: 'greed',
    reflectionThemes: ['generosity', 'giving', 'sharing'],
    journalPrompts: ['What did you give today — time, attention, or something material?'],
    practices: ['Perform one deliberate act of generosity.'],
    enabled: true,
  },
  {
    key: 'chastity',
    name: 'Chastity',
    category: 'capital',
    description: 'Respect and intentionality in desire and attention.',
    counterpart: 'lust',
    reflectionThemes: ['intentionality', 'respect', 'restraint'],
    journalPrompts: ['Where were you intentional with your attention today?'],
    practices: ['Notice one moment of impulse before acting on it.'],
    enabled: true,
  },
  {
    key: 'gratitude',
    name: 'Gratitude',
    category: 'capital',
    description: 'Noticing and naming what is already enough.',
    counterpart: 'envy',
    reflectionThemes: ['gratitude', 'contentment', 'noticing'],
    journalPrompts: ['What is one thing you have that you didn’t notice until now?'],
    practices: ['Name one thing you’re grateful for, specifically.'],
    enabled: true,
  },
  {
    key: 'kindness',
    name: 'Kindness',
    category: 'capital',
    description: 'Wishing others well, even when it costs something.',
    counterpart: 'envy',
    reflectionThemes: ['kindness', 'goodwill', 'generosity of spirit'],
    journalPrompts: ['Who could use a kind word from you today?'],
    practices: ['Offer one genuine compliment.'],
    enabled: true,
  },
  {
    key: 'moderation',
    name: 'Temperance',
    category: 'capital',
    description: 'Enough, not excess — in food, media, or stimulation.',
    counterpart: 'gluttony',
    reflectionThemes: ['moderation', 'enough', 'restraint'],
    journalPrompts: ['Where did "enough" show up today?'],
    practices: ['Pause before a second helping — of anything.'],
    enabled: true,
  },
  {
    key: 'patience',
    name: 'Patience',
    category: 'capital',
    description: 'Staying present through friction instead of forcing an exit.',
    counterpart: 'wrath',
    reflectionThemes: ['patience', 'composure', 'presence'],
    journalPrompts: ['Where did you wait, when waiting was hard?'],
    practices: ['Take one breath before responding.'],
    enabled: true,
  },
  {
    key: 'diligence',
    name: 'Diligence',
    category: 'capital',
    description: 'Showing up for the meaningful thing before the easy thing.',
    counterpart: 'sloth',
    reflectionThemes: ['diligence', 'follow-through', 'discipline'],
    journalPrompts: ['What meaningful task did you complete — or avoid — today?'],
    practices: ['Complete one meaningful task before checking your phone.'],
    enabled: true,
  },
];

export const VIRTUES: Virtue[] = [...THEOLOGICAL_VIRTUES, ...CARDINAL_VIRTUES, ...CAPITAL_VIRTUES];

export const VIRTUE_BY_KEY: Record<string, Virtue> = VIRTUES.reduce<Record<string, Virtue>>(
  (acc, v) => {
    acc[v.key] = v;
    return acc;
  },
  {},
);

/**
 * Virtues visible for the user's current framework settings. Cardinal and
 * capital tiers are secular-friendly and gated only by the Virtue framework
 * toggle; theological virtues are explicitly Christian in origin and only
 * appear when Christian Reflection Mode is also on (spec §51-52) — nobody
 * is defaulted into a religious framework.
 */
export function visibleVirtues(opts: { virtueFramework: boolean; christianMode: boolean }): Virtue[] {
  if (!opts.virtueFramework) return [];
  return VIRTUES.filter((v) => v.enabled && (v.category !== 'theological' || opts.christianMode));
}

/**
 * Optional, exploratory relationships between a virtue and a chakra node
 * (spec §53). Always surfaced with the "CHAKRAOS EXPLORATORY ASSOCIATION"
 * label — never presented as historical Christian doctrine, and only when
 * both the Virtue and Chakra frameworks (and cross-framework links) are on.
 */
export const CROSS_FRAMEWORK_ASSOCIATIONS: Partial<Record<string, ChakraKey>> = {
  charity: 'heart',
  generosity: 'heart',
  fortitude: 'solar',
  justice: 'throat',
  temperance: 'root',
  moderation: 'root',
  prudence: 'third',
  faith: 'crown',
  hope: 'crown',
};

export function virtuesByCategory(virtues: Virtue[]): Record<VirtueCategory, Virtue[]> {
  return {
    theological: virtues.filter((v) => v.category === 'theological'),
    cardinal: virtues.filter((v) => v.category === 'cardinal'),
    capital: virtues.filter((v) => v.category === 'capital'),
  };
}
