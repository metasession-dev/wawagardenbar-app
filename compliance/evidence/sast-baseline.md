# SAST Baseline — Pre-existing Findings

**Date:** 2026-03-17
**Tool:** Semgrep (auto config)
**Baseline count:** 6 findings
**CI gate:** Fail if findings exceed baseline (new findings introduced)

---

## Pre-existing Findings

### 1. Path Traversal — `app/actions/admin/menu-actions.ts:484`
- **Rule:** `path-join-resolve-traversal`
- **Severity:** WARNING (Blocking)
- **Code:** `const filepath = join(uploadsDir, filename);`
- **Assessment:** Admin-only action; filename is generated server-side from uploaded file. Low exploitability but should be sanitized.
- **Remediation:** Validate filename does not contain `..` or path separators before joining.

### 2. CORS Misconfiguration — `lib/cors.ts:36`
- **Rule:** `cors-misconfiguration`
- **Severity:** WARNING (Blocking)
- **Code:** `response.headers.set('Access-Control-Allow-Origin', origin);`
- **Assessment:** Origin is validated against `CORS_ALLOWED_ORIGINS` env var before being set. False positive — Semgrep doesn't trace the validation logic.
- **Remediation:** None needed (false positive). Document in SAST review.

### 3. Non-literal RegExp — `services/category-service.ts:184`
- **Rule:** `detect-non-literal-regexp`
- **Severity:** WARNING (Blocking)
- **Code:** `{ tags: { $in: [new RegExp(query, 'i')] } }`
- **Assessment:** `query` comes from admin search input. ReDoS risk is low but input should be escaped.
- **Remediation:** Escape regex special characters in `query` before constructing RegExp.

### 4. Non-literal RegExp — `services/instagram-service.ts:109`
- **Rule:** `detect-non-literal-regexp`
- **Severity:** WARNING (Blocking)
- **Code:** `` new RegExp(`^${post.username}$`, 'i') ``
- **Assessment:** `post.username` comes from Instagram API webhook data. ReDoS risk via crafted username.
- **Remediation:** Escape regex special characters or use string comparison with `.toLowerCase()`.

### 5. Path Traversal — `services/profile-service.ts:99`
- **Rule:** `path-join-resolve-traversal`
- **Severity:** WARNING (Blocking)
- **Code:** `const filepath = path.join(uploadDir, filename);`
- **Assessment:** Filename from uploaded file. Should validate no path traversal characters.
- **Remediation:** Validate filename does not contain `..` or path separators.

### 6. Path Traversal — `services/profile-service.ts:117`
- **Rule:** `path-join-resolve-traversal`
- **Severity:** WARNING (Blocking)
- **Code:** `const oldPath = path.join(process.cwd(), 'public', user.profilePicture);`
- **Assessment:** `user.profilePicture` is a database field set by server. Low risk but should be validated.
- **Remediation:** Validate `profilePicture` path does not contain traversal characters.

---

## Remediation Plan

These 6 pre-existing findings will be tracked as a separate requirement (REQ-009) for remediation. The CI baseline gate prevents new findings from being introduced while these are addressed.

**Priority:**
- Findings 1, 5, 6 (path traversal): Medium — schedule for next sprint
- Findings 3, 4 (non-literal regexp): Low — schedule for next sprint
- Finding 2 (CORS): False positive — no action needed
