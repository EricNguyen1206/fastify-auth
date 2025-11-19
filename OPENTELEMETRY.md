# OpenTelemetry Integration Guide

## Overview
This project uses OpenTelemetry (OTel) for unified observability - logs, traces, and metrics following industry standards.

## Architecture

```
Application → OpenTelemetry SDK → OTLP Exporter → Loki (via OTLP) → Grafana
```

## What's Included

### 1. **Automatic Instrumentation**
- HTTP requests/responses
- Database queries (SQLite)
- Fastify framework hooks

### 2. **Structured Logging**
- All logs include OpenTelemetry trace context:
  - `trace_id`: Unique identifier for the entire request flow
  - `span_id`: Unique identifier for this specific operation
  - `trace_flags`: Sampling decision flags

### 3. **Log Correlation**
- Logs are automatically correlated with traces
- Easy to follow request flow across services

## Configuration

### Environment Variables (.env)
```properties
# Enable OpenTelemetry + Loki integration
LOKI_ENABLED=true

# Loki endpoint (OpenTelemetry will use OTLP protocol)
LOKI_URL=http://localhost:3101
```

### Loki Configuration
The Loki instance is configured to receive logs via OTLP protocol on port **4318**.

```yaml
distributor:
  otlp:
    enabled: true
```

## Running the Application

### Development Mode
```bash
npm run dev
```
This will automatically:
1. Initialize OpenTelemetry (first import in `src/server.js`)
2. Start auto-instrumentation for HTTP, etc.
3. Send logs to Loki via OTLP

### Production Mode
```bash
npm start
```

**Note:** OpenTelemetry is initialized directly in the code (at the top of `src/server.js`), so it works with any Node.js version >= 18.15.0.


## Grafana Queries

### 1. View All Logs with Trace Context
```logql
{application="fastify-auth"}
```

### 2. Find All Logs for a Specific Trace
```logql
{application="fastify-auth"} | json | trace_id="<YOUR_TRACE_ID>"
```

### 3. View Only Error Logs
```logql
{application="fastify-auth", level="error"}
```

### 4. Count Requests per Minute
```logql
sum(rate({application="fastify-auth"}[1m]))
```

### 5. Average Response Time
```logql
avg_over_time({application="fastify-auth"} | json | unwrap responseTime [5m])
```

## Benefits of OpenTelemetry

### 1. **Standardization**
- Industry-standard format (OTLP)
- Works with any OTel-compatible backend
- Easy to switch between Loki, Datadog, New Relic, etc.

### 2. **Trace Correlation**
- Every log entry includes trace context
- Follow requests across multiple services
- Debug distributed systems easily

### 3. **Performance Insights**
- Automatic instrumentation captures timing data
- Analyze slow requests
- Identify bottlenecks

### 4. **Automatic Context**
- Request ID, trace ID, span ID added automatically
- No manual logging infrastructure needed

## Extending OpenTelemetry

### Add Custom Spans
```javascript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('my-service');

async function myFunction() {
  const span = tracer.startSpan('my-operation');
  
  try {
    // Your code here
    span.setAttribute('user.id', userId);
    span.setAttribute('operation.type', 'database');
    
  } catch (error) {
    span.recordException(error);
    throw error;
  } finally {
    span.end();
  }
}
```

### Add Custom Attributes to Logs
```javascript
fastify.log.info({
  msg: 'User registered',
  userId: user.id,
  email: user.email,
  // OpenTelemetry will automatically add trace context
});
```

## Troubleshooting

### Logs Not Appearing in Loki
1. Check if `LOKI_ENABLED=true` in `.env`
2. Verify Loki is running: `podman ps`
3. Check Loki logs: `podman logs infra_loki_1`
4. Test OTLP endpoint:
   ```bash
   curl http://localhost:4318/v1/logs
   ```

### No Trace Context in Logs
1. Make sure you're using `npm run dev` (not `dev:simple`)
2. Check that OTel initialized successfully (check console on startup)
3. Verify `trace_id` appears in console logs

### Performance Issues
1. Adjust batch processor settings in `src/configs/otel.js`:
   ```javascript
   scheduledDelayMillis: 10000, // Increase to 10 seconds
   maxQueueSize: 50,            // Reduce queue size
   ```

## References
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Loki OTLP Documentation](https://grafana.com/docs/loki/latest/send-data/otel/)
- [OpenTelemetry JavaScript](https://opentelemetry.io/docs/languages/js/)
