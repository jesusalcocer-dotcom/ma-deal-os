#!/usr/bin/env bash
#
# autonomous-runner.sh — Launch Claude Code for autonomous phase building
#
# Usage:
#   ./scripts/autonomous-runner.sh [phase_number]
#
# If phase_number is not provided, reads from BUILD_STATE.json
#
# This script:
# 1. Checks BUILD_STATE.json for current phase
# 2. Validates environment (env vars, dependencies)
# 3. Launches Claude Code with the appropriate context
# 4. Monitors for session timeouts and restarts if needed
#

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# ========================================
# COLORS
# ========================================
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
log_ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
log_warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# ========================================
# DETERMINE CURRENT PHASE
# ========================================
if [ -n "${1:-}" ]; then
  PHASE="$1"
  log_info "Phase override: $PHASE"
else
  if [ ! -f BUILD_STATE.json ]; then
    log_error "BUILD_STATE.json not found. Cannot determine current phase."
    exit 1
  fi
  PHASE=$(python3 -c "import json; print(json.load(open('BUILD_STATE.json'))['current_phase'])" 2>/dev/null)
  if [ -z "$PHASE" ]; then
    log_error "Could not read current_phase from BUILD_STATE.json"
    exit 1
  fi
  log_info "Current phase from BUILD_STATE.json: $PHASE"
fi

# ========================================
# VALIDATE SKILL FILE EXISTS
# ========================================
SKILL_FILE="skills/phase-$(printf '%02d' $PHASE).md"
if [ ! -f "$SKILL_FILE" ]; then
  log_error "Skill file not found: $SKILL_FILE"
  log_error "Available skill files:"
  ls skills/phase-*.md 2>/dev/null || echo "  (none)"
  exit 1
fi
log_ok "Skill file found: $SKILL_FILE"

# ========================================
# VALIDATE ENVIRONMENT
# ========================================
log_info "Validating environment..."

# Check for .env.local
if [ ! -f .env.local ]; then
  log_warn ".env.local not found at repo root"
  if [ -f apps/web/.env.local ]; then
    log_info "Found apps/web/.env.local, copying to repo root"
    cp apps/web/.env.local .env.local
  else
    log_error "No .env.local found anywhere. Create one with required credentials."
    exit 1
  fi
fi

# Source env vars for checking
set -a
source .env.local 2>/dev/null || true
set +a

# Check critical env vars
MISSING_VARS=()
[ -z "${NEXT_PUBLIC_SUPABASE_URL:-}" ] && MISSING_VARS+=("NEXT_PUBLIC_SUPABASE_URL")
[ -z "${SUPABASE_SERVICE_ROLE_KEY:-}" ] && MISSING_VARS+=("SUPABASE_SERVICE_ROLE_KEY")
[ -z "${ANTHROPIC_API_KEY:-}" ] && MISSING_VARS+=("ANTHROPIC_API_KEY")

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
  log_error "Missing required environment variables:"
  for var in "${MISSING_VARS[@]}"; do
    echo "  - $var"
  done
  exit 1
fi
log_ok "Environment variables present"

# Check pnpm
if ! command -v pnpm &> /dev/null; then
  log_error "pnpm not found. Install: npm install -g pnpm"
  exit 1
fi
log_ok "pnpm available"

# Check node
if ! command -v node &> /dev/null; then
  log_error "node not found"
  exit 1
fi
NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
  log_error "Node.js $NODE_VERSION found, need 18+"
  exit 1
fi
log_ok "Node.js v$(node -v)"

# Check git clean
GIT_STATUS=$(git status --porcelain)
if [ -n "$GIT_STATUS" ]; then
  log_warn "Working directory not clean:"
  echo "$GIT_STATUS" | head -10
  echo ""
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

# ========================================
# PRE-FLIGHT CHECKS
# ========================================
log_info "Running pre-flight checks..."

