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
PLATFORM="${1:-all}"

build_one() {
  local p="$1"
  echo "Building + auto-submitting production ($p)..."
  # Auto-submit may fail without store credentials; still create the build.
  if ! npx eas-cli build \
    --profile production \
    --platform "$p" \
    --auto-submit \
    --non-interactive; then
    echo "Auto-submit path failed for $p; retrying build only..."
    npx eas-cli build \
      --profile production \
      --platform "$p" \
      --non-interactive
  fi
}

if [[ "$PLATFORM" == "all" ]]; then
  build_one android
  build_one ios
else
  build_one "$PLATFORM"
fi
