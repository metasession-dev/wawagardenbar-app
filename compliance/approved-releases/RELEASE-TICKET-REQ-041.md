# Release Ticket: REQ-041 — Harden xlsx dependency (close R-002)

**Status:** TESTED - PENDING SIGN-OFF
**Date:** 2026-05-24
**Requirement ID:** REQ-041
**Risk Level:** MEDIUM
**GitHub Issue:** [#119](https://github.com/metasession-dev/wawagardenbar-app/issues/119)
**PR:** Will be linked when the develop → main PR is created
**DevAudit Release:** `https://devaudit.metasession.co/projects/wgb/` (release version `REQ-041`)

---

## Summary

Close risk-register **R-002**: the one high `xlsx` (SheetJS) advisory accepted at
onboarding. Pin `xlsx` to the patched SheetJS CDN build and return the
dependency-audit gate to fully strict. Dependency + config + compliance only —
no application source changed.

## AI Involvement

- **AI Tool Used:** Claude Opus 4.7 via Claude Code (CLI)
- **AI-Generated Changes:** `package.json`/`package-lock.json` dependency pin, `sdlc-config.json` gate flip, regenerated `ci.yml`, all REQ-041 compliance markdown. See `compliance/evidence/REQ-041/ai-prompts.md`.
- **Human Reviewer:** Stage 3 `dual_actor` approver (independent of submitter).

## Implementation Details

- `xlsx` `^0.18.5` → `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` (patched: CVE-2023-30533 prototype pollution + CVE-2024-22363 ReDoS, both reachable via the expense-import `XLSX.read` path). API-compatible; no source changes.
- `sdlc-config.json`: `accepted_dep_risks` cleared (`""`).
- `.github/workflows/ci.yml`: regenerated (`devaudit update v0.1.8`) — dependency-audit gate now hard-fails on any unaccepted high/critical.
- `compliance/risk-register.md`: R-002 → Closed. `compliance/RTM.md`: REQ-041 row added.

## Verification

- `npm audit --audit-level=high` → exit 0 (`xlsx` cleared; 7 residual moderate below the gate).
- `npm run build` + full Playwright e2e (export + import paths) → CI Quality Gates on `develop`.

## Residual Risk

7 moderate advisories (pre-existing transitive) remain — below the
`--audit-level=high` gate, no new high/critical, so R-002 closes without a successor.
