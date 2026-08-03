# Test Scope — REQ-098

**Risk class:** HIGH
**Source:** [#626](https://github.com/metasession-dev/wawagardenbar-app/issues/626)

| AC  | SRS item                                           | Risk | Verification method                                                                                                       |
| --- | -------------------------------------------------- | ---- | ------------------------------------------------------------------------------------------------------------------------- |
| AC1 | REQ-TABMGT-007 (new)                               | High | Schema/model unit test — `'written-off'` accepted, existing values unaffected.                                            |
| AC2 | REQ-TABMGT-007 (new)                               | High | Service unit tests (`writeOffTab` happy path incl. `partialPayments`; already-written-off refusal; audit-log call shape). |
| AC3 | REQ-TABMGT-007 (new)                               | High | Action-layer role-gate unit tests (non-admin refusal; admin/super-admin success), mirroring `deleteTabAction`'s tests.    |
| AC4 | REQ-TABMGT-007 (new)                               | High | Authenticated UI E2E test (write-off dialog, reason-required, existing delete action unaffected).                         |
| AC5 | REQ-TABMGT-008 (new); REQ-INV-019 (new)            | High | Service unit test (`scanDormantOpenTabs` dedup); authenticated UI E2E test (dormancy flag on tabs list + incident row).   |
| AC6 | REQ-REPORT-006 (new)                               | High | `financial-report-service` integration test (written-off exclusion + new report section totals).                          |
| AC7 | `@srs-deferred` — one-time script, not SRS-tracked | High | Dry-run test of `write-off-dormant-tabs-2026-07-31.ts` against a seeded fixture matching the 51-order profile.            |
