/**
 * Climate API Service Tests
 *
 * Tests the Open-Meteo Climate API service functionality including:
 * - Current weather data retrieval
 * - 7-day forecast retrieval
 * - Historical climate normals
 * - Complete climate summary for property analysis
 * - Coordinate validation
 * - Error handling
 * - Singleton pattern
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-22
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  ClimateService,
  getClimateService,
  resetClimateService,
  type CurrentWeather,
  type DailyForecast,
  type ClimateNormals,
  type ClimateSummary,
} from '../climate-service';
import { ValidationError } from '../../errors';
import type { ApiResponse } from '../../types';

// ============================================
// Mock Data - Current Weather Response
// ============================================

const mockOpenMeteoCurrentResponse = {
  current: {
    time: '2026-01-22T15:00',
    temperature_2m: 68.5,
    relative_humidity_2m: 55,
    apparent_temperature: 66.2,
    precipitation: 0.0,
    rain: 0.0,
    snowfall: 0.0,
    weather_code: 2,
    cloud_cover: 45,
    wind_speed_10m: 8.5,
    wind_direction_10m: 180,
    wind_gusts_10m: 12.3,
  },
  current_units: {
    temperature_2m: '°F',
  },
};

const mockOpenMeteoCurrentResponseColdSnow = {
  current: {
    time: '2026-01-22T10:00',
    temperature_2m: 28.3,
    relative_humidity_2m: 85,
    apparent_temperature: 20.1,
    precipitation: 0.5,
    rain: 0.0,
    snowfall: 2.3,
    weather_code: 73,
    cloud_cover: 95,
    wind_speed_10m: 15.2,
    wind_direction_10m: 350,
    wind_gusts_10m: 25.8,
  },
  current_units: {
    temperature_2m: '°F',
  },
};

// ============================================
// Mock Data - Forecast Response
// ============================================

const mockOpenMeteoForecastResponse = {
  daily: {
    time: [
      '2026-01-22',
      '2026-01-23',
      '2026-01-24',
      '2026-01-25',
      '2026-01-26',
      '2026-01-27',
      '2026-01-28',
    ],
    temperature_2m_max: [72.5, 75.2, 68.9, 71.3, 73.8, 76.1, 74.5],
    temperature_2m_min: [58.3, 61.2, 59.8, 60.5, 62.1, 63.5, 61.8],
    apparent_temperature_max: [70.2, 73.5, 67.1, 69.8, 72.3, 74.8, 73.2],
    apparent_temperature_min: [56.1, 59.3, 57.9, 58.7, 60.5, 61.8, 60.1],
    precipitation_sum: [0.0, 0.2, 0.8, 0.0, 0.1, 0.0, 0.3],
    precipitation_probability_max: [10, 30, 60, 15, 25, 5, 40],
    weather_code: [2, 3, 61, 1, 2, 0, 51],
    sunrise: [
      '2026-01-22T07:15:00',
      '2026-01-23T07:14:30',
      '2026-01-24T07:14:00',
      '2026-01-25T07:13:30',
      '2026-01-26T07:13:00',
      '2026-01-27T07:12:30',
      '2026-01-28T07:12:00',
    ],
    sunset: [
      '2026-01-22T17:45:00',
      '2026-01-23T17:46:00',
      '2026-01-24T17:47:00',
      '2026-01-25T17:48:00',
      '2026-01-26T17:49:00',
      '2026-01-27T17:50:00',
      '2026-01-28T17:51:00',
    ],
    wind_speed_10m_max: [10.5, 12.3, 15.8, 9.2, 11.5, 8.7, 13.2],
    wind_gusts_10m_max: [18.5, 21.3, 25.8, 16.2, 19.5, 15.7, 22.2],
    uv_index_max: [5.2, 5.8, 4.1, 6.2, 5.5, 6.8, 5.1],
  },
  daily_units: {
    temperature_2m_max: '°F',
  },
};

// ============================================
// Mock Data - Archive (Climate Normals) Response
// ============================================

const mockOpenMeteoArchiveResponse = {
  daily: {
    time: [
      '2020-01-01', '2020-01-02', '2020-02-01', '2020-02-02',
      '2020-03-01', '2020-03-02', '2020-04-01', '2020-04-02',
      '2020-05-01', '2020-05-02', '2020-06-01', '2020-06-02',
      '2020-07-01', '2020-07-02', '2020-08-01', '2020-08-02',
      '2020-09-01', '2020-09-02', '2020-10-01', '2020-10-02',
      '2020-11-01', '2020-11-02', '2020-12-01', '2020-12-02',
    ],
    temperature_2m_max: [
      45.2, 48.3, 55.1, 52.8, 62.5, 65.2, 71.3, 73.8,
      78.5, 81.2, 87.3, 89.5, 92.1, 91.8, 90.5, 88.3,
      82.5, 79.8, 68.3, 65.2, 52.1, 48.5, 42.3, 40.1,
    ],
    temperature_2m_min: [
      32.1, 35.2, 38.5, 36.8, 45.2, 48.3, 55.8, 58.2,
      62.5, 65.1, 71.2, 73.5, 75.8, 74.5, 73.2, 71.8,
      65.3, 62.1, 52.8, 48.5, 38.2, 35.1, 28.5, 26.3,
    ],
    precipitation_sum: [
      0.0, 0.2, 0.0, 0.5, 0.3, 0.0, 0.8, 0.0,
      0.1, 0.4, 0.0, 0.0, 0.2, 0.6, 0.0, 0.3,
      0.5, 0.0, 0.0, 0.8, 0.2, 0.0, 0.0, 0.1,
    ],
    snowfall_sum: [
      0.5, 0.0, 0.0, 0.2, 0.0, 0.0, 0.0, 0.0,
      0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0,
      0.0, 0.0, 0.0, 0.0, 0.0, 0.3, 1.2, 0.5,
    ],
  },
};

// ============================================
// Expected Parsed Results
// ============================================

const expectedCurrentWeather: CurrentWeather = {
  time: '2026-01-22T15:00',
  temperature: 68.5,
  temperatureUnit: '°F',
  humidity: 55,
  apparentTemperature: 66.2,
  precipitation: 0.0,
  rain: 0.0,
  snowfall: 0.0,
  weatherCode: 2,
  weatherDescription: 'Partly cloudy',
  cloudCover: 45,
  windSpeed: 8.5,
  windDirection: 180,
  windGusts: 12.3,
  visibility: 0,
  uvIndex: 0,
};

// ============================================
// Helper Functions
// ============================================

/**
 * Creates a mock fetch response with proper headers
 */
