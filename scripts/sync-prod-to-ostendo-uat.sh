#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────
# sync-prod-to-ostendo-uat.sh — Download production MongoDB and restore
# to the local k3s UAT instance on ostendo-server
#
# Sibling to sync-prod-to-uat.sh (which targets Railway UAT via its
# public Mongo proxy). This script targets the shared-mongo instance on
# ostendo-server's k3s cluster instead — see k8s/uat/README.md and
# ostendo-workhorse-platform/k3s/manifests/README.md for that setup.
#
# Prerequisites:
#   - mongodump and mongorestore installed (MongoDB Database Tools)
#   - kubectl configured with access to the ostendo-server cluster
#     (run this ON ostendo-server, or with a kubeconfig that can reach it)
#   - The wawagardenbar-uat-mongo-creds secret already provisioned in the
#     `apps` namespace (see k8s/uat/README.md "Database: shared, not per-app")
#   - Set in .env.local:
#       MONGODB_PROD_EXTERNAL_URI=mongodb://...  (Railway public proxy URL)
#       MONGODB_PROD_DB_NAME=wawagardenbar       (optional, extracted from URI or defaults)
#
# Usage:
#   ./scripts/sync-prod-to-ostendo-uat.sh
#
# What it does:
#   1. Connects to production MongoDB via the Railway public proxy
#   2. Dumps the production database to a local, timestamped directory
#   3. Port-forwards the cluster's shared-mongo Service to localhost
#   4. Reads the scoped wawagardenbar_uat Mongo user's connection URI
#      straight from the wawagardenbar-uat-mongo-creds k8s secret (never
#      hand-copied into a file) and rewrites its cluster-internal host to
#      the local port-forward
#   5. Restores the dump into that database
#   6. Tears down the port-forward
#
# Safety:
#   - Prompts for confirmation before overwriting UAT
#   - Creates a timestamped backup directory
#   - Does NOT modify production data (read-only dump)
#   - Never writes the Mongo credential to disk — read directly from the
#     k8s Secret into a shell variable for the duration of the restore
# ──────────────────────────────────────────────────────────────────

set -euo pipefail

BACKUP_DIR="backups/$(date +%Y-%m-%d_%H%M%S)"
NAMESPACE="apps"
PORT_FORWARD_LOCAL_PORT=27020
KUBECONFIG_PATH="${KUBECONFIG:-$HOME/.kube/config}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# k3s's bundled kubectl (a symlink to the k3s binary) does not reliably
# pick up $KUBECONFIG the way vanilla kubectl does — its own fallback,
# when the flag isn't passed explicitly, is /etc/rancher/k3s/k3s.yaml
# (root-only), not ~/.kube/config. Always pass --kubeconfig explicitly.
k() { kubectl --kubeconfig="$KUBECONFIG_PATH" "$@"; }

