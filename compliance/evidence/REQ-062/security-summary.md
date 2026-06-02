# REQ-062 — Security summary

**Requirement ID:** REQ-062
**Risk class:** LOW-MEDIUM
**Surface:** `app/actions/communication/communication-actions.ts` (SMS branch routed through NotificationService); `lib/email.ts` (sendOrderConfirmationEmail extended with itemization fields); new `components/features/orders/reorder-button.tsx` (client component); new `app/(customer)/contact/page.tsx` (server component); footer nav link uncommented.

## STRIDE assessment

| Category                | Risk introduced?           | Rationale / mitigation                                                                                                                                                                                                                                                                            |
| ----------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **S** — Spoofing        | No                         | No new auth surface. ReorderButton + contact page are customer-trust gates only.                                                                                                                                                                                                                  |
| **T** — Tampering       | Reduces risk               | AC1 closes the SMS bypass: customers can no longer be SMS'd against their explicit `cp.sms === false` preference. ReorderButton uses server-loaded order data (the order doc is loaded via the customer's session-scoped query), not URL params — tampered URLs can't inject items into the cart. |
| **R** — Repudiation     | No new repudiation surface | Existing audit log captures `user.update` and order events. Email/SMS/WhatsApp sends still log via NotificationService's `recordAttempt` (REQ-055) — REQ-062 doesn't change the audit trail.                                                                                                      |
| **I** — Info disclosure | Low                        | `/contact` exposes hours + phone + email — all already public elsewhere (footer link references, business cards, public-facing settings endpoint). The new itemization in the email exposes the customer's own payment method + points earned, which the customer already has.                    |
| **D** — DoS             | None new                   | Static page; pre-existing SupportForm; cart-store actions are local Zustand mutations.                                                                                                                                                                                                            |
| **E** — Elevation       | None                       | n/a                                                                                                                                                                                                                                                                                               |

## Threat model — SMS consent + reorder + contact

1. **Tampered client bypasses the consent gate** — the SMS gate now lives in `NotificationService.shouldSendSMS()` (server-side). Tampered client UI can't bypass; the consent check happens before SMSService is invoked.

2. **Tampered URL or order data feeds wrong items to cart via ReorderButton** — the component receives the order via prop from a server-rendered page (`OrderService.getOrdersByUserId(session.userId)`). The query is session-scoped — the customer can only Reorder their own orders. Tampered URLs to `/orders/history` don't bypass this; the server resolves orders from the session, not from query params.

3. **ReorderButton adds an item from a deleted menu** — v1 naïve add doesn't re-resolve menu state. The customer sees the historical item in their cart with historical price. At checkout, the server-side validation (existing) catches the deleted item and either flags it or adjusts price. **Edge case acknowledged:** if the customer proceeds without noticing, they may try to order an unavailable item. Mitigation: the existing checkout flow validates inventory before order submission.

4. **`/contact` page exposes WhatsApp number** — already public. The wa.me link is `https://wa.me/<digits>` per Meta's standard; no tracking parameters added.

5. **SupportForm dialog uses existing component** — no new validation surface; REQ-062 just embeds it on `/contact` in addition to its existing trigger paths.

6. **Customer-side fail-open on SMS when `getUser` returns null** — `NotificationService.shouldSendSMS(null)` returns `true` for the guest path (no user → no consent state to read → caller's closure decides). The action's `wantSms` gate (admin's notification settings) is the only block in that path. This matches REQ-054's pre-existing behaviour; REQ-062 doesn't change it. Guests can still receive SMS (via the explicit closure-presence gate).

## Behaviour change — load-bearing fact

**Customers without explicit `cp.sms === true` stop receiving SMS order confirmations after REQ-062 ships.** They still get WhatsApp (when consent + template approved) and email. This is the intended fix for the P0 #5 consent gap and aligns with the WhatsApp consent posture REQ-054 introduced. Customers who genuinely want SMS need to opt in via profile preferences. Documented in the release ticket and PR body.

## Privacy / regulatory

- No new PII collected. Itemized email content is the customer's own order data.
- The `/contact` page surfaces hours/phone/email that are already public.
- SMS consent change aligns with applicable privacy expectations (recipients can opt-in/out).

## Static analysis

`semgrep scan --severity=ERROR app/actions/communication/communication-actions.ts lib/email.ts components/features/orders/reorder-button.tsx app/(customer)/contact/page.tsx` → 0 findings.

## Dependency audit

`npm audit --audit-level=high` → 0 high / 0 critical. No new packages introduced.

## Four-eyes attestation

- **Submitter:** Claude Code (AI tool) via project orchestrator.
- **Reviewer:** ostendo-io (solo-operator dual-actor interpretation per DevAudit-Installer issue #89 gap 10).

## Out of scope

- PDF receipt download (P1 #7) → separate REQ.
- WhatsApp `receipt` template with the same itemization → blocked by WA-1 at Meta.
- Reorder smart-merge (deleted menu items, customisation conflicts, price changes) → v2 work.
- E2E coverage → per `project_e2e_targeted_until_117`, deferred to post-#117 regression.
- Re-route admin SMS notifications through NotificationService → out of scope for this REQ (only customer order confirmations are affected).
