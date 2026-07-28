#!/bin/bash
# Post-deploy smoke test for Fat Big Quiz
# Verifies key endpoints return expected data on production.
# Usage: ./scripts/smoke-test.sh [base_url]
#
# Exit codes:
#   0 = all checks passed
#   1 = one or more checks failed

BASE_URL="${1:-https://fatbigquiz.com}"
API_URL="${BASE_URL}"
PASS=0
FAIL=0
WARN=0

green() { echo -e "\033[32m$1\033[0m"; }
red() { echo -e "\033[31m$1\033[0m"; }
yellow() { echo -e "\033[33m$1\033[0m"; }

check() {
  local name="$1"
  local url="$2"
  local expected_min="$3"   # minimum expected items (for JSON arrays)
  local jq_filter="$4"      # jq filter to count items

  local response
  local http_code

  http_code=$(curl -s -o /tmp/smoke-response.json -w "%{http_code}" "$url" 2>/dev/null)

  if [ "$http_code" != "200" ]; then
    red "  FAIL: $name - HTTP $http_code ($url)"
    FAIL=$((FAIL + 1))
    return 1
  fi

  if [ -n "$jq_filter" ] && command -v jq &> /dev/null; then
    local count
    count=$(jq "$jq_filter" /tmp/smoke-response.json 2>/dev/null)
    if [ -z "$count" ] || [ "$count" = "null" ]; then
      red "  FAIL: $name - could not parse response"
      FAIL=$((FAIL + 1))
      return 1
    elif [ "$count" -lt "$expected_min" ]; then
      red "  FAIL: $name - expected at least $expected_min items, got $count"
      FAIL=$((FAIL + 1))
      return 1
    else
      green "  PASS: $name ($count items)"
      PASS=$((PASS + 1))
      return 0
    fi
  else
    green "  PASS: $name (HTTP 200)"
    PASS=$((PASS + 1))
    return 0
  fi
}

check_html() {
  local name="$1"
  local url="$2"
  local search_text="$3"

  local http_code
  http_code=$(curl -s -o /tmp/smoke-response.html -w "%{http_code}" "$url" 2>/dev/null)

  if [ "$http_code" != "200" ]; then
    red "  FAIL: $name - HTTP $http_code ($url)"
    FAIL=$((FAIL + 1))
    return 1
  fi

  if [ -n "$search_text" ]; then
    if grep -q "$search_text" /tmp/smoke-response.html; then
      green "  PASS: $name (found expected content)"
      PASS=$((PASS + 1))
      return 0
    else
      red "  FAIL: $name - missing expected text: '$search_text'"
      FAIL=$((FAIL + 1))
      return 1
    fi
  else
    green "  PASS: $name (HTTP 200)"
    PASS=$((PASS + 1))
    return 0
  fi
}

echo ""
echo "============================================"
echo "  Fat Big Quiz - Post-Deploy Smoke Test"
echo "  $(date '+%Y-%m-%d %H:%M:%S')"
echo "  Target: $BASE_URL"
echo "============================================"
echo ""

# ── Pages ──────────────────────────────────────
echo "Pages:"
check_html "Homepage" "$BASE_URL/" "Fat Big Quiz"
check_html "Events listing" "$BASE_URL/events" "Live Events"
check_html "Shop" "$BASE_URL/shop" ""
check_html "Blog" "$BASE_URL/blog" ""
check_html "Hire" "$BASE_URL/hire" ""

echo ""

# ── API endpoints ──────────────────────────────
echo "API Endpoints:"
check "Homepage cards (public)" "$API_URL/api/homepage-cards/public" 5 "length"
check "Events products" "$API_URL/ev/api/products" 15 "length"
check "Blog posts" "$API_URL/api/blog" 1 ".posts | length"
check "Health check" "$API_URL/api/health" 0 ""

echo ""

# ── Critical API responses ─────────────────────
echo "Data Integrity:"

# Check homepage cards have required fields
if command -v jq &> /dev/null; then
  curl -s "$API_URL/api/homepage-cards/public" > /tmp/smoke-cards.json 2>/dev/null
  cards_with_title=$(jq '[.[] | select(.title != null and .title != "")] | length' /tmp/smoke-cards.json 2>/dev/null)
  cards_with_href=$(jq '[.[] | select(.href != null and .href != "")] | length' /tmp/smoke-cards.json 2>/dev/null)
  total_cards=$(jq 'length' /tmp/smoke-cards.json 2>/dev/null)

  if [ "$cards_with_title" = "$total_cards" ] && [ "$total_cards" -gt 0 ]; then
    green "  PASS: All $total_cards homepage cards have titles"
    PASS=$((PASS + 1))
  else
    red "  FAIL: Some homepage cards missing titles ($cards_with_title/$total_cards)"
    FAIL=$((FAIL + 1))
  fi

  if [ "$cards_with_href" = "$total_cards" ] && [ "$total_cards" -gt 0 ]; then
    green "  PASS: All $total_cards homepage cards have links"
    PASS=$((PASS + 1))
  else
    red "  FAIL: Some homepage cards missing links ($cards_with_href/$total_cards)"
    FAIL=$((FAIL + 1))
  fi

  # Check events have packages
  curl -s "$API_URL/ev/api/products" > /tmp/smoke-events.json 2>/dev/null
  events_with_packages=$(jq '[.[] | select(.packages | length > 0)] | length' /tmp/smoke-events.json 2>/dev/null)
  total_events=$(jq 'length' /tmp/smoke-events.json 2>/dev/null)

  if [ "$events_with_packages" -gt 0 ]; then
    green "  PASS: $events_with_packages/$total_events events have booking packages"
    PASS=$((PASS + 1))
  else
    yellow "  WARN: No events have booking packages"
    WARN=$((WARN + 1))
  fi
fi

echo ""

# ── Summary ────────────────────────────────────
echo "============================================"
if [ "$FAIL" -gt 0 ]; then
  red "  RESULT: $FAIL FAILED, $PASS passed, $WARN warnings"
  echo "============================================"
  echo ""
  exit 1
else
  green "  RESULT: All $PASS checks passed ($WARN warnings)"
  echo "============================================"
  echo ""
  exit 0
fi
