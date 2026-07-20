/** Shared AI types — provider-agnostic. */

export type AIProviderId = 'openai' | 'anthropic';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  maxTokens?: number;
  temperature?: number;
  stream?: boolean;
}

export interface ChatChunk {
  type: 'delta' | 'done' | 'error';
  text?: string;
  error?: string;
}

export interface EmbedRequest {
  input: string | string[];
}

export interface AIProvider {
  id: AIProviderId;
  chat(req: ChatRequest): Promise<string | null>;
  embed?(req: EmbedRequest): Promise<number[][] | null>;
}

export const CONVERSATION_MODES = [
  'general',
  'morning_reflection',
  'evening_reflection',
  'body_alignment',
  'meditation',
  'breathwork',
  'stress',
  'purpose',
  'relationships',
  'career',
  'sleep',
  'creativity',
  'confidence',
  'emotional_processing',
  'shadow_work',
  'frequency_guidance',
  'goal_planning',
  'weekly_review',
  'monthly_review',
] as const;

export type ConversationMode = (typeof CONVERSATION_MODES)[number];

export const MODE_LABELS: Record<ConversationMode, string> = {
  general: 'General',
  morning_reflection: 'Morning Reflection',
  evening_reflection: 'Evening Reflection',
  body_alignment: 'Body Alignment',
  meditation: 'Meditation',
  breathwork: 'Breathwork',
  stress: 'Stress',
  purpose: 'Purpose',
  relationships: 'Relationships',
  career: 'Career',
  sleep: 'Sleep',
  creativity: 'Creativity',
  confidence: 'Confidence',
  emotional_processing: 'Emotional Processing',
  shadow_work: 'Shadow Work',
  frequency_guidance: 'Frequency Guidance',
  goal_planning: 'Goal Planning',
  weekly_review: 'Weekly Review',
  monthly_review: 'Monthly Review',
};

export function modeSystemPrompt(mode: ConversationMode): string {
  const base = `You are the ChakraOS reflection coach: calm, curious, emotionally intelligent, respectful, supportive, evidence-informed, and never judgmental or manipulative. Ask thoughtful questions before recommendations. Never diagnose illness or give medical advice. If crisis/self-harm appears, stop coaching and direct to human help (e.g. 988 in the US).`;
  const focus: Partial<Record<ConversationMode, string>> = {
    morning_reflection: 'Focus on intention-setting for the day, energy, and gentle orientation.',
    evening_reflection: 'Focus on wins, challenges, gratitude, and closing the day with care.',
    body_alignment: 'Focus on somatic awareness and energy-node patterns — observational only.',
    stress: 'Help the user notice stress patterns and choose grounding practices.',
    frequency_guidance: 'Suggest frequency/breath/journal practices tied to their field state.',
    weekly_review: 'Synthesize the week: themes, alignment trends, and next small steps.',
    monthly_review: 'Synthesize the month: growth, patterns, and intentional commitments.',
  };
  return `${base}\nMode: ${MODE_LABELS[mode]}. ${focus[mode] ?? 'Respond helpfully in conversation.'}`;
}
