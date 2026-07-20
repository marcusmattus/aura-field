// oxlint-disable-next-line eslint-plugin-import/no-unassigned-import
import '../global.css';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';
import { Outfit_500Medium, Outfit_600SemiBold, Outfit_700Bold } from '@expo-google-fonts/outfit';
import {
  JetBrainsMono_400Regular,
  JetBrainsMono_500Medium,
  JetBrainsMono_700Bold,
} from '@expo-google-fonts/jetbrains-mono';
import { Lora_400Regular_Italic, Lora_500Medium_Italic } from '@expo-google-fonts/lora';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { useEffect, useState } from 'react';
import { HeroUINativeProvider } from 'heroui-native';
import { Uniwind } from 'uniwind';
import {
  ErrorBoundary as ExpoErrorBoundary,
  type ErrorBoundaryProps,
  SplashScreen,
  Stack,
  useRouter,
  useSegments,
} from 'expo-router';

import { initPostHog } from '@/lib/posthog';
import { reportErrorToParent } from '@/lib/reportPreviewError';
import { useChakraStore } from '@/lib/store';
import { useCloudHydration } from '@/lib/sync/hydrate';
import { restoreSession } from '@/lib/supabase';

/**
 * Custom ErrorBoundary that reports React render errors to the parent window (Bilt preview iframe)
 * and then renders the default Expo error UI.
 */
function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  useEffect(() => {
    if (Platform.OS === 'web' && error) {
      const message = [error.message, error.stack].filter(Boolean).join('\n');
      reportErrorToParent(message);
    }
  }, [error]);
  return <ExpoErrorBoundary error={error} retry={retry} />;
}

export { ErrorBoundary };

/**
 * Routes a first-run user through the full entry flow before the tabs:
 * onboarding slides -> auth (sign in) -> profile intake -> paywall.
 * Each stage is gated on the prior one being complete.
 */
function useAccessGate(navigatorReady: boolean) {
  const router = useRouter();
  const segments = useSegments();
  const hydrated = useChakraStore((s) => s.hydrated);
  const onboarded = useChakraStore((s) => s.onboarded);
  const authenticated = useChakraStore((s) => s.authenticated);
  const profileComplete = useChakraStore((s) => s.profileComplete);

  useCloudHydration(authenticated && profileComplete);

  useEffect(() => {
    if (!navigatorReady || !hydrated) return;
    const first = segments[0];

    if (!onboarded) {
      if (first !== 'onboarding') router.replace('/onboarding');
      return;
    }
    if (!authenticated) {
      if (first !== 'auth' && first !== 'onboarding') router.replace('/auth');
      return;
    }
    if (!profileComplete) {
      if (
        first !== 'profile-setup' &&
        first !== 'paywall' &&
        first !== 'auth' &&
        first !== 'check-in'
      ) {
        router.replace('/profile-setup');
      }
    }
  }, [navigatorReady, hydrated, onboarded, authenticated, profileComplete, segments, router]);
}

// chakraOS is dark-only (clinical mysticism).
Uniwind.setTheme('dark');

void SplashScreen.preventAutoHideAsync();

/**
 * Must render under QueryClientProvider — useAccessGate → useCloudHydration uses useQuery.
 */
function RootNavigator({ navigatorReady }: { navigatorReady: boolean }) {
  useAccessGate(navigatorReady);

  return (
    <HeroUINativeProvider>
      <Stack screenOptions={{ contentStyle: { backgroundColor: '#0a0e18' } }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="auth" options={{ headerShown: false, animation: 'fade' }} />
        <Stack.Screen name="auth/callback" options={{ headerShown: false }} />
        <Stack.Screen name="profile-setup" options={{ headerShown: false }} />
        <Stack.Screen name="paywall" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen name="check-in" options={{ presentation: 'modal', headerShown: false }} />
        <Stack.Screen
          name="inspector/[chakra]"
          options={{ presentation: 'modal', headerShown: false }}
        />
        <Stack.Screen name="session" options={{ presentation: 'modal', headerShown: false }} />
      </Stack>
    </HeroUINativeProvider>
  );
}

export default function RootLayout() {
  const [queryClient] = useState(() => new QueryClient());
  const [loaded, error] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Outfit_500Medium,
    Outfit_600SemiBold,
    Outfit_700Bold,
    JetBrainsMono_400Regular,
    JetBrainsMono_500Medium,
    JetBrainsMono_700Bold,
    Lora_400Regular_Italic,
    Lora_500Medium_Italic,
  });

  // Harden cold-start session restore early
  useEffect(() => {
    void restoreSession().then((ok) => {
      if (ok) void useChakraStore.getState().onAuthenticated();
    });
  }, []);

  // Report uncaught JS errors and unhandled promise rejections to parent (Bilt preview iframe)
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;

    const handleError = (event: ErrorEvent) => {
      const message = event.error?.stack ?? event.message ?? 'Unknown error';
      reportErrorToParent(message);
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const err = event.reason;
      const message =
        err instanceof Error ? [err.message, err.stack].filter(Boolean).join('\n') : String(err);
      reportErrorToParent(message);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Inject Google Fonts link tag for web to ensure fonts load through proxy
  // Also register font family names as fallback if expo-font fails
  useEffect(() => {
    if (Platform.OS === 'web') {
      // Check if link already exists
      const existingLink = document.querySelector(
        'link[href*="fonts.googleapis.com/css2?family=Inter"]',
      );

      if (!existingLink) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href =
          'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap';
        link.crossOrigin = 'anonymous';
        document.head.appendChild(link);
      }

      // Note: The @import in global.css and the link tag above ensure Inter font loads
      // expo-font will register the font family names (Inter_400Regular, etc.)
      // If expo-font fails due to proxy issues, the fonts should still be available
      // via the direct Google Fonts CDN link, though the specific font family names
      // might not be registered. The app should still render with Inter font.
    }
  }, []);

  // Dev-client menu helpers — skip entirely in Expo Go (no native dev-client).
  useEffect(() => {
    const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
    if (!__DEV__ || Platform.OS === 'web' || isExpoGo) return undefined;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    void import('expo-dev-client')
      .then((DevClient) => {
        if (cancelled) return;
        timer = setTimeout(() => {
          DevClient.closeMenu();
          DevClient.hideMenu();
        }, 1000);
      })
      .catch(() => {
        // Expo Go / missing native module — ignore.
      });

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      initPostHog();
    }
  }, []);

  useEffect(() => {
    if (loaded || error) {
      void SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  // The Stack navigator only mounts once fonts are resolved. Gate navigation on
  // that so we never call router.replace before the Root Layout has rendered a
  // navigator (which throws "Attempted to navigate before mounting...").
  const navigatorReady = loaded || Boolean(error);

  if (!loaded && !error) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <RootNavigator navigatorReady={navigatorReady} />
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}
