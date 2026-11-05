# `support_reply` template status — REQ-118 (AC4)

Submitted on 2026-11-05 at the operator's explicit request, using the definition in `docs/whatsapp-templates/support_reply.json` (UTILITY, English, header `Support ticket {{1}}`, three body variables).

| Environment | WhatsApp number   | Template id      | Status on submission | Last checked |
| ----------- | ----------------- | ---------------- | -------------------- | ------------ |
| UAT         | +44 7363 078509   | 2288252361736523 | PENDING              | 2026-11-05   |
| Production  | +234 814 825 3342 | 1714267357083854 | PENDING              | 2026-11-05   |

Until a copy is APPROVED, staff replies outside the customer's 24-hour window fall through to the existing email path (REQ-WA-003). The live UAT round-trip is recorded here once the UAT copy is approved; production is switched on once its copy is approved.
