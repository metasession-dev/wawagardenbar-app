# REQ-074 — Test scope

## In scope (this PR)

### Production code

- `app/actions/auth/send-pin.ts` — ENABLE_E2E_PIN_INTERCEPT bypass (~5 lines)
- `app/actions/auth/send-whatsapp-pin.ts` — same pattern
- `app/actions/auth/send-email-pin.ts` — same pattern

### Unit tests

- `__tests__/actions/auth/pin-intercept.test.ts` — 6 cases (parameterised across 3 actions × bypass-active / bypass-inactive)

### E2E specs

- `e2e/customer/auth-pin-happy-path.spec.ts` — 1 test (REQ-AUTHC-001)
- `e2e/customer/home-page.spec.ts` — 2 tests (REQ-HOME-001/002)
- `e2e/customer/auth-guest-flow.spec.ts` — 1 test (REQ-AUTHC-003)

### Helper

- `e2e/helpers/customer-auth.ts` — `mongoConn`, `syntheticPhone`, `readPinFromMongo`, `waitForPin`, `cleanupTestUser`, `isInterceptLikelyEnabled`, `cleanupUserById`

## SRS items covered

| SRS ID        | Covered by                                           | Status                                                                                                        |
| ------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| REQ-AUTHC-001 | auth-pin-happy-path.spec.ts                          | **Pinned** — full flow against UAT (operator sets Railway env var to activate)                                |
| REQ-AUTHC-003 | auth-guest-flow.spec.ts                              | **Pinned** — guest navigation without auth-session minted                                                     |
| REQ-HOME-001  | home-page.spec.ts (test 2)                           | **Partial** — /menu items render asserted; "featured items" surface deferred (no carousel currently rendered) |
| REQ-HOME-002  | home-page.spec.ts (test 2) + auth-guest-flow.spec.ts | **Pinned** — guest Sign In link in navbar                                                                     |

## Out of scope (deferred to follow-up cycles within #292)

| Item                                                                           | Why deferred                                                                                                                                                                       |
| ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **REQ-PROFILE-001 — Profile page (`e2e/customer/profile-page.spec.ts`)**       | Needs an authenticated-user fixture + addresses seed. Profile flow has its own form interactions worth a dedicated cycle.                                                          |
| **REQ-REWARDC-001/002 — Rewards page (`e2e/customer/rewards-page.spec.ts`)**   | Needs seeded points + active rewards on the user document. Coordinates with reward-rule UI deferred from REQ-070.                                                                  |
| **REQ-AUTHC-002 — PIN errors (`the V2 auth-pin-errors spec (file name TBD)`)** | Rate-limit + expiry + wrong-PIN error states. Each needs Mongo seed manipulation (expire the PIN, set a recent send timestamp for rate-limit, etc.). Orthogonal infra.             |
| **Cart preservation across pages (REQ-AUTHC-003 second half)**                 | The SRS item mentions "cart preserved" — V1 pins navigation-without-login only. Cart depth needs cart-store fixture + concrete add-to-cart selector that survives menu reshuffles. |
| **Mobile-menu surface (Sheet trigger)**                                        | navbar Sign In is asserted on desktop breakpoint only. Mobile-menu has a different Sheet trigger. V2.                                                                              |
| **Logged-in user chip in navbar (REQ-HOME-002 second half)**                   | Implicitly exercised by auth-pin-happy-path. A dedicated assertion on the chip's content is V2 once storageState from that spec is reusable.                                       |
| **Featured-items carousel (REQ-HOME-001 implied)**                             | The home page currently has hero + 3 "How It Works" cards — no per-item featured carousel. If/when one is added, a dedicated assertion lands then.                                 |

These ship in follow-up REQs within sub-issue #292.

## Out of scope (umbrella tracker — not this sub-issue)

These belong to other already-RELEASED sub-issues of [#291](https://github.com/metasession-dev/wawagardenbar-app/issues/291):

- Payments + webhooks E2E → sub-issue [#294](https://github.com/metasession-dev/wawagardenbar-app/issues/294) (REQ-069 RELEASED via v2026.06.05)
- Rewards & loyalty pipeline → sub-issue [#293](https://github.com/metasession-dev/wawagardenbar-app/issues/293) (REQ-070 RELEASED)
- Public API authenticated contracts → sub-issue [#297](https://github.com/metasession-dev/wawagardenbar-app/issues/297) (REQ-071 RELEASED)
- Socket.IO broadcasts → sub-issue [#295](https://github.com/metasession-dev/wawagardenbar-app/issues/295) (REQ-072 RELEASED)
- Admin destructive ops → sub-issue [#296](https://github.com/metasession-dev/wawagardenbar-app/issues/296) (REQ-073 RELEASED)

## Manual UAT — required this cycle

**One operator step:** set `ENABLE_E2E_PIN_INTERCEPT=true` on Railway UAT environment. After Railway redeploys, the auth-pin-happy-path spec stops skipping and passes the full PIN flow. The spec's skip message explicitly names this step.

Production deployments **MUST NOT** set this variable.
