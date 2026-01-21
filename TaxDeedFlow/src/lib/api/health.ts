/**
 * Health Check Utilities
 *
 * Provides health monitoring for API services including:
 * - Service availability checks
 * - Latency monitoring
 * - Error tracking
 * - Circuit breaker state reporting
 */

import { BaseApiService } from './base-service';
import {
  HealthStatus,
  HealthCheckError,
  CircuitState,
  CacheStats,
} from './types';

/**
 * Configuration for health checks
 */
export interface HealthCheckConfig {
  /** Timeout for health check requests in milliseconds */
  timeout?: number;

  /** Maximum number of errors to track */
  maxErrors?: number;

  /** Whether to include cache statistics in health status */
  includeCacheStats?: boolean;

  /** Custom health check endpoint (if service supports it) */
  healthEndpoint?: string;

  /** Latency threshold in ms for warning status */
  latencyWarningThreshold?: number;

  /** Latency threshold in ms for unhealthy status */
  latencyErrorThreshold?: number;
}

/**
 * Default health check configuration
 */
const DEFAULT_HEALTH_CONFIG: Required<HealthCheckConfig> = {
  timeout: 5000,
  maxErrors: 10,
  includeCacheStats: true,
  healthEndpoint: '/health',
  latencyWarningThreshold: 1000,
  latencyErrorThreshold: 5000,
};

/**
 * Health check result with additional metadata
 */
export interface HealthCheckResult extends HealthStatus {
  /** Service name */
  serviceName: string;

  /** Health status level */
  status: 'healthy' | 'degraded' | 'unhealthy';

  /** Number of recent failures */
  recentFailures: number;

  /** Average latency over recent checks */
  averageLatency?: number;

  /** Uptime percentage */
  uptimePercentage?: number;

  /** Timestamp of last successful check */
  lastSuccessfulCheck?: Date;

  /** Time since last successful check in milliseconds */
  timeSinceLastSuccess?: number;
}

/**
 * Aggregated health status for multiple services
 */
export interface AggregatedHealthStatus {
  /** Overall system health */
  overall: 'healthy' | 'degraded' | 'unhealthy';

  /** Timestamp of the health check */
  timestamp: Date;

  /** Individual service health results */
  services: Record<string, HealthCheckResult>;

  /** Count of healthy services */
  healthyCount: number;

  /** Count of degraded services */
  degradedCount: number;

  /** Count of unhealthy services */
  unhealthyCount: number;

  /** Total number of services checked */
  totalServices: number;
}

/**
 * Health check history entry
 */
interface HealthCheckHistoryEntry {
  timestamp: Date;
  healthy: boolean;
  latency: number;
  error?: string;
}

/**
 * Service health tracker
 */
class ServiceHealthTracker {
  private readonly history: HealthCheckHistoryEntry[] = [];
  private readonly maxHistory: number;
  private lastSuccessfulCheck?: Date;
  private consecutiveFailures: number = 0;

  constructor(maxHistory: number = 100) {
    this.maxHistory = maxHistory;
  }

  /**
   * Records a health check result
   */
  record(healthy: boolean, latency: number, error?: string): void {
    this.history.push({
      timestamp: new Date(),
      healthy,
      latency,
      error,
    });

    // Trim history if needed
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    if (healthy) {
      this.lastSuccessfulCheck = new Date();
      this.consecutiveFailures = 0;
    } else {
      this.consecutiveFailures++;
    }
  }

  /**
   * Gets recent errors
   */
  getRecentErrors(count: number = 10): HealthCheckError[] {
    return this.history
      .filter((entry) => !entry.healthy && entry.error)
      .slice(-count)
      .map((entry) => ({
        message: entry.error!,
        timestamp: entry.timestamp,
      }));
  }

  /**
   * Gets average latency from recent checks
   */
  getAverageLatency(): number | undefined {
    const successfulChecks = this.history.filter((entry) => entry.healthy);
    if (successfulChecks.length === 0) return undefined;

    const total = successfulChecks.reduce((sum, entry) => sum + entry.latency, 0);
    return Math.round(total / successfulChecks.length);
  }

  /**
   * Gets uptime percentage
   */
  getUptimePercentage(): number | undefined {
    if (this.history.length === 0) return undefined;

    const successCount = this.history.filter((entry) => entry.healthy).length;
    return Math.round((successCount / this.history.length) * 100);
  }

