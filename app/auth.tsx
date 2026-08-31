import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ArrowRight } from 'lucide-react-native';
import { useState } from 'react';
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
import {
  authProvider,
  sendPasswordReset,
  signInEmail,
  signInWithOAuth,
  signUpEmail,
} from '@/lib/auth';
import { SURFACE_ACCENT } from '@/lib/chakras';
import { useChakraStore } from '@/lib/store';

const ACCENT = SURFACE_ACCENT.you;
const INK = '#e9ecf5';
const MUTE = '#8a90a6';

type Mode = 'signup' | 'signin';

function isEmail(v: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
}

export default function AuthScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [mode, setMode] = useState<Mode>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const sigilSize = Math.min(width - 200, 120);

  const advanceToApp = async () => {
    // Firebase can own auth while Supabase continues as the data backend.
    useChakraStore.setState({ authenticated: true });
    const { profileComplete } = useChakraStore.getState();
    router.replace(profileComplete ? '/paywall' : '/profile-setup');
  };

  const submitCredentials = async () => {
    setError(null);
    setNotice(null);
    if (!isEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setBusy(true);
    const result =
      mode === 'signup'
        ? await signUpEmail(email.trim(), password)
        : await signInEmail(email.trim(), password);
    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    if (mode === 'signup' && authProvider === 'firebase') {
      setNotice('Account created. Check your inbox to verify your email.');
    }
    await advanceToApp();
  };

  const requestPasswordReset = async () => {
    setError(null);
    setNotice(null);
    if (!isEmail(email)) {
      setError('Enter your email address first, then tap Forgot password.');
      return;
    }

    setBusy(true);
    const result = await sendPasswordReset(email.trim());
    setBusy(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNotice('If that email has an account, a reset link is on its way.');
  };

  const switchMode = () => {
    setMode((m) => (m === 'signup' ? 'signin' : 'signup'));
    setError(null);
    setNotice(null);
    setPassword('');
  };

  return (
    <View className="bg-field flex-1">
      <StatusBar style="light" />

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
          <View className="pt-safe-offset-6 items-center">
            <SoftFade>
              <Logo width={sigilSize} />
            </SoftFade>
          </View>

          <View className="mt-6">
            <Mono style={{ color: ACCENT }}>
              {mode === 'signup' ? 'CHAKRAOS · CREATE ACCOUNT' : 'CHAKRAOS · WELCOME BACK'}
            </Mono>
            <Display size={30} className="mt-2">
              {mode === 'signup' ? 'Begin your field' : 'Return to your field'}
            </Display>
            <Text className="text-mute mt-3" style={{ fontSize: 15, lineHeight: 23 }}>
              {mode === 'signup'
                ? 'Create your private ChakraOS account with email and password.'
                : 'Sign in to continue your journal, field and practice history.'}
            </Text>
            <Mono className="mt-3" style={{ color: MUTE }}>
              AUTH · {authProvider.toUpperCase()}
            </Mono>

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
            {notice ? <NoticeText>{notice}</NoticeText> : null}

            <PrimaryButton busy={busy} onPress={submitCredentials}>
              {mode === 'signup' ? 'CREATE ACCOUNT' : 'SIGN IN'}
            </PrimaryButton>

            {mode === 'signin' ? (
              <Pressable
                className="mt-4 items-center"
                disabled={busy}
                hitSlop={8}
                onPress={requestPasswordReset}
              >
                <Text className="text-mute" style={{ fontSize: 13 }}>
                  Forgot password?
                </Text>
              </Pressable>
            ) : null}

            <View className="mt-6 flex-row gap-3">
              <Pressable
                className="border-line bg-panel flex-1 items-center rounded-full border py-3"
                disabled={busy}
                onPress={async () => {
                  setBusy(true);
                  setError(null);
                  const res = await signInWithOAuth('apple');
                  setBusy(false);
                  if (!res.ok) return setError(res.error);
                  await advanceToApp();
                }}
              >
                <Mono>APPLE</Mono>
              </Pressable>
              <Pressable
                className="border-line bg-panel flex-1 items-center rounded-full border py-3"
                disabled={busy}
                onPress={async () => {
                  setBusy(true);
                  setError(null);
                  const res = await signInWithOAuth('google');
                  setBusy(false);
                  if (!res.ok) return setError(res.error);
                  await advanceToApp();
                }}
              >
                <Mono>GOOGLE</Mono>
              </Pressable>
            </View>

            <Pressable className="mt-6 items-center" hitSlop={8} onPress={switchMode}>
              <Text className="text-mute" style={{ fontSize: 13 }}>
                {mode === 'signup'
                  ? 'Already have an account? Sign in'
                  : 'New here? Create an account'}
              </Text>
            </Pressable>
          </View>
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

function NoticeText({ children }: { children: string }) {
  return (
    <Text className="mt-4" style={{ color: ACCENT, fontSize: 13, fontFamily: 'Inter_400Regular' }}>
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
