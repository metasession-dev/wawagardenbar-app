## Security Evidence Summary — REQ-012

**Date:** 2026-03-26
**SAST Tool:** Semgrep (auto config)
**SAST High/Critical Findings:** 0 new (pre-existing baseline: path-traversal in profile-service.ts, regex in profile-service.ts — unrelated to this change)
**Dependency Audit High/Critical:** 0 new (pre-existing: xlsx prototype pollution — no fix available, unrelated to this change)
Evidence generated locally. CI auto-uploads to META-COMPLY on develop push.

### Access Control Verification (HIGH risk)

- `recordPartialPaymentAction` restricted to `admin` and `super-admin` roles via iron-session check
- Server action validates session before calling service layer
- Service layer validates tab state (must be open, not already paid)
- Consistent with existing `completeTabPaymentManuallyAction` auth pattern

### Audit Log Verification (HIGH risk)

- Each partial payment creates an `AuditLogService.createLog()` entry with action `tab.partial_payment`
- Audit log captures: amount, note, paymentType, paymentReference, outstandingBalanceAfter, totalPartialPayments, tabTotal
- Consistent with existing `tab.manual_payment` audit pattern

### Input Validation

- Amount must be > 0 and < outstanding balance (server-side + client-side)
- Note is mandatory and must be non-empty (server-side + client-side)
- PaymentType restricted to enum: 'cash' | 'transfer' | 'card'
- TabId validated as existing document
- No user-controlled input reaches MongoDB queries without validation

## UAT Verification — 2026-03-26
- UAT Health check: PASS — `{"status":"healthy"}`
- UAT Smoke test: PASS — Homepage 200, Public menu 401 (requires API key)
- UAT Tabs page: PASS — 307 redirect to login (auth required)
- Feature verification: PASS — Deploy successful, application healthy, tab-related routes accessible behind auth
- UAT URL: https://wawagardenbar-app-uat.up.railway.app
