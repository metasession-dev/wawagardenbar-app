# Test plan — REQ-111

Extracted from `compliance/plans/REQ-111/implementation-plan.md` §9. Scoped slice of #933 (Sections D+E only).

| Test file                                                      | Type        | ACs covered                                         | Has test?                                           |
| -------------------------------------------------------------- | ----------- | --------------------------------------------------- | --------------------------------------------------- |
| `__tests__/services/whatsapp-inbound-service.classify.test.ts` | Unit        | AC1, AC2, AC3                                       | Pending (Phase 2)                                   |
| `__tests__/services/whatsapp-inbound-service.routing.test.ts`  | Unit        | AC1, AC3                                            | Pending (Phase 2)                                   |
| `__tests__/lib/whatsapp.inbound-integration.test.ts`           | Integration | AC1 (state→template table extension, if applicable) | Pending (Phase 2)                                   |
| `e2e/whatsapp-inbound-registration-templates.spec.ts`          | E2E         | AC1, AC4                                            | Pending (Phase 2, delegated to `e2e-test-engineer`) |

Every AC in `test-scope.md` has at least one planned test file above.
