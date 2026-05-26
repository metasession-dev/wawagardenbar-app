# AI Prompts — REQ-047

**Requirement:** REQ-047 — Harden CORS origin reflection (`lib/cors.ts`)
**Date:** 2026-05-25
**Tool:** Claude Opus 4.7 via Claude Code (CLI)

Operating instruction (paraphrased): while fixing DevAudit-Installer #48 (corrupted gate JSON), the restored SAST gate surfaced a CORS finding in `lib/cors.ts`; the user chose **"Fix lib/cors.ts"** over triaging/baseline.

Key AI actions, in order:

1. Root-caused the gate JSON corruption (semgrep `2>&1`, Playwright `--reporter=json,html > file`) and shipped the fix in DevAudit-Installer v0.1.10 (#48).
2. Regenerated WGB's `ci.yml` (`devaudit update v0.1.10`); the now-valid `sast-results.json` exposed `cors-misconfiguration` at `lib/cors.ts:36` — previously masked because the corrupted file always parsed to 0 findings.
3. Filed issue #128; classified LOW risk (internal admin app, explicit allow-list unaffected).
4. Hardened `applyCors`: match origin against the allow-list, echo the matched literal, drop the `'*'` branch.
5. Wrote `__tests__/security/cors-origin-reflection.test.ts` (5 cases).
6. Authored this evidence set + release ticket; added the RTM row.

Verification deferred to the develop CI Quality Gates (no local node_modules/registry in the authoring environment); SAST must report 0 findings.
