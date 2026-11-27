# WhatsApp template submissions — REQ-129 (AC7)

Recorded 2026-11-27. Business: wawagardenbar 1.

| Template                           | Environment | Account (number)  | Status                                 | Notes                                                                                                                               |
| ---------------------------------- | ----------- | ----------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `booking_received`                 | UAT         | +44 7363 078509   | PENDING (template id 1487426770006619) | submitted via API on 2026-11-27 after the operator confirmed the content                                                            |
| `booking_update`                   | UAT         | +44 7363 078509   | PENDING (template id 1760884265003760) | submitted via API on 2026-11-27 with the closing sentence; URL button `https://wawagardenbar-uat.ostendo.io/profile/bookings/{{1}}` |
| `booking_received`                 | Production  | +234 814 825 3342 | NOT SUBMITTED                          | the API refuses on this account (`SMB_ACCOUNT_NOT_ON_COEX`, see REQ-128); operator submits it in WhatsApp Manager                   |
| `booking_update`                   | Production  | +234 814 825 3342 | NOT SUBMITTED                          | same; URL button `https://app.wawagardenbar.com/profile/bookings/{{1}}`                                                             |
| `welcome_new_user`                 | UAT         | +44 7363 078509   | NOT SUBMITTED                          | to be submitted once `/book` is live on UAT (task 7); text and button in `docs/whatsapp-templates/`                                 |
| `welcome_back`                     | UAT         | +44 7363 078509   | NOT SUBMITTED                          | same                                                                                                                                |
| `welcome_new_user`, `welcome_back` | Production  | +234 814 825 3342 | NOT SUBMITTED                          | operator step after the release reaches production                                                                                  |

## `booking_update` body — deviation from the issue text

Issue text: `Hi {{1}}, an update on your booking {{2}}: {{3}}`. It ends with a placeholder, which Meta refuses (as with `order_cancelled`, REQ-128). Submitted: `Hi {{1}}, an update on your booking {{2}}: {{3}} Tap below to view your booking.`

Until each environment's copy is APPROVED the feature saves its record and the customer message is logged `held_template_pending` (REQ-123).
