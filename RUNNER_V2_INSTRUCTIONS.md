# RUNNER V2 INSTRUCTIONS — Stream-JSON Bidirectional Architecture

## YOUR MISSION

Rewrite `scripts/autonomous-runner.py` from scratch. The current version uses `--print` (one-shot headless). Replace it with a stream-JSON bidirectional architecture where the runner maintains persistent Claude Code sessions and can inject messages mid-session.

Delete the current `scripts/autonomous-runner.py` and write a new one. Do NOT modify any product code.

---

## CORE ARCHITECTURE

One Python process. Two persistent Claude Code sessions (Build Agent + Supervisor). Sequential — never concurrent. Communication via stdin/stdout JSON pipes and git.

```
Runner (Python)
  │
  ├── Build Agent Process (persistent, stream-json in + out)
  │   stdin  ← Runner sends prompts as JSON messages
  │   stdout → Runner reads every event in real-time
  │
  ├── Supervisor Process (persistent, stream-json in + out)  
  │   stdin  ← Runner sends escalation context as JSON messages
  │   stdout → Runner reads supervisor reasoning in real-time
  │
  └── Git (shared memory between agents)
      Build Agent commits code + state → Supervisor pulls and reads
      Supervisor commits GUIDANCE.md → Build Agent pulls and reads
```

The Build Agent runs continuously. The runner monitors its output. When intervention is needed, the runner injects a message into the Build Agent's stdin. If escalation is needed, the runner sends context to the Supervisor's stdin, waits for the response, then injects guidance back into the Build Agent.

**CRITICAL: The Build Agent and Supervisor never run concurrently.** The runner reads from one at a time. When escalating:
1. Build Agent just finished a turn (runner got the result event, build agent is idle waiting for next user message)
2. Send escalation message to Supervisor stdin
3. Read Supervisor stdout until it completes its turn (writes GUIDANCE.md, commits, pushes)
4. Send guidance message to Build Agent stdin ("git pull, read GUIDANCE.md, follow it")
5. Resume reading Build Agent stdout

---

## STREAM-JSON PROTOCOL

### Launching a session

```python
proc = subprocess.Popen(
    ["claude", "-p",
     "--output-format", "stream-json",
     "--input-format", "stream-json",
     "--dangerously-skip-permissions",
     "--model", "claude-opus-4-6"],
    stdin=subprocess.PIPE,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True,
    cwd=REPO_ROOT
)
```

### Sending a message (user turn)

```python
def send_message(proc, text: str):
    message = json.dumps({
        "type": "user",
        "message": {
            "role": "user",
            "content": [{"type": "text", "text": text}]
        }
    }) + "\n"
    proc.stdin.write(message)
    proc.stdin.flush()
```

### Reading responses (assistant turn)

Each line from stdout is a JSON object. The turn ends when you receive `"type": "result"`.

```python
def read_until_complete(proc, on_line=None) -> dict:
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
        if on_line:
            on_line(format_event(event))
        
        if event.get("type") == "result":
            return {
                "events": collected,
                "result": event,
                "session_id": event.get("session_id"),
                "cost_usd": event.get("total_cost_usd", 0),
                "process_died": False
            }
    
    return {"events": collected, "result": None, "process_died": True}
```

---

## IMPORTANT: TEST THE STREAM-JSON FORMAT FIRST

Before writing the full implementation, you MUST test the actual stream-json event format. Run this:

```bash
echo '{"type":"user","message":{"role":"user","content":[{"type":"text","text":"Say hello and nothing else"}]}}' | claude -p --output-format stream-json --input-format stream-json --dangerously-skip-permissions --model claude-opus-4-6 2>/dev/null
```

Examine every line of output. Note:
- What event types are emitted
- The exact JSON structure of each type
- How session_id and cost data appear
- What the final result event looks like

Adapt ALL event parsing code to match the ACTUAL format you observe. Do NOT assume the format from my examples — verify it.

