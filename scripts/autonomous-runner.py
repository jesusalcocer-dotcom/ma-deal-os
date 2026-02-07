#!/usr/bin/env python3
"""
autonomous-runner.py V2 — Stream-JSON Bidirectional Architecture

Maintains persistent Claude Code sessions (Build Agent + Supervisor) using
stream-json stdin/stdout pipes. The runner monitors build output in real-time,
injects course corrections mid-session, and escalates to the Supervisor when needed.

Protocol: --input-format stream-json --output-format stream-json --verbose
Tested and confirmed working with claude CLI v2.0.56.

Usage:
  python scripts/autonomous-runner.py                      # Start building
  python scripts/autonomous-runner.py --max-turns 50       # Limit turns
  python scripts/autonomous-runner.py --dry-run             # Pre-flight only
  python scripts/autonomous-runner.py --no-supervisor       # Skip supervisor
  python scripts/autonomous-runner.py --max-cost 100        # Cost cap ($)
"""

from __future__ import annotations

import argparse
import json
import os
import shutil
import signal
import subprocess
import sys
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

# ============================================================
# Constants
# ============================================================

REPO_ROOT = Path(__file__).resolve().parent.parent
BUILD_STATE_FILE = REPO_ROOT / "BUILD_STATE.json"
GUIDANCE_FILE = REPO_ROOT / "GUIDANCE.md"
NEEDS_HUMAN_FILE = REPO_ROOT / "NEEDS_HUMAN.md"
SKILLS_DIR = REPO_ROOT / "skills"
SYMLINK_PATH = SKILLS_DIR / "current-phase.md"
SUPERVISOR_LOG_DIR = REPO_ROOT / "docs" / "supervisor-log"

REQUIRED_ENV_VARS = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "ANTHROPIC_API_KEY",
]

CONFIG = {
    "max_turns": 200,
    "stuck_no_commit_seconds": 900,         # 15 min
    "consecutive_errors_threshold": 3,
    "max_no_progress_for_escalation": 2,     # 2 turns same step → escalate
    "max_supervisor_calls_per_step": 3,
    "max_supervisor_cost_usd": 20.0,
    "needs_human_poll_seconds": 120,
    "claude_model": "claude-opus-4-6",
}

# ============================================================
# ANSI Colors
# ============================================================

class C:
    RED = "\033[0;31m"
    GREEN = "\033[0;32m"
    YELLOW = "\033[0;33m"
    BLUE = "\033[0;34m"
    MAGENTA = "\033[0;35m"
    BOLD = "\033[1m"
    NC = "\033[0m"

# ============================================================
# Graceful Shutdown
# ============================================================

shutdown_requested = False

def handle_sigint(signum, frame):
    global shutdown_requested
    if shutdown_requested:
        print("\nForce quit.")
        sys.exit(1)
    shutdown_requested = True
    print("\nCtrl+C — finishing current turn, then stopping...")

signal.signal(signal.SIGINT, handle_sigint)

# ============================================================
# Logging — dual output to terminal + build_log.txt
# ============================================================

def _write_log(line: str):
    """Append a line to build_log.txt."""
    try:
        with open(REPO_ROOT / "build_log.txt", "a") as f:
            f.write(line + "\n")
    except OSError:
        pass

def log_info(msg: str):
    ts = datetime.now().strftime("%H:%M:%S")
    display = f"[{ts}] {C.BLUE}[RUNNER]{C.NC} {msg}"
    print(display, flush=True)
    _write_log(f"[{ts}] [RUNNER] {msg}")

def log_ok(msg: str):
    ts = datetime.now().strftime("%H:%M:%S")
    display = f"[{ts}] {C.GREEN}[OK]{C.NC} {msg}"
    print(display, flush=True)
    _write_log(f"[{ts}] [OK] {msg}")

def log_warn(msg: str):
    ts = datetime.now().strftime("%H:%M:%S")
    display = f"[{ts}] {C.YELLOW}[WARN]{C.NC} {msg}"
    print(display, flush=True)
    _write_log(f"[{ts}] [WARN] {msg}")

