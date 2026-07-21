#!/usr/bin/env bash
# Contract coverage for wawagardenbar-app#558.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
WORKFLOW="$ROOT/.github/workflows/ci.yml"

require() {
  local pattern="$1"
  local description="$2"
  if ! rg -q --fixed-strings "$pattern" "$WORKFLOW"; then
    echo "FAIL: missing ${description}" >&2
    exit 1
  fi
}

require 'timeout-minutes: 40' 'job timeout budget'
require 'timeout 15m npx playwright test --project=smoke --reporter=json,html' 'bounded Playwright execution'
require 'e2e-execution-metadata.json' 'structured E2E terminal metadata'
require 'e2e-dev-server.pid' 'managed development-server PID'
require 'name: Stop E2E dev server' 'always-run development-server cleanup'
require 'if: always()' 'always-run cleanup/artifact handling'
require 'name: Fail Quality Gates when a gate did not pass' 'terminal gate result enforcement'

echo 'quality-gates E2E lifecycle contract passed'
