# Security Evidence Summary — REQ-124

**Date:** 2026-11-22
**Risk class:** HIGH

| Control                                    | Result            | Evidence                                                                                                                                                                                          |
| ------------------------------------------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dependency audit                           | PASS (CI)         | No dependency was added or changed (Node `crypto` only); CI Quality Gates on PR #1068 passed                                                                                                      |
| SAST                                       | PASS (CI)         | `npx tsc --noEmit`: 0 errors in this REQ's files; `npm run lint`: 0 errors. `semgrep` is not installed locally; CI Quality Gates ran it on PR #1068 and passed                                    |
| Order page needs owner or token            | PASS              | `/orders/[orderId]`, `/cancel` and `/review` return 404 with no session and no valid token; unit `order-access` and e2e US-A4.4 (owner, other customer, no token, other order, expired, altered)    |
| Token cannot be forged, replayed or reused | PASS              | HMAC-SHA256 over `orderId.expiry`, `timingSafeEqual`, bound to one order, 30-day expiry in the signed payload; unit `order-tracking-token` (tampered, expired, other order, wrong secret)           |
| Fails closed without a secret              | PASS              | No token is created or accepted when `ORDER_TRACKING_SECRET` is unset or under 32 characters (unit). The operator reports it set on UAT and production (2026-11-22)                                |
| Socket room join authorised                | PASS              | `join-order` calls `authorizeOrderRoomJoin`; denied joins get `join-order-denied` and no room (unit `socket-join-order-auth`, e2e `order-status-broadcast`)                                        |
| Token not leaked by the page               | PASS              | Generic page title instead of the order number; `referrer: 'no-referrer'`; token never logged                                                                                                      |
| Status messages once, customer-origin only | PASS              | Atomic `findOneAndUpdate` with `$addToSet` on `notifiedStatuses` before send; consent gate and `NotificationLog` unchanged (unit `order-status-notifier`, e2e US-A4.1, US-A4.3)                    |
| Status change cannot be blocked by a send  | PASS              | `notifyOrderStatus` runs after the save inside try/catch (unit `order-status-notify-call-site`)                                                                                                    |
| Kitchen personal data                      | PASS              | Kitchen card shows a first name only; phone, email and full name removed (unit `kitchen-order-card`, e2e US-B1.5, US-B1.6)                                                                         |
| Delivery steps cannot be reached by other order types | PASS   | One transition table shared by the action and the UI (unit `order-status-transitions`, `order-status-transitions-action`)                                                                          |
| Secrets                                    | PASS              | `ORDER_TRACKING_SECRET` documented in `.env.*.example` and `docs/DISASTER-RECOVERY.md` (rotation); no secret committed. CI e2e gets a test-only secret through `e2e_env`                             |
| New dependencies / external calls          | PASS              | None (WhatsApp Cloud API is existing)                                                                                                                                                              |

## Data handling

Messages carry only the order number, a status phrase and the Track order link. The link token authorises one order only. The kitchen display now shows less personal data than before (first name only). `notifiedStatuses` lives with the order; `NotificationLog` retention is unchanged. No new processing purpose or recipient, so no ROPA change.

## Post-deploy controls

- Revert the merge to roll back. `notifiedStatuses` is additive; links already sent carry `?t=`, which old code ignores. Unsetting `ENABLE_WHATSAPP_NOTIFICATIONS` stops messages alone.
- Operator: `ORDER_TRACKING_SECRET` (32+ characters) must be set on every environment before release, or no tracking link is issued; rotating it revokes every outstanding link. Create `order_status_update_v2` on the production WhatsApp account and wait for approval before expecting production messages.
