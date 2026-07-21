import type { ConfigContext, ExpoConfig } from '@expo/config';

type ExpoPlugins = NonNullable<ExpoConfig['plugins']>;

const EAS_PROJECT_ID = process.env.EAS_PROJECT_ID ?? process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
const OWNER = process.env.EXPO_OWNER ?? process.env.EXPO_PUBLIC_EXPO_OWNER;

export default ({ config }: ConfigContext): ExpoConfig => {
  const nativePlugins: ExpoPlugins =
    process.env.EXPO_PLATFORM === 'native'
      ? [['expo-dev-client', { launchMode: 'most-recent' }], 'react-native-maps']
      : [];

  const existingEas =
    typeof config.extra?.eas === 'object' && config.extra.eas !== null
      ? (config.extra.eas as Record<string, unknown>)
      : {};

  const expoConfig: ExpoConfig = {
    ...config,
    name: config.name ?? 'Aura Field',
    slug: config.slug ?? 'aura-field',
    version: process.env.BILT_APP_VERSION ?? config.version ?? '1.0.0',
    ios: {
      ...config.ios,
      bundleIdentifier:
        process.env.BILT_IOS_BUNDLE_ID ?? config.ios?.bundleIdentifier ?? 'com.aurafield.app',
    },
    android: {
      ...config.android,
      package: process.env.BILT_ANDROID_PACKAGE ?? config.android?.package ?? 'com.aurafield.app',
    },
    extra: {
      ...config.extra,
      appStoreAppId: process.env.BILT_APP_STORE_APP_ID ?? config.extra?.appStoreAppId,
      ...(EAS_PROJECT_ID ? { eas: { ...existingEas, projectId: EAS_PROJECT_ID } } : {}),
    },
    plugins: [...(config.plugins ?? []), ...nativePlugins],
  };

  if (OWNER) {
    expoConfig.owner = OWNER;
  }

  if (EAS_PROJECT_ID) {
    expoConfig.updates = {
      ...config.updates,
      url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
      fallbackToCacheTimeout: config.updates?.fallbackToCacheTimeout ?? 0,
    };
  }

  return expoConfig;
};
