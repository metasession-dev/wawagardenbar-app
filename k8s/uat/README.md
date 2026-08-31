# wawagardenbar-app — Local UAT (k3s)

Deploys a self-contained UAT instance of wawagardenbar-app into the existing
`apps` namespace on the `ostendo-server` k3s cluster, as a **parallel trial**
next to the existing Railway UAT environment. Nothing on Railway is affected
by any of this.

See `../../LOCAL-UAT-DEPLOYMENT.md` for the full runbook (build/data
population/health check/recovery). This directory holds only the manifests.

## Why `apps` and not a dedicated namespace

`ostendo-server`'s platform convention
(`ostendo-workhorse-platform/runbooks/k3s-bootstrap.md`) is one
namespace per **workload group**, not per app — `apps` is that group for
hosted application workloads. Resources here are named `wawagardenbar-uat-*`
and labelled `app.kubernetes.io/name=wawagardenbar-app`,
`app.kubernetes.io/instance=uat` so they stay unambiguous alongside whatever
other projects land in the same namespace later.

## Database: shared, not per-app

Mongo is **not** deployed by this directory. `ostendo-server` runs one shared
`mongo:7` instance per cluster for all locally-hosted projects (mirrors the
existing Railway prod convention — see that repo's `DEPLOYMENT-ACTUAL.md`),
defined in the platform config repo:
`ostendo-workhorse-platform/k3s/manifests/` (`shared-mongo-*.yaml`).
That must already be running before this app's Deployment will come up
healthy — check with `kubectl get deploy shared-mongo -n apps`.

This project gets its own database (`wawagardenbar_uat`) and its own scoped
Mongo user (not the shared root credentials) on that instance. Provisioning
that user is a one-time step against the shared instance — see
`ostendo-workhorse-platform/k3s/manifests/README.md` "Connecting a
project" for the pattern; the resulting connection URI is stored in a
dedicated secret (`wawagardenbar-uat-mongo-creds`), separate from the
general app env secret below, so day-to-day env changes never touch DB
credentials.

## Apply order

```bash
# Precondition: shared-mongo is already running (see above) and
# wawagardenbar-uat-mongo-creds + wawagardenbar-uat-env secrets exist.
kubectl apply -f app-deployment.yaml
kubectl apply -f app-service.yaml
kubectl apply -f app-ingress.yaml
```

Or just run `../../scripts/bootstrap-uat-k3s.sh`, which checks those
preconditions and waits for the rollout to become healthy.

## Secret (app env, excluding Mongo)

Nothing here creates `wawagardenbar-uat-env`. It's created imperatively from
a local, gitignored `.env.uat.local` (see `../../.env.uat.example` for the
template) so no secret material is ever committed:

```bash
kubectl create secret generic wawagardenbar-uat-env -n apps \
  --from-env-file=../../.env.uat.local
```

Re-run with `kubectl delete secret wawagardenbar-uat-env -n apps` first if
values change, then `kubectl rollout restart deployment/wawagardenbar-uat-app -n apps`.

## Image source (open item)

`app-deployment.yaml` currently references a placeholder image. This repo's
CI already publishes to `ghcr.io/metasession-dev/wawagardenbar-app`, but that
registry package appears to require pull credentials this host doesn't yet
have configured, and building locally + `k3s ctr images import` needs root
access to the containerd socket that isn't available non-interactively
either. Resolve one of these before `app-deployment.yaml` will actually run:

1. Create an `imagePullSecret` for GHCR (needs a PAT with `read:packages`)
   and reference it under `imagePullSecrets` in the deployment, or
2. Confirm the GHCR package is public and drop the pull secret requirement,
   or
3. Build locally (`docker build -t wawagardenbar-app:uat-local .` from the
   repo root) and import into the cluster's containerd with
   `docker save wawagardenbar-app:uat-local | sudo k3s ctr images import -`,
   then set `image: wawagardenbar-app:uat-local` with
   `imagePullPolicy: Never`.
