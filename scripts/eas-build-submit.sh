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
export EAS_BUILD_NO_EXPO_GO_WARNING="${EAS_BUILD_NO_EXPO_GO_WARNING:-true}"
PLATFORM="${1:-all}"

build_one() {
  local p="$1"
  echo "Building production ($p)..."
  # Build without waiting so we can kick off both platforms quickly.
  npx eas-cli build \
    --profile production \
    --platform "$p" \
    --non-interactive \
    --no-wait

  echo "Attempting store submit for latest $p build (may fail without store credentials)..."
  if ! npx eas-cli submit \
    --profile production \
    --platform "$p" \
    --latest \
    --non-interactive; then
    echo "Submit skipped/failed for $p — build was still queued. Configure store credentials in EAS to submit."
  fi
}

if [[ "$PLATFORM" == "all" ]]; then
  build_one android
  build_one ios
else
  build_one "$PLATFORM"
fi
