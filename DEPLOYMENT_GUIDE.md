# chakraOS App Store Deployment Guide

This comprehensive guide will help you deploy chakraOS to the Apple App Store and Google Play Store with full authentication and email features.

## 🚀 Prerequisites

### Apple Developer Account
- Apple Developer Program membership ($99/year)
- Certificates, Identifiers & Profiles configured
- App Store Connect app record created

### Google Play Console
- Google Play Console developer account ($25 one-time)
- App signing key uploaded
- Store listing created

### Firebase Setup
- Firebase project created
- Authentication providers enabled
- iOS and Android apps configured

### Backend Services
- Email service provider (SendGrid, Mailgun, etc.)
- API backend deployed
- Domain and SSL certificates

## 📱 Firebase Configuration

### 1. Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Create a new project named `chakraos-prod`
3. Enable Google Analytics (optional)

### 2. Enable Authentication Providers

```bash
# Navigate to Authentication > Sign-in method
# Enable the following providers:

✅ Email/Password
✅ Google
✅ Apple (iOS only)
```

### 3. Configure iOS App

1. **Add iOS App to Firebase:**
   - Bundle ID: `com.yourcompany.chakraos`
   - App nickname: `chakraOS iOS`
   - Download `GoogleService-Info.plist`

2. **Place Configuration File:**
   ```bash
   # Add GoogleService-Info.plist to your iOS project root
   cp GoogleService-Info.plist ios/chakraOS/
   ```

### 4. Configure Android App

1. **Add Android App to Firebase:**
   - Package name: `com.yourcompany.chakraos`
   - App nickname: `chakraOS Android`
   - Download `google-services.json`

2. **Place Configuration File:**
   ```bash
   # Add google-services.json to Android app folder
   cp google-services.json android/app/
   ```

## 🔑 Environment Configuration

### 1. Copy Environment Template

```bash
cp env.example .env
```

### 2. Fill in Firebase Configuration

```bash
# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=AIzaSyC-your-api-key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=chakraos-prod.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=chakraos-prod
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=chakraos-prod.appspot.com
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789012
EXPO_PUBLIC_FIREBASE_APP_ID_ANDROID=1:123456789012:android:your-android-id
EXPO_PUBLIC_FIREBASE_APP_ID_IOS=1:123456789012:ios:your-ios-id

# Google Sign-In Configuration
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=your-web-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=your-ios-client-id.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=your-android-client-id.apps.googleusercontent.com
```

### 3. Backend API Configuration

```bash
# Backend Configuration
EXPO_PUBLIC_API_URL=https://api.chakraos.app
EXPO_PUBLIC_API_KEY=your-backend-api-key
EXPO_PUBLIC_EMAIL_SERVICE_KEY=your-sendgrid-api-key
```

## 🍎 iOS App Store Setup

### 1. Configure App Store Connect

1. **Create App Record:**
   - Name: `chakraOS`
   - Bundle ID: `com.yourcompany.chakraos`
   - SKU: `chakraos-ios-2026`
   - Platform: `iOS`

2. **App Information:**
   - Primary Category: `Health & Fitness`
   - Secondary Category: `Lifestyle`
   - Content Rating: `4+`

### 2. Apple Sign-In Configuration

1. **Enable Sign In with Apple:**
   - Go to Certificates, Identifiers & Profiles
   - Select your App ID
   - Enable "Sign In with Apple"
   - Configure domains and email sources

2. **Update App Config:**
   ```typescript
   // In app.config.ts
   ios: {
     infoPlist: {
       NSAppleSignInEnabled: true,
       // ... other settings
     },
     associatedDomains: [
       'applinks:chakraos.app',
       'applinks:*.chakraos.app'
     ]
   }
   ```

### 3. Build and Upload to App Store

```bash
# Install EAS CLI
npm install -g @expo/eas-cli

# Log in to Expo
eas login

# Configure build profiles
eas build:configure

# Build for iOS App Store
eas build --platform ios --profile production-ios

# Submit to App Store Connect
eas submit --platform ios --profile production-ios
```

## 🤖 Google Play Store Setup

### 1. Configure Play Console

1. **Create App:**
   - App name: `chakraOS`
   - Default language: `English (United States)`
   - App or game: `App`
   - Free or paid: `Free`

2. **App Categories:**
   - Category: `Health & Fitness`
   - Tags: `Meditation`, `Wellness`, `Mindfulness`

### 2. Google Sign-In Configuration

1. **Configure OAuth Consent Screen:**
   - Go to Google Cloud Console
   - APIs & Services > OAuth consent screen
   - Add your app domain and privacy policy URL

2. **Create OAuth Client IDs:**
   ```bash
   # Create OAuth client for Android
   # Type: Android
   # Package name: com.yourcompany.chakraos
   # SHA-1: Your release signing certificate fingerprint
   ```

### 3. Build and Upload to Play Store

```bash
# Build Android App Bundle
eas build --platform android --profile production-android

# Submit to Google Play
eas submit --platform android --profile production-android
```

## 📧 Email Service Setup

### 1. SendGrid Configuration

```bash
# Sign up for SendGrid account
# Create API key with full access
# Add API key to environment variables

EXPO_PUBLIC_EMAIL_SERVICE_KEY=SG.your-sendgrid-api-key
```

### 2. Email Templates

Create the following templates in your email service:

- **Welcome Email** (`d-welcome-template-id`)
- **Password Reset** (`d-password-reset-template-id`)
- **Weekly Insights** (`d-weekly-insights-template-id`)
- **Feature Announcements** (`d-feature-update-template-id`)

