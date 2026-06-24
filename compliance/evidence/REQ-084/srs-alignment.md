---
req: REQ-084
generated_by: requirements-aligner
generated_at: 2026-06-24T11:56:00Z
---

# SRS alignment — REQ-084

## ACs traced

| AC   | SRS item                          | Action this cycle              | Notes                                                                                                                   |
| ---- | --------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| AC1  | REQ-CHECKOUT-010 (new — proposed) | added (new — see Phase 1 stub) | Guest checkout banner UX — "Continue as Guest" visible when unauthenticated                                             |
| AC2  | REQ-AUTHC-003 (existing)          | unchanged                      | Guest checkout (no PIN) — exact match                                                                                   |
| AC3  | REQ-CHECKOUT-001 (existing)       | updated (drift)                | Source references `checkout-form.tsx` → renamed to `customer-checkout-form.tsx`; admin options removed                  |
| AC4  | REQ-ORDMGT-009 (new — proposed)   | added (new — see Phase 1 stub) | Express order type selector with conditional pickup/delivery fields                                                     |
| AC5  | REQ-ORDMGT-009 (new — proposed)   | added (new — see Phase 1 stub) | Same as AC4 — delivery address fields                                                                                   |
| AC6  | REQ-ORDMGT-010 (new — proposed)   | added (new — see Phase 1 stub) | Express order totals via SettingsService.calculateOrderTotals                                                           |
| AC7  | REQ-TABMGT-003 (existing)         | updated (drift)                | Source references `admin-pay-tab-dialog` → now `AdminTabCheckoutForm` full page; no Monnify redirect                    |
| AC8  | REQ-ORDMGT-004 (existing)         | updated (drift)                | Price override removed from `createOrder` (`payment-actions.ts:129`); admin concern moves to `expressCreateOrderAction` |
| AC9  | REQ-CHECKOUT-001 (existing)       | updated (drift)                | Same as AC3 — no `isAdmin` branching in customer checkout                                                               |
| AC10 | REQ-ORDMGT-009 (new — proposed)   | added (new — see Phase 1 stub) | Same as AC4 — customer info fields for pickup/delivery                                                                  |
| AC11 | REQ-TABMGT-003 (existing)         | unchanged                      | Admin pay tab with method + independent tip — exact match for manual close                                              |
| AC12 | REQ-CHECKOUT-010 (new — proposed) | added (new — see Phase 1 stub) | Anonymous user can add items to cart and reach checkout without login redirect                                          |

## SRS items status summary

- **3 existing items unchanged** — REQ-AUTHC-003, REQ-TABMGT-003 (AC11), REQ-CHECKOUT-001 (traced but stale)
- **3 existing items flagged stale** — REQ-CHECKOUT-001, REQ-TABMGT-003, REQ-ORDMGT-004 (source files renamed/removed)
- **3 new SRS-ID stubs proposed** — REQ-CHECKOUT-010, REQ-ORDMGT-009, REQ-ORDMGT-010

## Stale items detail

| SRS item         | What drifted                                                                                                 | Action needed                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ |
| REQ-CHECKOUT-001 | Source file `checkout-form.tsx` renamed to `customer-checkout-form.tsx`; admin options removed               | Update SRS source reference + description        |
| REQ-TABMGT-003   | Source `admin-pay-tab-dialog` replaced by `AdminTabCheckoutForm` full page; no Monnify redirect              | Update SRS source reference + description        |
| REQ-ORDMGT-004   | Price override logic removed from `createOrder` in `payment-actions.ts`; moved to `expressCreateOrderAction` | Update SRS to reflect removal from customer path |

## Operator sign-off

I have reviewed the AC-to-SRS-item traces above and confirm:

- [ ] Each AC has a defensible SRS item.
- [ ] New SRS items have been edited from stubs to canonical Given/When/Then prose.
- [ ] Stale items have been brought current.

**Reviewer:** TBD
**Date:** 2026-06-24
