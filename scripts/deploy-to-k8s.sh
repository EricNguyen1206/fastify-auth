#!/bin/bash
# Deployment script for fastify-auth-service to Kubernetes
# This script builds the Docker image, loads it into kind, and deploys to K8s

set -e

CLUSTER_NAME="fastify-auth-cluster"
IMAGE_NAME="fastify-auth-service"
IMAGE_TAG="latest"

echo "Deploying ${IMAGE_NAME} to Kubernetes..."

# Check if kind cluster exists
if ! kind get clusters | grep -q "^${CLUSTER_NAME}$"; then
    echo "Error: Cluster ${CLUSTER_NAME} does not exist"
    echo "Run: ./scripts/setup-kind-cluster.sh"
    exit 1
fi

# Build Docker image
echo "Building Docker image..."
docker build -t "${IMAGE_NAME}:${IMAGE_TAG}" .

# Load image into kind cluster
echo "Loading image into kind cluster..."
kind load docker-image "${IMAGE_NAME}:${IMAGE_TAG}" --name "${CLUSTER_NAME}"

# Check if secrets exist
if ! kubectl get secret fastify-auth-secrets &> /dev/null; then
    echo "Warning: Secret 'fastify-auth-secrets' does not exist"
    echo "Please create it first: kubectl apply -f k8s/secret.yaml"
    echo "Or use the template: cp k8s/secret.yaml.template k8s/secret.yaml and edit it"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Apply ConfigMap
echo "Applying ConfigMap..."
kubectl apply -f k8s/configmap.yaml

# Apply Deployment
echo "Applying Deployment..."
kubectl apply -f k8s/deployment.yaml

# Apply Service
echo "Applying Service..."
kubectl apply -f k8s/service.yaml

# Apply HPA
echo "Applying HorizontalPodAutoscaler..."
kubectl apply -f k8s/hpa.yaml

# Apply Ingress (optional)
if [ -f "k8s/ingress.yaml" ]; then
    read -p "Do you want to apply Ingress? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Applying Ingress..."
        kubectl apply -f k8s/ingress.yaml
    fi
fi

# Wait for deployment to be ready
echo "Waiting for deployment to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/fastify-auth-service

echo ""
echo "✅ Deployment complete!"
echo ""
echo "To check status:"
echo "  kubectl get pods"
echo "  kubectl get svc"
echo "  kubectl get hpa"
echo ""
echo "To view logs:"
echo "  kubectl logs -f deployment/fastify-auth-service"
echo ""
echo "To port-forward (access service locally):"
echo "  kubectl port-forward svc/fastify-auth-service 8000:8000"

