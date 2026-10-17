#!/usr/bin/env bash
# E2E regression reliability hook (wawagardenbar-app#925, closes #832 again).
#
# Extension point consumed by .github/workflows/e2e-regression.yml's "E2E
# Regression Tests" step (devaudit-installer#928) — when this file exists,
# the workflow hands it full ownership of running the tests and exits with
# whatever status this script exits with. It does NOT own
# e2e-regression-metadata.json's outcome/completed_at/exit_code — the
# calling workflow step merges those in itself, based on this script's exit
# code. This script only writes `sharded`/`shard_count` onto the existing
# metadata file (never clobbers target_url/started_at written earlier).
#
# Background: #832 (Sep 2026) diagnosed the unsharded full regression run
# (585 tests, 1 Playwright worker, ~38-40min) as accumulated
# process/DB-connection degradation from one long-lived `next dev` + Mongo
# pool — a different unrelated spec fails each run, isolated reruns of the
# same specs pass clean, and the failure rate scales with total tests
# executed rather than correlating with a specific position or a host
# ceiling. The fix was to shard: restart the dev server fresh between
# shards, breaking the long-lived-process pattern without a DB reset per
# shard.
#
# That fix originally lived only in `.devaudit-patches/e2e-regression.yml.patch`
# because this hook extension point didn't exist upstream yet. The
# 2026-10-16 devaudit sync to 1.8.0 reshaped the generated workflow enough
# that the patch could no longer apply; the sync silently skipped it with a
# warning, the rest of the sync completed, and the workflow quietly reverted
# to the stock unsharded template. #925 confirmed the regression on
# 2026-10-17: unsharded run, 40-minute exit-124 timeout, cgroup
# memory.events.high = 415,707 (cgroup v2 memory.high reclaim stalls, not an
# OOM kill) with memory.peak ~23.6GB against a 24G ceiling.
#
# This script ports that fix into the now-available hook, so it survives
# future template reshapes without needing a hand-rolled patch to keep
# re-applying.

set -uo pipefail

PROJECT="${PROJECT:-regression}"
SPECS="${SPECS:-}"
JSON_OUTPUT_NAME="${PLAYWRIGHT_JSON_OUTPUT_NAME:-e2e-regression-results.json}"

# Only the full, unscoped `regression` run (deployment_status, or an
# unscoped workflow_dispatch) qualifies for sharding. The critical tier is
# already fast and warmed; a scoped workflow_dispatch run is by definition
# small. Neither hits the accumulated-degradation failure class #832/#925
# diagnosed.
SHARDED=false
if [ "$PROJECT" = "regression" ] && [ -z "$SPECS" ]; then
  SHARDED=true
fi

# Process-group-safe stop. `kill "$PID"` only signals the single tracked
# PID — if that PID is a wrapper (e.g. `npm run dev` spawning `next dev` as
# a child), the actual server process is never signaled and accumulates as
# an orphan across job runs until the host's memory cap is hit (this is
# exactly what caused the runner's week-long Oct 9-16 crash/restart loop
# per #925's root-cause chain). `set -m` on the start side puts the
# backgrounded job in its own process group so `kill -TERM -- "-$PID"`
# (negative PID = process group) reaches every descendant; the plain
# `kill -TERM "$PID"` and `pkill -9 -P` fallbacks cover shells/runners where
# the process-group signal doesn't apply.
stop_server() {
  local pid="$1"
  [ -n "$pid" ] || return 0
  kill -TERM -- "-${pid}" 2>/dev/null || kill -TERM "$pid" 2>/dev/null || true
  sleep 2
  pkill -9 -P "$pid" 2>/dev/null || true
  kill -9 "$pid" 2>/dev/null || true
}

warm_routes() {
  grep -ohrE "page\.goto\('/[^']*'\)" e2e/ \
    | sed -E "s/page\.goto\('(.*)'\)/\1/" \
    | sed -E 's/\?.*//' \
    | sort -u \
    | while read -r route; do
        curl -sf -o /dev/null --max-time 20 "http://localhost:3000$route" || true
      done
}

