#!/bin/bash
# cron-setup.sh — Install scheduled monitoring for Crescent City Intelligence
#
# macOS: installs a Launchd plist that runs weekly-check every Sunday at 07:00 local.
# Linux: adds a cron job for the current user (every Sunday at 07:00).
#
# Usage:
#   bash scripts/cron-setup.sh [--dry-run]
#
# To remove:
#   macOS: launchctl unload ~/Library/LaunchAgents/com.crescentcity.weekly-check.plist
#   Linux: crontab -e  → delete the crescent-city line

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
DRY_RUN="${1:-}"

echo "=== Crescent City Intelligence — Cron Setup ==="
echo "Project: $PROJECT_DIR"
echo ""

# ─── macOS Launchd ────────────────────────────────────────────────
if [[ "$(uname)" == "Darwin" ]]; then
    PLIST_DIR="$HOME/Library/LaunchAgents"
    PLIST_FILE="$PLIST_DIR/com.crescentcity.weekly-check.plist"
    LOG_DIR="$PROJECT_DIR/output/logs"

    mkdir -p "$PLIST_DIR" "$LOG_DIR"

    PLIST_CONTENT="<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<!DOCTYPE plist PUBLIC \"-//Apple//DTD PLIST 1.0//EN\" \"http://www.apple.com/DTDs/PropertyList-1.0.dtd\">
<plist version=\"1.0\">
<dict>
    <key>Label</key>
    <string>com.crescentcity.weekly-check</string>

    <key>ProgramArguments</key>
    <array>
        <string>/bin/bash</string>
        <string>-c</string>
        <string>cd '$PROJECT_DIR' && bun run weekly-check >> '$LOG_DIR/weekly-check.log' 2>&1</string>
    </array>

    <key>StartCalendarInterval</key>
    <dict>
        <key>Weekday</key>
        <integer>0</integer>
        <key>Hour</key>
        <integer>7</integer>
        <key>Minute</key>
        <integer>0</integer>
    </dict>

    <key>StandardOutPath</key>
    <string>$LOG_DIR/weekly-check.stdout.log</string>

    <key>StandardErrorPath</key>
    <string>$LOG_DIR/weekly-check.stderr.log</string>

    <key>WorkingDirectory</key>
    <string>$PROJECT_DIR</string>

    <key>EnvironmentVariables</key>
    <dict>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin</string>
    </dict>
</dict>
</plist>"

    if [[ "$DRY_RUN" == "--dry-run" ]]; then
        echo "[DRY RUN] Would write plist to: $PLIST_FILE"
        echo "$PLIST_CONTENT"
    else
        echo "$PLIST_CONTENT" > "$PLIST_FILE"
        # Unload first if already loaded (ignore errors)
        launchctl unload "$PLIST_FILE" 2>/dev/null || true
        launchctl load -w "$PLIST_FILE"
        echo "✅ Launchd job installed: $PLIST_FILE"
        echo "   Runs: Every Sunday at 07:00 local time"
        echo "   Logs: $LOG_DIR/weekly-check.log"
        echo ""
        echo "To test immediately:   launchctl start com.crescentcity.weekly-check"
        echo "To remove:             launchctl unload $PLIST_FILE && rm $PLIST_FILE"
    fi

# ─── Linux cron ──────────────────────────────────────────────────
elif [[ "$(uname)" == "Linux" ]]; then
    LOG_DIR="$PROJECT_DIR/output/logs"
    mkdir -p "$LOG_DIR"

    CRON_LINE="0 7 * * 0 cd '$PROJECT_DIR' && bun run weekly-check >> '$LOG_DIR/weekly-check.log' 2>&1 # crescent-city"

    if [[ "$DRY_RUN" == "--dry-run" ]]; then
        echo "[DRY RUN] Would add cron line:"
        echo "  $CRON_LINE"
    else
        # Remove any existing crescent-city lines, then add new one
        (crontab -l 2>/dev/null | grep -v "# crescent-city"; echo "$CRON_LINE") | crontab -
        echo "✅ Cron job installed for $(whoami)"
        echo "   Runs: Every Sunday at 07:00 server time"
        echo "   Logs: $LOG_DIR/weekly-check.log"
        echo ""
        echo "To view:   crontab -l | grep crescent-city"
        echo "To remove: crontab -l | grep -v '# crescent-city' | crontab -"
    fi

else
    echo "⚠️  Unsupported OS: $(uname)"
    echo "   Manually schedule: bun run weekly-check"
    exit 1
fi

echo ""
echo "=== Setup Complete ==="
