import { CORS, embedTexts, json } from '../_shared/providers.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405);

  try {
    const body = await req.json();
    const texts: string[] = Array.isArray(body.texts)
      ? body.texts
      : typeof body.text === 'string'
        ? [body.text]
        : [];
    if (!texts.length) return json({ ok: false, error: 'text(s) required' }, 400);

    const embeddings = await embedTexts(texts);
    if (!embeddings) return json({ ok: false, error: 'Embedding provider unavailable' }, 503);

    // Optional: persist memory item when summary + user provided
    const persist = Boolean(body.persist);
    let memoryId: string | null = null;

    if (persist && body.summary && body.userId) {
      const url = Deno.env.get('SUPABASE_URL');
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (url && serviceKey) {
        const admin = createClient(url, serviceKey);
        const { data, error } = await admin
          .from('memory_items')
          .insert({
            user_id: body.userId,
            source_type: body.sourceType ?? 'reflection',
            source_id: body.sourceId ?? null,
            summary: body.summary,
            themes: body.themes ?? [],
            chakra_keys: body.chakraKeys ?? [],
            embedding: embeddings[0],
            metadata: body.metadata ?? {},
          })
          .select('id')
          .single();
        if (!error) memoryId = data?.id ?? null;
      }
    }

    // Optional similarity search
    let matches: unknown[] = [];
    if (body.match && body.userId) {
      const url = Deno.env.get('SUPABASE_URL');
      const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
      if (url && serviceKey) {
        const admin = createClient(url, serviceKey);
        const { data } = await admin.rpc('match_memory_items', {
          query_embedding: embeddings[0],
          match_user_id: body.userId,
          match_count: body.matchCount ?? 8,
          match_threshold: body.matchThreshold ?? 0.65,
        });
        matches = data ?? [];
      }
    }

    return json({ ok: true, embeddings, memoryId, matches });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});
