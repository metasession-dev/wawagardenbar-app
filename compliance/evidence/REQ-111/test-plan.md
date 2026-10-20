# Test plan — REQ-111

Extracted from `compliance/plans/REQ-111/implementation-plan.md` §9. Scoped slice of #933 (Sections D+E only).

| Test file                                                      | Type        | ACs covered        | Has test?                                                                                                                                                     |
| -------------------------------------------------------------- | ----------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `__tests__/services/whatsapp-inbound-service.classify.test.ts` | Unit        | AC1, AC2           | Done — `detectAccountRecoverySignal` suite added (7 tests)                                                                                                    |
| `__tests__/services/whatsapp-inbound-service.routing.test.ts`  | Unit        | AC1, AC2, AC3, AC4 | Done — `account_recovery routing` suite added (6 tests)                                                                                                       |
| `__tests__/lib/whatsapp.inbound-integration.test.ts`           | Integration | N/A                | Not applicable — this file mocks `WhatsAppInboundService.handle` wholesale at the webhook-dispatch boundary; there is no state→template table in it to extend |
| `e2e/whatsapp-inbound-registration-templates.spec.ts`          | E2E         | AC1, AC4           | Pending (delegated to `e2e-test-engineer`)                                                                                                                    |

Every AC in `test-scope.md` has at least one planned/landed test file above.
