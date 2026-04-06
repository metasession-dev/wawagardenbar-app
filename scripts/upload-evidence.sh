#!/usr/bin/env bash
# @requirement REQ-007 - CLI upload script for CI pipelines
# @requirement REQ-020 - Extended with release/environment/category flags
#
# Usage:
#   ./scripts/upload-evidence.sh <project-slug> <requirement-id> <evidence-type> <file-or-directory>
#
# Optional flags:
#   --git-sha <sha>        Git commit SHA
#   --ci-run-id <id>       CI run identifier
#   --branch <branch>      Git branch name
#   --release <version>    Release version (e.g. v1.0.0) — resolves to release UUID
#   --create-release-if-missing  Auto-create the release as 'draft' if it doesn't exist
#   --environment <env>    Environment: uat or production
#   --category <cat>       Evidence category: ci_pipeline, local_dev, planning, test_report, security_scan, release_artifact
#
# Environment variables (required):
#   SUPABASE_URL           Supabase project URL
#   SUPABASE_SERVICE_ROLE_KEY  Service role key for authentication
#
# Examples:
#   ./scripts/upload-evidence.sh meta-ats REQ-001 screenshot compliance/evidence/REQ-001/screenshots/
#   ./scripts/upload-evidence.sh meta-ats _compliance-docs compliance_document compliance/RTM.md --git-sha abc123
#   ./scripts/upload-evidence.sh meta-ats REQ-001 e2e_result playwright-report/ --release v1.0.0 --environment uat --category ci_pipeline

set -euo pipefail

# --- Parse arguments ---
if [ "$#" -lt 4 ]; then
  echo "Usage: $0 <project-slug> <requirement-id> <evidence-type> <file-or-directory> [--git-sha <sha>] [--ci-run-id <id>] [--branch <branch>]"
  exit 1
fi

PROJECT_SLUG="$1"
REQUIREMENT_ID="$2"
EVIDENCE_TYPE="$3"
FILE_PATH="$4"
shift 4

GIT_SHA=""
CI_RUN_ID=""
BRANCH=""
RELEASE_VERSION=""
CREATE_RELEASE_IF_MISSING=false
ENVIRONMENT=""
EVIDENCE_CATEGORY=""

while [ "$#" -gt 0 ]; do
  case "$1" in
    --git-sha) GIT_SHA="$2"; shift 2 ;;
    --ci-run-id) CI_RUN_ID="$2"; shift 2 ;;
    --branch) BRANCH="$2"; shift 2 ;;
    --release) RELEASE_VERSION="$2"; shift 2 ;;
    --create-release-if-missing) CREATE_RELEASE_IF_MISSING=true; shift ;;
    --environment) ENVIRONMENT="$2"; shift 2 ;;
    --category) EVIDENCE_CATEGORY="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

# --- Validate: --environment requires --release ---
if [ -n "$ENVIRONMENT" ] && [ -z "$RELEASE_VERSION" ]; then
  echo "Error: --environment requires --release (evidence without a release is orphaned)"
  exit 1
fi

# --- Validate: --category required with --release ---
if [ -n "$RELEASE_VERSION" ] && [ -z "$EVIDENCE_CATEGORY" ]; then
  echo "Error: --category is required when --release is specified (evidence must be categorised for gate validation)"
  exit 1
fi

# --- Validate environment ---
if [ -z "${SUPABASE_URL:-}" ]; then
  echo "Error: SUPABASE_URL environment variable is required"
  exit 1
fi
if [ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ]; then
  echo "Error: SUPABASE_SERVICE_ROLE_KEY environment variable is required"
  exit 1
fi

# --- Build metadata JSON ---
METADATA="{}"
if [ -n "$GIT_SHA" ] || [ -n "$CI_RUN_ID" ] || [ -n "$BRANCH" ]; then
  METADATA="{"
  FIRST=true
  if [ -n "$GIT_SHA" ]; then
    METADATA="${METADATA}\"gitSha\":\"${GIT_SHA}\""
    FIRST=false
  fi
  if [ -n "$CI_RUN_ID" ]; then
    [ "$FIRST" = false ] && METADATA="${METADATA},"
    METADATA="${METADATA}\"ciRunId\":\"${CI_RUN_ID}\""
    FIRST=false
  fi
  if [ -n "$BRANCH" ]; then
    [ "$FIRST" = false ] && METADATA="${METADATA},"
    METADATA="${METADATA}\"branch\":\"${BRANCH}\""
  fi
  METADATA="${METADATA}}"
fi