if [ "$SHARDED" != "true" ]; then
  # Critical / scoped dispatch path — the calling workflow step already
  # started, waited for, and warmed the dev server before invoking this
  # hook (see e2e-regression.yml's "Start dev server" / "Wait for dev
  # server" / "Warm up dev-compiled routes" steps). Just run the tests
  # against it, same shape as the no-hook fallback this replaces.
  if [ -n "$SPECS" ]; then
    echo "::notice::Running scoped regression — project=$PROJECT specs=$SPECS"
    # shellcheck disable=SC2086
    timeout --signal=TERM --kill-after=60s 40m npx playwright test --project="$PROJECT" --reporter=json,html $SPECS
  else
    echo "::notice::Running project=$PROJECT"
    timeout --signal=TERM --kill-after=60s 40m npx playwright test --project="$PROJECT" --reporter=json,html
  fi
  exit $?
fi

# Sharded full-regression path.
SHARD_COUNT="${SHARD_COUNT:-4}"
SHARD_TIMEOUT_MINUTES="${SHARD_TIMEOUT_MINUTES:-12}"

echo "::notice::Sharding full regression run into $SHARD_COUNT shards (~${SHARD_TIMEOUT_MINUTES}min/shard, dev server restarted between shards)"

# Stop the server the outer workflow steps already started — sharding
# manages its own server lifecycle per shard, so free the port first.
if [ -f .e2e-server.pid ]; then
  stop_server "$(cat .e2e-server.pid)"
  rm -f .e2e-server.pid
fi

OVERALL_STATUS=0
OVERALL_OUTCOME="passed"

for i in $(seq 1 "$SHARD_COUNT"); do
  echo "::group::Shard $i/$SHARD_COUNT"

  echo "Starting dev server for shard $i"
  set -m
  npm run dev > "e2e-server-shard-${i}.log" 2>&1 &
  SERVER_PID=$!
  set +m
  echo "$SERVER_PID" > .e2e-server.pid
  echo "Started E2E server pid $SERVER_PID for shard $i"

  timeout --signal=TERM --kill-after=15s 150s npx wait-on http://localhost:3000 --timeout 120000
  WAIT_STATUS=$?
  if [ "$WAIT_STATUS" -ne 0 ]; then
    echo "::error::Dev server for shard $i did not become ready in time"
    stop_server "$SERVER_PID"
    rm -f .e2e-server.pid
    echo "::endgroup::"
    OVERALL_STATUS=1
    OVERALL_OUTCOME="failed"
    continue
  fi

  warm_routes

  SHARD_STATUS=0
  PLAYWRIGHT_JSON_OUTPUT_NAME="e2e-regression-results-shard-${i}.json" \
  PLAYWRIGHT_HTML_OUTPUT_DIR="playwright-report-shard-${i}" \
    timeout --signal=TERM --kill-after=60s "${SHARD_TIMEOUT_MINUTES}m" \
    npx playwright test --project=regression --shard="${i}/${SHARD_COUNT}" \
      --reporter=json,html --output="test-results-shard-${i}" || SHARD_STATUS=$?
  echo "Shard $i/$SHARD_COUNT exit status: $SHARD_STATUS"

  echo "Stopping dev server for shard $i"
  stop_server "$SERVER_PID"
  rm -f .e2e-server.pid

  if [ "$SHARD_STATUS" -eq 124 ]; then
    OVERALL_OUTCOME="timed_out"
    OVERALL_STATUS=124
    echo "::error::Shard $i/$SHARD_COUNT exceeded its ${SHARD_TIMEOUT_MINUTES}-minute execution budget."
  elif [ "$SHARD_STATUS" -ne 0 ] && [ "$OVERALL_STATUS" -ne 124 ]; then
    OVERALL_OUTCOME="failed"
    OVERALL_STATUS=1
  fi
  echo "::endgroup::"
done

echo "Merging $SHARD_COUNT shard JSON reports into $JSON_OUTPUT_NAME"
if ls e2e-regression-results-shard-*.json >/dev/null 2>&1; then
  jq -s '.' e2e-regression-results-shard-*.json > "$JSON_OUTPUT_NAME" \
    || echo "::warning::failed to merge shard JSON reports (malformed shard output?)"
fi

# Annotate (never clobber) the metadata file the calling workflow step
# already created with target_url/started_at/etc, and will still merge
# outcome/completed_at/exit_code into after this script exits.
if [ -f e2e-regression-metadata.json ]; then
  jq --argjson sharded true --argjson shardCount "$SHARD_COUNT" \
    '. + {sharded: $sharded, shard_count: $shardCount}' \
    e2e-regression-metadata.json > e2e-regression-metadata.tmp \
    && mv e2e-regression-metadata.tmp e2e-regression-metadata.json
fi

echo "Sharded run overall outcome: $OVERALL_OUTCOME (status $OVERALL_STATUS)"
exit "$OVERALL_STATUS"
