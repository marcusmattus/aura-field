import type { ConfigContext, ExpoConfig } from '@expo/config';

type ExpoPlugins = NonNullable<ExpoConfig['plugins']>;

export default ({ config }: ConfigContext): ExpoConfig => {
  const isDev = process.env.NODE_ENV === 'development';
  const nativePlugins: ExpoPlugins = !isDev
    ? [
        // Firebase plugins for production
        '@react-native-firebase/app',
        '@react-native-firebase/auth',
        // Google Sign-In
        ['@react-native-google-signin/google-signin', {
          webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
        }],
        // Apple Authentication (iOS only)
        'expo-apple-authentication',
        // Maps for location features
        'react-native-maps'
      ]
    : [
        ['expo-dev-client', { launchMode: 'most-recent' }],
        'react-native-maps'
      ];

  return {
    ...config,
    name: 'chakraOS',
    slug: 'chakraos',
    newArchEnabled: true,
    version: process.env.BILT_APP_VERSION ?? '1.0.0',
    orientation: 'portrait',
    userInterfaceStyle: 'dark', // Force dark mode for chakraOS
    scheme: 'chakraos',
    icon: './assets/icon.png',
    runtimeVersion: {
      policy: 'appVersion',
    },
    assetBundlePatterns: ['**/*'],
    
    // iOS Configuration for App Store
    ios: {
      icon: './assets/icon.png',
      supportsTablet: true,
      bundleIdentifier: process.env.BILT_IOS_BUNDLE_ID ?? 'com.yourcompany.chakraos',
      buildNumber: process.env.BILT_IOS_BUILD_NUMBER ?? '1',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSCameraUsageDescription: 'chakraOS uses the camera to create visual journals and meditation photos.',
        NSMicrophoneUsageDescription: 'Allow chakraOS to record voice journal entries and analyze breathing patterns.',
        NSLocationWhenInUseUsageDescription: 'chakraOS uses location to provide contextual meditation suggestions based on your environment.',
        NSUserTrackingUsageDescription: 'This allows chakraOS to provide personalized meditation insights while respecting your privacy.',
        // Apple Sign-In
        NSAppleSignInEnabled: true,
        // Firebase Auth URL Schemes
        CFBundleURLTypes: [
          {
            CFBundleURLName: 'firebase',
            CFBundleURLSchemes: [process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || 'chakraos']
          },
          {
            CFBundleURLName: 'google',
            CFBundleURLSchemes: [process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || 'com.yourcompany.chakraos']
          }
        ]
      },
      config: {
        googleSignIn: {
          reservedClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID
        }
      },
      associatedDomains: [
        `applinks:chakraos.app`,
        `applinks:*.chakraos.app`
      ]
    },
    
    // Android Configuration
    android: {
      package: process.env.BILT_ANDROID_PACKAGE ?? 'com.yourcompany.chakraos',
      versionCode: parseInt(process.env.BILT_ANDROID_VERSION_CODE ?? '1'),
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#05060A',
      },
      permissions: [
        'RECORD_AUDIO',
        'CAMERA',
        'ACCESS_FINE_LOCATION',
        'ACCESS_COARSE_LOCATION',
        'INTERNET',
        'ACCESS_NETWORK_STATE'
      ],
      config: {
        googleSignIn: {
          apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
          certificateHash: process.env.EXPO_PUBLIC_ANDROID_CERT_HASH
        }
      },
      intentFilters: [
        {
          action: 'VIEW',
          autoVerify: true,
          data: [
            {
              scheme: 'https',
              host: 'chakraos.app'
            }
          ],
          category: ['BROWSABLE', 'DEFAULT']
        }
      ]
    },
    
    // Web Configuration (for testing)
    web: {
      favicon: './assets/favicon.png',
      config: {
        firebase: {
          apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
          authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
          storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
          appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID_WEB
        }
      }
    },
    
    // App Store metadata
    extra: {
      appStoreAppId: process.env.BILT_APP_STORE_APP_ID,
      firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      eas: {
        projectId: process.env.EAS_PROJECT_ID
      }
    },
    
    // Enhanced plugins for App Store
    plugins: [
      'expo-router',
      'expo-font',
      
      // Splash screen
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
      
      // Audio permissions
      [
        'expo-audio',
        {
          microphonePermission: 'Allow chakraOS to record voice journal entries and analyze breathing patterns during meditation.',
        },
      ],
      
      // Notification permissions
      [
        'expo-notifications',
        {
          icon: './assets/notification-icon.png',
          color: '#36F5A6',
          defaultChannel: 'meditation-reminders'
        }
      ],
      
      // Privacy manifest for App Store
      [
        'expo-build-properties',
        {
          ios: {
            privacyManifestAggregationEnabled: true,
            newArchEnabled: true
          },
          android: {
            newArchEnabled: true,
            proguardMinifyEnabled: true
          }
        }
      ],
      
      ...nativePlugins,
    ],
    
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    
    // App Store optimization
    updates: {
      fallbackToCacheTimeout: 0,
      url: 'https://u.expo.dev/your-project-id'
    },
    
    // Privacy and security
    privacy: {
      analyticsEnabled: true,
      crashReportingEnabled: true
    }
  };
};
