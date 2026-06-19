# chakraOS — Supabase Edge Functions (the five agents)

Each agent is a Deno Edge Function that wraps the Anthropic API
(`claude-sonnet-4-6`) with a strict JSON contract. The mobile client
(`lib/agents/remote.ts`) calls them through `supabase.functions.invoke`.

## Design contract

- **JSON in / JSON out**, validated.
- Every function returns `{ ok: boolean, ... }`. When `ok` is `false`
  (no API key, parse failure, refusal), the client silently uses its
  on-device deterministic core. The UI never stalls or blanks.
- The journal is sacred data: `coach-respond` receives only aggregate
  field state + theme summaries, never raw entry bodies in bulk.
- Every system prompt forbids diagnosis/treatment and enforces an
  observational, non-clinical voice with an explicit crisis hand-off.

## Deploy

1. Set the Anthropic key as a function secret:
   ```sh
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   ```
2. Deploy:
   ```sh
   supabase functions deploy journal-analyze coach-respond
   ```

Until a key is set the app runs entirely on the deterministic agents in
`lib/agents/*` — the journal→field loop closes with no backend at all.
