#!/usr/bin/env bash
# Production EAS build + store submit.
# Requires: EXPO_TOKEN (https://expo.dev/settings/access-tokens)
# Optional: EAS_PROJECT_ID, EXPO_OWNER, Apple/Google credentials in EAS
set -euo pipefail
cd "$(dirname "$0")/.."

if [[ -z "${EXPO_TOKEN:-}" ]]; then
  echo "ERROR: EXPO_TOKEN is not set."
  echo "Create one at https://expo.dev/settings/access-tokens"
  echo "Then: export EXPO_TOKEN=... && npm run eas:build:submit"
  exit 1
fi

export EXPO_PLATFORM=native

if ! npx eas-cli whoami >/dev/null 2>&1; then
  echo "Authenticating with EXPO_TOKEN..."
fi

# Link project if needed (non-interactive when already configured)
if ! npx expo config --type public 2>/dev/null | grep -q projectId; then
  echo "Linking EAS project..."
  npx eas-cli init --non-interactive --force 2>/dev/null || npx eas-cli init --non-interactive || true
fi

PLATFORM="${1:-all}"
echo "Building + auto-submitting production ($PLATFORM)..."
npx eas-cli build \
  --profile production \
  --platform "$PLATFORM" \
  --auto-submit \
  --non-interactive
