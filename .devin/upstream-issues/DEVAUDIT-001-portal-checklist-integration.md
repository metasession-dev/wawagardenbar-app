# DEVAUDIT-001: Portal-Managed Reviewer Checklist for Release Tickets

**Status:** Draft - Ready for upstream submission  
**Target Repositories:** `devaudit-installer`, `metasession-portal`  
**Priority:** Medium  
**Effort Estimate:** 2-3 sprints

---

## Problem Statement

Current SDLC compliance requires a "Reviewer Checklist" in release tickets (e.g., `compliance/pending-releases/RELEASE-TICKET-REQ-XXX.md`) with 10 items that must be validated before production deployment:

- Code matches requirement
- Test evidence present and all-pass
- Security evidence present and clean
- etc.

**Current State:** These are static Markdown checkboxes (`- [ ]`) in Git-tracked files. Reviewers cannot interactively tick them on the portal, and there's no enforcement or visibility of checklist completion status during the release flow.

**Gap:** The checklist exists in the release ticket artifact but is not integrated into the portal's interactive release workflow.

---

## Proposed Solution

### High-Level Architecture

```
┌─────────────────┐      ┌──────────────────┐      ┌─────────────────┐
│  Git (Markdown) │─────▶│  Portal Backend  │◀────▶│  Portal UI      │
│  Release Ticket │ Sync │  (Release API) │      │  (Reviewer View)│
└─────────────────┘      └──────────────────┘      └─────────────────┘
         │                       │                         │
         │                ┌──────▼──────┐               │
         │                │  Database   │               │
         │                │  (Checklist │               │
         │                │   State)    │               │
         │                └─────────────┘               │
         │                                                │
    [Source of Truth]                               [Interactive UI]
```

### Implementation Plan

#### Phase 1: Schema & API (Portal Backend)

**New Database Table:** `release_checklist_items`

| Column              | Type      | Description                                     |
| ------------------- | --------- | ----------------------------------------------- |
| `id`                | UUID      | Primary key                                     |
| `release_ticket_id` | UUID      | FK to release tickets                           |
| `item_key`          | VARCHAR   | Machine-readable key (e.g., `code_matches_req`) |
| `item_label`        | TEXT      | Human-readable label from Markdown              |
| `is_checked`        | BOOLEAN   | Current state                                   |
| `checked_by`        | VARCHAR   | Reviewer email/username                         |
| `checked_at`        | TIMESTAMP | When checked                                    |
| `is_required`       | BOOLEAN   | Can release proceed without this?               |

**New API Endpoints:**

```
GET    /api/releases/{id}/checklist           # Fetch checklist with state
PATCH  /api/releases/{id}/checklist/{key}    # Toggle item state
POST   /api/releases/{id}/checklist/sync      # Sync from Git source
```

#### Phase 2: Parser & Sync (DevAudit Installer)

**New Component:** `release-ticket-parser`

- Parse `## Reviewer Checklist` section from Markdown using regex/Goldmark
- Extract items and sync to portal DB via API
- Handle updates: if Git changes, portal reflects new items
- Preserve checked state for unchanged items during sync

**Integration Point:**

- Hook into existing `upload-evidence.sh` or create `sync-release-ticket.sh`
- Run on: PR open, PR update, manual trigger

#### Phase 3: Portal UI

**New Page Section:** `/portal/releases/{id}/review`

**UI Components:**

1. **Checklist Panel**
   - Interactive checkboxes for each item
   - Display `checked_by` + `checked_at` on hover
   - Visual distinction for required vs. optional items
   - "Expand All / Collapse All" toggle

2. **Release Action Buttons** (preserved existing flow)
   - `Submit for UAT Review` — unchanged functionality
   - `Approve UAT` — unchanged functionality
   - `Submit for Production Review` — **NEW: Warn if required items unchecked**
   - `Approve for Production` — **NEW: Block if required items unchecked (configurable)**

3. **Warning/Blocking Logic**
   - Yellow warning banner: "3 of 10 checklist items unchecked. Proceed anyway?"
   - Configurable per-org: strict mode (block) vs. advisory mode (warn)

