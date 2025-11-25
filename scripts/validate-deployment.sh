#!/bin/bash
# Validation script for fastify-auth-service deployment
# This script validates that the deployment is working correctly

set -e

echo "Validating fastify-auth-service deployment..."

# Check if pods are running
echo "Checking pod status..."
PODS=$(kubectl get pods -l app=fastify-auth-service -o jsonpath='{.items[*].metadata.name}')
if [ -z "$PODS" ]; then
    echo "❌ Error: No pods found"
    exit 1
fi

for POD in $PODS; do
    STATUS=$(kubectl get pod "$POD" -o jsonpath='{.status.phase}')
    if [ "$STATUS" != "Running" ]; then
        echo "❌ Pod $POD is not Running (status: $STATUS)"
        exit 1
    fi
    echo "✅ Pod $POD is Running"
done

# Check service
echo "Checking service..."
if ! kubectl get svc fastify-auth-service &> /dev/null; then
    echo "❌ Error: Service 'fastify-auth-service' not found"
    exit 1
fi
echo "✅ Service 'fastify-auth-service' exists"

# Check HPA
echo "Checking HPA..."
if ! kubectl get hpa fastify-auth-hpa &> /dev/null; then
    echo "⚠️  Warning: HPA 'fastify-auth-hpa' not found"
else
    echo "✅ HPA 'fastify-auth-hpa' exists"
fi

# Test health endpoint
echo "Testing health endpoint..."
POD=$(kubectl get pods -l app=fastify-auth-service -o jsonpath='{.items[0].metadata.name}')
if kubectl exec "$POD" -- wget -q -O- http://localhost:8000/health > /dev/null 2>&1; then
    echo "✅ Health endpoint is responding"
else
    echo "❌ Error: Health endpoint is not responding"
    exit 1
fi

# Test metrics endpoint
echo "Testing metrics endpoint..."
if kubectl exec "$POD" -- wget -q -O- http://localhost:8000/metrics > /dev/null 2>&1; then
    echo "✅ Metrics endpoint is responding"
else
    echo "⚠️  Warning: Metrics endpoint is not responding"
fi

# Check logs for errors
echo "Checking recent logs for errors..."
ERRORS=$(kubectl logs -l app=fastify-auth-service --tail=50 | grep -i error | wc -l)
if [ "$ERRORS" -gt 0 ]; then
    echo "⚠️  Warning: Found $ERRORS error(s) in recent logs"
    kubectl logs -l app=fastify-auth-service --tail=50 | grep -i error
else
    echo "✅ No errors in recent logs"
fi

echo ""
echo "✅ Validation complete! Deployment appears to be healthy."

