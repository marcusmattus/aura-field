import { createAnthropicProvider } from '@/lib/ai/providers/anthropic';
import { createOpenAIProvider } from '@/lib/ai/providers/openai';
import type { AIProvider, AIProviderId, ChatMessage, ChatRequest } from '@/lib/ai/types';

/**
 * Client-side AI service facade.
 * Real model calls run on Edge Functions (server-side keys).
 * This layer selects provider config and talks to those functions.
 */

export function resolveProviderId(raw?: string | null): AIProviderId {
  if (raw === 'openai') return 'openai';
  return 'anthropic';
}

/** Factory for edge/runtime use when keys are present (tests / Deno share patterns). */
export function createProvider(id: AIProviderId, apiKey: string): AIProvider {
  if (id === 'openai') return createOpenAIProvider(apiKey);
  return createAnthropicProvider(apiKey);
}

export interface StreamCallbacks {
  onDelta: (text: string) => void;
  onDone?: () => void;
  onError?: (error: string) => void;
}

/**
 * Stream a coach reply via the ai-chat edge function (SSE).
 * Falls back to non-streaming coach-respond if streaming fails.
 */
export async function streamCoachChat(
  invoke: (body: Record<string, unknown>) => Promise<Response | null>,
  payload: {
    messages: ChatMessage[];
    mode?: string;
    memories?: string[];
    fieldSummary?: string;
    regenerate?: boolean;
  },
  cb: StreamCallbacks,
): Promise<void> {
  const res = await invoke({ ...payload, stream: true });
  if (!res || !res.body) {
    cb.onError?.('No stream available');
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.split('\n');
      buffer = parts.pop() ?? '';
      for (const line of parts) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') {
          cb.onDone?.();
          return;
        }
        try {
          const parsed = JSON.parse(data) as { delta?: string; error?: string };
          if (parsed.error) {
            cb.onError?.(parsed.error);
            return;
          }
          if (parsed.delta) cb.onDelta(parsed.delta);
        } catch {
          /* ignore malformed chunk */
        }
      }
    }
    cb.onDone?.();
  } catch (e) {
    cb.onError?.(e instanceof Error ? e.message : 'Stream failed');
  }
}

export type { ChatMessage, ChatRequest, AIProvider, AIProviderId };
