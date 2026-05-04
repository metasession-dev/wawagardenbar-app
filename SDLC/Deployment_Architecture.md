---
description: How the wawagardenbar-app deploy pipeline actually works — Railway environments, branch mapping, and the files that drive it
---

# Deployment Architecture

**Purpose:** Concrete reference for how develop → UAT → main → production is wired up for this project. The 5-stage SDLC docs (`0-project-setup.md` … `5-deploy-main.md`) reference "UAT" and "production" abstractly — this doc fills in the real mechanics so a new joiner (or a sibling project copying this setup) doesn't have to reverse-engineer it.

---

## 1. Flow at a glance

```
┌──────────────────────┐   push     ┌──────────────────────┐
│  local / feature     ├───────────▶│  develop branch      │
└──────────────────────┘            └──────────┬───────────┘
                                               │
                          ┌────────────────────┴────────────────────┐
                          │                                         │
                          ▼                                         ▼
              ┌───────────────────────┐             ┌──────────────────────────┐
              │  GitHub Actions CI    │             │  Railway (native GitHub  │
              │  (self-hosted runner) │             │   integration, no GH     │
              │                       │             │   Actions workflow)      │
              │  quality-gates        │             │                          │
              │  register-release     │             │  Watches `develop`       │
              │  upload-evidence ─────┼──▶ META-    │  → builds Dockerfile     │
              │  (--environment uat)  │  COMPLY     │  → deploys to UAT env    │
              └───────────────────────┘             └──────────┬───────────────┘
                                                               │
                                          ┌────────────────────▼──────────────┐
                                          │  UAT URL (Railway)                │
                                          │  reviewer exercises the feature   │
                                          └────────────────────┬──────────────┘
                                                               │
                                                               ▼
                                          ┌───────────────────────────────────┐
                                          │  META-COMPLY portal               │
                                          │  reviewer approves release        │
                                          │  status → uat_approved            │
                                          └────────────────────┬──────────────┘
                                                               │
                                                               ▼
                                          ┌───────────────────────────────────┐
                                          │  PR develop → main                │
                                          │  `check-uat-approval.yml` passes  │
                                          │  (status ∈ uat_approved, …)       │
                                          └────────────────────┬──────────────┘
                                                               │ merge
                                                               ▼
                                          ┌───────────────────────────────────┐
                                          │  main branch                      │
                                          │                                   │
                                          │  Railway (prod env) auto-builds   │
                                          │  `post-deploy-prod.yml` runs      │
                                          │  health check + security headers  │
                                          │  marks release `released`         │
                                          └───────────────────────────────────┘
```

---

## 2. What lives where

### GitHub repo (`metasession-dev/wawagardenbar-app`)

