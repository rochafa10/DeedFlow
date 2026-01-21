/**
 * NOAA Weather API Service
 *
 * Provides weather forecasts and alerts from the National Weather Service.
 * Free public API - no API key required.
 *
 * API Documentation: https://www.weather.gov/documentation/services-web-api
 */

import { BaseApiService } from '../base-service';
import {
  ApiConfig,
  CacheConfig,
  CircuitBreakerConfig,
  RateLimitConfig,
  ApiResponse,
} from '../types';
import { ValidationError } from '../errors';

/**
 * Weather alert severity
 */
export type AlertSeverity = 'Extreme' | 'Severe' | 'Moderate' | 'Minor' | 'Unknown';

/**
 * Weather alert
 */
export interface WeatherAlert {
  id: string;
  event: string;
  severity: AlertSeverity;
  certainty: string;
  urgency: string;
  headline: string;
  description: string;
  instruction?: string;
  areaDesc: string;
  effective: string;
  expires: string;
  sender: string;
}

/**
 * Forecast period
 */
export interface ForecastPeriod {
  number: number;
  name: string;
  startTime: string;
  endTime: string;
  isDaytime: boolean;
  temperature: number;
  temperatureUnit: string;
  temperatureTrend?: string;
  windSpeed: string;
  windDirection: string;
  icon: string;
  shortForecast: string;
  detailedForecast: string;
  probabilityOfPrecipitation?: {
    value: number | null;
    unitCode: string;
  };
}

/**
 * Location weather data
 */
export interface LocationWeather {
  location: {
    lat: number;
    lng: number;
    city?: string;
    state?: string;
  };
  gridId: string;
  gridX: number;
  gridY: number;
  forecastOffice: string;
  forecast: ForecastPeriod[];
  alerts: WeatherAlert[];
  hazardSummary: {
    hasActiveAlerts: boolean;
    highestSeverity: AlertSeverity | null;
    alertCount: number;
    alertTypes: string[];
  };
}

/**
 * Climate risk assessment
 */
export interface ClimateRiskAssessment {
  location: {
    lat: number;
    lng: number;
  };
  risks: {
    hurricane: 'low' | 'moderate' | 'high';
    tornado: 'low' | 'moderate' | 'high';
    flood: 'low' | 'moderate' | 'high';
    wildfire: 'low' | 'moderate' | 'high';
    extremeHeat: 'low' | 'moderate' | 'high';
    extremeCold: 'low' | 'moderate' | 'high';
  };
  overallRisk: 'low' | 'moderate' | 'high';
  currentAlerts: WeatherAlert[];
}

/**
 * NOAA Service Configuration
 */
export interface NOAAServiceConfig {
  userAgent?: string;
  cacheConfig?: Partial<CacheConfig>;
  circuitBreakerConfig?: Partial<CircuitBreakerConfig>;
  rateLimitConfig?: Partial<RateLimitConfig>;
}

/**
 * Default configuration
 */
const DEFAULT_NOAA_CONFIG: Partial<ApiConfig> = {
  baseUrl: 'https://api.weather.gov',
  timeout: 30000,
  retries: 3,
  retryDelay: 2000,
  serviceName: 'noaa-weather',
  headers: {
    'User-Agent': 'TaxDeedFlow/1.0 (property-analysis; contact@example.com)',
    'Accept': 'application/geo+json',
  },
};

/**
 * Default cache config - 1 hour for forecasts
 */
const DEFAULT_NOAA_CACHE_CONFIG: Partial<CacheConfig> = {
  enabled: true,
  ttl: 3600000, // 1 hour
  maxSize: 200,
};

/**
 * Default rate limit - NOAA recommends reasonable use
 */
const DEFAULT_NOAA_RATE_LIMIT: Partial<RateLimitConfig> = {
  requestsPerSecond: 2,
  burstSize: 5,
  queueExcess: true,
};

/**
 * Hurricane-prone states
 */