def log_error(msg: str):
    ts = datetime.now().strftime("%H:%M:%S")
    display = f"[{ts}] {C.RED}[ERROR]{C.NC} {msg}"
    print(display, flush=True)
    _write_log(f"[{ts}] [ERROR] {msg}")

def log_build_line(line: str):
    """Log a build agent output line."""
    if not line:
        return
    ts = datetime.now().strftime("%H:%M:%S")
    display = f"[{ts}] [BUILD] {line}"
    print(display, flush=True)
    _write_log(f"[{ts}] [BUILD] {line}")

def log_supervisor_line(line: str):
    """Log a supervisor output line."""
    if not line:
        return
    ts = datetime.now().strftime("%H:%M:%S")
    display = f"[{ts}] {C.MAGENTA}[SUPERVISOR]{C.NC} {line}"
    print(display, flush=True)
    _write_log(f"[{ts}] [SUPERVISOR] {line}")
    # Also write to supervisor-specific log
    try:
        SUPERVISOR_LOG_DIR.mkdir(parents=True, exist_ok=True)
        with open(SUPERVISOR_LOG_DIR / "supervisor_log.txt", "a") as f:
            f.write(f"[{ts}] [SUPERVISOR] {line}\n")
    except OSError:
        pass

def log_status(state: dict, cost: float, turn: int):
    phase = state.get("current_phase", "?")
    step = state.get("current_step", "?")
    line = f"\n[STATUS] Phase {phase} | Step {step} | Turn {turn} | Cost: ${cost:.2f}\n"
    print(line, flush=True)
    _write_log(line.strip())

# ============================================================
# Helpers
# ============================================================

def load_build_state() -> dict[str, Any]:
    if not BUILD_STATE_FILE.exists():
        log_error("BUILD_STATE.json not found.")
        sys.exit(1)
    with open(BUILD_STATE_FILE) as f:
        return json.load(f)

def git_pull():
    try:
        subprocess.run(
            ["git", "pull", "origin", "main"],
            cwd=REPO_ROOT, capture_output=True, text=True, timeout=30,
        )
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
        pass

def update_symlink(phase: int):
    target = f"phase-{phase:02d}.md"
    target_path = SKILLS_DIR / target
    if not target_path.exists():
        log_warn(f"Skill file {target} does not exist; skipping symlink update.")
        return
    if SYMLINK_PATH.is_symlink() or SYMLINK_PATH.exists():
        SYMLINK_PATH.unlink()
    SYMLINK_PATH.symlink_to(target)

def load_env_file() -> dict[str, str]:
    env_path = REPO_ROOT / ".env.local"
    if not env_path.exists():
        alt = REPO_ROOT / "apps" / "web" / ".env.local"
        if alt.exists():
            shutil.copy2(alt, env_path)
        else:
            log_error("No .env.local found.")
            sys.exit(1)
    env_vars: dict[str, str] = {}
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if "=" in line:
                key, _, value = line.partition("=")
                key = key.strip()
                value = value.strip().strip("'\"")
                env_vars[key] = value
                os.environ[key] = value
    return env_vars

# ============================================================
# Stream-JSON Protocol
# ============================================================

def format_event(event: dict) -> str | None:
    """Extract human-readable text from a stream-json event."""
    etype = event.get("type")

    if etype == "assistant":
        msg = event.get("message", {})
        parts = []
        for block in msg.get("content", []):
            if block.get("type") == "text":
                text = block.get("text", "")
                if text:
                    parts.append(text)
            elif block.get("type") == "tool_use":
                name = block.get("name", "unknown")
                parts.append(f"[tool: {name}]")
        return " ".join(parts) if parts else None

    if etype == "result":
        result_text = event.get("result", "")
        if result_text:
            # Truncate long results
            if len(result_text) > 200:
                return result_text[:200] + "..."
            return result_text
        return "[turn complete]"

    return None


