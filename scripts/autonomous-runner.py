#!/usr/bin/env python3
"""
autonomous-runner.py — Launch and monitor Claude Code for autonomous phase building.

Usage:
  python scripts/autonomous-runner.py                     # Auto-detect phase from BUILD_STATE.json
  python scripts/autonomous-runner.py --phase 3           # Override to specific phase
  python scripts/autonomous-runner.py --resume <id>       # Resume a previous session by ID
  python scripts/autonomous-runner.py --auto-launch       # Skip confirmation, launch immediately
  python scripts/autonomous-runner.py --max-sessions 5    # Cap the number of consecutive sessions
  python scripts/autonomous-runner.py --output-format json # Machine-readable session results

Features beyond the bash version:
  - Session ID tracking and --resume support
  - Cost tracking (estimated from session duration + BUILD_STATE.json)
  - Stuck detection via git commit monitoring
  - Auto-generates GUIDANCE.md when stuck conditions detected
  - Updates skills/current-phase.md symlink between sessions
  - JSON output mode for CI/CD integration
  - Multi-session orchestration with configurable limits
"""

from __future__ import annotations

import argparse
import datetime
import json
import os
import re
import shutil
import subprocess
import sys
import time
import uuid
from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

# ============================================================
# Constants
# ============================================================

REPO_ROOT = Path(__file__).resolve().parent.parent
BUILD_STATE_FILE = REPO_ROOT / "BUILD_STATE.json"
GUIDANCE_FILE = REPO_ROOT / "GUIDANCE.md"
SKILLS_DIR = REPO_ROOT / "skills"
SYMLINK_PATH = SKILLS_DIR / "current-phase.md"
SESSION_LOG_DIR = REPO_ROOT / "docs" / "session-logs"

REQUIRED_ENV_VARS = [
    "NEXT_PUBLIC_SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "ANTHROPIC_API_KEY",
]

# Stuck detection thresholds
STUCK_NO_COMMIT_MINUTES = 15  # No git commit in this many minutes → stuck
STUCK_SAME_STEP_SESSIONS = 3  # Same step across this many sessions → stuck
STUCK_POLL_INTERVAL_SECONDS = 60  # How often to poll git log during a session

# Cost estimation (rough per-minute rates for Claude Code sessions)
ESTIMATED_COST_PER_MINUTE_USD = 0.12

# ============================================================
# Colors (ANSI)
# ============================================================

class C:
    RED = "\033[0;31m"
    GREEN = "\033[0;32m"
    YELLOW = "\033[0;33m"
    BLUE = "\033[0;34m"
    BOLD = "\033[1m"
    NC = "\033[0m"

def log_info(msg: str) -> None:
    print(f"{C.BLUE}[INFO]{C.NC} {msg}", flush=True)

def log_ok(msg: str) -> None:
    print(f"{C.GREEN}[OK]{C.NC} {msg}", flush=True)

def log_warn(msg: str) -> None:
    print(f"{C.YELLOW}[WARN]{C.NC} {msg}", flush=True)

def log_error(msg: str) -> None:
    print(f"{C.RED}[ERROR]{C.NC} {msg}", flush=True)

# ============================================================
# Data Structures
# ============================================================

@dataclass
class SessionResult:
    session_id: str
    phase: int
    step_before: int | None
    step_after: int | None
    status: str  # "completed", "advanced", "stuck", "error", "timeout"
    commits: int
    duration_seconds: float
    estimated_cost_usd: float
    blockers: list[str] = field(default_factory=list)
    guidance_generated: bool = False
    error: str | None = None
    started_at: str = ""
    finished_at: str = ""
    output: str = ""  # Collected stdout for post-session analysis

    def to_dict(self) -> dict[str, Any]:
        d = asdict(self)
        # Exclude raw output from serialized dict to keep JSON logs manageable
        d.pop("output", None)
        return d

# ============================================================
# Helpers
# ============================================================

def run_cmd(
    cmd: list[str] | str,
    *,
    capture: bool = True,
    check: bool = True,
    cwd: Path | None = None,
    timeout: int | None = 30,
    shell: bool = False,
) -> subprocess.CompletedProcess[str]:
    """Run a command and return the result."""
    return subprocess.run(
        cmd,
        capture_output=capture,
        text=True,
        check=check,
        cwd=cwd or REPO_ROOT,
        timeout=timeout,
        shell=shell,
    )