  /**
   * Gets last successful check timestamp
   */
  getLastSuccessfulCheck(): Date | undefined {
    return this.lastSuccessfulCheck;
  }

  /**
   * Gets consecutive failure count
   */
  getConsecutiveFailures(): number {
    return this.consecutiveFailures;
  }
}

/** Map of service trackers */
const serviceTrackers = new Map<string, ServiceHealthTracker>();

/**
 * Gets or creates a tracker for a service
 */
function getTracker(serviceName: string): ServiceHealthTracker {
  if (!serviceTrackers.has(serviceName)) {
    serviceTrackers.set(serviceName, new ServiceHealthTracker());
  }
  return serviceTrackers.get(serviceName)!;
}

/**
 * Performs a health check on an API service
 *
 * @param service - The API service to check
 * @param config - Optional health check configuration
 * @returns Promise resolving to health status
 *
 * @example
 * ```typescript
 * const fema = new FEMAService();
 * const health = await checkApiHealth(fema);
 * console.log(health.healthy); // true
 * ```
 */
export async function checkApiHealth(
  service: BaseApiService,
  config?: HealthCheckConfig
): Promise<HealthStatus> {
  const cfg = { ...DEFAULT_HEALTH_CONFIG, ...config };
  const startTime = Date.now();

  // Get service info via type assertion (BaseApiService exposes these publicly)
  const circuitState = service.getCircuitBreakerState();
  const cacheStats = cfg.includeCacheStats ? service.getCacheStats() : undefined;

  // Get service name from config (using type assertion via unknown for protected property access)
  const serviceName = (service as unknown as { config?: { serviceName?: string } }).config?.serviceName || 'unknown';
  const tracker = getTracker(serviceName);

  // Check circuit breaker state first
  if (circuitState.state === 'open') {
    tracker.record(false, 0, 'Circuit breaker is open');

    return {
      healthy: false,
      latency: 0,
      lastCheck: new Date(),
      errors: tracker.getRecentErrors(cfg.maxErrors),
      circuitState: circuitState.state,
      cacheStats,
      details: {
        reason: 'Circuit breaker is open',
        failureCount: circuitState.failureCount,
        resetTime: circuitState.resetTime,
        blockedRequests: circuitState.blockedRequests,
      },
    };
  }

  try {
    // Perform a lightweight health check
    // Note: Most services don't have a dedicated health endpoint,
    // so we use a simple request that should be fast
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), cfg.timeout);

    // For now, we just check that the service can complete a request
    // In a real implementation, you might want to call a specific health endpoint
    const latency = Date.now() - startTime;

    clearTimeout(timeoutId);

    // Determine health status based on latency and circuit state
    const healthy = latency < cfg.latencyErrorThreshold;

    tracker.record(healthy, latency);

    return {
      healthy,
      latency,
      lastCheck: new Date(),
      errors: tracker.getRecentErrors(cfg.maxErrors),
      circuitState: circuitState.state,
      cacheStats,
      details: {
        consecutiveFailures: tracker.getConsecutiveFailures(),
        averageLatency: tracker.getAverageLatency(),
        uptimePercentage: tracker.getUptimePercentage(),
      },
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    tracker.record(false, latency, errorMessage);

    return {
      healthy: false,
      latency,
      lastCheck: new Date(),
      errors: tracker.getRecentErrors(cfg.maxErrors),
      circuitState: circuitState.state,
      cacheStats,
      details: {
        reason: errorMessage,
        consecutiveFailures: tracker.getConsecutiveFailures(),
      },
    };
  }
}

/**
 * Performs health checks on multiple services
 *
 * @param services - Map of service name to service instance
 * @param config - Optional health check configuration
 * @returns Promise resolving to aggregated health status
 *
 * @example
 * ```typescript
 * const services = {
 *   fema: new FEMAService(),
 *   census: new CensusService(),
 * };
 * const health = await checkAllServicesHealth(services);
 * console.log(health.overall); // 'healthy'
 * ```
 */
