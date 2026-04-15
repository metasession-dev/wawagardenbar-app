# Test Scope — REQ-027

**Risk Level:** MEDIUM
**Requirement:** Fix user re-creation after admin deletion
**GitHub Issue:** #59
**Date:** 2026-04-15

## Test Approach

Standard gates plus targeted verification.

**Universal gates (mandatory — verified locally AND in CI):**

- TypeScript compilation: 0 errors
- SAST scan: 0 high/critical findings
- Dependency audit: 0 high/critical vulnerabilities
- E2E suite: all pass (full suite local, unauthenticated subset in CI)
- Human code review via PR

**Additional testing required by risk level:**

- [ ] Audit logging: deletion action still produces audit log entries
- [ ] Unique constraint: deleted user's credentials are freed for reuse
- [ ] Auth flow: soft-deleted users cannot log in

## Validation Approach

How we confirm this meets the business requirement:

- Admin deletes a user, then creates a new user with the same email and phone — succeeds without errors
- Soft-deleted user record remains in DB for audit trail
- Customer self-registration via SMS/WhatsApp with a previously-deleted phone number succeeds
- Existing active users are unaffected by the query filter changes

## Acceptance Criteria

- [ ] Admin deletion soft-deletes users (sets accountStatus to 'deleted') instead of hard-deleting
- [ ] Unique fields (email, phone, username) are nulled on deletion to free them for reuse
- [ ] Customer creation (POST /api/public/customers) excludes deleted users from duplicate checks
- [ ] Auth flows (send-pin, send-whatsapp-pin, send-email-pin) exclude deleted users from lookups
- [ ] Admin service deleteAdmin also nulls unique fields for consistency
- [ ] phone field in user model updated to sparse: true (allows null for deleted records)
- [ ] All existing E2E tests continue to pass (no regressions)
