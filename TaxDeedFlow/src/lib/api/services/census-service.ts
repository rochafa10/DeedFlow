/**
 * Census API Service
 *
 * Provides access to US Census Bureau geographic and demographic data.
 * Used for property market analysis in the Tax Deed Flow system.
 *
 * API Documentation: https://www.census.gov/data/developers/data-sets.html
 */

import { BaseApiService } from '../base-service';
import {
  ApiConfig,
  CacheConfig,
  CircuitBreakerConfig,
  RateLimitConfig,
  GeographicResponse,
  DemographicsResponse,
  ApiResponse,
} from '../types';
import { ApiError, ValidationError } from '../errors';

/**
 * Census API response structure for geocoding
 */
interface CensusGeocoderResponse {
  result?: {
    input?: {
      location?: {
        x: number;
        y: number;
      };
    };
    geographies?: Record<string, Array<{
      GEOID?: string;
      STATE?: string;
      COUNTY?: string;
      TRACT?: string;
      BLKGRP?: string;
      BLOCK?: string;
      NAME?: string;
      BASENAME?: string;
      CENTLAT?: string;
      CENTLON?: string;
      [key: string]: unknown;
    }>>;
  };
  errors?: string[];
}

/**
 * Census API response structure for ACS data
 */
type CensusACSResponse = string[][];

/**
 * Census service configuration
 */
interface CensusServiceConfig {
  /** API key for Census API (optional for some endpoints) */
  apiKey?: string;

  /** Custom cache configuration */
  cacheConfig?: Partial<CacheConfig>;

  /** Custom circuit breaker configuration */
  circuitBreakerConfig?: Partial<CircuitBreakerConfig>;

  /** Custom rate limit configuration */
  rateLimitConfig?: Partial<RateLimitConfig>;
}

/**
 * Default Census service configuration
 */
const DEFAULT_CENSUS_CONFIG: Partial<ApiConfig> = {
  baseUrl: 'https://geocoding.geo.census.gov',
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,
  serviceName: 'census',
};

/**
 * Census data API base URL
 */
const CENSUS_DATA_API_URL = 'https://api.census.gov/data';

/**
 * Default cache configuration for Census service
 * Geographic data is stable, so we cache for 7 days
 * Demographic data changes annually with ACS updates
 */
const DEFAULT_CENSUS_CACHE_CONFIG: Partial<CacheConfig> = {
  enabled: true,
  ttl: 604800000, // 7 days
  maxSize: 1000,
};

/**
 * State FIPS codes mapping
 */
const STATE_FIPS_TO_NAME: Record<string, string> = {
  '01': 'Alabama', '02': 'Alaska', '04': 'Arizona', '05': 'Arkansas',
  '06': 'California', '08': 'Colorado', '09': 'Connecticut', '10': 'Delaware',
  '11': 'District of Columbia', '12': 'Florida', '13': 'Georgia', '15': 'Hawaii',
  '16': 'Idaho', '17': 'Illinois', '18': 'Indiana', '19': 'Iowa',
  '20': 'Kansas', '21': 'Kentucky', '22': 'Louisiana', '23': 'Maine',
  '24': 'Maryland', '25': 'Massachusetts', '26': 'Michigan', '27': 'Minnesota',
  '28': 'Mississippi', '29': 'Missouri', '30': 'Montana', '31': 'Nebraska',
  '32': 'Nevada', '33': 'New Hampshire', '34': 'New Jersey', '35': 'New Mexico',
  '36': 'New York', '37': 'North Carolina', '38': 'North Dakota', '39': 'Ohio',
  '40': 'Oklahoma', '41': 'Oregon', '42': 'Pennsylvania', '44': 'Rhode Island',
  '45': 'South Carolina', '46': 'South Dakota', '47': 'Tennessee', '48': 'Texas',
  '49': 'Utah', '50': 'Vermont', '51': 'Virginia', '53': 'Washington',
  '54': 'West Virginia', '55': 'Wisconsin', '56': 'Wyoming', '72': 'Puerto Rico',
};

/**
 * Census API Service
 *
 * Provides methods to query Census geographic and demographic data
 * for property market analysis.
 */
export class CensusService extends BaseApiService {
  /** API key for Census data API */
  private readonly censusApiKey?: string;