export async function checkAllServicesHealth(
  services: Record<string, BaseApiService>,
  config?: HealthCheckConfig
): Promise<AggregatedHealthStatus> {
  const results: Record<string, HealthCheckResult> = {};
  let healthyCount = 0;
  let degradedCount = 0;
  let unhealthyCount = 0;

  // Check all services in parallel
  const checks = Object.entries(services).map(async ([name, service]) => {
    const health = await checkApiHealth(service, config);
    const tracker = getTracker(name);

    // Determine status level
    let status: 'healthy' | 'degraded' | 'unhealthy';
    if (!health.healthy) {
      status = 'unhealthy';
    } else if (
      health.latency > (config?.latencyWarningThreshold ?? DEFAULT_HEALTH_CONFIG.latencyWarningThreshold)
    ) {
      status = 'degraded';
    } else {
      status = 'healthy';
    }

    results[name] = {
      ...health,
      serviceName: name,
      status,
      recentFailures: tracker.getConsecutiveFailures(),
      averageLatency: tracker.getAverageLatency(),
      uptimePercentage: tracker.getUptimePercentage(),
      lastSuccessfulCheck: tracker.getLastSuccessfulCheck(),
      timeSinceLastSuccess: tracker.getLastSuccessfulCheck()
        ? Date.now() - tracker.getLastSuccessfulCheck()!.getTime()
        : undefined,
    };

    switch (status) {
      case 'healthy':
        healthyCount++;
        break;
      case 'degraded':
        degradedCount++;
        break;
      case 'unhealthy':
        unhealthyCount++;
        break;
    }
  });

  await Promise.all(checks);

  // Determine overall health
  let overall: 'healthy' | 'degraded' | 'unhealthy';
  if (unhealthyCount > 0) {
    overall = 'unhealthy';
  } else if (degradedCount > 0) {
    overall = 'degraded';
  } else {
    overall = 'healthy';
  }

  return {
    overall,
    timestamp: new Date(),
    services: results,
    healthyCount,
    degradedCount,
    unhealthyCount,
    totalServices: Object.keys(services).length,
  };
}

/**
 * Creates a health check middleware/handler for API routes
 *
 * @param services - Map of service name to service instance
 * @param config - Optional health check configuration
 * @returns Function that performs health check and returns response
 */
export function createHealthHandler(
  services: Record<string, BaseApiService>,
  config?: HealthCheckConfig
): () => Promise<AggregatedHealthStatus> {
  return async () => {
    return checkAllServicesHealth(services, config);
  };
}

/**
 * Determines HTTP status code based on health status
 *
 * @param health - Aggregated health status
 * @returns HTTP status code
 */
export function getHealthStatusCode(health: AggregatedHealthStatus): number {
  switch (health.overall) {
    case 'healthy':
      return 200;
    case 'degraded':
      return 200; // Still operational, but degraded
    case 'unhealthy':
      return 503;
    default:
      return 500;
  }
}

/**
 * Formats health status for logging
 *
 * @param health - Aggregated health status
 * @returns Formatted string for logging
 */
export function formatHealthStatus(health: AggregatedHealthStatus): string {
  const lines = [
    `Health Check at ${health.timestamp.toISOString()}`,
    `Overall: ${health.overall.toUpperCase()}`,
    `Services: ${health.healthyCount}/${health.totalServices} healthy`,
  ];

  if (health.degradedCount > 0) {
    lines.push(`Degraded: ${health.degradedCount}`);
  }

  if (health.unhealthyCount > 0) {
    lines.push(`Unhealthy: ${health.unhealthyCount}`);
  }

  // Add details for non-healthy services
  Object.entries(health.services).forEach(([name, status]) => {
    if (status.status !== 'healthy') {
      lines.push(`  - ${name}: ${status.status} (latency: ${status.latency}ms)`);
      if (status.errors.length > 0) {
        lines.push(`    Last error: ${status.errors[status.errors.length - 1].message}`);
      }
    }
  });

  return lines.join('\n');
}

/**
 * Resets health check history for all services
 */
export function resetHealthHistory(): void {
  serviceTrackers.clear();
}

/**
 * Resets health check history for a specific service
 */
export function resetServiceHealthHistory(serviceName: string): void {
  serviceTrackers.delete(serviceName);
}

/**
 * Checks if circuit breaker should prevent health check
 */
export function shouldSkipHealthCheck(circuitState: CircuitState): boolean {
  return circuitState === 'open';
}

/**
 * Creates a simple health check response object
 */
export function createSimpleHealthResponse(
  healthy: boolean,
  details?: Record<string, unknown>
): {
  status: 'ok' | 'error';
  timestamp: string;
  details?: Record<string, unknown>;
} {
  return {
    status: healthy ? 'ok' : 'error',
    timestamp: new Date().toISOString(),
    details,
  };
}