If stream-json input doesn't work (feature may not be supported in your CLI version), fall back to:
- Use `--print --output-format stream-json` for streaming output
- For each turn, use `--resume SESSION_ID` with the prompt as CLI argument
- Store which approach you used in a comment at the top of the file

---

## SESSION MANAGEMENT CLASS

```python
class AgentSession:
    """Manages a persistent Claude Code stream-json session."""
    
    def __init__(self, name: str, initial_prompt: str):
        self.name = name            # "build" or "supervisor"
        self.proc = None
        self.initial_prompt = initial_prompt
        self.turn_count = 0
        self.total_cost = 0.0
        self.session_id = None
    
    def start(self):
        """Launch new Claude Code process and send initial prompt."""
        self.proc = subprocess.Popen(...)  # as above
        self.send(self.initial_prompt)
        result = self.read_response()
        self.session_id = result.get("session_id")
        self.turn_count = 1
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
        self.total_cost += result.get("cost_usd", 0)
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
```

---

## REAL-TIME MONITORING

```python
class BuildMonitor:
    def __init__(self):
        self.last_commit_time = time.time()
        self.consecutive_errors = 0
        self.output_tail = []        # Last 100 lines for escalation context
        self.pending_intervention = None
    
    def process_line(self, line: str):
        """Called for every build agent output line."""
        if line is None:
            return
        
        # Track in tail buffer
        self.output_tail.append(line)
        if len(self.output_tail) > 100:
            self.output_tail.pop(0)
        
        # Detect commits
        if "git commit" in line or "git push" in line:
            self.last_commit_time = time.time()
            self.consecutive_errors = 0
        
        # Detect errors
        if any(kw in line.lower() for kw in ["error:", "error", "failed", "fatal", "exception"]):
            self.consecutive_errors += 1
        else:
            self.consecutive_errors = 0
        
        # Check for interventions
        if self.consecutive_errors >= 3:
            self.pending_intervention = "errors"
            self.consecutive_errors = 0
        
        if time.time() - self.last_commit_time > 900:
            self.pending_intervention = "no_commits"
            self.last_commit_time = time.time()  # Reset to avoid spamming
    
    def get_tail(self, n=100) -> str:
        return "\n".join(self.output_tail[-n:])
    
    def reset_turn(self):
        self.pending_intervention = None
```

---

## COURSE CORRECTION MESSAGES (MID-SESSION INJECTION)

```python
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
```

These get injected into the Build Agent's stdin WITHOUT killing the session. The build agent just receives it as a new user message.

---

## ESCALATION CRITERIA

Supervisor called ONLY when:

1. **Phase transition** — Build agent completed a phase (proactive review)
2. **Repeated stuck** — Same phase+step across 2+ consecutive turns with no advancement
3. **Build broken** — `pnpm build` fails after a turn
4. **Multiple blockers** — BUILD_STATE.json has 3+ blocking_issues

NOT called when:
- Build agent made progress (step advanced)
- Single test failure (build agent handles retries)
- Session died (just restart fresh)

```python
def should_escalate(state_before, state_after, no_progress_turns) -> tuple[bool, str]:
    if state_after.get("current_phase", 0) > state_before.get("current_phase", 0):
        return True, "phase_transition"
    
    if no_progress_turns >= 2:
        return True, "repeated_stuck"
    
    build = subprocess.run(["pnpm", "build"], capture_output=True, cwd=REPO_ROOT)
    if build.returncode != 0:
        return True, "build_broken"
    
    if len(state_after.get("blocking_issues", [])) >= 3:
        return True, "multiple_blockers"
    
    return False, "none"
```

---

## ESCALATION MESSAGE BUILDER

```python
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
    
    parts.append("\nFollow your framework: DIAGNOSE → ROOT CAUSE → ALTERNATIVES → DECISION → ACTION")
    parts.append("Write GUIDANCE.md (or NEEDS_HUMAN.md if beyond scope), commit, push.")
    
    return "\n\n".join(parts)
```

---

## ESCALATION FLOW

