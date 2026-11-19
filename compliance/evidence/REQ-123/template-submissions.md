# WhatsApp template submissions — REQ-123 (AC8)

Submitted 2026-11-19 through the WhatsApp MCP, with the operator's confirmation in the Claude Code session. Category UTILITY, language `en`. Review takes 24–48 hours; each environment switches the message on only after its own copy is APPROVED (until then the message is held as `held_template_pending`).

| Template             | UAT account (+44 7363 078509) | Production account (+234 814 825 3342) |
| -------------------- | ----------------------------- | -------------------------------------- |
| `order_confirmation` | 996406356861368 — PENDING     | 1865474801173632 — PENDING             |
| `receipt`            | 1129844363244578 — PENDING    | 1463445971891321 — PENDING             |
| `payment_link`       | 1512870187356343 — PENDING    | 1590861492794635 — PENDING             |

Receipt button URLs: UAT `https://wawagardenbar-uat.ostendo.io/orders/{{1}}`, production `https://app.wawagardenbar.com/orders/{{1}}`. `payment_link` button: `https://checkout.paystack.com/{{1}}` (Paystack access code).

Meta numbers header and body placeholders separately, so the `receipt` body uses `{{1}}` to `{{4}}` (items, total, paid via, points) and the header uses `{{1}}` (order number); the repo JSON and param builder follow this.

Status log (update with `whatsapp_biz_list_templates` before the UAT live round-trip and before production switch-on):

| Date       | UAT               | Production        |
| ---------- | ----------------- | ----------------- |
| 2026-11-19 | all three PENDING | all three PENDING |

Also found while listing: `support_reply` (REQ-118) is APPROVED on both accounts, closing the open item in the #953 tracker.
