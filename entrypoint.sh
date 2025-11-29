#!/bin/sh

# Start Grafana Alloy in background
echo "Starting Grafana Alloy..."
/usr/bin/alloy run /etc/alloy/config.alloy --server.http.listen-addr=0.0.0.0:12345 &

# Start Node.js application
echo "Starting Node.js application..."
exec node src/server.js
