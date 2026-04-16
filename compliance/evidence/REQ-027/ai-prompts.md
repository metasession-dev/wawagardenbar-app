# AI Prompts Log — REQ-027

**Requirement:** REQ-027
**Risk Level:** MEDIUM
**Date:** 2026-04-15

---

## Phase 1 — Planning

### Prompt 1: Requirement Plan

**Context:** User reported that deleting a user and recreating with the same credentials fails due to unique index conflicts.
**Task:** Create requirement plan (implementation plan, test scope, test plan) for fixing user re-creation after admin deletion.
**Output:** `compliance/evidence/REQ-027/implementation-plan.md`, `test-scope.md`, `test-plan.md`

---

## Phase 2 — Unit Tests

### Prompt 2: Unit Test Authoring

**Context:** RED phase — write tests before implementation.
**Task:** Create 7 unit tests for `deleteUserAction` covering soft-delete behaviour, field mangling, session clearing, audit logging, RBAC enforcement, self-deletion prevention, and super-admin protection.
**Output:** `__tests__/actions/admin/user-actions.test.ts`

---

## Phase 3 — Implementation

### Prompt 3: Soft-Delete Implementation

**Context:** GREEN phase — make tests pass.
**Task:** Change `deleteUserAction` from `user.deleteOne()` to soft delete: set `accountStatus = 'deleted'`, mangle unique fields with `del_{userId}` pattern, clear `sessionToken`. Update `admin-service.deleteAdmin` for consistency.
**Output:** `app/actions/admin/user-actions.ts`, `services/admin-service.ts`, `models/user-model.ts`

### Prompt 4: Auth Flow Exclusion Filters

**Context:** Prevent soft-deleted users from authenticating or blocking new registrations.
**Task:** Add `accountStatus: { $ne: 'deleted' }` filter to all auth lookups (send-pin, send-whatsapp-pin, send-email-pin, verify-pin, verify-email-pin, verify-whatsapp-pin) and customer creation duplicate check.
**Output:** 7 auth/API files modified

### Prompt 5: Mongoose TypeScript Fix

**Context:** TypeScript errors when setting fields to `undefined` via direct assignment on Mongoose documents.
**Task:** Use Mongoose `set()` method for nulling fields to satisfy TypeScript strict mode.
**Output:** `app/actions/admin/user-actions.ts`

---

## Phase 4 — E2E Tests

### Prompt 6: E2E Test Authoring

**Context:** Post-implementation — verify full flows through the UI.
**Task:** Create E2E tests for admin delete + recreate with same username, and customer delete + recreate with same email/phone. Create test API endpoint for seeding/cleanup.
**Output:** `e2e/user-deletion-recreation.spec.ts`, `app/api/test/manage-user/route.ts`

### Prompt 7: Customer Deletion E2E

**Context:** Initial E2E only covered admin flow; customer deletion via UI needed separate test.
**Task:** Add customer deletion E2E test using test API for seeding, UI for deletion, and test API for re-creation verification.
**Output:** Updated `e2e/user-deletion-recreation.spec.ts`

---

## Summary

- **Total prompts:** 7
- **Phases:** Planning (1), Unit Tests (1), Implementation (3), E2E Tests (2)
- **Files created:** 3
- **Files modified:** 10
- **Tests added:** 7 unit + 2 E2E = 9 total
