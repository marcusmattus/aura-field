/**
 * ENHANCED AUTH SCREEN — Improved authentication UI with better UX
 */

import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { 
  ArrowRight, 
  ChevronLeft, 
  AlertCircle, 
  Wifi, 
  WifiOff,
  CheckCircle,
  Info
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
  SlideOutRight 
} from 'react-native-reanimated';

import { Display, Logo, Mono, SoftFade } from '@/components/ui';
import { SURFACE_ACCENT } from '@/lib/chakras';
import { useEnhancedAuth } from '@/hooks/useEnhancedAuth';
import { useChakraStore } from '@/lib/store';

const ACCENT = SURFACE_ACCENT.you;
const INK = '#e9ecf5';
const MUTE = '#8a90a6';
const SUCCESS = '#36F5A6';
const WARNING = '#FFD23D';
const ERROR = '#FF4D5E';

type Mode = 'signup' | 'signin';
type Step = 'credentials' | 'verify';

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export default function EnhancedAuthScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const profileComplete = useChakraStore((s) => s.profileComplete);
  
  const {
    isAuthenticated,
    isLoading,
    error,
    hasBackend,
    isOfflineMode,
    needsVerification,
    signUp,
    signIn,
    sendLoginCode,
    verifyCode,
    clearError,
    setNeedsVerification
  } = useEnhancedAuth();
  
  const [mode, setMode] = useState<Mode>('signup');
  const [step, setStep] = useState<Step>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [showTestHelper, setShowTestHelper] = useState(isOfflineMode);
  
  const codeRef = useRef<TextInput>(null);
  const sigilSize = Math.min(width - 200, 120);
  
  // Handle successful authentication
  useEffect(() => {
    if (isAuthenticated) {
      router.replace(profileComplete ? '/paywall' : '/profile-setup');
    }
  }, [isAuthenticated, profileComplete, router]);
  
  // Handle verification flow
  useEffect(() => {
    if (needsVerification) {
      setStep('verify');
      setTimeout(() => codeRef.current?.focus(), 350);
    }
  }, [needsVerification]);
  
  const submitCredentials = async () => {
    clearError();
    
    if (!isEmail(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    
    if (password.length < 6) {
      Alert.alert('Invalid Password', 'Password must be at least 6 characters long.');
      return;
    }
    
    if (mode === 'signup') {
      await signUp(email.trim(), password);
    } else {
      await signIn(email.trim(), password);
    }
  };
  
  const sendCode = async () => {
    clearError();
    
    if (!isEmail(email)) {
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    
    await sendLoginCode(email.trim());
  };
  
  const verify = async () => {
    clearError();
    
    if (code.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the complete 6-digit code.');
      return;
    }
    
    const type = mode === 'signup' ? 'signup' : 'email';
    await verifyCode(email.trim(), code, type);
  };
  
  const switchMode = () => {
    setMode((m) => (m === 'signup' ? 'signin' : 'signup'));
    setStep('credentials');
    setNeedsVerification(false);
    clearError();
    setCode('');
    setPassword('');
  };
  
  const createTestAccount = async () => {
    setEmail('test@chakraos.local');
    setPassword('chakraos123');
    
    // Auto-submit for offline testing
    setTimeout(async () => {
      await signUp('test@chakraos.local', 'chakraos123');
    }, 500);
  };
  
  const goBack = () => {
    if (step === 'verify') {
      setStep('credentials');
      setNeedsVerification(false);
      clearError();
    }
  };

  return (
    <View className="bg-field flex-1">
      <StatusBar style="light" />

      {/* Header */}
      <View className="pt-safe-offset-3 flex-row items-center justify-between px-5">
        {step === 'verify' ? (
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
        
        {/* Connection Status */}
        <View className="flex-row items-center gap-2">
          {isOfflineMode ? (
            <WifiOff color={WARNING} size={14} />
          ) : (
            <Wifi color={SUCCESS} size={14} />
          )}
          <Mono style={{ color: isOfflineMode ? WARNING : SUCCESS, fontSize: 10 }}>
            {isOfflineMode ? 'OFFLINE' : 'ONLINE'}
          </Mono>
        </View>
        
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

          {/* Offline Mode Notice */}
          {isOfflineMode && (
            <Animated.View 
              entering={FadeInDown.delay(300)}
              className="mt-4 p-3 rounded-xl flex-row items-center gap-3"
              style={{ backgroundColor: '#2A1810', borderColor: WARNING, borderWidth: 1 }}
            >
              <Info color={WARNING} size={16} />
              <View className="flex-1">
                <Text style={{ color: WARNING, fontSize: 12, fontFamily: 'Inter_500Medium' }}>
                  Offline Mode
                </Text>
                <Text style={{ color: '#CCB891', fontSize: 11, fontFamily: 'Inter_400Regular' }}>
                  No backend configured. Using local storage for development.
                </Text>
              </View>
            </Animated.View>
          )}

          {/* Main Content */}
          {step === 'credentials' ? (
            <Animated.View 
              entering={SlideInLeft}
              exiting={SlideOutRight}
              className="mt-2"
            >
              <Mono style={{ color: ACCENT }}>
                {mode === 'signup' ? 'CHAKRAOS · CREATE ACCOUNT' : 'CHAKRAOS · WELCOME BACK'}
              </Mono>
              <Display size={30} className="mt-2">
                {mode === 'signup' ? 'Begin your field' : 'Return to your field'}
              </Display>
              <Text className="text-mute mt-3" style={{ fontSize: 15, lineHeight: 23 }}>
                {mode === 'signup'
                  ? isOfflineMode
                    ? 'Create a local account for testing chakraOS. Your data stays on this device.'
                    : 'Your account holds your profile and intention. We email a 6-digit code to verify it.'
                  : isOfflineMode
                    ? 'Sign in with your local test credentials.'
                    : 'Sign in to pick up where you left off across devices.'}
              </Text>

              <View className="mt-6 gap-3">
                <Field
                  label="EMAIL"
                  value={email}
                  onChangeText={setEmail}
                  placeholder={isOfflineMode ? 'test@chakraos.local' : 'you@example.com'}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                />
                <Field
                  label="PASSWORD"
                  value={password}
                  onChangeText={setPassword}
                  placeholder={isOfflineMode ? 'chakraos123' : 'At least 6 characters'}
                  secureTextEntry
                  autoComplete="password"
                  textContentType="password"
                />
              </View>

              {error ? <ErrorText>{error}</ErrorText> : null}

              <PrimaryButton busy={isLoading} onPress={submitCredentials}>
                {mode === 'signup' 
                  ? (isOfflineMode ? 'CREATE LOCAL ACCOUNT' : 'SEND VERIFICATION CODE')
                  : 'SIGN IN'
                }
              </PrimaryButton>

              {/* Login code option (online only) */}
              {mode === 'signin' && !isOfflineMode && (
                <Pressable className="mt-4 items-center" hitSlop={8} onPress={sendCode}>
                  <Mono style={{ color: ACCENT }}>EMAIL ME A LOGIN CODE INSTEAD</Mono>
                </Pressable>
              )}

              {/* Test account helper (offline only) */}
              {isOfflineMode && showTestHelper && (
                <Animated.View 
                  entering={FadeInDown.delay(200)}
                  className="mt-4"
                >
                  <Pressable 
                    className="items-center p-3 rounded-xl"
                    style={{ backgroundColor: '#1A2233' }}
                    onPress={createTestAccount}
                    hitSlop={8}
                  >
                    <Mono style={{ color: ACCENT, fontSize: 11 }}>CREATE TEST ACCOUNT</Mono>
                    <Text style={{ color: MUTE, fontSize: 10, fontFamily: 'Inter_400Regular', marginTop: 2 }}>
                      Auto-fills test credentials
                    </Text>
                  </Pressable>
                </Animated.View>
              )}

              {/* Mode switch */}
              <Pressable className="mt-6 items-center" hitSlop={8} onPress={switchMode}>
                <Text className="text-mute" style={{ fontSize: 13 }}>
                  {mode === 'signup'
                    ? 'Already have an account? Sign in'
                    : 'New here? Create an account'}
                </Text>
              </Pressable>
            </Animated.View>
          ) : (
            <Animated.View 
              entering={SlideInLeft}
              exiting={SlideOutRight}
              className="mt-2"
            >
              <Mono style={{ color: ACCENT }}>CHAKRAOS · VERIFY</Mono>
              <Display size={30} className="mt-2">
                Enter your code
              </Display>
              <Text className="text-mute mt-3" style={{ fontSize: 15, lineHeight: 23 }}>
                We sent a 6-digit code to{' '}
                <Text className="text-ink" style={{ fontSize: 15 }}>
                  {email.trim()}
                </Text>
                . Enter it below to continue.
              </Text>

              <View className="mt-6">
                <Mono className="mb-2">6-DIGIT CODE</Mono>
                <TextInput
                  ref={codeRef}
                  value={code}
                  onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 6))}
                  placeholder="······"
                  placeholderTextColor="#3a4255"
                  keyboardType="number-pad"
                  maxLength={6}
                  textContentType="oneTimeCode"
                  className="bg-panel border-line text-ink rounded-2xl border px-4 py-4 text-center"
                  style={{
                    fontFamily: 'JetBrainsMono_500Medium',
                    fontSize: 28,
                    letterSpacing: 12,
                  }}
                />
              </View>

              {error ? <ErrorText>{error}</ErrorText> : null}

              <PrimaryButton busy={isLoading} onPress={verify}>
                VERIFY &amp; CONTINUE
              </PrimaryButton>

              <Pressable
                className="mt-4 items-center"
                hitSlop={8}
                onPress={mode === 'signup' ? submitCredentials : sendCode}
              >
                <Mono style={{ color: ACCENT }}>RESEND CODE</Mono>
              </Pressable>
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function Field({ label, ...rest }: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View>
      <Mono className="mb-2">{label}</Mono>
      <TextInput
        placeholderTextColor="#3a4255"
        className="bg-panel border-line text-ink rounded-2xl border px-4 py-3.5"
        style={{ fontFamily: 'Inter_400Regular', fontSize: 15, color: INK }}
        {...rest}
      />
    </View>
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