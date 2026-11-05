# Security Evidence Summary — REQ-118

**Date:** 2026-11-05
**Risk class:** MEDIUM (bundle ceremony HIGH)

## Bundled Release Context

- **Core tracked release:** `REQ-117`
- **Absorbed predecessor releases:** None
- **Absorbed non-release work:** housekeeping commits since `origin/main` (DevAudit 1.12.0 template sync, sharded-regression CI tweak, REQ-116 accepted-failure record); see `compliance/pending-releases/BUNDLED-CHANGES-REQ-117.md`
- **Why bundled here:** operator-declared bundle (`Bundles: #966, #972`). REQ-118 is a co-tracked member of the bundle. Both touch the WhatsApp channel and ship behind one UAT.
- **Evidence impact:** evidence stays per REQ. This folder covers REQ-118 only; REQ-117 has its own folder.
- **Reviewer impact:** one approval envelope (`REQ-117`, HIGH) covers both REQs; the reviewer reads both evidence folders.
- **Security / risk impact:** see the table below. Bundle ceremony is HIGH because REQ-117 is HIGH.
- **Reference:** commit range `origin/main..HEAD`, branch `feat/bundle-wa-04-wa-10`

| Control                           | Result            | Evidence                                                                                                                                                                                                     |
| --------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Dependency audit                  | PASS              | `scripts/evaluate-npm-audit.sh`: `0 accepted, 0 unresolved`. `package.json` and `package-lock.json` are unchanged                                                                                            |
| SAST                              | PASS (local) / CI | `npx tsc --noEmit`: 0 errors. `npm run lint`: 0 errors. `semgrep` is not installed locally; CI Quality Gates runs it on the PR                                                                               |
| Reply mode chosen server-side     | PASS              | `lib/support-reply-mode.ts` computes free-form versus template from the last inbound message, not from the client (R-051). Unit and critical-spec tests assert the logged `mode` and the template parameters |
| Wrong-customer exposure           | PASS (unchanged)  | The queue and detail view stay behind the existing support RBAC                                                                                                                                              |
| Forged inbound messages           | PASS (unchanged)  | Signature check and insert-first dedup from REQ-116 apply before any threading                                                                                                                               |
| Thread growth by flooding         | PASS              | The per-phone rate limit from REQ-116 (ADR-007) applies to appended messages                                                                                                                                 |
| SLA field integrity               | PASS              | `slaDueAt` is set only by the `chat_with_staff` path and cleared by a staff reply; covered by unit and critical-spec tests                                                                                   |
| New dependencies / external calls | PASS              | None                                                                                                                                                                                                         |

## Data handling

Personal data touched: phone, first name and message text, already stored in support tickets. Two timestamps are added (`lastCustomerMessageAt`, `slaDueAt`). No new data category. Retention of tickets is unchanged here (WA-14 owns retention).

## Post-deploy controls

- Revert the bundle merge to roll back. The new ticket fields are additive and ignored by the old code; threaded tickets stay as one ticket with several customer replies.
- `support_reply` is PENDING Meta review in UAT and production (`template-status.md`). Until a copy is APPROVED, replies outside the 24-hour window fall through to the existing email path.
- Operator: live UAT round-trip once the UAT copy is approved; switch production on once its copy is approved.
