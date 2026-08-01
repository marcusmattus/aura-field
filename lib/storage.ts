/**
 * Secure auth storage adapter.
 * Prefers react-native-mmkv when available (dev/production native builds);
 * falls back to AsyncStorage in Expo Go and when native modules are missing.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';

type StorageLike = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

type MmkvStore = {
  getString: (k: string) => string | undefined;
  set: (k: string, v: string) => void;
  delete: (k: string) => void;
};

const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

function tryCreateMmkv(id: string): MmkvStore | null {
  // Expo Go does not ship Nitro / MMKV native binaries — never touch the module there.
  if (isExpoGo) return null;

  try {
    // Optional native dependency (requires react-native-nitro-modules).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createMMKV } = require('react-native-mmkv') as {
      createMMKV: (opts: { id: string }) => MmkvStore;
    };
    return createMMKV({ id });
  } catch {
    return null;
  }
}

const mmkvStore = tryCreateMmkv('chakraos-auth');

export const authStorage: StorageLike = mmkvStore
  ? {
      getItem: async (key) => mmkvStore.getString(key) ?? null,
      setItem: async (key, value) => {
        mmkvStore.set(key, value);
      },
      removeItem: async (key) => {
        mmkvStore.delete(key);
      },
    }
  : AsyncStorage;

/** Simple key-value for outbox / sync cache. */
export const syncStorage: StorageLike = (() => {
  const store = tryCreateMmkv('chakraos-sync');
  if (!store) return AsyncStorage;

  return {
    getItem: async (key) => store.getString(key) ?? null,
    setItem: async (key, value) => {
      store.set(key, value);
    },
    removeItem: async (key) => {
      store.delete(key);
    },
  };
})();
