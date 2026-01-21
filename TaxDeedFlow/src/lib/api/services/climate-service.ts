/**
 * Open-Meteo Climate API Service
 *
 * Provides weather forecasts, historical data, and climate normals.
 * Free public API - no API key required.
 *
 * API Documentation: https://open-meteo.com/en/docs
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
 * Current weather data
 */
export interface CurrentWeather {
  time: string;
  temperature: number;
  temperatureUnit: string;
  humidity: number;
  apparentTemperature: number;
  precipitation: number;
  rain: number;
  snowfall: number;
  weatherCode: number;
  weatherDescription: string;
  cloudCover: number;
  windSpeed: number;
  windDirection: number;
  windGusts: number;
  visibility: number;
  uvIndex: number;
}

/**
 * Daily forecast
 */
export interface DailyForecast {
  date: string;
  temperatureMax: number;
  temperatureMin: number;
  temperatureUnit: string;
  apparentTemperatureMax: number;
  apparentTemperatureMin: number;
  precipitationSum: number;
  precipitationProbabilityMax: number;
  weatherCode: number;
  weatherDescription: string;
  sunrise: string;
  sunset: string;
  windSpeedMax: number;
  windGustsMax: number;
  uvIndexMax: number;
}

/**
 * Climate normals (historical averages)
 */
export interface ClimateNormals {
  month: number;
  monthName: string;
  avgTemperatureMax: number;
  avgTemperatureMin: number;
  avgPrecipitation: number;
  avgPrecipitationDays: number;
  avgSnowfall: number;
  avgSnowDays: number;
  avgSunHours: number;
}

/**
 * Climate summary for property analysis
 */
export interface ClimateSummary {
  location: {
    lat: number;
    lng: number;
    timezone: string;
  };
  current: CurrentWeather;
  forecast: DailyForecast[];
  climateProfile: {
    averageAnnualTemperature: number;
    averageAnnualPrecipitation: number;
    averageAnnualSnowfall: number;
    freezingDaysPerYear: number;
    hotDaysPerYear: number; // Days > 90°F
    heatingDegreeDays: number;
    coolingDegreeDays: number;
    climateZone: string;
  };
  risks: {
    extremeHeat: 'low' | 'moderate' | 'high';
    extremeCold: 'low' | 'moderate' | 'high';
    drought: 'low' | 'moderate' | 'high';
    heavyPrecipitation: 'low' | 'moderate' | 'high';
  };
}

/**
 * Weather code descriptions
 */
const WEATHER_CODES: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Fog',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snow',
  73: 'Moderate snow',
  75: 'Heavy snow',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
};

/**
 * Climate Service Configuration
 */
export interface ClimateServiceConfig {
  cacheConfig?: Partial<CacheConfig>;
  circuitBreakerConfig?: Partial<CircuitBreakerConfig>;
  rateLimitConfig?: Partial<RateLimitConfig>;
}

/**
 * Default configuration
 */
const DEFAULT_CLIMATE_CONFIG: Partial<ApiConfig> = {
  baseUrl: 'https://api.open-meteo.com/v1',
  timeout: 30000,
  retries: 3,
  retryDelay: 2000,
  serviceName: 'open-meteo',
};

/**
 * Default cache config - 6 hours for forecasts
 */
const DEFAULT_CLIMATE_CACHE_CONFIG: Partial<CacheConfig> = {
  enabled: true,
  ttl: 21600000, // 6 hours
  maxSize: 300,
};

/**
 * Default rate limit - public API, be respectful
 */
const DEFAULT_CLIMATE_RATE_LIMIT: Partial<RateLimitConfig> = {
  requestsPerSecond: 5,
  burstSize: 10,
  queueExcess: true,
};

/**
 * Open-Meteo Climate API Service
 *
 * Provides weather and climate data for property analysis.
 */
export class ClimateService extends BaseApiService {
  constructor(config?: ClimateServiceConfig) {
    const apiConfig: Partial<ApiConfig> & { baseUrl: string } = {
      ...DEFAULT_CLIMATE_CONFIG,
      baseUrl: DEFAULT_CLIMATE_CONFIG.baseUrl!,
    };

    super(
      apiConfig,
      { ...DEFAULT_CLIMATE_CACHE_CONFIG, ...config?.cacheConfig },
      config?.circuitBreakerConfig,
      { ...DEFAULT_CLIMATE_RATE_LIMIT, ...config?.rateLimitConfig }
    );

    this.logger.info('ClimateService initialized (free API, no key required)');
  }

