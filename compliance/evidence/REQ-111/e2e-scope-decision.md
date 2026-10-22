---
req: REQ-111
generated_by: e2e-test-engineer
generated_at: 2026-10-20T06:45:00Z
e2e_required: true
spec_path: e2e/whatsapp-inbound-registration-templates.spec.ts
---

# E2E scope decision — REQ-111

## Outcome

**E2E required — covered.**

## Detail

- **`e2e_required`:** `true`.
- **Rationale:** N/A — covered below.
- **Spec path(s):** `e2e/whatsapp-inbound-registration-templates.spec.ts` (new).
- **ACs covered:** AC1 (phone-mismatch via email → `account_recovery` sent, `userId` resolves to the matched account), AC4 (regression — brand-new phone with no signal still gets `welcome_new_user`, unchanged). AC2 (order-number path) and AC3 (same-phone negative case) are covered at the unit level (`__tests__/services/whatsapp-inbound-service.classify.test.ts`, `.routing.test.ts`) per the implementation plan §4/§9 — no additional UI/transport surface distinguishes them from AC1's path at the e2e layer.

## Transport-layer spec note

This spec has no Playwright `page` object — it posts directly to `/api/webhooks/whatsapp` (Node `fetch` via Playwright's `request` fixture) and asserts on `IncomingMessage` rows via a direct `MongoClient` query, mirroring `e2e/support-ticket-whatsapp-inbound.spec.ts`'s existing pattern. Per the e2e-test-engineer skill's "Specs with no page object" section, `evidenceShot()` is N/A here; the test-execution-summary's per-spec pass/fail + asserted-behaviour row is the evidence form instead.

## Execution note (environment-specific)

Local execution for this REQ required a one-off, disposable e2e MongoDB (`wwg-e2e-mongo`, `mongo:7`, tmpfs, no auth, bound to a sandbox-reachable loopback port) because the session's sandbox could not reach the host's real `mongod` (a deliberate network boundary — confirmed via another Claude session with host visibility). Verified via a detached git worktree + isolated dev server pointed at the disposable Mongo, with `ENABLE_WHATSAPP_NOTIFICATIONS` left unset (false) so zero real WhatsApp network calls occurred. Both AC1 and AC4 passed; a pre-existing sibling spec (`e2e/support-ticket-whatsapp-inbound.spec.ts`) ran alongside with no regressions. This is an execution-environment note, not a scope exemption — the REQ-111 code path was genuinely exercised end-to-end.

A real bug was caught during this verification and fixed before commit: `actionTaken` was initially gated on `WhatsAppService.sendMessage()`'s `success` flag, which is always `false` when `ENABLE_WHATSAPP_NOTIFICATIONS` is unset (`SERVICE_DISABLED`) — meaning the "attempted send" signal would never read `sent_account_recovery` in any test/CI environment. Fixed to match the existing `welcome_new_user`/`welcome_back` branches' convention: `actionTaken` reflects "the call didn't throw" (attempted), not "Meta confirmed delivery" — consistent with how `NotificationService.send()` is already treated elsewhere in this file.

## Operator sign-off

I have reviewed the e2e-scope verdict above and confirm it matches the actual scope of this REQ's diff.

**Reviewer:** sdlc-implementer (agent) — william@ostendo.io, pending final operator review at Phase 4
**Date:** 2026-10-20
