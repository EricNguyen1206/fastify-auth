# Performance Test Results

This directory contains the results of K6 performance tests.

## Test Configurations

Tests are run against three different runtime configurations:

1. **npm**: Single instance via `node src/server.js`
2. **pnpm**: Single instance via `pnpm start`
3. **pm2**: 4-cluster mode via `pm2 start ecosystem.config.js`

## Test Scenarios

### Load Test (5 minutes)

- **Goal**: Simulate normal production traffic
- **Pattern**: 0 → 50 VUs (1min) → 50 VUs (2min) → 100 VUs (1min) → 0
- **Thresholds**:
  - P95 response time < 500ms
  - P99 response time < 1000ms
  - Error rate < 1%
  - Throughput > 100 req/s

### Stress Test (10 minutes)

- **Goal**: Find breaking point
- **Pattern**: 0 → 100 → 500 → 1000 → 2000 VUs (aggressive ramp)
- **Thresholds**:
  - Error rate < 10% (higher tolerance)
  - P95 response time < 3000ms

## Running Tests

### Individual Tests

```bash
# Load test with npm
npm run perf:load:npm

# Stress test with PM2 (4 clusters)
npm run perf:stress:pm2
```

### All Tests

```powershell
# Run all combinations
./src/tests/k6/run-all-tests.ps1
```

## Results Format

Results are saved as:

- `load-test-{runtime}-{timestamp}.json`
- `stress-test-{runtime}-{timestamp}.json`

## Metrics to Analyze

- **http_reqs**: Total number of requests
- **http_req_duration**: Response time distribution (avg, p95, p99)
- **http_req_failed**: Error rate
- **vus**: Number of active virtual users
- **vus_max**: Maximum concurrent virtual users
- **data_received**: Network bandwidth consumed
- **iterations**: Number of complete test iterations

## Example Result Interpretation

```
✓ http_req_duration..............: avg=150ms p95=400ms p99=800ms
✓ http_reqs......................: 12000 (100/s)
✓ http_req_failed................: 0.5%
✓ vus............................: 100
```

This indicates:

- Average response time: 150ms
- 95th percentile: 400ms (PASS: < 500ms threshold)
- 99th percentile: 800ms (PASS: < 1000ms threshold)
- Request rate: 100 requests/second
- Error rate: 0.5% (PASS: < 1% threshold)
- Peak concurrent users: 100

## Comparison Template

| Metric             | npm | pnpm | pm2 (4 clusters) |
| ------------------ | --- | ---- | ---------------- |
| P95 Response Time  | -   | -    | -                |
| P99 Response Time  | -   | -    | -                |
| Throughput (req/s) | -   | -    | -                |
| Error Rate (%)     | -   | -    | -                |
| Memory Usage (MB)  | -   | -    | -                |

Fill in after running tests to compare performance across configurations.