```python
def escalate_to_supervisor(build_session, supervisor_session, context):
    message = build_escalation_message(context["reason"], context)
    
    # Ensure supervisor is alive
    if not supervisor_session.is_alive():
        log_info("Supervisor session died. Restarting...")
        supervisor_session.restart()
    
    log_info("[SUPERVISOR] Sending escalation...")
    
    # Tell supervisor to git pull first so it sees latest code
    full_message = f"First run: git pull origin main\n\nThen handle this:\n\n{message}"
    result = supervisor_session.send_and_read(full_message, on_line=log_supervisor_line)
    
    log_info(f"[SUPERVISOR] Done. Cost: ${result.get('cost_usd', 0):.2f}")
    
    # Runner pulls to get GUIDANCE.md or NEEDS_HUMAN.md
    subprocess.run(["git", "pull", "origin", "main"], cwd=REPO_ROOT, capture_output=True)
    
    if (REPO_ROOT / "NEEDS_HUMAN.md").exists():
        return "needs_human"
    
    # Tell build agent to read guidance
    if build_session.is_alive() and (REPO_ROOT / "GUIDANCE.md").exists():
        build_session.send(
            "Run git pull origin main. Read GUIDANCE.md and follow its instructions. "
            "Delete GUIDANCE.md when done, commit the deletion, then continue building."
        )
    
    return "guidance_sent"
```

---

## NEEDS_HUMAN.md HANDLING

```python
def wait_for_human():
    log_info("═" * 50)
    log_info(" PAUSED — HUMAN INTERVENTION NEEDED")
    log_info(" Read NEEDS_HUMAN.md for details")
    log_info(" Delete the file, commit, and push to resume")
    log_info("═" * 50)
    
    while True:
        time.sleep(120)
        subprocess.run(["git", "pull", "origin", "main"], 
                       cwd=REPO_ROOT, capture_output=True)
        if not (REPO_ROOT / "NEEDS_HUMAN.md").exists():
            log_info("NEEDS_HUMAN.md removed. Resuming build.")
            return
        log_info(f"Waiting for human... ({datetime.now().strftime('%H:%M')})")

def write_needs_human(reason: str):
    path = REPO_ROOT / "NEEDS_HUMAN.md"
    path.write_text(f"# Human Intervention Needed\n\n{reason}\n\nDelete this file and push to resume.\n")
    subprocess.run(["git", "add", "NEEDS_HUMAN.md"], cwd=REPO_ROOT)
    subprocess.run(["git", "commit", "-m", "PAUSED: needs human intervention"], cwd=REPO_ROOT)
    subprocess.run(["git", "push", "origin", "main"], cwd=REPO_ROOT)
```

---

## BUILD AGENT PROMPTS

### Initial prompt (fresh session)

```python
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
```

### Continue prompt (session already has context)

```python
BUILD_CONTINUE_PROMPT = "Run git pull origin main. Check for GUIDANCE.md — if it exists, read and follow it, delete it, commit. Then continue building from where you left off."
```

---

## SUPERVISOR INIT PROMPT

```python
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
```

---

## MAIN LOOP

