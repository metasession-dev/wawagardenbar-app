# WhatsApp template submissions — REQ-124 (AC6)

Template `order_status_update_v2`, UTILITY, language `en`. Body: `Your Wawa Garden Bar order #{{1}} is {{2}}. Tap below to track it.` Button: URL "Track order" with a dynamic suffix `{{1}}` that carries `<order id>?t=<token>`.

The issue text ended the body with `{{2}}.`; the template API refuses a body that ends in a placeholder, so the closing sentence was added (operator decision, 2026-11-21). The old `order_status_update` template is left untouched.

| Environment | Messaging Account | URL base                              | Template id        | Status                                                  |
| ----------- | ----------------- | ------------------------------------- | ------------------ | ------------------------------------------------------- |
| UAT         | 2002247870450636  | `https://wawagardenbar-uat.ostendo.io` | 2960653154320082   | PENDING (submitted 2026-11-21 through the WhatsApp MCP) |
| Production  | 1761052801686956  | `https://app.wawagardenbar.com`        | pending            | To be created by the operator in WhatsApp Manager. The API create call returned `SMB_ACCOUNT_NOT_ON_COEX` ("small-business WhatsApp account that is not on Cloud API coexistence") on 2026-11-22; the same account accepted API creates on 2026-11-19 (`order_confirmation`, `receipt`, `payment_link`), and why that changed is not established |

Status log (update with `whatsapp_biz_list_templates` before the UAT live round-trip and before production switch-on):

| Date       | UAT     | Production                      |
| ---------- | ------- | ------------------------------- |
| 2026-11-21 | PENDING | not yet submitted (operator)    |
| 2026-11-22 | PENDING (id 2960653154320082, no rejection reason) | not created: API refused (`SMB_ACCOUNT_NOT_ON_COEX`); operator creating it by hand. Account has 7 other APPROVED templates, no `order_status_update_v2` |
