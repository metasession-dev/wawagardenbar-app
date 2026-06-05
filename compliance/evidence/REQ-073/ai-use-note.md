# REQ-073 — AI use note

## What the AI did

- Audited 8 candidate specs proposed in sub-issue #296: which production code paths exist, what auth fixtures + DB seed would be required, what state to assert.
- Identified the 3 with the cleanest "seed → service-call → assert" pattern: menu-item-delete, menu-item-duplicate, kitchen-void-batch.
- Authored 3 specs + the implementation plan + the 6-doc evidence pack + release ticket + RTM row.
- Ran the focused E2E live against UAT and recorded results in `test-execution-summary.md`.
- Verified tsc + vitest gates green.

## Honest framing of limitations

**V1 pins storage-layer correctness, not action-layer auth.** The 3 specs verify the DB-level outcome of each destructive op, but they bypass the action layer's session-cookie auth + role gates. Coverage of action-layer auth is the responsibility of separate action unit tests; explicitly out of scope for V1 E2E.

**V1 pins service-layer behavior, not UI flow.** No browser-context tests. A regression in the admin menu page's confirm-modal UI or the production list's void button wiring would not be caught by REQ-073. UI-level coverage is deferred to V2 browser-context specs.

**Spec 1 + Spec 2 replicate the action's storage logic inline rather than driving the action itself.** This is functionally equivalent at the DB layer, but means a refactor that changed the action's storage behavior without updating REQ-073 would silently pass the specs. Mitigation: the specs cite the action's line numbers in their JSDoc so a reviewer is pointed at the source-of-truth.

**Spec 3 seeds a real super-admin User document.** Required to satisfy `voidBatch`'s `voidedByRole === 'super-admin'` precondition + the `voidedBy` FK. `afterAll` deletes it. Honest disclosure in `security-summary.md` § "Honest disclosure: ephemeral super-admin user" with mitigations + manual cleanup query.

**5 of 8 sub-issue candidates deferred from V1.** Each defers for an honest reason (multi-collection complexity, UI-driven, or lower urgency). Tracked on sub-issue #296's checklist for follow-up cycles. The V1 scope deliberately ships the smallest 3 to keep the cycle tight while still being load-bearing for the most common destructive-op regression class (menu CRUD + production void).

## What the operator validated

- Approved the umbrella + sub-issue grouping in advance (umbrella #291 cycle).
- Approved the V1 plan (3 specs vs 8) with "proceed" after the plan-summary review.
- Will validate at PR review + portal UAT review.

## Reproducibility

```bash
BASE_URL=https://wawagardenbar-app-uat.up.railway.app \
  MONGODB_URI=$MONGODB_UAT_EXTERNAL_URI \
  MONGODB_DB_NAME=wawagardenbar_uat \
  npx playwright test e2e/admin/menu-item-delete.spec.ts \
                      e2e/admin/menu-item-duplicate.spec.ts \
                      e2e/admin/kitchen-void-batch.spec.ts \
                      --project=regression --reporter=list
```

Each spec is self-contained — seeds + tears down its own state. Re-running back-to-back leaves no residue (each cycle uses a fresh `{ts}` suffix).
