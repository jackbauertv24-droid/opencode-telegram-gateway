#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$SCRIPT_DIR/data/gateway.pid"
LOG_FILE="/tmp/gateway.log"

cd "$SCRIPT_DIR"

mkdir -p "$(dirname "$PID_FILE")"

if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if kill -0 "$OLD_PID" 2>/dev/null; then
        echo "Gateway is already running (PID $OLD_PID)"
        echo "Run ./stop.sh first if you want to restart"
        exit 1
    else
        rm -f "$PID_FILE"
    fi
fi

if [ -f "$SCRIPT_DIR/.env" ]; then
    export $(grep -v '^#' "$SCRIPT_DIR/.env" | xargs)
fi

echo "Starting OpenCode Telegram Gateway..."

nohup npx tsx src/index.ts > "$LOG_FILE" 2>&1 &
MAIN_PID=$!

echo $MAIN_PID > "$PID_FILE"

sleep 2

if ! kill -0 "$MAIN_PID" 2>/dev/null; then
    echo "❌ Gateway failed to start. Check $LOG_FILE for details:"
    tail -20 "$LOG_FILE"
    rm -f "$PID_FILE"
    exit 1
fi

echo "✅ Gateway started"
echo "   PID: $MAIN_PID"
echo "   Log: $LOG_FILE"
echo "   PID file: $PID_FILE"
