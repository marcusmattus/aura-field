#!/usr/bin/env bash
# Start Aura Field for Expo Go with a public tunnel (Cloudflare).
# Usage: npm run start:go:tunnel
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PORT="${EXPO_PORT:-8081}"

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared is required for the public Expo Go tunnel."
  echo "Install: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/"
  echo "Or use Expo's built-in tunnel after \`npx eas login\`: npx expo start --go --tunnel"
  exit 1
fi

LOG="$(mktemp -t cloudflared.XXXXXX.log)"
cloudflared tunnel --url "http://127.0.0.1:${PORT}" >"$LOG" 2>&1 &
CF_PID=$!

cleanup() {
  kill "$CF_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "Waiting for Cloudflare tunnel..."
URL=""
for _ in $(seq 1 60); do
  URL="$(grep -oE 'https://[a-zA-Z0-9.-]+\.trycloudflare\.com' "$LOG" | head -1 || true)"
  if [[ -n "$URL" ]]; then
    break
  fi
  sleep 0.5
done

if [[ -z "$URL" ]]; then
  echo "Failed to establish Cloudflare tunnel. Log:"
  cat "$LOG"
  exit 1
fi

HOST="${URL#https://}"
export EXPO_PACKAGER_PROXY_URL="$URL"
export REACT_NATIVE_PACKAGER_HOSTNAME="$HOST"

echo ""
echo "Expo Go tunnel ready"
echo "  Open in Expo Go:  exp://${HOST}"
echo "  Or paste URL:     ${URL}"
echo ""

exec npx expo start --go --port "$PORT"
