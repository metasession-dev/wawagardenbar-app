# REQ-074 — AI prompts captured

## Cycle entry

Operator question: _"how are we doing with the E2E test regression pack"_

That triggered an audit: 56 specs total, last full run 2026-05-31 (5 days stale, pre-dates this session's bundle additions), nightly cron + PR-to-main auto-triggers still commented out (legacy of #117 work). The audit surfaced a list of recommended next E2E actions; operator picked #1 + #2:

> _"do #1 and 2 right now"_

That ran the manual full regression (revealed 10 pre-existing + 2 session-flake failures) and re-enabled the auto-triggers via PR #315. Then:

> _"Pick up the next umbrella unblock work (e.g., investigate #292 customer PIN-flow auth gaps)"_

This REQ.

## Plan-mode review (Option A approved)

Operator asked: _"i dont understand your recommendation, please explain to me like im a 5 year old"_

After the simplified explanation, operator chose **Option A: small env-gated bypass in the actions (Recommended)**. The plan was written into `/home/william/.claude/plans/crispy-kindling-bonbon.md` and approved via ExitPlanMode.

## In-cycle scope decisions

**Decision 1**: The bypass goes AFTER the PIN-persist step and BEFORE the provider dispatch. Reading the code confirmed that all 3 send actions follow the same shape — persist PIN → call provider — so the bypass is structurally identical across the 3 files.

**Decision 2**: Helper exposes `mongoConn` + `syntheticPhone` + `readPinFromMongo` + `waitForPin` + `cleanupTestUser` + `isInterceptLikelyEnabled` + `cleanupUserById`. The set was chosen to be reused by future PIN-touching specs (profile-page, rewards-page when they pick up) without duplicating Mongo plumbing.

**Decision 3**: Test framework realisations during the focused E2E run against UAT:

- The marketing splash at `/` has no navbar — auth-status assertions moved from `/` to `/menu` (which uses `MainLayout` and therefore includes `Navbar`).
- The login form has a channel-choice step FIRST (WhatsApp / SMS / Email) before the phone input; the spec clicks "SMS" to pick a channel.
- The submit button is labelled "Continue", not "Send PIN".
- The bypass check is on `process.env.ENABLE_E2E_PIN_INTERCEPT` in the SERVER process, not the test-runner process. The spec races the PIN-entry visibility against a provider-error alert to detect when the SERVER lacks the flag; falls back to `test.skip()` with a clear message.

**Decision 4**: V1 ships 3 specs (auth-pin-happy-path + home-page + auth-guest-flow). Three V2 candidates (profile-page, rewards-page, auth-pin-errors) are deferred to a follow-up cycle within #292. Spec-density rationale matches the V1 pattern from REQ-073 (3 of 8 specs).

## Decisions NOT made by AI

- V1 vs V2 scope split: assistant proposed; operator approved at plan-review time.
- Option A vs B (production code change vs zero-change): assistant proposed; operator chose A after the simplified explanation.
- Setting `ENABLE_E2E_PIN_INTERCEPT=true` on Railway UAT: assistant flagged the need; operator does this when ready.

## AI tool

- **Tool:** Claude Opus 4.7 via Claude Code (CLI).
- **Scope:** 3 action edits (~15 lines total) + 1 unit-test file (6 cases) + 1 helper file + 3 spec files + 6-doc evidence pack + release ticket + RTM row + implementation plan.
- **Verification:** live focused E2E run against UAT — 6 passed + 1 cleanly-skipped (the auth-pin spec correctly detects UAT lacks the flag); 6/6 new unit tests pass; tsc 0 errors; full vitest 1135/4/0.
