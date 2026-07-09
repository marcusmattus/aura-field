/**
 * ENHANCED AUTH HOOK — React hook for authentication with improved UX
 */

import { useState, useCallback, useEffect } from 'react';
import { useChakraStore } from '@/lib/store';
import {
  enhancedSignUp,
  enhancedSignIn,
  enhancedSendLoginCode,
  enhancedVerifyOtp,
  enhancedSignOut,
  getCurrentUser,
  getAuthMode,
  type AuthUser,
  type EnhancedAuthResult
} from '@/lib/auth-enhanced';

export interface UseEnhancedAuthResult {
  // Auth state
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  
  // Auth mode info
  hasBackend: boolean;
  isOfflineMode: boolean;
  
  // Auth actions
  signUp: (email: string, password: string) => Promise<EnhancedAuthResult>;
  signIn: (email: string, password: string) => Promise<EnhancedAuthResult>;
  sendLoginCode: (email: string) => Promise<EnhancedAuthResult>;
  verifyCode: (email: string, code: string, type: 'signup' | 'email' | 'recovery') => Promise<EnhancedAuthResult>;
  signOut: () => Promise<void>;
  clearError: () => void;
  
  // Verification state
  needsVerification: boolean;
  setNeedsVerification: (needs: boolean) => void;
}

export function useEnhancedAuth(): UseEnhancedAuthResult {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  
  // Get auth mode info
  const { hasBackend, isOfflineMode } = getAuthMode();
  
  // Store integration
  const storeAuthenticated = useChakraStore(s => s.authenticated);
  const onAuthenticated = useChakraStore(s => s.onAuthenticated);
  const signOutStore = useChakraStore(s => s.signOut);
  
  // Initialize auth state
  useEffect(() => {
    async function initAuth() {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        
        // Sync with store if user exists
        if (currentUser && !storeAuthenticated) {
          await onAuthenticated();
        }
      } catch (err) {
        console.warn('Auth initialization error:', err);
        setError('Failed to initialize authentication');
      } finally {
        setIsLoading(false);
      }
    }
    
    initAuth();
  }, [storeAuthenticated, onAuthenticated]);
  
  const signUp = useCallback(async (email: string, password: string): Promise<EnhancedAuthResult> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await enhancedSignUp(email, password);
      
      if (result.ok) {
        if (result.needsVerification) {
          setNeedsVerification(true);
        } else if (result.user) {
          setUser(result.user);
          await onAuthenticated();
        }
      } else {
        setError(result.error);
      }
      
      return result;
    } catch (err) {
      const errorMsg = 'Signup failed. Please try again.';
      setError(errorMsg);
      return { ok: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, [onAuthenticated]);
  
  const signIn = useCallback(async (email: string, password: string): Promise<EnhancedAuthResult> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await enhancedSignIn(email, password);
      
      if (result.ok && result.user) {
        setUser(result.user);
        await onAuthenticated();
      } else {
        setError(result.error);
      }
      
      return result;
    } catch (err) {
      const errorMsg = 'Sign in failed. Please try again.';
      setError(errorMsg);
      return { ok: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, [onAuthenticated]);
  
  const sendLoginCode = useCallback(async (email: string): Promise<EnhancedAuthResult> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await enhancedSendLoginCode(email);
      
      if (result.ok && result.needsVerification) {
        setNeedsVerification(true);
      } else if (!result.ok) {
        setError(result.error);
      }
      
      return result;
    } catch (err) {
      const errorMsg = 'Failed to send login code. Please try again.';
      setError(errorMsg);
      return { ok: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  const verifyCode = useCallback(async (
    email: string, 
    code: string, 
    type: 'signup' | 'email' | 'recovery'
  ): Promise<EnhancedAuthResult> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await enhancedVerifyOtp(email, code, type);
      
      if (result.ok && result.user) {
        setUser(result.user);
        setNeedsVerification(false);
        await onAuthenticated();
      } else {
        setError(result.error);
      }
      
      return result;
    } catch (err) {
      const errorMsg = 'Verification failed. Please try again.';
      setError(errorMsg);
      return { ok: false, error: errorMsg };
    } finally {
      setIsLoading(false);
    }
  }, [onAuthenticated]);
  
  const signOut = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);
    
    try {
      await enhancedSignOut();
      await signOutStore();
      setUser(null);
      setNeedsVerification(false);
    } catch (err) {
      console.warn('Signout error:', err);
      setError('Failed to sign out completely');
    } finally {
      setIsLoading(false);
    }
  }, [signOutStore]);
  
  const clearError = useCallback(() => {
    setError(null);
  }, []);
  
  return {
    // Auth state
    user,
    isAuthenticated: user !== null,
    isLoading,
    error,
    
    // Auth mode
    hasBackend,
    isOfflineMode,
    
    // Auth actions
    signUp,
    signIn,
    sendLoginCode,
    verifyCode,
    signOut,
    clearError,
    
    // Verification state
    needsVerification,
    setNeedsVerification
  };
}