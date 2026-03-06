#!/bin/bash
# Grocery app startup script
pkill -f "node /workspace/grocery-app/server.js" 2>/dev/null
sleep 1
nohup node /workspace/grocery-app/server.js >> /tmp/grocery-app.log 2>&1 &
echo "Grocery app started (pid $!)"