# --- Look up project ID from slug ---
PROJECT_ID=$(curl -s "${SUPABASE_URL}/rest/v1/compliance_projects?slug=eq.${PROJECT_SLUG}&select=id" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$PROJECT_ID" ]; then
  echo "Error: Project '${PROJECT_SLUG}' not found in META-COMPLY"
  exit 1
fi

echo "Project: ${PROJECT_SLUG} (${PROJECT_ID})"

# --- Resolve release version to UUID (optional) ---
RELEASE_ID=""
if [ -n "$RELEASE_VERSION" ]; then
  RELEASE_ID=$(curl -s "${SUPABASE_URL}/rest/v1/compliance_releases?project_id=eq.${PROJECT_ID}&version=eq.${RELEASE_VERSION}&select=id" \
    -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4 || true)

  if [ -z "$RELEASE_ID" ]; then
    if [ "$CREATE_RELEASE_IF_MISSING" = true ]; then
      echo "Release '${RELEASE_VERSION}' not found — creating as draft"
      CREATE_RESPONSE=$(curl -s \
        -X POST "${SUPABASE_URL}/rest/v1/compliance_releases" \
        -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
        -H "Content-Type: application/json" \
        -H "Prefer: return=representation" \
        -d "{
          \"project_id\": \"${PROJECT_ID}\",
          \"version\": \"${RELEASE_VERSION}\",
          \"branch\": \"${BRANCH:-develop}\",
          \"status\": \"draft\"
        }")
      RELEASE_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
      if [ -z "$RELEASE_ID" ]; then
        echo "Error: Failed to create release '${RELEASE_VERSION}'"
        echo "Response: ${CREATE_RESPONSE}"
        exit 1
      fi
      echo "Release created: ${RELEASE_VERSION} (${RELEASE_ID})"
    else
      echo "Error: Release '${RELEASE_VERSION}' not found in META-COMPLY"
      echo "Use --create-release-if-missing to auto-create it"
      exit 1
    fi
  else
    echo "Release: ${RELEASE_VERSION} (${RELEASE_ID})"
  fi
fi

# --- Collect files ---
FILES=()
if [ -d "$FILE_PATH" ]; then
  while IFS= read -r -d '' f; do
    FILES+=("$f")
  done < <(find "$FILE_PATH" -type f -print0)
else
  FILES=("$FILE_PATH")
fi

if [ ${#FILES[@]} -eq 0 ]; then
  echo "Error: No files found at $FILE_PATH"
  exit 1
fi

# --- Upload each file ---
SUCCEEDED=0
FAILED=0
TOTAL_SIZE=0

for FILE in "${FILES[@]}"; do
  FILENAME=$(basename "$FILE")
  MIME_TYPE=$(file --mime-type -b "$FILE")
  FILE_SIZE=$(stat -c%s "$FILE" 2>/dev/null || stat -f%z "$FILE")

  # Determine storage path
  if [ "$EVIDENCE_TYPE" = "compliance_document" ]; then
    STORAGE_PATH="${PROJECT_SLUG}/_compliance-docs/${FILENAME}"
  else
    STORAGE_PATH="${PROJECT_SLUG}/${REQUIREMENT_ID}/${FILENAME}"
  fi

  echo -n "Uploading ${FILENAME}... "

  # Upload to Supabase Storage
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
    -X POST "${SUPABASE_URL}/storage/v1/object/compliance-evidence/${STORAGE_PATH}" \
    -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
    -H "Content-Type: ${MIME_TYPE}" \
    -H "x-upsert: $([ "$EVIDENCE_TYPE" = "compliance_document" ] && echo "true" || echo "false")" \
    --data-binary "@${FILE}")

  if [ "$HTTP_CODE" -ge 200 ] && [ "$HTTP_CODE" -lt 300 ]; then
    # Build JSON payload with optional release/environment/category fields
    JSON_PAYLOAD="{
        \"project_id\": \"${PROJECT_ID}\",
        \"requirement_id\": \"$([ "$EVIDENCE_TYPE" = "compliance_document" ] && echo "_compliance-docs" || echo "$REQUIREMENT_ID")\",
        \"evidence_type\": \"${EVIDENCE_TYPE}\",
        \"file_path\": \"${STORAGE_PATH}\",
        \"file_name\": \"${FILENAME}\",
        \"file_size_bytes\": ${FILE_SIZE},
        \"mime_type\": \"${MIME_TYPE}\",
        \"metadata\": ${METADATA}"
    [ -n "$RELEASE_ID" ] && JSON_PAYLOAD="${JSON_PAYLOAD}, \"release_id\": \"${RELEASE_ID}\""
    [ -n "$ENVIRONMENT" ] && JSON_PAYLOAD="${JSON_PAYLOAD}, \"environment\": \"${ENVIRONMENT}\""
    [ -n "$EVIDENCE_CATEGORY" ] && JSON_PAYLOAD="${JSON_PAYLOAD}, \"evidence_category\": \"${EVIDENCE_CATEGORY}\""
    JSON_PAYLOAD="${JSON_PAYLOAD}}"

    # Create metadata row via PostgREST
    ROW_CODE=$(curl -s -o /dev/null -w "%{http_code}" \
      -X POST "${SUPABASE_URL}/rest/v1/compliance_evidence" \
      -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
      -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
      -H "Content-Type: application/json" \
      -H "Prefer: return=minimal" \
      -d "$JSON_PAYLOAD")

    if [ "$ROW_CODE" -ge 200 ] && [ "$ROW_CODE" -lt 300 ]; then
      echo "OK (${FILE_SIZE} bytes)"
      SUCCEEDED=$((SUCCEEDED + 1))
      TOTAL_SIZE=$((TOTAL_SIZE + FILE_SIZE))
    else
      echo "FAILED (metadata: HTTP ${ROW_CODE})"
      FAILED=$((FAILED + 1))
    fi
  else
    echo "FAILED (storage: HTTP ${HTTP_CODE})"
    FAILED=$((FAILED + 1))
  fi
done

# --- Summary ---
echo ""
echo "=== Upload Summary ==="
echo "Files: ${SUCCEEDED} succeeded, ${FAILED} failed (${#FILES[@]} total)"
echo "Total size: $((TOTAL_SIZE / 1024)) KB"

if [ "$FAILED" -gt 0 ]; then
  exit 1
fi
