#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────
# manage-uat-secrets.sh — manage keys in the UAT k3s env Secret
#
# The wawagardenbar-uat-app pod loads its environment from the Secret
# `wawagardenbar-uat-env` (namespace `apps`) via envFrom, so every key in
# that Secret becomes an env var. Pods read it at startup only: after any
# change, restart the Deployment (pass --restart, or run `restart`).
#
# Secret VALUES are never printed by this script. `list` shows key names
# and `diff` shows key names that differ — never values.
#
# USAGE
#   scripts/manage-uat-secrets.sh [global options] <command> [args]
#
# GLOBAL OPTIONS
#   -n, --namespace NS   Namespace              (default: apps)
#   -s, --secret NAME    Secret to manage       (default: wawagardenbar-uat-env)
#   -f, --file PATH      Env file used by push  (default: <repo>/.env.uat.local)
#   -r, --restart        Restart the Deployment after a change
#   -y, --yes            Skip confirmation prompts (delete/clear/destroy)
#   -h, --help           Show this guide
#
# COMMANDS
#   list                       List key names in the Secret
#   diff                       Compare env file vs Secret (key names only)
#   push KEY [KEY...]          Create/update the named keys from the env file
#   push --all                 Create/update every key in the env file
#   set KEY                    Create/update one key; value is read silently
#                              from the terminal (or from stdin if piped)
#   delete KEY [KEY...]        Remove one or more keys from the Secret
#   clear                      Remove ALL keys (the empty Secret remains)
#   destroy                    Delete the Secret object itself
#   restart                    Restart the Deployment to pick up changes
#
# EXAMPLES
#   # Add/update one key from .env.uat.local, then restart the pod
#   scripts/manage-uat-secrets.sh --restart push GOOGLE_MAPS_API_KEY
#
#   # Update several keys from the env file
#   scripts/manage-uat-secrets.sh push STRIPE_SECRET_KEY RESEND_API_KEY
#
#   # Sync every key in .env.uat.local into the Secret (existing keys
#   # not in the file are left alone — use `diff` to see them)
#   scripts/manage-uat-secrets.sh --restart push --all
#
#   # Set a single value without it touching disk or shell history
#   scripts/manage-uat-secrets.sh set GOOGLE_MAPS_API_KEY
#   printf %s "$VALUE" | scripts/manage-uat-secrets.sh set GOOGLE_MAPS_API_KEY
#
#   # Delete one key / several keys
#   scripts/manage-uat-secrets.sh delete OLD_KEY
#   scripts/manage-uat-secrets.sh delete OLD_KEY_1 OLD_KEY_2
#
#   # Delete every key (Secret stays, empty) / delete the Secret itself
#   scripts/manage-uat-secrets.sh clear
#   scripts/manage-uat-secrets.sh destroy
#
#   # Manage another Secret (e.g. the Mongo creds) explicitly
#   scripts/manage-uat-secrets.sh -s wawagardenbar-uat-mongo-creds list
#
# NOTES
#   - Env file lines must look like KEY=value. Blank lines, # comments and
#     an optional leading `export ` are ignored; one pair of surrounding
#     single or double quotes is stripped from values.
#   - `clear` / `destroy` on a Secret the Deployment depends on will make
#     the pod fail to start on its next restart. Re-seed with `push --all`
#     (or scripts/bootstrap-uat-k3s.sh) afterwards.
# ──────────────────────────────────────────────────────────────────

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NAMESPACE="apps"
SECRET="wawagardenbar-uat-env"
DEPLOYMENT="wawagardenbar-uat-app"
ENV_FILE="$REPO_ROOT/.env.uat.local"
RESTART=0
ASSUME_YES=0

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1" >&2; exit 1; }

# Print the leading comment block (the guide) without the comment markers.
usage() { sed -n '3,/^# ─*$/p' "$0" | sed '$d' | sed 's/^# \{0,1\}//'; }

command -v kubectl >/dev/null 2>&1 || err "kubectl not found."
command -v python3 >/dev/null 2>&1 || err "python3 not found."

while [ $# -gt 0 ]; do
  case "$1" in
    -n|--namespace) NAMESPACE="${2:?missing value for $1}"; shift 2 ;;
    -s|--secret)    SECRET="${2:?missing value for $1}"; shift 2 ;;
    -f|--file)      ENV_FILE="${2:?missing value for $1}"; shift 2 ;;
    -r|--restart)   RESTART=1; shift ;;
    -y|--yes)       ASSUME_YES=1; shift ;;
    -h|--help)      usage; exit 0 ;;
    --)             shift; break ;;
    -*)             err "Unknown option: $1 (see --help)" ;;
    *)              break ;;
  esac
done