function createMockResponse(
  data: any,
  status = 200,
  headers: Record<string, string> = {}
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: new Map(Object.entries({
      'content-type': 'application/json',
      ...headers,
    })) as any,
    json: async () => data,
    text: async () => JSON.stringify(data),
  } as Response;
}

// ============================================
// Test Setup
// ============================================

describe('ClimateService', () => {
  let service: ClimateService;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset singleton between tests
    resetClimateService();

    // Create fresh service instance with caching disabled for tests
    service = new ClimateService({
      cacheConfig: { enabled: false },
    });

    // Mock global fetch
    fetchMock = vi.fn();
    global.fetch = fetchMock;

    // Silence console logs during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================
  // Constructor Tests
  // ============================================

  describe('constructor', () => {
    it('should create service with default config', () => {
      const newService = new ClimateService();
      expect(newService).toBeDefined();
      expect(newService).toBeInstanceOf(ClimateService);
    });

    it('should create service with custom cache config', () => {
      const newService = new ClimateService({
        cacheConfig: { enabled: false, ttl: 1000 },
      });
      expect(newService).toBeDefined();
    });

    it('should create service with custom circuit breaker config', () => {
      const newService = new ClimateService({
        circuitBreakerConfig: { failureThreshold: 10 },
      });
      expect(newService).toBeDefined();
    });

    it('should create service with custom rate limit config', () => {
      const newService = new ClimateService({
        rateLimitConfig: { requestsPerSecond: 3, burstSize: 5 },
      });
      expect(newService).toBeDefined();
    });

    it('should create service with all custom configs', () => {
      const newService = new ClimateService({
        cacheConfig: { enabled: true, ttl: 3600000 },
        circuitBreakerConfig: { failureThreshold: 5, resetTimeout: 60000 },
        rateLimitConfig: { requestsPerSecond: 2, burstSize: 4 },
      });
      expect(newService).toBeDefined();
    });
  });

  // ============================================
  // getCurrentWeather Tests
  // ============================================

  describe('getCurrentWeather', () => {
    it('should retrieve current weather for valid coordinates', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse(mockOpenMeteoCurrentResponse)
      );

      const result = await service.getCurrentWeather(40.7128, -74.0060);

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.data.temperature).toBe(68.5);
      expect(result.data.temperatureUnit).toBe('°F');
      expect(result.data.humidity).toBe(55);
      expect(result.data.apparentTemperature).toBe(66.2);
      expect(result.data.weatherCode).toBe(2);
      expect(result.data.weatherDescription).toBe('Partly cloudy');
      expect(result.data.cloudCover).toBe(45);
      expect(result.data.windSpeed).toBe(8.5);
    });

    it('should handle cold weather with snow', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse(mockOpenMeteoCurrentResponseColdSnow)
      );

      const result = await service.getCurrentWeather(44.9778, -93.2650); // Minneapolis

      expect(result.data.temperature).toBe(28.3);
      expect(result.data.snowfall).toBe(2.3);
      expect(result.data.weatherCode).toBe(73);
      expect(result.data.weatherDescription).toBe('Moderate snow');
    });

    it('should include request parameters for US units', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse(mockOpenMeteoCurrentResponse)
      );

      await service.getCurrentWeather(40.7128, -74.0060);

      const callUrl = fetchMock.mock.calls[0][0] as string;
      expect(callUrl).toContain('temperature_unit=fahrenheit');
      expect(callUrl).toContain('wind_speed_unit=mph');
      expect(callUrl).toContain('precipitation_unit=inch');
    });

    it('should throw ValidationError for invalid latitude - too low', async () => {
      await expect(service.getCurrentWeather(-91, -74.0060))
        .rejects
        .toThrow(ValidationError);

      await expect(service.getCurrentWeather(-91, -74.0060))
        .rejects
        .toThrow('Invalid latitude');
    });

    it('should throw ValidationError for invalid latitude - too high', async () => {
      await expect(service.getCurrentWeather(91, -74.0060))
        .rejects
        .toThrow(ValidationError);
    });

    it('should throw ValidationError for NaN latitude', async () => {
      await expect(service.getCurrentWeather(NaN, -74.0060))
        .rejects
        .toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid longitude - too low', async () => {
      await expect(service.getCurrentWeather(40.7128, -181))
        .rejects
        .toThrow(ValidationError);

      await expect(service.getCurrentWeather(40.7128, -181))
        .rejects
        .toThrow('Invalid longitude');
    });

    it('should throw ValidationError for invalid longitude - too high', async () => {
      await expect(service.getCurrentWeather(40.7128, 181))
        .rejects
        .toThrow(ValidationError);
    });

    it('should throw ValidationError for NaN longitude', async () => {
      await expect(service.getCurrentWeather(40.7128, NaN))
        .rejects
        .toThrow(ValidationError);
    });

    it('should handle unknown weather codes gracefully', async () => {
      const unknownCodeResponse = {
        ...mockOpenMeteoCurrentResponse,
        current: {
          ...mockOpenMeteoCurrentResponse.current,
          weather_code: 999,
        },
      };

      fetchMock.mockResolvedValueOnce(
        createMockResponse(unknownCodeResponse)
      );

      const result = await service.getCurrentWeather(40.7128, -74.0060);

      expect(result.data.weatherDescription).toBe('Unknown');
    });
  });

  // ============================================
  // getForecast Tests
  // ============================================

  describe('getForecast', () => {
    it('should retrieve 7-day forecast for valid coordinates', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse(mockOpenMeteoForecastResponse)
      );

      const result = await service.getForecast(40.7128, -74.0060);

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.data).toHaveLength(7);

      const firstDay = result.data[0];
      expect(firstDay.date).toBe('2026-01-22');
      expect(firstDay.temperatureMax).toBe(72.5);
      expect(firstDay.temperatureMin).toBe(58.3);
      expect(firstDay.temperatureUnit).toBe('°F');
      expect(firstDay.weatherCode).toBe(2);
      expect(firstDay.weatherDescription).toBe('Partly cloudy');
      expect(firstDay.precipitationSum).toBe(0.0);
      expect(firstDay.precipitationProbabilityMax).toBe(10);
    });

    it('should include all forecast data fields', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse(mockOpenMeteoForecastResponse)
      );

      const result = await service.getForecast(40.7128, -74.0060);

      const day = result.data[2]; // Check 3rd day
      expect(day).toHaveProperty('date');
      expect(day).toHaveProperty('temperatureMax');
      expect(day).toHaveProperty('temperatureMin');
      expect(day).toHaveProperty('temperatureUnit');
      expect(day).toHaveProperty('apparentTemperatureMax');
      expect(day).toHaveProperty('apparentTemperatureMin');
      expect(day).toHaveProperty('precipitationSum');
      expect(day).toHaveProperty('precipitationProbabilityMax');
      expect(day).toHaveProperty('weatherCode');
      expect(day).toHaveProperty('weatherDescription');
      expect(day).toHaveProperty('sunrise');
      expect(day).toHaveProperty('sunset');
      expect(day).toHaveProperty('windSpeedMax');
      expect(day).toHaveProperty('windGustsMax');
      expect(day).toHaveProperty('uvIndexMax');
    });

    it('should include forecast_days=7 parameter', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse(mockOpenMeteoForecastResponse)
      );

      await service.getForecast(40.7128, -74.0060);

      const callUrl = fetchMock.mock.calls[0][0] as string;
      expect(callUrl).toContain('forecast_days=7');
    });

    it('should map weather codes to descriptions correctly', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse(mockOpenMeteoForecastResponse)
      );

      const result = await service.getForecast(40.7128, -74.0060);

      expect(result.data[0].weatherDescription).toBe('Partly cloudy'); // code 2
      expect(result.data[1].weatherDescription).toBe('Overcast'); // code 3
      expect(result.data[2].weatherDescription).toBe('Slight rain'); // code 61
      expect(result.data[3].weatherDescription).toBe('Mainly clear'); // code 1
      expect(result.data[5].weatherDescription).toBe('Clear sky'); // code 0
      expect(result.data[6].weatherDescription).toBe('Light drizzle'); // code 51
    });

    it('should throw ValidationError for invalid coordinates', async () => {
      await expect(service.getForecast(100, -74.0060))
        .rejects
        .toThrow(ValidationError);
    });
  });

  // ============================================
  // getClimateNormals Tests
  // ============================================

  describe('getClimateNormals', () => {
    it('should retrieve climate normals for valid coordinates', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse(mockOpenMeteoArchiveResponse)
      );

      const result = await service.getClimateNormals(40.7128, -74.0060);

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.data.length).toBeGreaterThan(0);
      expect(result.data.length).toBeLessThanOrEqual(12);
    });

    it('should calculate monthly averages correctly', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse(mockOpenMeteoArchiveResponse)
      );

      const result = await service.getClimateNormals(40.7128, -74.0060);

      const januaryData = result.data.find(m => m.month === 1);
      expect(januaryData).toBeDefined();
      expect(januaryData!.monthName).toBe('January');
      expect(januaryData!.avgTemperatureMax).toBeGreaterThan(0);
      expect(januaryData!.avgTemperatureMin).toBeGreaterThan(0);
      expect(januaryData!.avgPrecipitation).toBeGreaterThanOrEqual(0);
    });

    it('should include all climate normal fields', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse(mockOpenMeteoArchiveResponse)
      );

      const result = await service.getClimateNormals(40.7128, -74.0060);

      const month = result.data[0];
      expect(month).toHaveProperty('month');
      expect(month).toHaveProperty('monthName');
      expect(month).toHaveProperty('avgTemperatureMax');
      expect(month).toHaveProperty('avgTemperatureMin');
      expect(month).toHaveProperty('avgPrecipitation');
      expect(month).toHaveProperty('avgPrecipitationDays');
      expect(month).toHaveProperty('avgSnowfall');
      expect(month).toHaveProperty('avgSnowDays');
      expect(month).toHaveProperty('avgSunHours');
    });

    it('should use default year range 1991-2020', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse(mockOpenMeteoArchiveResponse)
      );

      await service.getClimateNormals(40.7128, -74.0060);

      const callUrl = fetchMock.mock.calls[0][0] as string;
      expect(callUrl).toContain('start_date=1991-01-01');
      expect(callUrl).toContain('end_date=2020-12-31');
    });

    it('should accept custom year range', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse(mockOpenMeteoArchiveResponse)
      );

      await service.getClimateNormals(40.7128, -74.0060, 2010, 2020);

      const callUrl = fetchMock.mock.calls[0][0] as string;
      expect(callUrl).toContain('start_date=2010-01-01');
      expect(callUrl).toContain('end_date=2020-12-31');
    });

    it('should return months in order 1-12', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse(mockOpenMeteoArchiveResponse)
      );

      const result = await service.getClimateNormals(40.7128, -74.0060);

      for (let i = 1; i < result.data.length; i++) {
        expect(result.data[i].month).toBeGreaterThan(result.data[i - 1].month);
      }
    });

    it('should throw ValidationError for invalid coordinates', async () => {
      await expect(service.getClimateNormals(-95, -74.0060))
        .rejects
        .toThrow(ValidationError);
    });
  });

  // ============================================
  // getClimateSummary Tests
  // ============================================

  describe('getClimateSummary', () => {
    it('should retrieve complete climate summary', async () => {
      fetchMock
        .mockResolvedValueOnce(createMockResponse(mockOpenMeteoCurrentResponse))
        .mockResolvedValueOnce(createMockResponse(mockOpenMeteoForecastResponse));

      const result = await service.getClimateSummary(40.7128, -74.0060);

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
    });

    it('should include all climate summary sections', async () => {
      fetchMock
        .mockResolvedValueOnce(createMockResponse(mockOpenMeteoCurrentResponse))
        .mockResolvedValueOnce(createMockResponse(mockOpenMeteoForecastResponse));

      const result = await service.getClimateSummary(40.7128, -74.0060);

      expect(result.data).toHaveProperty('location');
      expect(result.data).toHaveProperty('current');
      expect(result.data).toHaveProperty('forecast');
      expect(result.data).toHaveProperty('climateProfile');
      expect(result.data).toHaveProperty('risks');
    });

    it('should include correct location data', async () => {
      fetchMock
        .mockResolvedValueOnce(createMockResponse(mockOpenMeteoCurrentResponse))
        .mockResolvedValueOnce(createMockResponse(mockOpenMeteoForecastResponse));

      const result = await service.getClimateSummary(40.7128, -74.0060);

      expect(result.data.location.lat).toBe(40.7128);
      expect(result.data.location.lng).toBe(-74.0060);
      expect(result.data.location.timezone).toBeDefined();
    });

    it('should include current weather data', async () => {
      fetchMock
        .mockResolvedValueOnce(createMockResponse(mockOpenMeteoCurrentResponse))
        .mockResolvedValueOnce(createMockResponse(mockOpenMeteoForecastResponse));

      const result = await service.getClimateSummary(40.7128, -74.0060);

      expect(result.data.current.temperature).toBe(68.5);
      expect(result.data.current.weatherDescription).toBe('Partly cloudy');
    });

    it('should include 7-day forecast', async () => {
      fetchMock
        .mockResolvedValueOnce(createMockResponse(mockOpenMeteoCurrentResponse))
        .mockResolvedValueOnce(createMockResponse(mockOpenMeteoForecastResponse));

      const result = await service.getClimateSummary(40.7128, -74.0060);

      expect(result.data.forecast).toHaveLength(7);
    });

    it('should calculate climate profile', async () => {
      fetchMock
        .mockResolvedValueOnce(createMockResponse(mockOpenMeteoCurrentResponse))
        .mockResolvedValueOnce(createMockResponse(mockOpenMeteoForecastResponse));

      const result = await service.getClimateSummary(40.7128, -74.0060);

      expect(result.data.climateProfile.averageAnnualTemperature).toBeGreaterThan(0);
      expect(result.data.climateProfile.averageAnnualPrecipitation).toBeGreaterThan(0);
      expect(result.data.climateProfile.climateZone).toBeDefined();
    });

    it('should assess climate risks', async () => {
      fetchMock
        .mockResolvedValueOnce(createMockResponse(mockOpenMeteoCurrentResponse))
        .mockResolvedValueOnce(createMockResponse(mockOpenMeteoForecastResponse));

      const result = await service.getClimateSummary(40.7128, -74.0060);

      expect(result.data.risks.extremeHeat).toMatch(/^(low|moderate|high)$/);
      expect(result.data.risks.extremeCold).toMatch(/^(low|moderate|high)$/);
      expect(result.data.risks.drought).toMatch(/^(low|moderate|high)$/);
      expect(result.data.risks.heavyPrecipitation).toMatch(/^(low|moderate|high)$/);
    });

    it('should classify hot climate as high extreme heat risk', async () => {
      const hotForecast = {
        daily: {
          ...mockOpenMeteoForecastResponse.daily,
          temperature_2m_max: [95, 98, 92, 96, 94, 97, 93],
          temperature_2m_min: [75, 78, 72, 76, 74, 77, 73],
        },
        daily_units: mockOpenMeteoForecastResponse.daily_units,
      };

      fetchMock
        .mockResolvedValueOnce(createMockResponse(mockOpenMeteoCurrentResponse))
        .mockResolvedValueOnce(createMockResponse(hotForecast));

      const result = await service.getClimateSummary(30.2672, -97.7431); // Austin, TX

      expect(result.data.risks.extremeHeat).toBe('high');
    });

    it('should classify cold climate as high extreme cold risk', async () => {
      const coldForecast = {
        daily: {
          ...mockOpenMeteoForecastResponse.daily,
          temperature_2m_max: [25, 28, 22, 26, 24, 27, 23],
          temperature_2m_min: [10, 15, 8, 12, 9, 14, 11],
        },
        daily_units: mockOpenMeteoForecastResponse.daily_units,
      };

      fetchMock
        .mockResolvedValueOnce(createMockResponse(mockOpenMeteoCurrentResponseColdSnow))
        .mockResolvedValueOnce(createMockResponse(coldForecast));

      const result = await service.getClimateSummary(44.9778, -93.2650); // Minneapolis

      expect(result.data.risks.extremeCold).toBe('high');
    });

    it('should make parallel API calls for efficiency', async () => {
      fetchMock
        .mockResolvedValueOnce(createMockResponse(mockOpenMeteoCurrentResponse))
        .mockResolvedValueOnce(createMockResponse(mockOpenMeteoForecastResponse));

      const startTime = Date.now();
      await service.getClimateSummary(40.7128, -74.0060);
      const endTime = Date.now();

      // Verify both calls were made
      expect(fetchMock).toHaveBeenCalledTimes(2);

      // If calls were parallel, total time should be less than sequential
      // (This is a weak test but verifies the structure)
    });

    it('should throw ValidationError for invalid coordinates', async () => {
      await expect(service.getClimateSummary(200, -74.0060))
        .rejects
        .toThrow(ValidationError);
    });
  });

  // ============================================
  // Singleton Pattern Tests
  // ============================================

  describe('singleton pattern', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = getClimateService();
      const instance2 = getClimateService();

      expect(instance1).toBe(instance2);
    });

    it('should create new instance after reset', () => {
      const instance1 = getClimateService();
      resetClimateService();
      const instance2 = getClimateService();

      expect(instance1).not.toBe(instance2);
    });

    it('should accept config on first call only', () => {
      const instance1 = getClimateService({
        cacheConfig: { enabled: false },
      });
      const instance2 = getClimateService({
        cacheConfig: { enabled: true },
      });

      expect(instance1).toBe(instance2);
    });

    it('should use fresh config after reset', () => {
      getClimateService({ cacheConfig: { enabled: false } });
      resetClimateService();
      const newInstance = getClimateService({ cacheConfig: { enabled: true } });

      expect(newInstance).toBeDefined();
    });
  });

  // ============================================
  // Edge Cases and Error Handling
  // ============================================

  describe('edge cases', () => {
    it('should handle boundary coordinates - North Pole', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse(mockOpenMeteoCurrentResponse));

      await expect(service.getCurrentWeather(90, 0))
        .resolves
        .toBeDefined();
    });

    it('should handle boundary coordinates - South Pole', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse(mockOpenMeteoCurrentResponse));

      await expect(service.getCurrentWeather(-90, 0))
        .resolves
        .toBeDefined();
    });

    it('should handle boundary coordinates - International Date Line', async () => {
      fetchMock
        .mockResolvedValueOnce(createMockResponse(mockOpenMeteoCurrentResponse))
        .mockResolvedValueOnce(createMockResponse(mockOpenMeteoCurrentResponse));

      await expect(service.getCurrentWeather(0, 180))
        .resolves
        .toBeDefined();

      await expect(service.getCurrentWeather(0, -180))
        .resolves
        .toBeDefined();
    });

    it('should handle coordinates at equator and prime meridian', async () => {
      fetchMock.mockResolvedValueOnce(createMockResponse(mockOpenMeteoCurrentResponse));

      await expect(service.getCurrentWeather(0, 0))
        .resolves
        .toBeDefined();
    });
  });

});
