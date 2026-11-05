# Test scope — REQ-117

Risk class: HIGH · Issue #966 · Plan: `compliance/plans/REQ-117/implementation-plan.md` · Bundle: REQ-117 (primary) + REQ-118

| AC   | Summary                                                       | SRS-ID                       | Verification                  |
| ---- | ------------------------------------------------------------- | ---------------------------- | ----------------------------- |
| AC1  | Phone-only WhatsApp sign-in; SMS, email and guest removed     | REQ-AUTHC-001, REQ-AUTHC-003 | e2e (US-A1.2, US-A1.8) + unit |
| AC2  | Order-messages consent required; marketing unchecked          | REQ-AUTHC-004                | e2e (US-A1.3)                 |
| AC3  | Terminal message when the number is not on WhatsApp           | REQ-AUTHC-004                | e2e (US-A1.4)                 |
| AC4  | Checkout requires sign-in and keeps the cart                  | REQ-AUTHC-001                | e2e (US-A1.1, US-A1.2)        |
| AC5  | PIN hashed; 5 attempts; 5 requests per phone per hour; 10 min | REQ-AUTHC-002, REQ-AUTHC-005 | unit (US-A1.5)                |
| AC6  | Unverified users purged after 24 hours                        | REQ-AUTHC-005                | unit                          |
| AC7  | 90-day customer session, staff unchanged                      | REQ-AUTHC-006                | unit + e2e (US-A1.6)          |
| AC8  | Legacy accounts re-verify by WhatsApp                         | REQ-AUTHC-006                | unit + e2e                    |
| AC9  | WhatsApp unavailable: notice and Incident                     | REQ-AUTHC-007                | e2e (US-A1.7) + unit          |
| AC10 | Inbound WhatsApp never mints a session                        | REQ-AUTHC-006                | unit                          |
