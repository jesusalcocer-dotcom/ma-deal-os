#!/bin/bash
# Monitor the autonomous build in a split view
# Usage: bash scripts/monitor.sh

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"

if command -v tmux &> /dev/null; then
    tmux new-session -d -s build-monitor \
        "echo '=== BUILD LOG ===' && tail -f $REPO_ROOT/build_log.txt" \; \
        split-window -h \
        "echo '=== SUPERVISOR ===' && tail -f $REPO_ROOT/docs/supervisor-log/supervisor_log.txt" \; \
        attach
else
    echo "tmux not installed. Tailing build log:"
    tail -f "$REPO_ROOT/build_log.txt"
fi
