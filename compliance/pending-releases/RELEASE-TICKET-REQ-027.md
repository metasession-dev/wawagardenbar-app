# Release Ticket: REQ-027 — User Soft-Delete and Re-creation

**Status:** TESTED - PENDING SIGN-OFF
**Date:** 2026-04-16
**Requirement ID:** REQ-027
**Risk Level:** MEDIUM
**PR:** TBD

---

## Summary

Changed user deletion from hard delete to soft delete across both customer and admin flows. Unique fields (email, phone, username) are mangled on deletion to free them for reuse, allowing new users to register with previously-deleted credentials. All auth flows exclude soft-deleted users.

---

## AI Involvement

- **AI Tool Used:** Claude Code (Claude Opus 4.6)
- **AI-Generated Files:** All implementation and test files
- **Human Reviewer of AI Code:** William
- **Components Regenerated:** None

---

## Implementation Details

**Files Modified:**

- `app/actions/admin/user-actions.ts` — Changed `deleteUserAction` from hard delete to soft delete with field mangling
- `services/admin-service.ts` — Updated `deleteAdmin` to also null unique fields on soft delete for consistency
- `app/api/public/customers/route.ts` — Added `accountStatus: { $ne: 'deleted' }` filter to duplicate checks
- `app/actions/auth/send-pin.ts` — Added deleted-user exclusion filter
- `app/actions/auth/send-whatsapp-pin.ts` — Added deleted-user exclusion filter
- `app/actions/auth/send-email-pin.ts` — Added deleted-user exclusion filter
- `app/actions/auth/verify-pin.ts` — Added deleted-user exclusion filter
- `app/actions/auth/verify-email-pin.ts` — Added deleted-user exclusion filter
- `app/actions/auth/verify-whatsapp-pin.ts` — Added deleted-user exclusion filter
- `models/user-model.ts` — Added `sparse: true` to phone index, relaxed `required` for soft-delete compatibility

**Files Created:**

- `__tests__/actions/admin/user-actions.test.ts` — 7 unit tests for soft-delete behaviour
- `e2e/user-deletion-recreation.spec.ts` — 2 E2E tests for delete + recreate flows
- `app/api/test/manage-user/route.ts` — Test API for E2E customer seeding/cleanup

**Dependencies Added/Changed:**

- No dependency changes

---

## Test Evidence

| Test Type        | Count | Passed | Failed | Evidence Location                                                                                    |
| ---------------- | ----- | ------ | ------ | ---------------------------------------------------------------------------------------------------- |
| Unit (Vitest)    | 7     | 7      | 0      | Git: `__tests__/actions/admin/user-actions.test.ts`                                                  |
| E2E (Playwright) | 2     | 2      | 0      | Git: `e2e/user-deletion-recreation.spec.ts`                                                          |
| CI (full suite)  | All   | All    | 0      | [CI Run #24501093716](https://github.com/metasession-dev/wawagardenbar-app/actions/runs/24501093716) |

---

## Security Evidence

| Check            | Result         | Evidence Location                                      |
| ---------------- | -------------- | ------------------------------------------------------ |
| SAST             | 0 new findings | Git: `compliance/evidence/REQ-027/security-summary.md` |
| Dependency Audit | 0 new findings | Git: `compliance/evidence/REQ-027/security-summary.md` |
| Access Control   | PASS           | Git: `compliance/evidence/REQ-027/security-summary.md` |
| Audit Log        | PASS           | Git: `compliance/evidence/REQ-027/security-summary.md` |

---

## Acceptance Criteria

- [x] Admin deletion soft-deletes users (sets accountStatus to 'deleted') instead of hard-deleting
- [x] Unique fields (email, phone, username) are mangled on deletion to free them for reuse
- [x] Customer creation (POST /api/public/customers) excludes deleted users from duplicate checks
- [x] Auth flows (send-pin, send-whatsapp-pin, send-email-pin) exclude deleted users from lookups
- [x] Admin service deleteAdmin also nulls unique fields for consistency
- [x] phone field in user model updated to sparse: true (allows null for deleted records)
- [x] All existing E2E tests continue to pass (no regressions)
- [x] TypeScript clean (0 errors)
- [x] SAST clean (0 new findings)
- [x] Dependencies clean (0 new high/critical)
- [x] AI use documented

---

## Risk Assessment

**Data Integrity:** MEDIUM — Soft delete preserves records for audit trail. Mangled fields use deterministic `del_{userId}` pattern, preventing collisions and enabling traceability.

**Auth Security:** MEDIUM — All six auth action files updated to exclude deleted users. Mangled credentials provide defence-in-depth even if a filter is missed, since `del_{userId}@deleted` won't match real credentials.

**Unique Index Safety:** LOW — `sparse: true` on phone index allows null/mangled values without conflicts. Tested via E2E delete + recreate cycle.

**Overall Risk:** MEDIUM — Mitigated by RBAC (super-admin only), audit logging, and comprehensive test coverage.

---

## Post-Deploy Actions

| Type | Script / Command | Target | Required | Notes                           |
| ---- | ---------------- | ------ | -------- | ------------------------------- |
| —    | None             | —      | —        | No post-deploy actions required |

**Run these after deployment, before production verification.**

---

## Reviewer Checklist

- [ ] Code matches requirement
- [ ] Test evidence present and all-pass
- [ ] Security evidence present and clean
- [ ] Test scope fully addressed
- [ ] RTM correct status and risk
- [ ] No sensitive data committed
- [ ] No regressions
- [ ] AI code reviewed (if applicable)
- [ ] No hallucinated dependencies
- [ ] Post-deploy actions documented (or confirmed none required)

---

## Audit Trail

| Date       | Action                   | Actor       | Notes                                        |
| ---------- | ------------------------ | ----------- | -------------------------------------------- |
| 2026-04-15 | Requirement created      | William     | Risk: MEDIUM, GitHub issue #59               |
| 2026-04-15 | Implementation completed | Claude Code | Soft-delete + field mangling across 10 files |
| 2026-04-15 | Tests written            | Claude Code | 7 unit + 2 E2E tests                         |
| 2026-04-15 | AI code reviewed         | William     | All implementation and test files            |
| 2026-04-16 | CI gates passed          | CI          | Run #24501093716 — all green                 |
| 2026-04-16 | Evidence compiled        | Claude Code | Security summary, test execution summary     |
