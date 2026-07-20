#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HELPER="$ROOT/scripts/has-req-tagged-e2e-result.py"
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

cat > "$WORKDIR/tagged.json" <<'EOF'
{
  "suites": [{"title":"profitability", "specs":[{"title":"select category", "annotations":[{"type":"req","description":"REQ-094 AC3"}], "tests":[{"results":[{"status":"passed"}]}]}]}]
}
EOF
python3 "$HELPER" REQ-094 "$WORKDIR/tagged.json"

cat > "$WORKDIR/untagged.json" <<'EOF'
{
  "suites": [{"title":"smoke", "specs":[{"title":"dashboard loads", "tests":[{"results":[{"status":"passed"}]}]}]}]
}
EOF
if python3 "$HELPER" REQ-094 "$WORKDIR/untagged.json"; then
  echo 'untagged smoke result must not be attributed to REQ-094' >&2
  exit 1
fi

cat > "$WORKDIR/skipped.json" <<'EOF'
{
  "suites": [{"specs":[{"title":"REQ-094 skipped", "tests":[{"results":[{"status":"skipped"}]}]}]}]
}
EOF
if python3 "$HELPER" REQ-094 "$WORKDIR/skipped.json"; then
  echo 'skipped result must not be treated as an execution' >&2
  exit 1
fi

echo 'REQ-tagged E2E result guard regression test passed'
