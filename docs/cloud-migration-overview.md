# Cloud Migration Overview

This document provides an overview of the cloud migration from local SQLite to a cloud-native architecture.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Kubernetes Cluster                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Fastify Auth Service (Pods)                   │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │  │
│  │  │   Pod 1       │  │   Pod 2     │  │   Pod N     │ │  │
│  │  │  (HPA)       │  │  (HPA)      │  │  (HPA)      │ │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘ │  │
│  └──────────────────────────────────────────────────────┘  │
│                          │                                   │
│                          ▼                                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Service (ClusterIP)                     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          │
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ SQLiteCloud  │  │ Grafana Cloud│  │ Grafana Cloud│
│  (Database)  │  │    (Loki)    │  │ (Prometheus) │
└──────────────┘  └──────────────┘  └──────────────┘
                          │
                          ▼
                  ┌──────────────┐
                  │ Grafana Cloud│
                  │   (Tempo)    │
                  └──────────────┘
```

## Components

### 1. Application Service
- **Fastify Auth Service**: Single service (monolith, microservice-ready)
- **Deployment**: Kubernetes Deployment with resource limits
- **Scaling**: Horizontal Pod Autoscaler (HPA) based on CPU/Memory
- **Health Checks**: Liveness and readiness probes

### 2. Database
- **SQLiteCloud**: Cloud-hosted SQLite database
- **Connection**: Via Prisma with SQLiteCloud driver
- **Migrations**: Prisma migrations supported

### 3. Observability
- **Logs**: Pino → stdout → Vector (optional) → Grafana Cloud Loki
- **Metrics**: prom-client → Grafana Cloud Prometheus (remote write)
- **Traces**: OpenTelemetry → Grafana Cloud Tempo

### 4. Infrastructure
- **Kubernetes**: kind cluster (local testing) or EKS (production)
- **Auto-scaling**: HPA with CPU/Memory metrics
- **Service Discovery**: Kubernetes Service (ClusterIP)

## Key Features

### Microservice-Ready Architecture
- Single service now, but structured for easy splitting
- Clear separation of concerns (routes, services, repositories)
- Independent scaling capabilities

### Cloud-Native Observability
- **Logs**: Centralized in Grafana Cloud Loki
- **Metrics**: Real-time metrics in Grafana Cloud Prometheus
- **Traces**: Distributed tracing in Grafana Cloud Tempo
- **Dashboards**: Pre-configured Grafana dashboards

### Auto-Scaling
- **HPA**: Automatically scales pods based on CPU (70%) and Memory (80%)
- **Min Replicas**: 1
- **Max Replicas**: 5
- **Stabilization**: Configurable scale-up/down policies

### High Availability
- Multiple pod replicas
- Health checks and readiness probes
- Rolling updates for zero-downtime deployments

## File Structure

```
.
├── k8s/                          # Kubernetes manifests
│   ├── deployment.yaml           # Application deployment
│   ├── service.yaml              # Service definition
│   ├── configmap.yaml            # Non-sensitive config
│   ├── secret.yaml.template      # Secret template
│   ├── hpa.yaml                  # Horizontal Pod Autoscaler
│   └── ingress.yaml              # Ingress (optional)
├── scripts/                      # Deployment scripts
│   ├── setup-kind-cluster.sh    # Setup kind cluster
│   ├── deploy-to-k8s.sh         # Deploy to Kubernetes
│   ├── validate-deployment.sh   # Validate deployment
│   └── load-test-hpa.sh         # Test HPA scaling
├── docs/                         # Documentation
│   ├── grafana-cloud-setup.md    # Grafana Cloud setup
│   ├── sqlitecloud-setup.md      # SQLiteCloud setup
│   ├── k8s-deployment.md         # K8s deployment guide
│   └── hpa-testing.md            # HPA testing guide
├── grafana/                      # Grafana dashboards
│   ├── dashboards/               # Dashboard JSON files
│   └── datasources.yaml          # Datasource reference
└── .github/workflows/            # CI/CD pipelines
    └── deploy.yml                # GitHub Actions workflow
