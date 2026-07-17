# chakraOS — Supabase Edge Functions

Provider-agnostic agents. Mobile client calls via `lib/db/invokeFunction` or `supabase.functions.invoke`.

## Functions

| Name | Purpose |
|------|---------|
| `ai-chat` | Streaming SSE coach (`stream: true`) or JSON `{ ok, content }` |
| `ai-embed` | OpenAI embeddings; optional `match` via `match_memory_items`; optional persist |
| `transcribe-voice` | Whisper + theme summary; updates journal/voice_notes |
| `reflect` | Reflection JSON → `reflection_summaries` + `memory_items` + `chakra_scores` |
| `journal-analyze` | Legacy journal tagger (Anthropic JSON) |
| `coach-respond` | Legacy coach JSON (Anthropic) |

## Design contract

- Prefer `{ ok: boolean, ... }`. On failure the client falls back to on-device agents.
- Every system prompt includes non-diagnostic / crisis guardrails (`_shared/agent.ts`).
- Provider selected by request `provider` or `AI_PROVIDER` env (`anthropic` | `openai`).

## Deploy

```sh
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set AI_PROVIDER=anthropic

supabase functions deploy ai-chat ai-embed transcribe-voice reflect journal-analyze coach-respond
```

Until keys are set, the app still runs with deterministic agents in `lib/agents/*`.
