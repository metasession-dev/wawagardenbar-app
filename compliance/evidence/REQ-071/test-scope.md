# REQ-071 — Test scope

## In scope (this PR)

### E2E specs

- `e2e/api/public-contracts-authenticated.spec.ts` — 8 tests pinning the authenticated response envelope shape for 6 public API read endpoints + the public health endpoint + the invalid-key rejection envelope.

## SRS items covered

| SRS ID                                       | Covered by                             | Status                                                                                                                    |
| -------------------------------------------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| REQ-API-006 (per-endpoint payload contracts) | public-contracts-authenticated.spec.ts | **Partial** — read endpoints covered; write methods (POST/PATCH/DELETE) + audit-log + reports deferred (see Out of scope) |

## Out of scope (deferred to follow-up cycles within #297)

| Item                                             | Why deferred                                                                                                                                                          |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Dedicated audit-log spec (REQ-AUDIT-001)**     | Requires admin UI navigation to trigger 5+ actions + DB readback of `auditlogs` collection. More complex than HTTP contract testing; better fit for a dedicated spec. |
| **Profitability report E2E (REQ-REPORT-003)**    | UI-driven E2E with admin reports page. Needs known-state order seeding so totals are deterministic.                                                                   |
| **CSV/JSON export E2E (REQ-REPORT-004)**         | UI-driven export endpoint + file shape parsing.                                                                                                                       |
| **Write endpoint contracts (POST/PATCH/DELETE)** | Writes carry larger side effects + cleanup complexity. V1 covers reads only.                                                                                          |

These ship in a follow-up REQ within sub-issue #297.

## Out of scope (umbrella tracker — not this sub-issue)

These belong to other sub-issues of [#291](https://github.com/metasession-dev/wawagardenbar-app/issues/291):

- Customer-PIN-flow E2E (REQ-AUTHC + REQ-PROFILE) → sub-issue [#292](https://github.com/metasession-dev/wawagardenbar-app/issues/292).
- Payments + webhooks E2E → sub-issue [#294](https://github.com/metasession-dev/wawagardenbar-app/issues/294) (REQ-069 IN PROGRESS via PR #298).
- Rewards & loyalty pipeline → sub-issue [#293](https://github.com/metasession-dev/wawagardenbar-app/issues/293) (REQ-070 IN PROGRESS via PR #300).
- Socket.IO broadcasts → sub-issue [#295](https://github.com/metasession-dev/wawagardenbar-app/issues/295).
- Admin destructive ops → sub-issue [#296](https://github.com/metasession-dev/wawagardenbar-app/issues/296).

## Manual UAT — none required

E2E spec runs end-to-end against live UAT public API. No human-driven manual validation step needed.
