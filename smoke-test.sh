#!/bin/bash
# FinanceBird — Smoke-Test Script
# Ausführen nach jedem Push: ./smoke-test.sh
# Voraussetzung: FB_LICENSE_KEY als Env-Variable oder im ersten Argument
#
# Usage:
#   FB_LICENSE_KEY=LK-XXXXXXXX ./smoke-test.sh
#   ./smoke-test.sh LK-XXXXXXXX
#
# Erwartet: alle Checks grün. Bei rot → nicht deployen / sofort fixen.

set -euo pipefail

# ── Konfiguration ──────────────────────────────────────────────────────────────
APP_URL="https://financebird.app/financebird_v2.html"
SW_URL="https://financebird.app/sw.js"
WORKER_AUTH="https://financebird-auth.holy-forest-0174.workers.dev"
WORKER_PROXY="https://financebird-proxy.holy-forest-0174.workers.dev"

# Erwartete Versionen: aus lokalen Dateien lesen (= was gerade gepusht wurde)
# Deployed Versionen: aus live URLs lesen
# Test schlägt fehl wenn deployed != lokal → Push nicht angekommen oder falsches File
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOCAL_APP_VERSION=$(grep -o 'fb-version" content="[^"]*"' "$SCRIPT_DIR/financebird_v2.html" 2>/dev/null | grep -o '"[^"]*"$' | tr -d '"' || echo "")
LOCAL_SW_CACHE=$(grep -o "financebird-v[0-9a-z.-]*" "$SCRIPT_DIR/sw.js" 2>/dev/null | head -1 || echo "")

if [ -z "$LOCAL_APP_VERSION" ]; then
  echo "⚠️  Warnung: financebird_v2.html nicht gefunden — bitte smoke-test.sh aus ~/Desktop/app ausführen"
fi

# License Key (für Proxy-Test)
LICENSE_KEY="${1:-${FB_LICENSE_KEY:-}}"

# ── Farben ─────────────────────────────────────────────────────────────────────
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'
PASS="${GREEN}✅ PASS${NC}"
FAIL="${RED}❌ FAIL${NC}"
WARN="${YELLOW}⚠️  WARN${NC}"

FAILURES=0

check() {
  local label="$1"
  local result="$2"
  local expected="$3"
  local actual="$4"
  if [ "$result" = "pass" ]; then
    echo -e "${PASS}  ${label}"
  elif [ "$result" = "warn" ]; then
    echo -e "${WARN}  ${label} (erwartet: ${expected}, gefunden: ${actual})"
  else
    echo -e "${FAIL}  ${label} (erwartet: ${expected}, gefunden: ${actual})"
    FAILURES=$((FAILURES + 1))
  fi
}

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  FinanceBird Smoke-Test — $(date '+%Y-%m-%d %H:%M')"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# ── 1. App erreichbar + Version ───────────────────────────────────────────────
echo "[ App ]"
APP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$APP_URL")
[ "$APP_STATUS" = "200" ] && check "App erreichbar (HTTP 200)" "pass" "" "" || check "App erreichbar" "fail" "200" "$APP_STATUS"

APP_HTML=$(curl -s "$APP_URL")
DEPLOYED_APP_VERSION=$(echo "$APP_HTML" | grep -o 'fb-version" content="[^"]*"' | grep -o '"[^"]*"$' | tr -d '"' || echo "")
DEPLOYED_SW_CACHE_IN_HTML=$(echo "$APP_HTML" | grep -o "financebird-v[0-9a-z.-]*" | head -1 || echo "")
if [ -z "$DEPLOYED_APP_VERSION" ]; then
  check "App Version" "fail" "${LOCAL_APP_VERSION:-?}" "nicht gefunden auf Server"
elif [ -n "$LOCAL_APP_VERSION" ] && [ "$DEPLOYED_APP_VERSION" != "$LOCAL_APP_VERSION" ]; then
  check "App Version — Push nicht angekommen?" "fail" "$LOCAL_APP_VERSION" "$DEPLOYED_APP_VERSION"
else
  check "App Version ($DEPLOYED_APP_VERSION)" "pass" "" ""
fi

# ── 2. Service Worker ─────────────────────────────────────────────────────────
echo ""
echo "[ Service Worker ]"
SW_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$SW_URL")
[ "$SW_STATUS" = "200" ] && check "sw.js erreichbar (HTTP 200)" "pass" "" "" || check "sw.js erreichbar" "fail" "200" "$SW_STATUS"

DEPLOYED_SW_CACHE=$(curl -s "$SW_URL" | grep -o "financebird-v[0-9a-z.-]*" | head -1 || echo "")
if [ -z "$DEPLOYED_SW_CACHE" ]; then
  check "SW Cache-Name" "fail" "${LOCAL_SW_CACHE:-?}" "nicht gefunden auf Server"
elif [ -n "$LOCAL_SW_CACHE" ] && [ "$DEPLOYED_SW_CACHE" != "$LOCAL_SW_CACHE" ]; then
  check "SW Cache-Name — Push nicht angekommen?" "fail" "$LOCAL_SW_CACHE" "$DEPLOYED_SW_CACHE"
