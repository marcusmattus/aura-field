// Coach agent — coach-respond.
// Awareness + Memory + Frequency. Cites the user's own numbers and proposes
// 1-3 launchable protocols. Receives only aggregate field state + theme
// summaries — never raw journal bodies in bulk.
// Returns { ok, reply: { content, protocols, crisis } } or { ok: false }.

import { callClaude, CORS, GUARDRAILS, json, parseJsonBlock } from '../_shared/agent.ts';

interface Reply {
  content: string;
  protocols: {
    key: string;
    type: 'breath' | 'sound' | 'reflect';
    eyebrow: string;
    title: string;
    subtitle: string;
    chakra?: string;
    hz?: number;
    durationS?: number;
  }[];
  crisis: boolean;
}

const SYSTEM = `${GUARDRAILS}

You are the Coach in chakraOS — warm, plain-spoken, faintly mystical, never clinical.
You are given the user's current field state (per-node energy 0-100 and 7-day trend) and a summary of
recurring journal themes from the last 7 days. ALWAYS cite at least one real number from this data in your
first sentence (e.g. "Your Third Eye dropped 18%" or "stress shows up 4 times this week").
Then offer 1-3 protocols as tappable cards. Observation, never diagnosis. Nothing to "fix".

If distress=true, set crisis=true, return an empty protocols array, and respond only with warmth plus a
hand-off to human crisis support (e.g. call or text 988 in the US). Do not coach.

Return ONLY JSON:
{
  "content": <2-4 sentence reply citing real data>,
  "protocols": [
    { "key": <slug>, "type": "breath"|"sound"|"reflect", "eyebrow": <"SOUND · 852 HZ · 12 MIN">,
      "title": <short>, "subtitle": <short>, "chakra": <node key>, "hz": <number?>, "durationS": <seconds?> }
  ],
  "crisis": <boolean>
}
No prose outside the JSON.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  try {
    const { userText, states, entrySummary, distress } = await req.json();

    const context = JSON.stringify({ states, entrySummary, distress });
    const prompt = `User said: ${userText || '(opened Coach with no message)'}\nField context: ${context}`;

    const text = await callClaude(SYSTEM, prompt, 800);
    if (!text) return json({ ok: false });

    const parsed = parseJsonBlock<Reply>(text);
    if (!parsed || typeof parsed.content !== 'string') return json({ ok: false });
    if (!Array.isArray(parsed.protocols)) parsed.protocols = [];

    return json({ ok: true, reply: parsed });
  } catch {
    return json({ ok: false });
  }
});