def load_build_state() -> dict[str, Any]:
    """Load and return BUILD_STATE.json."""
    if not BUILD_STATE_FILE.exists():
        log_error("BUILD_STATE.json not found. Cannot determine current phase.")
        sys.exit(1)
    with open(BUILD_STATE_FILE) as f:
        return json.load(f)

def save_build_state(state: dict[str, Any]) -> None:
    """Write BUILD_STATE.json."""
    with open(BUILD_STATE_FILE, "w") as f:
        json.dump(state, f, indent=2)
        f.write("\n")

def skill_file_for_phase(phase: int) -> Path:
    """Return the path to the skill file for a given phase."""
    return SKILLS_DIR / f"phase-{phase:02d}.md"

def update_symlink(phase: int) -> None:
    """Update skills/current-phase.md to point to the correct phase file."""
    target = f"phase-{phase:02d}.md"
    target_path = skill_file_for_phase(phase)
    if not target_path.exists():
        log_warn(f"Skill file {target} does not exist; skipping symlink update.")
        return
    if SYMLINK_PATH.is_symlink() or SYMLINK_PATH.exists():
        SYMLINK_PATH.unlink()
    SYMLINK_PATH.symlink_to(target)
    log_ok(f"Symlink skills/current-phase.md -> {target}")

def load_env_file() -> dict[str, str]:
    """Load .env.local into a dict (does NOT modify os.environ)."""
    env_path = REPO_ROOT / ".env.local"
    if not env_path.exists():
        alt = REPO_ROOT / "apps" / "web" / ".env.local"
        if alt.exists():
            log_info("Found apps/web/.env.local, copying to repo root")
            shutil.copy2(alt, env_path)
        else:
            log_error("No .env.local found. Create one with required credentials.")
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

def get_git_head_sha() -> str | None:
    """Return the current HEAD commit SHA, or None if not a git repo."""
    try:
        r = run_cmd(["git", "rev-parse", "HEAD"])
        return r.stdout.strip()
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
        return None

def get_git_commit_count_since(sha: str) -> int:
    """Count commits since a given SHA."""
    try:
        r = run_cmd(["git", "rev-list", "--count", f"{sha}..HEAD"])
        return int(r.stdout.strip())
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired, ValueError):
        return 0

def get_last_commit_timestamp() -> datetime.datetime | None:
    """Return the timestamp of the most recent git commit."""
    try:
        r = run_cmd(["git", "log", "-1", "--format=%aI"])
        ts = r.stdout.strip()
        if ts:
            return datetime.datetime.fromisoformat(ts)
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
        pass
    return None

# ============================================================
# Validation
# ============================================================

def validate_env_vars(env_vars: dict[str, str]) -> list[str]:
    """Return list of missing required env vars."""
    missing = []
    for var in REQUIRED_ENV_VARS:
        if not env_vars.get(var) and not os.environ.get(var):
            missing.append(var)
    return missing

def validate_tools() -> bool:
    """Check that required CLI tools are available."""
    ok = True

    # pnpm
    if not shutil.which("pnpm"):
        log_error("pnpm not found. Install: npm install -g pnpm")
        ok = False
    else:
        log_ok("pnpm available")

    # node
    node = shutil.which("node")
    if not node:
        log_error("node not found")
        ok = False
    else:
        try:
            r = run_cmd(["node", "-v"])
            version_str = r.stdout.strip().lstrip("v")
            major = int(version_str.split(".")[0])
            if major < 18:
                log_error(f"Node.js {major} found, need 18+")
                ok = False
            else:
                log_ok(f"Node.js v{version_str}")
        except Exception:
            log_warn("Could not determine Node.js version")

    # claude
    if not shutil.which("claude"):
        log_error("claude CLI not found. Install Claude Code first.")
        ok = False
    else:
        log_ok("claude CLI available")

    # git
    if not shutil.which("git"):
        log_error("git not found")
        ok = False
    else:
        log_ok("git available")

    return ok

