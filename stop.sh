#!/bin/bash
PID_FILE="/tmp/gateway.pid"

if [ ! -f "$PID_FILE" ]; then
  echo "Gateway is not running (no PID file found)"
  exit 0
fi

PID=$(cat "$PID_FILE")

if ! kill -0 "$PID" 2>/dev/null; then
  echo "Gateway is not running (stale PID file)"
  rm -f "$PID_FILE"
  exit 0
fi

echo "Stopping gateway (PID $PID)..."
kill "$PID"

attempts=0
while kill -0 "$PID" 2>/dev/null && [ $attempts -lt 10 ]; do
  sleep 0.5
  ((attempts++))
done

if kill -0 "$PID" 2>/dev/null; then
  echo "Process didn't stop gracefully, force killing..."
  kill -9 "$PID"
fi

rm -f "$PID_FILE"
echo "✅ Gateway stopped"
