# WhatsApp template submissions — REQ-124 (AC6)

Template `order_status_update_v2`, UTILITY, language `en`. Body: `Your Wawa Garden Bar order #{{1}} is {{2}}. Tap below to track it.` Button: URL "Track order" with a dynamic suffix `{{1}}` that carries `<order id>?t=<token>`.

The issue text ended the body with `{{2}}.`; the template API refuses a body that ends in a placeholder, so the closing sentence was added (operator decision, 2026-11-21). The old `order_status_update` template is left untouched.

| Environment | Messaging Account | URL base                              | Template id        | Status                                                  |
| ----------- | ----------------- | ------------------------------------- | ------------------ | ------------------------------------------------------- |
| UAT         | 2002247870450636  | `https://wawagardenbar-uat.ostendo.io` | 2960653154320082   | PENDING (submitted 2026-11-21 through the WhatsApp MCP) |
| Production  | 1761052801686956  | `https://app.wawagardenbar.com`        | pending            | To be created by the operator in WhatsApp Manager: the account is not on Cloud API coexistence, so the API refuses (`SMB_ACCOUNT_NOT_ON_COEX`) |

Status log (update with `whatsapp_biz_list_templates` before the UAT live round-trip and before production switch-on):

| Date       | UAT     | Production                      |
| ---------- | ------- | ------------------------------- |
| 2026-11-21 | PENDING | not yet submitted (operator)    |
