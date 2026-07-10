/**
 * FIREBASE CONFIGURATION — Initialize Firebase for chakraOS
 */

import { initializeApp } from '@react-native-firebase/app';
import { initializeFirebaseAuth } from './firebase-auth';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID_IOS, // Will use appropriate ID based on platform
};

let firebaseInitialized = false;

export async function initializeFirebase(): Promise<void> {
  if (firebaseInitialized) {
    return;
  }

  try {
    // Initialize Firebase
    const app = initializeApp(firebaseConfig);
    
    // Initialize Firebase Auth
    await initializeFirebaseAuth();
    
    firebaseInitialized = true;
    console.log('Firebase initialized successfully');
    
  } catch (error) {
    console.warn('Firebase initialization failed:', error);
    // Don't throw error to allow app to continue functioning
  }
}

export function isFirebaseInitialized(): boolean {
  return firebaseInitialized;
}