elif [ -n "$DEPLOYED_SW_CACHE_IN_HTML" ] && [ "$DEPLOYED_SW_CACHE" != "$DEPLOYED_SW_CACHE_IN_HTML" ]; then
  check "SW ↔ HTML Cache-Name Mismatch" "fail" "$DEPLOYED_SW_CACHE_IN_HTML" "$DEPLOYED_SW_CACHE"
else
  check "SW Cache-Name ($DEPLOYED_SW_CACHE)" "pass" "" ""
fi

# ── 3. Worker B: Auth ─────────────────────────────────────────────────────────
echo ""
echo "[ Worker B: financebird-auth ]"
AUTH_HEALTH=$(curl -s "$WORKER_AUTH/health")
AUTH_OK=$(echo "$AUTH_HEALTH" | grep -o '"ok":true' || echo "")
AUTH_KV=$(echo "$AUTH_HEALTH" | grep -o '"kv":true' || echo "")
AUTH_VER=$(echo "$AUTH_HEALTH" | grep -o '"version":"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"' || echo "")

[ -n "$AUTH_OK" ] && check "Auth Worker health ok" "pass" "" "" || check "Auth Worker health" "fail" "ok:true" "$AUTH_HEALTH"
[ -n "$AUTH_KV" ] && check "Auth Worker KV ok" "pass" "" "" || check "Auth Worker KV" "fail" "kv:true" "$AUTH_HEALTH"
if echo "$AUTH_VER" | grep -qE "^[0-9]+\.[0-9]+\.[0-9]+$"; then
  check "Auth Worker Version ($AUTH_VER)" "pass" "" ""
else
  check "Auth Worker Version" "fail" "Format x.y.z" "${AUTH_VER:-nicht gefunden}"
fi

# License verify — invalid key should return valid:false
LICENSE_RESP=$(curl -s -X POST "$WORKER_AUTH/license/verify" \
  -H "Content-Type: application/json" \
  -H "X-FB-Key: smoke-test-invalid" \
  -d '{"key":"LK-INVALID1"}' || echo "")
# This will return Unauthorized (401) since we don't have the real shared secret — that's correct
AUTH_401=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$WORKER_AUTH/license/verify" \
  -H "Content-Type: application/json" -H "X-FB-Key: wrong" -d '{"key":"LK-TEST"}')
[ "$AUTH_401" = "401" ] && check "Auth shared-secret guard (401 on wrong key)" "pass" "" "" || check "Auth shared-secret guard" "fail" "401" "$AUTH_401"

# OAuth start should redirect (302)
OAUTH_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$WORKER_AUTH/oauth/start?state=smoketest")
[ "$OAUTH_STATUS" = "302" ] && check "OAuth start → 302 redirect" "pass" "" "" || check "OAuth start redirect" "fail" "302" "$OAUTH_STATUS"

# ── 4. Worker A: Proxy ────────────────────────────────────────────────────────
echo ""
echo "[ Worker A: financebird-proxy ]"
PROXY_HEALTH=$(curl -s "$WORKER_PROXY/health")
PROXY_OK=$(echo "$PROXY_HEALTH" | grep -o '"ok":true' || echo "")
PROXY_KV=$(echo "$PROXY_HEALTH" | grep -o '"kv":true' || echo "")
PROXY_VER=$(echo "$PROXY_HEALTH" | grep -o '"version":"[^"]*"' | grep -o '"[^"]*"$' | tr -d '"' || echo "")

[ -n "$PROXY_OK" ] && check "Proxy Worker health ok" "pass" "" "" || check "Proxy Worker health" "fail" "ok:true" "$PROXY_HEALTH"
[ -n "$PROXY_KV" ] && check "Proxy Worker KV ok" "pass" "" "" || check "Proxy Worker KV" "fail" "kv:true" "$PROXY_HEALTH"
if echo "$PROXY_VER" | grep -qE "^[0-9]+\.[0-9]+\.[0-9]+$"; then
  check "Proxy Worker Version ($PROXY_VER)" "pass" "" ""
else
  check "Proxy Worker Version" "fail" "Format x.y.z" "${PROXY_VER:-nicht gefunden}"
fi

# Proxy should reject unauthorized requests (401)
PROXY_401=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$WORKER_PROXY/v1/databases" \
  -H "X-FB-Key: wrong" -H "X-FB-License: LK-INVALID")
[ "$PROXY_401" = "401" ] && check "Proxy shared-secret guard (401 on wrong key)" "pass" "" "" || check "Proxy shared-secret guard" "fail" "401" "$PROXY_401"

# ── 5. Optional: Live-Lizenz-Test ─────────────────────────────────────────────
if [ -n "$LICENSE_KEY" ]; then
  echo ""
  echo "[ Live-Lizenz-Test (${LICENSE_KEY}) ]"
  echo "  (Shared Secret wird für diesen Test benötigt — übersprungen ohne FB_SHARED_SECRET)"
  echo "  Tipp: Setze FB_SHARED_SECRET in .env für vollständigen Test"
fi

# ── Resultat ──────────────────────────────────────────────────────────────────
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ "$FAILURES" -eq 0 ]; then
  echo -e "${GREEN}  Alle Checks bestanden.${NC}"
else
  echo -e "${RED}  ${FAILURES} Check(s) fehlgeschlagen.${NC}"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

exit $FAILURES
