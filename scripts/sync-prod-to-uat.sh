#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────
# sync-prod-to-uat.sh — Download production MongoDB and restore to UAT
#
# Prerequisites:
#   - mongodump and mongorestore installed (MongoDB Database Tools)
#   - Set in .env.local:
#       MONGODB_PROD_EXTERNAL_URI=mongodb://...  (public proxy URL)
#       MONGODB_UAT_EXTERNAL_URI=mongodb://...   (public proxy URL)
#       MONGODB_PROD_DB_NAME=wawagardenbar       (optional, extracted from URI or defaults)
#       MONGODB_UAT_DB_NAME=wawagardenbar_uat    (optional, extracted from URI or defaults)
#
# Usage:
#   ./scripts/sync-prod-to-uat.sh
#
# What it does:
#   1. Connects to production MongoDB via Railway proxy
#   2. Dumps the production database to a local directory
#   3. Connects to UAT MongoDB via Railway proxy
#   4. Restores the dump to the UAT database
#
# Safety:
#   - Prompts for confirmation before overwriting UAT
#   - Creates timestamped backup directory
#   - Does NOT modify production data (read-only dump)
# ──────────────────────────────────────────────────────────────────

set -euo pipefail

BACKUP_DIR="backups/$(date +%Y-%m-%d_%H%M%S)"
PROJECT="Wawa Garden Bar"
PROD_ENV="production"
UAT_ENV="uat"
MONGO_SERVICE="MongoDB"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

# ── Load .env.local if present ───────────────────────────────────
ENV_FILE="$(cd "$(dirname "$0")/.." && pwd)/.env.local"
if [ -f "$ENV_FILE" ]; then
  set -a
  # shellcheck disable=SC1090
  source <(grep -E '^MONGODB_(PROD|UAT)_(EXTERNAL_URI|DB_NAME)=' "$ENV_FILE")
  set +a
fi

# ── Check prerequisites ──────────────────────────────────────────
command -v mongodump >/dev/null 2>&1 || err "mongodump not found. Install MongoDB Database Tools."
command -v mongorestore >/dev/null 2>&1 || err "mongorestore not found. Install MongoDB Database Tools."

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Wawa Garden Bar — Sync Production DB to UAT"
echo "═══════════════════════════════════════════════════════════"
echo ""

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
PROD_DB=$(echo "$PROD_URI" | sed -n 's|.*/\([^?]*\).*|\1|p')
PROD_DB=${PROD_DB:-${MONGODB_PROD_DB_NAME:-wawagardenbar}}

log "Production DB: $PROD_DB"

# ── Step 2: Dump production database ─────────────────────────────
mkdir -p "$BACKUP_DIR"
log "Dumping production database to $BACKUP_DIR ..."

mongodump \
  --uri="$PROD_URI" \
  --db="$PROD_DB" \
  --out="$BACKUP_DIR" \
  --gzip

DUMP_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
log "Dump complete: $DUMP_SIZE"

# ── Step 3: Get UAT connection string ────────────────────────────
log "Resolving UAT MongoDB URI..."

UAT_URI="${MONGODB_UAT_EXTERNAL_URI:-}"

if [ -z "$UAT_URI" ]; then
  warn "MONGODB_UAT_EXTERNAL_URI not set in .env.local"
  echo ""
  echo "  Add to .env.local:"
  echo "    MONGODB_UAT_EXTERNAL_URI=mongodb://mongo:<password>@<public-host>:<port>/wawagardenbar?authSource=admin"
  echo ""
  read -p "Or paste the UAT MongoDB PUBLIC URI now: " UAT_URI
fi

if [ -z "$UAT_URI" ]; then
  err "No UAT MongoDB URI provided."
fi

if echo "$UAT_URI" | grep -q "railway.internal"; then
  err "URI uses railway.internal (internal only). Set the PUBLIC proxy URL in MONGODB_UAT_EXTERNAL_URI."
fi

# Extract DB name from URI path, env var, or default
UAT_DB=$(echo "$UAT_URI" | sed -n 's|.*/\([^?]*\).*|\1|p')
UAT_DB=${UAT_DB:-${MONGODB_UAT_DB_NAME:-wawagardenbar_uat}}

log "UAT DB: $UAT_DB"

# ── Step 4: Confirm before overwriting UAT ───────────────────────
echo ""
echo -e "${YELLOW}╔════════════════════════════════════════════════════════╗${NC}"
echo -e "${YELLOW}║  WARNING: This will OVERWRITE the UAT database!       ║${NC}"
echo -e "${YELLOW}║                                                       ║${NC}"
echo -e "${YELLOW}║  Source:  $PROD_DB (production)${NC}"
echo -e "${YELLOW}║  Target:  $UAT_DB (UAT)${NC}"
echo -e "${YELLOW}║  Backup:  $BACKUP_DIR${NC}"
echo -e "${YELLOW}╚════════════════════════════════════════════════════════╝${NC}"
echo ""
read -p "Type 'yes' to proceed: " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
  warn "Aborted."
  exit 0
fi

# ── Step 5: Restore to UAT ───────────────────────────────────────
log "Restoring to UAT database..."

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
echo "  Production ($PROD_DB) → UAT ($UAT_DB)"
echo ""
echo "  Note: You may need to restart the UAT app service:"
echo "    railway link --project '$PROJECT' --environment '$UAT_ENV' --service wawagardenbar-app"
echo "    railway deployment redeploy --yes"
echo ""
