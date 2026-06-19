// Awareness agent — journal-analyze.
// Tags an entry with chakra + theme, extracts surfaced signals, flags distress.
// Returns { ok, result } matching the client's AnalyzeResult shape.
// On any failure returns { ok: false } so the client uses its local core.

import { callClaude, CORS, GUARDRAILS, json, parseJsonBlock } from '../_shared/agent.ts';

const CHAKRA_KEYS = [
  'soul',
  'crown',
  'third',
  'throat',
  'heart',
  'solar',
  'sacral',
  'root',
  'earth',
];

interface AnalyzeResult {
  tags: { chakra: string; theme: string; weight: number }[];
  themes: string[];
  signals: { chakra: string; signal: 'low' | 'high' }[];
  lateNight: boolean;
  phrases: { phrase: string; chakra: string; signal: string }[];
  modality: 'text' | 'voice';
  distress: boolean;
}

const SYSTEM = `${GUARDRAILS}

You are the Awareness agent in chakraOS. Read one short journal entry and map it onto the nine-node field.
Return ONLY a JSON object with this exact shape:
{
  "tags": [{ "chakra": <one of ${CHAKRA_KEYS.join('|')}>, "theme": <short lowercase noun>, "weight": <0..1> }],
  "themes": [<short lowercase strings>],
  "signals": [{ "chakra": <key>, "signal": "low" | "high" }],
  "lateNight": <boolean>,
  "phrases": [{ "phrase": <short recurring phrase>, "chakra": <key>, "signal": <theme> }],
  "modality": "text" | "voice",
  "distress": <true only for self-harm / crisis signals>
}
Chakra meanings: third=focus/intuition, crown=meaning/overwhelm, throat=voice/truth, heart=love/grief,
solar=will/anxiety, sacral=creativity/flatness, root=safety/ground. Low signal = energy pulled down.
No prose, no markdown — JSON only.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const { body, modality } = await req.json();
    if (typeof body !== 'string' || !body.trim()) {
      return json({ ok: false });
    }

    const text = await callClaude(SYSTEM, `Entry (${modality ?? 'text'}): ${body}`, 600);
    if (!text) return json({ ok: false });

    const parsed = parseJsonBlock<AnalyzeResult>(text);
    if (!parsed || !Array.isArray(parsed.tags)) return json({ ok: false });

    // sanitize tags to valid chakra keys
    parsed.tags = parsed.tags.filter((t) => CHAKRA_KEYS.includes(t.chakra));
    parsed.modality = modality === 'voice' ? 'voice' : 'text';

    return json({ ok: true, result: parsed });
  } catch {
    return json({ ok: false });
  }
});
