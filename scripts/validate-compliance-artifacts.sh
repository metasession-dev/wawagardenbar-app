#!/bin/bash
# validate-compliance-artifacts.sh — Validates compliance artifacts exist on PRs to main.
#
# Usage:
#   ./scripts/validate-compliance-artifacts.sh [base-branch]
#
# Checks that PRs containing tracked requirement commits have the required
# compliance artifacts (test-scope, RTM entry, release ticket, etc.).
# Designed to run as a CI job on PRs to main.
#
# Install: cp this file to your project's scripts/ directory && chmod +x scripts/validate-compliance-artifacts.sh

set -euo pipefail

BASE_BRANCH="${1:-origin/main}"
EXIT_CODE=0

echo "=== Compliance Artifact Validation ==="
echo "Comparing: $BASE_BRANCH...HEAD"
echo ""

# Extract REQ-XXX references from commits in this PR
REQUIREMENTS=$(git log "$BASE_BRANCH"..HEAD --format='%B' | grep -oP 'REQ-\d+' | sort -u || true)

if [ -z "$REQUIREMENTS" ]; then
  echo "No REQ-XXX references found in PR commits — skipping artifact validation."
  echo "If this PR contains tracked requirements, ensure commits include 'Ref: REQ-XXX'."
  exit 0
fi

echo "Requirements found in PR commits: $REQUIREMENTS"
echo ""

for REQ in $REQUIREMENTS; do
  echo "--- Checking $REQ ---"

  # Check evidence directory exists
  if [ ! -d "compliance/evidence/$REQ" ]; then
    echo "  ERROR: Evidence directory missing: compliance/evidence/$REQ/"
    EXIT_CODE=1
    continue
  fi
  echo "  OK: Evidence directory exists"

  # Check test-scope.md exists
  if [ ! -f "compliance/evidence/$REQ/test-scope.md" ]; then
    echo "  ERROR: Test scope missing: compliance/evidence/$REQ/test-scope.md"
    EXIT_CODE=1
  else
    echo "  OK: test-scope.md exists"
  fi

  # Check test-plan.md exists
  if [ ! -f "compliance/evidence/$REQ/test-plan.md" ]; then
    echo "  ERROR: Test plan missing: compliance/evidence/$REQ/test-plan.md"
    EXIT_CODE=1
  else
    echo "  OK: test-plan.md exists"

    # Verify test files referenced in test-plan.md exist in the tree
    TEST_FILES=$(grep -oP '(?:__tests__/|tests?/|e2e/|spec/|\.test\.|\.spec\.)\S+' "compliance/evidence/$REQ/test-plan.md" 2>/dev/null \
      | sed 's/[`),.;:]*$//' | sort -u || true)
    if [ -n "$TEST_FILES" ]; then
      MISSING_TESTS=0
      for TF in $TEST_FILES; do
        # Try exact path, then search from repo root
        if [ ! -f "$TF" ] && ! compgen -G "**/$TF" > /dev/null 2>&1; then
          echo "  ERROR: Test file referenced in test-plan.md not found: $TF"
          MISSING_TESTS=$((MISSING_TESTS + 1))
        fi
      done
      if [ "$MISSING_TESTS" -gt 0 ]; then
        echo "  ERROR: $MISSING_TESTS test file(s) from test-plan.md missing — tests must be written before merge"
        EXIT_CODE=1
      else
        echo "  OK: All test files referenced in test-plan.md exist"
      fi
    fi
  fi

  # Check test-execution-summary.md exists
  if [ ! -f "compliance/evidence/$REQ/test-execution-summary.md" ]; then
    echo "  WARNING: Test execution summary missing: compliance/evidence/$REQ/test-execution-summary.md"
  else
    echo "  OK: test-execution-summary.md exists"
  fi

  # Check RTM entry exists and has correct status
  if grep -q "$REQ" compliance/RTM.md 2>/dev/null; then
    if grep "$REQ" compliance/RTM.md | grep -q "TESTED - PENDING SIGN-OFF"; then
      echo "  OK: RTM status is TESTED - PENDING SIGN-OFF"
    elif grep "$REQ" compliance/RTM.md | grep -q "APPROVED"; then
      echo "  OK: RTM status is APPROVED"
    else
      echo "  WARNING: RTM entry exists but status is not TESTED - PENDING SIGN-OFF"
    fi
  else
    echo "  ERROR: No RTM entry found for $REQ in compliance/RTM.md"
    EXIT_CODE=1
  fi

  # Check release ticket exists
  TICKET_PATTERN="compliance/pending-releases/RELEASE-TICKET-${REQ}*"
  APPROVED_PATTERN="compliance/approved-releases/RELEASE-TICKET-${REQ}*"
  if compgen -G "$TICKET_PATTERN" > /dev/null 2>&1 || compgen -G "$APPROVED_PATTERN" > /dev/null 2>&1; then
    echo "  OK: Release ticket exists"
  else
    echo "  ERROR: Release ticket missing: compliance/pending-releases/RELEASE-TICKET-${REQ}.md"
    EXIT_CODE=1
  fi

  # Check implementation-plan.md for MEDIUM/HIGH risk (check RTM for risk level)
  if grep "$REQ" compliance/RTM.md 2>/dev/null | grep -qiE 'MEDIUM|HIGH'; then
    if [ ! -f "compliance/evidence/$REQ/implementation-plan.md" ]; then
      echo "  ERROR: Implementation plan missing for MEDIUM/HIGH risk: compliance/evidence/$REQ/implementation-plan.md"
      EXIT_CODE=1
    else
      echo "  OK: implementation-plan.md exists (MEDIUM/HIGH risk)"
    fi

    # Check AI prompt log for MEDIUM/HIGH with AI involvement
    if [ -f "compliance/evidence/$REQ/ai-use-note.md" ] && [ ! -f "compliance/evidence/$REQ/ai-prompts.md" ]; then
      echo "  WARNING: AI use noted but ai-prompts.md missing for MEDIUM/HIGH risk"
    fi
  fi

  echo ""
done

# Check that RTM was updated in this PR
if git diff --name-only "$BASE_BRANCH"...HEAD | grep -q 'compliance/RTM.md'; then
  echo "OK: compliance/RTM.md was updated in this PR"
else
  echo "WARNING: compliance/RTM.md was not modified in this PR"
fi

echo ""
if [ $EXIT_CODE -eq 0 ]; then
  echo "=== All compliance artifact checks passed ==="
else
  echo "=== FAILED: Missing required compliance artifacts ==="
fi

exit $EXIT_CODE
