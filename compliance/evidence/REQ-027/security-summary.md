# Security Summary — REQ-027

**Requirement:** REQ-027
**Issue:** #59
**Risk Level:** MEDIUM
**Date:** 2026-04-16

---

## Security Assessment

### Data Integrity

**Soft delete preserves audit trail:** Users are no longer hard-deleted. Setting `accountStatus = 'deleted'` keeps the record in the database for audit purposes while removing the user from all active queries.

**Unique field mangling:** On deletion, `email`, `phone`, and `username` are replaced with `del_{userId}@deleted` / `del_{userId}` patterns. This frees the original values for reuse without creating ambiguity — mangled values are clearly identifiable as deleted records.

**Sparse index on phone:** The `phone` field was updated to `sparse: true` so that mangled/null values on deleted records don't conflict with the unique index.

### Access Control (RBAC)

**Delete user:** Super-admin only — enforced by `session.role !== 'super-admin'` check in `deleteUserAction`.

**Self-deletion prevention:** Users cannot delete their own account — enforced by `userId === session.userId` check.

**Super-admin protection:** Super-admin accounts cannot be deleted by other super-admins — enforced by role check on target user.

**Auth flow exclusion:** All auth lookups (`send-pin`, `send-whatsapp-pin`, `send-email-pin`, `verify-pin`, `verify-email-pin`, `verify-whatsapp-pin`) now include `accountStatus: { $ne: 'deleted' }` to prevent soft-deleted users from authenticating.

**Customer creation exclusion:** `POST /api/public/customers` excludes deleted users from duplicate checks, allowing re-registration with previously-used credentials.

### Audit Trail

Deletion creates an audit log entry via `AuditLogService.createLog` with:

- `action: 'DELETE_USER'`
- `resourceType: 'user'`
- `resourceId: userId`
- `details: { deletedUserEmail, deletedUserRole }`

The soft-deleted record itself remains in the database with `accountStatus: 'deleted'` and mangled fields, providing a permanent audit trail.

### NoSQL Injection

All database operations use Mongoose models with typed schemas. The `accountStatus` filter is a static string comparison (`{ $ne: 'deleted' }`), not user-derived input.

### Consistency

Both `deleteUserAction` (customers) and `admin-service.deleteAdmin` (admins) now follow the same soft-delete + field mangling pattern, preventing divergent behaviour between user types.

---

## Static Analysis (Semgrep)

**Status:** PASS

No new findings introduced by REQ-027 changes. Baseline findings (cors, format strings) are pre-existing and unrelated.

---

## Dependency Audit (npm audit)

**Status:** PASS

No new dependencies added. Baseline `xlsx` vulnerability is pre-existing and accepted.

---

## CI Gate Results

**CI Run:** https://github.com/metasession-dev/wawagardenbar-app/actions/runs/24501093716
**Status:** All gates passed

| Gate             | Result |
| ---------------- | ------ |
| TypeScript Check | PASS   |
| SAST Scan        | PASS   |
| Dependency Audit | PASS   |
| E2E Tests        | PASS   |
| Build Check      | PASS   |
