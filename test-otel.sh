#!/bin/bash
# Quick test script for OpenTelemetry setup

# Set environment variables for testing
export NODE_ENV=development
export LOKI_ENABLED=true
export LOKI_URL=http://localhost:3101
export JWT_SECRET=test-secret-for-development-only-min-length
export COOKIE_SECRET=test-cookie-secret

echo "🧪 Testing OpenTelemetry setup..."
echo "📝 Environment:"
echo "  NODE_ENV=$NODE_ENV"
echo "  LOKI_ENABLED=$LOKI_ENABLED"
echo "  LOKI_URL=$LOKI_URL"
echo ""

# Start server
node src/server.js
