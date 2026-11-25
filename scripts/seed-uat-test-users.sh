#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────
# seed-uat-test-users.sh — put the UAT-only test logins back on the
# ostendo-server k3s UAT database (see scripts/seed-uat-test-users.ts).
#
# Called by sync-prod-to-ostendo-uat.sh right after the restore, which
# passes UAT_URI and UAT_DB through the environment. Run on its own, it
# opens the shared-mongo port-forward itself and reads the scoped URI
# from the wawagardenbar-uat-mongo-creds secret (never written to disk).
#
# Usage:
#   ./scripts/seed-uat-test-users.sh
# ──────────────────────────────────────────────────────────────────
set -euo pipefail

cd "$(dirname "$0")/.."

NAMESPACE="apps"
PORT_FORWARD_LOCAL_PORT=27021
KUBECONFIG_PATH="${KUBECONFIG:-$HOME/.kube/config}"
k() { kubectl --kubeconfig="$KUBECONFIG_PATH" "$@"; }

PORT_FORWARD_PID=""
cleanup() {
  if [ -n "$PORT_FORWARD_PID" ] && kill -0 "$PORT_FORWARD_PID" 2>/dev/null; then
    kill "$PORT_FORWARD_PID" 2>/dev/null || true
    wait "$PORT_FORWARD_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

if [ -z "${UAT_URI:-}" ]; then
  command -v kubectl >/dev/null 2>&1 || { echo "kubectl not found." >&2; exit 1; }
  k port-forward svc/shared-mongo "${PORT_FORWARD_LOCAL_PORT}:27017" -n "$NAMESPACE" \
    >/tmp/seed-uat-test-users-portforward.log 2>&1 &
  PORT_FORWARD_PID=$!
  for _ in $(seq 1 10); do
    kill -0 "$PORT_FORWARD_PID" 2>/dev/null || { echo "port-forward exited; see /tmp/seed-uat-test-users-portforward.log" >&2; exit 1; }
    (exec 3<>"/dev/tcp/127.0.0.1/${PORT_FORWARD_LOCAL_PORT}") 2>/dev/null && exec 3>&- && break
    sleep 1
  done
  RAW_URI="$(k get secret wawagardenbar-uat-mongo-creds -n "$NAMESPACE" \
    -o jsonpath='{.data.MONGODB_WAWAGARDENBAR_APP_URI}' | base64 -d)"
  [ -n "$RAW_URI" ] || { echo "wawagardenbar-uat-mongo-creds has no MONGODB_WAWAGARDENBAR_APP_URI key." >&2; exit 1; }
  UAT_URI="$(printf '%s' "$RAW_URI" | sed -E "s#shared-mongo(\.[a-zA-Z0-9.-]+)?:27017#127.0.0.1:${PORT_FORWARD_LOCAL_PORT}#")"
  UAT_DB="${UAT_DB:-wawagardenbar_uat}"
fi

# The URI goes to the child through its environment only (not argv, not disk).
MONGODB_URI="$UAT_URI" MONGODB_WAWAGARDENBAR_APP_URI="$UAT_URI" MONGODB_DB_NAME="${UAT_DB:-wawagardenbar_uat}" \
  npx tsx scripts/seed-uat-test-users.ts
