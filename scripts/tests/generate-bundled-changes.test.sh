#!/usr/bin/env bash
# Regression coverage for wawagardenbar-app#519.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

mkdir -p "$WORKDIR/scripts" "$WORKDIR/compliance/pending-releases" "$WORKDIR/cli"
cp "$ROOT/scripts/generate-bundled-changes.sh" "$WORKDIR/scripts/"
printf '{"version":"test"}\n' > "$WORKDIR/cli/package.json"
cat > "$WORKDIR/compliance/pending-releases/RELEASE-TICKET-REQ-200.md" <<'EOF'
# Release Ticket — REQ-200
- **Absorbed predecessor releases:** v2026.07.14
EOF
cat > "$WORKDIR/compliance/pending-releases/RELEASE-TICKET-v2026.07.14.md" <<'EOF'
# Release Ticket: v2026.07.14 (housekeeping)
## Summary
Historical housekeeping context.
EOF

git -C "$WORKDIR" init -q
git -C "$WORKDIR" config user.email test@example.invalid
git -C "$WORKDIR" config user.name test
git -C "$WORKDIR" add .
git -C "$WORKDIR" commit -qm 'chore: seed bundle fixture'
BASE="$(git -C "$WORKDIR" rev-parse HEAD)"
git -C "$WORKDIR" commit --allow-empty -qm 'test: [REQ-199] tracked verification'
git -C "$WORKDIR" commit --allow-empty -qm 'docs: [REQ-198] tracked documentation'
git -C "$WORKDIR" commit --allow-empty -qm 'test: generic housekeeping verification'

(cd "$WORKDIR" && bash scripts/generate-bundled-changes.sh "$BASE" REQ-200 --json-out manifest.json >/dev/null)
jq -e '[.members[].version] == ["v2026.07.14"]' "$WORKDIR/manifest.json" >/dev/null
jq -e '[.nonReleaseWorkItems[].title] == ["test: generic housekeeping verification"]' "$WORKDIR/manifest.json" >/dev/null

echo 'generate-bundled-changes regression test passed'
