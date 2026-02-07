# SUPERVISOR AGENT IMPLEMENTATION INSTRUCTIONS

## YOUR MISSION

Add a Supervisor Agent to `scripts/autonomous-runner.py`. The Supervisor is a persistent Claude Code session (`--resume`) that gets consulted when the Build Agent gets stuck. It diagnoses problems, reasons through alternatives, and writes GUIDANCE.md with targeted instructions.

Do NOT modify any product code. Only modify `scripts/autonomous-runner.py`.

---

## ARCHITECTURE

One terminal, one Python process, sequential execution:

```
MAIN LOOP:
  1. Launch Build Agent (claude --print, blocking, waits for exit)
  2. Analyze result: progress or stuck?
     ├── Progress made → loop back to 1
     ├── Phase complete → proactive supervisor review → loop back to 1
     ├── Build complete → exit
     └── Stuck → go to 3
  3. Launch Supervisor (claude --print --resume SUPERVISOR_ID, blocking)
     Supervisor reads context, reasons, writes GUIDANCE.md, commits
  4. Loop back to 1 (Build Agent reads GUIDANCE.md on next start)
```

Build Agent and Supervisor NEVER run concurrently. The runner launches one, waits for it to finish, then decides what to do next.

---

## SUPERVISOR SESSION LIFECYCLE

### Initialization (once, at very start of build)

Launch a fresh Claude Code session with the init prompt. Capture the `session_id` from `--output-format json` response. Store it in BUILD_STATE.json as `supervisor_session_id`.

```python
result = subprocess.run(
    ["claude", "--print", SUPERVISOR_INIT_PROMPT,
     "--dangerously-skip-permissions", "--model", "claude-opus-4-6",
     "--output-format", "json"],
    capture_output=True, text=True, cwd=REPO_ROOT, timeout=300
)
response = json.loads(result.stdout)
supervisor_session_id = response["session_id"]
# Save to BUILD_STATE.json
```

The init prompt tells the supervisor to read SPEC.md, CLAUDE.md, BUILD_STATE.json, and the current skill file. This is the ONE expensive call — everything after uses --resume and is cheap.

### Escalation Calls (when stuck)

Resume the existing session. Pass the issue context as the new message.

```python
result = subprocess.run(
    ["claude", "--print", "--resume", supervisor_session_id,
     escalation_message,
     "--dangerously-skip-permissions", "--model", "claude-opus-4-6",
     "--output-format", "json"],
    capture_output=True, text=True, cwd=REPO_ROOT, timeout=600
)
```

The supervisor already has SPEC.md, CLAUDE.md, etc. in its conversation history from init. It does NOT re-read them. It just gets the new escalation context and responds.

### Session Expiry Handling

If `--resume` fails (session expired, typically after many hours), re-initialize:

```python
try:
    result = subprocess.run([...resume...], ...)
    if result.returncode != 0 or "error" in result.stdout.lower():
        # Session expired, re-init
        supervisor_session_id = init_supervisor()
        result = subprocess.run([...resume with new id...], ...)
except:
    supervisor_session_id = init_supervisor()
```

When re-initializing, include in the init prompt: "Read docs/supervisor-log/decisions.md for your previous decisions on this project." This recovers context from the committed decision log.

---

## SUPERVISOR INIT PROMPT

Use this exact prompt for the first supervisor call:

```python
SUPERVISOR_INIT_PROMPT = """You are the Supervisor Agent for the M&A Deal OS autonomous build.

YOUR ROLE: You oversee a Build Agent (a separate Claude Code session) that follows skill files to build the system phase by phase. You are consulted when the Build Agent gets stuck, and at phase transitions for readiness review.

READ THESE FILES NOW to understand the project:
- CLAUDE.md (build protocol)
- BUILD_STATE.json (current state)
- SPEC.md (full specification — read thoroughly, this is your only chance)
- The current skill file referenced in BUILD_STATE.json

WHEN I BRING YOU AN ESCALATION, follow this framework:

1. DIAGNOSE: What exactly failed? Quote the error if provided.
2. ROOT CAUSE: Why? Categories: environment constraint, logic error, dependency missing, spec ambiguity, wrong approach.
3. ALTERNATIVES: List 2-3 possible approaches:
   - For each: what it does, what it trades off, likelihood of success
4. DECISION: Which alternative and why. Reference these principles:
   - Progress over perfection: a working stub beats a stuck session
   - Test everything: never skip tests to save time
   - Small commits: partial progress committed > perfect progress lost
   - Work around environment constraints, don't fight them
   - Never break existing functionality (Phases 0-2)
5. ACTION: Write GUIDANCE.md with exact instructions for the Build Agent. Be specific — file paths, code patterns, exact commands. Then git add, commit, and push GUIDANCE.md.

ALSO: After writing GUIDANCE.md, append a summary of your decision to docs/supervisor-log/decisions.md (create if it doesn't exist). Format:

## [timestamp] Phase X Step Y — Issue Type
**Diagnosis:** ...
**Alternatives considered:** ...
**Decision:** ...
**Reasoning:** ...

FOR PHASE TRANSITION REVIEWS, I'll ask you to assess readiness. Read the test report and next phase skill file, then:
- Confirm readiness or flag risks
- Note any deferred items that will block the next phase
- Write any preparatory GUIDANCE.md if needed

IF AN ISSUE IS BEYOND YOUR SCOPE:
- The issue requires changing the spec or architecture
- You've been consulted 2+ times about the exact same step with no progress
- The issue involves credentials, security, or external service configuration

Then write NEEDS_HUMAN.md instead of GUIDANCE.md with:
- What happened
- What you've considered
- What the human needs to decide
- Specific questions

Respond with SUPERVISOR READY after reading all files."""
```