const HURRICANE_STATES = ['FL', 'TX', 'LA', 'NC', 'SC', 'GA', 'AL', 'MS', 'VA', 'MD', 'DE', 'NJ', 'NY', 'CT', 'RI', 'MA', 'NH', 'ME'];

/**
 * Tornado alley states
 */
const TORNADO_STATES = ['TX', 'OK', 'KS', 'NE', 'SD', 'ND', 'IA', 'MO', 'AR', 'LA', 'MS', 'AL', 'TN', 'KY', 'IL', 'IN', 'OH'];

/**
 * Wildfire-prone states
 */
const WILDFIRE_STATES = ['CA', 'OR', 'WA', 'ID', 'MT', 'WY', 'CO', 'NM', 'AZ', 'NV', 'UT', 'TX'];

/**
 * NOAA Weather API Service
 *
 * Provides weather forecasts and alerts for property risk analysis.
 */
export class NOAAService extends BaseApiService {
  constructor(config?: NOAAServiceConfig) {
    const apiConfig: Partial<ApiConfig> & { baseUrl: string } = {
      ...DEFAULT_NOAA_CONFIG,
      baseUrl: DEFAULT_NOAA_CONFIG.baseUrl!,
      headers: {
        ...DEFAULT_NOAA_CONFIG.headers,
        'User-Agent': config?.userAgent || DEFAULT_NOAA_CONFIG.headers?.['User-Agent'] || '',
      },
    };

    super(
      apiConfig,
      { ...DEFAULT_NOAA_CACHE_CONFIG, ...config?.cacheConfig },
      config?.circuitBreakerConfig,
      { ...DEFAULT_NOAA_RATE_LIMIT, ...config?.rateLimitConfig }
    );

    this.logger.info('NOAAService initialized (free API, no key required)');
  }

  /**
   * Get forecast office and grid info for a location
   *
   * @param lat - Latitude
   * @param lng - Longitude
   * @returns Promise resolving to grid point data
   */
  public async getGridPoint(
    lat: number,
    lng: number
  ): Promise<ApiResponse<{ gridId: string; gridX: number; gridY: number; forecastOffice: string; city?: string; state?: string }>> {
    this.validateCoordinates(lat, lng);

    const endpoint = `/points/${lat.toFixed(4)},${lng.toFixed(4)}`;

    const response = await this.get<{
      properties: {
        gridId: string;
        gridX: number;
        gridY: number;
        forecast: string;
        forecastOffice: string;
        relativeLocation?: {
          properties?: {
            city?: string;
            state?: string;
          };
        };
      };
    }>(endpoint);

    const props = response.data.properties;

    return {
      ...response,
      data: {
        gridId: props.gridId,
        gridX: props.gridX,
        gridY: props.gridY,
        forecastOffice: props.forecastOffice,
        city: props.relativeLocation?.properties?.city,
        state: props.relativeLocation?.properties?.state,
      },
    };
  }

  /**
   * Get weather forecast for a location
   *
   * @param lat - Latitude
   * @param lng - Longitude
   * @returns Promise resolving to forecast
   */
  public async getForecast(lat: number, lng: number): Promise<ApiResponse<ForecastPeriod[]>> {
    this.validateCoordinates(lat, lng);

    // First get the grid point
    const gridPoint = await this.getGridPoint(lat, lng);
    const { gridId, gridX, gridY } = gridPoint.data;

    // Then get the forecast
    const endpoint = `/gridpoints/${gridId}/${gridX},${gridY}/forecast`;

    const response = await this.get<{
      properties: {
        periods: ForecastPeriod[];
      };
    }>(endpoint);

    return {
      ...response,
      data: response.data.properties.periods || [],
    };
  }

