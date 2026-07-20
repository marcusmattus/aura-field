/**
 * Secure auth storage adapter.
 * Prefers react-native-mmkv when available; falls back to AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

type StorageLike = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};

let mmkvStore: { getString: (k: string) => string | undefined; set: (k: string, v: string) => void; delete: (k: string) => void } | null =
  null;

try {
  // Optional dependency — installed with the cloud-first slice.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createMMKV } = require('react-native-mmkv') as {
    createMMKV: (opts: { id: string }) => {
      getString: (k: string) => string | undefined;
      set: (k: string, v: string) => void;
      delete: (k: string) => void;
    };
  };
  mmkvStore = createMMKV({ id: 'chakraos-auth' });
} catch {
  mmkvStore = null;
}

export const authStorage: StorageLike = mmkvStore
  ? {
      getItem: async (key) => mmkvStore!.getString(key) ?? null,
      setItem: async (key, value) => {
        mmkvStore!.set(key, value);
      },
      removeItem: async (key) => {
        mmkvStore!.delete(key);
      },
    }
  : AsyncStorage;

/** Simple key-value for outbox / sync cache. */
export const syncStorage: StorageLike = (() => {
  if (mmkvStore) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createMMKV } = require('react-native-mmkv') as {
        createMMKV: (opts: { id: string }) => {
          getString: (k: string) => string | undefined;
          set: (k: string, v: string) => void;
          delete: (k: string) => void;
        };
      };
      const store = createMMKV({ id: 'chakraos-sync' });
      return {
        getItem: async (key) => store.getString(key) ?? null,
        setItem: async (key, value) => {
          store.set(key, value);
        },
        removeItem: async (key) => {
          store.delete(key);
        },
      };
    } catch {
      /* fall through */
    }
  }
  return AsyncStorage;
})();
