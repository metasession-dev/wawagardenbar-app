# Release Ticket: REQ-111 — Account-recovery routing for inbound WhatsApp messages

**Status:** TESTED - PENDING SIGN-OFF
**Date:** 2026-10-20
**Requirement ID:** REQ-111
**Risk Level:** MEDIUM
**Issue:** [#933](https://github.com/metasession-dev/wawagardenbar-app/issues/933) (scoped slice — Sections D+E only)
**Implementation branch:** `feat/REQ-111-whatsapp-account-recovery-routing`

## Summary

Scoped slice of #933: adds `phone_mismatch` detection to the inbound WhatsApp router. Previously, an inbound message from a phone number not on file was always classified `new`, even when the message proactively identified the sender as an existing customer (e.g. by email or order number). Now, when such an identifier resolves to an existing account whose phone differs from the sender's, the message is classified `phone_mismatch` and the business sends the `account_recovery` template directly to the inbound sender — instead of silently auto-creating a brand-new account for someone who already has one. #933's Sections A/B/C (dev/UAT Meta App provisioning, UAT infra config, template-submission scripts) remain separately tracked and are explicitly out of scope for this REQ.

## AI contributors

| Tool        | Version  | Commits                                                                                      | Date       |
| ----------- | -------- | -------------------------------------------------------------------------------------------- | ---------- |
| Claude Code | Sonnet 5 | `e87454e` (plan+SRS+RTM+risk), `ad4f013` (implementation+unit tests), `6a74ed6` (e2e+bugfix) | 2026-10-20 |

## Implementation details

- `services/whatsapp-inbound-service.ts` — new `detectAccountRecoverySignal()` (email/order-number lookup, pure read); `handle()` calls it when `classifyCustomerState` returns `'new'`, reassigning to `phone_mismatch` on a genuine cross-account match and skipping the ordinary auto-create step; new branch sends `account_recovery` directly via `WhatsAppService.sendMessage` (not `NotificationService.send`, which would resolve the wrong recipient phone) — mirrors the existing `opt_out` branch's precedent.
- `models/incoming-message-model.ts` — `'phone_mismatch'` added to `IncomingCustomerState` and the schema enum.
- `lib/whatsapp-inbound-templates.ts` — `phone_mismatch: 'account_recovery'` map entry (documentation/source-of-truth completeness; the actual send bypasses this map's generic branch).
- `docs/SRS.md` — `REQ-WA-007` (new, Feature Area 27); `REQ-WA-005` traced unchanged (regression case).
- No ADR needed (3-file pattern extension inside an existing service, no new dependency/service/DB tier — see `compliance/evidence/REQ-111/architecture-decision.md`).
- Risk register: `R-037` (ACCEPTED — account-recovery hint disclosure via WhatsApp; bounded since no code handles the template's implied `YES`/`NEW` reply, so the disclosure can't be escalated into account access by this REQ).
- Tests: 2 new unit-test suites (`whatsapp-inbound-service.classify.test.ts` detector cases, `.routing.test.ts` routing-matrix cases) + 1 new e2e spec (`e2e/whatsapp-inbound-registration-templates.spec.ts`, AC1 + AC4).

## Bug found and fixed during verification

Local e2e verification caught a real implementation bug (not a test-authoring issue): `actionTaken` was initially gated on `WhatsAppService.sendMessage()`'s `success` flag, which is always `false` under the `SERVICE_DISABLED` short-circuit (`ENABLE_WHATSAPP_NOTIFICATIONS` unset/false — the default in test/CI environments). This meant the "attempted send" audit signal could never read `sent_account_recovery` anywhere outside live production with the flag enabled. Fixed to match the existing `welcome_new_user`/`welcome_back` branches' convention: `actionTaken` reflects "the call didn't throw" (attempted), not "Meta confirmed delivery."

## Verification

- Unit: 1,512 passed, 4 skipped (full suite); 37 tests across the two targeted files for this REQ.
- TypeScript/ESLint: 0 errors.
- npm audit --audit-level=high: exit 0, no new findings (no dependency changes).
- E2E: 2/2 targeted (AC1, AC4), run locally in a detached git worktree + isolated dev server against a disposable `mongo:7` container — this session's sandbox could not reach the host's real `mongod` (confirmed via a peer Claude session with host visibility; a specific firewall rule blocks port 27017 from this sandbox while a disposable container on a different port is reachable). Ran alongside the pre-existing sibling spec with no regressions.
- Full detail: `compliance/evidence/REQ-111/test-execution-summary.md`, `e2e-scope-decision.md`.

## Sign-off (dual-actor)

Solo-operator team — the "reviewer ≠ submitter" check is interpreted as actor type, not human identity: AI tooling (this implementation) and the human operator (portal approver) are distinct actors. MEDIUM risk auto-continued through Phase 1 per skill policy (no HIGH/CRITICAL plan-approval pause); the operator reviews the PR + performs the portal UAT review before Production approval.

## Release status note (2026-10-21)

**Not abandoned — deliberately held pending real WhatsApp UAT verification.** This REQ's remaining gap before Phase 4 (release PR + UAT review request) is a genuine round-trip WhatsApp message test in the UAT environment, which cannot run until the WGB DEV Meta app is published. Publishing that app is itself blocked on Meta's Go Live checklist requiring a reachable Terms of Service URL and a Data Deletion instructions URL that doesn't redirect unauthenticated reviewers to a login wall — both addressed by REQ-112 ([#938](https://github.com/metasession-dev/wawagardenbar-app/issues/938)).

**Decision (operator, 2026-10-21):** REQ-112 proceeds independently to `develop` (auto-deploys to UAT via `deploy-uat-k3s.yml`, no `main` release needed to unblock Meta review — UAT's domain is used for the app's Basic Settings URLs, not production). Once the WGB DEV app is published and this REQ's WhatsApp round-trip test passes in UAT, this release will be explicitly declared as a bundle with REQ-112 (`Bundles: #933, #938`) and submitted together via one shared `develop → main` release PR — both REQs are bundle-eligible (neither CRITICAL, only one risk tier apart, no file/logic overlap). This ticket's **Status** field remains `TESTED - PENDING SIGN-OFF` until that submission; no change needed here in the interim.
