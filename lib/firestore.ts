/**
 * Cloud Firestore helpers for ChakraOS user data.
 * Follows firebase-firestore standard web SDK patterns.
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  limit as fsLimit,
  type DocumentData,
} from 'firebase/firestore';

import { db, isFirebaseConfigured } from '@/lib/firebase';
import type { BaselineMood, ChakraKey, ExperienceLevel, UserProfile } from '@/lib/types';

function requireDb() {
  if (!db || !isFirebaseConfigured) {
    throw new Error('Firestore is not configured.');
  }
  return db;
}

export async function fetchUserProfile(uid: string, email = ''): Promise<UserProfile | null> {
  const database = requireDb();
  const snap = await getDoc(doc(database, 'users', uid));
  if (!snap.exists()) return null;
  const data = snap.data() as DocumentData;
  return {
    id: uid,
    email: (data.email as string) ?? email,
    displayName: (data.displayName as string) ?? '',
    birthdate: (data.birthdate as string | null) ?? null,
    focusAreas: (data.focusAreas as ChakraKey[]) ?? [],
    baselineMood: (data.baselineMood as BaselineMood | null) ?? null,
    experienceLevel: (data.experienceLevel as ExperienceLevel | null) ?? null,
    primaryIntention: (data.primaryIntention as string) ?? '',
  };
}

export async function saveUserProfile(
  uid: string,
  patch: Omit<UserProfile, 'id' | 'email'> & { email?: string },
): Promise<UserProfile> {
  const database = requireDb();
  const ref = doc(database, 'users', uid);
  const existing = await getDoc(ref);
  const payload = {
    displayName: patch.displayName,
    email: patch.email ?? '',
    birthdate: patch.birthdate,
    focusAreas: patch.focusAreas,
    baselineMood: patch.baselineMood,
    experienceLevel: patch.experienceLevel,
    primaryIntention: patch.primaryIntention,
    updatedAt: serverTimestamp(),
    ...(existing.exists() ? {} : { createdAt: serverTimestamp() }),
  };
  await setDoc(ref, payload, { merge: true });
  return {
    id: uid,
    email: patch.email ?? '',
    displayName: patch.displayName,
    birthdate: patch.birthdate,
    focusAreas: patch.focusAreas,
    baselineMood: patch.baselineMood,
    experienceLevel: patch.experienceLevel,
    primaryIntention: patch.primaryIntention,
  };
}

export async function createJournalEntryDoc(
  uid: string,
  entry: { body: string; modality: string; themes?: string[] },
): Promise<string> {
  const database = requireDb();
  const ref = doc(collection(database, 'users', uid, 'journalEntries'));
  await setDoc(ref, {
    body: entry.body,
    modality: entry.modality,
    themes: entry.themes ?? [],
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function listJournalEntryDocs(uid: string, max = 50) {
  const database = requireDb();
  const q = query(
    collection(database, 'users', uid, 'journalEntries'),
    orderBy('createdAt', 'desc'),
    fsLimit(max),
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function upsertCheckInDoc(
  uid: string,
  checkinId: string,
  data: Record<string, unknown>,
) {
  const database = requireDb();
  await setDoc(
    doc(database, 'users', uid, 'checkins', checkinId),
    { ...data, createdAt: serverTimestamp() },
    { merge: true },
  );
}
