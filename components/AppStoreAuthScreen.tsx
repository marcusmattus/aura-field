/**
 * APP STORE AUTH SCREEN — Complete authentication for Apple App Store
 *
 * Features:
 * - Email/password authentication
 * - Google Sign-In
 * - Apple Sign-In (iOS)
 * - Password reset functionality
 * - Email verification
 * - Enhanced error handling
 * - Beautiful animations and UX
 */

import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { 
  ArrowRight, 
  ChevronLeft, 
  AlertCircle, 
  Mail,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  RefreshCw
} from 'lucide-react-native';
import { useRef, useState, useEffect } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  useWindowDimensions,
  View,
  Alert,
} from 'react-native';
import { Text } from 'heroui-native';
import Animated, { 
  FadeInDown, 
  FadeOutUp, 
  SlideInLeft,
  SlideOutRight,
  BounceIn
} from 'react-native-reanimated';

import { Display, Logo, Mono, SoftFade } from '@/components/ui';
import { SURFACE_ACCENT } from '@/lib/chakras';
import { 
  signUpWithEmailPassword,
  signInWithEmailPassword,
  signInWithGoogle,
  signInWithApple,
  sendPasswordResetEmail,
  resendEmailVerification,
  checkEmailVerification,
  type FirebaseUser
} from '@/lib/firebase-auth';
import { useChakraStore } from '@/lib/store';

const ACCENT = SURFACE_ACCENT.you;
const INK = '#e9ecf5';
const MUTE = '#8a90a6';
const SUCCESS = '#36F5A6';
const WARNING = '#FFD23D';
const ERROR = '#FF4D5E';

type Mode = 'signup' | 'signin' | 'reset';
type Step = 'credentials' | 'verify' | 'success';

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

interface AppStoreAuthScreenProps {
  onAuthenticated?: (user: FirebaseUser) => void;
}

