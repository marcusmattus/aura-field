import {
  CORS,
  GUARDRAILS,
  chatComplete,
  embedTexts,
  json,
  parseJsonBlock,
  resolveProvider,
} from '../_shared/providers.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

interface ReflectBody {
  userId: string;
  provider?: string;
  sourceType?: string;
  sourceId?: string;
  content: string;
  fieldScores?: Record<string, number>;
  period?: 'interaction' | 'daily' | 'weekly' | 'monthly';
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405);

  try {
    const body = (await req.json()) as ReflectBody;
    if (!body.userId || !body.content) {
      return json({ ok: false, error: 'userId and content required' }, 400);
    }

    const provider = resolveProvider(body.provider);
    const period = body.period ?? 'interaction';

    const prompt = `${GUARDRAILS}

Produce a JSON reflection for a consciousness OS (not medical):
{
  "summary": string,
  "moodAnalysis": string,
  "themes": string[],
  "behaviourPatterns": string[],
  "alignmentInsights": { "chakraKey": string, "delta": number, "note": string }[],
  "suggestedActions": string[],
  "chakraAdjustments": { "chakraKey": string, "score": number }[]
}

Field scores (0-100): ${JSON.stringify(body.fieldScores ?? {})}
Period: ${period}
Content:
${body.content}`;

    const raw = await chatComplete(
      provider,
      [
        { role: 'system', content: 'Return JSON only. Observational, non-clinical.' },
        { role: 'user', content: prompt },
      ],
      900,
    );

    const parsed =
      (raw &&
        parseJsonBlock<{
          summary: string;
          moodAnalysis?: string;
          themes?: string[];
          behaviourPatterns?: string[];
          alignmentInsights?: { chakraKey: string; delta: number; note: string }[];
          suggestedActions?: string[];
          chakraAdjustments?: { chakraKey: string; score: number }[];
        }>(raw)) ||
      null;

    if (!parsed) {
      return json({
        ok: true,
        fallback: true,
        summary: body.content.slice(0, 280),
        themes: [],
        suggestedActions: [],
      });
    }

    const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    let reflectionId: string | null = null;
    let memoryId: string | null = null;

    if (url && serviceKey) {
      const admin = createClient(url, serviceKey);

      const { data: reflection } = await admin
        .from('reflection_summaries')
        .insert({
          user_id: body.userId,
          period,
          summary: parsed.summary,
          mood_analysis: parsed.moodAnalysis ?? null,
          themes: parsed.themes ?? [],
          alignment_insights: parsed.alignmentInsights ?? {},
          suggested_actions: parsed.suggestedActions ?? [],
          source_refs: [{ type: body.sourceType, id: body.sourceId }],
        })
        .select('id')
        .single();
      reflectionId = reflection?.id ?? null;

      const embeddings = await embedTexts([parsed.summary]);
      if (embeddings?.[0]) {
        const { data: mem } = await admin
          .from('memory_items')
          .insert({
            user_id: body.userId,
            source_type: body.sourceType ?? 'reflection',
            source_id: body.sourceId ?? reflectionId,
            summary: parsed.summary,
            themes: parsed.themes ?? [],
            chakra_keys: (parsed.chakraAdjustments ?? []).map((c) => c.chakraKey),
            embedding: embeddings[0],
            metadata: { period, behaviourPatterns: parsed.behaviourPatterns ?? [] },
          })
          .select('id')
          .single();
        memoryId = mem?.id ?? null;
      }

      if (parsed.chakraAdjustments?.length) {
        await admin.from('chakra_scores').insert(
          parsed.chakraAdjustments.map((c) => ({
            user_id: body.userId,
            chakra_key: c.chakraKey,
            score: Math.min(100, Math.max(0, c.score)),
            source: 'reflect',
            note: period,
          })),
        );
      }
    }

    return json({
      ok: true,
      ...parsed,
      reflectionId,
      memoryId,
      provider,
    });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});
