# WhatsApp Cloud API Templates — Submission Reference

**Owner:** ostendo-io (operator)
**Backlog item:** [#117 WA-1](https://github.com/metasession-dev/wawagardenbar-app/issues/117)
**Goal:** Get the 7 transactional + marketing templates approved by Meta so the WhatsApp send paths in `lib/whatsapp.ts` + the upcoming `NotificationService.send()` (WA-2) actually work in production.

This document is the **paste-into-Meta-Business-Manager reference**. Each section has the exact field values to enter when creating a Message Template at:

> [business.facebook.com/wa/manage/message-templates](https://business.facebook.com/wa/manage/message-templates)

Submission usually takes 24–48 hours per template. Submit all 12 in one session — Meta processes them in parallel.

---

## Source of truth and environments

- The machine-readable definition of each template is `docs/whatsapp-templates/<name>.json` (name, category, header, body, footer, buttons, example values and the parameter builder in `lib/whatsapp-template-params.ts`). This document is the human-readable companion. `__tests__/lib/whatsapp-template-contract.test.ts` fails if a builder, a JSON file and `TEMPLATE_CATEGORIES` disagree.
- Templates belong to a WhatsApp Business Account, not an app, so **every template is submitted twice** with the same name and body: to the UAT account (WGB DEV, URL buttons use `https://wawagardenbar-uat.ostendo.io`) and to the production account (WGB, URL buttons use `https://app.wawagardenbar.com`). The URLs in this document are the production ones; never use the apex `wawagardenbar.com`, which does not resolve.
- `welcome_new_user` and `welcome_back` are held until the `/book` page ships (WA-13).

---

## Conversation architecture (Option A — WhatsApp triggers, browser completes)

The strategic frame for this doc: **templates aren't a script the bar reads to every customer.** They're canned messages WA-3's webhook handler picks from based on user state.

### Customer state → response (WA-3 routing logic)

| Customer state on inbound message                      | What the handler does                               | Template used?               |
| ------------------------------------------------------ | --------------------------------------------------- | ---------------------------- |
| Unknown phone, no User in DB                           | Send welcome with order / event-booking / chat CTAs | `welcome_new_user` ✅        |
| User exists, `phoneVerified: false` (abandoned signup) | Same welcome — implicit prompt to re-engage         | `welcome_new_user` ✅        |
| Known active user, recent `lastLoginAt`                | **Free-form reply** (staff / bot)                   | **None** — no template fires |
| Known dormant user (>30d silent)                       | Welcome-back nudge                                  | `welcome_back` ✅            |
| Phone-mismatch (number not on customer's account)      | Recovery prompt                                     | `account_recovery` ✅        |

### Why "first reply is value-first, not signup-first"

Forcing signup at first message tanks conversion. The bar can take orders, show the menu, accept event-booking enquiries, even handle support — all without signup. Signup happens **just-in-time** at checkout (REQ-053's PIN flow), when the customer commits to delivering somewhere or saving a card.

### The Meta 24-hour customer-service window

Once a customer messages the bar, Meta opens a **24-hour window** in which the bar can reply with free-form messages (no template required). Outside the window, only approved templates can be sent. This means:

- **Most returning-customer conversations never touch a template.** Staff or bot replies are plain text within the 24h window.
- **Templates are for first contact + outside-window re-engagement** (e.g. abandoned-cart, "we miss you" after 60d).
- **Marketing templates** (`reward_earned`, `reward_expiring_soon`) require the `whatsappMarketing` consent REQ-053 gates on.

### Net templates after this doc

- 4 reused from existing code (`order_confirmation`, `order_status_update`) and required for upcoming WA-2 / WA-6 work (`receipt`, `support_reply`).
- 2 marketing rewards (`reward_earned`, `reward_expiring_soon`).
- 3 Paystack (`payment_link`, `payment_confirmation`, `bank_transfer_details`).
- 3 signup / inbound routing (`welcome_new_user`, `welcome_back`, `account_recovery`).
- 1 internal staff alert (`staff_alert`, WA-12).
- 1 already approved (`verification_pin`).

**= 13 templates to submit + 1 already approved = 14 active.**

---

## Pre-flight checklist

Before opening the template UI:

- [ ] Confirm the bar's WhatsApp Business Account is linked in **Business Manager → WhatsApp Accounts**.
- [ ] Confirm the phone number associated with `WHATSAPP_PHONE_NUMBER_ID` (env var) is verified for outbound messaging.
- [ ] Confirm your Meta user has **WhatsApp message templates** management permission on the WABA.
- [ ] Keep this doc open in a second tab while filling each template.

---

## Submission semantics

| Field             | What Meta wants                                                                                                            |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Name**          | snake_case, must **exactly** match the `templateName` constant used in `lib/whatsapp.ts`. Copy the values from this doc.   |
| **Category**      | UTILITY (transactional), MARKETING (promotional), or AUTHENTICATION (OTP). Wrong category gets rejected. Pre-filled below. |
| **Language**      | `en` (Meta accepts `en` as a catch-all for English markets including NG).                                                  |
| **Header**        | Optional. We use TEXT headers where they help orient the message; omit otherwise.                                          |
| **Body**          | Required. Variables are `{{1}}`, `{{2}}`, etc. — they must appear in numeric order.                                        |
| **Footer**        | Optional. Up to 60 chars. We use a short brand sign-off on most.                                                           |
| **Buttons**       | Optional. Use URL or quick-reply where it helps the user act.                                                              |
| **Sample values** | Meta requires example values for reviewer eyes. Use the **Examples** column from each template.                            |

---

## 1. `order_confirmation` — UTILITY

**Sent when:** Paystack confirms payment of a customer order (REQ-123: `OrderService.markOrderPaid`, first time only), followed by `receipt`. Submitted 2026-11-19 to the UAT and production accounts (ids in `compliance/evidence/REQ-123/template-submissions.md`).

**Code mapping** (`lib/whatsapp.ts:322-330`):

```
params = [orderNumber, `₦${total.toLocaleString()}`, estimatedTime ? `${N} minutes` : 'Soon']
```

| Field    | Value                                                                                                                                     |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Name     | `order_confirmation`                                                                                                                      |
| Category | **UTILITY**                                                                                                                               |
| Language | `en`                                                                                                                                      |
| Header   | (none)                                                                                                                                    |
| Body     | `Order #{{1}} confirmed — thanks for ordering with Wawa Garden Bar! Total: {{2}}. Estimated time: {{3}}. We'll message you with updates.` |
| Footer   | (none)                                                                                                                                    |
| Buttons  | (none)                                                                                                                                    |

**Examples** (paste into Meta's "Add sample" fields):

| `{{1}}` | `{{2}}`  | `{{3}}`      |
| ------- | -------- | ------------ |
| `1234`  | `₦5,500` | `25 minutes` |

---

## 2. `order_status_update` — UTILITY

**Sent when:** order state changes (existing `WhatsAppService.sendOrderStatusWhatsApp`).

**Code mapping** (`lib/whatsapp.ts:340-352`):

```
params = [orderNumber, statusText]
// statusText ∈ {'being prepared', 'ready for pickup', 'out for delivery', 'delivered', 'cancelled'}
```

| Field    | Value                                                    |
| -------- | -------------------------------------------------------- |
| Name     | `order_status_update`                                    |
| Category | **UTILITY**                                              |
| Language | `en`                                                     |
| Header   | (none)                                                   |
| Body     | `Your Wawa Garden Bar order #{{1}} is now {{2}}.`        |
| Footer   | (none)                                                   |
| Buttons  | (none — the body is short enough that buttons add noise) |

**Examples:**

| `{{1}}` | `{{2}}`            |
| ------- | ------------------ |
| `1234`  | `ready for pickup` |

---

## 3. `receipt` — UTILITY

**Sent when:** Paystack confirms payment of a customer order (REQ-123: `OrderService.markOrderPaid`, after `order_confirmation`). Submitted 2026-11-19 to the UAT and production accounts (ids in `compliance/evidence/REQ-123/template-submissions.md`).

**Code mapping** (`receiptParams` in `lib/whatsapp-template-params.ts`):

```
header = [orderNumber]
body   = [itemsList, total, paymentMethod, pointsEarned]
button = [orderNumber]   // the URL button's own {{1}}
// itemsList: "2× Goat Stew, 1× Jollof Rice" (kept under Meta's 1024-char body limit)
```

Meta numbers header and body placeholders separately, so the body starts again at `{{1}}`.

| Field    | Value                                                                                                                                         |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Name     | `receipt`                                                                                                                                     |
| Category | **UTILITY**                                                                                                                                   |
| Language | `en`                                                                                                                                          |
| Header   | TEXT: `Receipt for Order #{{1}}`                                                                                                              |
| Body     | `Items: {{1}}\n\nTotal: {{2}}\nPaid via: {{3}}\nPoints earned: {{4}}\n\nThanks for choosing Wawa Garden Bar!`                                 |
| Footer   | (none)                                                                                                                                        |
| Buttons  | URL: `View receipt` → `<base>/orders/{{1}}` (dynamic; UAT `https://wawagardenbar-uat.ostendo.io`, production `https://app.wawagardenbar.com`) |

**Examples:**

| Header `{{1}}` | Body `{{1}}`                   | `{{2}}`  | `{{3}}` | `{{4}}` | Button `{{1}}` |
| -------------- | ------------------------------ | -------- | ------- | ------- | -------------- |
| `1234`         | `2× Goat Stew, 1× Jollof Rice` | `₦5,500` | `Card`  | `55`    | `1234`         |

---

## 4. `reward_earned` — MARKETING

**Sent when:** a customer's loyalty points balance increases (existing rewards system already fires the trigger; WA-2 wires the send).

**Code mapping** (expected):

```
params = [customerFirstName, pointsEarned, newBalance, naireEquivalent]
```

| Field    | Value                                                                                                                                                     |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name     | `reward_earned`                                                                                                                                           |
| Category | **MARKETING**                                                                                                                                             |
| Language | `en`                                                                                                                                                      |
| Header   | TEXT: `You earned points! 🎉`                                                                                                                             |
| Body     | `Hi {{1}}, thanks for your latest order — you just earned {{2}} loyalty points. Your new balance is {{3}} points (≈ {{4}}). Use them at your next visit!` |
| Footer   | `Wawa Garden Bar Rewards`                                                                                                                                 |
| Buttons  | Quick reply: `Check Balance` (handled by WA-3 incoming webhook later)                                                                                     |

**Examples:**

| `{{1}}`  | `{{2}}` | `{{3}}` | `{{4}}`  |
| -------- | ------- | ------- | -------- |
| `Adaeze` | `55`    | `420`   | `₦4,200` |

---

## 5. `reward_expiring_soon` — MARKETING

**Sent when:** the reward-expiry cron (REQ-048, `lib/scheduled-jobs.ts`) finds points within N days of expiring.

**Code mapping** (expected):

```
params = [customerFirstName, expiringPoints, daysRemaining, naireEquivalent]
```

| Field    | Value                                                                                                                                                   |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name     | `reward_expiring_soon`                                                                                                                                  |
| Category | **MARKETING**                                                                                                                                           |
| Language | `en`                                                                                                                                                    |
| Header   | TEXT: `Don't lose your points ⏰`                                                                                                                       |
| Body     | `Hi {{1}}, {{2}} of your loyalty points (worth {{4}}) expire in {{3}} days. Visit Wawa Garden Bar or order online to redeem them — every plate counts.` |
| Footer   | `Wawa Garden Bar Rewards`                                                                                                                               |
| Buttons  | URL: `Order Now` → `https://app.wawagardenbar.com/menu`                                                                                                 |

**Examples:**

| `{{1}}`  | `{{2}}` | `{{3}}` | `{{4}}`  |
| -------- | ------- | ------- | -------- |
| `Adaeze` | `100`   | `7`     | `₦1,000` |

---

## 6. `payment_link` — UTILITY

**Sent when:** a customer order is still unpaid 5 minutes after checkout (REQ-123: `runPaymentLinkJob`, once per order, claimed on `paymentLinkSentAt`). Submitted 2026-11-19 to the UAT and production accounts (ids in `compliance/evidence/REQ-123/template-submissions.md`).

**Code mapping** (`paymentLinkParams` in `lib/whatsapp-template-params.ts`):

```
body   = [customerFirstName, amount, minutesUntilExpiry]
button = [paystackAccessCode]   // the URL button's own {{1}}
```

| Field    | Value                                                                                                                             |
| -------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Name     | `payment_link`                                                                                                                    |
| Category | **UTILITY**                                                                                                                       |
| Language | `en`                                                                                                                              |
| Header   | (none)                                                                                                                            |
| Body     | `Hi {{1}}, please complete your Wawa Garden Bar payment of {{2}}. The link expires in {{3}} minutes — tap below to pay securely.` |
| Footer   | (none)                                                                                                                            |
| Buttons  | URL: `Pay now` → `https://checkout.paystack.com/{{1}}` (dynamic: the Paystack access code)                                        |

**Examples:**

| `{{1}}`  | `{{2}}`   | `{{3}}` | Button `{{1}}` |
| -------- | --------- | ------- | -------------- |
| `Adaeze` | `₦12,500` | `25`    | `0peioxfhpn`   |

---

## 7. `support_reply` — UTILITY

**Sent when:** staff respond to a support ticket via the dashboard (WA-3 incoming webhook closes the inbound loop; this is the outbound reply path).

**Code mapping** (expected):

```
header = [ticketNumber]
body   = [customerFirstName, ticketSubject, replyBody]
// replyBody trimmed to ~700 chars to leave room for surrounding template body
// (builder: supportReplyParams in lib/whatsapp-template-params.ts)
```

| Field    | Value                                                                                                                               |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Name     | `support_reply`                                                                                                                     |
| Category | **UTILITY**                                                                                                                         |
| Language | `en`                                                                                                                                |
| Header   | TEXT: `Support ticket {{1}}`                                                                                                        |
| Body     | `Hi {{1}}, here's an update from the Wawa Garden Bar team on "{{2}}":\n\n{{3}}\n\nReply to this message and we'll get back to you.` |
| Footer   | (none)                                                                                                                              |
| Buttons  | (none — the user replies in-thread, handled by WA-3)                                                                                |

**Examples:**

| `{{1}}`  | `{{2}}`                 | `{{3}}`                                                              |
| -------- | ----------------------- | -------------------------------------------------------------------- |
| `Adaeze` | `Missing item in order` | `We've added a replacement to your account — pickup any time today.` |

---

## 8. `payment_confirmation` — UTILITY

**Sent when:** a returning customer with a saved Paystack `authorization_code` is about to be direct-charged. The customer's `YES` reply (handled by WA-3's webhook) triggers the actual server-side charge. Without WA-3 this template can't complete the round-trip — but submitting now lets Meta start the 24–48h review clock.

**Code mapping** (expected, after WA-2 + WA-3 land):

```
params = [amount, cardLast4]
// Customer reply 'YES' → server calls Paystack /transaction/charge_authorization
//   with the stored authorization_code, then sends payment_received / receipt.
```

| Field    | Value                                                                                                                           |
| -------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Name     | `payment_confirmation`                                                                                                          |
| Category | **UTILITY**                                                                                                                     |
| Language | `en`                                                                                                                            |
| Header   | TEXT: `Confirm payment`                                                                                                         |
| Body     | `You're about to be charged {{1}} via your card ending in {{2}}. Reply YES to confirm or NO to cancel. Link expires in 1 hour.` |
| Footer   | `Wawa Garden Bar`                                                                                                               |
| Buttons  | Quick reply: `✅ YES, charge me` · Quick reply: `❌ NO, cancel`                                                                 |

**Examples:**

| `{{1}}`   | `{{2}}` |
| --------- | ------- |
| `₦12,500` | `1234`  |

---

## 9. `bank_transfer_details` — UTILITY

**Sent when:** customer chooses bank transfer at checkout. Paystack's **Virtual Accounts** product generates a one-off NUBAN; we forward the details via WhatsApp so the customer can pay from any bank app (no card needed).

**Prerequisite:** Paystack Virtual Accounts enabled on the bar's Paystack account. Confirm with Paystack support before submitting this template — they require KYC + a request via the dashboard.

**Code mapping** (expected):

```
params = [amount, accountNumber, accountName, bankName, expiresInHours]
// Generated server-side via Paystack /dedicated_account or /transaction/initialize
//   with channels: ['bank_transfer']. Webhook confirms inbound on virtual account.
```

| Field    | Value                                                                                                                                                                   |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name     | `bank_transfer_details`                                                                                                                                                 |
| Category | **UTILITY**                                                                                                                                                             |
| Language | `en`                                                                                                                                                                    |
| Header   | TEXT: `Bank transfer details`                                                                                                                                           |
| Body     | `Transfer {{1}} to the account below within {{5}} hours:\n\nAccount: {{2}}\nName: {{3}}\nBank: {{4}}\n\nYour order is confirmed automatically once we receive payment.` |
| Footer   | `Wawa Garden Bar`                                                                                                                                                       |
| Buttons  | Quick reply: `📋 Copy details`                                                                                                                                          |

**Examples:**

| `{{1}}`   | `{{2}}`      | `{{3}}`           | `{{4}}`     | `{{5}}` |
| --------- | ------------ | ----------------- | ----------- | ------- |
| `₦12,500` | `9019823745` | `Wawa Garden Bar` | `Wema Bank` | `2`     |

---

## 10. `welcome_new_user` — UTILITY

**Sent when:** WA-3's webhook receives an inbound message from a phone we don't recognise (no User in DB, or `phoneVerified: false`).

**Strategic note — value-first, not signup-first.** This is the _first reply_ a new customer sees. We don't push signup here — we show what they can do (browse menu, order, book an event). Signup happens **just-in-time** at checkout (where REQ-053's PIN flow handles it). Conversion is materially higher this way than forcing a sign-up gate at first message.

**Button strategy:** Meta caps templates at 3 buttons. Order → Book → Chat in that order: primary revenue first, secondary revenue (event hosting) second, human escape hatch third. The Chat button is a **Quick Reply** rather than a URL — tapping it sends a free-form message to the bar's WABA, opens Meta's 24-hour customer-service window, and lets staff respond in plain text without any template until the window closes. The button mainly carries **signalling value** ("you can reach humans here") that customers may not infer from a chat thread alone.

**Code mapping** (expected, set by WA-3 webhook handler):

```
params = [openTime, closeTime]
// e.g. ['11:00 AM', '11:00 PM'] — today's hours from system settings (h:mm a)
```

| Field    | Value                                                                                                                                                                                                   |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name     | `welcome_new_user`                                                                                                                                                                                      |
| Category | **UTILITY**                                                                                                                                                                                             |
| Language | `en`                                                                                                                                                                                                    |
| Header   | TEXT: `Welcome to Wawa Garden Bar 🌿`                                                                                                                                                                   |
| Body     | `Hi 👋 thanks for reaching out. We're a garden bar + kitchen serving food, drinks and good times. Place an order, book a private event, or chat with our team — we're here from {{1}} to {{2}}.`        |
| Footer   | `Wawa Garden Bar`                                                                                                                                                                                       |
| Buttons  | URL `🛒 Order Now` → `https://app.wawagardenbar.com/menu` · URL `🎉 Book an Event` (event/table booking page, ships in WA-13) → `https://app.wawagardenbar.com/book` · Quick reply `💬 Chat with Staff` |

**Examples:**

| `{{1}}`    | `{{2}}`    |
| ---------- | ---------- |
| `11:00 AM` | `11:00 PM` |

---

## 11. `welcome_back` — UTILITY

**Sent when:** WA-3's webhook receives a message from a known customer who's been dormant (>30 days `lastLoginAt`), OR as a proactive re-engagement outside the 24h window (e.g. "we've missed you" campaign).

**Same button strategy as `welcome_new_user`** — Order Now / Book an Event / Chat with Staff, in that order. Returning customers are already signed up, so no signup ask anywhere.

**Code mapping** (expected):

```
params = [customerFirstName]
// Address / saved card / order count could be tucked into a follow-up
//   free-form message within the 24h window opened by the template send.
```

| Field    | Value                                                                                                                                                                                                   |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name     | `welcome_back`                                                                                                                                                                                          |
| Category | **UTILITY**                                                                                                                                                                                             |
| Language | `en`                                                                                                                                                                                                    |
| Header   | TEXT: `Welcome back 👋`                                                                                                                                                                                 |
| Body     | `Hi {{1}}, we've missed you at Wawa Garden Bar. Place a quick order with your saved details, book your next celebration, or reach out to our team.`                                                     |
| Footer   | `Wawa Garden Bar`                                                                                                                                                                                       |
| Buttons  | URL `🛒 Order Now` → `https://app.wawagardenbar.com/menu` · URL `🎉 Book an Event` (event/table booking page, ships in WA-13) → `https://app.wawagardenbar.com/book` · Quick reply `💬 Chat with Staff` |

**Examples:**

| `{{1}}`  |
| -------- |
| `Adaeze` |

---

## 12. `account_recovery` — UTILITY

**Sent when:** WA-3's webhook receives a message from a phone that doesn't match the customer's account-on-file (e.g. they're texting from a borrowed phone, or they've switched numbers). The reply (`YES` or `NEW`) routes the customer to either merge the number or start fresh.

**Code mapping** (expected):

```
params = [originalPhoneLastFour]
// e.g. '4567' — the last 4 digits of the phone number on file
// Customer reply 'YES' / 'NEW' handled by WA-3's webhook.
```

| Field    | Value                                                                                                                                                                                                                     |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name     | `account_recovery`                                                                                                                                                                                                        |
| Category | **UTILITY**                                                                                                                                                                                                               |
| Language | `en`                                                                                                                                                                                                                      |
| Header   | TEXT: `New number detected`                                                                                                                                                                                               |
| Body     | `Hi, it looks like you're messaging us from a new number. Your existing Wawa Garden Bar account is registered to a phone ending in {{1}}. Reply YES to add this number to that account, or NEW to start a fresh account.` |
| Footer   | (none)                                                                                                                                                                                                                    |
| Buttons  | Quick reply: `✅ YES, link to existing` · Quick reply: `🆕 NEW account`                                                                                                                                                   |

**Examples:**

| `{{1}}` |
| ------- |
| `4567`  |

---

## 13. `staff_alert` — UTILITY

**Sent when:** a staff notification (a paid customer order, a support message, later a booking or refund request) has waited past its rule's WhatsApp delay unacknowledged (REQ-122, WA-12). Sent to on-shift staff with a verified alert number, then to the escalation roles. It goes to staff only, never to customers.

**Code mapping:**

```
body   = [label, reference, minutesWaiting]
button = [dashboardPath]   // the URL button's own {{1}}, e.g. 'bookings/<id>' or 'orders/<id>'
```

| Field    | Value                                                                                                        |
| -------- | ------------------------------------------------------------------------------------------------------------ |
| Name     | `staff_alert`                                                                                                |
| Category | **UTILITY**                                                                                                  |
| Language | `en`                                                                                                         |
| Header   | (none)                                                                                                       |
| Body     | `Wawa Garden Bar alert: {{1}} {{2}} has been waiting {{3}} minutes. Please open the dashboard to handle it.` |
| Footer   | (none)                                                                                                       |
| Buttons  | URL: `Open` → `<environment base URL>/dashboard/{{1}}` (UAT and production each use their own base URL)      |

**Examples:**

| `{{1}}`               | `{{2}}`   | `{{3}}` | Button `{{1}}` (URL path)           |
| --------------------- | --------- | ------- | ----------------------------------- |
| `New booking request` | `BK-0042` | `12`    | `bookings/665a1b2c3d4e5f6a7b8c9d0e` |

---

## 14. `order_status_update_v2` — UTILITY

**Sent when:** staff move a customer-origin order to confirmed, preparing, ready, out-for-delivery or delivered (REQ-124: `notifyOrderStatus`, once per status). Inside the customer's 24-hour window the same sentence goes as free-form text instead. It replaces `order_status_update`, which has no button and whose body Meta would not let us rewrite; the old template and key stay as they are.

**Code mapping** (`orderStatusUpdateV2Params` in `lib/whatsapp-template-params.ts`):

```
body   = [orderNumber, statusText]
button = [`<order id>?t=<tracking token>`]   // URL button's own {{1}}; token from lib/order-tracking-token.ts
// statusText ∈ {'confirmed', 'being prepared', 'ready for pickup', 'ready and on its way to your table', 'out for delivery', 'delivered'}
```

Meta rejects a body that ends in a placeholder, so the issue's text gained a closing sentence.

| Field    | Value                                                                                                                                              |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name     | `order_status_update_v2`                                                                                                                           |
| Category | **UTILITY**                                                                                                                                        |
| Language | `en`                                                                                                                                               |
| Header   | (none)                                                                                                                                             |
| Body     | `Your Wawa Garden Bar order #{{1}} is {{2}}. Tap below to track it.`                                                                               |
| Footer   | (none)                                                                                                                                             |
| Buttons  | URL: `Track order` → `<base>/orders/{{1}}` (dynamic; UAT `https://wawagardenbar-uat.ostendo.io`, production `https://app.wawagardenbar.com`)      |

**Examples:**

| Body `{{1}}` | `{{2}}`            | Button `{{1}}`            |
| ------------ | ------------------ | ------------------------- |
| `1234`       | `ready for pickup` | `65f0c0ffee?t=example`    |

---

## After submission — wiring checklist

Once Meta approves each template (you'll see them flip from `IN REVIEW` to `APPROVED` in the WABA template manager):

1. **Confirm the names match.** Double-check each approved template's name is byte-identical to the constants in `lib/whatsapp.ts` (`order_confirmation`, `order_status_update`, etc.) and to the planned `NotificationService.send()` keys for WA-2.

2. **Set the `WHATSAPP_PIN_TEMPLATE_NAME` env var** if the signup OTP template differs (it's overridable — see `lib/whatsapp.ts:209`).

3. **Update the WA bundle checklist on [#117](https://github.com/metasession-dev/wawagardenbar-app/issues/117)** — tick WA-1 once all 12 are approved.

4. **Trigger WA-2** — `NotificationService.send` wrapper. It will gate sends on the consent state REQ-053 just added (`whatsappTransactional` for UTILITY templates, `whatsappMarketing` for MARKETING).

5. **Confirm the booking page exists.** `welcome_new_user` + `welcome_back` link to `https://app.wawagardenbar.com/book`. Meta reviews button URLs with the template, so these two are **not submitted until `/book` is live** (WA-13, #975).

---

## Rejection recovery

If Meta rejects a template:

- **"Wrong category"** — flip MARKETING ↔ UTILITY in the UI. Most common cause: classifying a transactional template as MARKETING or vice versa.
- **"Vague language"** — body too generic ("Update on your order"). Add the specific event ("Order #{{1}} is now ready for pickup").
- **"Promotional content in UTILITY"** — remove any sales language from UTILITY templates.
- **"Sample value mismatch"** — make sure example values are realistic (e.g. don't use `XXX` or `test`).

The pre-filled values above are tuned to pass on first review.