export default function AppStoreAuthScreen({ onAuthenticated }: AppStoreAuthScreenProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const profileComplete = useChakraStore((s) => s.profileComplete);
  
  const [mode, setMode] = useState<Mode>('signup');
  const [step, setStep] = useState<Step>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const nameRef = useRef<TextInput>(null);
  const sigilSize = Math.min(width - 200, 120);
  
  // Handle successful authentication
  const handleAuthSuccess = async (user: FirebaseUser) => {
    if (onAuthenticated) {
      onAuthenticated(user);
    }
    
    // Navigate based on profile completion
    router.replace(profileComplete ? '/paywall' : '/profile-setup');
  };
  
  // Submit credentials (signup/signin)
  const submitCredentials = async () => {
    setError(null);
    setIsLoading(true);
    
    try {
      if (!isEmail(email)) {
        throw new Error('Please enter a valid email address.');
      }
      
      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters long.');
      }
      
      if (mode === 'signup') {
        if (!displayName.trim()) {
          throw new Error('Please enter your name.');
        }
        
        const result = await signUpWithEmailPassword(email.trim(), password, displayName.trim());
        
        if (result.success && result.user) {
          if (result.needsVerification) {
            setNeedsVerification(true);
            setStep('verify');
          } else {
            await handleAuthSuccess(result.user);
          }
        } else {
          throw new Error(result.error || 'Signup failed');
        }
      } else {
        const result = await signInWithEmailPassword(email.trim(), password);
        
        if (result.success && result.user) {
          if (result.needsVerification) {
            setNeedsVerification(true);
            setStep('verify');
          } else {
            await handleAuthSuccess(result.user);
          }
        } else {
          throw new Error(result.error || 'Sign in failed');
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Send password reset email
  const sendResetEmail = async () => {
    setError(null);
    setIsLoading(true);
    
    try {
      if (!isEmail(email)) {
        throw new Error('Please enter a valid email address.');
      }
      
      const result = await sendPasswordResetEmail(email.trim());
      
      if (result.success) {
        setResetEmailSent(true);
        setStep('success');
      } else {
        throw new Error(result.error || 'Failed to send reset email');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle Google Sign-In
  const handleGoogleSignIn = async () => {
    setError(null);
    setIsLoading(true);
    
    try {
      const result = await signInWithGoogle();
      
      if (result.success && result.user) {
        await handleAuthSuccess(result.user);
      } else {
        throw new Error(result.error || 'Google sign in failed');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle Apple Sign-In
  const handleAppleSignIn = async () => {
    setError(null);
    setIsLoading(true);
    
    try {
      const result = await signInWithApple();
      
      if (result.success && result.user) {
        await handleAuthSuccess(result.user);
      } else {
        throw new Error(result.error || 'Apple sign in failed');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Resend email verification
  const handleResendVerification = async () => {
    setError(null);
    setIsLoading(true);
    
    try {
      const result = await resendEmailVerification();
      if (!result.success) {
        throw new Error(result.error || 'Failed to resend verification email');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Check verification status
  const checkVerification = async () => {
    setIsLoading(true);
    
    try {
      const isVerified = await checkEmailVerification();
      if (isVerified) {
        setStep('success');
        setTimeout(() => {
          // Navigate to app after showing success
          router.replace(profileComplete ? '/paywall' : '/profile-setup');
        }, 2000);
      } else {
        setError('Email not yet verified. Please check your email and try again.');
      }
    } catch (err: any) {
      setError('Failed to check verification status');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Switch between modes
  const switchMode = (newMode: Mode) => {
    setMode(newMode);
    setStep('credentials');
    setError(null);
    setNeedsVerification(false);
    setResetEmailSent(false);
    
    // Focus appropriate field
    setTimeout(() => {
      if (newMode === 'signup') {
        nameRef.current?.focus();
      } else {
        emailRef.current?.focus();
      }
    }, 300);
  };
  
  const goBack = () => {
    if (step === 'verify' || step === 'success') {
      setStep('credentials');
      setNeedsVerification(false);
      setResetEmailSent(false);
      setError(null);
    } else if (mode === 'reset') {
      switchMode('signin');
    }
  };

  return (
    <View className="bg-field flex-1">
      <StatusBar style="light" />

      {/* Header */}
      <View className="pt-safe-offset-3 flex-row items-center justify-between px-5">
        {(step !== 'credentials' || mode === 'reset') ? (
          <Pressable
            hitSlop={12}
            onPress={goBack}
            className="flex-row items-center gap-1"
          >
            <ChevronLeft color={MUTE} size={16} />
            <Mono>BACK</Mono>
          </Pressable>
        ) : (
          <View />
        )}
        
        <Pressable hitSlop={12} onPress={() => router.replace('/paywall')}>
          <Mono>SKIP</Mono>
        </Pressable>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 28, paddingBottom: 28 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo */}
          <View className="items-center pt-2">
            <SoftFade>
              <Logo width={sigilSize} />
            </SoftFade>
          </View>

          {/* Main Content */}
          {step === 'credentials' ? (
            <Animated.View 
              entering={SlideInLeft}
              exiting={SlideOutRight}
              className="mt-4"
            >
              <Mono style={{ color: ACCENT }}>
                {mode === 'signup' ? 'CHAKRAOS · CREATE ACCOUNT' : 
                 mode === 'signin' ? 'CHAKRAOS · WELCOME BACK' : 
                 'CHAKRAOS · RESET PASSWORD'}
              </Mono>
              <Display size={30} className="mt-2">
                {mode === 'signup' ? 'Begin your journey' : 
                 mode === 'signin' ? 'Continue your practice' : 
                 'Reset your password'}
              </Display>
              <Text className="text-mute mt-3" style={{ fontSize: 15, lineHeight: 23 }}>
                {mode === 'signup'
                  ? 'Create your chakraOS account to sync your data across devices and unlock all features.'
                  : mode === 'signin'
                    ? 'Sign in to access your personal frequency field and meditation history.'
                    : 'Enter your email address and we\'ll send you a link to reset your password.'}
              </Text>

              {/* Social Sign-In Buttons (only for signup/signin) */}
              {mode !== 'reset' && (
                <View className="mt-6 gap-3">
                  {/* Apple Sign-In (iOS only) */}
                  {Platform.OS === 'ios' && (
                    <SocialButton
                      onPress={handleAppleSignIn}
                      disabled={isLoading}
                      icon="🍎"
                      label="Continue with Apple"
                      style={{ backgroundColor: '#000000' }}
                      textColor="#ffffff"
                    />
                  )}
                  
                  {/* Google Sign-In */}
                  <SocialButton
                    onPress={handleGoogleSignIn}
                    disabled={isLoading}
                    icon="🔍"
                    label="Continue with Google"
                    style={{ backgroundColor: '#ffffff', borderColor: '#e0e0e0', borderWidth: 1 }}
                    textColor="#000000"
                  />
                  
                  {/* Divider */}
                  <View className="flex-row items-center gap-4 my-2">
                    <View className="flex-1 h-px bg-line" />
                    <Mono style={{ fontSize: 10, color: MUTE }}>OR</Mono>
                    <View className="flex-1 h-px bg-line" />
                  </View>
                </View>
              )}

              {/* Form Fields */}
              <View className="gap-3">
                {mode === 'signup' && (
                  <Field
                    ref={nameRef}
                    label="FULL NAME"
                    value={displayName}
                    onChangeText={setDisplayName}
                    placeholder="Enter your full name"
                    autoCapitalize="words"
                    autoComplete="name"
                    textContentType="name"
                    returnKeyType="next"
                    onSubmitEditing={() => emailRef.current?.focus()}
                  />
                )}
                
                <Field
                  ref={emailRef}
                  label="EMAIL"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                  returnKeyType={mode === 'reset' ? 'send' : 'next'}
                  onSubmitEditing={() => {
                    if (mode === 'reset') {
                      sendResetEmail();
                    } else {
                      passwordRef.current?.focus();
                    }
                  }}
                />
                
                {mode !== 'reset' && (
                  <Field
                    ref={passwordRef}
                    label="PASSWORD"
                    value={password}
                    onChangeText={setPassword}
                    placeholder="At least 6 characters"
                    secureTextEntry={!showPassword}
                    autoComplete="password"
                    textContentType={mode === 'signup' ? 'newPassword' : 'password'}
                    returnKeyType="done"
                    onSubmitEditing={submitCredentials}
                    rightIcon={
                      <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                        {showPassword ? (
                          <EyeOff color={MUTE} size={16} />
                        ) : (
                          <Eye color={MUTE} size={16} />
                        )}
                      </Pressable>
                    }
                  />
                )}
              </View>

              {/* Error Display */}
              {error && <ErrorText>{error}</ErrorText>}

              {/* Primary Action Button */}
              <PrimaryButton 
                busy={isLoading} 
                onPress={mode === 'reset' ? sendResetEmail : submitCredentials}
              >
                {mode === 'signup' ? 'CREATE ACCOUNT' : 
                 mode === 'signin' ? 'SIGN IN' : 
                 'SEND RESET EMAIL'}
              </PrimaryButton>

              {/* Secondary Actions */}
              {mode === 'signin' && (
                <Pressable 
                  className="mt-4 items-center" 
                  hitSlop={8} 
                  onPress={() => switchMode('reset')}
                >
                  <Mono style={{ color: ACCENT }}>FORGOT PASSWORD?</Mono>
                </Pressable>
              )}

              {/* Mode Switch */}
              <Pressable 
                className="mt-6 items-center" 
                hitSlop={8} 
                onPress={() => switchMode(mode === 'signup' ? 'signin' : 'signup')}
              >
                <Text className="text-mute" style={{ fontSize: 13 }}>
                  {mode === 'signup'
                    ? 'Already have an account? Sign in'
                    : 'New to chakraOS? Create an account'}
                </Text>
              </Pressable>
            </Animated.View>
          ) : step === 'verify' ? (
            <Animated.View 
              entering={SlideInLeft}
              exiting={SlideOutRight}
              className="mt-4"
            >
              <Mono style={{ color: ACCENT }}>CHAKRAOS · VERIFY EMAIL</Mono>
              <Display size={30} className="mt-2">
                Check your email
              </Display>
              <Text className="text-mute mt-3" style={{ fontSize: 15, lineHeight: 23 }}>
                We sent a verification link to{' '}
                <Text className="text-ink" style={{ fontSize: 15 }}>
                  {email.trim()}
                </Text>
                . Click the link in your email to verify your account.
              </Text>

              {error && <ErrorText>{error}</ErrorText>}

              <PrimaryButton busy={isLoading} onPress={checkVerification}>
                I'VE VERIFIED MY EMAIL
              </PrimaryButton>

              <Pressable
                className="mt-4 items-center"
                hitSlop={8}
                onPress={handleResendVerification}
              >
                <Mono style={{ color: ACCENT }}>RESEND VERIFICATION EMAIL</Mono>
              </Pressable>
            </Animated.View>
          ) : (
            <Animated.View 
              entering={BounceIn}
              className="mt-4 items-center"
            >
              <CheckCircle color={SUCCESS} size={64} />
              <Display size={24} className="mt-4" style={{ color: SUCCESS }}>
                {mode === 'reset' ? 'Reset Email Sent!' : 'Welcome to chakraOS!'}
              </Display>
              <Text className="text-mute mt-3 text-center" style={{ fontSize: 15, lineHeight: 23 }}>
                {mode === 'reset'
                  ? `Check your email at ${email} for password reset instructions.`
                  : 'Your account has been verified successfully.'}
              </Text>
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

// Components
function Field({ 
  label, 
  rightIcon, 
  ...rest 
}: { 
  label: string; 
  rightIcon?: React.ReactNode;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View>
      <Mono className="mb-2">{label}</Mono>
      <View className="relative">
        <TextInput
          placeholderTextColor="#3a4255"
          className="bg-panel border-line text-ink rounded-2xl border px-4 py-3.5"
          style={{ fontFamily: 'Inter_400Regular', fontSize: 15, color: INK, paddingRight: rightIcon ? 50 : 16 }}
          {...rest}
        />
        {rightIcon && (
          <View className="absolute right-4 top-0 bottom-0 justify-center">
            {rightIcon}
          </View>
        )}
      </View>
    </View>
  );
}

function SocialButton({
  onPress,
  disabled,
  icon,
  label,
  style,
  textColor = '#ffffff'
}: {
  onPress: () => void;
  disabled: boolean;
  icon: string;
  label: string;
  style?: any;
  textColor?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className="flex-row items-center justify-center gap-3 rounded-2xl py-4 px-6"
      style={[{ opacity: disabled ? 0.6 : 1 }, style]}
    >
      <Text style={{ fontSize: 18 }}>{icon}</Text>
      <Text style={{ fontSize: 14, fontFamily: 'Inter_500Medium', color: textColor }}>
        {label}
      </Text>
    </Pressable>
  );
}

function ErrorText({ children }: { children: string }) {
  return (
    <Animated.View entering={FadeInDown} exiting={FadeOutUp}>
      <View className="mt-4 p-3 rounded-xl flex-row items-center gap-2" style={{ backgroundColor: '#2D1B1B' }}>
        <AlertCircle color={ERROR} size={16} />
        <Text style={{ color: ERROR, fontSize: 13, fontFamily: 'Inter_400Regular', flex: 1 }}>
          {children}
        </Text>
      </View>
    </Animated.View>
  );
}

function PrimaryButton({
  children,
  busy,
  onPress,
}: {
  children: React.ReactNode;
  busy: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={busy}
      className="mt-6 flex-row items-center justify-center gap-2 rounded-full py-4"
      style={{ backgroundColor: ACCENT, opacity: busy ? 0.6 : 1 }}
      onPress={onPress}
    >
      {busy ? (
        <ActivityIndicator color="#0a0e18" size="small" />
      ) : (
        <>
          <Text className="font-mono-bold" style={{ fontSize: 13, color: '#0a0e18' }}>
            {children}
          </Text>
          <ArrowRight color="#0a0e18" size={16} />
        </>
      )}
    </Pressable>
  );
}