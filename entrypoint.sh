#!/bin/sh

echo "🚀 Starting Entrypoint Script..."

# Start Grafana Alloy in background and redirect logs to stdout
# We use > /dev/stdout to ensure logs are captured by Cloud Run
echo "🔥 Starting Grafana Alloy..."
/usr/bin/alloy run /etc/alloy/config.alloy --server.http.listen-addr=0.0.0.0:12345 --storage.path=/tmp/alloy > /dev/stdout 2>&1 &
ALLOY_PID=$!
echo "✅ Grafana Alloy started with PID $ALLOY_PID"

# Start Node.js application
echo "🚀 Starting Node.js application..."
exec node src/server.js
