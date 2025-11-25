#!/bin/bash
# Load testing script to trigger HPA scaling
# This script generates load using k6 to test HPA auto-scaling

set -e

SERVICE_NAME="fastify-auth-service"
NAMESPACE="default"

echo "Load testing ${SERVICE_NAME} to trigger HPA scaling..."

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo "Error: k6 is not installed"
    echo "Install k6: https://k6.io/docs/getting-started/installation/"
    exit 1
fi

# Port-forward to service
echo "Setting up port-forward to service..."
kubectl port-forward svc/${SERVICE_NAME} 8000:8000 > /dev/null 2>&1 &
PORT_FORWARD_PID=$!

# Wait for port-forward to be ready
sleep 2

# Cleanup function
cleanup() {
    echo "Cleaning up..."
    kill $PORT_FORWARD_PID 2>/dev/null || true
    kubectl port-forward svc/${SERVICE_NAME} 8000:8000 > /dev/null 2>&1 || true
}
trap cleanup EXIT

# Get initial pod count
INITIAL_PODS=$(kubectl get pods -l app=fastify-auth-service --no-headers | wc -l)
echo "Initial pod count: ${INITIAL_PODS}"

# Create k6 test script
cat > /tmp/hpa-load-test.js << 'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 10 },   // Ramp up to 10 users
    { duration: '2m', target: 50 },     // Ramp up to 50 users
    { duration: '3m', target: 100 },   // Ramp up to 100 users
    { duration: '2m', target: 50 },     // Ramp down to 50 users
    { duration: '1m', target: 0 },     // Ramp down to 0 users
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'], // 95% of requests should be below 2s
  },
};

export default function () {
  // Test health endpoint
  const healthRes = http.get('http://localhost:8000/health');
  check(healthRes, {
    'health status is 200': (r) => r.status === 200,
  });

  // Test metrics endpoint
  const metricsRes = http.get('http://localhost:8000/metrics');
  check(metricsRes, {
    'metrics status is 200': (r) => r.status === 200,
  });

  sleep(1);
}
EOF

echo "Starting load test..."
echo "This will run for approximately 9 minutes"
echo "Monitor HPA: kubectl get hpa -w"
echo "Monitor pods: kubectl get pods -l app=fastify-auth-service -w"
echo ""

# Run k6 test
k6 run /tmp/hpa-load-test.js

# Wait a bit for HPA to stabilize
echo ""
echo "Waiting 30 seconds for HPA to stabilize..."
sleep 30

# Get final pod count
FINAL_PODS=$(kubectl get pods -l app=fastify-auth-service --no-headers | wc -l)
echo "Final pod count: ${FINAL_PODS}"

# Show HPA status
echo ""
echo "HPA Status:"
kubectl get hpa fastify-auth-hpa

# Show pod status
echo ""
echo "Pod Status:"
kubectl get pods -l app=fastify-auth-service

echo ""
echo "✅ Load test complete!"
echo "HPA should have scaled from ${INITIAL_PODS} to ${FINAL_PODS} pods"