```

## Environment Variables

### Database
- `DB_TYPE`: `sqlite` or `sqlitecloud`
- `DATABASE_URL`: Connection string (SQLiteCloud format for cloud)

### Grafana Cloud
- `GRAFANA_CLOUD_LOKI_URL`: Loki push endpoint
- `GRAFANA_CLOUD_LOKI_USERNAME`: Loki username
- `GRAFANA_CLOUD_LOKI_PASSWORD`: Loki API key
- `GRAFANA_CLOUD_PROMETHEUS_URL`: Prometheus remote write endpoint
- `GRAFANA_CLOUD_PROMETHEUS_USERNAME`: Prometheus username
- `GRAFANA_CLOUD_PROMETHEUS_PASSWORD`: Prometheus API key
- `GRAFANA_CLOUD_TEMPO_URL`: Tempo OTLP endpoint
- `GRAFANA_CLOUD_TEMPO_USERNAME`: Tempo username
- `GRAFANA_CLOUD_TEMPO_PASSWORD`: Tempo API key

## Deployment Flow

1. **Setup Infrastructure**
   - Create kind cluster (local) or EKS (production)
   - Install metrics-server for HPA
   - Install ingress-nginx (optional)

2. **Configure Services**
   - Setup SQLiteCloud database
   - Configure Grafana Cloud (Loki, Prometheus, Tempo)
   - Create Kubernetes secrets

3. **Build & Deploy**
   - Build Docker image
   - Load into cluster (kind) or push to registry
   - Apply Kubernetes manifests
   - Verify deployment

4. **Validate**
   - Check pod status
   - Test health endpoints
   - Verify observability data
   - Test HPA scaling

## Migration Path

### Phase 1: Local Testing (Current)
- Use kind cluster for local testing
- Test all components locally
- Validate HPA behavior

### Phase 2: Staging
- Deploy to staging environment
- Test with real SQLiteCloud
- Validate Grafana Cloud integration

### Phase 3: Production
- Deploy to production (AWS EKS)
- Monitor and optimize
- Scale as needed

## Cost Optimization

### Free Tier Usage
- **Grafana Cloud**: Free tier includes 50GB logs, 10k metrics, 50GB traces/month
- **SQLiteCloud**: Check free tier limits
- **AWS**: Use Free Tier (EC2 t2.micro, EBS, etc.)

### Cost Monitoring
- Monitor Grafana Cloud usage
- Track SQLiteCloud usage
- Optimize log levels to reduce volume
- Use resource requests/limits effectively

## Security Considerations

1. **Secrets Management**: Use Kubernetes secrets, never commit to git
2. **Network Policies**: Implement network policies for pod communication
3. **RBAC**: Configure proper RBAC for Kubernetes resources
4. **TLS**: Use TLS for all external communications
5. **Image Security**: Scan Docker images for vulnerabilities

## Monitoring & Alerting

### Key Metrics to Monitor
- Pod CPU/Memory usage
- Request rate and latency
- Error rates
- Database query performance
- HPA scaling events

### Recommended Alerts
- High error rate (>5%)
- High latency (p95 > 2s)
- Pod failures
- HPA scaling failures
- Database connection errors

## Troubleshooting

### Common Issues
1. **Pods not starting**: Check secrets, resource limits, image pull
2. **HPA not scaling**: Verify metrics-server, resource requests
3. **No observability data**: Check Grafana Cloud credentials, network connectivity
4. **Database connection errors**: Verify SQLiteCloud credentials, network access

See individual documentation files for detailed troubleshooting guides.

## Next Steps

1. **Read Setup Guides**:
   - [Grafana Cloud Setup](grafana-cloud-setup.md)
   - [SQLiteCloud Setup](sqlitecloud-setup.md)
   - [Kubernetes Deployment](k8s-deployment.md)

2. **Deploy Locally**:
   - Run `scripts/setup-kind-cluster.sh`
   - Run `scripts/deploy-to-k8s.sh`
   - Validate with `scripts/validate-deployment.sh`

3. **Test HPA**:
   - Run `scripts/load-test-hpa.sh`
   - Monitor scaling behavior

4. **Configure Observability**:
   - Setup Grafana Cloud
   - Import dashboards
   - Configure alerts

## Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [Grafana Cloud Documentation](https://grafana.com/docs/grafana-cloud/)
- [SQLiteCloud Documentation](https://docs.sqlitecloud.io)
- [Prisma Documentation](https://www.prisma.io/docs/)

