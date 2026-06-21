# DEVAUDIT-002: AI Contributor Identification and Mid-Flight Agent Change Tracking

**Status:** Draft - Ready for upstream submission  
**Target Repository:** `metasession-dev/DevAudit-Installer`  
**Priority:** Medium  
**Related:** DEVAUDIT-001 (portal checklist integration)

---

## Problem Statement

### Current Gap 1: AI Contributor Not Clearly Identified in Documentation

While the SDLC mandates `Co-Authored-By` tags in commits and `ai-use-note.md` / `ai-prompts.md` files, the **human-readable identification of the AI contributor** is inconsistent across documentation:

- Release tickets show "AI Tool Used: OpenAI Codex" but this is manually entered
- The `ai-use-note.md` has the tool name, but it's not prominently surfaced in the portal
- GitHub's commit history shows `Co-Authored-By` correctly, but the **traceability from PR → evidence → release ticket** is not automated
- Reviewers cannot quickly verify which AI tool generated which code without diving into individual commits

### Current Gap 2: No Support for Mid-Flight AI Agent Changes

A feature implementation may span multiple sessions. Currently:

- **Session 1:** OpenAI Codex implements initial category cascade
- **Session 2:** Different AI tool (or human) continues with bug fixes
- **Session 3:** Another AI tool handles follow-up PRs

**The Problem:** The SDLC assumes a single AI contributor per REQ. There's no mechanism to:

1. Track that the AI agent **changed mid-implementation**
2. Attribute different parts of the codebase to different AI tools
3. Flag which AI tool was responsible for which commit range
4. Handle handoff documentation between AI agents

**Real-world example from REQ-081:**

- PR #389: Initial cascade (OpenAI Codex)
- PR #390: AC11 cross-category search (OpenAI Codex)
- PR #391: Category picker bypass fix (OpenAI Codex)
- PR #392: Express browse gate fix (OpenAI Codex)

All correctly attributed, but **manual**. If the user had switched to Claude or GitHub Copilot for #391-#392, there would be no systematic way to capture this change.

---

## Proposed Solution

### Part 1: Standardized AI Contributor Identification

**New Required Field in `ai-use-note.md`:**

```yaml
---
ai_contributors:
  - tool: 'OpenAI Codex'
    version: 'cascade-2024-06'
    session_id: 'cascade-13654549920348561833'
    date_range: '2026-06-15 to 2026-06-17'
    commits: ['b7c1d29', '5a538f6', '6023325', '02c6bee']
  - tool: 'Claude' # example: mid-flight change
    version: 'claude-3.5-sonnet'
    session_id: 'claude-987654321'
    date_range: '2026-06-18'
    commits: ['abc1234']
---
```

**Portal Enhancement:**

- Display AI contributor badge prominently on release page
- Link to `ai-use-note.md` with parsed contributor list
- Show tool icon/logo for quick visual identification

### Part 2: Mid-Flight AI Agent Change Detection

**New Git Hook: `prepare-commit-msg`**

Detects if the AI tool signature has changed since last commit:

```bash
# Check if Co-Authored-By tag differs from previous commit
LAST_AI=$(git log -1 --format='%an <%ae>' --grep='Co-Authored-By')
CURRENT_AI=$(cat .devin/session-metadata.json | jq -r '.ai_tool')

if [ "$LAST_AI" != "$CURRENT_AI" ]; then
  echo "⚠️  AI tool change detected: $LAST_AI → $CURRENT_AI"
  echo "Consider creating an ai-agent-handoff.md entry"
fi
```

**New Evidence File: `ai-agent-handoff.md`** (optional, for mid-flight changes)

```markdown
# AI Agent Handoff Log — REQ-081

## Handoff 1

**Date:** 2026-06-17  
**From:** OpenAI Codex (session cascade-13654549920348561833)  
**To:** Claude (session claude-987654321)

**Context Summary:**

- Completed: Category cascade implementation, AC11 cross-category search
- In Progress: Follow-up bug fixes for search bypass
- Blockers: None

**Files Modified by Previous Agent:**

- `app/dashboard/orders/express/create-order/page.tsx`
- `components/features/admin/category-cascade-filter.tsx`
- `components/features/admin/menu-items-client.tsx`

**Next Steps for New Agent:**

- Fix express browse gate (canBrowseItems logic)
- Update empty-state messages for cross-category search
- Verify TypeScript compilation

**Link to Full Context:**

- Previous session: https://metasession.io/sessions/cascade-13654549920348561833
- REQ-081 release ticket: `compliance/pending-releases/RELEASE-TICKET-REQ-081.md`
```

### Part 3: Automated AI Attribution in Portal

**New API Endpoint:**

```
GET /api/releases/{id}/ai-contributors
```

**Response:**

```json
{
  "primary_contributor": {
    "tool": "OpenAI Codex",
    "sessions": ["cascade-13654549920348561833"],
    "commit_count": 6,
    "percentage": 100
  },
  "handoffs": [],
  "verification_status": "verified"
}
```

**Portal UI Enhancement:**

```
┌─────────────────────────────────────────┐
│  🤖 AI Contributors                     │
│                                         │
│  Primary: OpenAI Codex (6 commits)      │
│  [View ai-use-note.md]                  │
│  [View ai-prompts.md]                   │
│                                         │
│  Status: ✅ Verified via Co-Authored-By │
└─────────────────────────────────────────┘
```

---

## Acceptance Criteria

1. `ai-use-note.md` schema supports multiple AI contributors with date ranges
2. Git hook warns when Co-Authored-By signature changes mid-branch
3. Optional `ai-agent-handoff.md` template exists for manual handoff documentation
4. Portal displays AI contributor information prominently on release page
5. AI attribution is verified against actual commit history (not just claimed)
6. Release ticket template updated to show AI contributors section

---

## Open Questions

1. Should the portal **auto-detect** AI tool from commit history, or trust the YAML metadata?
2. Should mid-flight AI changes **require** an `ai-agent-handoff.md` file, or be optional?
3. How do we handle **mixed human + AI** contributions in the same REQ?
4. Should there be a **standardized format** for AI tool identification (like `tool@provider.com`)?
5. How do we verify the AI tool version/tag when the session ends and metadata is lost?

---

## Related Work

- DEVAUDIT-001: Portal-managed reviewer checklist (complementary UI work)
- Current SDLC: `ai-use-note.md` and `ai-prompts.md` requirements in `3-compile-evidence.md`
- Git: `Co-Authored-By` trailer convention

---

_Documented by: OpenAI Codex_  
_Date: 2026-06-17_  
_Session: cascade-13654549920348561833_
