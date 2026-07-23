import type { ConfigContext, ExpoConfig } from '@expo/config';

type ExpoPlugins = NonNullable<ExpoConfig['plugins']>;

const EAS_PROJECT_ID =
  process.env.EAS_PROJECT_ID ??
  process.env.EXPO_PUBLIC_EAS_PROJECT_ID ??
  '72850474-28aa-405f-b427-7928da852b99';
const OWNER =
  process.env.EXPO_OWNER ?? process.env.EXPO_PUBLIC_EXPO_OWNER ?? 'gami-protocols-organization';

export default ({ config }: ConfigContext): ExpoConfig => {
  // react-native-maps is autolinked; it is not an Expo config plugin.
  const nativePlugins: ExpoPlugins =
    process.env.EXPO_PLATFORM === 'native'
      ? [['expo-dev-client', { launchMode: 'most-recent' }]]
      : [];

  const expoConfig: ExpoConfig = {
    ...config,
    name: 'Aura Field',
    slug: 'aura-field',
    newArchEnabled: true,
    version: process.env.BILT_APP_VERSION ?? '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'automatic',
    scheme: 'aura-field',
    icon: './assets/icon.png',
    runtimeVersion: {
      policy: 'appVersion',
    },
    assetBundlePatterns: ['**/*'],
    ios: {
      icon: './assets/icon.png',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
      supportsTablet: true,
      bundleIdentifier: process.env.BILT_IOS_BUNDLE_ID ?? 'com.aurafield.app',
    },
    android: {
      package: process.env.BILT_ANDROID_PACKAGE ?? 'com.aurafield.app',
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#05060A',
      },
    },
    web: {
      favicon: './assets/favicon.png',
    },
    extra: {
      appStoreAppId: process.env.BILT_APP_STORE_APP_ID,
      ...(EAS_PROJECT_ID ? { eas: { projectId: EAS_PROJECT_ID } } : {}),
    },
    plugins: [
      'expo-router',
      'expo-font',
      'expo-updates',
      [
        'expo-splash-screen',
        {
          image: './assets/splash-icon.png',
          imageWidth: 220,
          resizeMode: 'contain',
          backgroundColor: '#05060A',
          dark: {
            image: './assets/splash-icon.png',
            backgroundColor: '#05060A',
          },
        },
      ],
      [
        'expo-audio',
        {
          microphonePermission: 'Allow chakraOS to record voice journal entries on this device.',
        },
      ],
      ...nativePlugins,
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
  };

  if (OWNER) {
    expoConfig.owner = OWNER;
  }

  if (EAS_PROJECT_ID) {
    expoConfig.updates = {
      url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
      fallbackToCacheTimeout: 0,
    };
  }

  return expoConfig;
};
