# Test plan — REQ-117

| Test file                                               | Type          | ACs                    |
| ------------------------------------------------------- | ------------- | ---------------------- |
| `__tests__/actions/auth/send-whatsapp-pin.test.ts`      | unit          | AC5, AC9               |
| `__tests__/actions/auth/verify-whatsapp-pin.test.ts`    | unit (update) | AC5, AC8               |
| `__tests__/lib/auth-utils.pin-hash.test.ts`             | unit          | AC5                    |
| `__tests__/lib/session.customer-ttl.test.ts`            | unit          | AC7                    |
| `__tests__/lib/scheduled-jobs.unverified-purge.test.ts` | unit          | AC6                    |
| `__tests__/api/whatsapp-webhook-no-session.test.ts`     | unit          | AC10                   |
| `__tests__/actions/auth/pin-intercept.test.ts`          | unit (update) | AC5                    |
| `e2e/critical/customer-signin-whatsapp-only.spec.ts`    | e2e           | AC1 to AC4, AC7 to AC9 |
| `e2e/customer/auth-pin-happy-path.spec.ts`              | e2e (update)  | AC1, AC4               |
| `e2e/smoke/customer-auth.spec.ts`                       | e2e (update)  | AC1                    |
| `e2e/customer/auth-guest-flow.spec.ts`                  | e2e (update)  | AC1                    |
| `e2e/helpers/customer-auth.ts`                          | e2e infra     | AC5                    |
