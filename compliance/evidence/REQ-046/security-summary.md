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

## UAT Verification — 2026-05-26

Exercised against the deployed UAT environment (Stage 3 Step 10; `uat.required_risk_classes: ["*"]`), on the build carrying D3–D5.

- UAT Health check: PASS — `GET /api/public/health` → 200.
- UAT Smoke test: PASS — `GET /` → 200; `GET /dashboard/rewards/rules/new` → 307 (admin-gated route present, redirects to login).
- Feature verification (manual, super-admin on UAT): PASS — created a Social/Instagram reward rule with the **Cadence fields left blank**, the **Period Type select untouched** (default "Weekly"), and **Max Redemptions Per User blank**, then **Save**. The rule saved and persisted. This confirms on the deployed build: D3 (blank cadence omitted), D4 (`periodType` defaults to `weekly`), and D5 (blank Max Redemptions = unlimited) — the three blank-optional-field defects surfaced during earlier UAT rounds.
- UAT URL: https://wawagardenbar-app-uat.up.railway.app/

Negative paths (e.g. `0` in a cadence field rejected with a toast naming `socialConfig.postsRequired`) are covered by the vitest schema suite (`__tests__/components/reward-rule-form-schema.test.ts`). Full UI coverage of AC1–AC4 is encoded in `e2e/rewards/reward-rule-cadence.spec.ts` (PR #135), which runs in CI once the report-only authenticated-e2e gate (DevAudit-Installer#54) ships and `e2e_projects` is configured; until then this manual UAT smoke is the verification of record.
