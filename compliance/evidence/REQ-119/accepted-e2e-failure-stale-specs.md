---
record_kind: accepted_e2e_failure
req: REQ-119
release: REQ-119
failing_specs:
  - e2e/authenticated.spec.ts
  - e2e/csr-uat.spec.ts
  - e2e/pending-expenses.spec.ts
ci_run: https://github.com/metasession-dev/wawagardenbar-app/actions/runs/42355473074
head_sha: 7fd8d4aa4a28ff02adc5d33238a17102fd36a753
classification: test_bug
decision_maker: ostendo-io operator (project owner)
decided_at: 2026-11-07
review_by: 2026-12-07
tracking_issue: https://github.com/metasession-dev/wawagardenbar-app/issues/1015
---

# Accepted E2E failure — REQ-119

> The portal execution `8ebea987-4083-4220-87b7-7b3ddf1e7cc9` was resolved as `accepted_exception` on 2026-11-07 (remediation reference: #1015). This record documents that decision. It was drafted by the agent at the operator's instruction; the decision maker confirms it by merging the PR that carries it. The classification is `test_bug`: the application behaves as designed.

## Failure

| Spec                               | Test                                                       | CI run / attempt                                       | Error excerpt                                                                                               |
| ---------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `e2e/authenticated.spec.ts:174`    | orders page shows Kitchen Display link                     | 42355473074 / 1 (post-deploy `E2E Regression`, `main`) | strict mode violation: `locator('text=Kitchen Display')` resolved to 2 elements (retried twice, same error) |
| `e2e/csr-uat.spec.ts`              | UAT: Admin List: create admin dialog shows CSR role option | 42355473074 / 1                                        | `locator.click: Test timeout of 30000ms exceeded` (retried twice, same error)                               |
| `e2e/pending-expenses.spec.ts:123` | REQ-026 admin submits multi-line expense group             | 42355473074 / 1                                        | `expect(locator).toBeVisible() failed`; passed on retry (flaky)                                             |

## Evidence of classification

- Failure 1: REQ-119 added a "Kitchen display" item to the dashboard nav. The spec's case-insensitive text locator now matches the nav item and the Orders page card. The card is still present and correct.
- Failure 2: REQ-119 replaced the single role dropdown in the Create Admin dialog with role checkboxes (`RoleCheckboxes`). The spec still opens a combobox that no longer exists.
- Failure 3: failed once and passed on the first retry within the same run; unrelated files and REQ.
- The code under test did not change between the last green regression run on `develop` (`8ace889`, run 42351103621) and this run on `main` (`7fd8d4a`); both specs were never exercised by the `critical` tier that gates the release PR.
- Fix verified: the two specs updated in the #1015 branch (`295a7e1`) pass in an isolated stack, (all 74 tests in the two spec files, no skips).

## Impact assessment

- Journeys and requirements: the Orders page navigation to the Kitchen display and the Create Admin dialog role selection (REQ-007, REQ-119 AC3). The behaviour of both is covered by the REQ-119 critical spec `e2e/critical/staff-multi-role.spec.ts` (9 of 9 passing, including the create/edit role flows) and by the UAT execution recorded as passed on the portal for this release.
- Data, security and compliance exposure: none from the failures themselves; no production code or data path is affected. The risk is a regression-tier signal that is red until the specs are fixed, which could hide a later real failure.
- Blast radius: the `regression` post-deploy tier only. The release gate tier (`critical`) and production smoke passed.
- Likelihood and severity: the specs will fail on every run until fixed (likelihood high), severity low.
- Compensating controls: the `critical` spec and the portal UAT above; production smoke passed on `7fd8d4a`.

## Why this does not block this release

The failures are in tests, not in the application, and the same behaviour is asserted by gating tests that passed. Fixing them requires only a test change, which does not need to hold a released, healthy production build. This decision would change if the isolated rerun of the fixed specs fails (which would indicate an application issue), or if #1015 is still open at `review_by`.

## Remediation

Tracked in #1015 (label `accepted-e2e-failure`). Owner: project operator with the coding agent. Target: before the next release branch is cut (Release 3 of tracker #953), 2026-12-07 at the latest. #1015 updates both specs, runs the full `regression` tier in an isolated stack, and merges to `develop`.

## Sign-off

| Role           | Name                                | Date       |
| -------------- | ----------------------------------- | ---------- |
| Decision maker | ostendo-io operator (project owner) | 2026-11-07 |