```python
def main():
    args = parse_args()
    run_preflight_checks()
    
    # Initialize
    git_pull()
    state = load_build_state()
    update_symlink(state["current_phase"])
    
    log_info("=" * 50)
    log_info("  M&A DEAL OS — AUTONOMOUS BUILD")
    log_info(f"  Starting Phase {state['current_phase']}, Step {state['current_step']}")
    log_info("=" * 50)
    
    # Start both sessions
    log_info("Starting Build Agent...")
    build = AgentSession("build", BUILD_INIT_PROMPT)
    build.start()
    log_info(f"Build Agent ready. Session: {build.session_id}")
    
    log_info("Starting Supervisor...")
    supervisor = AgentSession("supervisor", SUPERVISOR_INIT_PROMPT)
    supervisor.start()
    log_info(f"Supervisor ready. Session: {supervisor.session_id}")
    
    # Tracking
    monitor = BuildMonitor()
    no_progress_turns = 0
    supervisor_calls_this_turn = 0
    
    for turn in range(args.max_turns):
        # Check completion
        state = load_build_state()
        if state.get("current_phase", 0) > 14 or (REPO_ROOT / "BUILD_COMPLETE").exists():
            log_info("★ ★ ★  BUILD COMPLETE  ★ ★ ★")
            break
        
        # Check NEEDS_HUMAN
        if (REPO_ROOT / "NEEDS_HUMAN.md").exists():
            wait_for_human()
        
        # Check cost limits
        total_cost = build.total_cost + supervisor.total_cost
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
            build = AgentSession("build", BUILD_INIT_PROMPT)
            build.start()
        
        # Send continue prompt
        build.send(BUILD_CONTINUE_PROMPT)
        
        # Read response (blocks until turn complete)
        result = build.read_response(on_line=lambda l: handle_build_line(l, monitor))
        
        if result.get("process_died"):
            log_warn("Build process died mid-turn. Will restart next iteration.")
            continue
        
        # Post-turn
        git_pull()
        state_after = load_build_state()
        
        # Track progress
        same_step = (state_after.get("current_step") == state_before.get("current_step") and
                     state_after.get("current_phase") == state_before.get("current_phase"))
        if same_step:
            no_progress_turns += 1
        else:
            no_progress_turns = 0
            supervisor_calls_this_turn = 0
        
        # Status
        total_cost = build.total_cost + supervisor.total_cost
        log_status(state_after, total_cost, turn + 1)
        
        # Escalation check
        should, reason = should_escalate(state_before, state_after, no_progress_turns)
        
        if should:
            if supervisor_calls_this_turn >= 3:
                write_needs_human(
                    f"Supervisor consulted 3 times on Phase {state_after['current_phase']} "
                    f"Step {state_after['current_step']} with no progress."
                )
                wait_for_human()
                supervisor_calls_this_turn = 0
                continue
            
            if not supervisor.is_alive():
                log_info("Supervisor died. Restarting...")
                supervisor = AgentSession("supervisor", SUPERVISOR_INIT_PROMPT)
                supervisor.start()
            
            context = {
                "reason": reason,
                "phase": state_after.get("current_phase"),
                "step": state_after.get("current_step"),
                "no_progress_turns": no_progress_turns,
                "output_tail": monitor.get_tail(),
                "blocking_issues": state_after.get("blocking_issues", []),
            }
            
            if reason == "build_broken":
                build_err = subprocess.run(["pnpm", "build"], capture_output=True, 
                                           text=True, cwd=REPO_ROOT)
                context["build_error"] = build_err.stderr[-500:]
            
            result = escalate_to_supervisor(build, supervisor, context)
            supervisor_calls_this_turn += 1
            
            if result == "needs_human":
                wait_for_human()
                supervisor_calls_this_turn = 0
        
        # Brief pause
        time.sleep(5)
    
    # Cleanup
    log_info(f"Runner finished. Total cost: ${build.total_cost + supervisor.total_cost:.2f}")
    build.kill()
    supervisor.kill()
```

---

## DISPLAY AND LOGGING

Two log files, both flushed immediately:
- `build_log.txt` — All output (build + supervisor + runner status)
- `docs/supervisor-log/supervisor_log.txt` — Supervisor output only

Both also print to terminal.

```python
def handle_build_line(line, monitor):
    if line is None:
        return
    ts = datetime.now().strftime("%H:%M:%S")
    display = f"[{ts}] [BUILD] {line}"
    print(display, flush=True)
    with open(REPO_ROOT / "build_log.txt", "a") as f:
        f.write(display + "\n")
    monitor.process_line(line)

def log_supervisor_line(line):
    if line is None:
        return
    ts = datetime.now().strftime("%H:%M:%S")
    display = f"[{ts}] [SUPERVISOR] {line}"
    print(display, flush=True)
    for path in [REPO_ROOT / "build_log.txt", 
                 REPO_ROOT / "docs/supervisor-log/supervisor_log.txt"]:
        with open(path, "a") as f:
            f.write(display + "\n")

def log_info(msg):
    ts = datetime.now().strftime("%H:%M:%S")
    display = f"[{ts}] [RUNNER] {msg}"
    print(display, flush=True)
    with open(REPO_ROOT / "build_log.txt", "a") as f:
        f.write(display + "\n")

def log_status(state, cost, turn):
    phase = state.get("current_phase", "?")
    step = state.get("current_step", "?")
    print(f"\n[STATUS] Phase {phase} | Step {step} | Turn {turn} | Cost: ${cost:.2f}\n", flush=True)
```

