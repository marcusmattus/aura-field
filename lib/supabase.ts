import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

import type { BaselineMood, ChakraKey, ExperienceLevel, UserProfile } from '@/lib/types';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * Supabase client. chakraOS keeps all journal/field data on-device; Supabase
 * hosts the agent Edge Functions (which call Claude) and now also backs the
 * login system + the user profile/wellbeing intake. The journal itself is
 * sacred data — entries never leave the device by default.
 *
 * Auth uses 6-digit email OTP codes (no magic links / redirect URLs). The
 * session is persisted through AsyncStorage so the user stays signed in.
 */
export const supabase =
  url && key
    ? createClient(url, key, {
        auth: {
          storage: AsyncStorage,
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
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
  const { error } = await supabase.auth.signInWithOtp({ email });
  if (error) return { ok: false, error: errMsg(error) };
  return { ok: true };
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