#### Phase 4: Git Writeback (Optional)

**Bidirectional Sync:**

- When reviewer ticks item on portal → update Git via commit
- Bot account (e.g., `devaudit-bot`) commits to release ticket:
  ```markdown
  - [x] Code matches requirement. _(Checked by reviewer@example.com 2026-06-17)_
  ```
- Alternative: Portal remains source of truth, Git is read-only mirror

---

## Acceptance Criteria

1. Reviewer can view the 10-item checklist on the portal `/releases/{id}/review` page
2. Reviewer can tick/untick any item interactively
3. Checked items persist and show reviewer identity + timestamp
4. `Submit for UAT Review` and `Approve UAT` buttons remain functional regardless of checklist state
5. `Submit for Production Review` shows advisory warning if required items unchecked
6. Checklist content syncs from Git release ticket on PR update
7. (Optional) Checklist state writes back to Git with reviewer attribution

---

## Phase 4: Post-UAT Workflow Automation (NEW)

**Problem:** After clicking "UAT Approved" in the portal, users are unclear on next steps. The PR from `develop` → `main` must be created manually, and the portal doesn't guide users through the remaining workflow.

**Proposed Solution:**

### Automated PR Creation (Optional/Configurable)

When user clicks **"Submit for Production Review"** after UAT approval:

| Mode                    | Behaviour                                                                               |
| ----------------------- | --------------------------------------------------------------------------------------- |
| **Auto** (configurable) | Portal calls GitHub API to create PR `develop` → `main` with pre-filled compliance body |
| **Guided** (default)    | Portal shows step-by-step instructions with copy-paste commands                         |
| **Hybrid**              | Portal creates PR as draft, user manually marks ready for review                        |

**New Portal UI Section:** "Next Steps After UAT Approval"

```
┌─────────────────────────────────────────────────────────┐
│  ✅ UAT Approved                                        │
│                                                         │
│  Next: Submit for Production Review                     │
│                                                         │
│  [Create Production PR]  ← auto or guided             │
│                                                         │
│  Or manually:                                          │
│  1. Run: gh pr create --base main --head develop ...    │
│  2. Link PR in release ticket                           │
│  3. Click "Mark as Submitted" when done                 │
│                                                         │
│  [View Checklist] [Mark as Submitted]                   │
└─────────────────────────────────────────────────────────┘
```

**State Machine:**

```
UAT_APPROVED
    ↓ (user clicks "Submit for Production Review")
PROD_PR_PENDING
    ↓ (PR created & linked)
PROD_REVIEW_PENDING ← checklist becomes editable here
    ↓ (human reviewer approves)
READY_FOR_DEPLOY
    ↓ (merge to main)
DEPLOYED
```

**New API Endpoints:**

```
POST /api/releases/{id}/prod-pr          # Create or link production PR
GET  /api/releases/{id}/workflow-state   # Current state + next actions
```

**GitHub Integration:**

- Use `gh pr create` or GitHub API to create PR
- Pre-fill PR body from release ticket template
- Auto-populate reviewer checklist from portal state

## Open Questions

1. **Source of Truth:** Should portal DB be primary (Git is read-only) or bidirectional sync?
2. **Strict Mode:** Should this be org-level config or per-release override?
3. **Notifications:** Alert release owner when reviewer completes checklist?
4. **Audit Trail:** Do we need a separate `release_checklist_audit_log` table?
5. **Auto-PR Creation:** Should this be default-on, default-off, or org-configurable?

---

## Related Artifacts

- Current release ticket template: `compliance/pending-releases/RELEASE-TICKET-REQ-081.md`
- SDLC workflow: `.windsurf/workflows/audit-finish.md`
- Existing portal release page: (internal link)

---

## Next Steps

1. **Submit to DevAudit installer repo** as feature request
2. **Portal team** to estimate UI effort
3. **Decide on bidirectional sync approach** (technical spike needed)
4. **Schedule for next infrastructure sprint**

---

_Documented by: OpenAI Codex_  
_Date: 2026-06-17_  
_Ref: REQ-081 follow-up tooling improvement_
