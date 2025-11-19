#!/bin/bash
# Quick Start Guide for OpenTelemetry Audit Logging

echo "🚀 OpenTelemetry Audit Logging - Quick Start"
echo "==========================================="
echo ""

# Check if Loki is running
echo "📊 Step 1: Checking Loki infrastructure..."
if podman ps | grep -q loki; then
    echo "✅ Loki is already running"
else
    echo "⚠️  Loki is not running. Starting Loki..."
    cd infra && podman compose up -d
    cd ..
    echo "✅ Loki started successfully"
    sleep 3
fi

echo ""
echo "📊 Step 2: Checking Grafana..."
if podman ps | grep -q grafana; then
    echo "✅ Grafana is running at http://localhost:3001"
    echo "   Login: admin / admin"
else
    echo "⚠️  Grafana is not running"
fi

echo ""
echo "📊 Step 3: Starting application with OpenTelemetry..."
echo ""

# Set environment variables
export NODE_ENV=development
export LOKI_ENABLED=true
export LOKI_URL=http://localhost:3101

# Start the server
npm start
