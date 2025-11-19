# OpenTelemetry Integration Guide - Professional Audit Logging

## Overview
This project uses **OpenTelemetry (OTel)** for professional, enterprise-grade observability and audit logging. All logs include distributed tracing context, sensitive data filtering, and structured metadata for compliance and security monitoring.

## Architecture

```
Application → OpenTelemetry SDK → OTLP Exporter → Loki (OTLP) → Grafana
                ↓
        Pino Logger (with OTel instrumentation)
                ↓
        Custom Audit Logger (with trace context)
```

## Features

### 1. **Automatic Instrumentation**
- ✅ HTTP requests/responses (method, url, status, timing)
- ✅ Database queries via Prisma
- ✅ Fastify framework hooks
- ✅ Pino logger with trace context injection
- ✅ Automatic error tracking

### 2. **Professional Audit Logging**
Every log entry includes:
- `trace_id`: Distributed trace identifier (correlate across microservices)
- `span_id`: Specific operation identifier
- `trace_flags`: Sampling decision
- `audit.category`: Log category (authentication, user_profile, security, etc.)
- `audit.action`: Specific action performed
- `timestamp`: ISO 8601 timestamp
- **Sensitive data automatically redacted** (passwords, tokens, secrets)

### 3. **Audit Categories**

#### Authentication Events
```javascript
fastify.audit.auth('signin_success', {
  userId: user.id,
  email: user.email,
  ip: request.ip,
  userAgent: request.headers['user-agent'],
});
```

#### Security Events
```javascript
fastify.audit.security('signin_failed', {
  email,
  ip: request.ip,
  reason: 'Invalid credentials',
});
```

#### User Profile Operations
```javascript
fastify.audit.user('profile_update', {
  userId: user.id,
  fields: ['name', 'email'],
});
```

#### Database Operations
```javascript
fastify.audit.database('user_created', {
  userId: newUser.id,
  table: 'users',
});
```

#### Access Control
```javascript
fastify.audit.access('permission_denied', {
  userId: user.id,
  resource: '/admin/users',
  reason: 'Insufficient permissions',
});
```

### 4. **Automatic Request/Response Logging**
The audit plugin automatically logs:
- All incoming requests (method, url, headers, ip)
- All responses (status code, response time)
- All errors with full context

### 5. **Sensitive Data Protection**
The following fields are **automatically redacted**:
- password, passwordConfirm, currentPassword, newPassword
- token, accessToken, refreshToken, jwt
- secret, apiKey, authorization, cookie
- sessionId, ssn, creditCard, cvv

## Configuration

### Environment Variables (.env)
```properties
# Enable OpenTelemetry + Loki integration
LOKI_ENABLED=true

# Loki endpoint for OTLP
LOKI_URL=http://localhost:3101
```

### Loki Configuration (infra/loki-config.yaml)
```yaml
distributor:
  otlp:
    enabled: true  # Enable OTLP receiver

limits_config:
  allow_structured_metadata: true
  otlp_config:
    resource_attributes:
      ignore_defaults: false
```

## Running the Application

### Start Infrastructure
```bash
cd infra
podman compose up -d
```

This starts:
- **Loki** on port 3101 (HTTP) and 4318 (OTLP)
- **Grafana** on port 3001

### Start Application
```bash
npm run dev
```

You should see:
```
🚀 Initializing OpenTelemetry for professional audit logging...
✅ OpenTelemetry initialized successfully
📡 Sending logs to: http://localhost:3101/otlp/v1/logs
📡 Sending traces to: http://localhost:3101/otlp/v1/traces
✅ Audit logging plugin registered
```

## Grafana Queries

### 1. View All Audit Logs
```logql
{application="fastify-auth"} | json | line_format "{{.level}} | {{.audit_category}} | {{.audit_action}}"
```

### 2. Authentication Events Only
```logql
{application="fastify-auth"} | json | audit_category="authentication"
```

### 3. Failed Login Attempts
```logql
{application="fastify-auth"} | json | audit_category="security" | audit_event="signin_failed"
```

### 4. All Actions by Specific User
```logql
{application="fastify-auth"} | json | audit_userId="<USER_ID>"
```

### 5. All Logs for a Specific Request (via Trace ID)
```logql
{application="fastify-auth"} | json | trace_id="<TRACE_ID>"
```

### 6. API Response Times (P95)
```logql
quantile_over_time(0.95, 
  {application="fastify-auth"} 
  | json 
  | audit_category="api_response" 
  | unwrap audit_responseTime [5m]
)
```