PORT_FORWARD_PID=""
cleanup() {
  if [ -n "$PORT_FORWARD_PID" ] && kill -0 "$PORT_FORWARD_PID" 2>/dev/null; then
    kill "$PORT_FORWARD_PID" 2>/dev/null || true
    wait "$PORT_FORWARD_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

# Return a database name only when the URI has an explicit path after its
# authority. A URI without `/database` must use the configured/default name;
# `${URI##*/}` would incorrectly return the credentials and host.
database_from_uri() {
  local uri_without_query="${1%%\?*}"
  if [[ "$uri_without_query" =~ ^mongodb(\+srv)?://[^/]+/([^/]+)$ ]]; then
    printf '%s\n' "${BASH_REMATCH[2]}"
  fi
}

# Railway's public Mongo URL often contains only credentials and host. Complete
# it after the intended database is known so MongoDB authenticates against
# admin and never silently targets the default database.
connection_uri_for_database() {
  local uri="$1" database="$2"
  local uri_without_query="${uri%%\?*}"
  local query=""
  if [[ "$uri" == *\?* ]]; then query="${uri#*\?}"; fi
  if [ -z "$(database_from_uri "$uri")" ]; then
    uri_without_query="${uri_without_query%/}/${database}"
  fi
  if [[ "$query" != *"authSource="* ]]; then
    query="${query:+${query}&}authSource=admin"
  fi
  printf '%s?%s\n' "$uri_without_query" "$query"
}

# ── Load .env.local if present ───────────────────────────────────
ENV_FILE="$(cd "$(dirname "$0")/.." && pwd)/.env.local"
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source <(grep -E '^MONGODB_PROD_(EXTERNAL_URI|DB_NAME)=' "$ENV_FILE")
  set +a
fi

# ── Check prerequisites ──────────────────────────────────────────
command -v mongodump >/dev/null 2>&1 || err "mongodump not found. Install MongoDB Database Tools."
command -v mongorestore >/dev/null 2>&1 || err "mongorestore not found. Install MongoDB Database Tools."
command -v kubectl >/dev/null 2>&1 || err "kubectl not found."

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Wawa Garden Bar — Sync Production DB to ostendo-server k3s UAT"
echo "═══════════════════════════════════════════════════════════"
echo ""

log "Checking cluster access and preconditions..."
k get namespace "$NAMESPACE" >/dev/null 2>&1 || err "Namespace '$NAMESPACE' does not exist. Check KUBECONFIG / cluster access."
k get deployment shared-mongo -n "$NAMESPACE" >/dev/null 2>&1 \
  || err "shared-mongo Deployment not found in '$NAMESPACE'. See ostendo-workhorse-platform/k3s/manifests/README.md."
k get secret wawagardenbar-uat-mongo-creds -n "$NAMESPACE" >/dev/null 2>&1 \
  || err "wawagardenbar-uat-mongo-creds secret not found. See k8s/uat/README.md 'Database: shared, not per-app' to provision the scoped Mongo user first."

# ── Step 1: Get production connection string ─────────────────────
log "Resolving production MongoDB URI..."

PROD_URI="${MONGODB_PROD_EXTERNAL_URI:-}"

if [ -z "$PROD_URI" ]; then
  warn "MONGODB_PROD_EXTERNAL_URI not set in .env.local"
  echo ""
  echo "  Add to .env.local:"
  echo "    MONGODB_PROD_EXTERNAL_URI=mongodb://mongo:<password>@<public-host>:<port>/wawagardenbar?authSource=admin"
  echo ""
  echo "  Get the public URL from Railway dashboard → MongoDB service → Connect → Public Networking"
  echo ""
  read -p "Or paste the production MongoDB PUBLIC URI now: " PROD_URI
fi

if [ -z "$PROD_URI" ]; then
  err "No production MongoDB URI provided."
fi

if echo "$PROD_URI" | grep -q "railway.internal"; then
  err "URI uses railway.internal (internal only). Set the PUBLIC proxy URL in MONGODB_PROD_EXTERNAL_URI."
fi

# Extract DB name from URI path, env var, or default
PROD_DB="$(database_from_uri "$PROD_URI")"
PROD_DB=${PROD_DB:-${MONGODB_PROD_DB_NAME:-wawagardenbar}}

log "Production DB: $PROD_DB"
PROD_CONNECT_URI="$(connection_uri_for_database "$PROD_URI" "$PROD_DB")"

# ── Step 2: Dump production database ─────────────────────────────
mkdir -p "$BACKUP_DIR"
log "Dumping production database to $BACKUP_DIR ..."

mongodump \
  --uri="$PROD_CONNECT_URI" \
  --db="$PROD_DB" \
  --out="$BACKUP_DIR" \
  --gzip

DUMP_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
log "Dump complete: $DUMP_SIZE"

# ── Step 3: Port-forward shared-mongo and resolve the scoped UAT URI ──
log "Starting port-forward to shared-mongo (localhost:${PORT_FORWARD_LOCAL_PORT})..."

k port-forward svc/shared-mongo "${PORT_FORWARD_LOCAL_PORT}:27017" -n "$NAMESPACE" \
  >/tmp/sync-prod-to-ostendo-uat-portforward.log 2>&1 &
PORT_FORWARD_PID=$!

# Give the forward a moment to establish; fail fast if it died immediately.
for _ in $(seq 1 10); do
  kill -0 "$PORT_FORWARD_PID" 2>/dev/null || err "port-forward exited immediately — see /tmp/sync-prod-to-ostendo-uat-portforward.log"
  (exec 3<>"/dev/tcp/127.0.0.1/${PORT_FORWARD_LOCAL_PORT}") 2>/dev/null && exec 3>&- && break
  sleep 1
done

log "Reading scoped Mongo URI from wawagardenbar-uat-mongo-creds..."
RAW_UAT_URI="$(k get secret wawagardenbar-uat-mongo-creds -n "$NAMESPACE" \
  -o jsonpath='{.data.MONGODB_WAWAGARDENBAR_APP_URI}' | base64 -d)"

if [ -z "$RAW_UAT_URI" ]; then
  err "wawagardenbar-uat-mongo-creds has no MONGODB_WAWAGARDENBAR_APP_URI key."
fi

# The secret holds the cluster-internal address (shared-mongo.apps.svc.cluster.local:27017);
# this script runs outside the cluster, so redirect it through the port-forward above.
UAT_URI="$(printf '%s' "$RAW_UAT_URI" | sed -E "s#shared-mongo(\.[a-zA-Z0-9.-]+)?:27017#127.0.0.1:${PORT_FORWARD_LOCAL_PORT}#")"

UAT_DB="$(database_from_uri "$UAT_URI")"
UAT_DB=${UAT_DB:-wawagardenbar_uat}

log "UAT DB: $UAT_DB (ostendo-server k3s, via port-forward)"

# ── Step 4: Confirm before overwriting UAT ───────────────────────
echo ""
echo -e "${YELLOW}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║  WARNING: This will OVERWRITE the ostendo-server UAT DB! ║${NC}"
echo -e "${YELLOW}║                                                          ║${NC}"
echo -e "${YELLOW}║  Source:  $PROD_DB (production)${NC}"
echo -e "${YELLOW}║  Target:  $UAT_DB (ostendo-server k3s UAT)${NC}"
echo -e "${YELLOW}║  Backup:  $BACKUP_DIR${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
read -p "Type 'yes' to proceed: " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  warn "Aborted."
  exit 0
fi

# ── Step 5: Restore to UAT ───────────────────────────────────────
log "Restoring to ostendo-server UAT database..."

mongorestore \
  --uri="$UAT_URI" \
  --db="$UAT_DB" \
  --drop \
  --gzip \
  --nsFrom="${PROD_DB}.*" \
  --nsTo="${UAT_DB}.*" \
  "$BACKUP_DIR/$PROD_DB"

# ── Step 6: Verify ───────────────────────────────────────────────
log "Verifying restore..."

mongosh "$UAT_URI" --quiet --eval "
  const db_name = '$UAT_DB';
  const db = db.getSiblingDB(db_name);
  const collections = db.getCollectionNames();
  print('Database: ' + db_name);
  print('Collections: ' + collections.length);
  collections.forEach(c => {
    print('  ' + c + ': ' + db.getCollection(c).countDocuments() + ' documents');
  });
" 2>/dev/null || warn "Could not verify — check UAT manually"

echo ""
log "Sync complete!"
echo ""
echo "  Backup saved to: $BACKUP_DIR"
echo "  Production ($PROD_DB) → ostendo-server k3s UAT ($UAT_DB)"
echo ""
echo "  Restart the UAT app so any code paths reading cached data pick up the change:"
echo "    kubectl --kubeconfig=$KUBECONFIG_PATH rollout restart deployment/wawagardenbar-uat-app -n $NAMESPACE"
echo ""
