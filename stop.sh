#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/data/gateway.pid"
LOG_FILE="/tmp/gateway.log"

kill_tree() {
    local pid=$1
    local sig=${2:-TERM}
    
    local children=$(pgrep -P "$pid" 2>/dev/null || true)
    for child in $children; do
        kill_tree "$child" "$sig"
    done
    
    kill -$sig "$pid" 2>/dev/null || true
}

wait_for_death() {
    local pid=$1
    local timeout=${2:-10}
    local count=0
    
    while kill -0 "$pid" 2>/dev/null && [ $count -lt $((timeout * 2)) ]; do
        sleep 0.5
        ((count++))
    done
    
    if kill -0 "$pid" 2>/dev/null; then
        return 1
    fi
    return 0
}

if [ ! -f "$PID_FILE" ]; then
    echo "Gateway is not running (no PID file found)"
    exit 0
fi

MAIN_PID=$(cat "$PID_FILE")

if ! kill -0 "$MAIN_PID" 2>/dev/null; then
    echo "Gateway is not running (stale PID file)"
    rm -f "$PID_FILE"
    exit 0
fi

echo "Stopping gateway (PID $MAIN_PID) and all child processes..."

kill_tree "$MAIN_PID" TERM

if wait_for_death "$MAIN_PID" 10; then
    echo "✅ Gateway stopped gracefully"
else
    echo "Gateway didn't stop gracefully, force killing..."
    kill_tree "$MAIN_PID" KILL
    sleep 1
    echo "✅ Gateway force stopped"
fi

rm -f "$PID_FILE"

GATEWAY_PIDS=$(pgrep -f "tsx.*src/index.ts.*$SCRIPT_DIR" 2>/dev/null || true)
if [ -n "$GATEWAY_PIDS" ]; then
    echo "Cleaning up orphaned gateway processes..."
    for pid in $GATEWAY_PIDS; do
        kill -9 "$pid" 2>/dev/null || true
    done
fi

OPENCODE_PIDS=$(pgrep -f "opencode serve" 2>/dev/null || true)
if [ -n "$OPENCODE_PIDS" ]; then
    for pid in $OPENCODE_PIDS; do
        if kill -0 "$pid" 2>/dev/null; then
            echo "Stopping orphaned opencode serve (PID $pid)..."
            kill "$pid" 2>/dev/null || true
        fi
    done
fi

echo "Done."
