import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Text } from 'heroui-native';

import { Mono } from '@/components/ui';
import { supabase } from '@/lib/supabase';
import { useChakraStore } from '@/lib/store';

/**
 * Deep-link landing for magic link / OAuth (`aura-field://auth/callback`).
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string; access_token?: string; refresh_token?: string }>();
  const onAuthenticated = useChakraStore((s) => s.onAuthenticated);

  useEffect(() => {
    void (async () => {
      if (!supabase) {
        router.replace('/auth');
        return;
      }
      try {
        if (params.code) {
          await supabase.auth.exchangeCodeForSession(String(params.code));
        } else if (params.access_token && params.refresh_token) {
          await supabase.auth.setSession({
            access_token: String(params.access_token),
            refresh_token: String(params.refresh_token),
          });
        }
        await onAuthenticated();
        const { profileComplete } = useChakraStore.getState();
        router.replace(profileComplete ? '/(tabs)' : '/profile-setup');
      } catch {
        router.replace('/auth');
      }
    })();
  }, [params.code, params.access_token, params.refresh_token, onAuthenticated, router]);

  return (
    <View className="bg-field flex-1 items-center justify-center gap-3">
      <ActivityIndicator color="#36d6e7" />
      <Mono>COMPLETING SIGN-IN…</Mono>
      <Text className="text-mute" style={{ fontSize: 13 }}>
        One moment.
      </Text>
    </View>
  );
}
