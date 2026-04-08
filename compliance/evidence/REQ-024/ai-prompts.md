# AI Prompts — REQ-024

Prompt summary: Implement fixes for 5 SAST findings (3 path traversal, 2 regex injection) per implementation plan. Write TDD unit tests first, then apply minimal fixes in source files.
Files generated: `__tests__/security/path-traversal-sanitization.test.ts`, `__tests__/security/regex-injection-prevention.test.ts`
Files modified: `app/actions/admin/menu-actions.ts`, `services/profile-service.ts`, `services/category-service.ts`, `services/instagram-service.ts`
Date: 2026-04-08
