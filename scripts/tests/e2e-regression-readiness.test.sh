#!/usr/bin/env bash
# Contract coverage for wawagardenbar-app#580.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORKFLOWS=(
  "$ROOT/.github/workflows/ci.yml"
  "$ROOT/.github/workflows/e2e-regression.yml"
  "$ROOT/.github/workflows/feature-e2e.yml"
)

require() {
  local pattern="$1"
  local description="$2"
  local workflow
  for workflow in "${WORKFLOWS[@]}"; do
    if ! rg -q --fixed-strings "$pattern" "$workflow"; then
      echo "FAIL: missing ${description} in ${workflow#$ROOT/}" >&2
      exit 1
    fi
  done
}

require 'timeout --signal=TERM --kill-after=15s 150s npx wait-on http://localhost:3000 --timeout 120000' 'outer readiness deadline'

REGRESSION_WORKFLOW="$ROOT/.github/workflows/e2e-regression.yml"
for pattern in '.e2e-server.pid' 'name: Stop dev server' 'e2e-server.log'; do
  if ! rg -q --fixed-strings "$pattern" "$REGRESSION_WORKFLOW"; then
    echo "FAIL: regression workflow lost ${pattern}" >&2
    exit 1
  fi
done

echo 'E2E regression readiness contract passed'
