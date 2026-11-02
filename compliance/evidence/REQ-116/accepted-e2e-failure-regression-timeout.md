---
record_kind: accepted_e2e_failure
req: REQ-116
release: REQ-116
failing_specs:
  - e2e/ci-reliability/regression-run.sh (shards 1 and 2 timed out; no individual spec reported failing)
ci_run: https://github.com/metasession-dev/wawagardenbar-app/actions/runs/41325971404
head_sha: 9df96c0f9c505d7b2c43c942bf77b8d09f4e8765
classification: test_bug
decision_maker: ostendo-io operator (project owner)
decided_at: 2026-11-02
review_by: 2026-11-16
tracking_issue: https://github.com/metasession-dev/wawagardenbar-app/issues/997
---

# Accepted E2E failure — REQ-116

> Accepted by the operator after an explicit choice at the release triage gate on 2026-11-02. The classification is `test_bug` because the cause is test infrastructure (shard composition and budget), not application behaviour.

## Failure

| Spec                           | Test | CI run / attempt                                                              | Error excerpt                                                                                                                                                                                |
| ------------------------------ | ---- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| none: whole shards 1/4 and 2/4 | n/a  | 41325971404 / 1 (post-deploy `E2E Regression` on `main`, `deployment_status`) | `outcome: timed_out`, exit 124. Each shard is limited to 12 minutes (`SHARD_TIMEOUT_MINUTES` in `e2e/ci-reliability/regression-run.sh`); shards 1 and 2 were killed and wrote no result file |

## Evidence of classification

- No spec reported a failure. Shards 3 and 4 ran 184 and 188 tests with 0 unexpected and 0 flaky. The server logs of shards 1 and 2 show normal 200 responses up to the kill.
- Cause: REQ-116 AC12 made the `regression` project depend on the chained `critical-aggregate-*` projects, so every shard re-runs about 46 extra tests (191 and 190 tests in shards 3 and 4 against about 145 to 150 before). The previous good run (2026-10-29, run 40839243952) already used 11.3 of the 12 minutes in shard 1.
- Code under test did not change between the passing PR gate and this run: the same commit passed the `critical` tier 326 of 326 at default workers, and the release PR's E2E Regression Suite passed in 14m12s.
- What is not known: the results of the roughly 290 tests in shards 1 and 2 on `main`.

## Impact assessment

- **Journeys and requirements:** the unverified part is the general regression pack (all `e2e/**` specs outside the tiers already gated on the release PR). REQ-116's own ACs are covered by the critical-tier specs that passed on the release PR and by unit tests.
- **Exposure if something in shards 1 or 2 is actually broken:** an undetected regression in non-gated flows, found later by the next sharded run or by users. No data, security or compliance exposure is specific to REQ-116 beyond what the gated tiers and unit tests cover.
- **Likelihood and severity:** low likelihood, since the same code passed every gated check and the shards that did report results were clean; severity medium for a regression pack that is part of the audit trail.
- **Compensating controls and manual verification:** production smoke passed on `9df96c0`; UAT passed and was recorded in the portal; the operator is to check the production unsigned-webhook rejection (403) and PIN delivery by hand before approving Production, and the Production approval in the portal is the record of that; the umbrella issue holds the fix and a re-run.

## Why this does not block this release

The failing run is a budget overrun in CI composition, not a test or behaviour failure, and every gated check for this code is green. What would change this decision: a sharded re-run on `main` that shows a real failure in shards 1 or 2. In that case a fix-forward release is required and this exception is withdrawn.

## Remediation

Tracked in [#997](https://github.com/metasession-dev/wawagardenbar-app/issues/997): remove the chain from the `regression` project, raise the per-shard default to 15 minutes, verify with a dispatched sharded run, promote to `main`, and confirm a green sharded regression. Owner: operator with `sdlc-implementer`. Target: before 2026-11-16, the `review_by` date; if #997 is still open then, this exception expires and must be renewed or fixed.

## Sign-off

| Role           | Name                                | Date       |
| -------------- | ----------------------------------- | ---------- |
| Decision maker | ostendo-io operator (project owner) | 2026-11-02 |
