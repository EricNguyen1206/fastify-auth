# Setup Prometheus Metrics Authentication cho Grafana Cloud

## Vấn đề
Grafana Cloud yêu cầu authentication credentials khi scrape Prometheus metrics, ngay cả khi endpoint là public.

## Giải pháp đã implement
✅ Thêm Basic Authentication vào `/metrics` endpoint  
✅ Credentials được quản lý qua Google Cloud Secret Manager  
✅ Backward compatible: nếu không set `METRICS_PASSWORD`, endpoint vẫn public  

## Các bước setup

### 1. Tạo secrets trên Google Cloud

**Lưu ý**: Password đã generate: `fyYepIwrSTu7IBlSjEneaN1jbitTGGtAZQdscAwpY9w=`

```bash
# Login vào Google Cloud (nếu chưa)
gcloud auth login

# Set project
gcloud config set project snack-survey-deff4

# Tạo METRICS_USER secret
echo -n "prometheus" | gcloud secrets create METRICS_USER \
  --data-file=- \
  --project=snack-survey-deff4

# Tạo METRICS_PASSWORD secret
echo -n "fyYepIwrSTu7IBlSjEneaN1jbitTGGtAZQdscAwpY9w=" | gcloud secrets create METRICS_PASSWORD \
  --data-file=- \
  --project=snack-survey-deff4

# Grant quyền truy cập secrets cho Cloud Run service account
PROJECT_NUMBER=$(gcloud projects describe snack-survey-deff4 --format="value(projectNumber)")

gcloud secrets add-iam-policy-binding METRICS_USER \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"

gcloud secrets add-iam-policy-binding METRICS_PASSWORD \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

### 2. Deploy lại service

Sau khi tạo secrets, commit và push code:

```bash
git add .
git commit -m "feat: add basic auth for Prometheus metrics endpoint"
git push origin main
```

GitHub Actions sẽ tự động deploy với secrets mới.

### 3. Kiểm tra metrics endpoint

Test với authentication:

```bash
# Test với credentials
curl -u "prometheus:fyYepIwrSTu7IBlSjEneaN1jbitTGGtAZQdscAwpY9w=" \
  https://auth-service-276662814042.asia-southeast1.run.app/metrics

# Test không có credentials (sẽ nhận 401)
curl https://auth-service-276662814042.asia-southeast1.run.app/metrics
```

### 4. Cấu hình Grafana Cloud

1. Vào **Grafana Cloud** → **Connections** → **Add new connection**
2. Chọn **Prometheus**
3. Điền thông tin:
   - **URL**: `https://auth-service-276662814042.asia-southeast1.run.app/metrics`
   - **Authentication**: Chọn **Basic Authentication**
   - **User**: `prometheus`
   - **Password**: `fyYepIwrSTu7IBlSjEneaN1jbitTGGtAZQdscAwpY9w=`
4. Click **Save & Test**

## Metrics hiện có

Endpoint cung cấp các metrics:

### Process Metrics
- `auth_service_process_cpu_*` - CPU usage
- `auth_service_process_memory_*` - Memory usage
- `auth_service_process_open_fds` - Open file descriptors

### Node.js Metrics
- `auth_service_nodejs_eventloop_lag_*` - Event loop lag
- `auth_service_nodejs_heap_*` - Heap memory
- `auth_service_nodejs_gc_duration_seconds` - Garbage collection
- `auth_service_nodejs_active_*` - Active handles/requests

### Custom Metrics
- `http_requests_total` - HTTP request counter (chưa được sử dụng)

## Troubleshooting

### Secret không tồn tại
```bash
# List all secrets
gcloud secrets list --project=snack-survey-deff4

# View secret value (để debug)
gcloud secrets versions access latest --secret="METRICS_PASSWORD" --project=snack-survey-deff4
```

### Cloud Run không load được secrets
```bash
# Check service account permissions
gcloud secrets get-iam-policy METRICS_PASSWORD --project=snack-survey-deff4

# Check Cloud Run logs
gcloud logs read --project=snack-survey-deff4 --limit=50 \
  --filter="resource.type=cloud_run_revision AND resource.labels.service_name=auth-service"
```

### Test local
```bash
# Set environment variables
export METRICS_USER="prometheus"
export METRICS_PASSWORD="fyYepIwrSTu7IBlSjEneaN1jbitTGGtAZQdscAwpY9w="

# Run server
pnpm dev

# Test endpoint
curl -u "prometheus:fyYepIwrSTu7IBlSjEneaN1jbitTGGtAZQdscAwpY9w=" http://localhost:8080/metrics
```

## Security Notes

⚠️ **LƯU Ý BẢO MẬT**:
- ✅ Credentials được lưu trong Secret Manager (encrypted at rest)
- ✅ Không commit credentials vào git
- ✅ Chỉ Cloud Run service account có quyền đọc secrets
- ⚠️ HTTPS được sử dụng để bảo vệ credentials khi truyền tải
- 💡 Nên rotation password định kỳ (mỗi 90 ngày)

## Next Steps

Sau khi setup xong, bạn có thể:
1. Tạo Grafana dashboards để visualize metrics
2. Setup alerts dựa trên metrics (VD: high CPU, memory leaks)
3. Thêm custom metrics cho business logic (request latency, error rates, etc.)
