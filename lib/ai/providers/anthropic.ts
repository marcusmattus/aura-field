import type { AIProvider, ChatRequest } from '@/lib/ai/types';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

export function createAnthropicProvider(
  apiKey: string,
  model = 'claude-sonnet-4-5',
): AIProvider {
  return {
    id: 'anthropic',
    async chat(req: ChatRequest): Promise<string | null> {
      try {
        const system = req.messages
          .filter((m) => m.role === 'system')
          .map((m) => m.content)
          .join('\n\n');
        const messages = req.messages
          .filter((m) => m.role !== 'system')
          .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));

        const res = await fetch(ANTHROPIC_URL, {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model,
            max_tokens: req.maxTokens ?? 800,
            system: system || undefined,
            messages,
          }),
        });
        if (!res.ok) return null;
        const data = (await res.json()) as { content?: { type: string; text?: string }[] };
        const text = data.content?.find((c) => c.type === 'text')?.text;
        return typeof text === 'string' ? text : null;
      } catch {
        return null;
      }
    },
  };
}
