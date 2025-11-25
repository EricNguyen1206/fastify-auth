#!/bin/bash
# Setup script for kind (Kubernetes in Docker) cluster
# This script creates a local Kubernetes cluster for testing

set -e

echo "Setting up kind cluster for fastify-auth-service..."

# Check if kind is installed
if ! command -v kind &> /dev/null; then
    echo "Error: kind is not installed"
    echo "Install kind: https://kind.sigs.k8s.io/docs/user/quick-start/#installation"
    exit 1
fi

# Check if Docker is running
if ! docker info &> /dev/null; then
    echo "Error: Docker is not running"
    exit 1
fi

# Cluster name
CLUSTER_NAME="fastify-auth-cluster"

# Check if cluster already exists
if kind get clusters | grep -q "^${CLUSTER_NAME}$"; then
    echo "Cluster ${CLUSTER_NAME} already exists"
    read -p "Do you want to delete and recreate it? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo "Deleting existing cluster..."
        kind delete cluster --name "${CLUSTER_NAME}"
    else
        echo "Using existing cluster"
        exit 0
    fi
fi

# Create kind cluster configuration
cat <<EOF | kind create cluster --name "${CLUSTER_NAME}" --config=-
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
  kubeadmConfigPatches:
  - |
    kind: InitConfiguration
    nodeRegistration:
      kubeletExtraArgs:
        node-labels: "ingress-ready=true"
  extraPortMappings:
  - containerPort: 80
    hostPort: 80
    protocol: TCP
  - containerPort: 443
    hostPort: 443
    protocol: TCP
EOF

echo "Cluster created successfully!"

# Install metrics-server for HPA
echo "Installing metrics-server..."
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml

# Wait for metrics-server to be ready
echo "Waiting for metrics-server to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/metrics-server -n kube-system

# Install ingress-nginx (optional, for Ingress support)
read -p "Do you want to install ingress-nginx? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Installing ingress-nginx..."
    kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
    
    echo "Waiting for ingress-nginx to be ready..."
    kubectl wait --namespace ingress-nginx \
      --for=condition=ready pod \
      --selector=app.kubernetes.io/component=controller \
      --timeout=300s
fi

echo ""
echo "✅ Kind cluster setup complete!"
echo ""
echo "Cluster name: ${CLUSTER_NAME}"
echo "To use this cluster: kubectl cluster-info --context kind-${CLUSTER_NAME}"
echo ""
echo "Next steps:"
echo "1. Build Docker image: docker build -t fastify-auth-service:latest ."
echo "2. Load image into kind: kind load docker-image fastify-auth-service:latest --name ${CLUSTER_NAME}"
echo "3. Create secrets: kubectl apply -f k8s/secret.yaml"
echo "4. Deploy application: kubectl apply -f k8s/"

