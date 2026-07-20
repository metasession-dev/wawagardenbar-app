#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HELPER="$ROOT/scripts/derive-release-version.sh"
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT

git -C "$WORKDIR" init -q --initial-branch=main
git -C "$WORKDIR" config user.email test@example.com
git -C "$WORKDIR" config user.name test
printf 'initial\n' > "$WORKDIR/file.txt"
git -C "$WORKDIR" add file.txt
git -C "$WORKDIR" commit -q -m 'feat: initial tracked work [REQ-094]'
mkdir -p "$WORKDIR/compliance/pending-releases"
printf '# Release Ticket\n' > "$WORKDIR/compliance/pending-releases/RELEASE-TICKET-REQ-094.md"
printf 'hotfix\n' >> "$WORKDIR/file.txt"
git -C "$WORKDIR" add file.txt
git -C "$WORKDIR" commit -q -m 'ci: independent hotfix back-merge'

DEFAULT_VERSION="$(cd "$WORKDIR" && bash "$HELPER")"
EXPECTED_DATE="v$(date -u +%Y.%m.%d)"
if [ "$DEFAULT_VERSION" != "$EXPECTED_DATE" ]; then
  echo "Expected independent back-merge to derive $EXPECTED_DATE, got $DEFAULT_VERSION" >&2
  exit 1
fi

EXCEPTION_VERSION="$(cd "$WORKDIR" && DEVAUDIT_ALLOW_PENDING_TICKET_FALLBACK=1 bash "$HELPER")"
if [ "$EXCEPTION_VERSION" != 'REQ-094' ]; then
  echo "Expected explicit fallback to derive REQ-094, got $EXCEPTION_VERSION" >&2
  exit 1
fi

printf 'req change\n' >> "$WORKDIR/file.txt"
git -C "$WORKDIR" add file.txt
git -C "$WORKDIR" commit -q -m '[REQ-095] fix: tracked release change'
TAGGED_VERSION="$(cd "$WORKDIR" && bash "$HELPER")"
if [ "$TAGGED_VERSION" != 'REQ-095' ]; then
  echo "Expected tagged commit to derive REQ-095, got $TAGGED_VERSION" >&2
  exit 1
fi

echo 'derive-release-version regression test passed'
