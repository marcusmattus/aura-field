/**
 * ENHANCED AUTHENTICATION — Improved auth with offline support and better UX
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { 
  supabase, 
  hasBackend,
  signUpWithEmail as supabaseSignUp,
  signInWithPassword as supabaseSignIn,
  sendLoginCode as supabaseSendCode,
  verifyEmailOtp as supabaseVerifyOtp,
  signOutUser as supabaseSignOut,
  type AuthResult
} from './supabase';

const OFFLINE_USER_KEY = '@chakraos:offline_user';

// ─────────────────────────────────────────────────────────────────────────
// Enhanced Auth Types
// ─────────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  isOffline: boolean;
  createdAt: number;
}

export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isOfflineMode: boolean;
}

export interface EnhancedAuthResult extends AuthResult {
  user?: AuthUser;
  needsVerification?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────
// Offline Authentication Support
// ─────────────────────────────────────────────────────────────────────────

/**
 * Create an offline user for development and testing
 */
async function createOfflineUser(email: string, password: string): Promise<AuthUser> {
  const user: AuthUser = {
    id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    email: email.toLowerCase().trim(),
    isOffline: true,
    createdAt: Date.now()
  };
  
  await AsyncStorage.setItem(OFFLINE_USER_KEY, JSON.stringify({
    user,
    password // In production, this would be hashed
  }));
  
  return user;
}

/**
 * Authenticate with offline credentials
 */
async function authenticateOffline(email: string, password: string): Promise<AuthUser | null> {
  try {
    const stored = await AsyncStorage.getItem(OFFLINE_USER_KEY);
    if (!stored) return null;
    
    const { user, password: storedPassword } = JSON.parse(stored);
    
    if (user.email === email.toLowerCase().trim() && password === storedPassword) {
      return user;
    }
    
    return null;
  } catch (error) {
    console.warn('Offline auth error:', error);
    return null;
  }
}

/**
 * Get current offline user
 */
async function getOfflineUser(): Promise<AuthUser | null> {
  try {
    const stored = await AsyncStorage.getItem(OFFLINE_USER_KEY);
    if (!stored) return null;
    
    const { user } = JSON.parse(stored);
    return user;
  } catch (error) {
    return null;
  }
}

/**
 * Clear offline user data
 */
async function clearOfflineUser(): Promise<void> {
  await AsyncStorage.removeItem(OFFLINE_USER_KEY);
}

// ─────────────────────────────────────────────────────────────────────────
// Enhanced Authentication Functions
// ─────────────────────────────────────────────────────────────────────────

/**
 * Enhanced signup with offline fallback
 */
export async function enhancedSignUp(email: string, password: string): Promise<EnhancedAuthResult> {
  // Validate inputs
  if (!email.trim()) {
    return { ok: false, error: 'Email is required' };
  }
  
  if (!isValidEmail(email)) {
    return { ok: false, error: 'Please enter a valid email address' };
  }
  
  if (password.length < 6) {
    return { ok: false, error: 'Password must be at least 6 characters' };
  }
  
  // Try Supabase if available
  if (hasBackend) {
    try {
      const result = await supabaseSignUp(email, password);
      return { ...result, needsVerification: result.ok };
    } catch (error) {
      console.warn('Supabase signup failed, falling back to offline:', error);
    }
  }
  
  // Offline fallback
  try {
    const user = await createOfflineUser(email, password);
    return { ok: true, user, needsVerification: false };
  } catch (error) {
    return { ok: false, error: 'Failed to create account. Please try again.' };
  }
}

/**
 * Enhanced signin with offline fallback
 */
export async function enhancedSignIn(email: string, password: string): Promise<EnhancedAuthResult> {
  // Validate inputs
  if (!email.trim()) {
    return { ok: false, error: 'Email is required' };
  }
  
  if (!password.trim()) {
    return { ok: false, error: 'Password is required' };
  }
  
  // Try Supabase if available
  if (hasBackend) {
    try {
      const result = await supabaseSignIn(email, password);
      if (result.ok) {
        const user: AuthUser = {
          id: `supabase_${Date.now()}`, // Will be replaced with actual user ID
          email: email.toLowerCase().trim(),
          isOffline: false,
          createdAt: Date.now()
        };
        return { ...result, user };
      }
    } catch (error) {
      console.warn('Supabase signin failed, trying offline:', error);
    }
  }
  
  // Try offline authentication
  const offlineUser = await authenticateOffline(email, password);
  if (offlineUser) {
    return { ok: true, user: offlineUser };
  }
  
  // Both methods failed
  if (hasBackend) {
    return { ok: false, error: 'Invalid email or password. You can also request a login code.' };
  } else {
    return { ok: false, error: 'Account not found. Please create an account first.' };
  }
}

/**
 * Enhanced login code request
 */
export async function enhancedSendLoginCode(email: string): Promise<EnhancedAuthResult> {
  if (!isValidEmail(email)) {
    return { ok: false, error: 'Please enter a valid email address' };
  }
  
  if (!hasBackend) {
    return { ok: false, error: 'Email login codes are not available in offline mode. Please use your password.' };
  }
  
  try {
    const result = await supabaseSendCode(email);
    return { ...result, needsVerification: result.ok };
  } catch (error) {
    return { ok: false, error: 'Failed to send login code. Please check your internet connection.' };
  }
}

/**
 * Enhanced OTP verification
 */
export async function enhancedVerifyOtp(
  email: string, 
  code: string, 
  type: 'signup' | 'email' | 'recovery'
): Promise<EnhancedAuthResult> {
  if (code.length !== 6) {
    return { ok: false, error: 'Please enter the complete 6-digit code' };
  }
  
  if (!hasBackend) {
    return { ok: false, error: 'Verification codes are not available in offline mode' };
  }
  
  try {
    const result = await supabaseVerifyOtp(email, code, type);
    if (result.ok) {
      const user: AuthUser = {
        id: `supabase_verified_${Date.now()}`,
        email: email.toLowerCase().trim(),
        isOffline: false,
        createdAt: Date.now()
      };
      return { ...result, user };
    }
    return result;
  } catch (error) {
    return { ok: false, error: 'Verification failed. Please check the code and try again.' };
  }
}

/**
 * Enhanced signout
 */
export async function enhancedSignOut(): Promise<void> {
  // Clear Supabase session
  if (hasBackend) {
    try {
      await supabaseSignOut();
    } catch (error) {
      console.warn('Supabase signout error:', error);
    }
  }
  
  // Clear offline user
  await clearOfflineUser();
}

/**
 * Get current user (from Supabase or offline storage)
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  // Check Supabase session first
  if (hasBackend && supabase) {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        return {
          id: data.session.user.id,
          email: data.session.user.email || '',
          isOffline: false,
          createdAt: Date.now() // We don't have the actual creation time
        };
      }
    } catch (error) {
      console.warn('Supabase session check failed:', error);
    }
  }
  
  // Check offline user
  return await getOfflineUser();
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

// ─────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

/**
 * Get authentication mode info
 */
export function getAuthMode(): { hasBackend: boolean; isOfflineMode: boolean } {
  return {
    hasBackend,
    isOfflineMode: !hasBackend
  };
}

/**
 * Development helper: create a test user
 */
export async function createTestUser(): Promise<AuthUser> {
  const testEmail = `test.user.${Date.now()}@chakraos.local`;
  const testPassword = 'chakraos123';
  
  return await createOfflineUser(testEmail, testPassword);
}

/**
 * Development helper: reset all authentication data
 */
export async function resetAuthData(): Promise<void> {
  await clearOfflineUser();
  if (hasBackend) {
    await supabaseSignOut();
  }
}