def check_supabase_connectivity(env_vars: dict[str, str]) -> bool:
    """Verify Supabase is reachable."""
    url = env_vars.get("NEXT_PUBLIC_SUPABASE_URL", os.environ.get("NEXT_PUBLIC_SUPABASE_URL", ""))
    key = env_vars.get("SUPABASE_SERVICE_ROLE_KEY", os.environ.get("SUPABASE_SERVICE_ROLE_KEY", ""))
    if not url or not key:
        return False
    try:
        r = run_cmd(
            [
                "curl", "-s", "-o", "/dev/null", "-w", "%{http_code}",
                f"{url}/rest/v1/deals?select=count&limit=0",
                "-H", f"apikey: {key}",
                "-H", f"Authorization: Bearer {key}",
            ],
            timeout=15,
        )
        code = r.stdout.strip()
        if code in ("200", "206"):
            log_ok("Supabase connection verified")
            return True
        else:
            log_error(f"Supabase connection failed (HTTP {code})")
            return False
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
        log_error("Supabase connection timed out")
        return False

def check_anthropic_key(env_vars: dict[str, str]) -> bool:
    """Lightweight Anthropic API key check."""
    key = env_vars.get("ANTHROPIC_API_KEY", os.environ.get("ANTHROPIC_API_KEY", ""))
    if not key:
        return False
    try:
        r = run_cmd(
            [
                "curl", "-s", "-o", "/dev/null", "-w", "%{http_code}",
                "https://api.anthropic.com/v1/messages",
                "-H", f"x-api-key: {key}",
                "-H", "anthropic-version: 2023-06-01",
                "-H", "content-type: application/json",
                "-d", '{"model":"claude-sonnet-4-5-20250929","max_tokens":1,"messages":[{"role":"user","content":"hi"}]}',
            ],
            timeout=30,
        )
        code = r.stdout.strip()
        if code == "200":
            log_ok("Anthropic API key verified")
            return True
        elif code == "401":
            log_error("Anthropic API key invalid (401)")
            return False
        else:
            log_warn(f"Anthropic API returned HTTP {code} (may be rate limited, continuing)")
            return True  # non-fatal
    except (subprocess.CalledProcessError, subprocess.TimeoutExpired):
        log_warn("Anthropic API check timed out (continuing)")
        return True

def check_git_clean() -> bool:
    """Check if working directory is clean. Returns True if clean or user approves."""
    try:
        r = run_cmd(["git", "status", "--porcelain"])
        if r.stdout.strip():
            log_warn("Working directory not clean:")
            for line in r.stdout.strip().split("\n")[:10]:
                print(f"  {line}")
            return False
        return True
    except subprocess.CalledProcessError:
        return True

# ============================================================
# Stuck Detection
# ============================================================

def detect_stuck_from_history(state: dict[str, Any], phase: int) -> str | None:
    """
    Analyze session_history in BUILD_STATE.json to detect stuck conditions.
    Returns a description of the stuck condition, or None.
    """
    history = state.get("session_history", [])
    if len(history) < STUCK_SAME_STEP_SESSIONS:
        return None

    # Check if the last N sessions were on the same phase+step
    recent = history[-STUCK_SAME_STEP_SESSIONS:]
    steps = set()
    for entry in recent:
        s = entry.get("step") or entry.get("current_step")
        p = entry.get("phase") or entry.get("current_phase")
        if p == phase and s is not None:
            steps.add(s)
    if len(steps) == 1:
        step_val = steps.pop()
        return (
            f"Same step (Phase {phase}, Step {step_val}) across "
            f"{STUCK_SAME_STEP_SESSIONS} consecutive sessions."
        )

    # Check blocking_issues count
    blockers = state.get("blocking_issues", [])
    if len(blockers) >= 3:
        return f"{len(blockers)} unresolved blocking issues."

    return None

