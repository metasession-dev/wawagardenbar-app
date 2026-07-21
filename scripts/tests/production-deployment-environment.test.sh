#!/usr/bin/env bash

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
WORKFLOWS=(
  "$ROOT/.github/workflows/post-deploy-prod.yml"
  "$ROOT/.github/workflows/e2e-regression.yml"
)

for workflow in "${WORKFLOWS[@]}"; do
  rg -q --fixed-strings "github.event.deployment_status.state == 'success'" "$workflow"
  rg -q --fixed-strings "github.event.deployment.environment == 'production'" "$workflow"
  rg -q --fixed-strings "github.event.deployment.environment == 'prod'" "$workflow"
  rg -q --fixed-strings "endsWith(github.event.deployment.environment, '/ production')" "$workflow"
done

is_production_environment() {
  case "${1,,}" in
    production|prod|*/\ production) return 0 ;;
    *) return 1 ;;
  esac
}

is_production_environment production
is_production_environment prod
is_production_environment 'Wawa Garden Bar / production'
is_production_environment 'Provider / Production'

for environment in uat staging preview 'Wawa Garden Bar / uat' 'production-preview'; do
  if is_production_environment "$environment"; then
    echo "Unexpected production match: $environment" >&2
    exit 1
  fi
done

echo 'qualified production environment workflow contract passed'
