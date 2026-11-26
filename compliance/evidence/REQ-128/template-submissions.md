# WhatsApp template submissions — REQ-128 (AC7)

Recorded 2026-11-26 with the WhatsApp MCP. Business: wawagardenbar 1.

| Template           | Environment | Account (number)  | Status                                 | Notes                                                                                                                                                                 |
| ------------------ | ----------- | ----------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `refund_processed` | UAT         | +44 7363 078509   | PENDING (template id 1521772439886567) | submitted via API, text as in the plan                                                                                                                                |
| `refund_processed` | Production  | +234 814 825 3342 | NOT SUBMITTED                          | the API refuses (`SMB_ACCOUNT_NOT_ON_COEX`: small-business account not on Cloud API coexistence); operator submits it in WhatsApp Manager with the same name and body |
| `order_cancelled`  | UAT         | +44 7363 078509   | PENDING (template id 1441641191342013) | submitted via API on 2026-11-26 with the reworded body (see below); operator approved the rewording                                                                   |
| `order_cancelled`  | Production  | +234 814 825 3342 | NOT SUBMITTED                          | the API refuses (same `SMB_ACCOUNT_NOT_ON_COEX`); operator submits it in WhatsApp Manager with the same name and reworded body                                        |

## `order_cancelled` body — deviation from the issue text

Issue text: `Your Wawa Garden Bar order #{{1}} has been cancelled. {{2}}`. It ends with a placeholder, which Meta refuses. Submitted: `Your Wawa Garden Bar order #{{1}} has been cancelled. {{2}} Reply to this message if you need help.` Parameters are unchanged.

Until each environment's copy is APPROVED the feature saves its record and the customer message is logged `held_template_pending` (REQ-123).
