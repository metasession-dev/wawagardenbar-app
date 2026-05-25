# Test Scope — REQ-047

**Requirement:** REQ-047 — Harden CORS origin reflection (`lib/cors.ts`)
**Risk Level:** LOW
**Date:** 2026-05-25
**GitHub Issue:** [#128](https://github.com/metasession-dev/wawagardenbar-app/issues/128)

## In scope

- `lib/cors.ts` `applyCors()` — origin-reflection logic only.
- Unit coverage of the allow-list / reflection decision and the static header set.

## Out of scope

- `lib/socket-server.ts` — has its own independent socket.io CORS config (`NEXT_PUBLIC_APP_URL`); not touched.
- Callers of `applyCors` — behaviour for an explicitly allow-listed origin is unchanged, so no route-level changes are required.
- E2E — no user-facing behaviour change for legitimate (allow-listed) origins; covered by unit tests + the SAST gate.

## Test layers

| Layer | Applies | Why |
| --- | --- | --- |
| Unit (vitest) | ✅ | Pure function over headers + env; fully unit-testable without a browser or DB. |
| SAST (semgrep) | ✅ | The change must clear `javascript.express.security.cors-misconfiguration` (baseline 0). |
| E2E (Playwright) | ❌ | No behaviour change for allow-listed origins; no UI surface. Deliberately deferred. |
| Manual UAT | ❌ | No user-visible change. |
