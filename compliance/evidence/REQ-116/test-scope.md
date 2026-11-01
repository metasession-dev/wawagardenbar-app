# Test scope — REQ-116

Risk class: HIGH · Issue #964 · Plan: `compliance/plans/REQ-116/implementation-plan.md`

| AC   | Summary                                                       | SRS-ID                 | Verification                         |
| ---- | ------------------------------------------------------------- | ---------------------- | ------------------------------------ |
| AC1  | Missing app secret: 503, nothing processed                    | REQ-WA-009             | unit + e2e (US-02.1)                 |
| AC2  | Bad or wrong-length signature: 403, raw-body HMAC, no crash   | REQ-WA-009             | unit + e2e (US-02.2)                 |
| AC3  | Verify token and signatures never logged                      | REQ-WA-009             | unit (log spy)                       |
| AC4  | Duplicate `wamid`: one welcome, one ticket, insert first      | REQ-WA-005             | unit + e2e (US-02.3)                 |
| AC5  | All entries and changes processed                             | REQ-WA-005             | unit + e2e (US-02.4)                 |
| AC6  | STOP marketing only; START restores marketing                 | REQ-WA-010, REQ-WA-006 | unit + e2e (US-02.5, US-02.6)        |
| AC7  | Per-phone rate limit (20 per 10 minutes)                      | REQ-WA-005             | unit (US-02.7)                       |
| AC8  | Bounded retry with `Incident` on final failure                | REQ-WA-005             | unit                                 |
| AC9  | `verification_pin` code in body and Copy-code button          | REQ-WA-001             | unit (exact payload) + contract test |
| AC10 | Live UAT PIN round-trip (operator)                            | REQ-WA-001             | operator evidence                    |
| AC11 | REQ-097 spec uses its own fixture item                        | n/a                    | e2e, 3 green runs                    |
| AC12 | Critical tier green at default workers; shared state isolated | n/a                    | tier run, 3 green runs               |
| AC13 | No silent self-skips in cost-snapshot and partial-payments    | n/a                    | tier run                             |
| AC14 | Staff-pot start date deterministic under sharded regression   | REQ-015                | e2e, 3 green sharded runs            |
| AC15 | `csr-uat` and REQ-115 AC2 tests tagged; tag check passes      | n/a                    | `scripts/check-req-title-tags.sh`    |