# Verify Supabase connectivity
SUPABASE_CHECK=$(curl -s -o /dev/null -w "%{http_code}" \
  "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/deals?select=count&limit=0" \
  -H "apikey: ${SUPABASE_SERVICE_ROLE_KEY}" \
  -H "Authorization: Bearer ${SUPABASE_SERVICE_ROLE_KEY}" \
  2>/dev/null)

if [ "$SUPABASE_CHECK" = "200" ] || [ "$SUPABASE_CHECK" = "206" ]; then
  log_ok "Supabase connection verified"
else
  log_error "Supabase connection failed (HTTP $SUPABASE_CHECK)"
  log_error "Check NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY"
  exit 1
fi

# Verify Anthropic API key (lightweight check)
ANTHROPIC_CHECK=$(curl -s -o /dev/null -w "%{http_code}" \
  "https://api.anthropic.com/v1/messages" \
  -H "x-api-key: ${ANTHROPIC_API_KEY}" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-sonnet-4-5-20250929","max_tokens":1,"messages":[{"role":"user","content":"hi"}]}' \
  2>/dev/null)

if [ "$ANTHROPIC_CHECK" = "200" ]; then
  log_ok "Anthropic API key verified"
elif [ "$ANTHROPIC_CHECK" = "401" ]; then
  log_error "Anthropic API key invalid (401)"
  exit 1
else
  log_warn "Anthropic API returned HTTP $ANTHROPIC_CHECK (may be rate limited, continuing)"
fi

# Install dependencies if needed
if [ ! -d node_modules ]; then
  log_info "Installing dependencies..."
  pnpm install
fi

# ========================================
# DISPLAY BUILD STATE
# ========================================
echo ""
echo "============================================"
echo "  M&A DEAL OS — AUTONOMOUS BUILD"
echo "============================================"
echo ""
echo "  Phase:        $PHASE"
echo "  Skill file:   $SKILL_FILE"

if [ -f BUILD_STATE.json ]; then
  STEP=$(python3 -c "import json; print(json.load(open('BUILD_STATE.json')).get('current_step', 1))" 2>/dev/null)
  LAST=$(python3 -c "import json; print(json.load(open('BUILD_STATE.json')).get('last_completed_step', 'None'))" 2>/dev/null)
  BLOCKERS=$(python3 -c "import json; b=json.load(open('BUILD_STATE.json')).get('blocking_issues', []); print(len(b))" 2>/dev/null)
  echo "  Current step: $STEP"
  echo "  Last done:    $LAST"
  echo "  Blockers:     $BLOCKERS"
fi

echo ""
echo "============================================"
echo ""

# ========================================
# CHECK FOR GUIDANCE
# ========================================
if [ -f GUIDANCE.md ]; then
  log_info "GUIDANCE.md found:"
  echo "---"
  cat GUIDANCE.md
  echo "---"
  echo ""
fi

# ========================================
# LAUNCH PROMPT
# ========================================
log_info "Ready to launch Claude Code."
echo ""
echo "Launch command:"
echo ""
echo "  claude --print \"Start session. Read BUILD_STATE.json, check for GUIDANCE.md, read skills/phase-$(printf '%02d' $PHASE).md, and resume building from current step.\""
echo ""
echo "Or interactively:"
echo ""
echo "  claude"
echo ""
echo "Then tell Claude:"
echo "  Start session. Read BUILD_STATE.json and the skill file for the current phase. Resume building."
echo ""

# ========================================
# OPTIONAL: AUTO-LAUNCH
# ========================================
if [ "${AUTO_LAUNCH:-}" = "true" ]; then
  log_info "AUTO_LAUNCH=true, launching Claude Code..."
  exec claude --print "Start session. Read BUILD_STATE.json, check for GUIDANCE.md, read $SKILL_FILE, and resume building from the current step. Follow the build-test-commit loop in CLAUDE.md."
fi

log_info "Run with AUTO_LAUNCH=true to auto-launch Claude Code."