def send_message(proc: subprocess.Popen, text: str):
    """Send a user message to a stream-json process."""
    message = json.dumps({
        "type": "user",
        "message": {
            "role": "user",
            "content": [{"type": "text", "text": text}]
        }
    }) + "\n"
    proc.stdin.write(message)
    proc.stdin.flush()


def read_until_complete(proc: subprocess.Popen, on_line=None) -> dict:
    """
    Read stdout lines until we get a 'result' event.
    Returns dict with events, result, session_id, cost_usd, process_died.
    """
    collected = []
    for line in iter(proc.stdout.readline, ''):
        line = line.strip()
        if not line:
            continue
        try:
            event = json.loads(line)
        except json.JSONDecodeError:
            if on_line:
                on_line(line)
            continue

        collected.append(event)

        # Format and display
        if on_line:
            formatted = format_event(event)
            if formatted:
                on_line(formatted)

        if event.get("type") == "result":
            return {
                "events": collected,
                "result": event,
                "session_id": event.get("session_id"),
                "cost_usd": event.get("total_cost_usd", 0),
                "process_died": False,
            }

    # stdout closed — process died
    return {
        "events": collected,
        "result": None,
        "session_id": None,
        "cost_usd": 0,
        "process_died": True,
    }

# ============================================================
# AgentSession — persistent stream-json session
# ============================================================

class AgentSession:
    """Manages a persistent Claude Code stream-json session."""

    def __init__(self, name: str, initial_prompt: str, model: str = None):
        self.name = name
        self.proc: subprocess.Popen | None = None
        self.initial_prompt = initial_prompt
        self.model = model or CONFIG["claude_model"]
        self.turn_count = 0
        self.total_cost = 0.0
        self.session_id: str | None = None

    def start(self) -> dict:
        """Launch new Claude Code process and send initial prompt."""
        self.proc = subprocess.Popen(
            ["claude", "-p",
             "--output-format", "stream-json",
             "--input-format", "stream-json",
             "--verbose",
             "--dangerously-skip-permissions",
             "--model", self.model],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            cwd=REPO_ROOT,
        )
        self.send(self.initial_prompt)
        result = self.read_response()
        self.session_id = result.get("session_id")
        self.turn_count = 1
        self.total_cost = result.get("cost_usd", 0)
        return result

    def send(self, text: str):
        """Send a user message."""
        if not self.is_alive():
            raise RuntimeError(f"{self.name} session is dead")
        send_message(self.proc, text)

    def read_response(self, on_line=None) -> dict:
        """Read until the assistant turn completes."""
        result = read_until_complete(self.proc, on_line=on_line)
        self.turn_count += 1
        self.total_cost = result.get("cost_usd", 0) or self.total_cost
        return result

    def send_and_read(self, text: str, on_line=None) -> dict:
        """Send a message and read the complete response."""
        self.send(text)
        return self.read_response(on_line=on_line)

    def is_alive(self) -> bool:
        return self.proc is not None and self.proc.poll() is None

    def kill(self):
        if self.proc:
            self.proc.terminate()
            try:
                self.proc.wait(timeout=10)
            except subprocess.TimeoutExpired:
                self.proc.kill()
            self.proc = None

    def restart(self):
        """Kill and start fresh."""
        self.kill()
        return self.start()

# ============================================================
# Session Start with Retry
# ============================================================

def start_session_with_retry(session: AgentSession, max_retries: int = 3) -> dict:
    for attempt in range(max_retries):
        try:
            result = session.start()
            if not result.get("process_died"):
                return result
            log_warn(f"{session.name} process died on start (attempt {attempt + 1})")
        except Exception as e:
            log_warn(f"{session.name} start attempt {attempt + 1} failed: {e}")
        wait = 30 * (2 ** attempt)
        log_info(f"Retrying in {wait}s...")
        time.sleep(wait)

    write_needs_human(f"Failed to start {session.name} session after {max_retries} attempts")
    wait_for_human()
    return start_session_with_retry(session, max_retries)

