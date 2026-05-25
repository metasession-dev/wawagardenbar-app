# Implementation Plan — REQ-047

**Requirement:** REQ-047 — Harden CORS origin reflection (`lib/cors.ts`)
**Risk Level:** LOW
**Date:** 2026-05-25
**GitHub Issue:** [#128](https://github.com/metasession-dev/wawagardenbar-app/issues/128)

## Background

DevAudit-Installer #48 / v0.1.10 restored the SAST gate (previously a no-op: `sast-results.json` was corrupted by merged stderr, so `json.load` always failed and findings defaulted to 0). The restored gate surfaced a pre-existing finding:

```
javascript.express.security.cors-misconfiguration (WARNING)
lib/cors.ts:36
```

`applyCors` reflected the request `origin` into `Access-Control-Allow-Origin` whenever the allow-list contained the origin **or `'*'`**, while always setting `Access-Control-Allow-Credentials: true`. The `'*'` branch reflects an arbitrary origin with credentials — any site could make credentialed cross-origin requests.

## Change

`lib/cors.ts` `applyCors()`:
- Match the request origin against the allow-list with `allowedOrigins.find(allowed => allowed === origin)`.
- Set `Access-Control-Allow-Origin` from the **matched allow-list literal** (`matchedOrigin`), not the raw request header — drives the response from configured values, which is the pattern the SAST rule expects.
- Drop the `'*'` branch entirely. A `'*'` entry no longer reflects arbitrary origins.

No other files change. `lib/socket-server.ts` keeps its independent socket.io CORS config.

## Behaviour change (documented)

- **Explicit allow-listed origins:** unchanged — still reflected, with credentials.
- **`CORS_ALLOWED_ORIGINS='*'`:** previously reflected any caller's origin (with credentials); now reflects nothing (effectively same-origin). This is the intended hardening — `'*'` + credentials + reflection is unsafe and is not a configuration this internal admin app should rely on. Deployments needing cross-origin access must list explicit origins.

## Verification

Unit test `__tests__/security/cors-origin-reflection.test.ts` (5 cases) + the SAST gate returning 0 findings on the develop CI run.

## Rollback

Single-file revert of `lib/cors.ts`; no data or schema impact.
