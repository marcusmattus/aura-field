/**
 * FIREBASE AUTHENTICATION — Comprehensive auth system for App Store
 *
 * Features:
 * - Firebase Email/Password authentication
 * - Google Sign-In integration
 * - Apple Sign-In (iOS)
 * - Password reset functionality
 * - Email verification
 * - Backend email notifications
 * - Seamless migration from Supabase
 */

import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─────────────────────────────────────────────────────────────────────────
// Firebase Auth Types
// ─────────────────────────────────────────────────────────────────────────

export interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  emailVerified: boolean;
  provider: 'email' | 'google' | 'apple' | 'anonymous';
  isAnonymous: boolean;
  createdAt: string;
}

export interface AuthResult {
  success: boolean;
  user?: FirebaseUser;
  error?: string;
  needsVerification?: boolean;
}

export interface PasswordResetResult {
  success: boolean;
  email?: string;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Firebase Configuration
// ─────────────────────────────────────────────────────────────────────────

/**
 * Initialize Firebase Auth
 */
export async function initializeFirebaseAuth(): Promise<void> {
  try {
    // Configure Google Sign-In
    await GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      offlineAccess: true,
    });

    // Set auth language
    auth().languageCode = 'en';
    
    console.log('Firebase Auth initialized successfully');
  } catch (error) {
    console.warn('Firebase Auth initialization failed:', error);
  }
}

/**
 * Convert Firebase user to our user format
 */