# ============================================================
# BuildMonitor — real-time output analysis
# ============================================================

class BuildMonitor:
    def __init__(self):
        self.last_commit_time = time.time()
        self.consecutive_errors = 0
        self.output_tail: list[str] = []
        self.pending_intervention: str | None = None

    def process_line(self, line: str):
        """Called for every build agent output line."""
        if not line:
            return

        self.output_tail.append(line)
        if len(self.output_tail) > 100:
            self.output_tail.pop(0)

        # Detect commits
        if "git commit" in line or "git push" in line:
            self.last_commit_time = time.time()
            self.consecutive_errors = 0

        # Detect errors — look for error-like patterns but avoid false positives
        lower = line.lower()
        if any(kw in lower for kw in ["error:", "fatal:", "exception:", "traceback"]):
            self.consecutive_errors += 1
        else:
            self.consecutive_errors = 0

        # Check for interventions
        if self.consecutive_errors >= CONFIG["consecutive_errors_threshold"]:
            self.pending_intervention = "errors"
            self.consecutive_errors = 0

        if time.time() - self.last_commit_time > CONFIG["stuck_no_commit_seconds"]:
            self.pending_intervention = "no_commits"
            self.last_commit_time = time.time()  # Reset to avoid spamming

    def get_tail(self, n: int = 100) -> str:
        return "\n".join(self.output_tail[-n:])

    def reset_turn(self):
        self.pending_intervention = None

# ============================================================
# Course Correction Messages (mid-session injection)
# ============================================================

CORRECTIONS = {
    "errors": (
        "You've hit 3+ consecutive errors on the same operation. "
        "Try a completely different approach. If that doesn't work after one attempt, "
        "commit what you have as [WIP], log the blocker in BUILD_STATE.json blocking_issues, "
        "and move to the next step."
    ),
    "no_commits": (
        "You haven't committed anything in 15+ minutes. "
        "Commit your current progress now even if incomplete. Use [WIP] prefix. "
        "Partial progress committed > perfect progress lost."
    ),
}

# ============================================================
# Escalation Logic
# ============================================================

def should_escalate(state_before: dict, state_after: dict, no_progress_turns: int) -> tuple[bool, str]:
    # Phase transition
    if state_after.get("current_phase", 0) > state_before.get("current_phase", 0):
        return True, "phase_transition"

    # Repeated stuck
    if no_progress_turns >= CONFIG["max_no_progress_for_escalation"]:
        return True, "repeated_stuck"

    # Build broken
    try:
        build = subprocess.run(
            ["pnpm", "build"], capture_output=True, text=True,
            cwd=REPO_ROOT, timeout=120,
        )
        if build.returncode != 0:
            return True, "build_broken"
    except (subprocess.TimeoutExpired, FileNotFoundError):
        log_warn("Could not run pnpm build for escalation check")

    # Multiple blockers
    if len(state_after.get("blocking_issues", [])) >= 3:
        return True, "multiple_blockers"

    return False, "none"


def build_escalation_message(reason: str, context: dict) -> str:
    parts = [f"ESCALATION: {reason}\n"]

    parts.append(f"Phase {context.get('phase')}, Step {context.get('step')}")
    parts.append(f"Consecutive turns with no progress: {context.get('no_progress_turns', 0)}")

    if context.get("output_tail"):
        parts.append(f"\nLast 100 lines of Build Agent output:\n```\n{context['output_tail']}\n```")

    if context.get("blocking_issues"):
        parts.append(f"\nBlocking issues:\n{json.dumps(context['blocking_issues'], indent=2)}")

    if reason == "phase_transition":
        phase = context.get("phase", 0)
        parts.append(f"\nPhase {phase} complete. Review readiness for Phase {phase + 1}.")
        parts.append("Read test report and next skill file. Assess readiness and flag risks.")
    elif reason == "build_broken":
        parts.append(f"\nBuild error output:\n```\n{context.get('build_error', 'unknown')}\n```")

    parts.append("\nFollow your framework: DIAGNOSE -> ROOT CAUSE -> ALTERNATIVES -> DECISION -> ACTION")
    parts.append("Write GUIDANCE.md (or NEEDS_HUMAN.md if beyond scope), commit, push.")

    return "\n\n".join(parts)

