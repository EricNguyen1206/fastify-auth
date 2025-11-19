// src/configs/otel.js
// OpenTelemetry configuration for unified observability
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { LoggerProvider, BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
// Fix for Node.js v18.15.0 - import from CommonJS
import resourcesPkg from '@opentelemetry/resources';
const { Resource } = resourcesPkg;
import semconvPkg from '@opentelemetry/semantic-conventions';
const { SEMRESATTRS_SERVICE_NAME, SEMRESATTRS_SERVICE_VERSION } = semconvPkg;
import { config } from './variables.js';

/**
 * Initialize OpenTelemetry SDK
 * DISABLED: Due to compatibility issues with Node.js v18.15.0
 * To enable: Upgrade to Node.js v20+
 */
export function initializeOpenTelemetry() {
  // Skip OTel initialization - using pino-loki instead
  if (!config.loki.enabled) {
    console.log('Loki logging disabled - LOKI_ENABLED is not set to true');
    return null;
  }

  console.log('Using pino-loki for logging (OpenTelemetry disabled due to Node.js version compatibility)');
  return null;
}
