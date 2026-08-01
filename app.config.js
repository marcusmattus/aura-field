/**
 * Dynamic Expo config (docs: https://docs.expo.dev/workflow/configuration/).
 *
 * Resolution: app.json (static) → this file (middleware) → final config.
 * Prefer app.config.js over app.config.ts for EAS Build: Node on build workers
 * does not reliably transpile TypeScript/`import type` without `tsx`.
 * Do not add app.config.ts alongside this file — if both exist, .ts wins.
 *
 * ESM `import` is not supported here; use `require()` / CommonJS only.
 */

const EAS_PROJECT_ID =
  process.env.EAS_PROJECT_ID ?? process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? undefined;
const OWNER = process.env.EXPO_OWNER ?? process.env.EXPO_PUBLIC_EXPO_OWNER ?? undefined;

module.exports = ({ config }) => {
  const nativePlugins =
    process.env.EXPO_PLATFORM === 'native'
      ? [['expo-dev-client', { launchMode: 'most-recent' }]]
      : [];

  const existingEas =
    typeof config.extra?.eas === 'object' && config.extra.eas !== null ? { ...config.extra.eas } : {};

  const projectId = EAS_PROJECT_ID ?? existingEas.projectId;

  const expoConfig = {
    ...config,
    name: config.name ?? 'Aura Field',
    // Must match Expo project @chakraos/chakraos
    slug: 'chakraos',
    owner: OWNER ?? config.owner ?? 'chakraos',
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
      eas: {
        ...existingEas,
        ...(projectId ? { projectId } : {}),
      },
    },
    plugins: [...(config.plugins ?? []), ...nativePlugins],
  };

  if (projectId) {
    expoConfig.updates = {
      ...config.updates,
      url: `https://u.expo.dev/${projectId}`,
      fallbackToCacheTimeout: config.updates?.fallbackToCacheTimeout ?? 0,
    };
  }

  return expoConfig;
};
