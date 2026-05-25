# Release Ticket: REQ-047 — Harden CORS origin reflection

**Status:** TESTED - PENDING SIGN-OFF
**Date:** 2026-05-25
**Requirement ID:** REQ-047
**Risk Level:** LOW
**GitHub Issue:** [#128](https://github.com/metasession-dev/wawagardenbar-app/issues/128)
**DevAudit Release:** `https://devaudit.metasession.co/projects/wgb/` (release version `REQ-047`)

---

## Summary

Close the `javascript.express.security.cors-misconfiguration` finding in
`lib/cors.ts`, surfaced when the SAST gate was restored by DevAudit-Installer
#48 / v0.1.10. `applyCors` now reflects an origin only on an exact allow-list
match and echoes the configured literal; the `'*'` branch (which reflected an
arbitrary origin alongside `Access-Control-Allow-Credentials: true`) is removed.

## AI Involvement

- **AI Tool Used:** Claude Opus 4.7 via Claude Code (CLI)
- **AI-Generated Changes:** `lib/cors.ts`, `__tests__/security/cors-origin-reflection.test.ts`, all REQ-047 compliance markdown. See `compliance/evidence/REQ-047/ai-prompts.md`.
- **Human Reviewer:** Stage 3 `dual_actor` approver (independent of submitter).

## Implementation Details

- `applyCors`: `allowedOrigins.find(o => o === origin)` → set `Access-Control-Allow-Origin` from the matched literal; drop `'*'`.
- Behaviour change: `CORS_ALLOWED_ORIGINS='*'` no longer reflects arbitrary origins (effectively same-origin). Explicit allow-listed origins unchanged.
- No data/schema impact.

## Verification

- `npx tsc --noEmit` → 0 errors (CI).
- `npx vitest run __tests__/security/cors-origin-reflection.test.ts` → 5/5 (CI).
- SAST (semgrep `--config auto`) → 0 findings (baseline 0); `cors-misconfiguration` cleared (CI).
- Build + full Playwright e2e → green (CI Quality Gates on develop).

## Residual Risk

None identified. Credentials are now only paired with explicitly configured origins. Deployments needing cross-origin access must list explicit origins (no wildcard).
