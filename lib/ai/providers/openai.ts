import type { AIProvider, ChatRequest, EmbedRequest } from '@/lib/ai/types';

const OPENAI_CHAT = 'https://api.openai.com/v1/chat/completions';
const OPENAI_EMBED = 'https://api.openai.com/v1/embeddings';

export function createOpenAIProvider(apiKey: string, model = 'gpt-4o-mini'): AIProvider {
  return {
    id: 'openai',
    async chat(req: ChatRequest): Promise<string | null> {
      try {
        const res = await fetch(OPENAI_CHAT, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            messages: req.messages,
            max_tokens: req.maxTokens ?? 800,
            temperature: req.temperature ?? 0.7,
            stream: false,
          }),
        });
        if (!res.ok) return null;
        const data = (await res.json()) as {
          choices?: { message?: { content?: string } }[];
        };
        return data.choices?.[0]?.message?.content ?? null;
      } catch {
        return null;
      }
    },
    async embed(req: EmbedRequest): Promise<number[][] | null> {
      try {
        const input = Array.isArray(req.input) ? req.input : [req.input];
        const res = await fetch(OPENAI_EMBED, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'text-embedding-3-small',
            input,
          }),
        });
        if (!res.ok) return null;
        const data = (await res.json()) as { data?: { embedding: number[] }[] };
        return data.data?.map((d) => d.embedding) ?? null;
      } catch {
        return null;
      }
    },
  };
}
