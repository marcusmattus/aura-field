// Shared helpers for chakraOS agent Edge Functions.
// Deno runtime (Supabase Edge Functions).

export const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

/** Guardrail preamble injected into every agent system prompt. */
export const GUARDRAILS = `chakraOS is a REFLECTIVE self-noticing tool. It is NOT medical care, NOT therapy, NOT diagnosis.
- Never diagnose, treat, or claim chakras/frequencies cure anything.
- Speak observationally and gently — describe what is noticed, never prescribe a cure.
- If the user expresses serious distress, self-harm, or crisis, STOP coaching. Respond only with warmth and a hand-off to real human support (e.g. in the US, call or text 988). Set crisis=true.
- Frame bija/solfeggio/"harmonics" as ritual and framing, not scientific fact.`;

const MODEL = 'claude-sonnet-4-5';

/**
 * Call Anthropic Messages API and return the text content, or null on any
 * failure (missing key, network, refusal). Callers must have a fallback.
 */
export async function callClaude(
  system: string,
  userContent: string,
  maxTokens = 700,
): Promise<string | null> {
  const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
  if (!apiKey) return null;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: userContent }],
      }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.content?.[0]?.text;
    return typeof text === 'string' ? text : null;
  } catch {
    return null;
  }
}

/** Extract the first JSON object from a model response. */
export function parseJsonBlock<T>(text: string): T | null {
  try {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1) return null;
    return JSON.parse(text.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}
