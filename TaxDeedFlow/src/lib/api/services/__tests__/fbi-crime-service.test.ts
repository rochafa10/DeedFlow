/**
 * FBI Crime Data API Service Tests
 *
 * Tests the FBI Crime API service functionality including:
 * - State crime data retrieval
 * - Crime summary with analysis
 * - Offense-specific data retrieval
 * - State abbreviation validation
 * - Crime trend calculation
 * - Risk level assessment
 * - National comparison analysis
 * - Error handling and validation
 * - Singleton pattern
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-22
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  FBICrimeService,
  getFBICrimeService,
  resetFBICrimeService,
  type CrimeData,
  type CrimeSummary,
  type OffenseType,
} from '../fbi-crime-service';
import { ApiError, ValidationError } from '../../errors';

// ============================================
// Mock Data - FBI API Response
// ============================================

const mockFBIEstimatesResponse = {
  results: [
    {
      year: 2022,
      state_abbr: 'PA',
      state_name: 'Pennsylvania',
      population: 12964056,
      violent_crime: 44432,
      homicide: 1009,
      rape_revised: 3827,
      rape_legacy: null,
      robbery: 8204,
      aggravated_assault: 31392,
      property_crime: 162847,
      burglary: 25789,
      larceny: 119632,
      motor_vehicle_theft: 17426,
      arson: 1234,
    },
    {
      year: 2021,
      state_abbr: 'PA',
      state_name: 'Pennsylvania',
      population: 12950000,
      violent_crime: 45000,
      homicide: 1050,
      rape_revised: 3900,
      rape_legacy: null,
      robbery: 8500,
      aggravated_assault: 31550,
      property_crime: 170000,
      burglary: 27000,
      larceny: 125000,
      motor_vehicle_theft: 18000,
      arson: 1300,
    },
    {
      year: 2020,
      state_abbr: 'PA',
      state_name: 'Pennsylvania',
      population: 12900000,
      violent_crime: 46000,
      homicide: 1100,
      rape_revised: 4000,
      rape_legacy: null,
      robbery: 8800,
      aggravated_assault: 32100,
      property_crime: 175000,
      burglary: 28000,
      larceny: 128000,
      motor_vehicle_theft: 19000,
      arson: 1400,
    },
    {
      year: 2019,
      state_abbr: 'PA',
      state_name: 'Pennsylvania',
      population: 12850000,
      violent_crime: 47000,
      homicide: 1150,
      rape_revised: 4100,
      rape_legacy: null,
      robbery: 9000,
      aggravated_assault: 32750,
      property_crime: 180000,
      burglary: 29000,
      larceny: 130000,
      motor_vehicle_theft: 21000,
      arson: 1500,
    },
    {
      year: 2018,
      state_abbr: 'PA',
      state_name: 'Pennsylvania',
      population: 12800000,
      violent_crime: 48000,
      homicide: 1200,
      rape_revised: 4200,
      rape_legacy: null,
      robbery: 9200,
      aggravated_assault: 33400,
      property_crime: 185000,
      burglary: 30000,
      larceny: 132000,
      motor_vehicle_theft: 23000,
      arson: 1600,
    },
  ],
};

const mockFBIEstimatesResponseMinimal = {
  results: [
    {
      year: 2022,
      state_abbr: 'DE',
      state_name: 'Delaware',
      population: 1000000,
      violent_crime: 5000,
      property_crime: 25000,
    },
  ],
};

const mockFBIEstimatesResponseEmpty = {
  results: [],
};

const mockOffenseDataResponse = {
  results: [
    { year: 2022, count: 8204, rate: 63.3 },
    { year: 2021, count: 8500, rate: 65.6 },
    { year: 2020, count: 8800, rate: 68.2 },
  ],
};

// ============================================
// Mock Response Helper
// ============================================

/**
 * Creates a properly structured mock fetch response with headers
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

describe('FBICrimeService', () => {
  let service: FBICrimeService;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Reset singleton between tests
    resetFBICrimeService();

    // Create fresh service instance with caching disabled for tests
    service = new FBICrimeService({
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
      const newService = new FBICrimeService();
      expect(newService).toBeDefined();
      expect(newService).toBeInstanceOf(FBICrimeService);
    });

    it('should create service with custom cache config', () => {
      const newService = new FBICrimeService({
        cacheConfig: { enabled: false, ttl: 1000 },
      });
      expect(newService).toBeDefined();
    });

    it('should create service with custom circuit breaker config', () => {
      const newService = new FBICrimeService({
        circuitBreakerConfig: { failureThreshold: 10 },
      });
      expect(newService).toBeDefined();
    });

    it('should create service with custom rate limit config', () => {
      const newService = new FBICrimeService({
        rateLimitConfig: { requestsPerSecond: 5, burstSize: 10 },
      });
      expect(newService).toBeDefined();
    });
  });

  // ============================================
  // getStateCrimeData Tests
  // ============================================

  describe('getStateCrimeData', () => {
    it('should retrieve crime data for valid state', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse(mockFBIEstimatesResponse)
      );

      const result = await service.getStateCrimeData('PA', 5);

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.data).toHaveLength(5);
      expect(result.data[0].year).toBe(2022); // Most recent first
      expect(result.data[0].state).toBe('Pennsylvania');
      expect(result.data[0].stateAbbr).toBe('PA');
      expect(result.data[0].population).toBe(12964056);
      expect(result.data[0].offenses.violentCrime).toBe(44432);
      expect(result.data[0].offenses.propertyCrime).toBe(162847);
    });

    it('should calculate crime rates correctly', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse(mockFBIEstimatesResponse)
      );

      const result = await service.getStateCrimeData('PA', 5);
      const data = result.data[0];

      expect(data.rates).toBeDefined();
      expect(data.rates!.violentCrimeRate).toBeCloseTo(342.7, 0);
      expect(data.rates!.propertyCrimeRate).toBeCloseTo(1256.2, 0);
    });

    it('should throw ValidationError for invalid state abbreviation', async () => {
      await expect(service.getStateCrimeData('XX', 5))
        .rejects
        .toThrow(ValidationError);

      await expect(service.getStateCrimeData('XX', 5))
        .rejects
        .toThrow('Invalid state abbreviation');
    });

    it('should accept DC as valid state', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse(mockFBIEstimatesResponseMinimal)
      );

      await expect(service.getStateCrimeData('DC', 1))
        .resolves
        .toBeDefined();
    });
  });

  // ============================================
  // getCrimeSummary Tests
  // ============================================

  describe('getCrimeSummary', () => {
    it('should generate crime summary with analysis', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse(mockFBIEstimatesResponse)
      );

      const result = await service.getCrimeSummary('PA');

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.data.state).toBe('Pennsylvania');
      expect(result.data.stateAbbr).toBe('PA');
      expect(result.data.latestYear).toBe(2022);
      expect(result.data.violentCrimeRate).toBeGreaterThan(0);
      expect(result.data.propertyCrimeRate).toBeGreaterThan(0);
    });

    it('should calculate crime trend correctly - decreasing', async () => {
      // Create data with >10% decrease to meet threshold
      const decreasingData = {
        results: [
          { year: 2022, state_abbr: 'TX', state_name: 'Texas', population: 1000000, violent_crime: 40000 },
          { year: 2021, state_abbr: 'TX', state_name: 'Texas', population: 1000000, violent_crime: 42000 },
          { year: 2020, state_abbr: 'TX', state_name: 'Texas', population: 1000000, violent_crime: 45000 },
          { year: 2019, state_abbr: 'TX', state_name: 'Texas', population: 1000000, violent_crime: 48000 },
          { year: 2018, state_abbr: 'TX', state_name: 'Texas', population: 1000000, violent_crime: 50000 },
        ],
      };

      fetchMock.mockResolvedValueOnce(
        createMockResponse(decreasingData)
      );

      const result = await service.getCrimeSummary('TX');

      // 40000 vs 50000 is 20% decrease, should be 'decreasing'
      expect(result.data.trend).toBe('decreasing');
    });

    it('should calculate risk level correctly - moderate', async () => {
      // Create data with moderate crime rates (between 0.8x and 1.3x national avg)
      const moderateRiskData = {
        results: [
          {
            year: 2022,
            state_abbr: 'IL',
            state_name: 'Illinois',
            population: 1000000,
            violent_crime: 4000, // 400 per 100k (national is 380, so ~1.05x)
            property_crime: 19000, // 1900 per 100k (national is 1954, so ~0.97x)
          },
        ],
      };

      fetchMock.mockResolvedValueOnce(
        createMockResponse(moderateRiskData)
      );

      const result = await service.getCrimeSummary('IL');

      expect(result.data.riskLevel).toBe('moderate');
    });

    it('should throw ValidationError when no crime data available', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse(mockFBIEstimatesResponseEmpty)
      );

      await expect(service.getCrimeSummary('PA'))
        .rejects
        .toThrow('No crime data available');
    });
  });

  // ============================================
  // getOffenseData Tests
  // ============================================

  describe('getOffenseData', () => {
    it('should retrieve offense-specific data', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse(mockOffenseDataResponse)
      );

      const result = await service.getOffenseData('PA', 'robbery', 3);

      expect(result).toBeDefined();
      expect(result.data).toBeDefined();
      expect(result.data).toHaveLength(3);
      expect(result.data[0].year).toBe(2022);
      expect(result.data[0].count).toBe(8204);
      expect(result.data[0].rate).toBe(63.3);
    });

    it('should handle empty results array', async () => {
      fetchMock.mockResolvedValueOnce(
        createMockResponse({ results: [] })
      );

      const result = await service.getOffenseData('PA', 'robbery', 3);

      expect(result.data).toEqual([]);
    });
  });

  // ============================================
  // Singleton Pattern Tests
  // ============================================

  describe('singleton pattern', () => {
    it('should return same instance on multiple calls', () => {
      const instance1 = getFBICrimeService();
      const instance2 = getFBICrimeService();

      expect(instance1).toBe(instance2);
    });

    it('should create new instance after reset', () => {
      const instance1 = getFBICrimeService();
      resetFBICrimeService();
      const instance2 = getFBICrimeService();

      expect(instance1).not.toBe(instance2);
    });

    it('should accept config on first call only', () => {
      const instance1 = getFBICrimeService({ cacheConfig: { enabled: false } });
      const instance2 = getFBICrimeService({ cacheConfig: { enabled: true } });

      expect(instance1).toBe(instance2);
    });

    it('should use fresh config after reset', () => {
      getFBICrimeService({ cacheConfig: { enabled: false } });
      resetFBICrimeService();
      const newInstance = getFBICrimeService({ cacheConfig: { enabled: true } });

      expect(newInstance).toBeDefined();
    });
  });

  // ============================================
  // Error Handling Tests
  // ============================================

  describe('error handling', () => {
    it('should handle API errors gracefully', async () => {
      // Create service with no retries to avoid timeout
      const testService = new FBICrimeService({
        cacheConfig: { enabled: false },
      });

      // Override default config to disable retries
      (testService as any).config.retries = 0;

      fetchMock.mockResolvedValueOnce(
        createMockResponse({ error: 'Internal Server Error' }, 500)
      );

      await expect(testService.getStateCrimeData('PA', 5))
        .rejects
        .toThrow();
    });

    it('should handle network errors', async () => {
      // Create service with no retries to avoid timeout
      const testService = new FBICrimeService({
        cacheConfig: { enabled: false },
      });

      // Override default config to disable retries
      (testService as any).config.retries = 0;

      fetchMock.mockRejectedValueOnce(new TypeError('fetch failed: ECONNREFUSED'));

      await expect(testService.getStateCrimeData('PA', 5))
        .rejects
        .toThrow();
    });
  });
});
