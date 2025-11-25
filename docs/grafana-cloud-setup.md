# Grafana Cloud Setup Guide

This guide will help you set up Grafana Cloud for observability (logs, metrics, and traces).

## Prerequisites

- A Grafana Cloud account (free tier available)
- Access to your Grafana Cloud instance

## Step 1: Create Grafana Cloud Account

1. Go to [https://grafana.com/auth/sign-up/create-user](https://grafana.com/auth/sign-up/create-user)
2. Sign up for a free account
3. Verify your email address
4. Log in to your Grafana Cloud instance

## Step 2: Get API Keys and Endpoints

### Loki (Logs)

1. In Grafana Cloud, go to **My Account** → **Security** → **API Keys**
2. Click **Create API Key**
3. Select **Metrics Publisher** role
4. Copy the API key
5. Go to **Connections** → **Data Sources** → **Loki**
6. Find your Loki endpoint URL (format: `https://logs-prod-XXX.grafana.net`)
7. Your Loki push endpoint will be: `https://logs-prod-XXX.grafana.net/loki/api/v1/push`
8. Note your username (usually your Grafana Cloud username or instance ID)

**Environment Variables:**
- `GRAFANA_CLOUD_LOKI_URL`: `https://logs-prod-XXX.grafana.net/loki/api/v1/push`
- `GRAFANA_CLOUD_LOKI_USERNAME`: Your Grafana Cloud username or instance ID
- `GRAFANA_CLOUD_LOKI_PASSWORD`: Your Loki API key

### Prometheus (Metrics)

1. In Grafana Cloud, go to **Connections** → **Data Sources** → **Prometheus**
2. Find your Prometheus endpoint URL (format: `https://prometheus-prod-XXX.grafana.net`)
3. Your Prometheus remote write endpoint will be: `https://prometheus-prod-XXX.grafana.net/api/prom/push`
4. Go to **My Account** → **Security** → **API Keys**
5. Create a new API key with **Metrics Publisher** role
6. Note your username (usually your Grafana Cloud username or instance ID)

**Environment Variables:**
- `GRAFANA_CLOUD_PROMETHEUS_URL`: `https://prometheus-prod-XXX.grafana.net/api/prom/push`
- `GRAFANA_CLOUD_PROMETHEUS_USERNAME`: Your Grafana Cloud username or instance ID
- `GRAFANA_CLOUD_PROMETHEUS_PASSWORD`: Your Prometheus API key

### Tempo (Traces)

1. In Grafana Cloud, go to **Connections** → **Data Sources** → **Tempo**
2. Find your Tempo endpoint URL (format: `https://tempo-prod-XXX.grafana.net:443`)
3. Go to **My Account** → **Security** → **API Keys**
4. Create a new API key with **Metrics Publisher** role
5. Note your username (usually your Grafana Cloud username or instance ID)

**Environment Variables:**
- `GRAFANA_CLOUD_TEMPO_URL`: `https://tempo-prod-XXX.grafana.net:443`
- `GRAFANA_CLOUD_TEMPO_USERNAME`: Your Grafana Cloud username or instance ID
- `GRAFANA_CLOUD_TEMPO_PASSWORD`: Your Tempo API key

## Step 3: Configure Data Sources in Grafana

### Prometheus Datasource

1. Go to **Connections** → **Data Sources** → **Add data source**
2. Select **Prometheus**
3. Configure:
   - **URL**: Your Prometheus endpoint (e.g., `https://prometheus-prod-XXX.grafana.net`)
   - **Access**: Server (default)
   - **Basic Auth**: Enable
   - **User**: Your Grafana Cloud username
   - **Password**: Your Prometheus API key
4. Click **Save & Test**

### Loki Datasource

1. Go to **Connections** → **Data Sources** → **Add data source**
2. Select **Loki**
3. Configure:
   - **URL**: Your Loki endpoint (e.g., `https://logs-prod-XXX.grafana.net`)
   - **Access**: Server (default)
   - **Basic Auth**: Enable
   - **User**: Your Grafana Cloud username
   - **Password**: Your Loki API key
4. Click **Save & Test**

### Tempo Datasource

1. Go to **Connections** → **Data Sources** → **Add data source**
2. Select **Tempo**
3. Configure:
   - **URL**: Your Tempo endpoint (e.g., `https://tempo-prod-XXX.grafana.net:443`)
   - **Access**: Server (default)
   - **Basic Auth**: Enable
   - **User**: Your Grafana Cloud username
   - **Password**: Your Tempo API key
4. Additional Settings:
   - **Search**: Enable
   - **Node Graph**: Enable
   - **Service Map**: Enable
   - **Loki Search**: Enable (select your Loki datasource)
   - **Prometheus Search**: Enable (select your Prometheus datasource)
5. Click **Save & Test**

## Step 4: Import Dashboards

1. Go to **Dashboards** → **Import**
2. Import each dashboard from `grafana/dashboards/`:
   - `application-overview.json`
   - `request-metrics.json`
   - `error-tracking.json`
   - `database-performance.json`
3. Select the appropriate datasources when prompted

## Step 5: Configure Application

Add the Grafana Cloud environment variables to your Kubernetes secrets:

```bash
# Edit k8s/secret.yaml with your Grafana Cloud credentials
kubectl apply -f k8s/secret.yaml
```

Or set them in your environment:

```bash
export GRAFANA_CLOUD_LOKI_URL="https://logs-prod-XXX.grafana.net/loki/api/v1/push"
export GRAFANA_CLOUD_LOKI_USERNAME="your-username"
export GRAFANA_CLOUD_LOKI_PASSWORD="your-api-key"
# ... repeat for Prometheus and Tempo
```

## Step 6: Verify Data Flow

1. **Logs**: Check Loki datasource for logs from your application
2. **Metrics**: Check Prometheus datasource for metrics (query: `http_requests_total`)
3. **Traces**: Check Tempo datasource for distributed traces

## Troubleshooting

### No Data Appearing

1. Check that environment variables are set correctly
2. Verify API keys have the correct permissions
3. Check application logs for connection errors
4. Verify network connectivity to Grafana Cloud endpoints

### Authentication Errors

1. Verify username and password are correct
2. Check that API keys are not expired
3. Ensure Basic Auth is enabled in datasource configuration

### High Costs (Free Tier)

- Free tier includes:
  - 50GB logs/month
  - 10k metrics series
  - 50GB traces/month
- Monitor usage in Grafana Cloud dashboard
- Adjust log levels if needed to reduce volume

## Additional Resources

- [Grafana Cloud Documentation](https://grafana.com/docs/grafana-cloud/)
- [Loki API Documentation](https://grafana.com/docs/loki/latest/api/)
- [Prometheus Remote Write](https://prometheus.io/docs/prometheus/latest/storage/#remote-storage-integrations)
- [Tempo Documentation](https://grafana.com/docs/tempo/latest/)

