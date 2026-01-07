# Documentation Standard for Wawa Garden Bar

## Overview

This document defines the documentation standards for the Wawa Garden Bar project. All code changes, features, and significant modifications must be documented according to these guidelines.

---

## Documentation Principles

1. **Document as you build** - Create documentation during implementation, not after
2. **Keep it concise** - Focus on what, why, and how; avoid unnecessary verbosity
3. **Use consistent formatting** - Follow the templates provided
4. **Update existing docs** - Don't create redundant documentation
5. **Think of future maintainers** - Write for someone unfamiliar with the codebase

---

## When to Document

### ✅ ALWAYS Document

- **New features** (any user-facing functionality)
- **API changes** (new endpoints, modified responses)
- **Database schema changes** (new models, field additions/removals)
- **Breaking changes** (anything that affects existing functionality)
- **Architecture decisions** (service patterns, state management changes)
- **Security implementations** (authentication, authorization, data protection)
- **Integration additions** (third-party services, payment processors)
- **Configuration changes** (environment variables, system settings)

### ⚠️ CONDITIONALLY Document

- **Bug fixes** - Document if:
  - Fix is complex or non-obvious
  - Bug affected multiple components
  - Root cause was architectural
  - Fix required data migration
- **Refactoring** - Document if:
  - Changes affect multiple files
  - Pattern changes (e.g., switching state management)
  - Performance optimizations
- **UI/UX changes** - Document if:
  - Affects user workflows
  - Changes navigation structure
  - Modifies checkout/payment flows

### ❌ NO Documentation Needed

- Typo fixes
- Code formatting changes
- Simple variable renames
- Comment additions/updates
- Minor CSS tweaks
- Log message updates

---

## Documentation Structure

### Primary Documentation Locations

```
/docs
├── features/              # Feature implementation docs
├── architecture/          # System design and patterns
├── api/                   # API documentation
├── database/              # Schema and migrations
├── operations/            # Operational guides and scripts
├── integrations/          # Third-party service integrations
├── testing/               # Testing guides and strategies
└── CHANGELOG.md           # Chronological change log
```

---

## Documentation Types & Templates

### 1. Feature Documentation

**Location:** `/docs/features/[feature-name].md`

**Template:**

```markdown
# [Feature Name]

## Overview
Brief description of the feature and its purpose.

## User Story
As a [user type], I want to [action] so that [benefit].

## Implementation

### Database Changes
- Models modified/created
- New fields added
- Indexes created

### API Endpoints
- `POST /api/endpoint` - Description
- `GET /api/endpoint/:id` - Description

### Components
- `/components/path/component-name.tsx` - Purpose
- `/app/path/page.tsx` - Purpose

### Services
- `ServiceName.methodName()` - What it does

### State Management
- Zustand stores modified
- Context providers added

## Configuration
Environment variables or settings required.

## Testing
How to test the feature manually or automated tests added.

## Known Limitations
Any constraints or future improvements needed.

## Related Documentation
Links to related docs or external resources.
```

**Example:** `/docs/features/tab-management.md`

---

### 2. Changelog Entries

**Location:** `/docs/CHANGELOG.md`

**Format:**

```markdown
## [YYYY-MM-DD] - [Category]

### Added
- New feature or capability

### Changed
- Modifications to existing functionality

### Fixed
- Bug fixes with brief description

### Removed
- Deprecated features or code

### Security
- Security-related changes

---
```

**Categories:** Feature, Bug Fix, Refactor, Security, Performance, Documentation

**Example:**

```markdown
## [2026-01-07] - Feature

### Added
- Admin tab payment processing with manual entry option
- `AdminPayTabDialog` component for cash/transfer/card payments
- `completeTabPaymentManuallyAction` server action
- Audit logging for manual tab payments (action: 'tab.manual_payment')

### Changed
- Updated `TabService` to support manual payment completion
- Modified dashboard tabs list to include "Customer Wants to Pay Tab" button

---
```

---

### 3. API Documentation

**Location:** `/docs/api/[domain].md`

**Template:**

```markdown
# [Domain] API

## Endpoints

### [Method] /api/path

**Description:** What this endpoint does

**Authentication:** Required/Optional

**Request:**
```typescript
interface RequestBody {
  field: string;
}
```

**Response:**
```typescript
interface ResponseBody {
  success: boolean;
  data: object;
}
```

**Status Codes:**
- `200` - Success
- `400` - Bad request
- `401` - Unauthorized
- `500` - Server error

**Example:**
```bash
curl -X POST /api/path \
  -H "Content-Type: application/json" \
  -d '{"field": "value"}'
```
```

---

### 4. Database Schema Documentation

**Location:** `/docs/database/schema.md`

**Update when:**
- New models created
- Fields added/removed/modified
- Indexes changed
- Relationships updated

**Format:**

```markdown
## [ModelName]

**Collection:** `collection_name`

### Fields

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| field1 | String | Yes | - | Description |
| field2 | Number | No | 0 | Description |

### Indexes

- `field1` (unique)
- `field2, field3` (compound)

### Relationships

- References `OtherModel` via `fieldId`

### Methods

- `instanceMethod()` - Description
- `static staticMethod()` - Description

### Example Document

```json
{
  "_id": "ObjectId",
  "field1": "value",
  "field2": 123,
  "createdAt": "2026-01-07T00:00:00.000Z"
}
```
```