  /**
   * Creates a new Census service instance
   *
   * @param config - Optional service configuration
   */
  constructor(config?: CensusServiceConfig) {
    const apiConfig: Partial<ApiConfig> & { baseUrl: string } = {
      ...DEFAULT_CENSUS_CONFIG,
      baseUrl: DEFAULT_CENSUS_CONFIG.baseUrl!,
    };

    super(
      apiConfig,
      { ...DEFAULT_CENSUS_CACHE_CONFIG, ...config?.cacheConfig },
      config?.circuitBreakerConfig,
      config?.rateLimitConfig
    );

    this.censusApiKey = config?.apiKey;
    this.logger.info('CensusService initialized', { hasApiKey: Boolean(this.censusApiKey) });
  }

  /**
   * Gets geographic data (FIPS codes, census tracts) for a location
   *
   * @param lat - Latitude of the location
   * @param lng - Longitude of the location
   * @returns Promise resolving to geographic information
   *
   * @example
   * ```typescript
   * const census = new CensusService();
   * const geo = await census.getGeographicData(40.7128, -74.0060);
   * console.log(geo.data.fips); // '36061' (New York County)
   * ```
   */
  public async getGeographicData(lat: number, lng: number): Promise<ApiResponse<GeographicResponse>> {
    // Validate coordinates
    this.validateCoordinates(lat, lng);

    const endpoint = '/geocoder/geographies/coordinates';

    const response = await this.get<CensusGeocoderResponse>(endpoint, {
      params: {
        x: lng,
        y: lat,
        benchmark: 'Public_AR_Current',
        vintage: 'Current_Current',
        layers: 'all',
        format: 'json',
      },
    });

    // Check for errors in response
    if (response.data.errors && response.data.errors.length > 0) {
      throw new ApiError(
        `Census API error: ${response.data.errors.join(', ')}`,
        400,
        endpoint,
        response.requestId
      );
    }

    // Parse the geographic data
    const geoData = this.parseGeographicResponse(response.data, lat, lng);

    return {
      ...response,
      data: geoData,
    };
  }

