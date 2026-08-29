# ChakraOS

AI-powered consciousness OS for reflection, daily alignment, journaling, frequency sessions, mudra practice, palm-field visualization, and emotionally intelligent coaching.

## Stack

- **Mobile:** Expo SDK 54 · React Native · Expo Router · TypeScript · Uniwind · Skia · Reanimated · Zustand · React Query · MMKV
- **Backend:** Supabase (Postgres, Storage, Edge Functions, Realtime, RLS, pgvector)
- **Authentication:** Firebase email/password + Supabase-backed Apple/Google OAuth compatibility
- **Billing:** RevenueCat over App Store / Google Play subscriptions
- **AI:** Provider abstraction (Anthropic + OpenAI) via Edge Functions — never hardcode providers in the UI

## Entry flow

Onboarding → Authentication → Profile setup → Paywall → ChakraOS tabs.

Email/password authentication is Firebase-first when the Firebase environment variables are present. Supabase remains the application data and AI backend. Apple/Google OAuth currently continues through Supabase until dedicated native Firebase OAuth is configured.

## Environment

Create `.env` (or EAS secrets):

```bash
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key

EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=

EXPO_PUBLIC_REVENUECAT_IOS_API_KEY=
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY=
EXPO_PUBLIC_REVENUECAT_ENTITLEMENT_ID=pro
```

Enable **Email/Password** in Firebase Authentication before testing account creation.

For the paywall, configure a RevenueCat entitlement named `pro` (or change the env value) and attach the annual App Store / Play product to the current offering.

## Database

```bash
supabase db push
# or
supabase migration up
```

Schema lives in `supabase/migrations/` and includes profiles, preferences, daily check-ins, journals, voice notes, conversations, memory, chakra scores, sound/frequency sessions, reflections, analytics and RLS.

## Auth

Supported after configuration:

- Firebase email + password account creation
- Firebase email verification
- Firebase email + password sign in
- Persistent Firebase auth session
- Apple / Google OAuth via the existing Supabase OAuth bridge

The previous Supabase email OTP/magic-link implementation remains available in the backend library but is no longer the primary ChakraOS login UI.

## Paywall

The ChakraOS paywall uses `react-native-purchases` / RevenueCat instead of the former local mock unlock.

Supported:

- Annual membership purchase
- RevenueCat entitlement verification
- Restore purchases
- Free-tier continuation
- App Store / Google Play subscription management

A real native development/production build and configured store products are required for live purchase testing.

## Frequency + Mudra systems

`lib/frequency/` remains the frequency source of truth. Mudra and Palm Field screens share the ChakraOS vision/practice architecture and feed completed practices back into the reflection/field loop.

## Local development

```bash
npm install
npm run typecheck
npm run test
npm run lint
```

For native billing, use an Expo development build rather than Expo Go.
