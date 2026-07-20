# ChakraOS (Aura Field)

AI-powered consciousness OS for reflection, daily alignment, journaling, frequency sessions, and emotionally intelligent coaching.

## Stack

- **Mobile:** Expo SDK 54 · React Native · Expo Router · TypeScript · Uniwind · Skia · Reanimated · Zustand · React Query · MMKV
- **Backend (primary):** Firebase Authentication + Cloud Firestore
- **Auth providers:** Email/Password · Google Sign-In · Phone (SMS)
- **Optional AI:** Supabase Edge Functions (provider-agnostic OpenAI/Anthropic)

## Firebase setup

Uses official [Firebase agent skills](https://firebase.google.com/docs/ai-assistance/agent-skills) (`firebase-basics`, `firebase-auth-basics`, `firebase-firestore`).

### 1. CLI login & project

```bash
npx -y firebase-tools@latest login
npx -y firebase-tools@latest projects:list
npx -y firebase-tools@latest use <PROJECT_ID>   # resolve from project number 574846881607
```

### 2. Register web app & pull config

```bash
npx -y firebase-tools@latest apps:create web chakraos-web --project <PROJECT_ID>
npx -y firebase-tools@latest apps:sdkconfig WEB <APP_ID> --project <PROJECT_ID>
```

Copy values into `.env` (see [`.env.example`](.env.example)).

### 3. Enable Auth providers & deploy Firestore

```bash
# Email/Password + Google via CLI (see firebase.json auth block)
npx -y firebase-tools@latest deploy --only auth

# Phone Auth: enable in Console → Authentication → Sign-in method → Phone
# https://console.firebase.google.com/project/_/authentication/providers

# Firestore rules + indexes
npx -y firebase-tools@latest deploy --only firestore
```

### 4. App code

| File | Role |
|------|------|
| [`lib/firebase.ts`](lib/firebase.ts) | App / Auth / Firestore init |
| [`lib/firebaseAuth.ts`](lib/firebaseAuth.ts) | Email, Google, Phone helpers |
| [`lib/firestore.ts`](lib/firestore.ts) | Profiles, journals, check-ins |
| [`app/auth.tsx`](app/auth.tsx) | Sign-in UI |
| [`firestore.rules`](firestore.rules) | Owner-scoped security rules |

I've set up prototype Security Rules to keep the data in Firestore safe. They are designed to be secure for owner-only access (`request.auth.uid == userId`) with validated profile fields. However, you should review and verify them before broadly sharing your app. If you'd like, I can help you harden these rules.

## Environment

```bash
# Firebase (required for Auth + Firestore)
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=

# Google OAuth client IDs (from Firebase / Google Cloud console)
EXPO_PUBLIC_FIREBASE_GOOGLE_WEB_CLIENT_ID=
EXPO_PUBLIC_FIREBASE_GOOGLE_IOS_CLIENT_ID=
EXPO_PUBLIC_FIREBASE_GOOGLE_ANDROID_CLIENT_ID=

# Optional Supabase AI edge functions
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

## Local development

```bash
npm install
npm run typecheck
npm run test
npm run lint
npx expo start
```

## Cursor + Firebase MCP

Firebase MCP is configured in [`.cursor/mcp.json`](.cursor/mcp.json). Restart Cursor so the Firebase MCP server connects, then Firebase CLI tools become available to the agent.
