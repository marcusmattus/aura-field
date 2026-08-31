import type { User as FirebaseUser } from 'firebase/auth';

import {
  firebaseAuth,
  firebaseSendPasswordReset,
  firebaseSignIn,
  firebaseSignOut,
  firebaseSignUp,
  hasFirebaseAuth,
} from '@/lib/firebase';
import {
  sendMagicLink,
  signInWithOAuth,
  signInWithPassword,
  signOutUser,
  signUpWithEmail,
  type AuthResult,
} from '@/lib/supabase';

export type UnifiedAuthResult = AuthResult;

export const authProvider = hasFirebaseAuth ? 'firebase' : 'supabase';

export async function signUpEmail(email: string, password: string): Promise<UnifiedAuthResult> {
  if (hasFirebaseAuth) {
    const result = await firebaseSignUp(email, password);
    return result.ok ? { ok: true } : { ok: false, error: result.error };
  }
  return signUpWithEmail(email, password);
}

export async function signInEmail(email: string, password: string): Promise<UnifiedAuthResult> {
  if (hasFirebaseAuth) {
    const result = await firebaseSignIn(email, password);
    return result.ok ? { ok: true } : { ok: false, error: result.error };
  }
  return signInWithPassword(email, password);
}

/**
 * Recover access to an existing account. Firebase sends a real password-reset
 * link; Supabase has no password-reset endpoint in this codebase, so it falls
 * back to a magic link, which gets the user back in by the same one email.
 */
export async function sendPasswordReset(email: string): Promise<UnifiedAuthResult> {
  if (hasFirebaseAuth) {
    const result = await firebaseSendPasswordReset(email);
    return result.ok ? { ok: true } : { ok: false, error: result.error };
  }
  return sendMagicLink(email);
}

export function currentFirebaseUser(): FirebaseUser | null {
  return firebaseAuth?.currentUser ?? null;
}

export async function signOutUnified(): Promise<void> {
  if (hasFirebaseAuth) await firebaseSignOut();
  await signOutUser();
}

export { signInWithOAuth };
