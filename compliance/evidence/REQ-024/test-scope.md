# Test Scope — REQ-024

**Risk Level:** HIGH
**Requirement:** Resolve 5 pre-existing SAST findings (path traversal, regex injection)
**GitHub Issue:** #42
**Date:** 2026-04-08

## Test Approach

Full verification and validation per Test Strategy high-risk requirements.

**Universal gates (mandatory — verified locally AND in CI):**

- TypeScript compilation: 0 errors
- SAST scan: 0 high/critical findings (this is the primary gate — findings must disappear)
- Dependency audit: 0 high/critical vulnerabilities
- E2E suite: all pass
- Human code review via PR

**Security testing (mandatory for HIGH):**

- [ ] Input validation: path traversal payloads rejected (filenames with `../`, absolute paths)
- [ ] Input validation: regex injection payloads handled safely (catastrophic backtracking patterns, special chars)
- [ ] Error handling: verify no sensitive data in error responses (no file system paths leaked)
- [ ] Access control: existing auth checks remain intact (no regression)

**Unit tests (TDD — written before implementation):**

- [ ] Path traversal sanitization: filenames with `../`, absolute paths, and double-encoded sequences are stripped to safe basenames
- [ ] Path traversal containment: profile picture deletion rejects paths resolving outside `public/`
- [ ] Regex injection prevention: special characters (`(`, `+`, `*`, `$`, etc.) are escaped before RegExp construction
- [ ] Regex injection prevention: catastrophic backtracking patterns are neutralized

**Additional high-risk testing:**

- [ ] Independent review: second human reviewer required for HIGH risk PR
- [ ] Regression scope: existing E2E suite covers menu image upload, profile, and search workflows — all must remain green

## Validation Approach

How we confirm this meets the business requirement:

- Semgrep scan returns 0 high/critical findings (was 5 before fix)
- Unit tests prove malicious inputs are sanitized (path traversal payloads, regex injection strings)
- E2E suite confirms existing upload, profile, and search functionality still works
- UAT verification of menu image upload and category search

## AI Involvement

- AI tool: Claude Code (Opus 4.6)
- Code categories AI will generate: security sanitization logic, unit tests
- Elevated review required for: all 4 modified files (security-sensitive)
- Regeneration protocol: none

## Acceptance Criteria

- [ ] Semgrep reports 0 high/critical findings (path traversal + regex injection resolved)
- [ ] Path traversal: filenames with `../` or absolute paths are stripped to basename
- [ ] Path traversal: profile picture deletion confined to `public/` directory
- [ ] Regex injection: search query special characters escaped before RegExp construction
- [ ] Regex injection: instagram username match uses string comparison, not regex
- [ ] All existing E2E tests pass (no regression)
- [ ] All security testing items pass
- [ ] Independent review completed
