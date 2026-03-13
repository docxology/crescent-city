#!/usr/bin/env bash
# weekly-check.sh — Automated municipal code change detection
#
# Run this weekly (e.g., Sunday nights via cron) to detect upstream changes
# to the Crescent City municipal code on ecode360.com.
#
# Usage:
#   ./scripts/weekly-check.sh
#
# Cron example (Sunday at 2 AM):
#   0 2 * * 0 cd /path/to/crescent-city && ./scripts/weekly-check.sh
#
# This script:
#   1. Runs the monitor to check local data integrity
#   2. Logs results to output/weekly-check.log
#   3. Exits with code 1 if changes detected

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
LOG_FILE="${PROJECT_DIR}/output/weekly-check.log"

# Ensure output directory exists
mkdir -p "${PROJECT_DIR}/output"

# Header
echo "=== Weekly Check: $(date -Iseconds) ===" | tee -a "$LOG_FILE"

# Run monitor
echo "Running change detection monitor..." | tee -a "$LOG_FILE"
cd "$PROJECT_DIR"

if bun run monitor 2>&1 | tee -a "$LOG_FILE"; then
  echo "Monitor completed successfully." | tee -a "$LOG_FILE"
else
  echo "ERROR: Monitor failed." | tee -a "$LOG_FILE"
  exit 1
fi

# Check report
REPORT="${PROJECT_DIR}/output/monitor-report.json"
if [ -f "$REPORT" ]; then
  STATUS=$(bun -e "const r = JSON.parse(require('fs').readFileSync('$REPORT','utf-8')); console.log(r.overallStatus)")
  echo "Status: $STATUS" | tee -a "$LOG_FILE"
  if [ "$STATUS" = "changed" ]; then
    echo "⚠️  Changes detected! Review output/monitor-report.json" | tee -a "$LOG_FILE"
    exit 1
  fi
else
  echo "WARNING: No report generated." | tee -a "$LOG_FILE"
  exit 1
fi

echo "✅ All clear — no changes detected." | tee -a "$LOG_FILE"
echo "" >> "$LOG_FILE"