### 3. Backend API Endpoints

Deploy these endpoints to handle email notifications:

```
POST /api/email/welcome
POST /api/email/password-reset-confirmation
POST /api/email/weekly-insights
POST /api/email/feature-announcement
POST /api/email/preferences
GET  /api/email/status
```

## 🔐 Security Configuration

### 1. App Transport Security (iOS)

```xml
<!-- In Info.plist -->
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsArbitraryLoads</key>
  <false/>
  <key>NSExceptionDomains</key>
  <dict>
    <key>chakraos.app</key>
    <dict>
      <key>NSExceptionAllowsInsecureHTTPLoads</key>
      <false/>
      <key>NSExceptionMinimumTLSVersion</key>
      <string>TLSv1.2</string>
    </dict>
  </dict>
</dict>
```

### 2. Network Security Config (Android)

```xml
<!-- In android/app/src/main/res/xml/network_security_config.xml -->
<network-security-config>
  <domain-config cleartextTrafficPermitted="false">
    <domain includeSubdomains="true">chakraos.app</domain>
  </domain-config>
</network-security-config>
```

## 📋 Pre-Submission Checklist

### iOS App Store

- [ ] App Store Connect record created
- [ ] Firebase iOS configuration added
- [ ] Apple Sign-In enabled and configured
- [ ] Privacy policy URL accessible
- [ ] App screenshots uploaded (all required sizes)
- [ ] App metadata and description complete
- [ ] Build uploaded and processed
- [ ] TestFlight testing completed
- [ ] Age rating questionnaire completed

### Google Play Store

- [ ] Play Console app created
- [ ] Firebase Android configuration added
- [ ] Google Sign-In OAuth configured
- [ ] Privacy policy URL accessible
- [ ] Store listing assets uploaded
- [ ] App bundle uploaded to internal testing
- [ ] Content rating questionnaire completed
- [ ] Data safety section completed

### General Requirements

- [ ] Firebase Authentication working
- [ ] Email service endpoints functional
- [ ] Password reset flow tested
- [ ] Social sign-in flows tested
- [ ] Privacy policy and terms of service published
- [ ] Backend API deployed and tested
- [ ] Analytics and crash reporting configured

## 🚦 Testing Checklist

### Authentication Flow

```bash
# Test all authentication methods:
✅ Email/password signup with verification
✅ Email/password signin
✅ Google Sign-In (iOS and Android)
✅ Apple Sign-In (iOS only)
✅ Password reset via email
✅ Email verification flow
✅ Account deletion
```

### Email Notifications

```bash
# Test all email types:
✅ Welcome email after signup
✅ Password reset confirmation
✅ Email verification reminders
✅ Weekly insights delivery
✅ Feature announcement emails
✅ Unsubscribe functionality
```

### App Store Compliance

```bash
# Verify compliance requirements:
✅ Privacy policy accessible from app
✅ Terms of service accessible
✅ Age rating appropriate (4+)
✅ No crashes or performance issues
✅ All features working as described
✅ Subscription terms clear and accurate
```

## 🚀 Deployment Commands

### Production Build

```bash
# Build for both platforms
eas build --platform all --profile production

# Build iOS only
eas build --platform ios --profile production-ios

# Build Android only  
eas build --platform android --profile production-android
```

### Store Submission

```bash
# Submit to App Store
eas submit --platform ios

# Submit to Play Store
eas submit --platform android

# Check submission status
eas submit --status
```

## 🔍 Monitoring and Analytics

### Firebase Analytics

```typescript
// Track key events
import analytics from '@react-native-firebase/analytics';

// Track authentication events
await analytics().logEvent('sign_up', {
  method: 'email'
});

// Track meditation sessions
await analytics().logEvent('meditation_session', {
  frequency: 432,
  duration: 900,
  chakra: 'heart'
});
```

### Crashlytics

```typescript
// Report crashes and errors
import crashlytics from '@react-native-firebase/crashlytics';

// Log errors
crashlytics().log('User authentication error');
crashlytics().recordError(error);
```

## 🆘 Troubleshooting

### Common Issues

1. **Firebase Configuration:**
   ```
   Error: Default Firebase app has not been initialized
   Solution: Ensure GoogleService-Info.plist and google-services.json are properly added
   ```

2. **Google Sign-In:**
   ```
   Error: DEVELOPER_ERROR
   Solution: Check OAuth client configuration and SHA-1 fingerprints
   ```

3. **Apple Sign-In:**
   ```
   Error: Not available on this device
   Solution: Verify Sign In with Apple is enabled in developer console
   ```

4. **Email Service:**
   ```
   Error: Failed to send email
   Solution: Check API credentials and email template IDs
   ```

### Debug Mode

```bash
# Enable debug logging
export EXPO_PUBLIC_DEBUG_MODE=true

# View Firebase Auth logs
export FIREBASE_AUTH_DEBUG=true

# Test email service locally
curl -X POST https://your-api.com/api/email/test \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-api-key" \
  -d '{"email": "test@example.com"}'
```

## 📞 Support

### Documentation Links

- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Expo EAS Build](https://docs.expo.dev/build/introduction/)
- [Apple App Store Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Google Play Policy](https://play.google.com/about/developer-content-policy/)

### Contact Information

- **Technical Issues**: development@chakraos.app
- **App Store Review**: appstore@chakraos.app
- **Privacy Questions**: privacy@chakraos.app
- **General Support**: support@chakraos.app

---

*This deployment guide ensures chakraOS meets all App Store requirements while providing a seamless authentication experience with comprehensive email notifications.*