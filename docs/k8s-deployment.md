# Kubernetes Deployment Guide

This guide will help you deploy the Fastify Auth service to a Kubernetes cluster (using kind for local testing).

## Prerequisites

- Docker installed and running
- kubectl installed
- kind installed (for local cluster)
- Docker image built and available

## Step 1: Setup Kind Cluster

### Install kind

**macOS/Linux:**
```bash
curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.20.0/kind-linux-amd64
chmod +x ./kind
sudo mv ./kind /usr/local/bin/kind
```

**Windows:**
```powershell
choco install kind
# Or download from: https://kind.sigs.k8s.io/docs/user/quick-start/#installation
```

### Create Cluster

Run the setup script:
```bash
chmod +x scripts/setup-kind-cluster.sh
./scripts/setup-kind-cluster.sh
```

Or manually:
```bash
kind create cluster --name fastify-auth-cluster
```

### Install Metrics Server (for HPA)

```bash
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
```

### Install Ingress (Optional)

```bash
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
kubectl wait --namespace ingress-nginx \
  --for=condition=ready pod \
  --selector=app.kubernetes.io/component=controller \
  --timeout=300s
```

## Step 2: Build Docker Image

```bash
docker build -t fastify-auth-service:latest .
```

## Step 3: Load Image into Kind

```bash
kind load docker-image fastify-auth-service:latest --name fastify-auth-cluster
```

## Step 4: Configure Secrets

### Create Secret File

1. Copy the template:
```bash
cp k8s/secret.yaml.template k8s/secret.yaml
```

2. Edit `k8s/secret.yaml` with your actual values:
   - Database connection string (SQLiteCloud or local)
   - JWT secret (minimum 32 characters)
   - Cookie secret
   - Grafana Cloud credentials (optional)

3. Apply the secret:
```bash
kubectl apply -f k8s/secret.yaml
```

### Or Create Secret via kubectl

```bash
kubectl create secret generic fastify-auth-secrets \
  --from-literal=DATABASE_URL="sqlitecloud://user:pass@host:port/db" \
  --from-literal=JWT_SECRET="your-jwt-secret-minimum-32-characters" \
  --from-literal=COOKIE_SECRET="your-cookie-secret" \
  --from-literal=GRAFANA_CLOUD_LOKI_URL="https://logs-prod-XXX.grafana.net/loki/api/v1/push" \
  --from-literal=GRAFANA_CLOUD_LOKI_USERNAME="your-username" \
  --from-literal=GRAFANA_CLOUD_LOKI_PASSWORD="your-api-key"
```

## Step 5: Deploy Application

### Using Deployment Script

```bash
chmod +x scripts/deploy-to-k8s.sh
./scripts/deploy-to-k8s.sh
```

### Manual Deployment

```bash
# Apply ConfigMap
kubectl apply -f k8s/configmap.yaml

# Apply Deployment
kubectl apply -f k8s/deployment.yaml

# Apply Service
kubectl apply -f k8s/service.yaml

# Apply HPA
kubectl apply -f k8s/hpa.yaml

# Apply Ingress (optional)
kubectl apply -f k8s/ingress.yaml
```

## Step 6: Verify Deployment

### Check Pod Status

```bash
kubectl get pods -l app=fastify-auth-service
```

### Check Service

```bash
kubectl get svc fastify-auth-service
```

### Check HPA

```bash
kubectl get hpa fastify-auth-hpa
```

### View Logs

```bash
kubectl logs -f deployment/fastify-auth-service
```

### Run Validation Script

```bash
chmod +x scripts/validate-deployment.sh
./scripts/validate-deployment.sh
```

## Step 7: Access the Service

### Port Forward

```bash
kubectl port-forward svc/fastify-auth-service 8000:8000
```

Then access:
- Health: http://localhost:8000/health
- Metrics: http://localhost:8000/metrics
- API: http://localhost:8000/api/auth/*

### Using Ingress

If Ingress is installed, add to `/etc/hosts`:
```
127.0.0.1 fastify-auth.local
```

Then access: http://fastify-auth.local

## Step 8: Test HPA (Auto-scaling)

### Run Load Test

```bash
chmod +x scripts/load-test-hpa.sh
./scripts/load-test-hpa.sh
```

### Monitor Scaling

In another terminal:
```bash
# Watch HPA
kubectl get hpa fastify-auth-hpa -w

# Watch pods
kubectl get pods -l app=fastify-auth-service -w
```

## Step 9: Update Deployment

### Update Image

```bash
# Build new image
docker build -t fastify-auth-service:v1.1.0 .

# Load into kind
kind load docker-image fastify-auth-service:v1.1.0 --name fastify-auth-cluster

# Update deployment
kubectl set image deployment/fastify-auth-service \
  fastify-auth=fastify-auth-service:v1.1.0

# Watch rollout
kubectl rollout status deployment/fastify-auth-service
```

### Rollback

```bash
kubectl rollout undo deployment/fastify-auth-service
```

## Troubleshooting

### Pods Not Starting

1. Check pod logs:
```bash
kubectl logs <pod-name>
```

2. Check pod events:
```bash
kubectl describe pod <pod-name>
```

3. Check secrets:
```bash
kubectl get secret fastify-auth-secrets -o yaml
```

### HPA Not Scaling

1. Check metrics-server:
```bash
kubectl get deployment metrics-server -n kube-system
```

2. Check HPA status:
```bash
kubectl describe hpa fastify-auth-hpa
```

3. Verify resource requests/limits in deployment

### Connection Issues

1. Check service endpoints:
```bash
kubectl get endpoints fastify-auth-service
```

2. Test connectivity:
```bash
kubectl run -it --rm debug --image=busybox --restart=Never -- wget -O- http://fastify-auth-service:8000/health
```

## Cleanup

### Delete Deployment

```bash
kubectl delete -f k8s/
```

### Delete Cluster

```bash
kind delete cluster --name fastify-auth-cluster
```

## Production Considerations

### For AWS EKS

1. Use ECR for container registry
2. Configure IAM roles for service accounts
3. Use AWS Load Balancer Controller for Ingress
4. Configure CloudWatch for logging
5. Use EBS volumes for persistent storage if needed

### For Production

1. Use proper container registry (Docker Hub, ECR, GCR)
2. Implement proper secrets management (AWS Secrets Manager, HashiCorp Vault)
3. Configure network policies
4. Set up monitoring and alerting
5. Implement backup strategies
6. Use production-grade ingress (cert-manager for TLS)

## Additional Resources

- [Kubernetes Documentation](https://kubernetes.io/docs/)
- [kind Documentation](https://kind.sigs.k8s.io/)
- [kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)

