# Documentation Directory Structure

This document provides a visual overview of the documentation directory structure.

```
docs/
├── README.md                           # Documentation index and navigation guide
├── CHANGELOG.md                        # Chronological change log (2026+)
├── DOCUMENTATION-STANDARD.md           # Documentation guidelines and standards
├── ruleset.md                          # Code style guide and development rules
├── requirements.md                     # Project requirements and specifications
├── notes.txt                           # General project notes
├── todo-old.txt                        # Archived todo items
│
├── admin/                              # Admin dashboard and management
│   ├── admin-management.md
│   ├── admin-order-manual-payment.md
│   └── admin-order-process.md
│
├── api/                                # API documentation (future)
│
├── architecture/                       # System architecture and design
│   ├── breadcrumb-examples.md
│   ├── breadcrumb-navigation.md
│   ├── component-verification.md
│   ├── deliverables-strategy.md
│   ├── pre-coding-checklist.md
│   ├── remaining-ui-enhancements.md
│   ├── requirements-update-summary.md
│   ├── ui-components.md
│   └── ui-enhancements-completion-summary.md
│
├── authentication/                     # Authentication and authorization
│   ├── auth-implementation.md
│   ├── auth-setup.md
│   ├── email-fallback-authentication.md
│   ├── email-fallback-troubleshooting.md
│   ├── whatsapp-implementation-summary.md
│   ├── whatsapp-pin.md
│   ├── whatsapp-quick-reference.md
│   └── whatsapp-setup-guide.md
│
├── changelog-archive/                  # Historical changelog entries (pre-2026)
│   ├── 2024-add-to-tab-button.md
│   ├── 2024-dashboard-stats-fix.md
│   ├── 2024-debugging-financial-reports.md
│   ├── 2024-financial-reports-final-fix.md
│   ├── 2024-financial-reports-fix.md
│   ├── 2024-inventory-deduction-fix.md
│   ├── 2024-name-consistency-fix.md
│   ├── 2024-order-stats-fix.md
│   ├── 2024-phone-sanitization-fix.md
│   ├── 2024-tab-payment-inventory-fix.md
│   └── 2024-tabs-stats-update.md
│
├── database/                           # Database schema and data management
│   ├── cleanup-scripts.md
│   ├── models-implementation.md
│   └── schema.md
│
├── features/                           # Feature specifications and implementations
│   ├── checkout-process.txt
│   ├── documentation-update-customer-rewards.md
│   ├── half-portion-implementation-summary.md
│   ├── half-portion.md
│   ├── inventory-report.md
│   ├── menu-item-filter-config.md
│   ├── pay-now-order-type.md
│   ├── rewards-system-spec.md
│   ├── tabs-and-orders-system-spec.md
│   ├── tabs-orders-checkout-processing.txt
│   ├── user-profile-implementation-plan.md
│   ├── user-profile-implementation-summary.md
│   └── user-profile.md
│
├── finance/                            # Financial reports and profitability
│   ├── daily-reports.md
│   ├── expenses.md
│   ├── profitability-calculation.md
│   ├── profitability-implementation-status.md
│   ├── reports-v2.md
│   └── reports.md
│
├── integrations/                       # Third-party service integrations
│   ├── bulk-sms-implementation-plan-v2.md
│   ├── bulk-sms-implementation-plan.md
│   ├── instagram-design.txt
│   ├── instagram-implementation-details.md
│   ├── instagram-requirements.md
│   ├── meta-admin-integration.md
│   ├── monnify-integration-guide.md
│   ├── paystack-integration-guide.md
│   ├── paystack-requirements.md
│   ├── sms-error-handling.md
│   ├── testing-monnify-payments.md
│   └── transactional-sms-requirements.md
│
├── menu-management/                    # Menu configuration and management
│   ├── drinks-menu-descriptions-update.md
│   ├── drinks-menu-seeding.md
│   ├── drinks-menu.md
│   ├── food-menu-descriptions-update.md
│   ├── food-menu.md
│   └── menu-testing-guide.md
│
├── operations/                         # Operational guides and scripts
│   ├── environment-variables-fixed.md
│   ├── operational-scripts.md
│   └── setup.md
│
├── phase-implementations/              # Phase-by-phase implementation docs
│   ├── phase-2-core-customer-experience/
│   │   ├── FEATURE-2.1-COMPLETE.md
│   │   ├── FEATURE-2.2-COMPLETE.md
│   │   ├── FEATURE-2.3-COMPLETE.md
│   │   ├── FEATURE-2.4-COMPLETE.md
│   │   └── PHASE-2-REVIEW.md
│   │
│   ├── phase-3-order-management/
│   │   ├── FEATURE-3.1-REVIEW.md
│   │   ├── FEATURE-3.2-COMPLETE.md
│   │   ├── FEATURE-3.3-COMPLETE.md
│   │   ├── FEATURE-ORDER-PROCESSING-COMPLETE.md
│   │   ├── ORDER-INTEGRATION-CHECKLIST.md
│   │   ├── ORDER-PROCESSING-WORKFLOW.md
│   │   ├── ORDER-QUICK-START.md
│   │   ├── ORDER-SYSTEM-SUMMARY.md
│   │   ├── REWARDS-ADMIN-GAP-ANALYSIS.md
│   │   └── REWARDS-INTEGRATION-GUIDE.md
│   │
│   └── phase-4-admin-dashboard/
│       ├── DOCUMENTATION-UPDATES-REWARDS.md
│       ├── FEATURE-4.1-COMPLETE.md
│       ├── FEATURE-4.2-COMPLETE.md
│       ├── FEATURE-4.2.2-COMPLETE.md
│       ├── FEATURE-4.2.2-PROGRESS.md
│       ├── FEATURE-4.2.2-REMAINING-IMPLEMENTATION.md
│       ├── FEATURE-4.2.2-SPEC.md
│       ├── FEATURE-4.2.2-TROUBLESHOOTING.md
│       ├── FEATURE-4.3-COMPLETE.md
│       ├── FEATURE-4.3-FIXES-2.md
│       ├── FEATURE-4.3-FIXES.md
│       ├── FEATURE-4.3-IMPLEMENTATION-STATUS.md
│       ├── FEATURE-4.3-PROGRESS.md
│       ├── FEATURE-4.3-SPEC.md
│       ├── FEATURE-4.4-COMPLETE.md
│       ├── FEATURE-4.4-PROGRESS.md
│       ├── FEATURE-4.4-SPEC.md
│       ├── INVENTORY-USER-GUIDE.md
│       └── LOGO-SETUP.md
│
└── testing/                            # Testing documentation and guides
    ├── README.md
    ├── phase-3-completion-summary.md
    ├── playwright-implementation-plan.md
    ├── playwright-test-requirements.md
    ├── quick-start-guide.md
    ├── quick-test.md
    └── test-case-template.md
```

## Directory Naming Conventions

All directory names follow **kebab-case** (lowercase with hyphens):
- ✅ `menu-management/`
- ✅ `phase-implementations/`
- ✅ `changelog-archive/`
- ❌ ~~`Menu Management/`~~
- ❌ ~~`Phase Implementations/`~~

## File Naming Conventions

All file names follow **kebab-case** (lowercase with hyphens):
- ✅ `auth-implementation.md`
- ✅ `half-portion-implementation-summary.md`
- ✅ `paystack-integration-guide.md`
- ❌ ~~`AUTH-IMPLEMENTATION.md`~~
- ❌ ~~`Menu-item-filer-config.md`~~

## Special Files

### Root Level Files
- `README.md` - Main documentation index
- `CHANGELOG.md` - Current changelog (Keep ALL CAPS)
- `DOCUMENTATION-STANDARD.md` - Documentation standard (Keep ALL CAPS)
- `ruleset.md` - Code style guide
- `requirements.md` - Project requirements

### Archive Files
- `notes.txt` - General notes (lowercase)
- `todo-old.txt` - Archived todos (lowercase)

---

**Last Updated:** 2026-01-07  
**Version:** 1.0.0
