# HPA (Horizontal Pod Autoscaler) Testing Guide

This guide explains how to test and validate the Horizontal Pod Autoscaler (HPA) for the Fastify Auth service.

## Overview

The HPA automatically scales the number of pods based on CPU and memory utilization. Our configuration:
- **Min replicas**: 1
- **Max replicas**: 5
- **CPU target**: 70% utilization
- **Memory target**: 80% utilization

## Prerequisites

- Kubernetes cluster running (kind or other)
- Metrics-server installed
- Application deployed and running
- HPA created and active

## Step 1: Verify HPA Configuration

### Check HPA Status

```bash
kubectl get hpa fastify-auth-hpa
```

Expected output:
```
NAME                 REFERENCE                       TARGETS         MINPODS   MAXPODS   REPLICAS   AGE
fastify-auth-hpa     Deployment/fastify-auth-service 70%/70%, 80%/80%   1         5         1         5m
```

### Describe HPA

```bash
kubectl describe hpa fastify-auth-hpa
```

This shows:
- Current metrics values
- Target values
- Scaling events
- Any errors or warnings

## Step 2: Verify Metrics Server

HPA requires metrics-server to collect pod metrics:

```bash
# Check metrics-server is running
kubectl get deployment metrics-server -n kube-system

# Check pod metrics are available
kubectl top pods
```

If metrics are not available, install metrics-server:
```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

## Step 3: Baseline Test

### Check Initial State

```bash
# Get current pod count
kubectl get pods -l app=fastify-auth-service

# Get current resource usage
kubectl top pods -l app=fastify-auth-service

# Get HPA status
kubectl get hpa fastify-auth-hpa
```

## Step 4: Generate Load

### Option 1: Using Load Test Script

```bash
chmod +x scripts/load-test-hpa.sh
./scripts/load-test-hpa.sh
```

This script:
1. Sets up port-forward
2. Runs k6 load test with increasing load
3. Monitors pod scaling
4. Shows final results

### Option 2: Manual Load Test with k6

1. Port-forward to service:
```bash
kubectl port-forward svc/fastify-auth-service 8000:8000
```

2. Create k6 test script (`load-test.js`):
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '1m', target: 50 },
    { duration: '3m', target: 100 },
    { duration: '1m', target: 0 },
  ],
};

export default function () {
  const res = http.get('http://localhost:8000/health');
  check(res, { 'status is 200': (r) => r.status === 200 });
  sleep(1);
}
```

3. Run test:
```bash
k6 run load-test.js
```

### Option 3: Using Apache Bench (ab)

```bash
# Install ab if needed
# macOS: brew install httpd
# Linux: sudo apt-get install apache2-utils

ab -n 10000 -c 100 http://localhost:8000/health
```

### Option 4: Using hey

```bash
# Install hey: go install github.com/rakyll/hey@latest

hey -n 10000 -c 100 http://localhost:8000/health
```

## Step 5: Monitor Scaling

### Watch HPA in Real-time

```bash
# Terminal 1: Watch HPA
kubectl get hpa fastify-auth-hpa -w

# Terminal 2: Watch pods
kubectl get pods -l app=fastify-auth-service -w

# Terminal 3: Watch resource usage
watch kubectl top pods -l app=fastify-auth-service
```

### Expected Behavior

1. **Initial**: 1 pod running
2. **Load increases**: CPU/Memory usage rises
3. **Threshold reached**: HPA detects >70% CPU or >80% Memory
4. **Scaling up**: New pods are created (up to max 5)
5. **Load decreases**: CPU/Memory usage drops
6. **Scaling down**: Pods are terminated (down to min 1)

## Step 6: Verify Scaling Events

### Check HPA Events

```bash
kubectl describe hpa fastify-auth-hpa
```

Look for events like:
```
Events:
  Type    Reason             Age   From                       Message
  ----    ------             ----  ----                       -------
  Normal  SuccessfulRescale   2m    horizontal-pod-autoscaler  New size: 3; reason: cpu resource utilization (percentage of request) above target
  Normal  SuccessfulRescale   1m    horizontal-pod-autoscaler  New size: 2; reason: All metrics below target
```

### Check Pod Events

```bash
kubectl get events --sort-by='.lastTimestamp' | grep fastify-auth
```

## Step 7: Validate Scaling Behavior

### Scale Up Test

1. Generate high load (100+ concurrent requests)
2. Verify pods scale up to handle load
3. Check that new pods become ready
4. Verify load is distributed across pods

### Scale Down Test

1. Stop load generation
2. Wait for stabilization period (5 minutes default)
3. Verify pods scale down gradually
4. Ensure at least 1 pod remains running

## Step 8: Test Edge Cases

### Rapid Load Changes

Test how HPA handles rapid load changes:
- Sudden spike in traffic
- Sudden drop in traffic
- Oscillating load pattern

### Resource Limits

Test behavior when pods hit resource limits:
```bash
# Check if pods are being OOMKilled
kubectl get pods -l app=fastify-auth-service
kubectl describe pod <pod-name> | grep -A 5 "Last State"
```

### HPA Behavior Configuration

Our HPA uses:
- **Scale Down**: 50% reduction, 5-minute stabilization
- **Scale Up**: 100% increase or +2 pods, 30-second intervals

Adjust in `k8s/hpa.yaml` if needed.

## Step 9: Performance Analysis

### Before Scaling

```bash
# Get baseline metrics
kubectl top pods -l app=fastify-auth-service
kubectl get hpa fastify-auth-hpa -o yaml
```

### During Scaling

Monitor:
- Response times (should improve with more pods)
- Error rates (should decrease)
- Resource utilization per pod

### After Scaling

```bash
# Get final state
kubectl get pods -l app=fastify-auth-service
kubectl get hpa fastify-auth-hpa
kubectl top pods -l app=fastify-auth-service
```

## Troubleshooting

### HPA Not Scaling Up

1. **Check metrics availability**:
```bash
kubectl top pods -l app=fastify-auth-service
```

2. **Check HPA status**:
```bash
kubectl describe hpa fastify-auth-hpa
```
Look for errors like "failed to get cpu utilization"

3. **Verify resource requests/limits**:
```bash
kubectl get deployment fastify-auth-service -o yaml | grep -A 10 resources
```

4. **Check metrics-server**:
```bash
kubectl get deployment metrics-server -n kube-system
kubectl logs -n kube-system deployment/metrics-server
```

### HPA Scaling Too Aggressively

1. Increase stabilization window in `k8s/hpa.yaml`
2. Adjust scale-down policies
3. Review resource requests/limits

### HPA Not Scaling Down

1. Check scale-down policies
2. Verify load has actually decreased
3. Check for minimum replica constraints

## Best Practices

1. **Set appropriate resource requests**: Too low = unnecessary scaling, too high = inefficient
2. **Monitor HPA behavior**: Use Grafana dashboards to track scaling events
3. **Test regularly**: Run load tests in staging before production
4. **Set alerts**: Alert on HPA scaling events or failures
5. **Review metrics**: Regularly review CPU/Memory usage patterns

## Additional Resources

- [Kubernetes HPA Documentation](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/)
- [HPA Best Practices](https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/#best-practices)
- [Metrics Server](https://github.com/kubernetes-sigs/metrics-server)

