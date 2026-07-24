#!/usr/bin/env bash
# Contract coverage for wawagardenbar-app#580.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORKFLOW="$ROOT/.github/workflows/e2e-regression.yml"

require() {
  local pattern="$1"
  local description="$2"
  if ! rg -q --fixed-strings "$pattern" "$WORKFLOW"; then
    echo "FAIL: missing ${description}" >&2
    exit 1
  fi
}

require 'timeout --signal=TERM --kill-after=15s 150s npx wait-on http://localhost:3000 --timeout 120000' 'outer readiness deadline'
require '.e2e-server.pid' 'captured development-server PID'
require 'name: Stop dev server' 'always-run development-server teardown'
require 'e2e-server.log' 'server log artifact upload'

echo 'E2E regression readiness contract passed'
