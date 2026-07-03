# Security summary — REQ-089

**Requirement:** REQ-089 — Admin order management: portion size selection, manual price override, per-item special instructions, stock validation
**Risk class:** MEDIUM
**Date:** 2026-07-02

## Security considerations

### Price override access control

- Price override UI removed from customer-facing cart (`cart-item.tsx`, `menu-item-detail-modal.tsx`)
- Server-side reconciler (`reconcileAndValidateOrderLines`) validates `allowManualPriceOverride` flag before accepting any override
- Price override only accessible in admin flows (Express Create Order, Edit Order Dialog)
- Risk register entry R-011 tracks this as MITIGATED

### Stock validation

- `expressCreateOrderAction` validates quantity × portion multiplier against `currentStock` before order creation
- Prevents overselling even if client-side validation is bypassed
- Clear error messages naming the affected item

### Input validation

- Special instructions: textarea input, no HTML rendering (React auto-escapes)
- Price override reason: required text field, persisted for audit trail
- Portion size: constrained to 'full', 'half', 'quarter' enum values

## UAT verification

| Check                | URL                                                                                | Result                         |
| -------------------- | ---------------------------------------------------------------------------------- | ------------------------------ |
| Health check         | https://wawagardenbar-app-uat.up.railway.app                                       | 200 OK                         |
| Express create order | https://wawagardenbar-app-uat.up.railway.app/dashboard/orders/express/create-order | 307 (auth redirect — expected) |
| Menu page            | https://wawagardenbar-app-uat.up.railway.app/menu                                  | 200 OK                         |

## SAST results

- Semgrep: 0 new findings above baseline
- npm audit: 0 high/critical vulnerabilities

## Conclusion

No security issues identified. Price override is correctly gated to staff-only flows with server-side validation. Stock validation prevents overselling. All UAT checks pass.
