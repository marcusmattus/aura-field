/**
 * EMAIL SERVICE — Backend email notifications for chakraOS
 *
 * Features:
 * - Welcome emails for new users
 * - Password reset notifications
 * - Weekly meditation insights
 * - Feature updates and announcements
 * - Personalized meditation recommendations
 * - Subscription and billing notifications
 */

import { getCurrentUser } from './firebase-auth';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;
const API_KEY = process.env.EXPO_PUBLIC_API_KEY;

// ─────────────────────────────────────────────────────────────────────────
// Email Types and Interfaces
// ─────────────────────────────────────────────────────────────────────────

export interface EmailPreferences {
  weeklyInsights: boolean;
  newFeatures: boolean;
  communityUpdates: boolean;
  personalizedTips: boolean;
  reminderEmails: boolean;
  billingUpdates: boolean;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  description: string;
  category: 'transactional' | 'marketing' | 'system';
}

export interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────
// Core Email Functions
// ─────────────────────────────────────────────────────────────────────────

/**
 * Send API request to backend email service
 */
async function sendEmailRequest(
  endpoint: string,
  data: any,
  requireAuth: boolean = true
): Promise<EmailResult> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add API key if available
    if (API_KEY) {
      headers['X-API-Key'] = API_KEY;
    }

    // Add Firebase auth token if required
    if (requireAuth) {
      const currentUser = getCurrentUser();
      if (!currentUser) {
        return { success: false, error: 'User not authenticated' };
      }

      // Note: In a real implementation, you'd get the Firebase ID token
      // const idToken = await currentUser.getIdToken();
      // headers['Authorization'] = `Bearer ${idToken}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return {
      success: true,
      messageId: result.messageId || result.id,
    };

  } catch (error: any) {
    console.warn(`Email service error (${endpoint}):`, error);
    return {
      success: false,
      error: error.message || 'Failed to send email'
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Transactional Emails (Authentication & Account)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Send welcome email to new users
 */
export async function sendWelcomeEmail(
  email: string,
  displayName?: string,
  userPreferences?: Partial<EmailPreferences>
): Promise<EmailResult> {
  return sendEmailRequest('/api/email/welcome', {
    email,
    displayName,
    preferences: userPreferences,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Send password reset confirmation email
 */
export async function sendPasswordResetConfirmation(
  email: string
): Promise<EmailResult> {
  return sendEmailRequest('/api/email/password-reset-confirmation', {
    email,
    timestamp: new Date().toISOString(),
  }, false); // Don't require auth for password reset
}

/**
 * Send email verification reminder
 */
export async function sendEmailVerificationReminder(
  email: string
): Promise<EmailResult> {
  return sendEmailRequest('/api/email/verification-reminder', {
    email,
    timestamp: new Date().toISOString(),
  }, false);
}

/**
 * Send account deletion confirmation
 */
export async function sendAccountDeletionConfirmation(
  email: string,
  displayName?: string
): Promise<EmailResult> {
  return sendEmailRequest('/api/email/account-deleted', {
    email,
    displayName,
    timestamp: new Date().toISOString(),
  }, false);
}

// ─────────────────────────────────────────────────────────────────────────
// Meditation & Progress Emails
// ─────────────────────────────────────────────────────────────────────────

/**
 * Send weekly meditation insights
 */
export async function sendWeeklyInsights(
  meditationStats: {
    totalSessions: number;
    totalMinutes: number;
    favoriteFrequency: number;
    streakDays: number;
    xpEarned: number;
    topChakra: string;
  }
): Promise<EmailResult> {
  const currentUser = getCurrentUser();
  if (!currentUser?.email) {
    return { success: false, error: 'No user email available' };
  }

  return sendEmailRequest('/api/email/weekly-insights', {
    email: currentUser.email,
    displayName: currentUser.displayName,
    stats: meditationStats,
    weekStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    weekEnd: new Date().toISOString(),
  });
}

/**
 * Send milestone achievement email
 */
export async function sendMilestoneEmail(
  milestone: {
    type: 'streak' | 'sessions' | 'minutes' | 'level' | 'chakra';
    value: number;
    title: string;
    description: string;
  }
): Promise<EmailResult> {
  const currentUser = getCurrentUser();
  if (!currentUser?.email) {
    return { success: false, error: 'No user email available' };
  }

  return sendEmailRequest('/api/email/milestone', {
    email: currentUser.email,
    displayName: currentUser.displayName,
    milestone,
    achievedAt: new Date().toISOString(),
  });
}

/**
 * Send personalized meditation recommendation
 */
export async function sendPersonalizedRecommendation(
  recommendation: {
    frequency: number;
    chakra: string;
    duration: number;
    reason: string;
    benefits: string[];
  }
): Promise<EmailResult> {
  const currentUser = getCurrentUser();
  if (!currentUser?.email) {
    return { success: false, error: 'No user email available' };
  }

  return sendEmailRequest('/api/email/recommendation', {
    email: currentUser.email,
    displayName: currentUser.displayName,
    recommendation,
    timestamp: new Date().toISOString(),
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Marketing & Feature Emails
// ─────────────────────────────────────────────────────────────────────────

/**
 * Send new feature announcement
 */
export async function sendFeatureAnnouncement(
  feature: {
    name: string;
    description: string;
    benefits: string[];
    ctaText?: string;
    ctaUrl?: string;
  }
): Promise<EmailResult> {
  const currentUser = getCurrentUser();
  if (!currentUser?.email) {
    return { success: false, error: 'No user email available' };
  }

  return sendEmailRequest('/api/email/feature-announcement', {
    email: currentUser.email,
    displayName: currentUser.displayName,
    feature,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Send meditation reminder email
 */
export async function sendMeditationReminder(
  reminderType: 'daily' | 'weekly' | 'custom',
  customMessage?: string
): Promise<EmailResult> {
  const currentUser = getCurrentUser();
  if (!currentUser?.email) {
    return { success: false, error: 'No user email available' };
  }

  return sendEmailRequest('/api/email/meditation-reminder', {
    email: currentUser.email,
    displayName: currentUser.displayName,
    reminderType,
    customMessage,
    timestamp: new Date().toISOString(),
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Subscription & Billing Emails
// ─────────────────────────────────────────────────────────────────────────

/**
 * Send subscription confirmation email
 */
export async function sendSubscriptionConfirmation(
  subscription: {
    planName: string;
    price: number;
    currency: string;
    billingCycle: 'monthly' | 'yearly';
    nextBillingDate: string;
  }
): Promise<EmailResult> {
  const currentUser = getCurrentUser();
  if (!currentUser?.email) {
    return { success: false, error: 'No user email available' };
  }

  return sendEmailRequest('/api/email/subscription-confirmation', {
    email: currentUser.email,
    displayName: currentUser.displayName,
    subscription,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Send billing notification
 */
export async function sendBillingNotification(
  notification: {
    type: 'payment_success' | 'payment_failed' | 'renewal_reminder' | 'cancellation';
    amount?: number;
    currency?: string;
    nextAttempt?: string;
    reason?: string;
  }
): Promise<EmailResult> {
  const currentUser = getCurrentUser();
  if (!currentUser?.email) {
    return { success: false, error: 'No user email available' };
  }

  return sendEmailRequest('/api/email/billing-notification', {
    email: currentUser.email,
    displayName: currentUser.displayName,
    notification,
    timestamp: new Date().toISOString(),
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Email Preferences Management
// ─────────────────────────────────────────────────────────────────────────

/**
 * Update user email preferences
 */
export async function updateEmailPreferences(
  preferences: EmailPreferences
): Promise<EmailResult> {
  const currentUser = getCurrentUser();
  if (!currentUser?.email) {
    return { success: false, error: 'No user email available' };
  }

  return sendEmailRequest('/api/email/preferences', {
    email: currentUser.email,
    preferences,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Get user email preferences
 */
export async function getEmailPreferences(): Promise<{
  success: boolean;
  preferences?: EmailPreferences;
  error?: string;
}> {
  try {
    const currentUser = getCurrentUser();
    if (!currentUser?.email) {
      return { success: false, error: 'No user email available' };
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (API_KEY) {
      headers['X-API-Key'] = API_KEY;
    }

    const response = await fetch(`${API_BASE_URL}/api/email/preferences?email=${encodeURIComponent(currentUser.email)}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return {
      success: true,
      preferences: result.preferences,
    };

  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to get email preferences'
    };
  }
}

/**
 * Unsubscribe from all emails
 */
export async function unsubscribeFromAllEmails(
  email?: string,
  unsubscribeToken?: string
): Promise<EmailResult> {
  return sendEmailRequest('/api/email/unsubscribe', {
    email: email || getCurrentUser()?.email,
    unsubscribeToken,
    timestamp: new Date().toISOString(),
  }, !unsubscribeToken); // Don't require auth if unsubscribe token provided
}

// ─────────────────────────────────────────────────────────────────────────
// Email Templates & Testing
// ─────────────────────────────────────────────────────────────────────────

/**
 * Get available email templates
 */
export async function getEmailTemplates(): Promise<{
  success: boolean;
  templates?: EmailTemplate[];
  error?: string;
}> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (API_KEY) {
      headers['X-API-Key'] = API_KEY;
    }

    const response = await fetch(`${API_BASE_URL}/api/email/templates`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return {
      success: true,
      templates: result.templates,
    };

  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to get email templates'
    };
  }
}

/**
 * Send test email (development only)
 */
export async function sendTestEmail(
  templateId: string,
  testData: any
): Promise<EmailResult> {
  if (process.env.NODE_ENV !== 'development') {
    return { success: false, error: 'Test emails only available in development' };
  }

  const currentUser = getCurrentUser();
  if (!currentUser?.email) {
    return { success: false, error: 'No user email available' };
  }

  return sendEmailRequest('/api/email/test', {
    email: currentUser.email,
    templateId,
    testData,
    timestamp: new Date().toISOString(),
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Utility Functions
// ─────────────────────────────────────────────────────────────────────────

/**
 * Check if email service is configured
 */
export function isEmailServiceConfigured(): boolean {
  return Boolean(API_BASE_URL && API_KEY);
}

/**
 * Get email service status
 */
export async function getEmailServiceStatus(): Promise<{
  configured: boolean;
  connected: boolean;
  error?: string;
}> {
  if (!isEmailServiceConfigured()) {
    return {
      configured: false,
      connected: false,
      error: 'Email service not configured'
    };
  }

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (API_KEY) {
      headers['X-API-Key'] = API_KEY;
    }

    const response = await fetch(`${API_BASE_URL}/api/email/status`, {
      method: 'GET',
      headers,
    });

    return {
      configured: true,
      connected: response.ok,
      error: response.ok ? undefined : `HTTP ${response.status}`
    };

  } catch (error: any) {
    return {
      configured: true,
      connected: false,
      error: error.message
    };
  }
}