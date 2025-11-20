# AI Agent Resource Plan & Workflow

**Project Manager**: Antigravity (Primary Orchestrator)
**Objective**: Deliver Production-Ready Fastify Auth Service
**Timeline**: 1:30 PM - 9:00 PM

## 1. Workforce Composition (The "Squad")

To execute the implementation plan efficiently, we will utilize 5 specialized AI Agent personas. As the Primary Orchestrator, I will switch contexts to adopt these personas during execution.

### 🤖 Agent A: Test Automation Specialist
*   **Role**: QA & Test Engineering
*   **Skills**: Jest, Supertest, Code Coverage Analysis, Mocking
*   **Responsibility**:
    *   Setup Jest infrastructure.
    *   Write unit tests for Services, Repositories, Middlewares.
    *   Write integration tests for Routes.
    *   Ensure 100% code coverage.
*   **Phase**: Phase 2 (2:00 PM - 4:30 PM)

### 🤖 Agent B: Observability Architect
*   **Role**: Site Reliability Engineering (SRE)
*   **Skills**: OpenTelemetry, Loki, Grafana, Tempo, Prometheus, Docker Compose
*   **Responsibility**:
    *   Complete LGTM stack integration.
    *   Configure Prometheus metrics and Tempo tracing.
    *   Design Grafana dashboards.
*   **Phase**: Phase 3 (4:30 PM - 6:00 PM)

### 🤖 Agent C: Performance Engineer
*   **Role**: Performance Testing
*   **Skills**: K6, Load Testing, Stress Testing, Performance Analysis
*   **Responsibility**:
    *   Fix and enhance K6 scripts.
    *   Define load scenarios (Smoke, Load, Stress).
    *   Validate system stability under load.
*   **Phase**: Phase 4 (6:00 PM - 6:45 PM)

### 🤖 Agent D: Cloud Native Engineer
*   **Role**: DevOps & Infrastructure
*   **Skills**: Docker, Podman, Kubernetes, Helm/Kustomize
*   **Responsibility**:
    *   Create multi-stage Dockerfile.
    *   Build container images.
    *   Write Kubernetes manifests (Deployment, Service, Ingress, ConfigMap, Secret).
    *   Deploy to local K8s cluster.
*   **Phase**: Phase 5 (6:45 PM - 8:15 PM)

### 🤖 Agent E: Technical Communicator
*   **Role**: Technical Writing
*   **Skills**: Markdown, Technical Documentation, Architecture Diagramming
*   **Responsibility**:
    *   Document all technical implementations.
    *   Create "Runbooks" for the team.
    *   Update README and Architecture docs.
*   **Phase**: Phase 6 (8:15 PM - 9:00 PM)

---

## 2. Execution Workflow (The Pipeline)

The project will follow a sequential "Waterfall" pipeline to ensure stability, as later phases depend on the correctness of earlier ones (e.g., we can't load test effectively if the app is buggy, hence Testing comes first).

### Step 1: Foundation (PM + Agent A)
1.  **PM**: Initialize project structure (`docs/`), install dependencies.
2.  **Agent A**: Configure Jest.
3.  **Agent A**: Implement Unit Tests (Services -> Repos -> Middlewares).
4.  **Agent A**: Implement Integration Tests (Routes).
5.  **PM**: Verify 100% Coverage.

### Step 2: Observability (Agent B)
1.  **Agent B**: Extend OpenTelemetry config (Metrics + Traces).
2.  **Agent B**: Update `infra/compose.yml` (Add Prometheus, Tempo).
3.  **Agent B**: Create Grafana Dashboards.
4.  **PM**: Verify LGTM stack is up and receiving data.

### Step 3: Performance (Agent C)
1.  **Agent C**: Refactor `auth-load-test.js`.
2.  **Agent C**: Create modular scenarios.
3.  **Agent C**: Run baseline tests against local dev environment.

### Step 4: Deployment (Agent D)
1.  **Agent D**: Write Dockerfile & Build Image.
2.  **Agent D**: Create K8s Manifests.
3.  **Agent D**: Deploy to Local K8s.
4.  **PM**: Health check verification.

### Step 5: Handover (Agent E)
1.  **Agent E**: Write technical docs in `docs/`.
2.  **Agent E**: Finalize README.
3.  **PM**: Final project review and delivery.

## 3. Resource Allocation Strategy

| Time Slot | Active Agent | Task | Output |
|-----------|--------------|------|--------|
| **13:30 - 14:00** | PM | Setup & Planning | Project Structure |
| **14:00 - 16:30** | Agent A | Testing | 100% Coverage Report |
| **16:30 - 18:00** | Agent B | Observability | Working LGTM Stack |
| **18:00 - 18:45** | Agent C | Load Testing | Performance Report |
| **18:45 - 20:15** | Agent D | Kubernetes | Running K8s Pods |
| **20:15 - 21:00** | Agent E | Documentation | Complete Docs Folder |

---
**Next Action**: Activate **Agent A (Test Automation Specialist)** to begin Phase 2.
