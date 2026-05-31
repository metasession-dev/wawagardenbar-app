# WhatsApp Cloud API Templates — Submission Reference

**Owner:** ostendo-io (operator)
**Backlog item:** [#117 WA-1](https://github.com/metasession-dev/wawagardenbar-app/issues/117)
**Goal:** Get the 7 transactional + marketing templates approved by Meta so the WhatsApp send paths in `lib/whatsapp.ts` + the upcoming `NotificationService.send()` (WA-2) actually work in production.

This document is the **paste-into-Meta-Business-Manager reference**. Each section has the exact field values to enter when creating a Message Template at:

> [business.facebook.com/wa/manage/message-templates](https://business.facebook.com/wa/manage/message-templates)

Submission usually takes 24–48 hours per template. Submit all 7 in one session — Meta processes them in parallel.

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

**Sent when:** a customer places an order (existing `WhatsAppService.sendOrderConfirmationWhatsApp`).

**Code mapping** (`lib/whatsapp.ts:322-330`):

```
params = [orderNumber, `₦${total.toLocaleString()}`, estimatedTime ? `${N} minutes` : 'Soon']
```

| Field    | Value                                                                                                                                    |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Name     | `order_confirmation`                                                                                                                     |
| Category | **UTILITY**                                                                                                                              |
| Language | `en`                                                                                                                                     |
| Header   | (none)                                                                                                                                   |
| Body     | `Order #{{1}} confirmed — thanks for ordering with Wawa Garden Bar! Total: {{2}}. Estimated time: {{3}}. We'll text again with updates.` |
| Footer   | `Wawa Garden Bar`                                                                                                                        |
| Buttons  | (none)                                                                                                                                   |

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

**Sent when:** order is paid (current code sends an email via `lib/email.ts:sendOrderConfirmationEmail`; WA-2 / WA-6 will rewire this to WhatsApp-first). The template needs to cover P1 #6's itemised receipt requirement.

**Code mapping** (will be set during WA-2's wrapper, expected shape):

```
params = [orderNumber, itemsList, total, paymentMethod, pointsEarned]
// itemsList: pre-formatted "2× Goat Stew, 1× Jollof Rice" string (kept under Meta's 1024-char body limit)
```

| Field    | Value                                                                                                                 |
| -------- | --------------------------------------------------------------------------------------------------------------------- |
| Name     | `receipt`                                                                                                             |
| Category | **UTILITY**                                                                                                           |
| Language | `en`                                                                                                                  |
| Header   | TEXT: `Receipt for Order #{{1}}`                                                                                      |
| Body     | `Items: {{2}}\n\nTotal: {{3}}\nPaid via: {{4}}\nPoints earned: {{5}}\n\nThanks for choosing Wawa Garden Bar!`         |
| Footer   | `Show this to staff for in-person service`                                                                            |
| Buttons  | URL: `View Full Receipt` → `https://wawagardenbar.com/orders/{{1}}` (set the variable in the URL field per Meta's UI) |

**Examples:**

| `{{1}}` | `{{2}}`                        | `{{3}}`  | `{{4}}`      | `{{5}}` |
| ------- | ------------------------------ | -------- | ------------ | ------- |
| `1234`  | `2× Goat Stew, 1× Jollof Rice` | `₦5,500` | `POS / Card` | `55`    |

**Note on URL button:** Meta requires the dynamic URL to be added with `{{1}}` as a placeholder. In the UI: Buttons → Add → URL → Type "Dynamic" → URL = `https://wawagardenbar.com/orders/` and add `{{1}}` (Meta auto-numbers it).

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
| Buttons  | URL: `Order Now` → `https://wawagardenbar.com/menu`                                                                                                     |

**Examples:**

| `{{1}}`  | `{{2}}` | `{{3}}` | `{{4}}`  |
| -------- | ------- | ------- | -------- |
| `Adaeze` | `100`   | `7`     | `₦1,000` |

---

## 6. `payment_link` — UTILITY

**Sent when:** a tab is held open and the customer is invoiced for the outstanding balance later, or a delivery order needs a payment link (WA-2 wires the send).

**Code mapping** (expected):

```
params = [customerFirstName, amount, paymentUrl, expiresInHours]
```

| Field    | Value                                                                                                                           |
| -------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Name     | `payment_link`                                                                                                                  |
| Category | **UTILITY**                                                                                                                     |
| Language | `en`                                                                                                                            |
| Header   | TEXT: `Payment requested`                                                                                                       |
| Body     | `Hi {{1}}, please complete your Wawa Garden Bar payment of {{2}}. The link expires in {{4}} hours — tap below to pay securely.` |
| Footer   | `Wawa Garden Bar`                                                                                                               |
| Buttons  | URL: `Pay Now` → `{{3}}` (Dynamic URL — set `{{3}}` as the URL placeholder)                                                     |

**Examples:**

| `{{1}}`  | `{{2}}`   | `{{3}}`                                 | `{{4}}` |
| -------- | --------- | --------------------------------------- | ------- |
| `Adaeze` | `₦12,500` | `https://paystack.com/pay/wgb-1234abcd` | `24`    |

---

## 7. `support_reply` — UTILITY

**Sent when:** staff respond to a support ticket via the dashboard (WA-3 incoming webhook closes the inbound loop; this is the outbound reply path).

**Code mapping** (expected):

```
params = [customerFirstName, ticketSubject, replyBody]
// replyBody trimmed to ~700 chars to leave room for surrounding template body
```

| Field    | Value                                                                                                                    |
| -------- | ------------------------------------------------------------------------------------------------------------------------ |
| Name     | `support_reply`                                                                                                          |
| Category | **UTILITY**                                                                                                              |
| Language | `en`                                                                                                                     |
| Header   | TEXT: `Re: {{2}}`                                                                                                        |
| Body     | `Hi {{1}}, here's an update from the Wawa Garden Bar team:\n\n{{3}}\n\nReply to this message and we'll get back to you.` |
| Footer   | (none)                                                                                                                   |
| Buttons  | (none — the user replies in-thread, handled by WA-3)                                                                     |

**Examples:**

| `{{1}}`  | `{{2}}`                 | `{{3}}`                                                              |
| -------- | ----------------------- | -------------------------------------------------------------------- |
| `Adaeze` | `Missing item in order` | `We've added a replacement to your account — pickup any time today.` |

---

## After submission — wiring checklist

Once Meta approves each template (you'll see them flip from `IN REVIEW` to `APPROVED` in the WABA template manager):

1. **Confirm the names match.** Double-check each approved template's name is byte-identical to the constants in `lib/whatsapp.ts` (`order_confirmation`, `order_status_update`, etc.) and to the planned `NotificationService.send()` keys for WA-2.

2. **Set the `WHATSAPP_PIN_TEMPLATE_NAME` env var** if the signup OTP template differs (it's overridable — see `lib/whatsapp.ts:209`).

3. **Update the WA bundle checklist on [#117](https://github.com/metasession-dev/wawagardenbar-app/issues/117)** — tick WA-1 once all 7 are approved.

4. **Trigger WA-2** — that's the next code item in the bundle (`NotificationService.send` wrapper). It will gate sends on the consent state REQ-053 just added (`whatsappTransactional` for UTILITY templates, `whatsappMarketing` for MARKETING).

---

## Rejection recovery

If Meta rejects a template:

- **"Wrong category"** — flip MARKETING ↔ UTILITY in the UI. Most common cause: classifying a transactional template as MARKETING or vice versa.
- **"Vague language"** — body too generic ("Update on your order"). Add the specific event ("Order #{{1}} is now ready for pickup").
- **"Promotional content in UTILITY"** — remove any sales language from UTILITY templates.
- **"Sample value mismatch"** — make sure example values are realistic (e.g. don't use `XXX` or `test`).

The pre-filled values above are tuned to pass on first review.
