---
req: REQ-114
generated_by: e2e-test-engineer
generated_at: 2026-10-23T22:42:55Z
e2e_required: true
spec_path: e2e/settings/zod-validation-messages.spec.ts
---

# E2E scope decision — REQ-114

## Outcome

**E2E required — covered.** The upgrade is behaviour-preserving, and the zod layer is proved by unit tests. One path unit tests cannot reach is a real form rendering a zod error through `@hookform/resolvers` 5 in the client bundle, and the existing suite had no assertion on a rendered validation message, so one small regression-tier spec was added. The full existing regression pack was re-run and compared with `develop` for AC4.

## Detail

- **`e2e_required`:** `true`
- **Rationale:** N/A — covered below.
- **Spec path(s):** `e2e/settings/zod-validation-messages.spec.ts` (regression tier).
- **ACs covered:** AC3 (Settings → Contact Email shows zod 3's "Invalid email", not zod 4's "Invalid email address") and AC2 (a valid address clears the error), each with `tagTest` and `evidenceShot`. A negative control (compatibility map disabled) makes the spec fail. AC1 (audit gate) and AC4 (suite integrity) have no UI surface. The `requiredError` messages are not UI-reachable (every form seeds a default), so they are proved at unit level.
- **Local results (2026-10-23):** new spec 3/3, retries off. Full regression: 555 passed, 8 failed, 25 skipped; every failure triaged as not caused by REQ-114 (see `test-execution-summary.md`, tracked in #957).

## Operator sign-off

I have reviewed the e2e-scope verdict above and confirm it matches the actual scope of this REQ's diff.

**Reviewer:** <operator-name>
**Date:** <YYYY-MM-DD>
