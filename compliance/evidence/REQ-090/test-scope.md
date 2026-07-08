# Test scope — REQ-090

**Requirement:** REQ-090 — Fix E2E critical-tier regression blockers on develop
**Risk class:** LOW
**Issue:** operator request (PR #462 CI blocker)

## Acceptance criteria

| AC | Description | SRS item | Verification method |
| --- | --- | --- | --- |
| AC1 | `getOrdersAction` serialises orders that lack an `updatedAt` field without throwing `TypeError`. | `@srs-deferred` | Unit + E2E |
| AC2 | `/dashboard/orders` renders the "Create Tab" card without a React hydration mismatch. | `@srs-deferred` | E2E |

## Coverage summary

- Layers planned: unit (AC1), e2e (AC1, AC2)
- No new E2E tests are authored; existing critical-tier specs cover the affected surfaces.
