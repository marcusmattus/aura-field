import AsyncStorage from '@react-native-async-storage/async-storage';
import { getApp, getApps, initializeApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  getAuth,
  getReactNativePersistence,
  initializeAuth,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

export const hasFirebaseAuth = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
);

const app = hasFirebaseAuth ? (getApps().length ? getApp() : initializeApp(firebaseConfig)) : null;

export const firebaseAuth = app
  ? (() => {
      try {
        return initializeAuth(app, {
          persistence: getReactNativePersistence(AsyncStorage),
        });
      } catch {
        return getAuth(app);
      }
    })()
  : null;

export type FirebaseAuthResult = { ok: true; user: User } | { ok: false; error: string };

function message(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code: unknown }).code);
    if (code.includes('email-already-in-use')) return 'An account already exists for this email.';
    if (code.includes('invalid-credential')) return 'Email or password is incorrect.';
    if (code.includes('weak-password'))
      return 'Use a stronger password with at least 6 characters.';
    if (code.includes('invalid-email')) return 'Enter a valid email address.';
    if (code.includes('too-many-requests')) return 'Too many attempts. Try again shortly.';
    if (code.includes('user-not-found'))
      return 'If that email has an account, a reset link is on its way.';
  }
  if (error && typeof error === 'object' && 'message' in error) {
    return String((error as { message: unknown }).message);
  }
  return 'Authentication failed.';
}

export async function firebaseSignUp(email: string, password: string): Promise<FirebaseAuthResult> {
  if (!firebaseAuth) return { ok: false, error: 'Firebase Auth is not configured.' };
  try {
    const credential = await createUserWithEmailAndPassword(firebaseAuth, email, password);
    await sendEmailVerification(credential.user);
    return { ok: true, user: credential.user };
  } catch (error) {
    return { ok: false, error: message(error) };
  }
}

export async function firebaseSignIn(email: string, password: string): Promise<FirebaseAuthResult> {
  if (!firebaseAuth) return { ok: false, error: 'Firebase Auth is not configured.' };
  try {
    const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);
    return { ok: true, user: credential.user };
  } catch (error) {
    return { ok: false, error: message(error) };
  }
}

export async function firebaseSendPasswordReset(
  email: string,
): Promise<FirebaseAuthResult | { ok: true }> {
  if (!firebaseAuth) return { ok: false, error: 'Firebase Auth is not configured.' };
  try {
    await sendPasswordResetEmail(firebaseAuth, email);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: message(error) };
  }
}

export async function firebaseSignOut(): Promise<void> {
  if (firebaseAuth) await signOut(firebaseAuth);
}

export function watchFirebaseAuth(callback: (user: User | null) => void): () => void {
  if (!firebaseAuth) return () => undefined;
  return onAuthStateChanged(firebaseAuth, callback);
}
