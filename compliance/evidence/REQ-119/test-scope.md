# Test scope — REQ-119

Risk class: HIGH · Issue #965 · Plan: `compliance/plans/REQ-119/implementation-plan.md` · Solo release (no bundle)

| AC  | Summary                                                                              | SRS-ID        | Verification                                                  |
| --- | ------------------------------------------------------------------------------------ | ------------- | ------------------------------------------------------------- |
| AC1 | `roles[]` on staff and in the session; kitchen and manager exist; `[role]` fallback  | REQ-AUTHA-004 | unit + e2e (US-03.1)                                          |
| AC2 | Access is any-of over roles via helpers; no direct `session.role` comparison remains | REQ-AUTHA-004 | unit guard test (US-03.10) + e2e (US-03.1, US-03.6, US-03.12) |
| AC3 | Role checkboxes; super-admin-only admin grants; no self-edit; last super-admin guard | REQ-AUTHA-006 | e2e (US-03.2, US-03.8, US-03.9, US-03.11) + unit              |
| AC4 | Migration keeps every staff member's access; idempotent; dry run                     | REQ-AUTHA-007 | unit/integration (US-03.3)                                    |
| AC5 | Role changes audit-logged (actor, target, before, after)                             | REQ-AUTHA-006 | e2e (US-03.4) + unit                                          |
| AC6 | Customer sessions never gain staff access                                            | REQ-AUTHA-004 | unit (US-03.5) + e2e (US-03.5b)                               |
| AC7 | Effective permissions are the union of role defaults plus per-user overrides         | REQ-AUTHA-005 | unit (US-03.13) + e2e (US-03.7)                               |
| AC8 | Nav, `proxy.ts` gate and landing redirect are any-of; kitchen-only lands usefully    | REQ-AUTHA-005 | e2e (US-03.1, US-03.6, US-03.7)                               |
| AC9 | Public admins API, scripts and pre-release sessions keep working                     | REQ-AUTHA-007 | unit (US-03.14, US-03.15)                                     |
