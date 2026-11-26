/**
 * @requirement REQ-PAY-014 (REQ-128) — who may refund or decide a refund request.
 * Access is the union of a staff account's roles (REQ-119), so a `csr` who is
 * also a `manager` can refund.
 */
export const REFUND_ROLES = ['manager', 'admin', 'super-admin'] as const;
