#!/usr/bin/env bash
set -euo pipefail
WORKFLOW="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)/.github/workflows/reconcile-deployment.yml"
for text in 'workflow_dispatch:' 'deployments: write' 'RAILWAY_TOKEN' 'reconcile-railway-deployment.sh' 'manual_reconciliation' 'sdlc-config.json devaudit.base_url'; do
  rg -q --fixed-strings "$text" "$WORKFLOW"
done
echo 'reconcile deployment workflow contract passed'
