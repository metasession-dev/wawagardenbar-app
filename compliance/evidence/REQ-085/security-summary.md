---
req: REQ-085
generated_at: 2026-06-25T17:10:00Z
---

# Security summary — REQ-085

## Change overview

Bug fix: removed `status: 'confirmed'` from `updateMany` `$set` calls in `TabService.markTabPaid` and `TabService.completeTabPaymentManually`. Added labeled "Kitchen:" and "Payment:" badges to order surfaces.

## Security analysis

### Authentication / authorization

No changes to auth flows. `completeTabPaymentManually` retains its existing admin/super-admin session check — unchanged by this fix.

### Data handling

No new data collection, processing, or storage. Customer email and phone are already stored on tab/order documents by existing code and are not modified by this fix.

### Input validation

No new inputs introduced. The fix removes a field from an internal `$set` operation — no user-facing input path is affected.

### Dependencies

No new npm packages. No new external services.

### Secrets

No secrets handled. Payment gateway credentials are in existing env vars, unchanged.

## Threat model

| Threat                                       | Likelihood | Impact | Mitigation                                               |
| -------------------------------------------- | ---------- | ------ | -------------------------------------------------------- |
| Unauthorized tab payment closure             | Low        | High   | Existing admin/super-admin session check — unchanged     |
| Double inventory deduction via status reset  | Medium     | High   | **This fix removes the root cause**                      |
| Payment status spoofing via direct DB access | Low        | High   | Out of scope — DB access restricted to application layer |

## SAST results

Semgrep scan: 6 findings (all pre-existing, at baseline). 0 new findings introduced by this REQ.

## Dependency audit

`npm audit --audit-level=high`: 0 high/critical vulnerabilities. 4 moderate (below gate threshold).

## UAT verification

**UAT URL:** https://wawagardenbar-app-uat.up.railway.app
**Deploy status:** Railway auto-deploy from `develop` — HTTP 200 (healthy)
**Verified:** 2026-06-25

1. Health check: PASS (HTTP 200)
2. Code deployed: latest develop commits pushed and confirmed
3. Feature verification: Dashboard pages require auth — verified via E2E tests locally (11/11 pass)
4. No regressions: Existing tab payment E2E tests pass (13/13, 20 skipped due to no open tabs)

## Conclusion

This REQ is a bug fix that removes a harmful field overwrite from payment processing. It introduces no new security surfaces, no new dependencies, and no new data handling. The risk register entry R-008 documents the mitigated risk.
