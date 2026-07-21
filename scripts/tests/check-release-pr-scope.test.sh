#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

mkdir -p "$WORKDIR/scripts" "$WORKDIR/compliance/pending-releases"
cp "$ROOT/scripts/check-release-pr-scope.sh" \
  "$ROOT/scripts/derive-release-version.sh" \
  "$ROOT/scripts/extract-release-metadata.sh" \
  "$WORKDIR/scripts/"
chmod +x "$WORKDIR/scripts/"*.sh
cat > "$WORKDIR/compliance/pending-releases/RELEASE-TICKET-REQ-094.md" <<'EOF'
# Release Ticket -- REQ-094: Scope test

## Summary

Tracked release fixture.
EOF

git -C "$WORKDIR" init -q --initial-branch=develop
git -C "$WORKDIR" config user.email test@example.com
git -C "$WORKDIR" config user.name test
printf 'integration head\n' > "$WORKDIR/file.txt"
git -C "$WORKDIR" add .
git -C "$WORKDIR" commit -q -m 'ci: untagged integration head'

run_scope_check() {
  (
    cd "$WORKDIR"
    PR_TITLE='[REQ-094] release: promote tracked release' \
      PR_BODY='' \
      HEAD_REF="$1" \
      bash scripts/check-release-pr-scope.sh
  )
}

run_scope_check develop

if run_scope_check 'feature/no-pending-ticket-inheritance'; then
  echo 'Feature CI must not inherit a pending tracked release.' >&2
  exit 1
fi

echo 'check-release-pr-scope regression test passed'
