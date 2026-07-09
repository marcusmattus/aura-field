# chakraOS Authentication Setup Guide

This guide will help you set up fully operational authentication for chakraOS.

## 🎯 Current Status

✅ **Authentication system is complete and operational**

The login system includes:
- Supabase email/password authentication with OTP verification
- Offline mode for development and testing
- Enhanced error handling and user experience
- Visual connection status indicators
- Automatic fallback to local storage when backend unavailable

## 🚀 Quick Start (Offline Mode)

**For immediate testing without any setup:**

1. Run the app: `npx expo start`
2. Navigate to the auth screen
3. You'll see "OFFLINE MODE" with a yellow wifi icon
4. Click "CREATE TEST ACCOUNT" to auto-fill test credentials
5. Sign up creates a local account instantly - no verification needed

## 🔧 Production Setup (Supabase Backend)

### Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Note your **Project URL** and **Anon Key** from Settings → API

### Step 2: Configure Environment Variables

Create a `.env` file in the project root:

```env
# Supabase Configuration
EXPO_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Step 3: Set Up Database Schema

In your Supabase SQL Editor, run:

```sql
-- Create profiles table
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  birthdate DATE,
  focus_areas TEXT[],
  baseline_mood INTEGER CHECK (baseline_mood >= 1 AND baseline_mood <= 5),
  experience_level TEXT CHECK (experience_level IN ('new', 'some', 'devoted')),
  primary_intention TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own profile" 
  ON profiles FOR SELECT 
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" 
  ON profiles FOR UPDATE 
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" 
  ON profiles FOR INSERT 
  WITH CHECK (auth.uid() = id);
```

### Step 4: Configure Email Authentication

In Supabase Dashboard → Authentication → Settings:

1. **Email Templates**: Customize the verification email template
2. **Email Auth**: Enable email signup
3. **Email OTP**: Enable email OTP (6-digit codes)
4. **Site URL**: Set to your app's URL scheme (`chakraos://`)

## 🎨 Features Overview

### 🔄 Authentication Flow

1. **Signup**: Email + password → email verification → profile setup
2. **Signin**: Email + password OR email OTP code
3. **Offline**: Local account creation and authentication
4. **Auto-sync**: Session persistence across app launches

### 🌐 Mode Detection

The app automatically detects:
- **Online Mode**: Supabase credentials configured, green wifi icon
- **Offline Mode**: No backend configured, yellow wifi icon with test helpers

### 🛡️ Security Features

- Email verification required for new accounts
- Secure password requirements (min 6 characters)
- Session persistence with automatic refresh
- Row-level security for user data
- Offline accounts stored locally with basic protection

### 📱 User Experience

- Real-time connection status indicators
- Smooth animated transitions between auth steps
- Enhanced error messages with actionable guidance
- One-click test account creation in offline mode
- Comprehensive settings panel with user info and logout

## 🧪 Testing Checklist

### Online Mode (with Supabase)
- [ ] Sign up with email/password → receives verification email
- [ ] Verify email with 6-digit code → advances to profile setup
- [ ] Sign in with email/password → immediately accesses app
- [ ] Sign in with email OTP → receives code, verifies, accesses app
- [ ] Session persistence → app remembers login after restart
- [ ] Sign out → returns to auth screen, clears session

### Offline Mode (development)
- [ ] Shows "OFFLINE MODE" notice with warning styling
- [ ] Test account creation → auto-fills credentials
- [ ] Local account signup → immediate access (no verification)
- [ ] Local account signin → remembers credentials locally
- [ ] Session persistence → remembers offline user
- [ ] Sign out → clears local storage

### Error Handling
- [ ] Invalid email format → shows helpful error
- [ ] Weak password → shows password requirements
- [ ] Network errors → graceful fallback with error explanation
- [ ] Invalid verification code → clear error message
- [ ] Account already exists → appropriate error message

## 📋 Auth Settings Panel

Located in the "You" tab, provides:

- **User Info**: Email, display name, connection status
- **Account Type**: Online (Supabase) vs Offline (local)
- **Actions**: Edit profile, sign out with confirmation
- **Development Info**: User ID, backend status (in dev mode)

## 🔧 Troubleshooting

### "Backend is not configured" Error

**Cause**: Missing or invalid Supabase environment variables

**Solution**: 
1. Check your `.env` file exists and has correct values
2. Restart the Expo development server
3. Verify Supabase project URL and key are correct

### Email Verification Not Working

**Cause**: Email configuration issues in Supabase

**Solution**:
1. Check Supabase → Authentication → Settings → Email Templates
2. Verify your email provider settings
3. Check spam folder for verification emails
4. Ensure site URL is configured correctly

### Session Not Persisting

**Cause**: AsyncStorage or Supabase session configuration

**Solution**:
1. Clear app data: `npx expo start --clear`
2. Check Supabase session settings
3. Verify AsyncStorage permissions on device

### Offline Mode Stuck

**Cause**: Environment variables detected but Supabase unreachable

**Solution**:
1. Check internet connection
2. Verify Supabase project is active
3. Temporarily remove `.env` to force offline mode
4. Check Supabase status page

## 🚦 Environment Setup Commands

```bash
# Install dependencies
npm install

# Copy environment template
cp env.example .env

# Edit environment variables
# Add your Supabase URL and key

# Start development server
npx expo start

# Clear cache if needed
npx expo start --clear
```

## 🎉 Success Indicators

You'll know authentication is working when:

1. **Online Mode**: Green wifi icon, Supabase features work
2. **Proper Flow**: Signup → verification → profile → app
3. **Session Persistence**: App remembers login after restart
4. **Settings Panel**: Shows user info and connection status
5. **Smooth UX**: Animated transitions, clear error messages

---

## 🚀 Ready to Launch!

Your chakraOS authentication system is now fully operational with:
- Production-ready Supabase integration
- Development-friendly offline mode  
- Enhanced security and user experience
- Comprehensive error handling
- Beautiful, responsive interface

Users can now create accounts, sign in securely, and have their sessions persist across app launches! 🌟