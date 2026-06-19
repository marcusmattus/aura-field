import { createClient } from '@supabase/supabase-js';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * Supabase client. chakraOS keeps all journal/field data on-device; Supabase
 * is used only to host the five agent Edge Functions (which call Claude).
 * The journal is sacred data — entries never leave the device by default.
 */
export const supabase =
  url && key
    ? createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false },
      })
    : null;

export const hasBackend = Boolean(supabase);
