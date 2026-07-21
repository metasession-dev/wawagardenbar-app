#!/usr/bin/env bash
# Contract tests for wawagardenbar-app#552.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
HELPER="$ROOT/scripts/reconcile-railway-deployment.sh"
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
mkdir -p "$WORK/bin"
cat > "$WORK/bin/railway" <<'EOF'
#!/usr/bin/env bash
printf '%s' "$MOCK_RAILWAY_JSON"
EOF
cat > "$WORK/bin/curl" <<'EOF'
#!/usr/bin/env bash
printf '%s' "${MOCK_HTTP:-200}"
EOF
cat > "$WORK/bin/gh" <<'EOF'
#!/usr/bin/env bash
if [[ "$*" == *"--jq"* ]]; then printf '%s' "${MOCK_EXISTING:-[]}"; else echo "$*" >> "$MOCK_GH_LOG"; fi
EOF
chmod +x "$WORK/bin/"*
run() { (cd "$WORK" && PATH="$WORK/bin:$PATH" MOCK_GH_LOG="$WORK/gh.log" "$@" bash "$HELPER" --repo=metasession-dev/wawagardenbar-app --sha=abc --github-deployment-id=42 --railway-deployment-id=r1 --railway-project=p --railway-service=s --health-url=https://health.test); }
GOOD='[{"id":"r1","status":"SUCCESS","meta":{"repo":"metasession-dev/wawagardenbar-app","branch":"main","commitHash":"abc"}}]'
run env MOCK_RAILWAY_JSON="$GOOD"
rg -q '"provenance": "manual_reconciliation"' "$WORK/deployment-reconciliation.json"
if run env MOCK_RAILWAY_JSON='[{"id":"r1","status":"SUCCESS","meta":{"repo":"metasession-dev/wawagardenbar-app","branch":"main","commitHash":"wrong"}}]'; then exit 1; fi
if run env MOCK_RAILWAY_JSON="$GOOD" MOCK_HTTP=500; then exit 1; fi
rm -f "$WORK/gh.log"
run env MOCK_RAILWAY_JSON="$GOOD" MOCK_EXISTING='[{"state":"success","description":"railway_deployment=r1"}]'
[ ! -f "$WORK/gh.log" ]
echo 'reconcile-railway-deployment contract passed'
