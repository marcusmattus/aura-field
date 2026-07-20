#!/usr/bin/env bash
# Start Aura Field for Expo Go using Expo's built-in ngrok tunnel.
# Usage: npm run start:go:tunnel
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PORT="${EXPO_PORT:-8081}"

# Prefer a user-local global install so Expo's tunnel resolver can find @expo/ngrok.
export NPM_CONFIG_PREFIX="${NPM_CONFIG_PREFIX:-$HOME/.npm-global}"
export PATH="$NPM_CONFIG_PREFIX/bin:$PATH"
export NODE_PATH="$NPM_CONFIG_PREFIX/lib/node_modules${NODE_PATH:+:$NODE_PATH}"

if [[ ! -d "$NPM_CONFIG_PREFIX/lib/node_modules/@expo/ngrok" ]]; then
  echo "Installing @expo/ngrok for Expo tunnel..."
  mkdir -p "$NPM_CONFIG_PREFIX"
  npm install --prefix "$NPM_CONFIG_PREFIX" -g "@expo/ngrok@^4.1.0"
fi

# Also ensure the project-local copy exists (Expo resolves local first).
if [[ ! -d "$ROOT/node_modules/@expo/ngrok" ]]; then
  npm install --save-dev "@expo/ngrok@^4.1.0"
fi

echo ""
echo "Starting Expo Go with ngrok tunnel..."
echo "Scan the QR code in the terminal, or open the printed exp:// URL in Expo Go."
echo ""

exec npx expo start --go --tunnel --port "$PORT"