---

## ESCALATION TRIGGERS

The Supervisor is ONLY called when:

1. **Zero progress session:** Build Agent session ended and made 0 commits (checked via git log)
2. **Repeated stuck:** Same phase+step persists across 2+ consecutive Build Agent sessions
3. **Build broken:** `pnpm build` fails after a Build Agent session ends
4. **Multiple blockers:** BUILD_STATE.json has 3+ blocking_issues
5. **Phase transition:** Build Agent completed a phase (proactive review, not an error)

The Supervisor is NOT called when:
- Build Agent made progress but didn't finish (just restart)
- Single test failure (Build Agent handles retries per CLAUDE.md 3-attempt rule)
- Session timeout with commits made (just restart)

Implement this as a function:

```python
def should_escalate(session_result, pre_session_state, post_session_state) -> tuple[bool, str]:
    """Returns (should_escalate, reason) based on strict criteria."""
    
    # Check for phase transition (proactive review)
    if post_session_state["current_phase"] > pre_session_state["current_phase"]:
        return True, "phase_transition"
    
    # Check for zero progress
    commits_this_session = count_commits_since(session_start_time)
    if commits_this_session == 0:
        return True, "zero_progress"
    
    # Check for repeated stuck (same step across 2+ sessions)
    if (post_session_state["current_phase"] == pre_session_state["current_phase"] and
        post_session_state["current_step"] == pre_session_state["current_step"] and
        sessions_on_same_step >= 2):
        return True, "repeated_stuck"
    
    # Check for build broken
    build_ok = subprocess.run(["pnpm", "build"], capture_output=True, cwd=REPO_ROOT).returncode == 0
    if not build_ok:
        return True, "build_broken"
    
    # Check for multiple blockers
    blockers = post_session_state.get("blocking_issues", [])
    if len(blockers) >= 3:
        return True, "multiple_blockers"
    
    return False, "none"
```

---

## ESCALATION MESSAGE FORMAT

When calling the supervisor, build a context message:

```python
def build_escalation_message(reason: str, context: dict) -> str:
    parts = [f"ESCALATION: {reason}\n"]
    
    parts.append(f"Current position: Phase {context['phase']}, Step {context['step']}")
    parts.append(f"Sessions on this step: {context['sessions_on_step']}")
    
    if context.get("build_output_tail"):
        parts.append(f"\nLast 100 lines of Build Agent output:\n```\n{context['build_output_tail']}\n```")
    
    if context.get("build_error"):
        parts.append(f"\nBuild error:\n```\n{context['build_error']}\n```")
    
    if context.get("blocking_issues"):
        parts.append(f"\nBlocking issues in BUILD_STATE.json:\n{json.dumps(context['blocking_issues'], indent=2)}")
    
    if context.get("recent_commits"):
        parts.append(f"\nRecent commits:\n```\n{context['recent_commits']}\n```")
    
    if reason == "phase_transition":
        parts.append(f"\nPhase {context['phase']} is complete. Please review readiness for Phase {context['phase'] + 1}.")
        parts.append("Read the test report and next phase skill file, then assess.")
    
    parts.append("\nFollow your escalation framework: DIAGNOSE → ROOT CAUSE → ALTERNATIVES → DECISION → ACTION")
    parts.append("Write GUIDANCE.md (or NEEDS_HUMAN.md if beyond your scope), commit, and push.")
    
    return "\n\n".join(parts)
```

---

## NEEDS_HUMAN.md HANDLING

When the runner detects NEEDS_HUMAN.md in the repo:

```python
def wait_for_human():
    """Pause and poll until human resolves the issue."""
    log_info("NEEDS_HUMAN.md detected. Pausing for human intervention.")
    log_info("The runner will check every 2 minutes for the file to be removed.")
    log_info("Human: read NEEDS_HUMAN.md, resolve the issue, delete the file, commit and push.")
    
    while True:
        time.sleep(120)
        subprocess.run(["git", "pull", "origin", "main"], cwd=REPO_ROOT, capture_output=True)
        if not (REPO_ROOT / "NEEDS_HUMAN.md").exists():
            log_info("NEEDS_HUMAN.md removed. Resuming build.")
            return
        log_info("Still waiting for human... (NEEDS_HUMAN.md still exists)")
```

