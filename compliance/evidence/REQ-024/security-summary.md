## Security Evidence Summary — REQ-024

**Date:** 2026-04-08
**SAST Tool:** Semgrep (auto config)
**SAST High/Critical Findings:** 0 (resolved 5 pre-existing findings)
**Dependency Audit High/Critical:** 0 new (1 pre-existing xlsx@0.18.5, no fix available)
Evidence uploaded to META-COMPLY project: wawagardenbar-app

### Findings Resolved

| #   | Type            | File                        | Fix Applied                                               |
| --- | --------------- | --------------------------- | --------------------------------------------------------- |
| 1   | Path traversal  | menu-actions.ts             | Extension from MIME type map, not user filename           |
| 2   | Path traversal  | profile-service.ts (upload) | Extension from MIME type map, not user filename           |
| 3   | Path traversal  | profile-service.ts (delete) | path.resolve + containment check before unlink            |
| 4   | Regex injection | category-service.ts         | Escape special chars; use MongoDB $regex string form      |
| 5   | Regex injection | instagram-service.ts        | Replace regex with collation-based case-insensitive match |

### Nosemgrep Suppressions

Two `nosemgrep` inline comments added for false positives where filenames are constructed entirely from validated ObjectId + timestamp + MIME-derived extension (no user input flows into path):

- `menu-actions.ts:628` — `join(uploadsDir, filename)`
- `profile-service.ts:113` — `path.join(uploadDir, filename)`

One `nosemgrep` for `path.resolve` with immediate containment validation:

- `profile-service.ts:129` — containment checked on next line before unlink

### Access Control

No changes to authentication or authorization. Existing auth checks remain intact in all modified files.
