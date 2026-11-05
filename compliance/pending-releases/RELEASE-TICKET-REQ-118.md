# Release Ticket: REQ-118 — Threaded WhatsApp support with window-aware replies (WA-10)

**Status:** TESTED - PENDING SIGN-OFF
**Date:** 2026-11-05
**Requirement ID:** REQ-118
**Risk Level:** MEDIUM (bundle ceremony HIGH)
**Issue:** [#972](https://github.com/metasession-dev/wawagardenbar-app/issues/972) (sub-issue of tracker [#953](https://github.com/metasession-dev/wawagardenbar-app/issues/953))
**Implementation branch:** `feat/bundle-wa-04-wa-10` (declared bundle with REQ-117, whose release ticket is the core of the bundle)
**Absorbed predecessor releases:** None

## Summary

A customer has one ongoing support conversation.

- **Threading:** inbound WhatsApp messages append to the customer's open ticket; a resolved ticket reopens if the customer writes within 72 hours; otherwise a new ticket starts.
- **Reply mode:** chosen on the server from the customer's last inbound message. Inside 24 hours the reply goes out as free-form text; outside it, as the `support_reply` template. Staff see "Free message" or "Template message" before sending.
- **Chat with staff:** raises an `urgent` ticket with a 15-minute SLA. The queue sorts by SLA and highlights overdue tickets; a staff reply clears the SLA.
- **Template status:** `support_reply` was submitted to UAT and production on 2026-11-05 and is PENDING Meta review in both (`compliance/evidence/REQ-118/template-status.md`). Until a copy is approved, replies outside the window fall through to the existing email path.

## Bundled Changes

- **Core tracked release:** `REQ-117`
- **Bundle manifest:** `BUNDLED-CHANGES-REQ-117.json`
- **Absorbed predecessor releases:** None
- **Co-tracked bundle members:** REQ-118
- **Absorbed non-release work:** housekeeping commits since `origin/main` (see `BUNDLED-CHANGES-REQ-117.md`)
- **Why bundled here:** operator-declared bundle (`Bundles: #966, #972`) from tracker #953; REQ-118 is a co-tracked member of the bundle.
- **Evidence impact:** evidence stays per REQ (`compliance/evidence/REQ-117/` and `REQ-118/`).
- **Reviewer impact:** one HIGH-risk approval envelope covers both REQs.
- **Security / risk impact:** R-047 to R-050 (REQ-117) and R-051 (REQ-118); see each `risk-assessment.md`.
- **Reference:** commit range `origin/main..HEAD`, branch `feat/bundle-wa-04-wa-10`

## Absorbed Predecessor Releases

None.

## AI contributors

| Tool        | Version    | Commits                                                                              | Date       |
| ----------- | ---------- | ------------------------------------------------------------------------------------ | ---------- |
| Claude Code | Sonnet 5.5 | plan, ADR, risk, implementation, test and compliance commits on this bundle's branch | 2026-11-05 |

## Implementation details

- **`services/support-ticket-service.ts`:** thread append, reopen window, SLA fields. **`lib/support-reply-mode.ts`:** the 24-hour rule.
- **`services/whatsapp-inbound-service.ts`:** `support_text` and `chat_with_staff` go into the open ticket; `services/notification-service.ts` sends free-form text.
- **Models and views:** `SupportTicket` gains `lastCustomerMessageAt`, `slaDueAt` and the `urgent` priority; the support queue and reply thread show the mode and SLA.
- **Tests:** three new unit files plus updates, one new critical spec (4 tests), two updated specs.
- **SRS:** REQ-WA-011 to REQ-WA-013 new; REQ-WA-003 and REQ-WA-005 updated. **Risk register:** R-051. No ADR needed.

## Operator tasks (not code)

1. Check `support_reply` approval (`get_template` or `list_templates`) in UAT and production.
2. Live UAT round-trip once the UAT copy is approved; switch production on once its copy is approved.
3. Sign off the SRS, risk and no-ADR artefacts in `compliance/evidence/REQ-118/`, and the `e2e-scope-decision.md`.

## Verification

- TypeScript: 0 errors. ESLint: 0 errors. Unit/integration: 1846 passed, 4 skipped (full suite).
- E2E: full `critical` tier: 337 passed, 0 failed, 1 skipped; the new support-thread spec 4/4.
- Dependency audit: `0 accepted, 0 unresolved`.
- Full detail: `compliance/evidence/REQ-118/test-execution-summary.md` and `security-summary.md`.
- Not yet done (operator): live UAT round-trip, which waits for template approval.

## Sign-off (dual-actor)

This is a HIGH-risk bundle on a solo-operator team, so the "reviewer ≠ submitter" check is read as actor type, not human identity. The AI tooling that implemented these REQs and the human operator who performs UAT and approves on the portal are distinct actors.

- **Submitter (implementation):** Claude Code (Sonnet 5.5)
- **UAT reviewer / approver:** operator, on the DevAudit portal
- **Operator approvals on record:** plan approval, HMAC PIN-hash deviation, ADR-008 Accepted and R-047 to R-051 sign-off (2026-11-05); `support_reply` submission to UAT and production (2026-11-05).
