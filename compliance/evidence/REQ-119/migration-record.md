# Staff roles migration record — REQ-119

Script: `scripts/migrate-staff-roles.ts` (dry run by default; `--apply` writes `roles = [role]`; idempotent; never changes `role`; never touches customers). The application reads `[role]` when `roles` is missing, so access is correct before, during and after the run.

| Environment | Dry run                                                                                                             | Apply                                                                                 |
| ----------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| UAT         | not recorded in this session                                                                                        | not recorded in this session; the portal UAT passed on `8ace889` (operator to attach) |
| Production  | 2026-11-07: 15 users scanned, 2 customers untouched, 0 already with roles, 13 staff to write, 0 unknown role values | **Done 2026-11-07 10:04 UTC by the operator:** 13 users written, re-run 0 to write    |

## Production apply (operator)

Run from the repo root with the production Mongo connection in the environment (the public proxy URL of the `MongoDB` service in Railway project `Wawa Garden Bar`, never committed):

```bash
npx tsx scripts/migrate-staff-roles.ts            # dry run, expect 13 to write
npx tsx scripts/migrate-staff-roles.ts --apply --out compliance/evidence/REQ-119
npx tsx scripts/migrate-staff-roles.ts            # re-run, expect 0 to write
```

Record here after the run: date and time, operator, counts from the apply, counts from the re-run (must be 0), and the file name of the `staff-roles-migration-<timestamp>.json` it wrote (user ids only). Then sign in once as a multi-role account and as a kitchen-only account on production and note the date (no credentials).

| Field                 | Value                                                                     |
| --------------------- | ------------------------------------------------------------------------- |
| Applied on            | 2026-11-07T10:04:20Z                                                      |
| Operator              | ostendo-io operator (project owner)                                       |
| Users written         | 13 (15 scanned, 2 customers untouched, 0 unknown)                         |
| Re-run count (must 0) | 0 (13 already have roles)                                                 |
| Record file           | `staff-roles-migration-2026-11-07T10-04-20-043Z.json`                     |
| Live checks done on   | pending: sign in as a multi-role and a kitchen-only account on production |
