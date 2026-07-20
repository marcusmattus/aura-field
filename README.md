# ChakraOS (Aura Field)

AI-powered consciousness OS for reflection, daily alignment, journaling, frequency sessions, and emotionally intelligent coaching.

## Stack

- **Mobile:** Expo SDK 54 · React Native · Expo Router · TypeScript · Uniwind · Skia · Reanimated · Zustand · React Query · MMKV
- **Backend:** Supabase (Auth, Postgres, Storage, Edge Functions, Realtime, RLS, pgvector)
- **AI:** Provider abstraction (Anthropic + OpenAI) via Edge Functions — never hardcode providers in the UI

## Cloud-first vertical slice

Auth → Daily check-in → Journal (voice + Whisper) → Streaming coach + memory → Frequency session → Chakra score update.

```
Auth ──► Check-in ──► Journal ──► Embed/Memory ──► Streaming Coach
                         │                              │
                         └──► Chakra scores ◄── Frequency session
```

## Environment

Create `.env` (or EAS secrets):

```bash
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key
```

Edge Function secrets:

```bash
supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
supabase secrets set OPENAI_API_KEY=sk-...
supabase secrets set AI_PROVIDER=anthropic   # or openai
```

## Database

```bash
supabase db push
# or
supabase migration up
```

Schema lives in [`supabase/migrations/20260717000001_chakraos_schema.sql`](supabase/migrations/20260717000001_chakraos_schema.sql):

profiles, user_preferences, daily_checkins, journal_entries, voice_notes, conversations, conversation_messages, memory_items (pgvector), chakra_scores, sound_library, frequency_sessions, meditation_sessions, reflection_summaries, analytics_events + RLS + voice-notes storage bucket.

## Edge Functions

```bash
supabase functions deploy journal-analyze coach-respond ai-chat ai-embed transcribe-voice reflect
```

| Function | Role |
|----------|------|
| `ai-chat` | Streaming / non-streaming coach (provider-agnostic) |
| `ai-embed` | Embeddings + optional pgvector match / memory persist |
| `transcribe-voice` | Whisper transcription + theme extraction |
| `reflect` | Reflection summary → memory + chakra score deltas |
| `journal-analyze` / `coach-respond` | Legacy deterministic-friendly agents (still used as fallbacks) |

## Auth

Supported:

- Email + password + OTP verification
- Passwordless OTP code
- Magic link (`aura-field://auth/callback`)
- Apple / Google OAuth via Supabase (enable providers in dashboard; configure redirect URLs)

Session tokens persist via **MMKV** when available, else AsyncStorage. Cold start calls `restoreSession()`.

### Native OAuth notes

- Enable Apple / Google in Supabase Auth settings
- Add redirect URL: `aura-field://auth/callback`
- iOS: Apple Sign In capability required for production Apple OAuth
- Google: configure iOS/Android client IDs in Supabase

## Frequency engine

[`lib/frequency/`](lib/frequency/) is the single source of truth:

- Registry of 9 nodes (Earth → Soul) with base + beat Hz
- `colorFromFrequency(hz, beatHz)` derives colour, gradient, glow, visualizer pulse — **no hardcoded session colours as authority**
- Oscillator tones via [`lib/tone.ts`](lib/tone.ts)

## Local development

```bash
npm install
npm run typecheck
npm run test
npm run lint
```

### Expo Go (quick device preview)

Open the JS bundle in the Expo Go app (SDK 54):

```bash
npm run start:go:tunnel
```

Scan the QR code with Expo Go (Camera on iOS, Expo Go on Android).  
MMKV falls back to AsyncStorage in Expo Go. Custom native modules that are not in Expo Go require a **development build** instead.

### Development build (recommended for full native)

```bash
# one-time: expo login / EXPO_TOKEN, then link the project
npx eas init
npm run eas:build:dev
```

Install the build from the Expo dashboard, then:

```bash
npx expo start --dev-client
```

## EAS build & store submission

Requires an Expo account (`npx eas login` or `EXPO_TOKEN`) and Apple/Google store credentials managed by EAS.

```bash
# Link project (writes EAS projectId into app config / env)
npx eas init

# Optional: set owner + project id for CI
# export EXPO_OWNER=your-expo-username
# export EAS_PROJECT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Internal preview APK/IPA (shareable install links)
npm run eas:build:preview

# Production binaries + auto-submit to stores
npm run eas:build:submit

# Or build, then submit the latest production artifacts
npm run eas:build:production
npm run eas:submit
```

Profiles live in [`eas.json`](eas.json): `development`, `preview`, `production` (+ `development-simulator`).  
Default bundle IDs are `com.aurafield.app` (override with `BILT_IOS_BUNDLE_ID` / `BILT_ANDROID_PACKAGE`).

## Privacy & safety

- RLS on every user table (`auth.uid() = user_id`)
- API keys only on Edge Functions
- Coach prompts forbid diagnosis / medical advice and include crisis hand-off (e.g. 988)
- Journals sync to the user’s private cloud row — not shared across users

## Tests & CI

- Vitest unit tests: frequency→colour, field index, provider factory, edge payload shapes
- GitHub Actions: `typecheck` + `test` + `lint` on push/PR
