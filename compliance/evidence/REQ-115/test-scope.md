# Test scope — REQ-115

Risk class: HIGH · Issue #963 · Plan: `compliance/plans/REQ-115/implementation-plan.md`

| AC   | Summary                                                       | SRS-ID                    | Verification                    |
| ---- | ------------------------------------------------------------- | ------------------------- | ------------------------------- |
| AC1  | Welcome templates get correct params                          | REQ-WA-005                | unit + e2e (US-01.1, US-01.2)   |
| AC2  | `support_reply` header + 3 body params; `sendMessage` options | REQ-WA-003                | unit + e2e (US-01.3)            |
| AC3  | Incident summary resolves a real user or skips WhatsApp       | REQ-WA-002                | unit                            |
| AC4  | `actionTaken` reflects real outcome                           | REQ-WA-005                | unit (US-01.4)                  |
| AC5  | One canonical phone format; migration script                  | REQ-WA-008, REQ-WA-005    | unit + e2e (US-01.5)            |
| AC6  | Docs URLs fixed; template JSON added                          | REQ-WA-002                | contract test                   |
| AC7  | API version v23.0                                             | REQ-WA-001                | unit                            |
| AC8  | `.env.test` fixed; token rotated (operator)                   | REQ-WA-001                | inspection + operator evidence  |
| AC9  | SRS/RTM/docs updated                                          | REQ-WA-005/007            | inspection                      |
| AC10 | Shared e2e webhook helper                                     | n/a                       | e2e specs import it             |
| AC11 | Template contract test                                        | REQ-WA-002                | unit (US-01.6)                  |
| AC12 | Flake issues consolidated                                     | n/a                       | inspection (gh)                 |
| AC13 | Production WhatsApp status recorded (operator)                | n/a                       | operator evidence               |
| AC14 | `account_recovery` UAT round-trip (operator)                  | REQ-WA-007                | operator evidence               |
| AC15 | 6-digit PINs end to end                                       | REQ-AUTHC-001, REQ-WA-001 | unit + e2e (US-01.7) + live UAT |
| AC16 | Code-100 error mapping                                        | REQ-WA-001                | unit (US-01.8)                  |
