# Security Summary — REQ-047

**Requirement:** REQ-047 — Harden CORS origin reflection (`lib/cors.ts`)
**Date:** 2026-05-25

## Finding addressed

| | |
| --- | --- |
| Rule | `javascript.express.security.cors-misconfiguration` |
| Severity | WARNING |
| Location | `lib/cors.ts:36` (pre-fix) |
| Source | semgrep `--config auto`, restored by DevAudit-Installer #48 / v0.1.10 |

`Access-Control-Allow-Origin` was set from the request's own `origin` header, and the allow-list honoured a `'*'` entry, while `Access-Control-Allow-Credentials: true` is always set. Reflecting an arbitrary origin together with credentials is a CORS misconfiguration (CWE-942): any website could issue credentialed cross-origin requests against the app.

> Note on prior gate state: this finding was **latent**, not new. The SAST gate had been a no-op because `sast-results.json` was corrupted at generation, so semgrep findings were never counted. REQ-047 is the first change evaluated by the restored gate.

## Fix

- Origin reflected only on an **exact allow-list match**; `'*'` branch removed.
- Header set from the matched allow-list **literal**, not user input.

## Result

- semgrep: `cors-misconfiguration` cleared → **0 findings** (baseline 0) on the develop CI run.
- No new findings introduced.
- Credentials are now only ever paired with an explicitly configured origin.
