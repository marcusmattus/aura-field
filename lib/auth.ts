import type { User as FirebaseUser } from 'firebase/auth';

import { firebaseAuth, firebaseSignIn, firebaseSignOut, firebaseSignUp, hasFirebaseAuth } from '@/lib/firebase';
import {
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

export function currentFirebaseUser(): FirebaseUser | null {
  return firebaseAuth?.currentUser ?? null;
}

export async function signOutUnified(): Promise<void> {
  if (hasFirebaseAuth) await firebaseSignOut();
  await signOutUser();
}

export { signInWithOAuth };