  /**
   * Get current weather for a location
   *
   * @param lat - Latitude
   * @param lng - Longitude
   * @returns Promise resolving to current weather
   */
  public async getCurrentWeather(lat: number, lng: number): Promise<ApiResponse<CurrentWeather>> {
    this.validateCoordinates(lat, lng);

    const endpoint = '/forecast';

    const response = await this.get<{
      current: {
        time: string;
        temperature_2m: number;
        relative_humidity_2m: number;
        apparent_temperature: number;
        precipitation: number;
        rain: number;
        snowfall: number;
        weather_code: number;
        cloud_cover: number;
        wind_speed_10m: number;
        wind_direction_10m: number;
        wind_gusts_10m: number;
      };
      current_units: {
        temperature_2m: string;
      };
    }>(endpoint, {
      params: {
        latitude: lat,
        longitude: lng,
        current: [
          'temperature_2m',
          'relative_humidity_2m',
          'apparent_temperature',
          'precipitation',
          'rain',
          'snowfall',
          'weather_code',
          'cloud_cover',
          'wind_speed_10m',
          'wind_direction_10m',
          'wind_gusts_10m',
        ].join(','),
        temperature_unit: 'fahrenheit',
        wind_speed_unit: 'mph',
        precipitation_unit: 'inch',
      },
    });

    const current = response.data.current;

    return {
      ...response,
      data: {
        time: current.time,
        temperature: current.temperature_2m,
        temperatureUnit: response.data.current_units.temperature_2m,
        humidity: current.relative_humidity_2m,
        apparentTemperature: current.apparent_temperature,
        precipitation: current.precipitation,
        rain: current.rain,
        snowfall: current.snowfall,
        weatherCode: current.weather_code,
        weatherDescription: WEATHER_CODES[current.weather_code] || 'Unknown',
        cloudCover: current.cloud_cover,
        windSpeed: current.wind_speed_10m,
        windDirection: current.wind_direction_10m,
        windGusts: current.wind_gusts_10m,
        visibility: 0, // Not available in current API
        uvIndex: 0, // Would need separate call
      },
    };
  }

  /**
   * Get 7-day forecast for a location
   *
   * @param lat - Latitude
   * @param lng - Longitude
   * @returns Promise resolving to daily forecast
   */
  public async getForecast(lat: number, lng: number): Promise<ApiResponse<DailyForecast[]>> {
    this.validateCoordinates(lat, lng);

    const endpoint = '/forecast';

    const response = await this.get<{
      daily: {
        time: string[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        apparent_temperature_max: number[];
        apparent_temperature_min: number[];
        precipitation_sum: number[];
        precipitation_probability_max: number[];
        weather_code: number[];
        sunrise: string[];
        sunset: string[];
        wind_speed_10m_max: number[];
        wind_gusts_10m_max: number[];
        uv_index_max: number[];
      };
      daily_units: {
        temperature_2m_max: string;
      };
    }>(endpoint, {
      params: {
        latitude: lat,
        longitude: lng,
        daily: [
          'temperature_2m_max',
          'temperature_2m_min',
          'apparent_temperature_max',
          'apparent_temperature_min',
          'precipitation_sum',
          'precipitation_probability_max',
          'weather_code',
          'sunrise',
          'sunset',
          'wind_speed_10m_max',
          'wind_gusts_10m_max',
          'uv_index_max',
        ].join(','),
        temperature_unit: 'fahrenheit',
        wind_speed_unit: 'mph',
        precipitation_unit: 'inch',
        forecast_days: 7,
      },
    });

    const daily = response.data.daily;
    const forecast: DailyForecast[] = daily.time.map((date, i) => ({
      date,
      temperatureMax: daily.temperature_2m_max[i],
      temperatureMin: daily.temperature_2m_min[i],
      temperatureUnit: response.data.daily_units.temperature_2m_max,
      apparentTemperatureMax: daily.apparent_temperature_max[i],
      apparentTemperatureMin: daily.apparent_temperature_min[i],
      precipitationSum: daily.precipitation_sum[i],
      precipitationProbabilityMax: daily.precipitation_probability_max[i],
      weatherCode: daily.weather_code[i],
      weatherDescription: WEATHER_CODES[daily.weather_code[i]] || 'Unknown',
      sunrise: daily.sunrise[i],
      sunset: daily.sunset[i],
      windSpeedMax: daily.wind_speed_10m_max[i],
      windGustsMax: daily.wind_gusts_10m_max[i],
      uvIndexMax: daily.uv_index_max[i],
    }));

    return {
      ...response,
      data: forecast,
    };
  }

  /**
   * Get historical climate data (monthly averages)
   *
   * @param lat - Latitude
   * @param lng - Longitude
   * @param startYear - Start year for historical data
   * @param endYear - End year for historical data
   * @returns Promise resolving to climate normals
   */
  public async getClimateNormals(
    lat: number,
    lng: number,
    startYear: number = 1991,
    endYear: number = 2020
  ): Promise<ApiResponse<ClimateNormals[]>> {
    this.validateCoordinates(lat, lng);

    // Use the archive API for historical data
    const endpoint = '/archive';

    const response = await this.get<{
      daily: {
        time: string[];
        temperature_2m_max: number[];
        temperature_2m_min: number[];
        precipitation_sum: number[];
        snowfall_sum: number[];
      };
    }>(endpoint, {
      params: {
        latitude: lat,
        longitude: lng,
        start_date: `${startYear}-01-01`,
        end_date: `${endYear}-12-31`,
        daily: ['temperature_2m_max', 'temperature_2m_min', 'precipitation_sum', 'snowfall_sum'].join(','),
        temperature_unit: 'fahrenheit',
        precipitation_unit: 'inch',
      },
    });

    // Calculate monthly averages
    const monthlyData: Record<number, {
      tempMax: number[];
      tempMin: number[];
      precip: number[];
      snow: number[];
    }> = {};

    const daily = response.data.daily;
    daily.time.forEach((date, i) => {
      const month = new Date(date).getMonth() + 1;
      if (!monthlyData[month]) {
        monthlyData[month] = { tempMax: [], tempMin: [], precip: [], snow: [] };
      }
      if (daily.temperature_2m_max[i] != null) monthlyData[month].tempMax.push(daily.temperature_2m_max[i]);
      if (daily.temperature_2m_min[i] != null) monthlyData[month].tempMin.push(daily.temperature_2m_min[i]);
      if (daily.precipitation_sum[i] != null) monthlyData[month].precip.push(daily.precipitation_sum[i]);
      if (daily.snowfall_sum[i] != null) monthlyData[month].snow.push(daily.snowfall_sum[i]);
    });

    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];

    const normals: ClimateNormals[] = Object.entries(monthlyData).map(([month, data]) => {
      const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
      const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
      const countDays = (arr: number[], threshold: number) => arr.filter((v) => v > threshold).length;

      return {
        month: parseInt(month),
        monthName: monthNames[parseInt(month) - 1],
        avgTemperatureMax: Math.round(avg(data.tempMax) * 10) / 10,
        avgTemperatureMin: Math.round(avg(data.tempMin) * 10) / 10,
        avgPrecipitation: Math.round(sum(data.precip) / (endYear - startYear + 1) * 100) / 100,
        avgPrecipitationDays: Math.round(countDays(data.precip, 0.01) / (endYear - startYear + 1)),
        avgSnowfall: Math.round(sum(data.snow) / (endYear - startYear + 1) * 100) / 100,
        avgSnowDays: Math.round(countDays(data.snow, 0.1) / (endYear - startYear + 1)),
        avgSunHours: 0, // Would need additional API call
      };
    }).sort((a, b) => a.month - b.month);

    return {
      ...response,
      data: normals,
    };
  }

