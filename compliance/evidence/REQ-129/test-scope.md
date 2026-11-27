---
title: 'Test scope — REQ-129'
requirement_id: 'REQ-129'
risk_class: 'MEDIUM'
---

# Test scope — REQ-129

Extracted from `compliance/plans/REQ-129/implementation-plan.md` §1.

| AC  | Summary                                                                                                | SRS-ID                     | Verification         |
| --- | ------------------------------------------------------------------------------------------------------ | -------------------------- | -------------------- |
| AC1 | `/book` Table and Event forms, prefill, PIN gate, validation, 5 per phone per day                      | REQ-BOOK-001               | unit + e2e           |
| AC2 | Confirmation screen and `booking_received` message                                                     | REQ-BOOK-002               | unit + e2e           |
| AC3 | WhatsApp booking intent replies with the `/book` link                                                  | REQ-WA-020                 | unit + e2e           |
| AC4 | `/dashboard/bookings` list, calendar, detail, status, assignee, notes, replies, confirm/decline, audit | REQ-BOOK-003               | unit + e2e           |
| AC5 | Staff alert raised for each new booking, never failing the submission                                  | REQ-BOOK-003, REQ-DASH-003 | unit + e2e           |
| AC6 | Customer "My bookings" list and read-only detail, owner only                                           | REQ-BOOK-004               | unit + e2e           |
| AC7 | Templates `booking_received`, `booking_update` submitted to UAT; welcome templates after `/book` live  | REQ-WA-020                 | unit + evidence file |
