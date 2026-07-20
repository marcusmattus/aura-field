import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowRight, ChevronLeft } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
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
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

import { Display, Logo, Mono, SoftFade } from '@/components/ui';
import { SURFACE_ACCENT } from '@/lib/chakras';
import { isFirebaseConfigured } from '@/lib/firebase';
import {
  confirmPhoneCode,
  googleAuthRequestConfig,
  sendPhoneCode,
  signInWithEmail,
  signInWithGoogle,
  signUpWithEmail,
} from '@/lib/firebaseAuth';
import { useChakraStore } from '@/lib/store';

WebBrowser.maybeCompleteAuthSession();

const ACCENT = SURFACE_ACCENT.you;
const INK = '#e9ecf5';
const MUTE = '#8a90a6';

type Mode = 'signup' | 'signin';
type Tab = 'email' | 'phone';
type Step = 'credentials' | 'verify-phone';

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export default function AuthScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const onAuthenticated = useChakraStore((s) => s.onAuthenticated);

  const [mode, setMode] = useState<Mode>('signup');
  const [tab, setTab] = useState<Tab>('email');
  const [step, setStep] = useState<Step>('credentials');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [phoneCode, setPhoneCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeRef = useRef<TextInput>(null);

  const googleCfg = googleAuthRequestConfig();
  const [googleRequest, googleResponse, promptGoogle] = Google.useIdTokenAuthRequest({
    clientId: googleCfg.webClientId,
    iosClientId: googleCfg.iosClientId,
    androidClientId: googleCfg.androidClientId,
    webClientId: googleCfg.webClientId,
  });

  const sigilSize = Math.min(width - 200, 120);

  const advanceToApp = async () => {
    await onAuthenticated();
    const { profileComplete } = useChakraStore.getState();
    router.replace(profileComplete ? '/paywall' : '/profile-setup');
  };

  const googleHandled = useRef<string | null>(null);

  useEffect(() => {
    if (googleResponse?.type !== 'success') return;
    const idToken = googleResponse.params.id_token;
    if (!idToken || googleHandled.current === idToken) return;
    googleHandled.current = idToken;
    setBusy(true);
    setError(null);
    void signInWithGoogle({ idToken }).then(async (res) => {
      setBusy(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      await onAuthenticated();
      const { profileComplete } = useChakraStore.getState();
      router.replace(profileComplete ? '/paywall' : '/profile-setup');
    });
  }, [googleResponse, onAuthenticated, router]);

  const submitEmail = async () => {
    setError(null);
    if (!isFirebaseConfigured) {
      setError('Firebase is not configured. Add EXPO_PUBLIC_FIREBASE_* env vars.');
      return;
    }
    if (!isEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    setBusy(true);
    const res =
      mode === 'signup'
        ? await signUpWithEmail(email.trim(), password)
        : await signInWithEmail(email.trim(), password);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    await advanceToApp();
  };

  const onGoogle = async () => {
    setError(null);
    if (!isFirebaseConfigured) {
      setError('Firebase is not configured.');
      return;
    }
    setBusy(true);
    if (Platform.OS === 'web') {
      const res = await signInWithGoogle();
      setBusy(false);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      await advanceToApp();
      return;
    }
    if (!googleRequest) {
      setBusy(false);
      setError('Google Sign-In is not ready. Set EXPO_PUBLIC_FIREBASE_GOOGLE_* client IDs.');
      return;
    }
    await promptGoogle();
    setBusy(false);
  };

  const submitPhone = async () => {
    setError(null);
    if (!phone.trim().startsWith('+')) {
      setError('Use E.164 format, e.g. +15551234567.');
      return;
    }
    setBusy(true);
    const res = await sendPhoneCode(phone.trim());
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setStep('verify-phone');
    setTimeout(() => codeRef.current?.focus(), 350);
  };

  const verifyPhone = async () => {
    setError(null);
    if (phoneCode.length < 6) {
      setError('Enter the 6-digit SMS code.');
      return;
    }
    setBusy(true);
    const res = await confirmPhoneCode(phoneCode);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    await advanceToApp();
  };

  return (
    <View className="bg-field flex-1">
      {/* eslint-disable-next-line react/style-prop-object -- expo-status-bar */}
      <StatusBar style="light" />

      <View className="pt-safe-offset-3 flex-row items-center justify-between px-5">
        {step === 'verify-phone' ? (
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
                Sign in with email, Google, or phone. Powered by Firebase Authentication.
              </Text>

              <View className="mt-5 flex-row gap-2">
                {(['email', 'phone'] as Tab[]).map((t) => (
                  <Pressable
                    key={t}
                    onPress={() => setTab(t)}
                    className="rounded-full px-4 py-2"
                    style={{ backgroundColor: tab === t ? ACCENT : '#141a28' }}
                  >
                    <Mono style={{ color: tab === t ? '#0a0e18' : MUTE }}>
                      {t === 'email' ? 'EMAIL' : 'PHONE'}
                    </Mono>
                  </Pressable>
                ))}
              </View>

              {tab === 'email' ? (
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
              ) : (
                <View className="mt-6 gap-3">
                  <Field
                    label="PHONE (E.164)"
                    value={phone}
                    onChangeText={setPhone}
                    placeholder="+15551234567"
                    keyboardType="phone-pad"
                    autoComplete="tel"
                    textContentType="telephoneNumber"
                  />
                  {Platform.OS === 'web' ? <View nativeID="recaptcha-container" /> : null}
                </View>
              )}

              {error ? <ErrorText>{error}</ErrorText> : null}

              <PrimaryButton
                busy={busy}
                onPress={tab === 'email' ? submitEmail : submitPhone}
              >
                {tab === 'email'
                  ? mode === 'signup'
                    ? 'CREATE ACCOUNT'
                    : 'SIGN IN'
                  : 'SEND SMS CODE'}
              </PrimaryButton>

              <Pressable
                className="border-line bg-panel mt-4 items-center rounded-full border py-3.5"
                disabled={busy}
                onPress={onGoogle}
              >
                <Mono>CONTINUE WITH GOOGLE</Mono>
              </Pressable>

              <Pressable
                className="mt-6 items-center"
                hitSlop={8}
                onPress={() => {
                  setMode((m) => (m === 'signup' ? 'signin' : 'signup'));
                  setError(null);
                }}
              >
                <Text className="text-mute" style={{ fontSize: 13 }}>
                  {mode === 'signup'
                    ? 'Already have an account? Sign in'
                    : 'New here? Create an account'}
                </Text>
              </Pressable>
            </View>
          ) : (
            <View className="mt-2">
              <Mono style={{ color: ACCENT }}>CHAKRAOS · VERIFY PHONE</Mono>
              <Display size={30} className="mt-2">
                Enter SMS code
              </Display>
              <Text className="text-mute mt-3" style={{ fontSize: 15, lineHeight: 23 }}>
                We sent a code to {phone.trim()}.
              </Text>
              <View className="mt-6">
                <Mono className="mb-2">6-DIGIT CODE</Mono>
                <TextInput
                  ref={codeRef}
                  value={phoneCode}
                  onChangeText={(t) => setPhoneCode(t.replace(/\D/g, '').slice(0, 6))}
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
              <PrimaryButton busy={busy} onPress={verifyPhone}>
                VERIFY &amp; CONTINUE
              </PrimaryButton>
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