  /**
   * Get active weather alerts for a location
   *
   * @param lat - Latitude
   * @param lng - Longitude
   * @returns Promise resolving to alerts
   */
  public async getActiveAlerts(lat: number, lng: number): Promise<ApiResponse<WeatherAlert[]>> {
    this.validateCoordinates(lat, lng);

    const endpoint = `/alerts/active`;

    const response = await this.get<{
      features: Array<{
        properties: {
          id: string;
          event: string;
          severity: AlertSeverity;
          certainty: string;
          urgency: string;
          headline: string;
          description: string;
          instruction?: string;
          areaDesc: string;
          effective: string;
          expires: string;
          senderName: string;
        };
      }>;
    }>(endpoint, {
      params: {
        point: `${lat.toFixed(4)},${lng.toFixed(4)}`,
        status: 'actual',
        message_type: 'alert',
      },
    });

    const alerts = (response.data.features || []).map((f) => ({
      id: f.properties.id,
      event: f.properties.event,
      severity: f.properties.severity,
      certainty: f.properties.certainty,
      urgency: f.properties.urgency,
      headline: f.properties.headline,
      description: f.properties.description,
      instruction: f.properties.instruction,
      areaDesc: f.properties.areaDesc,
      effective: f.properties.effective,
      expires: f.properties.expires,
      sender: f.properties.senderName,
    }));

    return {
      ...response,
      data: alerts,
    };
  }

  /**
   * Get complete weather data for a location
   *
   * @param lat - Latitude
   * @param lng - Longitude
   * @returns Promise resolving to complete weather data
   */
  public async getLocationWeather(lat: number, lng: number): Promise<ApiResponse<LocationWeather>> {
    this.validateCoordinates(lat, lng);

    // Create empty response helper
    const emptyForecastResponse: ApiResponse<ForecastPeriod[]> = {
      data: [],
      status: 200,
      headers: {},
      cached: false,
      requestId: `noaa_forecast_fallback_${Date.now()}`,
      responseTime: 0,
    };
    const emptyAlertsResponse: ApiResponse<WeatherAlert[]> = {
      data: [],
      status: 200,
      headers: {},
      cached: false,
      requestId: `noaa_alerts_fallback_${Date.now()}`,
      responseTime: 0,
    };

    // Get grid point, forecast, and alerts in parallel
    const [gridPoint, forecast, alerts] = await Promise.all([
      this.getGridPoint(lat, lng),
      this.getForecast(lat, lng).catch(() => emptyForecastResponse),
      this.getActiveAlerts(lat, lng).catch(() => emptyAlertsResponse),
    ]);

    // Calculate hazard summary
    const alertTypes = Array.from(new Set(alerts.data.map((a) => a.event)));
    const highestSeverity = this.getHighestSeverity(alerts.data);

    const weather: LocationWeather = {
      location: {
        lat,
        lng,
        city: gridPoint.data.city,
        state: gridPoint.data.state,
      },
      gridId: gridPoint.data.gridId,
      gridX: gridPoint.data.gridX,
      gridY: gridPoint.data.gridY,
      forecastOffice: gridPoint.data.forecastOffice,
      forecast: forecast.data,
      alerts: alerts.data,
      hazardSummary: {
        hasActiveAlerts: alerts.data.length > 0,
        highestSeverity,
        alertCount: alerts.data.length,
        alertTypes,
      },
    };

    return {
      data: weather,
      status: 200,
      headers: {},
      cached: false,
      requestId: `noaa_${Date.now()}`,
      responseTime: 0,
    };
  }

