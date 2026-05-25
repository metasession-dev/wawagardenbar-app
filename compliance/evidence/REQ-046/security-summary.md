# Security Summary — REQ-046

**Requirement:** REQ-046 — IG-1 cadence schema + IG-6 admin form fields
**Risk Level:** LOW
**Date:** 2026-05-25

## Threat model

| Concern          | Assessment                                                                                                                                                                                                                                                            |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Authentication   | No change. Admin form is reached via the existing `/dashboard/rewards` route, already gated by the dashboard's role middleware.                                                                                                                                       |
| Authorization    | No change. Reward-rule create/edit was already restricted to admin / super-admin roles via the dashboard auth middleware. New fields inherit this gating.                                                                                                             |
| Input validation | New fields validated client-side via Zod (`postsRequired` and `windowDays` coerced to integer, min 1) and server-side via Mongoose schema validators (Number with min 1). `requireMention` is a Boolean. Same validation depth as the existing `socialConfig` fields. |
| Injection / XSS  | Fields are numeric / boolean only. No string fields added. No new injection surfaces.                                                                                                                                                                                 |
| Data exposure    | No new PII or sensitive data captured. The fields describe a campaign rule, not user data.                                                                                                                                                                            |
| Audit trail      | No changes to audit logging in this REQ. The polling job (future REQ) that will award points based on these fields will write standard `PointsTransaction` ledger entries and `AuditLog` rows.                                                                        |
| Dependency risk  | Zero new dependencies.                                                                                                                                                                                                                                                |

## Authorization recap

`/dashboard/rewards` — rule create/edit endpoint:

- Reached via the dashboard's existing route protection (admin / super-admin only via `lib/auth-middleware.ts`).
- Same gating as the legacy `socialConfig` fields. No new attack surface.

## Data classification

- `postsRequired`, `windowDays`, `requireMention` — configuration data, not user data. Public-safe (visible to all customers who see "Earn N points by posting K times" surfaces when those land in future REQs).

## Compliance considerations

- **GDPR / data privacy:** Not applicable — no personal data involved in this REQ.
- **PCI:** Not applicable — no payment data.
- **ISO 29119 traceability:** Full RTM row + this evidence pack covers it.

## Open security questions for follow-up REQs

These do **not** apply to REQ-046 but are flagged for IG-3/IG-4 scoping:

- The Meta Graph API access token (`INSTAGRAM_ACCESS_TOKEN`) handling — should rotate periodically, scoped to least-privilege permissions on the bar's IG Business account.
- The customer's IG handle (already stored in `User.socialProfiles.instagram.handle`) — does it count as PII under GDPR? Confirm before IG-7 surfaces it elsewhere.

## Conclusion

No new security surface. Additive configuration fields, identical authorization to the existing fields, no PII or payment data involved.
