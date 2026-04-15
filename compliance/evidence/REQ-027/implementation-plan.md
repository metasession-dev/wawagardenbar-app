# Implementation Plan — REQ-027

**Requirement:** REQ-027
**GitHub Issue:** #59
**Risk Level:** MEDIUM
**Date:** 2026-04-15

## Approach

Change user deletion from hard delete to soft delete (consistent with admin-service.ts), and null out unique-indexed fields (email, phone, username) on soft-deleted records so the values are freed for reuse. Add `accountStatus: { $ne: 'deleted' }` filters to all user lookup queries in auth and creation flows to exclude soft-deleted records.

## Files to Create

- None

## Files to Modify

- `app/actions/admin/user-actions.ts` — Change `deleteUserAction` from `user.deleteOne()` to soft delete: set `accountStatus = 'deleted'`, clear `sessionToken`, null out `email`/`phone`/`username` to free unique indexes
- `app/api/public/customers/route.ts` — Add `accountStatus: { $ne: 'deleted' }` filter to the existing-user check in POST
- `app/actions/auth/send-pin.ts` — Add `accountStatus: { $ne: 'deleted' }` filter to `findOne({ phone })`
- `app/actions/auth/send-whatsapp-pin.ts` — Add `accountStatus: { $ne: 'deleted' }` filter to `findOne({ phone })`
- `app/actions/auth/send-email-pin.ts` — Add `accountStatus: { $ne: 'deleted' }` filter to `findOne({ phone })` and `findOne({ email })`
- `services/admin-service.ts` — In `deleteAdmin`, also null out `email`/`phone`/`username` on soft delete to match the new pattern

## Architecture Decisions

- **Soft delete with field nulling** rather than just soft delete: MongoDB unique indexes don't support partial indexes with `$ne` conditions natively. Nulling the fields on deletion (with `sparse: true` on the index) ensures the unique constraint is fully released for reuse, without needing a compound unique index.
- **Consistent approach** across both `deleteUserAction` (customers) and `admin-service.deleteAdmin` (admins): both will soft-delete and null unique fields.
- The `phone` field currently lacks `sparse: true` — this must be added so that nulled phones on deleted records don't conflict.

## Dependencies

- None

## Risks / Considerations

- The `phone` field is currently `required: true` and `unique: true` without `sparse: true`. Changing to `sparse: true` and removing `required` means we need to ensure all creation paths still provide phone. This is already the case — all auth flows require phone.
- Existing hard-deleted users are already gone from the DB — no migration needed for those. Only future deletions will be affected.
- Admin service's `deleteAdmin` already soft-deletes but doesn't null fields — need to update it too for consistency.

## Post-Deploy Actions

- None
