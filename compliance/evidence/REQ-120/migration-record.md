# Order origin migration record — REQ-120

Script: `scripts/migrate-order-origin.ts` (dry run by default; `--apply` sets `origin` on orders that have none; `createdByRole: customer` or missing becomes `customer`, anything else `staff`; idempotent; changes nothing else). The application is correct before, during and after the run (the schema defaults new orders to `staff` and readers treat a missing `origin` as unknown).

| Environment | Dry run                                     | Apply                                  | Re-run (must be 0)                       |
| ----------- | ------------------------------------------- | -------------------------------------- | ---------------------------------------- |
| UAT         | Would update: 3 customer, 4569 staff orders | Updated: 3 customer, 4569 staff orders | Would update: 0 customer, 0 staff orders |
| Production  | not yet run                                 | not yet run                            | not yet run                              |

## UAT run

Run by the operator on 2026-11-11 inside the UAT app pod, where the UAT connection string is already set:

```bash
kubectl -n apps exec deploy/wawagardenbar-uat-app -- npx tsx scripts/migrate-order-origin.ts            # dry run
kubectl -n apps exec deploy/wawagardenbar-uat-app -- npx tsx scripts/migrate-order-origin.ts --apply
kubectl -n apps exec deploy/wawagardenbar-uat-app -- npx tsx scripts/migrate-order-origin.ts            # re-run, expect 0 and 0
```

| Field                    | Value                               |
| ------------------------ | ----------------------------------- |
| Applied on               | 2026-11-11 (UAT)                    |
| Operator                 | ostendo-io operator (project owner) |
| Orders written           | 4572 (3 customer, 4569 staff)       |
| Re-run count (must be 0) | 0 customer, 0 staff                 |

Note: an earlier attempt from the dev checkout failed to connect (`.env.local` points at a local database that was not running) and wrote nothing.

## Production (operator, after release)

Run the same three commands against the production database (the Railway Mongo URL, never committed), then record the counts here.
