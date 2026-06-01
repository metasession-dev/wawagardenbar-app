# Release Ticket: REQ-056 — WhatsApp inbound-message router

**Status:** RELEASED
**Date:** 2026-06-01
**Requirement ID:** REQ-056
**Risk Level:** MEDIUM-HIGH
**GitHub Issue:** [#117 WA-3](https://github.com/metasession-dev/wawagardenbar-app/issues/117)
**Integration PR:** [#229](https://github.com/metasession-dev/wawagardenbar-app/pull/229) — merged to develop 2026-06-01 (commit `8b39326` via merge `c3c470d`).
**Release PR:** #232
**DevAudit Release:** [`devaudit.metasession.co/projects/wgb/`](https://devaudit.metasession.co/projects/wgb/) — release version `REQ-056`, status `draft` → `uat_review` on this evidence push.
**Sign-off (dual-actor):** UAT approved + Production approved on the DevAudit portal (`released`); post-deploy production smoke evidence captured. Closed out 2026-06-01.

---

## Summary

Fourth code item in #117's WhatsApp expansion bundle (WA-3). Adds a customer-state-aware inbound router so the WhatsApp surface stops being outbound-only. Closes three gaps in the previous behaviour:

1. **Meta WABA STOP-opt-out compliance gap** — Meta WhatsApp Business Policy requires `STOP` / `UNSUBSCRIBE` keywords to be honoured; failure to do so is grounds for WABA suspension. Today's `handleWebhook` only `console.log`'d inbound messages.
2. **24-hour customer-service window unused** — Meta allows free-form replies (no template) inside the window opened when a customer messages us; we did nothing with it.
3. **No User row created for unknown phones** — future outbound sends had no consent record to gate on for new inbound customers.

The router classifies by **customer state** (`new` / `signing_up` / `active` / `dormant`, derived from `phoneVerified` + 30-day `lastLoginAt` threshold) and **intent** (`opt_out` / `chat_with_staff` / `support_text`), then routes per a 4×3 matrix that sends the right welcome template (or no template) and honours STOP across all states. Auto-creates User rows for unknown phones mirroring `send-pin.ts`. Persists every inbound to a new `IncomingMessage` audit collection (companion to REQ-055's `NotificationLog` on the outbound side).

**Honesty note on Meta restriction:** the `welcome_new_user` / `welcome_back` template sends will fail until Meta's WABA restriction is lifted (separate WA-1 thread). STOP opt-out + IncomingMessage audit + free-form opt-out confirmations all work from day one — Meta does not restrict free-form replies within the 24h customer-service window opened by the customer's inbound message.

## AI Involvement

- **AI Tool Used:** Claude Opus 4.7 via Claude Code (CLI).
- **AI-Generated Changes:** implementation plan with STRIDE + threat model + rollback, the `IncomingMessage` Mongoose model + indexes + enums, the `WhatsAppInboundService` (state classifier + intent classifier + `handle()` orchestrator + matrix), `lib/whatsapp-inbound-templates.ts` lookup, new `WhatsAppService.sendTextMessage` for 24h-window free-form replies, lazy-import wire-up in `lib/whatsapp.ts:handleWebhook`, 30 new vitest cases (5 model + 13 classifier + 10 router + 2 integration), full REQ-056 compliance markdown pack. See `compliance/evidence/REQ-056/ai-prompts.md` + `ai-use-note.md`.
- **Operator action this cycle:** approved the implementation plan at the MEDIUM-HIGH-risk checkpoint. Merged the integration PR, the unrelated vitest CVE bump (PR #230), the attribution PR (PR #231 — same pattern as PR #163), and authorised filing two upstream issues (DevAudit-Installer #95 and #96). Caught the missing Phase 3 release ticket and surfaced the gap.
- **Human Reviewer:** Stage 4 `dual_actor` approver — see `implementation-plan.md` § _Four-eyes attestation_.

## Implementation Details

**Files Added:**

- `models/incoming-message-model.ts` — Mongoose schema for inbound audit log with `from / body / messageType / messageId / classifiedState / classifiedIntent / actionTaken / userId / receivedAt`; compound indexes on `from + receivedAt`, unique `messageId`, `receivedAt`.
- `services/whatsapp-inbound-service.ts` — `WhatsAppInboundService.classifyCustomerState(phone)` + `classifyMessageIntent(message)` + `handle(message, value)` orchestrator with STRIDE-aware try/catch posture.
- `lib/whatsapp-inbound-templates.ts` — `INBOUND_WELCOME_TEMPLATE` state → template name map.
- `__tests__/models/incoming-message-model.test.ts` — 5 schema cases.
- `__tests__/services/whatsapp-inbound-service.classify.test.ts` — 13 classifier cases.
- `__tests__/services/whatsapp-inbound-service.routing.test.ts` — 10 routing-matrix + safety cases.
- `__tests__/lib/whatsapp.inbound-integration.test.ts` — 2 handleWebhook delegation cases.
- `compliance/plans/REQ-056/implementation-plan.md` — plan with ACs, STRIDE, rollback.

**Files Modified:**

- `lib/whatsapp.ts` — new `sendTextMessage(to, body)` method (~50 LOC) for free-form 24h-window replies; rewired inbound branch in `handleWebhook` to lazy-import `WhatsAppInboundService.handle(message, value)` (~10 LOC). Status branch (REQ-055) untouched.
- `compliance/RTM.md` — REQ-056 row.

**Dependencies Added/Changed:**

- No new packages introduced by REQ-056.
- Pre-existing critical (vitest GHSA UI-server file-read/exec) surfaced on develop CI after PR #229 merge — npm advisory DB published the critical between REQ-055's CI (~13:00 UTC) and REQ-056's (~17:51 UTC). Patched via PR #230 (`chore: bump vitest to 4.1.x`) — unrelated to REQ-056.

## Test Evidence

| Test Type         | Count | Passed | Failed | Evidence Location                                                                           |
| ----------------- | ----- | ------ | ------ | ------------------------------------------------------------------------------------------- |
| Model unit        | 5     | 5      | 0      | DevAudit portal: `wgb/REQ-056`; `compliance/evidence/REQ-056/test-execution-summary.md`     |
| Classifier unit   | 13    | 13     | 0      | Same                                                                                        |
| Router unit       | 10    | 10     | 0      | Same                                                                                        |
| Integration       | 2     | 2      | 0      | Same                                                                                        |
| Full vitest suite | 970   | 966    | 0      | Same (+4 skipped pre-existing)                                                              |
| E2E               | n/a   | —      | —      | `project_e2e_targeted_until_117` policy + scope justification (server-side webhook surface) |

**Net new from REQ-055 baseline (936 / 4 skip):** +30 REQ-056 cases. No existing tests changed.

## Security Evidence

| Check                 | Result                                    | Evidence Location                                                                                                                   |
| --------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| TypeScript Check      | exit 0                                    | DevAudit portal: `wgb/REQ-056`; CI run [26774830299](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/26774830299) |
| SAST (Semgrep)        | 0 ERROR-severity findings                 | Same                                                                                                                                |
| Dependency Audit      | 0 high / 0 critical (post #230)           | Same                                                                                                                                |
| Access Control review | N/A                                       | `compliance/evidence/REQ-056/security-summary.md`                                                                                   |
| Audit Log review      | PASS — IncomingMessage IS the audit trail | `compliance/evidence/REQ-056/security-summary.md`                                                                                   |

## Acceptance Criteria

- [x] AC1 — `IncomingMessage` model with documented fields, defaults, enums, unique `messageId`
- [x] AC2 — `classifyCustomerState(phone)` returns one of `new / signing_up / active / dormant`
- [x] AC3 — `classifyMessageIntent(message)` returns one of `opt_out / chat_with_staff / support_text`
- [x] AC4 — Routing matrix `state × intent → action` covers all 12 cells
- [x] AC5 — STOP compliance clears both `whatsappTransactional` and `whatsappMarketing` regardless of state
- [x] AC6 — `UserModel.create` called with `phone, phoneVerified: false, isGuest: false` for new state
- [x] AC7 — Safety: persistence + outbound failures swallowed inside `handle()`
- [x] AC8 — `handleWebhook` inbound branch delegates; status branch (REQ-055) untouched
- [x] All unit + integration tests passing
- [x] TypeScript clean
- [x] SAST clean
- [x] Dependencies clean (post unrelated PR #230)
- [x] AI use documented

## Risk Assessment

- **Customer-facing auto-replies** — every inbound now potentially triggers an outbound template send. Mitigation: consent-gated via REQ-053; falls through to email when Meta template approval missing.
- **Auto-create User on first inbound** — every unknown phone becomes a `phoneVerified: false` User row. Mitigation: same posture as `send-pin.ts` (no abuse mitigation today; rate-limiting at webhook ingress is a future operational concern).
- **STOP compliance** — Meta WABA hard policy. Mitigation: STOP regex is conservative (whole-message match); intent always wins over state in the routing matrix; both consent flags cleared atomically per opt-out.
- **Inbound body persisted in `IncomingMessage`** — different posture from REQ-055's metadata-only `NotificationLog`. Mitigation flagged in `security-summary.md`: future TTL/redaction REQ.
- **No new dependencies** added by REQ-056; the unrelated vitest GHSA was patched in PR #230.

## Post-Deploy Actions

| Type | Script / Command | Target | Required | Notes                                                                                                                                                                                                                                                                                                                                                                                     |
| ---- | ---------------- | ------ | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| —    | None             | —      | —        | No data migration, no schema migration. `IncomingMessage` collection created lazily on first write. No env vars to set. `welcome_new_user` / `welcome_back` template approvals are blocked at Meta (separate WA-1 thread); REQ-056 ships fully — the routing executes, the audit log fills, STOP free-form confirmations send within the 24h window, even before templates are unblocked. |

**Run these after deployment, before production verification.**

---

## Reviewer Checklist

- [ ] Code matches requirement (review `services/whatsapp-inbound-service.ts`, `models/incoming-message-model.ts`, `lib/whatsapp.ts` diff)
- [ ] Test evidence present and all-pass (5 + 13 + 10 + 2 = 30 cases — green on develop CI)
- [ ] Security evidence present and clean (SAST 0, dep-audit 0, STRIDE assessed)
- [ ] Test scope fully addressed (test-scope.md ↔ test-plan.md ↔ test-execution-summary.md)
- [ ] RTM correct status and risk (MEDIUM-HIGH, will flip to RELEASED at close-out)
- [ ] No sensitive data committed (no secrets, no .env files)
- [ ] No regressions (full vitest 966 / 0 fail / 4 skip — unchanged from REQ-055 baseline)
- [ ] AI code reviewed (`ai-use-note.md` + `ai-prompts.md`)
- [ ] No hallucinated dependencies (no new packages)
- [ ] Post-deploy actions documented (None required)

---

## 🛡️ Compliance & UAT Sign-off

_This section must be completed by a human reviewer before merging to Production._

| Role                | Name | Date | Status              | Signature/Notes |
| :------------------ | :--- | :--- | :------------------ | :-------------- |
| **QA Lead**         |      |      | [ ] PASS / [ ] FAIL |                 |
| **Product Owner**   |      |      | [ ] PASS / [ ] FAIL |                 |
| **Security Review** |      |      | [ ] N/A / [ ] OK    |                 |

> **Audit Note:** This release was assisted by Claude Code (Opus 4.7) via the project's `sdlc-implementer` skill. All AI-generated content was reviewed by the operator and linked to the Requirement Traceability Matrix. AC1–AC8 are covered by 30 new unit + integration cases (5 model + 13 classifier + 10 router + 2 integration), 0 failures, with E2E policy honoured per `project_e2e_targeted_until_117`. The Phase 3 evidence-pack (this ticket + 7 evidence markdowns) was assembled in a follow-up commit after the operator caught that it was missing on the portal — corrected within the same session.

## Audit Trail

| Date       | Action                              | Actor       | Notes                                                                                                |
| ---------- | ----------------------------------- | ----------- | ---------------------------------------------------------------------------------------------------- |
| 2026-06-01 | Requirement created                 | ostendo-io  | Risk: MEDIUM-HIGH                                                                                    |
| 2026-06-01 | Implementation plan presented       | Claude Code | 8 ACs + STRIDE + threat model + rollback                                                             |
| 2026-06-01 | Plan approved                       | ostendo-io  | "Approve as scoped"                                                                                  |
| 2026-06-01 | TDD red baseline (30 cases) written | Claude Code | 5 model + 13 classifier + 10 router + 2 integration                                                  |
| 2026-06-01 | Implementation completed            | Claude Code | inbound-service + model + templates lookup + sendTextMessage + lazy-import wire-up                   |
| 2026-06-01 | AI code reviewed                    | ostendo-io  | Integration PR #229 review                                                                           |
| 2026-06-01 | Tests passed                        | Claude Code | 30 / 30; full suite 966 / 4 skip / 0 fail                                                            |
| 2026-06-01 | Integration PR merged               | ostendo-io  | PR #229 → develop (`c3c470d`)                                                                        |
| 2026-06-01 | CI failed on unrelated vitest GHSA  | —           | npm advisory DB published critical between REQ-055's CI and REQ-056's; Upload Evidence skipped       |
| 2026-06-01 | Vitest CVE bumped (PR #230)         | ostendo-io  | `chore: bump vitest to 4.1.x` — develop CI passed but attributed to v2026.06.01 (no [REQ-056] tag)   |
| 2026-06-01 | Attribution PR #231 merged          | ostendo-io  | `[REQ-056]` in subject → derive-release-version.sh step 3 → CI re-uploaded under `--release REQ-056` |
| 2026-06-01 | Release PR #232 opened              | Claude Code | develop → main; awaiting UAT + Production portal approval                                            |
| 2026-06-01 | Phase 3 evidence pack assembled     | Claude Code | Caught + corrected by operator note re missing release ticket                                        |
| 2026-06-01 | Submitted for UAT review            | Claude Code | After this evidence-pack PR merges                                                                   |
