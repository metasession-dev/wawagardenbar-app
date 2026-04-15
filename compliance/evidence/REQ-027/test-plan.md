# Test Plan — REQ-027

**Requirement:** REQ-027
**Risk Level:** MEDIUM
**GitHub Issue:** #59
**Date:** 2026-04-15

## Tests to Add

- [ ] `__tests__/actions/admin/user-actions.test.ts` — Unit tests for soft delete behaviour: accountStatus set to deleted, unique fields nulled, audit log created
- [ ] `e2e/user-deletion-recreation.spec.ts` — E2E test: admin deletes user, then creates new user with same credentials

## Tests to Update

- None expected (existing tests don't test deletion flow)

## Tests to Remove

- None

## Functional Test Mapping

| Acceptance Criterion                        | Test File                                      | Test Name                                        |
| ------------------------------------------- | ---------------------------------------------- | ------------------------------------------------ |
| Soft delete sets accountStatus to 'deleted' | `__tests__/actions/admin/user-actions.test.ts` | "deleteUserAction soft-deletes user"             |
| Unique fields nulled on deletion            | `__tests__/actions/admin/user-actions.test.ts` | "deleteUserAction nulls unique fields"           |
| Audit log created on deletion               | `__tests__/actions/admin/user-actions.test.ts` | "deleteUserAction creates audit log"             |
| Customer creation excludes deleted users    | `e2e/user-deletion-recreation.spec.ts`         | "can create user with same email after deletion" |
| Auth flows exclude deleted users            | `e2e/user-deletion-recreation.spec.ts`         | "can register with same phone after deletion"    |

## Non-Functional Tests (MEDIUM)

- [ ] Security: verify soft-deleted users cannot authenticate (send-pin returns "new user" flow, not existing)
- [ ] Data integrity: soft-deleted records remain in DB for audit trail

## Test Data Requirements

- Test user with known email and phone for delete/recreate cycle
- Super-admin session for deletion action
