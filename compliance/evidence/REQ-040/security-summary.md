# Security Summary — REQ-040

**Date:** 2026-05-17
**Risk Level:** LOW

## Authorisation & authentication

- No new routes; no new server actions; no new auth surface.
- Scripts are operator-invoked from the local machine using credentials supplied via env (`MONGODB_UAT_EXTERNAL_URI` / `MONGODB_PROD_EXTERNAL_URI`). Auth model unchanged.

## Data integrity

- **Defence in depth on connection target.** Today the scripts silently connect to Mongo's default database when the URI lacks a path-segment database. That's not a corruption risk in itself (the default DB is empty in prod), but it's the prerequisite for "0 candidates found" being misread as "the script did its job." This REQ closes the misread by failing loudly.
- **No write-path change.** The scripts continue to do exactly what they did before once they connect. Only the connect-precondition is hardened.

## Threat model

| Threat                                                                                 | Mitigation                                                                                                                                                                                             |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Operator passes a path-less URI and silently connects to the wrong DB (D12 root cause) | Helper throws before `mongoose.connect`; script exits non-zero; stderr names `MONGODB_DB_NAME`                                                                                                         |
| Operator passes a valid URI but the DB name in the path is a typo                      | Out of scope (the helper validates that there IS a name, not that it's the RIGHT name). The `Connecting to database: <name>` log line gives the operator a final sanity check before any read or write |
| Helper rejects a legitimate URI (regression)                                           | Test matrix covers path-db, mongodb+srv, path+querystring. Reviewer checks the parser doesn't use a fragile regex                                                                                      |

## Tests added

- 8+ unit tests covering the parser matrix above.
- No E2E delta (script-only; no UI).