def detect_stuck_by_git(start_sha: str, session_start: datetime.datetime) -> str | None:
    """
    Check if Claude Code is stuck by monitoring git activity.
    Called periodically during session monitoring.
    Returns a description of stuck condition, or None.
    """
    elapsed = (datetime.datetime.now(datetime.timezone.utc) - session_start).total_seconds()
    if elapsed < STUCK_NO_COMMIT_MINUTES * 60:
        return None  # Too early to judge

    last_commit_ts = get_last_commit_timestamp()
    if last_commit_ts is None:
        return None

    # Make last_commit_ts offset-aware if it isn't
    if last_commit_ts.tzinfo is None:
        last_commit_ts = last_commit_ts.replace(tzinfo=datetime.timezone.utc)

    since_last_commit = (datetime.datetime.now(datetime.timezone.utc) - last_commit_ts).total_seconds()
    if since_last_commit > STUCK_NO_COMMIT_MINUTES * 60:
        mins = int(since_last_commit // 60)
        return f"No git commit in {mins} minutes (threshold: {STUCK_NO_COMMIT_MINUTES})."

    return None

def generate_guidance(stuck_reason: str, state: dict[str, Any]) -> None:
    """Generate GUIDANCE.md with instructions for the next session to address stuck condition."""
    phase = state.get("current_phase", "?")
    step = state.get("current_step", "?")
    blockers = state.get("blocking_issues", [])

    blocker_text = ""
    if blockers:
        blocker_text = "\n## Current Blockers\n"
        for b in blockers:
            if isinstance(b, dict):
                blocker_text += f"- {b.get('description', b)}\n"
            else:
                blocker_text += f"- {b}\n"

    guidance = f"""# GUIDANCE — Auto-generated by autonomous-runner.py

**Stuck condition detected:** {stuck_reason}

## Context
- Phase: {phase}
- Step: {step}
- Generated at: {datetime.datetime.now(datetime.timezone.utc).isoformat()}
{blocker_text}
## Instructions

The autonomous runner detected that you may be stuck. Consider these approaches:

1. **Re-read the current step** in the skill file carefully. You may be misinterpreting the requirements.
2. **Try a simpler approach.** If the current implementation is too complex, simplify.
3. **Skip this step** if subsequent steps don't depend on it. Commit what you have as [WIP] and advance.
4. **Log a blocker** in BUILD_STATE.json if you truly cannot proceed, and stop the session.

If you are NOT stuck and are making progress, ignore this file, delete it, and continue.
"""
    with open(GUIDANCE_FILE, "w") as f:
        f.write(guidance)
    log_warn(f"Generated GUIDANCE.md — stuck reason: {stuck_reason}")

# ============================================================
# Session Execution
# ============================================================

def build_claude_prompt(phase: int, state: dict[str, Any], session_id: str, resume_id: str | None) -> str:
    """Build the prompt to pass to claude --print."""
    skill_file = f"skills/phase-{phase:02d}.md"
    parts = [
        "Start session.",
        f"Session ID: {session_id}.",
        "Read BUILD_STATE.json.",
        "Check for GUIDANCE.md — if it exists, read it, follow instructions, then delete it and commit.",
        f"Read {skill_file} and resume building from the current step.",
        "Follow the build-test-commit loop in CLAUDE.md.",
    ]
    if resume_id:
        parts.insert(1, f"This is a resumed session (previous: {resume_id}).")
    return " ".join(parts)

def run_session(
    phase: int,
    state: dict[str, Any],
    session_id: str,
    resume_id: str | None,
    auto_launch: bool,
) -> SessionResult:
    """Launch a Claude Code session and monitor it."""
    start_time = datetime.datetime.now(datetime.timezone.utc)
    start_sha = get_git_head_sha()
    step_before = state.get("current_step")

    prompt = build_claude_prompt(phase, state, session_id, resume_id)

    log_info(f"Session {session_id}")
    log_info(f"Phase {phase}, starting from step {step_before}")

    if not auto_launch:
        print()
        print(f"{C.BOLD}============================================{C.NC}")
        print(f"{C.BOLD}  M&A DEAL OS — AUTONOMOUS BUILD{C.NC}")
        print(f"{C.BOLD}============================================{C.NC}")
        print()
        print(f"  Phase:        {phase}")
        print(f"  Skill file:   skills/phase-{phase:02d}.md")
        print(f"  Current step: {step_before}")
        print(f"  Session ID:   {session_id}")
        if resume_id:
            print(f"  Resuming:     {resume_id}")
        print()

        if GUIDANCE_FILE.exists():
            log_info("GUIDANCE.md found:")
            print("---")
            print(GUIDANCE_FILE.read_text())
            print("---")
            print()

        print("Launch command:")
        print()
        print(f'  claude --print "{prompt}"')
        print()
        resp = input("Launch now? (Y/n) ").strip().lower()
        if resp and resp != "y":
            return SessionResult(
                session_id=session_id,
                phase=phase,
                step_before=step_before,
                step_after=step_before,
                status="cancelled",
                commits=0,
                duration_seconds=0,
                estimated_cost_usd=0,
                started_at=start_time.isoformat(),
                finished_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
            )

    # Launch Claude Code
    log_info("Launching Claude Code...")
    try:
        proc = subprocess.Popen(
            ["claude", "--print", prompt, "--dangerously-skip-permissions", "--model", "claude-opus-4-6"],
            cwd=REPO_ROOT,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
        )
    except FileNotFoundError:
        log_error("claude CLI not found")
        return SessionResult(
            session_id=session_id,
            phase=phase,
            step_before=step_before,
            step_after=step_before,
            status="error",
            commits=0,
            duration_seconds=0,
            estimated_cost_usd=0,
            error="claude CLI not found",
            started_at=start_time.isoformat(),
            finished_at=datetime.datetime.now(datetime.timezone.utc).isoformat(),
        )

    # Monitor the session — stream stdout in real-time, collect for analysis, write to build_log.txt
    stuck_reason = None
    last_poll = time.time()
    collected_output: list[str] = []
    build_log_path = REPO_ROOT / "build_log.txt"

    try:
        with open(build_log_path, "a") as build_log:
            build_log.write(f"\n{'=' * 60}\n")
            build_log.write(f"Session {session_id} — Phase {phase} — {start_time.isoformat()}\n")
            build_log.write(f"{'=' * 60}\n")
            build_log.flush()

            while proc.poll() is None:
                # Stream output line by line
                if proc.stdout:
                    line = proc.stdout.readline()
                    if line:
                        # Print to terminal in real-time
                        sys.stdout.write(line)
                        sys.stdout.flush()
                        # Collect for post-session analysis
                        collected_output.append(line)
                        # Write to build_log.txt in real-time
                        build_log.write(line)
                        build_log.flush()

                # Periodic stuck check
                now = time.time()
                if now - last_poll >= STUCK_POLL_INTERVAL_SECONDS:
                    last_poll = now
                    if start_sha:
                        stuck_reason = detect_stuck_by_git(start_sha, start_time)
                        if stuck_reason:
                            log_warn(f"Stuck detected: {stuck_reason}")
                            # Don't kill — just note it. Claude may recover.
                            # We'll generate guidance after the session ends.

            # Drain remaining output after process exits
            if proc.stdout:
                for line in proc.stdout:
                    sys.stdout.write(line)
                    sys.stdout.flush()
                    collected_output.append(line)
                    build_log.write(line)
                    build_log.flush()

    except KeyboardInterrupt:
        log_warn("Interrupted by user. Waiting for Claude to finish...")
        proc.terminate()
        try:
            proc.wait(timeout=10)
        except subprocess.TimeoutExpired:
            proc.kill()

    end_time = datetime.datetime.now(datetime.timezone.utc)
    duration = (end_time - start_time).total_seconds()
    exit_code = proc.returncode or 0
    full_output = "".join(collected_output)

    # Count commits made during session
    commits = 0
    if start_sha:
        commits = get_git_commit_count_since(start_sha)

    # Reload BUILD_STATE to see where we ended up
    state_after = load_build_state()
    step_after = state_after.get("current_step")
    phase_after = state_after.get("current_phase", phase)

    # Determine session status
    if exit_code != 0:
        status = "error"
    elif phase_after > phase:
        status = "completed"  # Phase completed, moved to next
    elif step_after and step_before and step_after > step_before:
        status = "advanced"
    elif stuck_reason:
        status = "stuck"
    elif commits == 0:
        status = "timeout"
    else:
        status = "advanced"

    # Cost estimation
    cost = (duration / 60.0) * ESTIMATED_COST_PER_MINUTE_USD

    result = SessionResult(
        session_id=session_id,
        phase=phase,
        step_before=step_before,
        step_after=step_after,
        status=status,
        commits=commits,
        duration_seconds=round(duration, 1),
        estimated_cost_usd=round(cost, 2),
        blockers=state_after.get("blocking_issues", []),
        guidance_generated=False,
        error=f"exit code {exit_code}" if exit_code != 0 else None,
        started_at=start_time.isoformat(),
        finished_at=end_time.isoformat(),
        output=full_output,
    )

    # If stuck, generate guidance for the next session
    if status == "stuck" and stuck_reason:
        generate_guidance(stuck_reason, state_after)
        result.guidance_generated = True

    # Also check historical stuck from session history
    historical_stuck = detect_stuck_from_history(state_after, phase_after)
    if historical_stuck and not result.guidance_generated:
        generate_guidance(historical_stuck, state_after)
        result.guidance_generated = True
        if result.status != "stuck":
            result.status = "stuck"

    return result

# ============================================================
# Session History Management
# ============================================================

def record_session(state: dict[str, Any], result: SessionResult) -> dict[str, Any]:
    """Record session result in BUILD_STATE.json session_history."""
    entry = {
        "session_id": result.session_id,
        "phase": result.phase,
        "step": result.step_after,
        "current_phase": result.phase,
        "current_step": result.step_after,
        "status": result.status,
        "commits": result.commits,
        "duration_seconds": result.duration_seconds,
        "estimated_cost_usd": result.estimated_cost_usd,
        "started_at": result.started_at,
        "finished_at": result.finished_at,
    }
    if result.error:
        entry["error"] = result.error

    history = state.get("session_history", [])
    history.append(entry)
    state["session_history"] = history

    return state

def save_session_log(result: SessionResult) -> Path:
    """Save session result as a standalone JSON file."""
    SESSION_LOG_DIR.mkdir(parents=True, exist_ok=True)
    log_file = SESSION_LOG_DIR / f"session-{result.session_id}.json"
    with open(log_file, "w") as f:
        json.dump(result.to_dict(), f, indent=2)
        f.write("\n")
    return log_file

# ============================================================
# Multi-Session Orchestration
# ============================================================

def run_multi_session(
    phase: int | None,
    max_sessions: int,
    auto_launch: bool,
    resume_id: str | None,
    output_format: str,
) -> list[SessionResult]:
    """Run one or more consecutive sessions."""
    results: list[SessionResult] = []

    for i in range(max_sessions):
        state = load_build_state()

        # Determine phase
        current_phase = phase if phase is not None else state.get("current_phase", 3)
        skill_path = skill_file_for_phase(current_phase)
        if not skill_path.exists():
            log_error(f"Skill file not found: {skill_path}")
            available = sorted(SKILLS_DIR.glob("phase-*.md"))
            if available:
                log_error(f"Available: {', '.join(p.name for p in available)}")
            break

        # Update symlink before session
        update_symlink(current_phase)

        # Generate session ID
        session_id = f"s-{current_phase:02d}-{datetime.datetime.now().strftime('%Y%m%d-%H%M%S')}-{uuid.uuid4().hex[:6]}"

        if i > 0:
            log_info(f"Starting session {i + 1}/{max_sessions}")

        result = run_session(
            phase=current_phase,
            state=state,
            session_id=session_id,
            resume_id=resume_id if i == 0 else results[-1].session_id,
            auto_launch=auto_launch if i == 0 else True,  # Auto-launch subsequent sessions
        )

        # Record in BUILD_STATE
        state = load_build_state()  # Reload — Claude may have modified it
        state = record_session(state, result)
        save_build_state(state)

        # Save session log
        log_path = save_session_log(result)
        log_info(f"Session log: {log_path.relative_to(REPO_ROOT)}")

        results.append(result)

        # Print session summary
        if output_format == "text":
            print()
            print(f"{C.BOLD}--- Session Result ---{C.NC}")
            print(f"  ID:         {result.session_id}")
            print(f"  Status:     {result.status}")
            print(f"  Phase:      {result.phase}")
            print(f"  Steps:      {result.step_before} -> {result.step_after}")
            print(f"  Commits:    {result.commits}")
            print(f"  Duration:   {result.duration_seconds:.0f}s")
            print(f"  Est. cost:  ${result.estimated_cost_usd:.2f}")
            if result.guidance_generated:
                print(f"  {C.YELLOW}GUIDANCE.md generated{C.NC}")
            if result.error:
                print(f"  Error:      {result.error}")
            print()

        # Update symlink after session (phase may have changed)
        state = load_build_state()
        new_phase = state.get("current_phase", current_phase)
        if new_phase != current_phase:
            update_symlink(new_phase)
            log_ok(f"Phase advanced: {current_phase} -> {new_phase}")

        # Stop conditions
        if result.status == "cancelled":
            break
        if result.status == "error":
            log_error("Session ended with error. Stopping.")
            break
        if result.status == "stuck":
            log_warn("Session detected stuck condition. Stopping for human review.")
            break
        if result.status == "completed":
            # Phase completed — check if there's a next phase
            if new_phase > current_phase:
                log_ok(f"Phase {current_phase} completed! Moving to phase {new_phase}.")
                phase = None  # Let it auto-detect next phase
            else:
                log_ok("Phase completed.")
                break

    return results

# ============================================================
# Pre-flight
# ============================================================

def preflight(skip_api_checks: bool = False) -> dict[str, str]:
    """Run all pre-flight checks. Returns loaded env vars."""
    log_info("Running pre-flight checks...")

    # Load and validate env
    env_vars = load_env_file()
    missing = validate_env_vars(env_vars)
    if missing:
        log_error(f"Missing required environment variables: {', '.join(missing)}")
        sys.exit(1)
    log_ok("Environment variables present")

    # Tool checks
    if not validate_tools():
        sys.exit(1)

    # Git clean check (non-blocking)
    if not check_git_clean():
        log_warn("Working directory not clean (continuing)")

    if not skip_api_checks:
        # Supabase connectivity
        if not check_supabase_connectivity(env_vars):
            sys.exit(1)

        # Anthropic API key
        check_anthropic_key(env_vars)

    # Install deps if needed
    node_modules = REPO_ROOT / "node_modules"
    if not node_modules.exists():
        log_info("Installing dependencies...")
        run_cmd(["pnpm", "install"], timeout=300)

    return env_vars

# ============================================================
# Main
# ============================================================

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Autonomous runner for M&A Deal OS — launches and monitors Claude Code sessions",
    )
    parser.add_argument(
        "--phase", "-p",
        type=int,
        default=None,
        help="Override phase number (default: read from BUILD_STATE.json)",
    )
    parser.add_argument(
        "--resume",
        type=str,
        default=None,
        metavar="SESSION_ID",
        help="Resume from a previous session ID",
    )
    parser.add_argument(
        "--auto-launch",
        action="store_true",
        default=False,
        help="Skip confirmation prompt, launch immediately",
    )
    parser.add_argument(
        "--max-sessions",
        type=int,
        default=1,
        help="Maximum number of consecutive sessions to run (default: 1)",
    )
    parser.add_argument(
        "--output-format",
        choices=["text", "json"],
        default="text",
        help="Output format for session results (default: text)",
    )
    parser.add_argument(
        "--skip-api-checks",
        action="store_true",
        default=False,
        help="Skip Supabase and Anthropic API pre-flight checks",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        default=False,
        help="Run pre-flight checks only, don't launch Claude Code",
    )
    return parser.parse_args()

