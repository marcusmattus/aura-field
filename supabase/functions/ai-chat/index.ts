import {
  CORS,
  GUARDRAILS,
  chatComplete,
  chatStream,
  json,
  resolveProvider,
  sseResponse,
  type Msg,
} from '../_shared/providers.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405);

  try {
    const body = await req.json();
    const messages = (body.messages ?? []) as Msg[];
    const mode = typeof body.mode === 'string' ? body.mode : 'general';
    const memories = Array.isArray(body.memories) ? (body.memories as string[]) : [];
    const fieldSummary = typeof body.fieldSummary === 'string' ? body.fieldSummary : '';
    const provider = resolveProvider(body.provider);
    const stream = Boolean(body.stream);
    const continueResponse = Boolean(body.continue);
    const regenerate = Boolean(body.regenerate);

    const system: Msg = {
      role: 'system',
      content: `${GUARDRAILS}

You are the ChakraOS coach. Mode: ${mode}.
${fieldSummary ? `Current field summary:\n${fieldSummary}` : ''}
${memories.length ? `Relevant memories:\n- ${memories.join('\n- ')}` : ''}
${regenerate ? 'Regenerate a fresh alternative reply to the last user message.' : ''}
${continueResponse ? 'Continue your previous reply without restarting.' : ''}
Respond with warmth and curiosity. Prefer questions before advice.
If suggesting practices, keep them optional and non-clinical.`,
    };

    const fullMessages = [system, ...messages.filter((m) => m.role !== 'system')];

    if (stream) {
      const readable = await chatStream(provider, fullMessages, body.maxTokens ?? 900);
      if (!readable) {
        // Fallback non-stream
        const text = await chatComplete(provider, fullMessages, body.maxTokens ?? 900);
        if (!text) return json({ ok: false, error: 'Provider unavailable' }, 503);
        const encoder = new TextEncoder();
        const fake = new ReadableStream({
          start(controller) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: text })}\n\n`));
            controller.enqueue(encoder.encode('data: [DONE]\n\n'));
            controller.close();
          },
        });
        return sseResponse(fake);
      }
      return sseResponse(readable);
    }

    const text = await chatComplete(provider, fullMessages, body.maxTokens ?? 900);
    if (!text) return json({ ok: false, error: 'Provider unavailable' }, 503);
    return json({ ok: true, content: text, provider });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});
