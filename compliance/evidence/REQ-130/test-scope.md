---
title: 'Test scope — REQ-130'
requirement_id: 'REQ-130'
risk_class: 'LOW'
---

# Test scope — REQ-130

Extracted from `compliance/plans/REQ-130/implementation-plan.md` §1.

| AC  | Summary                                                                 | SRS-ID       | Verification |
| --- | ----------------------------------------------------------------------- | ------------ | ------------ |
| AC1 | Support item in the dashboard menu for csr, manager, admin, super-admin | REQ-DASH-007 | unit + e2e   |
| AC2 | Not shown to kitchen-only members or customers; page refused            | REQ-DASH-007 | unit + e2e   |
| AC3 | Item highlighted on `/dashboard/support` and ticket pages               | REQ-DASH-007 | unit + e2e   |
| AC4 | Critical e2e spec: visible for csr, absent for kitchen-only             | REQ-DASH-007 | e2e          |
