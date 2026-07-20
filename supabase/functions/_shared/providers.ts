// Shared AI provider helpers for Deno Edge Functions.

import { CORS, GUARDRAILS, json, parseJsonBlock } from '../_shared/agent.ts';

export { CORS, GUARDRAILS, json, parseJsonBlock };

export type ProviderId = 'openai' | 'anthropic';

export function resolveProvider(pref?: string | null): ProviderId {
  const envDefault = Deno.env.get('AI_PROVIDER') ?? 'anthropic';
  if (pref === 'openai' || pref === 'anthropic') return pref;
  if (envDefault === 'openai') return 'openai';
  return 'anthropic';
}

export interface Msg {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function chatComplete(
  provider: ProviderId,
  messages: Msg[],
  maxTokens = 800,
): Promise<string | null> {
  if (provider === 'openai') {
    const key = Deno.env.get('OPENAI_API_KEY');
    if (!key) return null;
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: Deno.env.get('OPENAI_CHAT_MODEL') ?? 'gpt-4o-mini',
        messages,
        max_tokens: maxTokens,
        temperature: 0.7,
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? null;
  }

  const key = Deno.env.get('ANTHROPIC_API_KEY');
  if (!key) return null;
  const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
  const rest = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-sonnet-4-5',
      max_tokens: maxTokens,
      system: system || undefined,
      messages: rest,
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  const text = data?.content?.[0]?.text;
  return typeof text === 'string' ? text : null;
}

/** OpenAI SSE stream; Anthropic falls back to chunked fake stream of full reply. */
export async function chatStream(
  provider: ProviderId,
  messages: Msg[],
  maxTokens = 800,
): Promise<ReadableStream<Uint8Array> | null> {
  const encoder = new TextEncoder();

  if (provider === 'openai') {
    const key = Deno.env.get('OPENAI_API_KEY');
    if (!key) return null;
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: Deno.env.get('OPENAI_CHAT_MODEL') ?? 'gpt-4o-mini',
        messages,
        max_tokens: maxTokens,
        temperature: 0.7,
        stream: true,
      }),
    });
    if (!res.ok || !res.body) return null;

    return new ReadableStream({
      async start(controller) {
        const reader = res.body!.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const lines = buf.split('\n');
            buf = lines.pop() ?? '';
            for (const line of lines) {
              const t = line.trim();
              if (!t.startsWith('data:')) continue;
              const payload = t.slice(5).trim();
              if (payload === '[DONE]') {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                controller.close();
                return;
              }
              try {
                const parsed = JSON.parse(payload);
                const delta = parsed?.choices?.[0]?.delta?.content;
                if (typeof delta === 'string' && delta.length) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`),
                  );
                }
              } catch {
                /* skip */
              }
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (e) {
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({ error: e instanceof Error ? e.message : 'stream error' })}\n\n`,
            ),
          );
          controller.close();
        }
      },
    });
  }

  // Anthropic: complete then drip as SSE deltas for a consistent client protocol
  const text = await chatComplete(provider, messages, maxTokens);
  if (!text) return null;

  return new ReadableStream({
    async start(controller) {
      const chunkSize = 24;
      for (let i = 0; i < text.length; i += chunkSize) {
        const delta = text.slice(i, i + chunkSize);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
        await new Promise((r) => setTimeout(r, 12));
      }
      controller.enqueue(encoder.encode('data: [DONE]\n\n'));
      controller.close();
    },
  });
}

export async function embedTexts(inputs: string[]): Promise<number[][] | null> {
  const key = Deno.env.get('OPENAI_API_KEY');
  if (!key) return null;
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: Deno.env.get('OPENAI_EMBED_MODEL') ?? 'text-embedding-3-small',
      input: inputs,
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return (data?.data ?? []).map((d: { embedding: number[] }) => d.embedding);
}

export function sseResponse(stream: ReadableStream<Uint8Array>): Response {
  return new Response(stream, {
    headers: {
      ...CORS,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
