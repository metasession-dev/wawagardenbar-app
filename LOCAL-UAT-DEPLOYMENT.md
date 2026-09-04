# Local UAT Deployment (k3s on ostendo-server)

Self-contained trial of a UAT environment for wawagardenbar-app, hosted on
`ostendo-server`'s existing k3s cluster, **in parallel with** the existing
Railway UAT environment — nothing on Railway is affected by this. See
`k8s/uat/README.md` for the manifest-level detail; this document is the
operational runbook.

## Why k3s and not Docker Compose

`ostendo-server` has its own platform spec
(`ostendo-workhorse-platform/docs/requirements.md`) requiring hosted app
services to run as k3s workloads, not ad hoc Docker containers. This is the
first real workload deployed to that cluster.

## Architecture

- **Namespace**: `apps` (the existing shared namespace for hosted app
  workloads on this cluster — not a dedicated namespace per project).
- **Database**: a cluster-shared `mongo:7` instance (`shared-mongo`, defined
  in the platform config repo, not this one), one database per project.
  wawagardenbar-app gets its own database (`wawagardenbar_uat`) and its own
  scoped Mongo user — not the shared root credentials.
- **App**: `wawagardenbar-uat-app` Deployment, pulling
  `ghcr.io/metasession-dev/wawagardenbar-app:develop` via `ghcr-pull-secret`
  (a `kubernetes.io/dockerconfigjson` secret you create yourself from a
  classic GitHub PAT with `read:packages` — fine-grained PATs don't support
  GHCR pulls as of this writing).
- **Networking**: ClusterIP Service + Traefik Ingress at
  `wawagardenbar-app-uat.ostendo.lan`, routed via the node's LAN IP
  (`192.168.1.179`). No TLS yet (no internal CA/cert-manager convention
  established on this cluster) — plain HTTP for this trial.
- **Storage**: `local-path` StorageClass, repointed during this work from
  the system disk (`/var/lib/rancher/k3s/storage`) to the 1.8TB data disk
  (`/srv/ostendo/k3s/local-path`) — this was a pre-existing gap tracked (but
  unchecked) in the platform's own `execution_checklist.md` Phase 9.

## Environment variables

Authoritative variable names live in
`docs/operations/environment-variables-fixed.md` — do not reintroduce the
old `MONGODB_URI`/`SESSION_SECRET`/`EMAIL_*` names from the stale
`docker-compose.yml`. Two secrets carry them into the pod:

| Secret                          | Contents                                                                        | Created from                                                      |
| ------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `wawagardenbar-uat-env`         | Everything except Mongo (session, Monnify, Paystack, SMTP, Instagram, app URLs) | `.env.uat.local` (gitignored; template at `.env.uat.example`)     |
| `wawagardenbar-uat-mongo-creds` | `MONGODB_WAWAGARDENBAR_APP_URI`, `MONGODB_URI`                                  | Provisioned once against `shared-mongo` — see `k8s/uat/README.md` |

## First-time setup

1. Confirm `shared-mongo` is running in `apps`
   (`ostendo-workhorse-platform/k3s/manifests/`).
2. Provision this project's scoped Mongo user and
   `wawagardenbar-uat-mongo-creds` secret (`k8s/uat/README.md`).
3. Create `ghcr-pull-secret` (classic PAT, `read:packages` scope):
   ```bash
   kubectl create secret docker-registry ghcr-pull-secret -n apps \
     --docker-server=ghcr.io --docker-username=<you> \
     --docker-password=<PAT> --docker-email=<email>
   ```
4. `cp .env.uat.example .env.uat.local`, fill in real values, `chmod 600`.
5. `./scripts/bootstrap-uat-k3s.sh` — checks all of the above, applies
   manifests, waits for a healthy rollout, prints data-population options.
6. Add `192.168.1.179 wawagardenbar-app-uat.ostendo.lan` to `/etc/hosts` on
   any machine that needs the friendly hostname (the script prints this
   line for you).

## Data population

Two documented options, no new code:

1. **Preferred** (matches how UAT has always been populated):
   ```bash
   kubectl port-forward svc/shared-mongo 27020:27017 -n apps
   ```
   Set `MONGODB_UAT_EXTERNAL_URI` in `.env.local` to
   `mongodb://wawagardenbar_uat:<password>@localhost:27020/wawagardenbar_uat?authSource=wawagardenbar_uat`,
   then run the existing `./scripts/sync-prod-to-uat.sh` unchanged.
2. **Synthetic only**:
   ```bash
   kubectl exec -n apps deploy/wawagardenbar-uat-app -- npm run seed:menu
   kubectl exec -n apps deploy/wawagardenbar-uat-app -- npm run seed:users
   kubectl exec -n apps deploy/wawagardenbar-uat-app -- npm run setup:admin
   ```

## Health check

```bash
curl -H "Host: wawagardenbar-app-uat.ostendo.lan" http://192.168.1.179/api/health
# or, once /etc/hosts is set:
curl http://wawagardenbar-app-uat.ostendo.lan/api/health
```

## Updating to a new build

```bash
kubectl rollout restart deployment/wawagardenbar-uat-app -n apps
kubectl rollout status deployment/wawagardenbar-uat-app -n apps
```

## Disaster recovery

See `docs/DISASTER-RECOVERY.md` Scenario 7 for the full crash-to-recovery
procedure. Short version: everything needed to rebuild this from nothing is
either versioned here (`k8s/uat/*.yaml`, this doc), versioned in the
platform config repo (`shared-mongo-*.yaml`), or a one-time secret the
operator holds outside this repo (`.env.uat.local`, the GHCR PAT) — nothing
is only-in-memory on this host except the Secret objects themselves and the
PVC data, both reproducible from those inputs.

## Explicitly deferred

- **CI wiring**: `DEVAUDIT_BASE_URL` / `sdlc-config.json` stay pointed at
  Railway UAT for now (parallel trial, not a cutover). When revisited: the
  self-hosted GitHub Actions runner on this host is a host-level systemd
  service outside the k3s pod network, so it reaches this Ingress via the
  Traefik LoadBalancer IP/hostname, not cluster-internal DNS.
- **TLS** for the internal Ingress.
- **SDLC/REQ tracking** for this infrastructure work — confirm with the
  operator whether it should be tracked as a REQ before further changes.
