/**
 * AUTHENTICATION SCREEN — Enhanced login system for chakraOS
 * 
 * Features:
 * - Supabase authentication with email/password and OTP codes
 * - Offline mode for development and testing
 * - Enhanced error handling and UX improvements
 * - Visual indicators for connection status
 * - Automatic test account creation in offline mode
 */

import EnhancedAuthScreen from '@/components/EnhancedAuthScreen';

export default function AuthScreen() {
  return <EnhancedAuthScreen />;
}