  /**
   * Get complete climate summary for property analysis
   *
   * @param lat - Latitude
   * @param lng - Longitude
   * @returns Promise resolving to climate summary
   */
  public async getClimateSummary(lat: number, lng: number): Promise<ApiResponse<ClimateSummary>> {
    this.validateCoordinates(lat, lng);

    // Get current weather, forecast, and timezone in parallel
    const [currentResponse, forecastResponse] = await Promise.all([
      this.getCurrentWeather(lat, lng),
      this.getForecast(lat, lng),
    ]);

    // Calculate climate profile from forecast (simplified)
    const forecast = forecastResponse.data;
    const avgTemp = forecast.reduce((sum, d) => sum + (d.temperatureMax + d.temperatureMin) / 2, 0) / forecast.length;
    const totalPrecip = forecast.reduce((sum, d) => sum + d.precipitationSum, 0);

    // Estimate annual values from 7-day sample (rough approximation)
    const annualPrecip = totalPrecip * (365 / 7);

    // Determine climate zone (simplified)
    let climateZone: string;
    if (avgTemp > 70) {
      climateZone = annualPrecip > 40 ? 'Humid Subtropical' : 'Semi-Arid';
    } else if (avgTemp > 50) {
      climateZone = annualPrecip > 30 ? 'Humid Continental' : 'Mediterranean';
    } else {
      climateZone = 'Continental';
    }

    // Assess risks
    const risks = {
      extremeHeat: avgTemp > 75 ? 'high' as const : avgTemp > 65 ? 'moderate' as const : 'low' as const,
      extremeCold: avgTemp < 35 ? 'high' as const : avgTemp < 50 ? 'moderate' as const : 'low' as const,
      drought: annualPrecip < 20 ? 'high' as const : annualPrecip < 35 ? 'moderate' as const : 'low' as const,
      heavyPrecipitation: annualPrecip > 50 ? 'high' as const : annualPrecip > 40 ? 'moderate' as const : 'low' as const,
    };

    const summary: ClimateSummary = {
      location: {
        lat,
        lng,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      current: currentResponse.data,
      forecast,
      climateProfile: {
        averageAnnualTemperature: Math.round(avgTemp),
        averageAnnualPrecipitation: Math.round(annualPrecip),
        averageAnnualSnowfall: 0, // Would need historical data
        freezingDaysPerYear: 0, // Would need historical data
        hotDaysPerYear: 0, // Would need historical data
        heatingDegreeDays: 0, // Would need historical data
        coolingDegreeDays: 0, // Would need historical data
        climateZone,
      },
      risks,
    };

    return {
      data: summary,
      status: 200,
      headers: {},
      cached: false,
      requestId: `climate_${Date.now()}`,
      responseTime: 0,
    };
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
let climateServiceInstance: ClimateService | null = null;

export function getClimateService(config?: ClimateServiceConfig): ClimateService {
  if (!climateServiceInstance) {
    climateServiceInstance = new ClimateService(config);
  }
  return climateServiceInstance;
}

export function resetClimateService(): void {
  climateServiceInstance = null;
}

export default ClimateService;
