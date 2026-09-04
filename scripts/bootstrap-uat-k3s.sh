#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────
# bootstrap-uat-k3s.sh — bring up the local k3s UAT trial from scratch
#
# Preconditions this script checks but does not fix for you:
#   - kubectl reachable, `apps` namespace exists
#   - `shared-mongo` Deployment already running in `apps`
#     (see ostendo_workhorse_configuration/k3s/manifests/README.md)
#   - `local-path` StorageClass repointed at /srv/ostendo/k3s
#   - `ghcr-pull-secret` exists in `apps` (docker-registry secret for GHCR)
#   - `wawagardenbar-uat-mongo-creds` secret exists in `apps`
#     (scoped Mongo user URI — see k8s/uat/README.md)
#
# What it does NOT do:
#   - create the `wawagardenbar-uat-env` secret for you if missing (prints
#     instructions instead — never fabricates secret values)
#   - populate data (prints the two documented options instead)
# ──────────────────────────────────────────────────────────────────

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NAMESPACE="apps"
INGRESS_HOST="wawagardenbar-app-uat.ostendo.lan"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${GREEN}[✓]${NC} $1"; }
warn() { echo -e "${YELLOW}[!]${NC} $1"; }
err()  { echo -e "${RED}[✗]${NC} $1"; exit 1; }

command -v kubectl >/dev/null 2>&1 || err "kubectl not found."

log "Checking apps namespace..."
kubectl get namespace "$NAMESPACE" >/dev/null 2>&1 || err "Namespace '$NAMESPACE' does not exist."

log "Checking shared Mongo is running..."
kubectl get deployment shared-mongo -n "$NAMESPACE" >/dev/null 2>&1 \
  || err "shared-mongo Deployment not found in '$NAMESPACE'. Apply it from ostendo_workhorse_configuration/k3s/manifests/ first."
kubectl rollout status deployment/shared-mongo -n "$NAMESPACE" --timeout=30s >/dev/null 2>&1 \
  || err "shared-mongo is not healthy. Check: kubectl get pods -n $NAMESPACE -l app.kubernetes.io/name=shared-mongo"

log "Checking local-path storage is rooted at /srv/ostendo/k3s..."
CURRENT_PATH="$(kubectl get configmap local-path-config -n kube-system -o jsonpath='{.data.config\.json}' 2>/dev/null | grep -o '/srv/ostendo/k3s[^"]*' || true)"
[ -n "$CURRENT_PATH" ] || err "local-path-config does not point at /srv/ostendo/k3s. Fix that before creating PVCs here."

log "Checking ghcr-pull-secret exists..."
kubectl get secret ghcr-pull-secret -n "$NAMESPACE" >/dev/null 2>&1 \
  || err "ghcr-pull-secret not found in '$NAMESPACE'. Create it yourself: kubectl create secret docker-registry ghcr-pull-secret -n apps --docker-server=ghcr.io --docker-username=<you> --docker-password=<PAT> --docker-email=<email>"

log "Checking wawagardenbar-uat-mongo-creds exists..."
kubectl get secret wawagardenbar-uat-mongo-creds -n "$NAMESPACE" >/dev/null 2>&1 \
  || err "wawagardenbar-uat-mongo-creds not found. See k8s/uat/README.md 'Database: shared, not per-app' to provision the scoped Mongo user first."

log "Checking wawagardenbar-uat-env exists..."
if ! kubectl get secret wawagardenbar-uat-env -n "$NAMESPACE" >/dev/null 2>&1; then
  warn "wawagardenbar-uat-env not found."
  if [ ! -f "$REPO_ROOT/.env.uat.local" ]; then
    warn "Copying .env.uat.example -> .env.uat.local. EDIT IT before continuing — placeholders are not usable secrets."
    cp "$REPO_ROOT/.env.uat.example" "$REPO_ROOT/.env.uat.local"
    chmod 600 "$REPO_ROOT/.env.uat.local"
    err "Edit $REPO_ROOT/.env.uat.local, then re-run this script."
  fi
  log "Creating wawagardenbar-uat-env from .env.uat.local..."
  kubectl create secret generic wawagardenbar-uat-env -n "$NAMESPACE" --from-env-file="$REPO_ROOT/.env.uat.local"
fi

log "Applying manifests..."
kubectl apply -f "$REPO_ROOT/k8s/uat/app-service.yaml"
kubectl apply -f "$REPO_ROOT/k8s/uat/app-ingress.yaml"
kubectl apply -f "$REPO_ROOT/k8s/uat/app-deployment.yaml"

log "Waiting for rollout..."
kubectl rollout status deployment/wawagardenbar-uat-app -n "$NAMESPACE" --timeout=180s \
  || err "Rollout did not become healthy. Check: kubectl describe pod -n $NAMESPACE -l app.kubernetes.io/component=app"

log "Checking /api/health through the Ingress host header (works even before DNS/hosts entry exists)..."
NODE_IP="$(kubectl get svc traefik -n kube-system -o jsonpath='{.status.loadBalancer.ingress[0].ip}' 2>/dev/null || true)"
if [ -n "$NODE_IP" ]; then
  curl -sf --max-time 10 -H "Host: $INGRESS_HOST" "http://$NODE_IP/api/health" && echo || warn "Health check via Ingress did not return healthy — check pod logs."
else
  warn "Could not resolve Traefik LoadBalancer IP automatically; check manually."
fi

echo ""
log "Stack is up. Next steps to populate data:"
echo "  1. Preferred (matches existing UAT convention): "
echo "     kubectl port-forward svc/shared-mongo 27020:27017 -n $NAMESPACE"
echo "     Set MONGODB_UAT_EXTERNAL_URI in .env.local to the local port-forward address,"
echo "     then run ./scripts/sync-prod-to-uat.sh (unmodified)."
echo "  2. Alternative (synthetic data only):"
echo "     kubectl exec -n $NAMESPACE deploy/wawagardenbar-uat-app -- npm run seed:menu"
echo "     kubectl exec -n $NAMESPACE deploy/wawagardenbar-uat-app -- npm run setup:admin"
echo ""
echo "  Add this once to /etc/hosts on ostendo-server for a friendlier URL:"
echo "    ${NODE_IP:-<traefik-ip>} $INGRESS_HOST"
