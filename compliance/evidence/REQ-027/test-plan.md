# Test Plan — REQ-027

**Requirement:** REQ-027
**Risk Level:** MEDIUM
**GitHub Issue:** #59
**Date:** 2026-04-15

## Tests to Add

- [x] `__tests__/actions/admin/user-actions.test.ts` — Unit tests for soft delete behaviour: accountStatus set to deleted, unique fields mangled, audit log created
- [x] `e2e/user-deletion-recreation.spec.ts` — E2E tests: admin and customer delete + recreate with same credentials

## Tests to Update

- None (existing tests don't test deletion flow)

## Tests to Remove

- None

## Functional Test Mapping

| Acceptance Criterion                        | Test File                                      | Test Name                                                    |
| ------------------------------------------- | ---------------------------------------------- | ------------------------------------------------------------ |
| Soft delete sets accountStatus to 'deleted' | `__tests__/actions/admin/user-actions.test.ts` | "soft-deletes user by setting accountStatus to deleted"      |
| Unique fields mangled on deletion           | `__tests__/actions/admin/user-actions.test.ts` | "mangles unique fields (email, phone, username) on deletion" |
| Session token cleared on deletion           | `__tests__/actions/admin/user-actions.test.ts` | "clears sessionToken on deletion"                            |
| Audit log created on deletion               | `__tests__/actions/admin/user-actions.test.ts` | "creates audit log with deleted user details"                |
| Admin recreate with same username           | `e2e/user-deletion-recreation.spec.ts`         | "can delete admin and recreate with same username"           |
| Customer recreate with same email/phone     | `e2e/user-deletion-recreation.spec.ts`         | "can delete customer and recreate with same email and phone" |
| RBAC: non-super-admin cannot delete         | `__tests__/actions/admin/user-actions.test.ts` | "rejects non-super-admin users"                              |
| Cannot delete own account                   | `__tests__/actions/admin/user-actions.test.ts` | "prevents deleting own account"                              |
| Cannot delete super-admin accounts          | `__tests__/actions/admin/user-actions.test.ts` | "prevents deleting other super-admins"                       |

## Non-Functional Tests (MEDIUM)

- [x] Security: soft-deleted users cannot be found by auth flows (accountStatus filter + field mangling)
- [x] Data integrity: soft-deleted records remain in DB with mangled fields for audit trail

## Test Data Requirements

- Admin user with known username for admin delete/recreate cycle (created via UI)
- Customer user with known email and phone for customer delete/recreate cycle (seeded via test API)
- Super-admin session for deletion actions
