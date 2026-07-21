const EAS_PROJECT_ID = process.env.EAS_PROJECT_ID ?? process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
const OWNER = process.env.EXPO_OWNER ?? process.env.EXPO_PUBLIC_EXPO_OWNER;

/** @param {{ config: Record<string, any> }} ctx */
module.exports = ({ config }) => {
  const nativePlugins =
    process.env.EXPO_PLATFORM === 'native'
      ? [['expo-dev-client', { launchMode: 'most-recent' }]]
      : [];

  const existingEas =
    typeof config.extra?.eas === 'object' && config.extra.eas !== null ? config.extra.eas : {};

  const expoConfig = {
    ...config,
    name: config.name ?? 'Aura Field',
    // Must match Expo project linked to EAS_PROJECT_ID (expo.dev/@chakraos/chakraos).
    slug: 'chakraos',
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
