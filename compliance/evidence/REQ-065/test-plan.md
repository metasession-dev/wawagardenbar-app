# REQ-065 — Test plan

**Requirement ID:** REQ-065
**Risk:** MEDIUM
**Related issue:** [#117 P4 #19 + P4 #20](https://github.com/metasession-dev/wawagardenbar-app/issues/117)
**Date:** 2026-06-03

## Acceptance criteria → tests

| AC  | Statement                                                                                                                            | Test                                                                                                                                                                                                                                                                       |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC1 | `GET /api/user/export` returns the 9-key envelope + `Content-Disposition: attachment` with `wawa-data-{userId}-{date}.json`          | `__tests__/api/user-export.test.ts` — envelope-shape + Content-Disposition cases. No live E2E (would require a forged customer session — same SMS-fatal blocker as `customer-auth.spec.ts`). Manual UAT also covers via the customer Download-my-data flow.                |
| AC2 | Rate-limit — second request within 60s returns 429 with Retry-After                                                                  | `__tests__/lib/rate-limit.test.ts` — 4 cases (first allowed; second blocked w/ retryAfter; after-window allowed; key independence). `__tests__/api/user-export.test.ts` — integration case (second within window 429 + Retry-After header).                                |
| AC3 | Session gate — unauthenticated request returns 401                                                                                   | `__tests__/api/user-export.test.ts` — 401 unauth case. **E2E** `e2e/smoke/data-export-auth-gate.spec.ts` — live against UAT proves the gate fires before any model lookup (no `error: 'Authentication required'` if session present, 401 if not).                          |
| AC4 | `/profile` "Download my data" button triggers a browser download with the expected filename                                          | **E2E** `e2e/smoke/data-export-customer-flow.spec.ts` — `test.fixme`'d pending the SMS-fatal customer-auth blocker; un-fixme path documented inline. Manual UAT covers in the meantime.                                                                                    |
| AC5 | Cookie banner — renders on first visit, click "Got it" persists + dismisses, reload skips it; absent when consent already in storage | **E2E** `e2e/smoke/cookie-consent-banner.spec.ts` — 2 live cases against UAT (first-visit show + dismiss + reload-skip; pre-seeded consent skips render). `evidenceShot` captures: `REQ-065-AC5-banner-first-visit.png` + `REQ-065-AC5-banner-dismissed-after-reload.png`. |

## Test environment

- **Unit:** vitest 4.1.x. `@/lib/mongodb` / `@/lib/session` / `iron-session` / `next/headers` mocked. Every Mongoose model mocked at the import boundary with a chainable `find`/`findById` that tracks the call args (the test asserts every find filter is keyed on `session.userId`). `@/lib/rate-limit` has a `__resetRateLimitForTests()` exit for between-case isolation.
- **E2E:** Playwright via the existing 2-project setup (smoke + regression by location). Customer-flow spec is `test.fixme`'d pending an SMS provider mock; auth-gate + cookie banner specs run live against UAT today.
- **Cookie banner UI unit test deferred** — no project precedent for runnable component tests in the vitest config (node-only). The live E2E covers the same surface end-to-end.

## Quality gates

| Gate                            | Expected   | Actual (2026-06-03)                              |
| ------------------------------- | ---------- | ------------------------------------------------ |
| `npx tsc --noEmit`              | exit 0     | exit 0                                           |
| `npx vitest run` (full)         | 0 failures | 1072 pass / 4 skip / 0 fail                      |
| `npx eslint . --max-warnings=0` | 0 errors   | 0 errors / 950 pre-existing console warnings     |
| `npm run build`                 | exit 0     | exit 0                                           |
| Focused REQ-065 E2E (UAT)       | green      | 4 passed / 1 skipped (`test.fixme`) / 0 failed   |
| Full regression pack (UAT)      | green      | _filled by test-execution-summary on completion_ |