# ============================================================
# Escalation Flow
# ============================================================

def escalate_to_supervisor(
    build_session: AgentSession,
    supervisor_session: AgentSession,
    context: dict,
) -> str:
    message = build_escalation_message(context["reason"], context)

    # Ensure supervisor is alive
    if not supervisor_session.is_alive():
        log_info("Supervisor session died. Restarting...")
        start_session_with_retry(supervisor_session)

    log_info("[SUPERVISOR] Sending escalation...")

    # Tell supervisor to git pull first
    full_message = f"First run: git pull origin main\n\nThen handle this:\n\n{message}"
    result = supervisor_session.send_and_read(full_message, on_line=log_supervisor_line)

    log_info(f"[SUPERVISOR] Done. Cost: ${result.get('cost_usd', 0):.2f}")

    # Runner pulls to get GUIDANCE.md or NEEDS_HUMAN.md
    git_pull()

    if NEEDS_HUMAN_FILE.exists():
        return "needs_human"

    # Tell build agent to read guidance
    if build_session.is_alive() and GUIDANCE_FILE.exists():
        build_session.send(
            "Run git pull origin main. Read GUIDANCE.md and follow its instructions. "
            "Delete GUIDANCE.md when done, commit the deletion, then continue building."
        )

    return "guidance_sent"

# ============================================================
# NEEDS_HUMAN Handling
# ============================================================

def write_needs_human(reason: str):
    content = (
        f"# Human Intervention Needed\n\n"
        f"**Generated at:** {datetime.now(timezone.utc).isoformat()}\n"
        f"**Reason:** {reason}\n\n"
        f"Delete this file and push to resume.\n"
    )
    NEEDS_HUMAN_FILE.write_text(content)
    subprocess.run(["git", "add", "NEEDS_HUMAN.md"], cwd=REPO_ROOT, capture_output=True)
    subprocess.run(
        ["git", "commit", "-m", "PAUSED: needs human intervention"],
        cwd=REPO_ROOT, capture_output=True,
    )
    subprocess.run(["git", "push", "origin", "main"], cwd=REPO_ROOT, capture_output=True)


def wait_for_human():
    log_info("=" * 50)
    log_info(" PAUSED — HUMAN INTERVENTION NEEDED")
    log_info(" Read NEEDS_HUMAN.md for details")
    log_info(" Delete the file, commit, and push to resume")
    log_info("=" * 50)

    while True:
        time.sleep(CONFIG["needs_human_poll_seconds"])
        git_pull()
        if not NEEDS_HUMAN_FILE.exists():
            log_info("NEEDS_HUMAN.md removed. Resuming build.")
            return
        log_info(f"Waiting for human... ({datetime.now().strftime('%H:%M')})")

# ============================================================
# Agent Prompts
# ============================================================

BUILD_INIT_PROMPT = """You are the Build Agent for M&A Deal OS. Your job is to build the system phase by phase following the skill files.

PROTOCOL:
1. Run `git pull origin main` first
2. Read BUILD_STATE.json for current phase and step
3. If GUIDANCE.md exists, read it, follow its instructions, then delete it and commit
4. Read the current skill file (skills/current-phase.md)
5. Execute each step following the build-test-commit loop:
   - Build the step
   - Run the specified tests
   - If tests pass: git add, commit with "[Phase X.Y] Description — tests: N/M passing", push
   - If tests fail: retry up to 3 times, then commit as [WIP], log blocker in BUILD_STATE.json
   - Update BUILD_STATE.json current_step after each commit
6. After each step, continue to the next step immediately
7. When a phase is complete:
   - Write test report to docs/test-results/phaseN_test_report.md
   - Update BUILD_STATE.json: increment current_phase, set current_step to 1, add phase to completed_phases
   - Update symlink: cd skills && ln -sf phase-{NN}.md current-phase.md && cd ..
   - Continue to the next phase
8. Never break existing functionality (Phases 0-2)
9. Commit after EVERY step. Small commits, frequent pushes.

Start now."""

