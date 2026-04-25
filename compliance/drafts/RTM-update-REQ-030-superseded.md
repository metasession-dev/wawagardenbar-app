# DRAFT — RTM update for marking REQ-030 SUPERSEDED

## Change to `compliance/RTM.md`

**Replace the existing REQ-030 row:**

```
| REQ-030 | #53   | HIGH   | compliance/evidence/REQ-030/ | IN PROGRESS         | ostendo-io      | 2026-04-24 |
```

**With:**

```
| REQ-030 | #53   | HIGH   | compliance/evidence/REQ-030/ | SUPERSEDED by REQ-031 (PR #66 closed unmerged; back-end commits retained on develop as pre-cursor) | ostendo-io      | 2026-04-24 |
```

## And add the new row immediately below:

```
| REQ-031 | #NEW  | HIGH   | compliance/evidence/REQ-031/ | DRAFT               | ostendo-io      | 2026-04-25 |
```

(Replace `#NEW` with the actual issue number once #67 — or whatever GitHub assigns — is created.)

## Companion file moves

```bash
# Keep the audit trail intact, just relocate so the "pending" folder isn't misleading
mkdir -p compliance/superseded-releases
git mv compliance/pending-releases/RELEASE-TICKET-REQ-030.md \
       compliance/superseded-releases/RELEASE-TICKET-REQ-030.md
```

Then **prepend** to the moved release ticket (above the `# Release Ticket` heading):

```markdown
> **SUPERSEDED 2026-04-25** — This release was never merged. Original scope (REQ-030) shipped only the back-end + admin-config layer; the customer/staff order-time picker was missing, leaving the feature unreachable through the UI. Replaced by REQ-031 which scopes the full end-to-end journey. PR #66 closed unmerged. Back-end commits (`39d75d6`, `e007f3c`, `c5d4327`, `830ab4c`, `4469b6b`) remain on `develop` as the pre-cursor for REQ-031.
>
> **Successor:** REQ-031 / issue #NEW / `compliance/evidence/REQ-031/`
```

## What stays as-is (do NOT touch)

- `compliance/evidence/REQ-030/` — keep all evidence files. They document the work that was done; the audit trail says it shipped to `develop` but did not reach `main`. REQ-031's evidence will reference these.
- The five back-end commits on `develop` — load-bearing for REQ-031.
- The CI gate run records (`#24887448477` etc.) — historical fact.
