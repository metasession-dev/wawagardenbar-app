# REQ-045 — GRANDFATHERED (pre-onboarding baseline)

**Status:** PRE-ONBOARDING BASELINE — see `compliance/RTM.md` row REQ-045 and `compliance/risk-register.md` R-001.

**Source PR:** [#116 — `release: super-admin tab delete + inventory revert (PRs #113, #114, #115)`](https://github.com/metasession-dev/wawagardenbar-app/pull/116)
**Merge commit:** `bba04c8`, merged to `main` 2026-05-23
**Risk:** LOW — release coordination only, no new code

## What this REQ covers

The release PR (develop→main) that bundled three UAT-verified PRs to production on 2026-05-23:

- **REQ-042 / PR #113** — `feat(tabs): super-admin can delete tabs with optional inventory revert`
- **REQ-043 / PR #114** — `fix(tabs): emphasise Revert items as the safe default in delete dialog`
- **REQ-044 / PR #115** — `fix(inventory): route deduct/restore via locations[0] for trackByLocation rows`

See those REQs' `GRANDFATHERED.md` for per-change details.

## Release verification (preserved on the PR)

- CI green on the release PR (Quality Gates 3m2s; Railway UAT build success).
- Post-merge prod health check: `https://wawagardenbar-app-production-45c8.up.railway.app/api/health` returned 200 with fresh `uptime: 9s` after deploy.
- Behaviour-change watch: low-stock alerts on prod monitored for one day post-deploy (REQ-044's `trackByLocation` fix).

## Why this directory contains no four-eyes evidence

Pre-DevAudit-re-onboarding (2026-05-24); no four-eyes flow ran. Release was a single-maintainer self-merge per the practice in effect at that moment.

## Compensating control going forward

REQ-046 onward (the first post-batch-2 REQ, PR #124) goes through the full DevAudit gated flow.
