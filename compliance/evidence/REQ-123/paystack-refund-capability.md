# Paystack refund capability — REQ-123 (AC9)

Prerequisite check for WA-11 (customer cancellation and Paystack refunds, #973). This record says what is known from Paystack's public documentation and what only the account owner can confirm.

## From Paystack's public documentation (not account-specific)

| Capability               | Paystack interface                                                                                                  | Notes for WA-11                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Create a refund          | `POST https://api.paystack.co/refund` with the transaction reference (or id) and an optional amount in kobo         | Full and partial refunds are supported; no amount means a full refund. Uses the same secret key as init. |
| Fetch / list refunds     | `GET /refund/:reference`, `GET /refund`                                                                             | Poll fallback when a webhook is missed.                                                                  |
| Refund status events     | webhook events `refund.pending`, `refund.processing`, `refund.processed`, `refund.failed`                           | Delivered to the same webhook URL and signed the same way (HMAC-SHA512 over the raw body, REQ-PAY-007).  |
| Settlement of the refund | The refund is deducted from the merchant's Paystack balance and returned to the customer over several business days | A refund needs a sufficient balance; WA-11 must handle `failed`.                                         |

What this means for the code in REQ-123: the stable `paymentReference` and the stored Paystack `transactionReference` (the transaction id) on each paid order are exactly what the refund API needs, so WA-11 needs no new data from this REQ. The webhook route already ignores events other than `charge.success`; WA-11 adds the `refund.*` handling.

## Needs the account owner (operator) to confirm

The two points below depend on the merchant account and cannot be confirmed from the repository or the public docs. The operator confirms them in the Paystack dashboard (Settings, then Preferences and API Keys & Webhooks) for the UAT test account and the live account, and records the result below.

- [ ] Refunds are enabled for the live account (some accounts require a request to Paystack support).
- [ ] The webhook URL configured on the account receives refund events (no per-event subscription is needed; confirm the URL is `https://app.wawagardenbar.com/api/webhooks/paystack` for live and the UAT URL for the test account).
- [ ] A test refund succeeds against a UAT test transaction (optional but recommended before WA-11).

**Confirmed by:** <operator-name> **Date:** <YYYY-MM-DD> **Result:** REPLACE