### 7. Error Rate per Minute
```logql
sum(rate({application="fastify-auth", level="error"}[1m]))
```

### 8. Top 10 Slowest Endpoints
```logql
topk(10, 
  avg_over_time(
    {application="fastify-auth"} 
    | json 
    | audit_category="api_response" 
    | unwrap audit_responseTime [5m]
  ) by (audit_url)
)
```

## Custom Spans for Business Logic

Add custom tracing to your business logic:

```javascript
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('fastify-auth');

async function complexOperation(userId) {
  const span = tracer.startSpan('complex_user_operation');
  
  try {
    span.setAttribute('user.id', userId);
    span.setAttribute('operation.type', 'business_logic');
    
    // Your business logic here
    const result = await doSomething();
    
    span.setAttribute('operation.result', 'success');
    return result;
  } catch (error) {
    span.recordException(error);
    span.setAttribute('operation.result', 'failure');
    throw error;
  } finally {
    span.end();
  }
}
```

## Compliance & Security Benefits

### 1. **Audit Trail**
- Complete log of all authentication events
- Track all data access and modifications
- Identify unauthorized access attempts

### 2. **Incident Response**
- Trace requests across the entire stack
- Correlate logs with specific user actions
- Quick root cause analysis

### 3. **Performance Monitoring**
- Identify slow endpoints automatically
- Track response times over time
- Monitor error rates in real-time

### 4. **Compliance (GDPR, SOC2, HIPAA)**
- Sensitive data automatically filtered
- Complete audit trail of data access
- Retention policies configurable in Loki

## Extending the Audit Logger

### Add New Audit Category
Edit `src/lib/audit-logger.js`:

```javascript
export class AuditLogger {
  // ... existing methods ...
  
  payment(action, details) {
    const traceContext = getTraceContext();
    const sanitized = sanitizeData(details);

    this.logger.info({
      ...traceContext,
      audit: {
        category: 'payment',
        action,
        ...sanitized,
        timestamp: new Date().toISOString(),
      },
    }, `PAYMENT: ${action}`);
  }
}
```

### Add Custom Sensitive Fields
Edit `SENSITIVE_FIELDS` in `src/lib/audit-logger.js`:

```javascript
const SENSITIVE_FIELDS = new Set([
  // ... existing fields ...
  'bankAccount',
  'routingNumber',
  'taxId',
]);
```

## Troubleshooting

### Logs Not Appearing in Loki
1. Check `LOKI_ENABLED=true` in `.env`
2. Verify Loki is running:
   ```bash
   podman ps | grep loki
   ```
3. Check Loki logs:
   ```bash
   podman logs infra_loki_1
   ```
4. Test OTLP endpoint:
   ```bash
   curl http://localhost:3101/otlp/v1/logs
   ```

### No Trace Context in Logs
1. Verify OpenTelemetry initialized successfully (check console)
2. Ensure `initializeOpenTelemetry()` is called **first** in `server.js`
3. Check that logs include `trace_id` field

### Performance Impact
OpenTelemetry has minimal overhead (~1-3% CPU). To optimize:

1. Adjust batch processor in `src/configs/otel.js`:
   ```javascript
   scheduledDelayMillis: 10000,  // Export every 10 seconds instead of 5
   maxQueueSize: 500,            // Reduce queue size
   ```

2. Disable verbose instrumentations:
   ```javascript
   '@opentelemetry/instrumentation-dns': { enabled: false },
   '@opentelemetry/instrumentation-net': { enabled: false },
   ```

## Best Practices

1. **Always use the audit logger for sensitive operations**
   ```javascript
   fastify.audit.auth('action', details);
   ```

2. **Never log sensitive data directly**
   ```javascript
   // ❌ BAD
   fastify.log.info({ password: user.password });
   
   // ✅ GOOD
   fastify.audit.auth('action', { userId: user.id });
   ```

3. **Use custom spans for complex operations**
   ```javascript
   const span = tracer.startSpan('operation_name');
   // ... do work ...
   span.end();
   ```

4. **Query by trace_id for debugging**
   - Get trace_id from application logs
   - Search in Grafana: `| trace_id="<ID>"`

## References
- [OpenTelemetry Documentation](https://opentelemetry.io/docs/)
- [Loki OTLP Documentation](https://grafana.com/docs/loki/latest/send-data/otel/)
- [OpenTelemetry JavaScript](https://opentelemetry.io/docs/languages/js/)
- [Grafana LogQL](https://grafana.com/docs/loki/latest/query/)
