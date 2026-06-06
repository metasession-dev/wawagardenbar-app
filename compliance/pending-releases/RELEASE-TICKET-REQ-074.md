# Release Ticket: REQ-074 — Customer PIN-flow E2E coverage (sub-issue #292 V1 unblock)

**Status:** DRAFT
**Date:** 2026-06-06
**Requirement ID:** REQ-074
**Risk Level:** MEDIUM
**GitHub Issue:** [#292](https://github.com/metasession-dev/wawagardenbar-app/issues/292) (sub-issue of umbrella [#291](https://github.com/metasession-dev/wawagardenbar-app/issues/291))
**Integration PR:** (this PR — to be opened against develop)
**Release PR:** (single-REQ release path, `[REQ-074]` brackets in PR title for derive-release-version attribution)
**Sign-off (dual-actor):** Pending portal UAT + Production approval.

---

## Summary

Unblocks the last open sub-issue of umbrella [#291](https://github.com/metasession-dev/wawagardenbar-app/issues/291) — customer journey E2E coverage. Adds a small env-gated bypass in the 3 send-PIN actions (`sendPinAction`, `sendWhatsAppPinAction`, `sendEmailPinAction`) so E2E specs can drive the PIN-login flow without the real SMS / WhatsApp / Email providers firing.

- **AC1+AC2+AC3 — Action bypass.** With `ENABLE_E2E_PIN_INTERCEPT=true`, each send action persists the PIN to `User.verificationPin` (existing behaviour) then returns `{ success: true, message: 'PIN persisted (E2E intercept mode)', isNewUser }` WITHOUT calling the provider. With the flag unset, existing behaviour is preserved verbatim.
- **AC4 — PIN happy-path spec.** `e2e/customer/auth-pin-happy-path.spec.ts` exercises the full flow against UAT (skips cleanly when the server lacks the flag — operator sets on Railway).
- **AC5 — Home + menu render.** `e2e/customer/home-page.spec.ts` pins marketing splash + /menu navbar.
- **AC6 — Guest navigation.** `e2e/customer/auth-guest-flow.spec.ts` pins `/` ↔ `/menu` works without auth.

## AI Involvement

- **AI Tool Used:** Claude Opus 4.7 via Claude Code (CLI).
- **AI-Generated Changes:** 3 action edits (~15 lines) + 1 unit-test file (6 cases) + 1 helper + 3 E2E specs + 6-doc evidence pack + release ticket + RTM row + implementation plan.
- **Operator action this cycle:** Chose Option A (env-gated bypass over zero-code-change) after a simplified explanation at plan review; will set `ENABLE_E2E_PIN_INTERCEPT=true` on Railway UAT before merging the release PR.

## Implementation Details

**Files Added:**

- `e2e/helpers/customer-auth.ts` — `mongoConn`, `syntheticPhone`, `readPinFromMongo`, `waitForPin`, `cleanupTestUser`, `isInterceptLikelyEnabled`, `cleanupUserById`.
- `e2e/customer/auth-pin-happy-path.spec.ts` — 1 test pinning REQ-AUTHC-001.
- `e2e/customer/home-page.spec.ts` — 2 tests pinning REQ-HOME-001/002.
- `e2e/customer/auth-guest-flow.spec.ts` — 1 test pinning REQ-AUTHC-003.
- `__tests__/actions/auth/pin-intercept.test.ts` — 6 unit-test cases.
- `compliance/plans/REQ-074/implementation-plan.md` (+ mirrored evidence-side copy at `compliance/evidence/REQ-074/implementation-plan.md`).
- `compliance/evidence/REQ-074/{test-plan, test-execution-summary, test-scope, security-summary, ai-prompts, ai-use-note}.md` — 6-doc pack.

**Files Modified:**

- `app/actions/auth/send-pin.ts` — ~5 lines (env-gated bypass after PIN persist, before SMSService call).
- `app/actions/auth/send-whatsapp-pin.ts` — same pattern (before WhatsAppService call).
- `app/actions/auth/send-email-pin.ts` — same pattern (before `sendVerificationPinEmail` call).
- `.env.local` — added `ENABLE_E2E_PIN_INTERCEPT=true` with inline doc comment naming the production-must-not-set rule.
- `compliance/RTM.md` — new IN PROGRESS row.

**Schema changes:** None. **New packages:** None. **New auth surface:** None.

## Test Plan & Evidence

See `compliance/evidence/REQ-074/test-plan.md` and `test-execution-summary.md`.

- Vitest: 1135 pass / 4 skip / 0 fail (**+6 cases** vs the post-v2026.06.05 baseline of 1129).
- TypeScript: 0 errors.
- E2E focused REQ-074 (UAT, flag NOT set on Railway): **6 passed + 1 cleanly-skipped** (auth-pin-happy-path skips with operator-instruction message), 7.6s wall-clock.
- E2E focused REQ-074 (UAT, flag SET on Railway): **7 passed expected** — to confirm after operator sets the var.

## Security & Compliance

See `security-summary.md`. Headline: env-gated bypass with default-off discipline; bypass only short-circuits provider dispatch; PIN generation, expiry, validation, rate-limiting, and session creation are all unchanged. Worst-case if accidentally enabled in production: customers see "PIN sent" but never receive it (UX failure, not security failure). Recovery is immediate (unset the flag + redeploy).

## Pre-deploy operator checklist

- [ ] **Railway UAT:** set `ENABLE_E2E_PIN_INTERCEPT=true` + redeploy UAT.
- [ ] **Railway PRODUCTION:** confirm `ENABLE_E2E_PIN_INTERCEPT` is **unset** (or explicitly `false`).
- [ ] Re-run `e2e/customer/auth-pin-happy-path.spec.ts` against UAT and confirm it now passes (not skipped).

## Rollback Plan

Revert the integration PR. The 3-line bypass blocks are pure additions inside an `if (flag) { return; }` early-return — reverting leaves no orphan production behavior. Helper + specs are pure additions; nothing else depends on them.

## Deferred to follow-up cycles within #292

| Item                                         | Why                                                                       |
| -------------------------------------------- | ------------------------------------------------------------------------- |
| the V2 auth-pin-errors spec (REQ-AUTHC-002)  | Rate-limit + expiry + wrong-PIN error states need Mongo-seed manipulation |
| `profile-page.spec.ts` (REQ-PROFILE-001)     | Needs authenticated-user fixture + addresses seed                         |
| `rewards-page.spec.ts` (REQ-REWARDC-001/002) | Needs seeded points + active rewards                                      |
| Cart preservation in guest flow              | Needs cart-store fixture + concrete add-to-cart selector                  |
| Mobile-menu surface                          | Different Sheet trigger                                                   |

Tracked on sub-issue [#292](https://github.com/metasession-dev/wawagardenbar-app/issues/292)'s checklist.

## Quality Gates

| Gate                                                                   | Expected                   | Actual (2026-06-06)                       |
| ---------------------------------------------------------------------- | -------------------------- | ----------------------------------------- |
| `npx tsc --noEmit`                                                     | exit 0                     | exit 0                                    |
| `npx vitest run` (full)                                                | 0 failures                 | 1135 pass / 4 skip / 0 fail               |
| Unit tests for bypass (`__tests__/actions/auth/pin-intercept.test.ts`) | 6 pass                     | 6 pass                                    |
| E2E focused REQ-074 (UAT, flag not set)                                | 6 pass + 1 cleanly-skipped | 6 pass + 1 skip (7.6s)                    |
| E2E focused REQ-074 (UAT, flag set)                                    | 7 pass                     | _to be confirmed after operator sets var_ |

## Stage Approvals

- [x] Stage 1 — Plan (operator-approved via ExitPlanMode 2026-06-06)
- [x] Stage 2 — Implement + unit-test (6/6 pass; live focused E2E 6 pass + 1 skip)
- [x] Stage 3 — Compile evidence (this evidence pack)
- [ ] Stage 4 — Submit for UAT review (release PR + operator sets Railway env var)
- [ ] Stage 5 — UAT review + production deployment + close-out

## Notes

- Closes umbrella [#291](https://github.com/metasession-dev/wawagardenbar-app/issues/291)'s last open sub-issue ([#292](https://github.com/metasession-dev/wawagardenbar-app/issues/292)) once V1 ships. Umbrella will still need a final close-out flip (5 of 6 already shipped via v2026.06.05).
- Single-REQ tracked release path — NOT a housekeeping bundle. The 4 framework pitfalls from `project_housekeeping_bundle_pitfalls` do not apply.
- PR title MUST carry `[REQ-074]` brackets per `feedback_pr_title_req_brackets` so `derive-release-version.sh` attributes evidence to the right release.
