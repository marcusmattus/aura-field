import * as Linking from 'expo-linking';
import { createClient } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';

import { authStorage } from '@/lib/storage';
import type { BaselineMood, ChakraKey, ExperienceLevel, UserProfile } from '@/lib/types';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

WebBrowser.maybeCompleteAuthSession();

/**
 * Supabase client — cloud-first.
 * Journals, check-ins, conversations, and memory live in Postgres with RLS.
 * Session tokens persist via MMKV when available, else AsyncStorage.
 */
export const supabase =
  url && key
    ? createClient(url, key, {
        auth: {
          storage: authStorage,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
          flowType: 'pkce',
        },
      })
    : null;

export const hasBackend = Boolean(supabase);

/** Shape of a row in public.profiles. */
interface ProfileRow {
  id: string;
  display_name: string | null;
  birthdate: string | null;
  focus_areas: string[] | null;
  baseline_mood: number | null;
  experience_level: string | null;
  primary_intention: string | null;
}

const PROFILE_COLUMNS =
  'id, display_name, birthdate, focus_areas, baseline_mood, experience_level, primary_intention';

const FOCUS_KEYS: ChakraKey[] = [
  'soul',
  'crown',
  'third',
  'throat',
  'heart',
  'solar',
  'sacral',
  'root',
  'earth',
];

function toFocusAreas(values: string[] | null): ChakraKey[] {
  if (!values) return [];
  return values.filter((v): v is ChakraKey => (FOCUS_KEYS as string[]).includes(v));
}

function toBaselineMood(value: number | null): BaselineMood | null {
  if (value === 1 || value === 2 || value === 3 || value === 4 || value === 5) return value;
  return null;
}

function toExperience(value: string | null): ExperienceLevel | null {
  if (value === 'new' || value === 'some' || value === 'devoted') return value;
  return null;
}

function rowToProfile(row: ProfileRow, email: string): UserProfile {
  return {
    id: row.id,
    email,
    displayName: row.display_name ?? '',
    birthdate: row.birthdate,
    focusAreas: toFocusAreas(row.focus_areas),
    baselineMood: toBaselineMood(row.baseline_mood),
    experienceLevel: toExperience(row.experience_level),
    primaryIntention: row.primary_intention ?? '',
  };
}

function errMsg(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) {
    return String((e as { message: unknown }).message);
  }
  return 'An unexpected error occurred.';
}

export type AuthResult = { ok: true } | { ok: false; error: string };

/** Send a 6-digit signup code to the email and create the auth user. */
export async function signUpWithEmail(email: string, password: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: 'Backend is not configured.' };
  const { error } = await supabase.auth.signUp({ email, password });
  if (error) return { ok: false, error: errMsg(error) };
  return { ok: true };
}

/** Verify a 6-digit code for the given flow and establish a session. */
export async function verifyEmailOtp(
  email: string,
  token: string,
  type: 'signup' | 'email' | 'recovery',
): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: 'Backend is not configured.' };
  const { error } = await supabase.auth.verifyOtp({ email, token, type });
  if (error) return { ok: false, error: errMsg(error) };
  return { ok: true };
}

/** Password sign-in for returning members. */
export async function signInWithPassword(email: string, password: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: 'Backend is not configured.' };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, error: errMsg(error) };
  return { ok: true };
}

/** Passwordless sign-in: emails a 6-digit code (no magic link). */
export async function sendLoginCode(email: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: 'Backend is not configured.' };
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  if (error) return { ok: false, error: errMsg(error) };
  return { ok: true };
}

/**
 * Passwordless magic link. Opens the email link which redirects back via
 * `aura-field://auth/callback` (configured in supabase/config.toml).
 */
export async function sendMagicLink(email: string): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: 'Backend is not configured.' };
  const redirectTo = Linking.createURL('auth/callback');
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo,
      shouldCreateUser: true,
    },
  });
  if (error) return { ok: false, error: errMsg(error) };
  return { ok: true };
}

/** OAuth via Supabase (Apple / Google). Requires provider enabled in dashboard. */
export async function signInWithOAuth(
  provider: 'apple' | 'google',
): Promise<AuthResult> {
  if (!supabase) return { ok: false, error: 'Backend is not configured.' };
  const redirectTo = Linking.createURL('auth/callback');
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });
  if (error) return { ok: false, error: errMsg(error) };
  if (!data.url) return { ok: false, error: 'No OAuth URL returned.' };

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success' || !('url' in result) || !result.url) {
    return { ok: false, error: 'Sign-in was cancelled.' };
  }

  const parsed = Linking.parse(result.url);
  const query = parsed.queryParams ?? {};
  // PKCE: exchange code if present
  const code = typeof query.code === 'string' ? query.code : null;
  if (code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (exchangeError) return { ok: false, error: errMsg(exchangeError) };
    return { ok: true };
  }

  // Implicit fragment tokens (fallback)
  const accessToken =
    typeof query.access_token === 'string' ? query.access_token : null;
  const refreshToken =
    typeof query.refresh_token === 'string' ? query.refresh_token : null;
  if (accessToken && refreshToken) {
    const { error: setErr } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });
    if (setErr) return { ok: false, error: errMsg(setErr) };
    return { ok: true };
  }

  return { ok: false, error: 'Could not complete OAuth session.' };
}

/** Restore session on cold start; returns whether a valid session exists. */
export async function restoreSession(): Promise<boolean> {
  if (!supabase) return false;
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) return false;
  // Proactively refresh if near expiry
  const expiresAt = data.session.expires_at ?? 0;
  if (expiresAt * 1000 < Date.now() + 60_000) {
    const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession();
    return Boolean(refreshed.session) && !refreshError;
  }
  return true;
}

export async function signOutUser(): Promise<void> {
  await supabase?.auth.signOut();
}

/** Read the signed-in user's profile, or null if none exists yet. */
export async function fetchProfile(): Promise<UserProfile | null> {
  if (!supabase) return null;
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', user.id)
    .maybeSingle();
  if (error || !data) return null;
  return rowToProfile(data as ProfileRow, user.email ?? '');
}

/** Insert or update the signed-in user's profile from the intake form. */
export async function saveProfile(
  patch: Omit<UserProfile, 'id' | 'email'>,
): Promise<UserProfile | null> {
  if (!supabase) return null;
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return null;
  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id: user.id,
      display_name: patch.displayName,
      birthdate: patch.birthdate,
      focus_areas: patch.focusAreas,
      baseline_mood: patch.baselineMood,
      experience_level: patch.experienceLevel,
      primary_intention: patch.primaryIntention,
    })
    .select(PROFILE_COLUMNS)
    .single();
  if (error || !data) return null;
  return rowToProfile(data as ProfileRow, user.email ?? '');
}
