/**
 * Firebase Authentication helpers.
 * Providers: Email/Password, Google Sign-In, Phone (SMS).
 * Follows firebase-auth-basics skill patterns (modular Web SDK).
 */

import {
  GoogleAuthProvider,
  RecaptchaVerifier,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPhoneNumber,
  signInWithPopup,
  signOut,
  type ConfirmationResult,
  type User,
} from 'firebase/auth';
import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

import { auth, isFirebaseConfigured } from '@/lib/firebase';

WebBrowser.maybeCompleteAuthSession();

export type AuthResult = { ok: true; user?: User } | { ok: false; error: string };

function errMsg(e: unknown): string {
  if (e && typeof e === 'object' && 'code' in e) {
    const code = String((e as { code: string }).code);
    switch (code) {
      case 'auth/email-already-in-use':
        return 'An account already exists with this email.';
      case 'auth/invalid-email':
        return 'Enter a valid email address.';
      case 'auth/weak-password':
        return 'Password must be at least 6 characters.';
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Invalid email or password.';
      case 'auth/too-many-requests':
        return 'Too many attempts. Try again later.';
      case 'auth/unauthorized-domain':
        return 'This domain is not authorized for OAuth. Add it in Firebase Auth settings.';
      case 'auth/operation-not-allowed':
        return 'This sign-in method is not enabled in Firebase.';
      case 'auth/invalid-phone-number':
        return 'Enter a valid phone number in E.164 format (e.g. +15551234567).';
      case 'auth/invalid-verification-code':
        return 'Invalid verification code.';
      default:
        break;
    }
  }
  if (e && typeof e === 'object' && 'message' in e) {
    return String((e as { message: unknown }).message);
  }
  return 'An unexpected authentication error occurred.';
}

function requireAuth() {
  if (!auth || !isFirebaseConfigured) {
    throw new Error('Firebase is not configured. Set EXPO_PUBLIC_FIREBASE_* env vars.');
  }
  return auth;
}

export async function signUpWithEmail(email: string, password: string): Promise<AuthResult> {
  try {
    const a = requireAuth();
    const cred = await createUserWithEmailAndPassword(a, email.trim(), password);
    try {
      await sendEmailVerification(cred.user);
    } catch {
      /* verification email is best-effort */
    }
    return { ok: true, user: cred.user };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function signInWithEmail(email: string, password: string): Promise<AuthResult> {
  try {
    const a = requireAuth();
    const cred = await signInWithEmailAndPassword(a, email.trim(), password);
    return { ok: true, user: cred.user };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function resetPassword(email: string): Promise<AuthResult> {
  try {
    const a = requireAuth();
    await sendPasswordResetEmail(a, email.trim());
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

/** Google Sign-In via popup on web; ID token credential flow on native. */
export async function signInWithGoogle(opts?: {
  idToken?: string | null;
  accessToken?: string | null;
}): Promise<AuthResult> {
  try {
    const a = requireAuth();
    const provider = new GoogleAuthProvider();
    provider.addScope('profile');
    provider.addScope('email');

    if (Platform.OS === 'web') {
      const result = await signInWithPopup(a, provider);
      return { ok: true, user: result.user };
    }

    if (!opts?.idToken && !opts?.accessToken) {
      return {
        ok: false,
        error:
          'Google Sign-In on native requires an ID token. Use the Google button which requests one via Expo AuthSession.',
      };
    }

    const credential = GoogleAuthProvider.credential(opts.idToken ?? null, opts.accessToken ?? null);
    const result = await signInWithCredential(a, credential);
    return { ok: true, user: result.user };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

/** Expo AuthSession Google request config (native). */
export function googleAuthRequestConfig() {
  return {
    webClientId: process.env.EXPO_PUBLIC_FIREBASE_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_FIREBASE_GOOGLE_IOS_CLIENT_ID,
    androidClientId: process.env.EXPO_PUBLIC_FIREBASE_GOOGLE_ANDROID_CLIENT_ID,
    redirectUri: Linking.createURL('auth/callback'),
  };
}

let phoneConfirmation: ConfirmationResult | null = null;
let recaptchaVerifier: RecaptchaVerifier | null = null;

/** Ensure a visible/invisible reCAPTCHA container exists (web only). */
export function ensureRecaptcha(containerId = 'recaptcha-container'): RecaptchaVerifier {
  const a = requireAuth();
  if (Platform.OS !== 'web') {
    throw new Error('Phone reCAPTCHA verifier is only available on web in this build.');
  }
  if (typeof document !== 'undefined' && !document.getElementById(containerId)) {
    const el = document.createElement('div');
    el.id = containerId;
    document.body.appendChild(el);
  }
  if (!recaptchaVerifier) {
    recaptchaVerifier = new RecaptchaVerifier(a, containerId, {
      size: 'invisible',
    });
  }
  return recaptchaVerifier;
}

/** Send SMS verification code. Phone must be E.164 (e.g. +15551234567). */
export async function sendPhoneCode(phoneNumber: string): Promise<AuthResult> {
  try {
    const a = requireAuth();
    if (Platform.OS !== 'web') {
      return {
        ok: false,
        error:
          'Phone authentication on iOS/Android requires native Application Verifier setup. Use web or complete native App Check / SafetyNet configuration.',
      };
    }
    const verifier = ensureRecaptcha();
    phoneConfirmation = await signInWithPhoneNumber(a, phoneNumber.trim(), verifier);
    return { ok: true };
  } catch (e) {
    recaptchaVerifier = null;
    return { ok: false, error: errMsg(e) };
  }
}

/** Confirm SMS code from sendPhoneCode. */
export async function confirmPhoneCode(code: string): Promise<AuthResult> {
  try {
    if (!phoneConfirmation) {
      return { ok: false, error: 'Request a verification code first.' };
    }
    const result = await phoneConfirmation.confirm(code.trim());
    phoneConfirmation = null;
    return { ok: true, user: result.user };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

export async function signOutFirebase(): Promise<void> {
  if (!auth) return;
  await signOut(auth);
}

export function subscribeAuth(callback: (user: User | null) => void): () => void {
  if (!auth) {
    callback(null);
    return () => undefined;
  }
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser(): User | null {
  return auth?.currentUser ?? null;
}