  /**
   * Gets demographic data from American Community Survey (ACS) for a FIPS code
   *
   * @param fips - State+County FIPS code (5 digits, e.g., '36061' for New York County)
   * @returns Promise resolving to demographic information
   *
   * @example
   * ```typescript
   * const census = new CensusService({ apiKey: 'YOUR_API_KEY' });
   * const demo = await census.getDemographics('36061');
   * console.log(demo.data.medianHouseholdIncome); // 76607
   * ```
   */
  public async getDemographics(fips: string): Promise<ApiResponse<DemographicsResponse>> {
    // Validate FIPS code
    this.validateFips(fips);

    const stateFips = fips.substring(0, 2);
    const countyFips = fips.substring(2, 5);

    // ACS 5-year estimates endpoint
    // Try available years in order (most recent first)
    // ACS 5-year data is typically released 1 year after collection period
    const availableYears = [2023, 2022, 2021];

    // ACS variables to query
    // B01003_001E: Total Population
    // B19013_001E: Median Household Income
    // B25077_001E: Median Home Value
    // B25003_001E: Total Occupied Housing Units
    // B25003_002E: Owner Occupied Housing Units
    // B17001_002E: Population Below Poverty Level
    // B01002_001E: Median Age
    // B15003_022E: Bachelor's Degree
    // B15003_023E: Master's Degree
    // B15003_024E: Professional Degree
    // B15003_025E: Doctorate Degree
    // B23025_005E: Unemployed
    // B23025_003E: Civilian Labor Force
    // B25001_001E: Total Housing Units
    // B25002_003E: Vacant Housing Units

    const variables = [
      'NAME',
      'B01003_001E', // Total Population
      'B19013_001E', // Median Household Income
      'B25077_001E', // Median Home Value
      'B25003_001E', // Total Occupied Housing Units
      'B25003_002E', // Owner Occupied Housing Units
      'B17001_002E', // Population Below Poverty Level
      'B01002_001E', // Median Age
      'B15003_022E', // Bachelor's Degree
      'B15003_023E', // Master's Degree
      'B15003_024E', // Professional Degree
      'B15003_025E', // Doctorate Degree
      'B23025_005E', // Unemployed
      'B23025_003E', // Civilian Labor Force
      'B25001_001E', // Total Housing Units
      'B25002_003E', // Vacant Housing Units
    ].join(',');

    // Build query params
    const params: Record<string, string> = {
      get: variables,
      for: `county:${countyFips}`,
      in: `state:${stateFips}`,
    };

    if (this.censusApiKey) {
      params.key = this.censusApiKey;
    }

    // Try each available year until one succeeds
    let lastError: Error | null = null;
    for (const year of availableYears) {
      const endpoint = `${CENSUS_DATA_API_URL}/${year}/acs/acs5`;
      try {
        const response = await this.fetchACSData(endpoint, params);

        // Parse the demographic data
        const demoData = this.parseDemographicsResponse(response, fips, year);

        return {
          data: demoData,
          status: 200,
          headers: {},
          cached: false,
          requestId: `demo_${Date.now()}`,
          responseTime: 0,
        };
      } catch (error) {
        this.logger.debug(`ACS data not available for year ${year}, trying next year`, {
          year,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        lastError = error instanceof Error ? error : new Error('Unknown error');
        // Continue to next year
      }
    }

    // All years failed
    throw new ApiError(
      `Census ACS API error: No data available for years ${availableYears.join(', ')}. Last error: ${lastError?.message || 'Unknown'}`,
      404,
      '/acs/acs5',
      `demo_${Date.now()}`,
      lastError || undefined
    );
  }

  /**
   * Fetches ACS data from the Census data API
   *
   * **Note:** This method uses direct fetch instead of the base service's `get()`
   * method because the ACS API has a different base URL (api.census.gov) than the
   * geocoding API (geocoding.geo.census.gov). The base service is configured for
   * the geocoding endpoint, so we use a direct fetch here with manual error handling.
   *
   * A future enhancement could support multiple base URLs or create a separate
   * service instance for the ACS API.
   */
  private async fetchACSData(
    endpoint: string,
    params: Record<string, string>
  ): Promise<CensusACSResponse> {
    const requestId = `acs_${Date.now()}`;
    const url = new URL(endpoint);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    this.logger.debug('Fetching ACS data', { requestId, endpoint, params: Object.keys(params) });

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new ApiError(
          `Census ACS API error: ${response.status} ${response.statusText}`,
          response.status,
          endpoint,
          requestId
        );
      }

      const data = await response.json();
      this.logger.debug('ACS data fetched successfully', { requestId });
      return data as CensusACSResponse;
    } catch (error) {
      // Re-throw ApiErrors
      if (error instanceof ApiError) {
        throw error;
      }

      // Wrap other errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('ACS fetch failed', { requestId, error: errorMessage });
      throw new ApiError(
        `Census ACS API error: ${errorMessage}`,
        500,
        endpoint,
        requestId,
        error instanceof Error ? error : undefined
      );
    }
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

  /**
   * Validates FIPS code format
   */
  private validateFips(fips: string): void {
    if (typeof fips !== 'string' || !/^\d{5}$/.test(fips)) {
      throw new ValidationError(
        'Invalid FIPS code. Must be a 5-digit string (state + county).',
        'fips',
        'validation',
        'fips',
        { format: 'Must be exactly 5 digits' },
        fips
      );
    }

    const stateFips = fips.substring(0, 2);
    if (!STATE_FIPS_TO_NAME[stateFips]) {
      throw new ValidationError(
        `Invalid state FIPS code: ${stateFips}`,
        'fips',
        'validation',
        'stateFips',
        { valid: 'Must be a valid US state FIPS code' },
        stateFips
      );
    }
  }

  /**
   * Parses Census geocoder response into GeographicResponse
   */
  private parseGeographicResponse(
    response: CensusGeocoderResponse,
    lat: number,
    lng: number
  ): GeographicResponse {
    const geographies = response.result?.geographies;

    if (!geographies) {
      throw new ApiError(
        'No geographic data found for location',
        404,
        '/geocoder/geographies/coordinates',
        `geo_${Date.now()}`
      );
    }

    // Extract data from various geography layers
    const states = geographies['States'] || geographies['2020 Census State'] || [];
    const counties = geographies['Counties'] || geographies['2020 Census Counties'] || [];
    const tracts = geographies['Census Tracts'] || geographies['2020 Census Tracts'] || [];
    const blockGroups = geographies['Census Block Groups'] || geographies['2020 Census Block Groups'] || [];
    const blocks = geographies['Census Blocks'] || geographies['2020 Census Blocks'] || [];
    const congressional = geographies['Congressional Districts'] || [];
    const schoolDistricts = geographies['Unified School Districts'] || [];

    const state = states[0];
    const county = counties[0];
    const tract = tracts[0];
    const blockGroup = blockGroups[0];
    const block = blocks[0];

    if (!state || !county) {
      throw new ApiError(
        'Location is outside US Census coverage',
        404,
        '/geocoder/geographies/coordinates',
        `geo_${Date.now()}`
      );
    }

    const stateFips = state.STATE || '';
    const countyFips = county.COUNTY || '';
    const tractCode = tract?.TRACT || '';
    const blockGroupCode = blockGroup?.BLKGRP || '';
    const blockCode = block?.BLOCK || '';

    return {
      stateFips,
      countyFips,
      fips: `${stateFips}${countyFips}`,
      tract: tractCode,
      blockGroup: blockGroupCode,
      block: blockCode,
      stateName: STATE_FIPS_TO_NAME[stateFips] || state.NAME || '',
      countyName: county.NAME || county.BASENAME || '',
      congressionalDistrict: congressional[0]?.GEOID,
      schoolDistrict: schoolDistricts[0]?.NAME,
      raw: response as unknown as Record<string, unknown>,
    };
  }

  /**
   * Parses ACS response into DemographicsResponse
   */
  private parseDemographicsResponse(
    response: CensusACSResponse,
    fips: string,
    year: number
  ): DemographicsResponse {
    if (!response || response.length < 2) {
      throw new ApiError(
        'Invalid ACS response format',
        500,
        '/acs/acs5',
        `demo_${Date.now()}`
      );
    }

    // First row is headers, second row is data
    const headers = response[0];
    const data = response[1];

    // Create a map of header to index
    const headerIndex: Record<string, number> = {};
    headers.forEach((header, index) => {
      headerIndex[header] = index;
    });

    // Helper to safely get numeric value
    const getNumeric = (variable: string, defaultValue: number = 0): number => {
      const index = headerIndex[variable];
      if (index === undefined) return defaultValue;
      const value = parseFloat(data[index]);
      return isNaN(value) || value < 0 ? defaultValue : value;
    };

    // Calculate derived values
    const population = getNumeric('B01003_001E');
    const totalOccupied = getNumeric('B25003_001E');
    const ownerOccupied = getNumeric('B25003_002E');
    const ownerOccupiedPct = totalOccupied > 0 ? (ownerOccupied / totalOccupied) * 100 : 0;

    const povertyPop = getNumeric('B17001_002E');
    const povertyPct = population > 0 ? (povertyPop / population) * 100 : 0;

    // Calculate bachelor's degree or higher
    const bachelors = getNumeric('B15003_022E');
    const masters = getNumeric('B15003_023E');
    const professional = getNumeric('B15003_024E');
    const doctorate = getNumeric('B15003_025E');
    const higherEd = bachelors + masters + professional + doctorate;
    // Note: This is a rough estimate; proper calculation requires total pop 25+
    const bachelorsDegreeOrHigherPct = population > 0 ? (higherEd / (population * 0.75)) * 100 : 0; // Approximate adult pop

    const unemployed = getNumeric('B23025_005E');
    const laborForce = getNumeric('B23025_003E');
    const unemploymentRate = laborForce > 0 ? (unemployed / laborForce) * 100 : 0;

    const totalHousingUnits = getNumeric('B25001_001E');
    const vacantUnits = getNumeric('B25002_003E');
    const vacancyRate = totalHousingUnits > 0 ? (vacantUnits / totalHousingUnits) * 100 : 0;

    return {
      population: Math.round(population),
      medianHouseholdIncome: Math.round(getNumeric('B19013_001E')),
      medianHomeValue: Math.round(getNumeric('B25077_001E')),
      ownerOccupiedPct: Math.round(ownerOccupiedPct * 10) / 10,
      povertyPct: Math.round(povertyPct * 10) / 10,
      medianAge: Math.round(getNumeric('B01002_001E') * 10) / 10,
      bachelorsDegreeOrHigherPct: Math.min(100, Math.round(bachelorsDegreeOrHigherPct * 10) / 10),
      unemploymentRate: Math.round(unemploymentRate * 10) / 10,
      totalHousingUnits: Math.round(totalHousingUnits),
      vacancyRate: Math.round(vacancyRate * 10) / 10,
      dataYear: year,
      raw: { headers, data },
    };
  }
}

/**
 * Creates a singleton Census service instance
 */
let censusServiceInstance: CensusService | null = null;

export function getCensusService(config?: CensusServiceConfig): CensusService {
  if (!censusServiceInstance) {
    censusServiceInstance = new CensusService(config);
  }
  return censusServiceInstance;
}

/**
 * Resets the singleton instance (useful for testing)
 */
export function resetCensusService(): void {
  censusServiceInstance = null;
}

export default CensusService;
