# Test plan — REQ-115

| Test file                                                     | Type          | ACs       |
| ------------------------------------------------------------- | ------------- | --------- |
| `__tests__/lib/whatsapp-template-params.test.ts`              | unit          | AC1, AC2  |
| `__tests__/lib/whatsapp.send-message.test.ts`                 | unit          | AC2, AC7  |
| `__tests__/lib/whatsapp-error-mapping.test.ts`                | unit          | AC16      |
| `__tests__/lib/whatsapp-template-contract.test.ts`            | unit          | AC6, AC11 |
| `__tests__/lib/auth-utils.normalize-phone.test.ts`            | unit          | AC5       |
| `__tests__/services/whatsapp-inbound-service.routing.test.ts` | unit (update) | AC4, AC5  |
| `__tests__/lib/scheduled-jobs.incident-summary.test.ts`       | unit (update) | AC3       |
| `__tests__/actions/auth/send-whatsapp-pin.test.ts`            | unit          | AC15      |
| `__tests__/actions/auth/verify-whatsapp-pin.test.ts`          | unit          | AC15      |
| `e2e/critical/whatsapp-welcome-params.spec.ts`                | e2e           | AC1       |
| `e2e/critical/whatsapp-phone-normalisation.spec.ts`           | e2e           | AC5       |
| `e2e/support-ticket-staff-flow.spec.ts`                       | e2e (update)  | AC2       |
| `e2e/helpers/whatsapp-webhook.ts` (+ two existing specs)      | e2e infra     | AC10      |
