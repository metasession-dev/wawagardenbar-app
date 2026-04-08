# Test Plan — REQ-024

**Requirement:** REQ-024
**Risk Level:** HIGH
**GitHub Issue:** #42
**Date:** 2026-04-08

## Tests to Add

- [ ] `__tests__/security/path-traversal-sanitization.test.ts` — Verifies upload filename sanitization strips directory traversal payloads and absolute paths for both menu image and profile picture uploads
- [ ] `__tests__/security/regex-injection-prevention.test.ts` — Verifies regex special characters are escaped before RegExp construction in category search

## Tests to Update

- None

## Tests to Remove

- None

## Functional Test Mapping

| Acceptance Criterion                           | Test File                                                | Test Name                                                        |
| ---------------------------------------------- | -------------------------------------------------------- | ---------------------------------------------------------------- |
| Filenames with `../` stripped to basename      | `__tests__/security/path-traversal-sanitization.test.ts` | strips directory traversal sequences from upload filenames       |
| Absolute path filenames stripped to basename   | `__tests__/security/path-traversal-sanitization.test.ts` | strips absolute paths from upload filenames                      |
| Profile picture deletion confined to public/   | `__tests__/security/path-traversal-sanitization.test.ts` | rejects profile picture paths resolving outside public directory |
| Regex special chars escaped in search          | `__tests__/security/regex-injection-prevention.test.ts`  | escapes special characters before RegExp construction            |
| Catastrophic backtracking patterns neutralized | `__tests__/security/regex-injection-prevention.test.ts`  | handles catastrophic backtracking patterns safely                |
| Semgrep 0 high/critical                        | CI gate                                                  | semgrep scan                                                     |
| Existing E2E suite passes                      | E2E suite                                                | all existing specs                                               |

## Non-Functional Tests (HIGH)

- [ ] Security: unit tests cover path traversal payloads (`../`, `/etc/passwd`, double-encoded) and regex injection payloads (`(a+)+$`, `.*+?^${}()|[]\\`)
- [ ] Regression: full E2E suite must pass — no functional changes expected, only input sanitization added

## Test Data Requirements

- No database seeding needed — unit tests use pure function inputs
- Path traversal tests use string assertions (no filesystem writes)
- Regex tests verify escaped output strings and search query handling
