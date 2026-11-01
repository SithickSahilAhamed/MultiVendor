#!/usr/bin/env bash
# ARCH-002 stack guard: production backend entrypoint must be Sunfara.Api;
# quarantined Node deploy stubs must not start Express as the active command.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
fail() { echo "ASSERT FAIL: $*" >&2; exit 1; }
pass() { echo "OK: $*"; }

# --- Authoritative Docker / Railway ---
grep -q 'ENTRYPOINT \["dotnet", "Sunfara.Api.dll"\]' "$ROOT/Dockerfile" \
  || fail "Dockerfile ENTRYPOINT must be dotnet Sunfara.Api.dll"
pass "Dockerfile ENTRYPOINT is Sunfara.Api"

grep -q '"dockerfilePath": "Dockerfile"' "$ROOT/railway.json" \
  || fail "railway.json must use Dockerfile builder"
grep -q 'dotnet Sunfara.Api.dll' "$ROOT/railway.json" \
  || fail "railway.json startCommand must be dotnet Sunfara.Api.dll"
pass "railway.json targets Sunfara.Api via Dockerfile"

# --- Quarantined Node paths must not actively start Express ---
if grep -Eq '^[[:space:]]*web:[[:space:]]*node[[:space:]]+server\.js' "$ROOT/Procfile"; then
  fail "Procfile still starts node server.js"
fi
grep -Eq 'QUARANTINED|exit 1' "$ROOT/Procfile" || fail "Procfile missing quarantine fail-closed marker"
pass "Procfile does not start Express"

if grep -Eq 'startCommand:[[:space:]]*npm start' "$ROOT/render.yaml"; then
  fail "render.yaml still has npm start"
fi
grep -Eq 'QUARANTINED|services: \[\]' "$ROOT/render.yaml" || fail "render.yaml not neutralized"
pass "render.yaml neutralized"

# vercel.json must not build server.js
if grep -q '"src":[[:space:]]*"server.js"' "$ROOT/vercel.json"; then
  fail "vercel.json still builds server.js"
fi
pass "vercel.json does not build server.js"

# package.json default start must not be node server.js
START_SCRIPT="$(node -e "console.log(require('$ROOT/package.json').scripts.start || '')")"
case "$START_SCRIPT" in
  *'node server.js'|*'node server-production.js') fail "package.json start still launches Express" ;;
esac
pass "package.json start is quarantined"

# Frontend hosting SoT
grep -q '"public": "sunfara"' "$ROOT/firebase.json" || fail "firebase.json public must be sunfara"
grep -q 'base = "sunfara"' "$ROOT/netlify.toml" || fail "netlify.toml base must be sunfara"
pass "Firebase/Netlify public base is sunfara/"

# Local API port alignment (ARCH-003)
grep -q 'localhost:5187' "$ROOT/sunfara-backend-dotnet/src/Sunfara.Api/Properties/launchSettings.json" \
  || fail "launchSettings.json must bind localhost:5187"
grep -q "localhost:5187/api" "$ROOT/sunfara/index.html" \
  || fail "sunfara/index.html must target localhost:5187/api"
pass "Local API URL aligned on :5187"

echo "All authoritative-stack assertions passed."
