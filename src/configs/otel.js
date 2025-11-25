// src/configs/otel.js
// Professional OpenTelemetry configuration for unified observability and audit logging
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { BatchLogRecordProcessor } from "@opentelemetry/sdk-logs";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { PrometheusExporter } from "@opentelemetry/exporter-prometheus";
import { MeterProvider } from "@opentelemetry/sdk-metrics";
// Fix for CommonJS compatibility
import resourcesPkg from "@opentelemetry/resources";
const { resourceFromAttributes } = resourcesPkg;
import semconvPkg from "@opentelemetry/semantic-conventions";
const { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION, ATTR_DEPLOYMENT_ENVIRONMENT } =
  semconvPkg;
import { DiagConsoleLogger, DiagLogLevel, diag } from "@opentelemetry/api";
import { PinoInstrumentation } from "@opentelemetry/instrumentation-pino";
import { config } from "./variables.js";

// Enable OpenTelemetry diagnostics for debugging (only in development)
if (config.isDev) {
  diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);
}

/**
 * Initialize OpenTelemetry SDK with full observability stack
 * Provides: Logs, Traces, and automatic instrumentation for audit logging
 *
 * @returns {NodeSDK|null} Initialized OpenTelemetry SDK or null if disabled
 */
export function initializeOpenTelemetry() {
  if (!config.loki.enabled) {
    console.log("📊 OpenTelemetry disabled - LOKI_ENABLED is not set to true");
    return null;
  }

  try {
    console.log(
      "🚀 Initializing OpenTelemetry for professional audit logging..."
    );

    // Define service resource with metadata
    const resource = resourceFromAttributes({
      [ATTR_SERVICE_NAME]: "fastify-auth",
      [ATTR_SERVICE_VERSION]: "1.0.0",
      [ATTR_DEPLOYMENT_ENVIRONMENT]: config.env,
      "service.namespace": "authentication",
      "service.instance.id": process.env.HOSTNAME || "local-instance",
    });

    // Configure OTLP Log Exporter to Loki
    const logExporter = new OTLPLogExporter({
      url: `${config.loki.url}/otlp/v1/logs`,
      headers: {
        "Content-Type": "application/json",
      },
      // Retry configuration
      timeoutMillis: 15000,
    });

    // Configure OTLP Trace Exporter to Tempo
    const tempoUrl = process.env.TEMPO_URL || "http://localhost:3200";
    const traceExporter = new OTLPTraceExporter({
      url: `${tempoUrl}/v1/traces`,
      headers: {
        "Content-Type": "application/json",
      },
      timeoutMillis: 15000,
    });

    // Configure Prometheus Metrics Exporter
    const prometheusExporter = new PrometheusExporter(
      {
        port: 9464, // Prometheus metrics endpoint port
        endpoint: "/metrics",
      },
      () => {
        console.log(
          "📊 Prometheus metrics server running on http://localhost:9464/metrics"
        );
      }
    );

    // Create MeterProvider with Prometheus exporter
    const meterProvider = new MeterProvider({
      resource,
      readers: [prometheusExporter],
    });

    // Initialize NodeSDK with comprehensive auto-instrumentation
    const sdk = new NodeSDK({
      resource,
      logRecordProcessor: new BatchLogRecordProcessor(logExporter, {
        maxQueueSize: 1000,
        maxExportBatchSize: 100,
        scheduledDelayMillis: 5000, // Export every 5 seconds
      }),
      spanProcessor: new BatchSpanProcessor(traceExporter, {
        maxQueueSize: 1000,
        maxExportBatchSize: 100,
        scheduledDelayMillis: 5000,
      }),
      instrumentations: [
        // Auto-instrument HTTP, Express/Fastify, DNS, Net, etc.
        getNodeAutoInstrumentations({
          "@opentelemetry/instrumentation-fs": {
            enabled: false, // Disable file system instrumentation (too verbose)
          },
          "@opentelemetry/instrumentation-http": {
            enabled: true,
            ignoreIncomingPaths: ["/health"], // Don't trace health checks
          },
        }),
        // Instrument Pino logger to inject trace context
        new PinoInstrumentation({
          logKeys: {
            traceId: "trace_id",
            spanId: "span_id",
            traceFlags: "trace_flags",
          },
        }),
      ],
    });

    // Start the SDK
    sdk.start();

    console.log("✅ OpenTelemetry initialized successfully");
    console.log(`📡 Sending logs to: ${config.loki.url}/otlp/v1/logs`);
    console.log(`📡 Sending traces to: ${tempoUrl}/v1/traces`);
    console.log(`📊 Exposing metrics at: http://localhost:9464/metrics`);

    // Graceful shutdown on process termination
    const shutdown = async () => {
      try {
        console.log("🛑 Shutting down OpenTelemetry...");
        await sdk.shutdown();
        console.log("✅ OpenTelemetry shutdown complete");
      } catch (error) {
        console.error("❌ Error during OpenTelemetry shutdown:", error);
      }
    };

    process.on("SIGTERM", shutdown);
    process.on("SIGINT", shutdown);

    return sdk;
  } catch (error) {
    console.error("❌ Failed to initialize OpenTelemetry:", error);
    console.error("📝 Falling back to standard logging");
    return null;
  }
}