---

## RETRY LOGIC

Both Build Agent and Supervisor launches need retry with backoff:

```python
def launch_with_retry(cmd: list, timeout: int, max_retries: int = 3) -> subprocess.CompletedProcess:
    for attempt in range(max_retries):
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, 
                                     cwd=REPO_ROOT, timeout=timeout)
            return result
        except subprocess.TimeoutExpired:
            log_warn(f"Attempt {attempt+1} timed out")
        except Exception as e:
            log_warn(f"Attempt {attempt+1} failed: {e}")
        
        wait = 30 * (2 ** attempt)  # 30s, 60s, 120s
        log_info(f"Waiting {wait}s before retry...")
        time.sleep(wait)
    
    raise RuntimeError(f"Failed after {max_retries} attempts")
```

---

## SUPERVISOR COST TRACKING

Track supervisor costs separately:

```python
# After each supervisor call
supervisor_cost = response.get("total_cost_usd", 0)
total_supervisor_cost += supervisor_cost
log_info(f"Supervisor call cost: ${supervisor_cost:.2f} (total: ${total_supervisor_cost:.2f})")

# Safety limit
MAX_SUPERVISOR_COST = 20.0
if total_supervisor_cost > MAX_SUPERVISOR_COST:
    write_needs_human(f"Supervisor cost limit reached: ${total_supervisor_cost:.2f}")
    wait_for_human()
```

---

## UPDATED MAIN LOOP

The main loop should now look like:

```python
def main_loop():
    # Init supervisor (or resume from BUILD_STATE.json supervisor_session_id)
    supervisor_id = init_or_resume_supervisor()
    
    sessions_on_same_step = 0
    
    for session_num in range(max_sessions):
        # Pre-session
        git_pull()
        state_before = load_build_state()
        update_symlink(state_before["current_phase"])
        
        # Check for NEEDS_HUMAN.md
        if (REPO_ROOT / "NEEDS_HUMAN.md").exists():
            wait_for_human()
        
        # Check for completion
        if state_before["current_phase"] > 14 or (REPO_ROOT / "BUILD_COMPLETE").exists():
            log_info("BUILD COMPLETE!")
            break
        
        # Launch Build Agent
        build_result = run_build_session(state_before)
        
        # Post-session analysis
        git_pull()
        state_after = load_build_state()
        
        # Track same-step count
        if (state_after["current_phase"] == state_before["current_phase"] and
            state_after["current_step"] == state_before["current_step"]):
            sessions_on_same_step += 1
        else:
            sessions_on_same_step = 0
        
        # Should we escalate?
        should, reason = should_escalate(
            build_result, state_before, state_after, sessions_on_same_step
        )
        
        if should:
            log_info(f"Escalating to Supervisor: {reason}")
            context = gather_escalation_context(reason, build_result, state_after, sessions_on_same_step)
            message = build_escalation_message(reason, context)
            run_supervisor(supervisor_id, message)
            
            # Check if supervisor wrote NEEDS_HUMAN.md
            git_pull()
            if (REPO_ROOT / "NEEDS_HUMAN.md").exists():
                wait_for_human()
        
        # Brief pause between sessions
        time.sleep(30)
```

---

## DECISION LOG

Create `docs/supervisor-log/` directory. The supervisor appends to `decisions.md` in that directory. This file is committed to git so it survives session expiry.

If the supervisor session expires and needs re-init, the new init prompt includes:
"Also read docs/supervisor-log/decisions.md for your previous decisions on this project."

---

## CONFIGURATION ADDITIONS

Add to the CONFIG dict:

```python
"max_supervisor_cost_usd": 20.0,
"max_supervisor_calls_per_build_session": 3,
"supervisor_timeout_seconds": 600,
"needs_human_poll_interval_seconds": 120,
```

---

## WHAT TO IMPLEMENT

1. Add `SupervisorAgent` class with: `init()`, `escalate(message)`, `is_session_valid()`, cost tracking
2. Add `should_escalate()` function with the 5 trigger criteria
3. Add `build_escalation_message()` function
4. Add `wait_for_human()` function  
5. Add `launch_with_retry()` function
6. Update the main loop to integrate supervisor escalation
7. Add SUPERVISOR_INIT_PROMPT as a constant
8. Create `docs/supervisor-log/` directory
9. Update CONFIG with supervisor settings
10. Update the `--dry-run` to verify supervisor can be initialized

After implementing, commit and push with message:
"feat: add Supervisor Agent with intelligent escalation, phase reviews, and human handoff"
