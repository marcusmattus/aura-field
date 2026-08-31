#!/usr/bin/env node
/**
 * Sync non-interactive EAS Submit fields from env into eas.json.
 *
 * Required for CI / Expo launch auto-submit:
 *   CHAKRAOS_APP_STORE_APP_ID | BILT_APP_STORE_APP_ID | ASC_APP_ID
 *     → submit.production.ios.ascAppId
 *
 * Optional:
 *   CHAKRAOS_APPLE_TEAM_ID | BILT_APPLE_TEAM_ID | APPLE_TEAM_ID
 *     → submit.production.ios.appleTeamId
 *   EXPO_APPLE_ID | CHAKRAOS_APPLE_ID | BILT_APPLE_ID
 *     → submit.production.ios.appleId
 *
 * The CHAKRAOS_* names are the ones .env.example and app.config.js use; the
 * BILT_* names predate the rename and are kept so already-configured GitHub
 * secrets keep working.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const easPath = resolve(process.cwd(), 'eas.json');
const eas = JSON.parse(readFileSync(easPath, 'utf8'));

const ascAppId =
  process.env.CHAKRAOS_APP_STORE_APP_ID ??
  process.env.BILT_APP_STORE_APP_ID ??
  process.env.ASC_APP_ID;
const appleTeamId =
  process.env.CHAKRAOS_APPLE_TEAM_ID ?? process.env.BILT_APPLE_TEAM_ID ?? process.env.APPLE_TEAM_ID;
const appleId =
  process.env.EXPO_APPLE_ID ?? process.env.CHAKRAOS_APPLE_ID ?? process.env.BILT_APPLE_ID;

eas.submit ??= {};
eas.submit.production ??= {};
eas.submit.production.ios ??= {};
eas.submit.production.android ??= {};

let changed = false;

if (ascAppId) {
  eas.submit.production.ios.ascAppId = String(ascAppId);
  changed = true;
}

if (appleTeamId) {
  eas.submit.production.ios.appleTeamId = String(appleTeamId);
  changed = true;
}

if (appleId) {
  eas.submit.production.ios.appleId = String(appleId);
  changed = true;
}

if (!changed) {
  const hasAsc = Boolean(eas.submit.production.ios.ascAppId);
  if (!hasAsc) {
    console.warn(
      '[sync-eas-submit-config] Missing ascAppId. Set CHAKRAOS_APP_STORE_APP_ID (or ASC_APP_ID) for non-interactive iOS submit.',
    );
  }
  process.exit(0);
}

writeFileSync(easPath, `${JSON.stringify(eas, null, 2)}\n`);
console.log('[sync-eas-submit-config] Updated eas.json submit.production from env.');
