# Test Scope — REQ-023

**Risk Level:** LOW
**Requirement:** Replace Total Amount card with Staff Pot Balance on Tabs Management page
**GitHub Issue:** #48
**Date:** 2026-04-06

## Test Approach

Standard gates apply. No additional testing beyond universal exit criteria.

- TypeScript compilation: 0 errors
- SAST scan: 0 high/critical findings
- Dependency audit: 0 high/critical vulnerabilities
- E2E suite: all pass
- CI independent verification: all PR checks pass

## Acceptance Criteria

- [x] "Total Amount" card replaced with "Staff Pot Balance" card on Tabs Management page
- [x] Staff Pot Balance shows current month's total pot from StaffPotService
- [x] Card displays ₦ formatted value with appropriate icon
- [x] No revenue figures visible to general admin staff on the Tabs page
