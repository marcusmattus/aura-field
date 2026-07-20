#!/usr/bin/env bash
# Start Aura Field for Expo Go over an ngrok tunnel.
# Usage: npm run start:go:tunnel
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PORT="${EXPO_PORT:-8081}"

# Never inherit a previous Cloudflare / stale packager proxy — that overrides
# the tunnel hostname in the Expo Go manifest and causes Error 1033.
unset EXPO_PACKAGER_PROXY_URL || true
unset REACT_NATIVE_PACKAGER_HOSTNAME || true

export NPM_CONFIG_PREFIX="${NPM_CONFIG_PREFIX:-$HOME/.npm-global}"
export PATH="$NPM_CONFIG_PREFIX/bin:$HOME/.local/bin:$PATH"
export NODE_PATH="$NPM_CONFIG_PREFIX/lib/node_modules${NODE_PATH:+:$NODE_PATH}"

if [[ ! -d "$ROOT/node_modules/@expo/ngrok" ]]; then
  npm install --save-dev "@expo/ngrok@^4.1.0"
fi

echo ""
echo "Starting Expo Go with ngrok..."
echo "When ready, open the printed exp:// URL (ngrok.io / exp.direct) in Expo Go."
echo "Do NOT use any *.trycloudflare.com URL — those are disabled."
echo ""

# Prefer Expo's built-in tunnel. Fall back to local Metro if ngrok agent limit is hit;
# in that case set EXPO_PACKAGER_PROXY_URL to an existing ngrok URL manually.
if env -u EXPO_PACKAGER_PROXY_URL -u REACT_NATIVE_PACKAGER_HOSTNAME \
  npx expo start --go --tunnel --port "$PORT"; then
  exit 0
fi

echo "Expo --tunnel failed; starting Metro without tunnel."
echo "If you already have ngrok forwarding :$PORT, export:"
echo "  EXPO_PACKAGER_PROXY_URL=https://YOUR-SUBDOMAIN.ngrok.io"
echo "  REACT_NATIVE_PACKAGER_HOSTNAME=YOUR-SUBDOMAIN.ngrok.io"
exec env -u EXPO_PACKAGER_PROXY_URL -u REACT_NATIVE_PACKAGER_HOSTNAME \
  npx expo start --go --port "$PORT"