[ $# -ge 1 ] || { usage; exit 1; }
CMD="$1"; shift

secret_exists() { kubectl get secret "$SECRET" -n "$NAMESPACE" >/dev/null 2>&1; }

require_secret() {
  secret_exists || err "Secret '$SECRET' not found in '$NAMESPACE'. Create it with: $0 push --all"
}

confirm() {
  [ "$ASSUME_YES" -eq 1 ] && return 0
  read -r -p "$1 [y/N] " reply
  [[ "$reply" =~ ^[Yy]$ ]] || err "Aborted."
}

valid_key() { [[ "$1" =~ ^[A-Za-z_][A-Za-z0-9_.-]*$ ]]; }

# Print the Secret's key names, one per line, sorted.
secret_keys() {
  kubectl get secret "$SECRET" -n "$NAMESPACE" -o json \
    | python3 -c 'import sys,json; print("\n".join(sorted((json.load(sys.stdin).get("data") or {}).keys())))'
}

PARSE_ENV_PY='
import json, re, sys
out = {}
for line in open(sys.argv[1], encoding="utf-8"):
    line = line.strip()
    if not line or line.startswith("#"):
        continue
    line = re.sub(r"^export\s+", "", line)
    if "=" not in line:
        continue
    k, v = line.split("=", 1)
    k = k.strip()
    if len(v) >= 2 and v[0] == v[-1] and v[0] in "\"\x27":
        v = v[1:-1]
    out[k] = v
json.dump(out, sys.stdout)
'

# Parse the env file into JSON {KEY: value} on stdout.
parse_env_file() {
  [ -f "$ENV_FILE" ] || err "Env file not found: $ENV_FILE"
  python3 -c "$PARSE_ENV_PY" "$ENV_FILE"
}

# Merge-patch the Secret. Reads a JSON {KEY: value|null} object on stdin;
# null removes the key. Values are base64-encoded here, never echoed.
apply_patch() {
  local patch
  patch="$(python3 -c '
import sys, json, base64
d = json.load(sys.stdin)
print(json.dumps({"data": {k: (None if v is None else base64.b64encode(v.encode()).decode()) for k, v in d.items()}}))
')"
  if ! secret_exists; then
    kubectl create secret generic "$SECRET" -n "$NAMESPACE" >/dev/null
  fi
  kubectl patch secret "$SECRET" -n "$NAMESPACE" --type=merge -p "$patch" >/dev/null
}

do_restart() {
  log "Restarting deployment/$DEPLOYMENT..."
  kubectl rollout restart "deployment/$DEPLOYMENT" -n "$NAMESPACE" >/dev/null
  kubectl rollout status "deployment/$DEPLOYMENT" -n "$NAMESPACE" --timeout=180s
}

maybe_restart() {
  if [ "$RESTART" -eq 1 ]; then
    do_restart
  else
    warn "Pod not restarted — it reads the Secret at startup. Re-run with --restart or: $0 restart"
  fi
}

case "$CMD" in
  list)
    require_secret
    secret_keys
    ;;

  diff)
    require_secret
    python3 -c '
import sys, json, base64
env = json.load(open(sys.argv[1]))
sec = {k: base64.b64decode(v).decode() for k, v in (json.load(open(sys.argv[2])).get("data") or {}).items()}
only_env = sorted(set(env) - set(sec))
only_sec = sorted(set(sec) - set(env))
changed = sorted(k for k in set(env) & set(sec) if env[k] != sec[k])
for label, keys in (("only in env file (push to add)", only_env),
                    ("only in Secret (not in env file)", only_sec),
                    ("value differs (push to update)", changed)):
    print(label + ": " + (", ".join(keys) or "-"))
' <(parse_env_file) <(kubectl get secret "$SECRET" -n "$NAMESPACE" -o json)
    ;;

  push)
    [ $# -ge 1 ] || err "push needs KEY [KEY...] or --all"
    ALL_JSON="$(parse_env_file)"
    if [ "$1" = "--all" ]; then
      SELECTED="$ALL_JSON"
    else
      for k in "$@"; do valid_key "$k" || err "Invalid key name: $k"; done
      SELECTED="$(python3 -c '
import sys, json
env = json.loads(sys.argv[1]); keys = sys.argv[2:]
missing = [k for k in keys if k not in env]
if missing:
    sys.exit("Not in env file: " + ", ".join(missing))
print(json.dumps({k: env[k] for k in keys}))
' "$ALL_JSON" "$@")" || exit 1
    fi
    printf '%s' "$SELECTED" | apply_patch
    log "Pushed: $(printf '%s' "$SELECTED" | python3 -c 'import sys,json; print(", ".join(sorted(json.load(sys.stdin))))')"
    maybe_restart
    ;;

  set)
    [ $# -eq 1 ] || err "set takes exactly one KEY"
    valid_key "$1" || err "Invalid key name: $1"
    if [ -t 0 ]; then
      read -r -s -p "Value for $1 (hidden): " VALUE; echo
    else
      VALUE="$(cat)"
    fi
    [ -n "$VALUE" ] || err "Empty value — use 'delete' to remove a key."
    KEY="$1" VALUE="$VALUE" python3 -c 'import os,json; print(json.dumps({os.environ["KEY"]: os.environ["VALUE"]}))' | apply_patch
    log "Set: $1"
    maybe_restart
    ;;

  delete)
    [ $# -ge 1 ] || err "delete needs at least one KEY"
    require_secret
    for k in "$@"; do valid_key "$k" || err "Invalid key name: $k"; done
    existing="$(secret_keys)"
    for k in "$@"; do
      grep -qx -- "$k" <<<"$existing" || warn "$k not in Secret (skipping)"
    done
    confirm "Delete $* from $SECRET?"
    python3 -c 'import sys,json; print(json.dumps({k: None for k in sys.argv[1:]}))' "$@" | apply_patch
    log "Deleted: $*"
    maybe_restart
    ;;

  clear)
    require_secret
    confirm "Remove ALL $(secret_keys | grep -c .) keys from $SECRET?"
    secret_keys | python3 -c 'import sys,json; print(json.dumps({k.strip(): None for k in sys.stdin if k.strip()}))' | apply_patch
    log "Cleared all keys from $SECRET"
    maybe_restart
    ;;

  destroy)
    require_secret
    confirm "Delete the Secret '$SECRET' itself in '$NAMESPACE'?"
    kubectl delete secret "$SECRET" -n "$NAMESPACE" >/dev/null
    log "Deleted Secret $SECRET"
    warn "The pod will fail to start on next restart until the Secret is recreated (push --all)."
    ;;

  restart)
    do_restart
    ;;

  *)
    err "Unknown command: $CMD (see --help)"
    ;;
esac
