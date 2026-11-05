#!/bin/bash
# Fat Big Quiz - synthetic monitor cron wrapper
# Runs every 15 minutes via root crontab on the FBQ droplet.
#
# Self-healing: copies the monitor script into the container before each run,
# so container recreates (deploys, compose up) never silently kill monitoring.
# Meta-alerting: if the monitor itself fails to execute (container down,
# script missing, node crash), sends a fallback email via Resend so the
# safety net cannot die silently again (it was dead from 27 Aug to 2 Nov 2026).

APP_DIR="/root/fat-big-quiz"
CONTAINER="fatbigquiz_api"
LOG="/var/log/fbq-monitor.log"
STATE="/var/run/fbq-monitor-meta-alert"

ts() { date +"%Y-%m-%d %H:%M:%S"; }

send_meta_alert() {
  local reason="$1"
  # Alert at most once every 6 hours to avoid spam
  if [ -f "$STATE" ] && [ $(( $(date +%s) - $(stat -c %Y "$STATE") )) -lt 21600 ]; then
    echo "$(ts) [RunMonitor] Meta-alert suppressed (sent recently): $reason" >> "$LOG"
    return
  fi
  local resend_key admin_email from_email
  resend_key=$(grep '^RESEND_API_KEY=' "$APP_DIR/.env" | cut -d= -f2-)
  admin_email=$(grep '^ADMIN_EMAIL=' "$APP_DIR/.env" | cut -d= -f2-)
  from_email=$(grep '^RESEND_FROM_EMAIL=' "$APP_DIR/.env" | cut -d= -f2-)
  [ -z "$admin_email" ] && admin_email="laurencedotcomputer@gmail.com"
  [ -z "$from_email" ] && from_email="no-reply@fatbigquiz.com"
  if [ -z "$resend_key" ]; then
    echo "$(ts) [RunMonitor] Cannot send meta-alert, RESEND_API_KEY missing" >> "$LOG"
    return
  fi
  curl -s -X POST "https://api.resend.com/emails" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $resend_key" \
    -d "{\"from\":\"$from_email\",\"to\":\"$admin_email\",\"subject\":\"[FBQ ALERT] Synthetic monitor is not running\",\"text\":\"The FBQ synthetic monitor failed to execute on the server.\n\nReason: $reason\n\nThis means site checks (including the 0-events safety net) are NOT running. Investigate /var/log/fbq-monitor.log on 157.245.42.21.\"}" \
    >> "$LOG" 2>&1
  touch "$STATE"
  echo "$(ts) [RunMonitor] Meta-alert email sent: $reason" >> "$LOG"
}

# 1. Container must be running
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  echo "$(ts) [RunMonitor] Container $CONTAINER is not running" >> "$LOG"
  send_meta_alert "Container $CONTAINER is not running"
  exit 1
fi

# 2. Ensure the monitor script is inside the container (survives recreates)
if [ -f "$APP_DIR/scripts/synthetic-monitor.js" ]; then
  docker cp "$APP_DIR/scripts/synthetic-monitor.js" "$CONTAINER:/app/scripts/synthetic-monitor.js" 2>> "$LOG"
fi

# 3. Run the monitor
OUTPUT=$(docker exec "$CONTAINER" node scripts/synthetic-monitor.js --alert 2>&1)
EXIT_CODE=$?

echo "$OUTPUT" | while IFS= read -r line; do echo "$(ts) $line"; done >> "$LOG"

# 4. Meta-check: exit 2 = fatal crash, or output missing the runner banner
if [ $EXIT_CODE -eq 2 ] || ! echo "$OUTPUT" | grep -q "\[SyntheticMonitor\]"; then
  send_meta_alert "Monitor crashed or produced no output (exit $EXIT_CODE)"
  exit 2
fi

exit $EXIT_CODE
