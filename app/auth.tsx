import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowRight, ChevronLeft } from 'lucide-react-native';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  useWindowDimensions,
  View,
} from 'react-native';
import { Text } from 'heroui-native';

import { Display, Logo, Mono, SoftFade } from '@/components/ui';
import { SURFACE_ACCENT } from '@/lib/chakras';
import { useChakraStore } from '@/lib/store';
import { sendLoginCode, signInWithPassword, signUpWithEmail, verifyEmailOtp } from '@/lib/supabase';

const ACCENT = SURFACE_ACCENT.you;
const INK = '#e9ecf5';
const MUTE = '#8a90a6';

type Mode = 'signup' | 'signin';
type Step = 'credentials' | 'verify';

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export default function AuthScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const onAuthenticated = useChakraStore((s) => s.onAuthenticated);

  const [mode, setMode] = useState<Mode>('signup');
  const [step, setStep] = useState<Step>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeRef = useRef<TextInput>(null);

  const sigilSize = Math.min(width - 200, 120);

  const advanceToApp = async () => {
    await onAuthenticated();
    const { profileComplete } = useChakraStore.getState();
    router.replace(profileComplete ? '/paywall' : '/profile-setup');
  };

  const submitCredentials = async () => {
    setError(null);
    if (!isEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setBusy(true);
    if (mode === 'signup') {
      const res = await signUpWithEmail(email.trim(), password);
      setBusy(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setStep('verify');
      setTimeout(() => codeRef.current?.focus(), 350);
    } else {
      // Returning member: try password first; fall back to an email code.
      const res = await signInWithPassword(email.trim(), password);
      if (res.ok) {
        setBusy(false);
        await advanceToApp();
        return;
      }
      setBusy(false);
      setError(res.error);
    }
  };

  const sendCode = async () => {
    setError(null);
    if (!isEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }
    setBusy(true);
    const res = await sendLoginCode(email.trim());
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setStep('verify');
    setTimeout(() => codeRef.current?.focus(), 350);
  };

  const verify = async () => {
    setError(null);
    if (code.length !== 6) {
      setError('Enter the 6-digit code from your email.');
      return;
    }
    setBusy(true);
    const type = mode === 'signup' ? 'signup' : 'email';
    const res = await verifyEmailOtp(email.trim(), code, type);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    await advanceToApp();
  };

  const switchMode = () => {
    setMode((m) => (m === 'signup' ? 'signin' : 'signup'));
    setStep('credentials');
    setError(null);
    setCode('');
    setPassword('');
  };

  return (
    <View className="bg-field flex-1">
      {/* eslint-disable-next-line react/style-prop-object -- expo-status-bar `style` is a string enum */}
      <StatusBar style="light" />

      <View className="pt-safe-offset-3 flex-row items-center justify-between px-5">
        {step === 'verify' ? (
          <Pressable
            hitSlop={12}
            onPress={() => {
              setStep('credentials');
              setError(null);
            }}
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
          <View className="items-center pt-2">
            <SoftFade>
              <Logo width={sigilSize} />
            </SoftFade>
          </View>

          {step === 'credentials' ? (
            <View className="mt-2">
              <Mono style={{ color: ACCENT }}>
                {mode === 'signup' ? 'CHAKRAOS · CREATE ACCOUNT' : 'CHAKRAOS · WELCOME BACK'}
              </Mono>
              <Display size={30} className="mt-2">
                {mode === 'signup' ? 'Begin your field' : 'Return to your field'}
              </Display>
              <Text className="text-mute mt-3" style={{ fontSize: 15, lineHeight: 23 }}>
                {mode === 'signup'
                  ? 'Your account holds your profile and intention. We email a 6-digit code to verify it.'
                  : 'Sign in to pick up where you left off across this device.'}
              </Text>

              <View className="mt-6 gap-3">
                <Field
                  label="EMAIL"
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  textContentType="emailAddress"
                />
                <Field
                  label="PASSWORD"
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 6 characters"
                  secureTextEntry
                  autoComplete="password"
                  textContentType="password"
                />
              </View>

              {error ? <ErrorText>{error}</ErrorText> : null}

              <PrimaryButton busy={busy} onPress={submitCredentials}>
                {mode === 'signup' ? 'SEND VERIFICATION CODE' : 'SIGN IN'}
              </PrimaryButton>

              {mode === 'signin' ? (
                <Pressable className="mt-4 items-center" hitSlop={8} onPress={sendCode}>
                  <Mono style={{ color: ACCENT }}>EMAIL ME A LOGIN CODE INSTEAD</Mono>
                </Pressable>
              ) : null}

              <Pressable className="mt-6 items-center" hitSlop={8} onPress={switchMode}>
                <Text className="text-mute" style={{ fontSize: 13 }}>
                  {mode === 'signup'
                    ? 'Already have an account? Sign in'
                    : 'New here? Create an account'}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View className="mt-2">
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

              <PrimaryButton busy={busy} onPress={verify}>
                VERIFY &amp; CONTINUE
              </PrimaryButton>

              <Pressable
                className="mt-4 items-center"
                hitSlop={8}
                onPress={mode === 'signup' ? submitCredentials : sendCode}
              >
                <Mono style={{ color: ACCENT }}>RESEND CODE</Mono>
              </Pressable>
            </View>
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
    <Text
      className="mt-4"
      style={{ color: '#ff6b6b', fontSize: 13, fontFamily: 'Inter_400Regular' }}
    >
      {children}
    </Text>
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