---

## CONFIGURATION

```python
CONFIG = {
    "max_turns": 200,
    "stuck_no_commit_seconds": 900,       # 15 min
    "consecutive_errors_threshold": 3,
    "max_no_progress_for_escalation": 2,  # 2 turns same step → escalate
    "max_supervisor_calls_per_step": 3,
    "max_supervisor_cost_usd": 20.0,
    "needs_human_poll_seconds": 120,
    "claude_model": "claude-opus-4-6",
}
```

---

## CLI

```python
parser = argparse.ArgumentParser(description="M&A Deal OS — Autonomous Builder V2")
parser.add_argument("--max-turns", type=int, default=200)
parser.add_argument("--dry-run", action="store_true", help="Pre-flight checks only")
parser.add_argument("--model", type=str, default="claude-opus-4-6")
parser.add_argument("--max-cost", type=float, default=200.0)
parser.add_argument("--no-supervisor", action="store_true")
```

---

## GRACEFUL SHUTDOWN

```python
import signal

shutdown_requested = False

def handle_sigint(signum, frame):
    global shutdown_requested
    if shutdown_requested:
        print("\nForce quit.")
        sys.exit(1)
    shutdown_requested = True
    print("\nCtrl+C — finishing current turn, then stopping...")

signal.signal(signal.SIGINT, handle_sigint)

# In main loop:
if shutdown_requested:
    log_info("Shutdown requested. Cleaning up.")
    break
```

---

## RETRY ON SESSION START FAILURE

```python
def start_session_with_retry(session: AgentSession, max_retries=3):
    for attempt in range(max_retries):
        try:
            result = session.start()
            if not result.get("process_died"):
                return result
        except Exception as e:
            log_warn(f"Start attempt {attempt+1} failed: {e}")
        wait = 30 * (2 ** attempt)
        log_info(f"Retrying in {wait}s...")
        time.sleep(wait)
    
    write_needs_human("Failed to start Claude Code session after 3 attempts")
    wait_for_human()
    return start_session_with_retry(session, max_retries)
```

---

## ALSO CREATE: scripts/monitor.sh

```bash
#!/bin/bash
# Monitor the autonomous build in a split view
# Usage: bash scripts/monitor.sh

if command -v tmux &> /dev/null; then
    tmux new-session -d -s build-monitor \
        "echo '=== BUILD LOG ===' && tail -f build_log.txt" \; \
        split-window -h \
        "echo '=== SUPERVISOR ===' && tail -f docs/supervisor-log/supervisor_log.txt" \; \
        attach
else
    echo "tmux not installed. Tailing build log:"
    tail -f build_log.txt
fi
```

Make executable: `chmod +x scripts/monitor.sh`

---

## IMPLEMENTATION ORDER

1. First: run the stream-json test command to discover the actual event format
2. Write the utility functions (send_message, read_until_complete, format_event) based on actual format
3. Write AgentSession class
4. Write BuildMonitor class
5. Write escalation logic (should_escalate, build_escalation_message, escalate_to_supervisor)
6. Write wait_for_human, write_needs_human
7. Write main loop
8. Write CLI parser and preflight checks
9. Write signal handler
10. Create scripts/monitor.sh
11. Test with a quick dry run
12. Commit and push

Commit message: `feat: rewrite autonomous runner with stream-json bidirectional sessions, real-time monitoring, and supervisor agent`

Delete nothing except the old autonomous-runner.py. Do not modify product code.