function convertFirebaseUser(firebaseUser: FirebaseAuthTypes.User): FirebaseUser {
  // Determine provider
  let provider: FirebaseUser['provider'] = 'email';
  if (firebaseUser.isAnonymous) {
    provider = 'anonymous';
  } else if (firebaseUser.providerData.length > 0) {
    const providerId = firebaseUser.providerData[0]?.providerId;
    if (providerId === 'google.com') provider = 'google';
    else if (providerId === 'apple.com') provider = 'apple';
  }

  return {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName,
    photoURL: firebaseUser.photoURL,
    emailVerified: firebaseUser.emailVerified,
    provider,
    isAnonymous: firebaseUser.isAnonymous,
    createdAt: firebaseUser.metadata.creationTime || new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Email/Password Authentication
// ─────────────────────────────────────────────────────────────────────────

/**
 * Sign up with email and password
 */
export async function signUpWithEmailPassword(
  email: string,
  password: string,
  displayName?: string
): Promise<AuthResult> {
  try {
    // Validate inputs
    if (!email.trim()) {
      return { success: false, error: 'Email is required' };
    }
    
    if (!isValidEmail(email)) {
      return { success: false, error: 'Please enter a valid email address' };
    }
    
    if (password.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters' };
    }

    // Create user account
    const userCredential = await auth().createUserWithEmailAndPassword(email.trim(), password);
    
    // Update display name if provided
    if (displayName && userCredential.user) {
      await userCredential.user.updateProfile({ displayName: displayName.trim() });
    }
    
    // Send email verification
    await userCredential.user.sendEmailVerification();
    
    const user = convertFirebaseUser(userCredential.user);
    
    // Track signup event
    await trackAuthEvent('signup', user);
    
    return {
      success: true,
      user,
      needsVerification: !userCredential.user.emailVerified
    };
    
  } catch (error: any) {
    return {
      success: false,
      error: getFirebaseErrorMessage(error)
    };
  }
}

/**
 * Sign in with email and password
 */
export async function signInWithEmailPassword(
  email: string,
  password: string
): Promise<AuthResult> {
  try {
    if (!email.trim()) {
      return { success: false, error: 'Email is required' };
    }
    
    if (!password.trim()) {
      return { success: false, error: 'Password is required' };
    }

    const userCredential = await auth().signInWithEmailAndPassword(email.trim(), password);
    const user = convertFirebaseUser(userCredential.user);
    
    // Track signin event
    await trackAuthEvent('signin', user);
    
    return {
      success: true,
      user,
      needsVerification: !userCredential.user.emailVerified
    };
    
  } catch (error: any) {
    return {
      success: false,
      error: getFirebaseErrorMessage(error)
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Social Authentication (Google & Apple)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Sign in with Google
 */
export async function signInWithGoogle(): Promise<AuthResult> {
  try {
    // Check if Google Play Services are available
    await GoogleSignin.hasPlayServices();
    
    // Get user info from Google
    const { idToken, accessToken } = await GoogleSignin.signIn();
    
    // Create Firebase credential
    const googleCredential = auth.GoogleAuthProvider.credential(idToken, accessToken);
    
    // Sign in to Firebase with Google credential
    const userCredential = await auth().signInWithCredential(googleCredential);
    const user = convertFirebaseUser(userCredential.user);
    
    // Track Google signin event
    await trackAuthEvent('google_signin', user);
    
    return {
      success: true,
      user
    };
    
  } catch (error: any) {
    if (error.code === 'SIGN_IN_CANCELLED') {
      return { success: false, error: 'Sign in was cancelled' };
    }
    
    return {
      success: false,
      error: getFirebaseErrorMessage(error) || 'Google sign in failed'
    };
  }
}

/**
 * Sign in with Apple (iOS only)
 */
export async function signInWithApple(): Promise<AuthResult> {
  if (Platform.OS !== 'ios') {
    return { success: false, error: 'Apple Sign-In is only available on iOS' };
  }
  
  try {
    // Check if Apple Authentication is available
    const isAvailable = await AppleAuthentication.isAvailableAsync();
    if (!isAvailable) {
      return { success: false, error: 'Apple Sign-In is not available on this device' };
    }
    
    // Generate nonce for security
    const nonce = Math.random().toString(36).substring(2, 10);
    const hashedNonce = await Crypto.digestStringAsync(
      Crypto.CryptoDigestAlgorithm.SHA256,
      nonce,
      { encoding: Crypto.CryptoEncoding.HEX }
    );
    
    // Request Apple authentication
    const appleCredential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
    
    // Create Firebase credential
    const { identityToken } = appleCredential;
    if (!identityToken) {
      return { success: false, error: 'Apple Sign-In failed to provide identity token' };
    }
    
    const appleAuthCredential = auth.AppleAuthProvider.credential(identityToken, nonce);
    
    // Sign in to Firebase
    const userCredential = await auth().signInWithCredential(appleAuthCredential);
    
    // Update display name from Apple if provided
    if (appleCredential.fullName && userCredential.user) {
      const displayName = `${appleCredential.fullName.givenName || ''} ${appleCredential.fullName.familyName || ''}`.trim();
      if (displayName) {
        await userCredential.user.updateProfile({ displayName });
      }
    }
    
    const user = convertFirebaseUser(userCredential.user);
    
    // Track Apple signin event
    await trackAuthEvent('apple_signin', user);
    
    return {
      success: true,
      user
    };
    
  } catch (error: any) {
    if (error.code === 'ERR_CANCELED') {
      return { success: false, error: 'Apple Sign-In was cancelled' };
    }
    
    return {
      success: false,
      error: 'Apple Sign-In failed. Please try again.'
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Password Reset & Email Verification
// ─────────────────────────────────────────────────────────────────────────

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email: string): Promise<PasswordResetResult> {
  try {
    if (!email.trim()) {
      return { success: false, error: 'Email is required' };
    }
    
    if (!isValidEmail(email)) {
      return { success: false, error: 'Please enter a valid email address' };
    }
    
    await auth().sendPasswordResetEmail(email.trim());
    
    // Track password reset event
    await trackAuthEvent('password_reset_requested', { email });
    
    return {
      success: true,
      email: email.trim()
    };
    
  } catch (error: any) {
    return {
      success: false,
      error: getFirebaseErrorMessage(error)
    };
  }
}

/**
 * Resend email verification
 */
export async function resendEmailVerification(): Promise<AuthResult> {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      return { success: false, error: 'No user is currently signed in' };
    }
    
    if (currentUser.emailVerified) {
      return { success: false, error: 'Email is already verified' };
    }
    
    await currentUser.sendEmailVerification();
    
    return {
      success: true,
      user: convertFirebaseUser(currentUser)
    };
    
  } catch (error: any) {
    return {
      success: false,
      error: getFirebaseErrorMessage(error)
    };
  }
}

/**
 * Check email verification status
 */
export async function checkEmailVerification(): Promise<boolean> {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) return false;
    
    // Reload user to get fresh verification status
    await currentUser.reload();
    return currentUser.emailVerified;
    
  } catch (error) {
    console.warn('Error checking email verification:', error);
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────
// User Management
// ─────────────────────────────────────────────────────────────────────────

/**
 * Get current user
 */
export function getCurrentUser(): FirebaseUser | null {
  const currentUser = auth().currentUser;
  return currentUser ? convertFirebaseUser(currentUser) : null;
}

/**
 * Sign out current user
 */
export async function signOut(): Promise<void> {
  try {
    const currentUser = getCurrentUser();
    
    // Sign out from Firebase
    await auth().signOut();
    
    // Sign out from Google if needed
    if (currentUser?.provider === 'google') {
      await GoogleSignin.signOut();
    }
    
    // Track signout event
    if (currentUser) {
      await trackAuthEvent('signout', currentUser);
    }
    
  } catch (error) {
    console.warn('Error during sign out:', error);
    // Force sign out even if there's an error
    await auth().signOut();
  }
}

/**
 * Delete current user account
 */
export async function deleteAccount(): Promise<AuthResult> {
  try {
    const currentUser = auth().currentUser;
    if (!currentUser) {
      return { success: false, error: 'No user is currently signed in' };
    }
    
    const user = convertFirebaseUser(currentUser);
    
    // Track account deletion
    await trackAuthEvent('account_deleted', user);
    
    // Delete the account
    await currentUser.delete();
    
    return { success: true };
    
  } catch (error: any) {
    return {
      success: false,
      error: getFirebaseErrorMessage(error)
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Backend Email Notifications
// ─────────────────────────────────────────────────────────────────────────

/**
 * Subscribe user to email updates
 */
export async function subscribeToEmailUpdates(
  email: string,
  preferences: {
    weeklyInsights?: boolean;
    newFeatures?: boolean;
    communityUpdates?: boolean;
    personalizedTips?: boolean;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    // Call your backend API to subscribe user
    const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/email/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await auth().currentUser?.getIdToken()}`,
      },
      body: JSON.stringify({
        email,
        preferences,
        userId: auth().currentUser?.uid,
      }),
    });
    
    if (!response.ok) {
      throw new Error('Failed to subscribe to email updates');
    }
    
    return { success: true };
    
  } catch (error) {
    console.warn('Email subscription error:', error);
    return {
      success: false,
      error: 'Failed to subscribe to email updates. Please try again.'
    };
  }
}

/**
 * Send welcome email to new user
 */
export async function sendWelcomeEmail(user: FirebaseUser): Promise<void> {
  try {
    await fetch(`${process.env.EXPO_PUBLIC_API_URL}/api/email/welcome`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await auth().currentUser?.getIdToken()}`,
      },
      body: JSON.stringify({
        userId: user.uid,
        email: user.email,
        displayName: user.displayName,
      }),
    });
  } catch (error) {
    console.warn('Welcome email error:', error);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

function getFirebaseErrorMessage(error: any): string {
  switch (error.code) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Please sign in instead.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/operation-not-allowed':
      return 'Email/password accounts are not enabled. Please contact support.';
    case 'auth/weak-password':
      return 'Password is too weak. Please use at least 6 characters.';
    case 'auth/user-disabled':
      return 'This account has been disabled. Please contact support.';
    case 'auth/user-not-found':
      return 'No account found with this email address.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/invalid-credential':
      return 'Invalid email or password. Please check your credentials.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection and try again.';
    case 'auth/requires-recent-login':
      return 'This action requires recent authentication. Please sign in again.';
    default:
      return error.message || 'An unexpected error occurred. Please try again.';
  }
}

async function trackAuthEvent(event: string, data: any): Promise<void> {
  try {
    // Store auth event for analytics
    const eventData = {
      event,
      timestamp: new Date().toISOString(),
      data: typeof data === 'object' ? JSON.stringify(data) : data,
    };
    
    await AsyncStorage.setItem(
      `@chakraos:auth_event_${Date.now()}`,
      JSON.stringify(eventData)
    );
  } catch (error) {
    console.warn('Error tracking auth event:', error);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Auth State Listener
// ─────────────────────────────────────────────────────────────────────────

export function onAuthStateChanged(
  callback: (user: FirebaseUser | null) => void
): () => void {
  return auth().onAuthStateChanged((firebaseUser) => {
    const user = firebaseUser ? convertFirebaseUser(firebaseUser) : null;
    callback(user);
  });
}