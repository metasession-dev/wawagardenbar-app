---
req: REQ-089
generated_by: risk-register-keeper
generated_at: 2026-07-02T07:00:00Z
---

# Risk assessment — REQ-089

## Summary

This REQ opened the following entry in `compliance/risk-register.md`:

| RISK-ID | Title                                                              | Status this cycle | Residual L × I |
| ------- | ------------------------------------------------------------------ | ----------------- | -------------- |
| R-011   | Price override bypass via customer flow after removal from cart UI | MITIGATED         | low × medium   |

## Detail

### R-011 — Price override bypass via customer flow

- **Opened:** 2026-07-02 (REQ-089)
- **Status:** MITIGATED — Controls landed in this REQ:
  - Price override UI removed from `cart-item.tsx` (customer flow)
  - `allowManualPriceOverride` forwarding removed from `menu-item-detail-modal.tsx`
  - Server-side reconciler (`reconcileAndValidateOrderLines`) validates `allowManualPriceOverride` flag before accepting override
  - Price override only accessible in admin flows (Express Create Order, Edit Order Dialog)
- **Residual risk:** low likelihood × medium impact — a customer cannot override prices via the UI; server-side validation prevents bypass even if the client is tampered with

## Framework cross-references

- SOC2.CC3.2 — R-011 (Risk identification and assessment)
- ISO27001.A.8.2 — R-011 (Information security — price manipulation prevention)

## Operator sign-off

I have reviewed the risk register entries above and confirm:

- [ ] Each entry's residual rating is defensible given the controls landing in this REQ.
- [ ] No risk was downgraded without evidence (control demonstrated effective via tests).
- [ ] OPEN entries have follow-up tracking (issue / deadline / next-review-due).

**Reviewer:** <operator-name>
**Date:** <YYYY-MM-DD>