def main() -> None:
    args = parse_args()

    # If resuming, look up the previous session to find its phase
    resume_phase = None
    if args.resume:
        log_info(f"Resuming from session: {args.resume}")
        # Try to find session in BUILD_STATE history
        state = load_build_state()
        for entry in state.get("session_history", []):
            if entry.get("session_id") == args.resume:
                resume_phase = entry.get("phase")
                log_info(f"Found previous session — phase {resume_phase}")
                break
        if resume_phase is None:
            log_warn(f"Session {args.resume} not found in history. Using current phase.")

    phase = args.phase or resume_phase

    # Pre-flight
    preflight(skip_api_checks=args.skip_api_checks)

    if args.dry_run:
        log_ok("Pre-flight checks passed. Dry run — not launching.")
        state = load_build_state()
        effective_phase = phase or state.get("current_phase", 3)
        update_symlink(effective_phase)
        return

    # Run session(s)
    results = run_multi_session(
        phase=phase,
        max_sessions=args.max_sessions,
        auto_launch=args.auto_launch,
        resume_id=args.resume,
        output_format=args.output_format,
    )

    # Output results
    if args.output_format == "json":
        output = {
            "sessions": [r.to_dict() for r in results],
            "total_sessions": len(results),
            "total_commits": sum(r.commits for r in results),
            "total_duration_seconds": round(sum(r.duration_seconds for r in results), 1),
            "total_estimated_cost_usd": round(sum(r.estimated_cost_usd for r in results), 2),
            "final_status": results[-1].status if results else "none",
        }
        print(json.dumps(output, indent=2))
    elif results:
        total_cost = sum(r.estimated_cost_usd for r in results)
        total_commits = sum(r.commits for r in results)
        print()
        print(f"{C.BOLD}=== Run Summary ==={C.NC}")
        print(f"  Sessions:    {len(results)}")
        print(f"  Commits:     {total_commits}")
        print(f"  Total cost:  ${total_cost:.2f}")
        print(f"  Last status: {results[-1].status}")
        if results[-1].session_id:
            print(f"  Resume with: python scripts/autonomous-runner.py --resume {results[-1].session_id}")
        print()

if __name__ == "__main__":
    main()
