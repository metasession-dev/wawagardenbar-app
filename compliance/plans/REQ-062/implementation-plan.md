# REQ-062 — Customer trust polish (P0 #5 + P1 #6/#9/#11)

**Requirement ID:** REQ-062
**Risk Level:** LOW-MEDIUM
**GitHub Issue:** [#117 P0 #5, P1 #6, P1 #9, P1 #11](https://github.com/metasession-dev/wawagardenbar-app/issues/117)
**Date:** 2026-06-02

## Context

Four customer-facing trust gaps closed in one bundle:

- **P0 #5** — SMS order confirmations bypass the customer's `communicationPreferences.sms` consent flag. REQ-054 routed WhatsApp + email through `NotificationService.send` (which respects consent), but the SMS path in `communication-actions.ts:56` calls `SMSService.sendOrderConfirmationSMS` directly. Since `cp.sms` defaults to `false`, most customers receive SMS without ever opting in.
- **P1 #6** — Order-confirmation email only shows itemsList + total. No tax, service fee, tip, delivery fee, points earned, or payment method. Customers can't reconcile their charge against the email.
- **P1 #9** — "Reorder" button on order history is a stub (no `onClick`).
- **P1 #11** — `/contact` 404s. Footer link is commented out; the order-details page links to `/contact` and breaks.

## Acceptance criteria

1. **AC1 — P0 #5 SMS consent gate** — `sendOrderConfirmationAction` routes the SMS branch through `NotificationService.send` (using its `sms` closure parameter) instead of calling `SMSService.sendOrderConfirmationSMS` directly. The existing `shouldSendSMS(user)` check (`services/notification-service.ts:115-120`) gates on `cp.sms === true` (default false). **Behavioural change**: customers without explicit `sms: true` stop receiving SMS confirmations. They still get WhatsApp (when consent + template are in play) and email. Aligns with the WhatsApp consent posture REQ-054 introduced.

2. **AC2 — P1 #6 Receipt itemization** — extend `sendOrderConfirmationEmail` (`lib/email.ts:386`) signature:

   ```ts
   orderData: {
     orderNumber: string;
     orderType: string;
     items: { name: string; quantity: number; price: number }[];
     subtotal?: number;       // NEW
     tax?: number;            // NEW
     serviceFee?: number;     // NEW
     deliveryFee?: number;    // NEW
     tip?: number;            // NEW
     pointsEarned?: number;   // NEW
     paymentMethod?: string;  // NEW
     total: number;
     estimatedWaitTime: number;
   }
   ```

   Render a line-by-line breakdown table in the email body between the items list and the total: Subtotal → Service Fee → Delivery Fee → Tax → Tip → Total. Add "Payment Method: X" and "Points Earned: N" rows where present. All new fields are optional → missing values render as 0 (or row hidden if 0 and not strictly required). Backwards-compat: existing callers that don't pass the new fields still render correctly.

3. **AC3 — P1 #9 Reorder button** — convert the stub `<Button>Reorder</Button>` at `app/(customer)/orders/history/page.tsx:155-157` into a `<ReorderButton order={order} />` client component. Behaviour:
   - On click, `useCartStore().clearCart()` then `addItem()` for each item in the historical order (using `name`, `price`, `quantity`, `portionSize` from the order item).
   - Navigate to `/cart` after population (`router.push('/cart')`).
   - Shows a toast on success ("N items added to your cart").
   - **v1 naïve add** — no merge/conflict resolution for deleted menu items or price changes; the customer sees whatever the historical row says. v2 work is a future REQ.

4. **AC4 — P1 #11 `/contact` page** — create `app/(customer)/contact/page.tsx` server component:
   - Hours block: fetched from `SettingsService.getSettings().businessHours`; renders each day's open/close or "Closed".
   - Phone block: click-to-call (`tel:`) + click-to-WhatsApp link (`https://wa.me/<digits>`).
   - Email block: `mailto:` link.
   - `<SupportForm />` embedded at the bottom.
   - Uncomment the `/contact` link in `components/shared/navigation/footer.tsx:16`.

5. **AC5 — Tests** (~4 cases)
   - `sendOrderConfirmationAction` SMS path with `cp.sms === true` → SMS closure called via NotificationService.
   - Same with `cp.sms` falsy → SMS skipped.
   - `sendOrderConfirmationEmail` HTML body contains subtotal/serviceFee/paymentMethod when passed.
   - `<ReorderButton>` click → `clearCart` + `addItem` per item + navigation.

## Technical approach

### 1. `app/actions/communication/communication-actions.ts` (~20 LOC change)

Replace the direct SMS branch (lines 50-66) with a unified `NotificationService.send` call that includes both `whatsapp` and `sms` closures. The SMS closure wraps `SMSService.sendOrderConfirmationSMS` and returns `{ success, message }` per the service's existing return shape.

### 2. `lib/email.ts` (~30 LOC change)

Add the new optional fields to the type signature; render them in the HTML body. Plain-text fallback updated too.

### 3. `components/features/orders/reorder-button.tsx` (new, ~50 LOC)

Client component (`'use client'`). Imports cart-store + router. Shows a toast on success.

### 4. `app/(customer)/contact/page.tsx` (new, ~80 LOC)

Server component. Renders hours table + contact methods + `<SupportForm />`.

### 5. `components/shared/navigation/footer.tsx` (1-line change)

Uncomment the `/contact` entry.

## Tests

- `__tests__/actions/communication.consent-gate.test.ts` (new, 2 cases)
- `__tests__/lib/email-receipt.test.ts` (new, 1 case)
- `__tests__/components/reorder-button.test.tsx` (new, 1 case)

Mocking pattern: `vi.mock('@/services/notification-service')`, `vi.mock('@/services/sms-service')`, `vi.mock('@/services')` for OrderService.

## Dependencies

- REQ-054 — `NotificationService.send` with consent gating ✅
- REQ-061 — `SettingsService.getSettings()` ✅ (for contact page hours)
- Existing `SMSService.sendOrderConfirmationSMS` ✅
- Existing `<SupportForm />` ✅
- Existing cart-store `addItem`/`clearCart` ✅
- No new packages, no env vars, no DB migration

## Security considerations

### STRIDE

| Cat   | Risk                                             | Mitigation                                              |
| ----- | ------------------------------------------------ | ------------------------------------------------------- |
| **S** | None new                                         | n/a                                                     |
| **T** | Reorder button could push tampered-history items | Items come from server-loaded order doc, not URL params |
| **R** | None new                                         | n/a                                                     |
| **I** | `/contact` exposes phone/email/hours             | Already public elsewhere (footer, business cards)       |
| **D** | None                                             | Static page; small payload                              |
| **E** | None                                             | n/a                                                     |

### Behaviour change worth flagging

AC1 changes the default behaviour for SMS confirmations. Customers without explicit `sms: true` (the default) stop receiving SMS today. Honest framing in the release note; aligned with the WhatsApp consent gate REQ-054 established.

### Four-eyes attestation

- **Submitter:** Claude Code (AI tool) via project orchestrator.
- **Reviewer:** ostendo-io (solo-operator dual-actor interpretation per DevAudit-Installer #89 gap 10).

## Rollback

`git revert <merge-sha>`. SMS direct send returns; email reverts to minimal layout; reorder button becomes a stub; `/contact` 404s. No data loss.

## Test scope

| Gate                           | Expected                                 |
| ------------------------------ | ---------------------------------------- |
| `npx tsc --noEmit`             | exit 0                                   |
| `npx vitest run`               | +4 cases; full suite still green         |
| `npx eslint <changed>`         | 0 errors                                 |
| `semgrep --severity=ERROR`     | 0 new findings                           |
| `npm audit --audit-level=high` | 0 high/critical                          |
| E2E focused                    | n/a per `project_e2e_targeted_until_117` |

## Plan deviation log

(populated during implementation if anything diverges)