| File                                       | Role                                                                                                                                                                                                             |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Dockerfile`                               | Multi-stage Node 20 / Alpine build. Produces the image Railway deploys.                                                                                                                                          |
| `railway.toml`                             | Tells Railway to use the Dockerfile, where the healthcheck lives (`/api/health`), restart policy. Applies to every Railway environment.                                                                          |
| `app/api/health/route.ts`                  | Lightweight Next.js route returning `200 {status: "healthy", uptime, timestamp}`. Railway hits this to decide whether a deploy is live.                                                                          |
| `.github/workflows/ci.yml`                 | Quality gates on every push to `develop`. Runs on the **self-hosted runner** (`github-runner-wawa-1.service`). Uploads evidence tagged `--environment uat`.                                                      |
| `.github/workflows/check-uat-approval.yml` | Runs on `pull_request` to `main`. Blocks the merge until META-COMPLY marks the release `uat_approved`.                                                                                                           |
| `.github/workflows/post-deploy-prod.yml`   | Runs on `push` to `main`. Waits for prod to come up, health-checks `${{ secrets.META_ATS_PROD_URL }}` equivalent (`${{ secrets.WAWA_PROD_URL }}`), uploads prod smoke evidence, flips the release to `released`. |

### Railway project

Single Railway project, **two environments**, both connected to the same GitHub repo via Railway's native integration (no GitHub Actions step does the deploy):

| Environment | Watches branch | Purpose                                                                   |
| ----------- | -------------- | ------------------------------------------------------------------------- |
| **UAT**     | `develop`      | Auto-deploys after every green push. Reviewer exercises the feature here. |
| **Prod**    | `main`         | Auto-deploys on merge from `develop`. Real customer traffic.              |

Each environment has its own variable set configured in the Railway dashboard — `MONGODB_URI`, `SESSION_PASSWORD`, `NEXT_PUBLIC_APP_URL`, etc. Pointing UAT at its own MongoDB keeps test data off prod.

### META-COMPLY

Supabase-backed portal (`meta-comply-production.up.railway.app`). Stores releases, evidence, approvals. The only state the pipeline cares about is `compliance_releases.status` — the UAT approval gate reads it, `post-deploy-prod.yml` writes `released` to it.

---

## 3. End-to-end timing (what actually happens, in order)

| #   | Trigger                             | Actor                     | Location           | Output                                                                                                |
| --- | ----------------------------------- | ------------------------- | ------------------ | ----------------------------------------------------------------------------------------------------- |
| 1   | Developer pushes to `develop`       | Dev                       | GitHub             | New commit on `develop`                                                                               |
| 2   | `ci.yml` starts                     | GitHub Actions            | self-hosted runner | Gates pass/fail; evidence uploaded to META-COMPLY; release row created with version `vYYYY.MM.DD[.N]` |
| 3   | Same push                           | Railway (native listener) | Railway build      | Docker image built                                                                                    |
| 4   | Image ready                         | Railway                   | Railway UAT env    | Container started; `/api/health` 200 → marked live                                                    |
| 5   | Developer / reviewer verifies       | Human                     | Browser @ UAT URL  | Feature checked; evidence note added to compliance/evidence                                           |
| 6   | Reviewer opens META-COMPLY          | Human                     | portal             | Release → "Approve" → status `uat_approved`                                                           |
| 7   | Developer opens PR `develop → main` | Dev                       | GitHub             | PR created; `check-uat-approval.yml` runs                                                             |
| 8   | UAT approval gate                   | GitHub Actions            | self-hosted runner | Reads status from META-COMPLY; passes → PR merge is unlocked                                          |
| 9   | Merge PR                            | Dev                       | GitHub             | Commit lands on `main`                                                                                |
| 10  | Same merge                          | Railway (native listener) | Railway build      | Docker image built                                                                                    |
| 11  | Image ready                         | Railway                   | Railway Prod env   | Container started; live on prod URL                                                                   |
| 12  | `post-deploy-prod.yml`              | GitHub Actions            | self-hosted runner | Waits for prod, health-check, security-header snapshot, marks release `released`                      |

Steps 2 and 3 run in parallel — CI does **not** block the Railway deploy. That's intentional: the deploy exists so the reviewer can touch it; CI failures are a signal to fix, not a mechanism to block deploys. The block happens at step 8 (UAT approval gate on the merge PR).

---

## 4. Why this shape (design decisions)

- **Railway's native listener, not GitHub Actions, does the deploy.** Keeps the workflow files small, avoids re-implementing Railway's Docker build in CI, and makes deploys independent of CI billing/quotas. Trade-off: deploy history lives in Railway, not in GitHub.
- **UAT and Prod are separate Railway environments in one project**, not separate projects. Same repo, same Dockerfile, same `railway.toml`; only env vars differ. Reduces drift.
- **Evidence is tagged `--environment uat` from CI** even though CI runs on a self-hosted runner, not on UAT. That's correct — the label records which _stage of the pipeline_ the evidence is for, not which machine produced it.
- **The gate is human-in-the-loop at META-COMPLY**, not automated E2E on UAT. An auto-approved "I deployed fine" check wouldn't satisfy the SDLC's Test Policy requirement for reviewer sign-off.
- **Post-deploy prod verification is read-only.** See `5-deploy-main.md` — no E2E or mutations against prod. Only health + security headers, uploaded as evidence.

---

## 5. Replicating this setup in a new project

Checklist for a sibling repo that wants the same flow:

### Repo-side

- [ ] `Dockerfile` (copy the multi-stage pattern from this repo; swap `tsx server.ts` for whatever the app's entrypoint is)
- [ ] `railway.toml` pointing at the Dockerfile and a healthcheck path
- [ ] `app/api/health/route.ts` (or the equivalent in non-Next.js stacks) returning 200
- [ ] `.github/workflows/ci.yml`, `check-uat-approval.yml`, `post-deploy-prod.yml` (synced from META-COMPLY SDLC templates; update `PROJECT_SLUG`)
- [ ] Self-hosted runner registered to the repo (see `github-runner-wawa-1.service` as the template)

### Railway-side

- [ ] New Railway project, connect GitHub repo
- [ ] Create **UAT** service/env: watch `develop` branch, configure env vars
- [ ] Create **Prod** service/env: watch `main` branch, configure env vars (different secrets!)
- [ ] Confirm a commit to `develop` triggers a UAT build; a merge to `main` triggers a prod build

### GitHub secrets

- [ ] `WAWA_UAT_URL` (or `<PROJECT>_UAT_URL`) — Railway-provided UAT URL, used by docs/reviewers, optionally by a future UAT smoke workflow
- [ ] `WAWA_PROD_URL` — referenced by `post-deploy-prod.yml` for the health check
- [ ] `META_COMPLY_SUPABASE_URL` (vars) and `META_COMPLY_SERVICE_ROLE_KEY` (secrets) — already shared across projects

### META-COMPLY

- [ ] Project registered with matching `slug` (the workflows reference it as `${PROJECT_SLUG}`)

---

## 6. Troubleshooting quick reference

| Symptom                                                                              | Likely cause                                                                                        | Check                                                                                                                        |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Push to `develop` doesn't trigger a Railway build                                    | Railway GitHub integration disconnected or branch not watched                                       | Railway dashboard → Settings → Source → Branch                                                                               |
| UAT comes up but shows old code                                                      | Railway cached build; Docker layer cache didn't invalidate                                          | Force redeploy from Railway dashboard; check `package-lock.json` actually changed                                            |
| `/api/health` returns 200 locally but Railway marks unhealthy                        | Healthcheck timing out (default 30s in `railway.toml`) or wrong path                                | Railway logs; bump `healthcheckTimeout`                                                                                      |
| UAT approval gate fails with "Release … not found after 6 attempts"                  | `register-release` job skipped (missing `vars.META_COMPLY_SUPABASE_URL`) or ran on a different date | Check CI logs for `Register Release` job; verify repo vars                                                                   |
| UAT approval gate fails with "status is 'evidence_uploaded' — UAT approval required" | Release not approved in META-COMPLY yet                                                             | Approve in portal, then re-run the `UAT Approval Gate` workflow (workflow_dispatch)                                          |
| `post-deploy-prod.yml` fails at "Wait for production deployment"                     | Prod URL not set, or Railway deploy still in progress / failing                                     | Check `secrets.WAWA_PROD_URL`; check Railway prod env logs                                                                   |
| CI `Install dependencies` step fails on peer deps                                    | npm strict peer resolution under React 19 ecosystem drift                                           | See if `.npmrc` with `legacy-peer-deps=true` is needed (sibling project hit this — tracked in their `compliance/tech-debt/`) |

---

## 7. What this document is not

- Not a replacement for the numbered SDLC stage docs (`0-project-setup.md` … `5-deploy-main.md`). Those are the process steps; this is the infrastructure they run on.
- Not authoritative if it conflicts with the Railway dashboard. The dashboard is the source of truth for environment configuration; this doc is a snapshot.
- Not owned by META-COMPLY templates. If the SDLC sync pipeline ever regenerates SDLC/, this file should survive — keep it out of the sync script's paths.
