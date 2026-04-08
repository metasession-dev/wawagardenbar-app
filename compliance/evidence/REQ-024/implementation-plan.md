# Implementation Plan — REQ-024

**Requirement:** REQ-024
**GitHub Issue:** #42
**Risk Level:** HIGH
**Date:** 2026-04-08

## Approach

Fix 5 pre-existing SAST findings: 3 path traversal vulnerabilities (unsanitized filenames in `path.join`) and 2 regex injection/ReDoS vulnerabilities (unsanitized user input in `new RegExp()`). Each fix is a targeted, minimal change — sanitize input before it reaches the dangerous sink.

## Files to Create

- None

## Files to Modify

- `app/actions/admin/menu-actions.ts` (line ~620) — The file extension extracted from `file.name` via `.split('.').pop()` is used in `join(uploadsDir, filename)`. A crafted `file.name` like `../../etc/passwd` would allow traversal. **Fix:** Apply `path.basename()` to `file.name` before extracting extension, ensuring no path separators survive.

- `services/profile-service.ts` (lines ~97, ~117) — Two path traversal issues:
  1. Line ~97: `filename` constructed from `file.name.split('.').pop()` extension — same pattern as menu-actions. **Fix:** Apply `path.basename()` to `file.name` before extracting extension.
  2. Line ~117: `user.profilePicture` (DB value) used in `path.join(process.cwd(), 'public', user.profilePicture)` for deletion. If the DB stores a traversal string, it escapes the `public/` directory. **Fix:** Resolve the joined path and verify it starts with the expected `public/` directory before unlinking.

- `services/category-service.ts` (line ~184) — `query` parameter passed directly to `new RegExp(query, 'i')`. A crafted query like `(a+)+$` causes catastrophic backtracking. **Fix:** Escape regex special characters before constructing the RegExp using a standard escape function.

- `services/instagram-service.ts` (line ~109) — `post.username` from external Instagram API used in `new RegExp('^${post.username}$', 'i')`. **Fix:** Replace with a case-insensitive string comparison (lowercase both sides) since exact match doesn't need regex.

## Architecture Decisions

- **No new utility file** — The regex escape one-liner (`str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`) will be inlined where needed. Only one call site (category-service) needs it; the other regex site (instagram-service) should use direct string comparison instead.
- **Path validation via resolved path check** — For the profile picture deletion, validate that the resolved absolute path starts with the expected base directory. This is more robust than stripping `..` sequences.
- **`path.basename()` for upload filenames** — Standard Node.js approach to strip directory components from user-provided filenames.

## Dependencies

- None (all fixes use Node.js built-ins)

## Risks / Considerations

- The profile-service DB path fix (finding 3) changes deletion behavior — if any existing `user.profilePicture` values in the DB contain traversal paths, the old file won't be deleted. This is the correct behavior (prevents deleting files outside `public/`).
- The regex escape in category-service changes search behavior slightly — literal matches on regex special characters (e.g., searching for "item (large)") will now work correctly instead of being interpreted as regex.

## Post-Deploy Actions

- None
