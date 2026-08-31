/**
 * `getReactNativePersistence` ships only under @firebase/auth's `react-native`
 * export condition. Metro resolves that condition and hands us the real
 * function on device, but TypeScript never reaches it: `types` precedes
 * `react-native` in the package's export keys, so tsc always lands on the
 * default `auth-public.d.ts`, where the symbol is absent (TS2305).
 *
 * Re-declaring it here restores the type for `npm run typecheck` without
 * changing a single byte of what actually runs — the import in lib/firebase.ts
 * stays pointed at `firebase/auth`, which re-exports `@firebase/auth` wholesale.
 */
import type { Persistence, ReactNativeAsyncStorage } from 'firebase/auth';

declare module '@firebase/auth' {
  export function getReactNativePersistence(storage: ReactNativeAsyncStorage): Persistence;
}
