import { CORS, json } from '../_shared/providers.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405);

  try {
    const body = await req.json();
    const storagePath = body.storagePath as string | undefined;
    const journalEntryId = body.journalEntryId as string | undefined;
    const voiceNoteId = body.voiceNoteId as string | undefined;

    if (!storagePath) return json({ ok: false, error: 'storagePath required' }, 400);

    const openaiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiKey) return json({ ok: false, error: 'Whisper unavailable' }, 503);

    const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!url || !serviceKey) return json({ ok: false, error: 'Supabase admin unavailable' }, 503);

    const admin = createClient(url, serviceKey);
    const { data: file, error: dlErr } = await admin.storage.from('voice-notes').download(storagePath);
    if (dlErr || !file) return json({ ok: false, error: dlErr?.message ?? 'Download failed' }, 400);

    const form = new FormData();
    form.append('file', file, storagePath.split('/').pop() ?? 'audio.m4a');
    form.append('model', 'whisper-1');
    form.append('response_format', 'json');

    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${openaiKey}` },
      body: form,
    });
    if (!whisperRes.ok) {
      return json({ ok: false, error: 'Transcription failed' }, 502);
    }
    const whisperJson = await whisperRes.json();
    const transcript = typeof whisperJson.text === 'string' ? whisperJson.text : '';

    // Lightweight theme extraction via chat (optional)
    let summary = '';
    let emotionalThemes: string[] = [];
    let actionItems: string[] = [];
    let goals: string[] = [];

    if (transcript) {
      const chatRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openaiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: Deno.env.get('OPENAI_CHAT_MODEL') ?? 'gpt-4o-mini',
          max_tokens: 400,
          messages: [
            {
              role: 'system',
              content:
                'Extract a short reflective summary, emotional themes, goals, and action items from a voice journal. Return JSON only: {summary, emotionalThemes[], goals[], actionItems[]}. Never diagnose.',
            },
            { role: 'user', content: transcript },
          ],
          response_format: { type: 'json_object' },
        }),
      });
      if (chatRes.ok) {
        const cj = await chatRes.json();
        try {
          const parsed = JSON.parse(cj.choices?.[0]?.message?.content ?? '{}');
          summary = parsed.summary ?? '';
          emotionalThemes = parsed.emotionalThemes ?? [];
          goals = parsed.goals ?? [];
          actionItems = parsed.actionItems ?? [];
        } catch {
          /* ignore */
        }
      }
    }

    if (journalEntryId) {
      await admin
        .from('journal_entries')
        .update({
          transcript,
          body: transcript || undefined,
          emotional_themes: emotionalThemes,
          action_items: actionItems,
        })
        .eq('id', journalEntryId);
    }

    if (voiceNoteId) {
      await admin
        .from('voice_notes')
        .update({
          transcript,
          summary,
          emotional_themes: emotionalThemes,
          goals,
          action_items: actionItems,
        })
        .eq('id', voiceNoteId);
    } else if (body.userId) {
      await admin.from('voice_notes').insert({
        user_id: body.userId,
        journal_entry_id: journalEntryId ?? null,
        storage_path: storagePath,
        transcript,
        summary,
        emotional_themes: emotionalThemes,
        goals,
        action_items: actionItems,
      });
    }

    return json({
      ok: true,
      transcript,
      summary,
      emotionalThemes,
      goals,
      actionItems,
    });
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : 'Unknown error' }, 500);
  }
});