---

### 5. Operational Scripts

**Location:** `/docs/operations/OPERATIONAL-SCRIPTS.md`

**Add entry when:**
- Creating maintenance scripts
- Adding data migration scripts
- Building admin utilities

**Format:**

```markdown
### [Script Name]

**File:** `/scripts/script-name.ts`

**Purpose:** What the script does

**When to Use:** Specific scenarios

**Usage:**
```bash
npm run script-name [arguments]
```

**Arguments:**
- `--arg1` - Description
- `--arg2` - Description (optional)

**Example:**
```bash
npm run script-name --arg1=value
```

**Safety:** ⚠️ Warning if destructive

**Output:** What to expect
```

---

### 6. Architecture Decision Records (ADRs)

**Location:** `/docs/architecture/adr-[number]-[title].md`

**When to create:**
- Choosing between architectural patterns
- Selecting libraries/frameworks
- Deciding on data structures
- Establishing conventions

**Template:**

```markdown
# ADR-[Number]: [Title]

**Date:** YYYY-MM-DD

**Status:** Proposed | Accepted | Deprecated | Superseded

## Context
What is the issue we're addressing?

## Decision
What is the change we're proposing/making?

## Consequences
What becomes easier or more difficult?

### Positive
- Benefit 1
- Benefit 2

### Negative
- Trade-off 1
- Trade-off 2

## Alternatives Considered
What other options were evaluated?

## References
Links to discussions, documentation, or resources
```

---

## Code Documentation Standards

### JSDoc Comments

**Required for:**
- All exported functions
- All service methods
- All complex utility functions
- All custom hooks

**Format:**

```typescript
/**
 * Brief description of what the function does
 * 
 * @param paramName - Description of parameter
 * @param optionalParam - Description (optional)
 * @returns Description of return value
 * @throws {ErrorType} When error occurs
 * 
 * @example
 * ```typescript
 * const result = functionName('value');
 * ```
 */
export function functionName(paramName: string, optionalParam?: number): ReturnType {
  // Implementation
}
```

### Inline Comments

**Use sparingly for:**
- Complex algorithms
- Non-obvious business logic
- Workarounds or hacks
- TODO items with context

**Format:**

```typescript
// FIXME: [Issue description] - [Your Name] - [Date]
// TODO: [Task description] - [Your Name] - [Date]
// HACK: [Why this workaround exists]
// NOTE: [Important context about the code]
```

---

## Documentation Workflow

### For New Features

1. **Before coding:** Create feature doc with overview and plan
2. **During coding:** Update doc with implementation details
3. **After coding:** Add changelog entry, update related docs
4. **Before PR:** Review all documentation for completeness

### For Bug Fixes

1. **Identify root cause:** Document in code comments if complex
2. **Implement fix:** Add inline comments explaining the fix
3. **Update changelog:** Add entry under "Fixed" section
4. **Update feature doc:** If bug reveals architectural issue

### For Refactoring

1. **Document motivation:** Why is refactoring needed?
2. **Create ADR:** If changing patterns or architecture
3. **Update affected docs:** Feature docs, API docs, etc.
4. **Add changelog entry:** Under "Changed" section

---

## Documentation Maintenance

### Weekly Tasks
- Review and update TODO.TXT
- Ensure recent changes are in CHANGELOG.md
- Check for outdated documentation

### Monthly Tasks
- Review all feature documentation for accuracy
- Update architecture diagrams if needed
- Archive deprecated documentation

### Quarterly Tasks
- Comprehensive documentation audit
- Update README files across the project
- Review and consolidate redundant docs

---

## Documentation Quality Checklist

Before considering documentation complete, verify:

- [ ] Clear and concise language
- [ ] No typos or grammatical errors
- [ ] Code examples are tested and working
- [ ] Links to related documentation are valid
- [ ] Formatting is consistent with templates
- [ ] Technical accuracy verified
- [ ] Includes practical examples
- [ ] Covers edge cases and limitations
- [ ] Updated date/version information
- [ ] Reviewed by at least one other person (if possible)

---

## Tools and Resources

### Markdown Linting
Use consistent Markdown formatting across all documentation files.

### Documentation Generation
- JSDoc for generating API documentation from code comments
- TypeDoc for TypeScript-specific documentation

### Diagrams
- Use Mermaid for architecture diagrams in Markdown
- Store complex diagrams in `/docs/diagrams/`

---

## Examples of Good Documentation

See these files as reference examples:
- `/docs/features/tab-management.md` - Complete feature documentation
- `/docs/operations/OPERATIONAL-SCRIPTS.md` - Operational guide
- `/docs/Test/PLAYWRIGHT-TEST-REQUIREMENTS.md` - Testing documentation
- `/docs/Finance/daily-reports.md` - Domain-specific documentation

---

## Getting Help

If unsure about documentation requirements:
1. Check existing documentation for similar features
2. Refer to this standard document
3. Ask team lead or senior developer
4. When in doubt, over-document rather than under-document

---

**Last Updated:** 2026-01-07  
**Version:** 1.0.0  
**Maintained By:** Development Team