BUILD_CONTINUE_PROMPT = (
    "Run git pull origin main. Check for GUIDANCE.md — if it exists, read and follow it, "
    "delete it, commit. Then continue building from where you left off."
)

SUPERVISOR_INIT_PROMPT = """You are the Supervisor Agent for the M&A Deal OS autonomous build.

YOUR ROLE: You oversee a Build Agent (a separate Claude Code session) that follows skill files to build the system phase by phase. You are consulted when the Build Agent gets stuck, and at phase transitions for readiness review.

READ THESE FILES NOW to understand the project:
- CLAUDE.md (build protocol)
- BUILD_STATE.json (current state)
- SPEC.md (full specification — read thoroughly, this is your only chance to read it in full)
- The current skill file referenced in BUILD_STATE.json

WHEN I BRING YOU AN ESCALATION, follow this framework:

1. DIAGNOSE: What exactly failed? Quote the error if provided.
2. ROOT CAUSE: Why? (environment constraint, logic error, dependency missing, spec ambiguity, wrong approach)
3. ALTERNATIVES: List 2-3 approaches with tradeoffs and likelihood of success.
4. DECISION: Which alternative and why. Principles:
   - Progress over perfection: a working stub beats a stuck session
   - Test everything: never skip tests to save time
   - Small commits: partial progress > perfect progress lost
   - Work around environment constraints, don't fight them
   - Never break existing functionality (Phases 0-2)
5. ACTION: Write GUIDANCE.md at repo root with EXACT instructions for the Build Agent (file paths, code patterns, commands). Then git add, commit, and push.

After each decision, append a summary to docs/supervisor-log/decisions.md:

## [YYYY-MM-DD HH:MM] Phase X Step Y — Issue Type
**Diagnosis:** ...
**Alternatives:** ...
**Decision:** ...
**Reasoning:** ...

FOR PHASE TRANSITIONS: Read the test report and next skill file. Confirm readiness or flag risks.

IF BEYOND YOUR SCOPE (spec changes needed, same step 2+ times, credentials issues):
Write NEEDS_HUMAN.md instead. Include what happened, what you considered, specific questions for the human.

Respond with SUPERVISOR READY after reading all files."""

# ============================================================
# Pre-flight Checks
# ============================================================

def run_preflight_checks(skip_api: bool = False) -> dict[str, str]:
    log_info("Running pre-flight checks...")

    # Load env
    env_vars = load_env_file()
    missing = [v for v in REQUIRED_ENV_VARS if not env_vars.get(v) and not os.environ.get(v)]
    if missing:
        log_error(f"Missing env vars: {', '.join(missing)}")
        sys.exit(1)
    log_ok("Environment variables present")

    # Tools
    for tool in ["pnpm", "node", "claude", "git"]:
        if not shutil.which(tool):
            log_error(f"{tool} not found in PATH")
            sys.exit(1)
    log_ok("Required tools available")

    # Node version
    try:
        r = subprocess.run(["node", "-v"], capture_output=True, text=True, timeout=10)
        version = r.stdout.strip().lstrip("v")
        major = int(version.split(".")[0])
        if major < 18:
            log_error(f"Node.js {major} found, need 18+")
            sys.exit(1)
        log_ok(f"Node.js v{version}")
    except Exception:
        log_warn("Could not check Node.js version")

    if not skip_api:
        # Supabase connectivity
        url = env_vars.get("NEXT_PUBLIC_SUPABASE_URL", os.environ.get("NEXT_PUBLIC_SUPABASE_URL", ""))
        key = env_vars.get("SUPABASE_SERVICE_ROLE_KEY", os.environ.get("SUPABASE_SERVICE_ROLE_KEY", ""))
        if url and key:
            try:
                r = subprocess.run(
                    ["curl", "-s", "-o", "/dev/null", "-w", "%{http_code}",
                     f"{url}/rest/v1/deals?select=count&limit=0",
                     "-H", f"apikey: {key}",
                     "-H", f"Authorization: Bearer {key}"],
                    capture_output=True, text=True, timeout=15,
                )
                if r.stdout.strip() in ("200", "206"):
                    log_ok("Supabase connection verified")
                else:
                    log_error(f"Supabase connection failed (HTTP {r.stdout.strip()})")
                    sys.exit(1)
            except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
                log_error("Supabase connection timed out")
                sys.exit(1)

    # Install deps if needed
    if not (REPO_ROOT / "node_modules").exists():
        log_info("Installing dependencies...")
        subprocess.run(["pnpm", "install"], cwd=REPO_ROOT, timeout=300)

    return env_vars

