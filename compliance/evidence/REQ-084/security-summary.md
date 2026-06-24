# Security Summary — REQ-084

## Requirement

Separate customer and admin checkout paths; extend Express Create Order to support pickup/delivery.

## Risk Classification

**MEDIUM** — User-facing checkout flow, PII handling (customer phone/email/address), admin payment paths.

## Changes Overview

1. **Customer checkout stripped of admin logic** — `checkout-form.tsx` renamed to `customer-checkout-form.tsx`, admin props removed from `payment-method-step.tsx`.
2. **Price override validation removed from `createOrder`** — Admin price override validation and audit logging removed from the customer-facing `createOrder` server action.
3. **`expressCreateOrderAction` extended** — Now accepts `orderType`, `customerInfo`, `deliveryInfo`, `pickupTime`; uses `SettingsService.calculateOrderTotals` for correct fee/tax computation.
4. **AdminTabCheckoutForm** — New component for manual tab payment (cash/transfer/POS) replaces redirect to customer checkout.

## Security Analysis

### Authentication & Authorization

- `expressCreateOrderAction` retains `requireAdminSession()` guard — no change.
- Dashboard tab checkout page retains admin session check — no change.
- Customer checkout page is customer-facing; no admin logic remains.

### Data Protection (GDPR Art. 25)

- Customer PII (phone, email, delivery address) passed through to `OrderService.createOrder` via existing `guestPhone`, `guestEmail`, `deliveryDetails` fields.
- No new data storage; no new PII fields beyond what Order model already supports.
- No secrets or credentials in code changes.

### Payment Security

- Admin manual payment (`AdminTabCheckoutForm`) uses existing `completeTabPaymentManuallyAction` — no new payment paths created.
- Customer checkout only shows Monnify gateway options (card, transfer, USSD, phone).
- No price override logic in customer `createOrder` — reduces attack surface.

### RBAC

- Admin-only routes (`/dashboard/orders/tabs/[tabId]/checkout`) retain server-side admin session check.
- Customer checkout (`/checkout`) has no admin paths.

## Risk Register References

- **R-006**: Admin payment method leak in customer checkout — mitigated by removing admin props from `PaymentMethodStep`.
- **R-007**: Price override validation removal — completed; `createOrder` no longer contains `hasOverrides` or `order.price_override` audit logic.

## Test Coverage

- 8 unit tests covering: orderType=pickup, orderType=delivery, calculateOrderTotals usage, default orderType fallbacks, serviceFee exclusion, price override removal verification.
- 15 E2E tests covering AC1-AC12 (all pass): guest banner, guest checkout submission, Monnify-only options, express pickup/delivery fields, admin tab checkout, anonymous menu-to-checkout flow.
- `tsc --noEmit` clean (0 errors).

## Additional Fix (2026-06-24)

- **AC12**: Removed login gate from `MenuItemDetailModal.handleAddToCart` that was blocking anonymous users from adding items to cart on `/menu`. The `useAuth` check redirected to `/login` before the item could be added, contradicting AC1/AC2 guest checkout flow. E2E test AC12 verifies the full anonymous flow: browse menu → add to cart → checkout without login redirect.

## UAT Verification

Verified on UAT after Railway auto-deploy from `develop`:

- **Health check**: `GET /` → 200 (UAT live at `https://wawagardenbar-app-uat.up.railway.app/`)
- **Menu page**: `GET /menu` → 200
- **Customer checkout**: `GET /checkout` → 200 (page renders without admin logic)
- **Admin login**: `GET /admin/login` → 200
- **tsc --noEmit**: 0 errors
- **Unit tests**: 8/8 pass
- **E2E Regression (CI run 28114473831)**: 263 passed, 12 skipped, 0 failed
- **CI Pipeline Quality Gates (CI run 28108123540)**: 181 passed, 0 failed
- **Compliance Validation (CI run 28114473744)**: 0 errors, 0 warnings (commit conventions pass)
- **SAST (Semgrep)**: 0 high/critical findings
- **Dependency Audit**: 0 high/critical vulnerabilities
