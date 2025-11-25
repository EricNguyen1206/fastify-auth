// src/configs/otel.js
// Simplified OpenTelemetry configuration for distributed tracing only
// Logs: handled by Vector (stdout → Loki)
// Metrics: handled by native Prometheus client
import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
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
 * Initialize OpenTelemetry SDK for distributed tracing
 * Simplified stack: traces only (logs via Vector, metrics via Prometheus client)
 *
 * @returns {NodeSDK|null} Initialized OpenTelemetry SDK or null if disabled
 */
export function initializeOpenTelemetry() {
  // Check if tracing is enabled (using LOKI_ENABLED as a general observability flag)
  if (!config.loki.enabled) {
    console.log("📊 OpenTelemetry disabled - LOKI_ENABLED is not set to true");
    return null;
  }

  try {
    console.log("🚀 Initializing OpenTelemetry for distributed tracing...");

    // Define service resource with metadata
    const resource = resourceFromAttributes({
      [ATTR_SERVICE_NAME]: "fastify-auth",
      [ATTR_SERVICE_VERSION]: "1.0.0",
      [ATTR_DEPLOYMENT_ENVIRONMENT]: config.env,
      "service.namespace": "authentication",
      "service.instance.id": process.env.HOSTNAME || "local-instance",
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

    // Initialize NodeSDK with traces only
    const sdk = new NodeSDK({
      resource,
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
            ignoreIncomingPaths: ["/health", "/metrics"], // Don't trace health checks and metrics
          },
        }),
        // Instrument Pino logger to inject trace context into logs
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

    console.log("✅ OpenTelemetry initialized successfully (traces only)");
    console.log(`📡 Sending traces to: ${tempoUrl}/v1/traces`);

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
