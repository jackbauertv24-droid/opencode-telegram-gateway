#!/bin/bash
cd /root/opencode-workspace/open-claude/opencode-telegram-gateway
nohup npx tsx src/index.ts > /tmp/gateway.log 2>&1 &
echo $! > /tmp/gateway.pid
disown
echo "Gateway started with PID $(cat /tmp/gateway.pid)"