  /**
   * Get climate risk assessment for a location
   *
   * @param lat - Latitude
   * @param lng - Longitude
   * @param stateAbbr - State abbreviation (for regional risk assessment)
   * @returns Promise resolving to climate risk assessment
   */
  public async getClimateRiskAssessment(
    lat: number,
    lng: number,
    stateAbbr: string
  ): Promise<ApiResponse<ClimateRiskAssessment>> {
    this.validateCoordinates(lat, lng);

    const state = stateAbbr.toUpperCase();

    // Create empty alerts response for fallback
    const emptyAlertsResponse: ApiResponse<WeatherAlert[]> = {
      data: [],
      status: 200,
      headers: {},
      cached: false,
      requestId: `noaa_alerts_risk_fallback_${Date.now()}`,
      responseTime: 0,
    };

    // Get current alerts
    const alertsResponse = await this.getActiveAlerts(lat, lng).catch(() => emptyAlertsResponse);

    // Type for risk levels
    type RiskLevel = 'low' | 'moderate' | 'high';

    // Assess regional risks based on state
    const risks: ClimateRiskAssessment['risks'] = {
      hurricane: HURRICANE_STATES.includes(state) ? 'moderate' : 'low',
      tornado: TORNADO_STATES.includes(state) ? 'moderate' : 'low',
      flood: 'moderate', // Default moderate, would need FEMA data for accuracy
      wildfire: WILDFIRE_STATES.includes(state) ? 'moderate' : 'low',
      extremeHeat: ['AZ', 'NV', 'TX', 'CA', 'FL'].includes(state) ? 'moderate' : 'low',
      extremeCold: ['MN', 'WI', 'ND', 'SD', 'MT', 'WY', 'AK'].includes(state) ? 'moderate' : 'low',
    };

    // Elevate risk based on current alerts
    alertsResponse.data.forEach((alert) => {
      const event = alert.event.toLowerCase();
      if (event.includes('hurricane') || event.includes('tropical')) {
        risks.hurricane = 'high';
      }
      if (event.includes('tornado')) {
        risks.tornado = 'high';
      }
      if (event.includes('flood')) {
        risks.flood = 'high';
      }
      if (event.includes('fire') || event.includes('red flag')) {
        risks.wildfire = 'high';
      }
      if (event.includes('heat')) {
        risks.extremeHeat = 'high';
      }
      if (event.includes('cold') || event.includes('freeze') || event.includes('winter')) {
        risks.extremeCold = 'high';
      }
    });

    // Calculate overall risk
    const riskValues = Object.values(risks);
    const highCount = riskValues.filter((r) => r === 'high').length;
    const moderateCount = riskValues.filter((r) => r === 'moderate').length;

    let overallRisk: 'low' | 'moderate' | 'high';
    if (highCount >= 2) {
      overallRisk = 'high';
    } else if (highCount >= 1 || moderateCount >= 3) {
      overallRisk = 'moderate';
    } else {
      overallRisk = 'low';
    }

    const assessment: ClimateRiskAssessment = {
      location: { lat, lng },
      risks,
      overallRisk,
      currentAlerts: alertsResponse.data,
    };

    return {
      data: assessment,
      status: 200,
      headers: {},
      cached: false,
      requestId: `noaa_risk_${Date.now()}`,
      responseTime: 0,
    };
  }

  /**
   * Get highest severity from alerts
   */
  private getHighestSeverity(alerts: WeatherAlert[]): AlertSeverity | null {
    if (alerts.length === 0) return null;

    const severityOrder: AlertSeverity[] = ['Extreme', 'Severe', 'Moderate', 'Minor', 'Unknown'];

    for (const severity of severityOrder) {
      if (alerts.some((a) => a.severity === severity)) {
        return severity;
      }
    }

    return 'Unknown';
  }

  /**
   * Validates geographic coordinates
   */
  private validateCoordinates(lat: number, lng: number): void {
    if (typeof lat !== 'number' || isNaN(lat) || lat < -90 || lat > 90) {
      throw new ValidationError(
        'Invalid latitude. Must be a number between -90 and 90.',
        'coordinates',
        'validation',
        'latitude',
        { range: 'Must be between -90 and 90' },
        lat
      );
    }

    if (typeof lng !== 'number' || isNaN(lng) || lng < -180 || lng > 180) {
      throw new ValidationError(
        'Invalid longitude. Must be a number between -180 and 180.',
        'coordinates',
        'validation',
        'longitude',
        { range: 'Must be between -180 and 180' },
        lng
      );
    }
  }
}

/**
 * Singleton instance
 */
let noaaServiceInstance: NOAAService | null = null;

export function getNOAAService(config?: NOAAServiceConfig): NOAAService {
  if (!noaaServiceInstance) {
    noaaServiceInstance = new NOAAService(config);
  }
  return noaaServiceInstance;
}

export function resetNOAAService(): void {
  noaaServiceInstance = null;
}

export default NOAAService;