# ============================================================
# CLI Parser
# ============================================================

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="M&A Deal OS — Autonomous Builder V2")
    parser.add_argument("--max-turns", type=int, default=CONFIG["max_turns"])
    parser.add_argument("--dry-run", action="store_true", help="Pre-flight checks only")
    parser.add_argument("--model", type=str, default=CONFIG["claude_model"])
    parser.add_argument("--max-cost", type=float, default=200.0)
    parser.add_argument("--no-supervisor", action="store_true")
    parser.add_argument("--skip-api-checks", action="store_true")
    return parser.parse_args()

# ============================================================
# Main Loop
# ============================================================

def main():
    args = parse_args()
    CONFIG["claude_model"] = args.model

    run_preflight_checks(skip_api=args.skip_api_checks)

    if args.dry_run:
        log_ok("Pre-flight checks passed. Dry run — not launching.")
        state = load_build_state()
        log_info(f"Would start at Phase {state.get('current_phase')}, Step {state.get('current_step')}")
        return

    # Initialize
    git_pull()
    state = load_build_state()
    update_symlink(state.get("current_phase", 3))

    log_info("=" * 50)
    log_info("  M&A DEAL OS — AUTONOMOUS BUILD V2")
    log_info(f"  Starting Phase {state.get('current_phase')}, Step {state.get('current_step')}")
    log_info(f"  Model: {args.model}")
    log_info(f"  Max turns: {args.max_turns}")
    log_info(f"  Max cost: ${args.max_cost:.2f}")
    log_info(f"  Supervisor: {'disabled' if args.no_supervisor else 'enabled'}")
    log_info("=" * 50)

    # Start Build Agent
    log_info("Starting Build Agent...")
    build = AgentSession("build", BUILD_INIT_PROMPT, model=args.model)
    init_result = start_session_with_retry(build)
    log_ok(f"Build Agent ready. Session: {build.session_id}")

    # Start Supervisor (unless disabled)
    supervisor: AgentSession | None = None
    if not args.no_supervisor:
        log_info("Starting Supervisor...")
        supervisor = AgentSession("supervisor", SUPERVISOR_INIT_PROMPT, model=args.model)
        sup_result = start_session_with_retry(supervisor)
        log_ok(f"Supervisor ready. Session: {supervisor.session_id}")

    # Tracking
    monitor = BuildMonitor()
    no_progress_turns = 0
    supervisor_calls_this_step = 0

    for turn in range(args.max_turns):
        if shutdown_requested:
            log_info("Shutdown requested. Cleaning up.")
            break

        # Check completion
        state = load_build_state()
        if state.get("current_phase", 0) > 14 or (REPO_ROOT / "BUILD_COMPLETE").exists():
            log_info("*  *  *  BUILD COMPLETE  *  *  *")
            break

        # Check NEEDS_HUMAN
        if NEEDS_HUMAN_FILE.exists():
            wait_for_human()

        # Check cost limits
        total_cost = build.total_cost + (supervisor.total_cost if supervisor else 0)
        if total_cost > args.max_cost:
            write_needs_human(f"Cost limit reached: ${total_cost:.2f}")
            wait_for_human()

        # Pre-turn
        git_pull()
        state_before = load_build_state()
        monitor.reset_turn()

        # Ensure build session alive
        if not build.is_alive():
            log_warn("Build session died. Starting fresh.")
            build = AgentSession("build", BUILD_INIT_PROMPT, model=args.model)
            start_session_with_retry(build)

        # Send continue prompt
        log_info(f"Turn {turn + 1}/{args.max_turns} — sending continue prompt")
        build.send(BUILD_CONTINUE_PROMPT)

        # Read response with monitoring callback
        def handle_build_line(line):
            log_build_line(line)
            monitor.process_line(line)

        result = build.read_response(on_line=handle_build_line)

        if result.get("process_died"):
            log_warn("Build process died mid-turn. Will restart next iteration.")
            continue

        # Check if monitor detected an issue that needs mid-session injection
        # (This applies for the NEXT turn since the current one just finished)
        if monitor.pending_intervention and monitor.pending_intervention in CORRECTIONS:
            intervention = monitor.pending_intervention
            log_warn(f"Intervention triggered: {intervention}")
            # The build agent's turn just ended, so we can inject a correction
            # as the next message instead of the standard continue prompt
            if build.is_alive():
                build.send(CORRECTIONS[intervention])
                correction_result = build.read_response(on_line=handle_build_line)
                if correction_result.get("process_died"):
                    log_warn("Build process died during correction.")

        # Post-turn
        git_pull()
        state_after = load_build_state()

        # Track progress
        same_step = (
            state_after.get("current_step") == state_before.get("current_step") and
            state_after.get("current_phase") == state_before.get("current_phase")
        )
        if same_step:
            no_progress_turns += 1
        else:
            no_progress_turns = 0
            supervisor_calls_this_step = 0

        # Status
        total_cost = build.total_cost + (supervisor.total_cost if supervisor else 0)
        log_status(state_after, total_cost, turn + 1)

        # Escalation check (only if supervisor enabled)
        if supervisor and not args.no_supervisor:
            should, reason = should_escalate(state_before, state_after, no_progress_turns)

            if should:
                if supervisor_calls_this_step >= CONFIG["max_supervisor_calls_per_step"]:
                    write_needs_human(
                        f"Supervisor consulted {CONFIG['max_supervisor_calls_per_step']} times on "
                        f"Phase {state_after.get('current_phase')} "
                        f"Step {state_after.get('current_step')} with no progress."
                    )
                    wait_for_human()
                    supervisor_calls_this_step = 0
                    continue

                if not supervisor.is_alive():
                    log_info("Supervisor died. Restarting...")
                    supervisor = AgentSession("supervisor", SUPERVISOR_INIT_PROMPT, model=args.model)
                    start_session_with_retry(supervisor)

                context = {
                    "reason": reason,
                    "phase": state_after.get("current_phase"),
                    "step": state_after.get("current_step"),
                    "no_progress_turns": no_progress_turns,
                    "output_tail": monitor.get_tail(),
                    "blocking_issues": state_after.get("blocking_issues", []),
                }

                if reason == "build_broken":
                    try:
                        build_err = subprocess.run(
                            ["pnpm", "build"], capture_output=True, text=True,
                            cwd=REPO_ROOT, timeout=120,
                        )
                        context["build_error"] = (build_err.stderr or build_err.stdout)[-500:]
                    except (subprocess.TimeoutExpired, FileNotFoundError):
                        context["build_error"] = "Could not capture build error"

                esc_result = escalate_to_supervisor(build, supervisor, context)
                supervisor_calls_this_step += 1

                if esc_result == "needs_human":
                    wait_for_human()
                    supervisor_calls_this_step = 0

        # Brief pause between turns
        time.sleep(5)

    # Cleanup
    total_cost = build.total_cost + (supervisor.total_cost if supervisor else 0)
    log_info(f"Runner finished. Total cost: ${total_cost:.2f}")
    build.kill()
    if supervisor:
        supervisor.kill()


if __name__ == "__main__":
    main()
