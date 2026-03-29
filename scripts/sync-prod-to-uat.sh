#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────
# sync-prod-to-uat.sh — Download production MongoDB and restore to UAT
#
# Prerequisites:
#   - railway CLI installed and authenticated
#   - mongodump and mongorestore installed (MongoDB Database Tools)
#   - Railway project "Wawa Garden Bar" linked
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

# ── Check prerequisites ──────────────────────────────────────────
command -v railway   >/dev/null 2>&1 || err "railway CLI not found. Install: https://docs.railway.app/develop/cli"
command -v mongodump >/dev/null 2>&1 || err "mongodump not found. Install MongoDB Database Tools."
command -v mongorestore >/dev/null 2>&1 || err "mongorestore not found. Install MongoDB Database Tools."

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Wawa Garden Bar — Sync Production DB to UAT"
echo "═══════════════════════════════════════════════════════════"
echo ""

# ── Step 1: Get production connection string ─────────────────────
log "Fetching production MongoDB connection details..."

railway link --project "$PROJECT" --environment "$PROD_ENV" --service wawagardenbar-app 2>/dev/null || true

PROD_URI=$(railway variables --json 2>/dev/null | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(data.get('MONGODB_URI', data.get('MONGODB_WAWAGARDENBAR_APP_URI', '')))
" 2>/dev/null || echo "")

PROD_DB=$(railway variables --json 2>/dev/null | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(data.get('MONGODB_DB_NAME', ''))
" 2>/dev/null || echo "")

if [ -z "$PROD_URI" ] || [ -z "$PROD_DB" ]; then
  warn "Could not auto-detect production MongoDB URI."
  echo ""
  echo "The production MongoDB uses Railway's internal network."
  echo "You need to get the PUBLIC connection string from Railway dashboard:"
  echo ""
  echo "  1. Go to Railway dashboard → Wawa Garden Bar → production"
  echo "  2. Click the MongoDB service"
  echo "  3. Click 'Variables' tab"
  echo "  4. Find MONGO_URL (the public/proxy URL, not the internal one)"
  echo ""
  read -p "Paste the production MongoDB PUBLIC URI: " PROD_URI
  read -p "Enter the production database name [wawagardenbar_prod]: " PROD_DB
  PROD_DB=${PROD_DB:-wawagardenbar_prod}
fi

# Check if URI is internal (won't work from outside Railway)
if echo "$PROD_URI" | grep -q "railway.internal"; then
  warn "The URI uses Railway's internal network (railway.internal)."
  echo ""
  echo "To connect from outside Railway, you need the PUBLIC proxy URL."
  echo "Go to Railway dashboard → MongoDB service → Connect tab → Public Networking"
  echo "Enable TCP Proxy if not already enabled, then copy the public URL."
  echo ""
  read -p "Paste the production MongoDB PUBLIC URI: " PROD_URI
fi

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
log "Fetching UAT MongoDB connection details..."

railway link --project "$PROJECT" --environment "$UAT_ENV" --service wawagardenbar-app 2>/dev/null || true

UAT_URI=$(railway variables --json 2>/dev/null | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(data.get('MONGODB_URI', data.get('MONGODB_WAWAGARDENBAR_APP_URI', '')))
" 2>/dev/null || echo "")

UAT_DB=$(railway variables --json 2>/dev/null | python3 -c "
import sys, json
data = json.load(sys.stdin)
print(data.get('MONGODB_DB_NAME', ''))
" 2>/dev/null || echo "")

if [ -z "$UAT_URI" ] || [ -z "$UAT_DB" ]; then
  warn "Could not auto-detect UAT MongoDB URI."
  read -p "Paste the UAT MongoDB PUBLIC URI: " UAT_URI
  read -p "Enter the UAT database name [wawagardenbar_uat]: " UAT_DB
  UAT_DB=${UAT_DB:-wawagardenbar_uat}
fi

if echo "$UAT_URI" | grep -q "railway.internal"; then
  warn "The URI uses Railway's internal network."
  echo "You need the PUBLIC proxy URL for UAT MongoDB."
  read -p "Paste the UAT MongoDB PUBLIC URI: " UAT_URI
fi

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
