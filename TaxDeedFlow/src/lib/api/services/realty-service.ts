/**
 * Realty in US API Service
 *
 * Provides access to property data and sold comparables via RapidAPI.
 * Critical for determining ARV (After Repair Value) and comparable sales analysis.
 *
 * API Documentation: https://rapidapi.com/apidojo/api/realty-in-us
 */

import { logger } from '@/lib/logger';
import { BaseApiService } from '../base-service';
import {
  ApiConfig,
  CacheConfig,
  CircuitBreakerConfig,
  RateLimitConfig,
  ApiResponse,
} from '../types';
import { ApiError, ValidationError } from '../errors';

/**
 * Comparable property from Realty in US API
 */
export interface RealtyComparable {
  property_id: string;
  listing_id?: string;
  address: {
    line: string;
    city: string;
    state_code: string;
    postal_code: string;
    county?: string;
    lat?: number;
    lon?: number;
  };
  price: {
    sold_price?: number;
    list_price?: number;
    price_per_sqft?: number;
  };
  description: {
    beds?: number;
    baths?: number;
    sqft?: number;
    lot_sqft?: number;
    year_built?: number;
    type?: string;
    sub_type?: string;
    stories?: number;
    garage?: number;
  };
  sold_date?: string;
  list_date?: string;
  days_on_market?: number;
  distance_miles?: number;
  photos?: string[];
  source?: string;
}

/**
 * Property search filters
 */
export interface PropertySearchFilters {
  city?: string;
  state_code: string;
  postal_code?: string;
  limit?: number;
  offset?: number;
  beds_min?: number;
  beds_max?: number;
  baths_min?: number;
  baths_max?: number;
  sqft_min?: number;
  sqft_max?: number;
  price_min?: number;
  price_max?: number;
  prop_type?: 'single_family' | 'condo' | 'townhome' | 'multi_family' | 'land';
  sort?: 'sold_date' | 'price_high' | 'price_low' | 'sqft_high' | 'distance';
}

/**
 * Comparable search options
 */
export interface ComparableSearchOptions {
  lat?: number;
  lng?: number;
  postal_code?: string;
  city?: string;
  state_code?: string;
  radius_miles?: number;
  sold_within_days?: number;
  limit?: number;
  beds_min?: number;
  beds_max?: number;
  sqft_min?: number;
  sqft_max?: number;
  prop_type?: string;
}

/**
 * Property detail from API
 */
export interface RealtyPropertyDetail {
  property_id: string;
  address: {
    line: string;
    city: string;
    state_code: string;
    postal_code: string;
    county?: string;
    lat?: number;
    lon?: number;
    neighborhood_name?: string;
  };
  description: {
    beds?: number;
    baths?: number;
    sqft?: number;
    lot_sqft?: number;
    year_built?: number;
    type?: string;
    sub_type?: string;
    stories?: number;
    garage?: number;
    pool?: boolean;
    construction?: string;
    heating?: string;
    cooling?: string;
  };
  price_history?: Array<{
    date: string;
    price: number;
    event: string;
    source?: string;
  }>;
  tax_history?: Array<{
    year: number;
    assessment?: {
      land?: number;
      building?: number;
      total?: number;
    };
    tax?: number;
  }>;
  mls_history?: Array<{
    date: string;
    listing_id: string;
    price: number;
    status: string;
  }>;
  photos?: string[];
  estimated_value?: number;
  raw?: Record<string, unknown>;
}

/**
 * Comparables analysis result
 */
export interface ComparablesAnalysis {
  subject_location: {
    lat: number;
    lng: number;
  };
  comparables: RealtyComparable[];
  statistics: {
    count: number;
    avg_sold_price: number;
    median_sold_price: number;
    min_sold_price: number;
    max_sold_price: number;
    avg_price_per_sqft: number;
    avg_days_on_market: number;
  };
  search_criteria: ComparableSearchOptions;
  retrieved_at: string;
}

/**
 * RapidAPI response wrapper - matches actual API response
 */
interface RapidAPIResponse<T> {
  data?: {
    home_search?: {
      __typename?: string;
      count?: number;
      total?: number;
      results?: T[];
    };
  };
  results?: T[];
  status?: number;
  message?: string;
  meta?: {
    build?: string;
    version?: string;
  };
}

/**
 * Raw property from API
 */
interface RawProperty {
  __typename?: string;
  property_id?: string;
  listing_id?: string;
  status?: string;
  photo_count?: number;
  location?: {
    address?: {
      city?: string;
      line?: string;
      street_name?: string;
      street_number?: string;
      postal_code?: string;
      state_code?: string;
      state?: string;
      coordinate?: {
        lat?: number;
        lon?: number;
      };
      county?: {
        fips_code?: string;
      };
    };
    street_view_url?: string;
  };
  description?: {
    type?: string;
    sub_type?: string;
    beds?: number;
    baths?: number;
    baths_full?: number;
    baths_half?: number;
    lot_sqft?: number;
    sqft?: number;
    year_built?: number;
    stories?: number;
    garage?: number;
  };
  list_price?: number;
  list_price_min?: number;
  list_price_max?: number;
  estimate?: {
    estimate?: number;
  };
  last_sold_date?: string;
  last_sold_price?: number;
  list_date?: string;
  primary_photo?: {
    href?: string;
  };
  photos?: Array<{ href?: string }>;
  href?: string;
  flags?: {
    is_price_reduced?: boolean;
    is_new_listing?: boolean;
    is_foreclosure?: boolean;
  };
}

/**
 * Realty in US API Service Configuration
 */
export interface RealtyServiceConfig {
  rapidApiKey?: string;
  apiHost?: string;
  cacheConfig?: Partial<CacheConfig>;
  circuitBreakerConfig?: Partial<CircuitBreakerConfig>;
  rateLimitConfig?: Partial<RateLimitConfig>;
}

/**
 * Default configuration
 */
const DEFAULT_REALTY_CONFIG: Partial<ApiConfig> = {
  baseUrl: 'https://realty-in-us.p.rapidapi.com',
  timeout: 30000,
  retries: 2,
  retryDelay: 2000,
  serviceName: 'realty-in-us',
};

/**
 * Default cache config - 24 hours for sold data (stable)
 */
const DEFAULT_REALTY_CACHE_CONFIG: Partial<CacheConfig> = {
  enabled: true,
  ttl: 86400000, // 24 hours
  maxSize: 200,
};

/**
 * Default rate limit - RapidAPI free tier is limited
 */
const DEFAULT_REALTY_RATE_LIMIT: Partial<RateLimitConfig> = {
  requestsPerSecond: 1,
  burstSize: 5,
  queueExcess: true,
};

/**
 * Realty in US API Service
 *
 * Provides methods to search sold properties and get comparable sales data.
 */
export class RealtyService extends BaseApiService {
  private rapidApiKey: string;
  private apiHost: string;

  constructor(config?: RealtyServiceConfig) {
    const rapidApiKey = config?.rapidApiKey || process.env.RAPIDAPI_KEY || '';
    const apiHost = config?.apiHost || process.env.REALTY_API_HOST || 'realty-in-us.p.rapidapi.com';

    if (!rapidApiKey) {
      logger.warn('No RAPIDAPI_KEY found. API calls will fail.', {
        context: 'RealtyService'
      });
    }

    const apiConfig: Partial<ApiConfig> & { baseUrl: string } = {
      ...DEFAULT_REALTY_CONFIG,
      baseUrl: `https://${apiHost}`,
      headers: {
        'X-RapidAPI-Key': rapidApiKey,
        'X-RapidAPI-Host': apiHost,
      },
    };

    super(
      apiConfig,
      { ...DEFAULT_REALTY_CACHE_CONFIG, ...config?.cacheConfig },
      config?.circuitBreakerConfig,
      { ...DEFAULT_REALTY_RATE_LIMIT, ...config?.rateLimitConfig }
    );

    this.rapidApiKey = rapidApiKey;
    this.apiHost = apiHost;
    this.logger.info('RealtyService initialized');
  }

  /**
   * Search for sold properties (comparables) near a location
   *
   * @param options - Search options including location and filters
   * @returns Promise resolving to comparables analysis
   *
   * @example
   * ```typescript
   * const realty = getRealtyService();
   * const comps = await realty.getSoldComparables({
   *   postal_code: '16602',
   *   limit: 10
   * });
   * // OR with coordinates
   * const comps = await realty.getSoldComparables({
   *   lat: 40.4460,
   *   lng: -78.3947,
   *   radius_miles: 1,
   *   limit: 10
   * });
   * ```
   */
  public async getSoldComparables(
    options: ComparableSearchOptions
  ): Promise<ApiResponse<ComparablesAnalysis>> {
    // Validate we have either postal_code, city+state, or coordinates
    if (!options.postal_code && !options.city && (!options.lat || !options.lng)) {
      throw new ValidationError(
        'Either postal_code, city+state_code, or lat/lng coordinates are required',
        'location',
        'validation',
        'location',
        { required: 'postal_code or city+state_code or lat+lng' },
        null
      );
    }

    if (options.lat !== undefined && options.lng !== undefined) {
      this.validateCoordinates(options.lat, options.lng);
    }

    const endpoint = '/properties/v3/list';
    const limit = Math.min(options.limit || 10, 200);

    // Build request body - postal_code works best with this API
    const requestBody: Record<string, unknown> = {
      limit: limit,
      offset: 0,
      status: ['sold'], // Filter for sold properties
      sort: {
        direction: 'desc',
        field: 'sold_date',
      },
    };

    // Add location filter - postal_code is most reliable
    if (options.postal_code) {
      requestBody.postal_code = options.postal_code;
    } else if (options.city && options.state_code) {
      requestBody.city = options.city;
      requestBody.state_code = options.state_code;
    } else if (options.lat !== undefined && options.lng !== undefined) {
      // For coordinate search, use search_location format
      requestBody.search_location = {
        location: {
          lat: options.lat,
          lng: options.lng,
        },
      };
    }

    // Optional filters
    if (options.beds_min) requestBody.beds_min = options.beds_min;
    if (options.beds_max) requestBody.beds_max = options.beds_max;
    if (options.sqft_min) requestBody.sqft_min = options.sqft_min;
    if (options.sqft_max) requestBody.sqft_max = options.sqft_max;
    if (options.prop_type) requestBody.type = [options.prop_type];

    // Date filter - calculate sold_date range if sold_within_days is specified
    if (options.sold_within_days) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - options.sold_within_days);
      requestBody.sold_date = {
        min: cutoffDate.toISOString().split('T')[0],
      };
    }

    const response = await this.post<RapidAPIResponse<RawProperty>>(endpoint, requestBody);

    const comparables = this.parseComparables(response.data);
    const statistics = this.calculateStatistics(comparables);

    const analysis: ComparablesAnalysis = {
      subject_location: {
        lat: options.lat || 0,
        lng: options.lng || 0,
      },
      comparables,
      statistics,
      search_criteria: options,
      retrieved_at: new Date().toISOString(),
    };

    return {
      ...response,
      data: analysis,
    };
  }

  /**
   * Get detailed property information by property ID
   *
   * @param propertyId - The property ID from Realty in US
   * @returns Promise resolving to property details
   */
  public async getPropertyDetail(propertyId: string): Promise<ApiResponse<RealtyPropertyDetail>> {
    if (!propertyId) {
      throw new ValidationError(
        'Property ID is required',
        'property_id',
        'validation',
        'propertyId',
        { required: 'true' },
        propertyId
      );
    }

    const endpoint = '/properties/v3/detail';

    const response = await this.get<RapidAPIResponse<RealtyPropertyDetail>>(endpoint, {
      params: {
        property_id: propertyId,
      },
    });

    if (!response.data.data) {
      throw new ApiError(
        'Property not found',
        404,
        endpoint,
        response.requestId
      );
    }

    return {
      ...response,
      data: this.parsePropertyDetail(response.data),
    };
  }

  /**
   * Search for properties by address or location
   *
   * @param filters - Search filters
   * @returns Promise resolving to property list
   */
  public async searchProperties(
    filters: PropertySearchFilters
  ): Promise<ApiResponse<RealtyComparable[]>> {
    if (!filters.state_code && !filters.postal_code) {
      throw new ValidationError(
        'State code or postal code is required',
        'filters',
        'validation',
        'state_code',
        { required: 'true' },
        filters.state_code
      );
    }

    const endpoint = '/properties/v3/list';

    // Build POST body for RapidAPI
    const requestBody: Record<string, unknown> = {
      limit: filters.limit || 20,
      offset: filters.offset || 0,
      status: ['for_sale', 'ready_to_build'],
      sort: {
        direction: filters.sort === 'price_high' ? 'desc' : 'asc',
        field: filters.sort === 'sqft_high' ? 'sqft' : 'list_date',
      },
    };

    // Add location filter
    if (filters.postal_code) {
      requestBody.postal_code = filters.postal_code;
    } else if (filters.city && filters.state_code) {
      requestBody.city = filters.city;
      requestBody.state_code = filters.state_code;
    }

    // Add property filters
    if (filters.beds_min) requestBody.beds_min = filters.beds_min;
    if (filters.beds_max) requestBody.beds_max = filters.beds_max;
    if (filters.baths_min) requestBody.baths_min = filters.baths_min;
    if (filters.baths_max) requestBody.baths_max = filters.baths_max;
    if (filters.sqft_min) requestBody.sqft_min = filters.sqft_min;
    if (filters.sqft_max) requestBody.sqft_max = filters.sqft_max;
    if (filters.price_min) requestBody.list_price_min = filters.price_min;
    if (filters.price_max) requestBody.list_price_max = filters.price_max;
    if (filters.prop_type) requestBody.type = [filters.prop_type];

    const response = await this.post<RapidAPIResponse<RawProperty>>(endpoint, requestBody);

    return {
      ...response,
      data: this.parseComparables(response.data),
    };
  }

  /**
   * Get property value estimate (AVM)
   *
   * @param address - Property address
   * @param city - City
   * @param stateCode - State code (e.g., 'PA')
   * @returns Promise resolving to estimated value
   */
  public async getPropertyValue(
    address: string,
    city: string,
    stateCode: string
  ): Promise<ApiResponse<{ estimated_value: number; confidence: string }>> {
    const endpoint = '/properties/v2/list';

    const response = await this.get<RapidAPIResponse<RealtyPropertyDetail>>(endpoint, {
      params: {
        city: city,
        state_code: stateCode,
        street_address: address,
        limit: 1,
      },
    });

    const properties = response.data.results || [];
    if (properties.length === 0) {
      throw new ApiError('Property not found', 404, endpoint, response.requestId);
    }

    const property = properties[0] as RealtyPropertyDetail;

    return {
      ...response,
      data: {
        estimated_value: property.estimated_value || 0,
        confidence: property.estimated_value ? 'medium' : 'low',
      },
    };
  }

  /**
   * Get count of active listings in an area
   *
   * Used for calculating absorption rate and market inventory metrics.
   *
   * @param options - Location options (postal_code, city+state, or coordinates)
   * @returns Promise resolving to active listing count
   *
   * @example
   * ```typescript
   * const realty = getRealtyService();
   * const count = await realty.getActiveListingsCount({ postal_code: '16602' });
   * console.log(`Active listings: ${count.data}`);
   * ```
   */
  public async getActiveListingsCount(
    options: Pick<ComparableSearchOptions, 'postal_code' | 'city' | 'state_code' | 'lat' | 'lng'>
  ): Promise<ApiResponse<number>> {
    // Validate we have location
    if (!options.postal_code && !options.city && (!options.lat || !options.lng)) {
      throw new ValidationError(
        'Either postal_code, city+state_code, or lat/lng coordinates are required',
        'location',
        'validation',
        'location',
        { required: 'postal_code or city+state_code or lat+lng' },
        null
      );
    }

    const endpoint = '/properties/v3/list';

    // Build request body - just need count, so limit=1
    const requestBody: Record<string, unknown> = {
      limit: 1,
      offset: 0,
      status: ['for_sale', 'ready_to_build'],
    };

    // Add location filter
    if (options.postal_code) {
      requestBody.postal_code = options.postal_code;
    } else if (options.city && options.state_code) {
      requestBody.city = options.city;
      requestBody.state_code = options.state_code;
    } else if (options.lat !== undefined && options.lng !== undefined) {
      requestBody.search_location = {
        location: {
          lat: options.lat,
          lng: options.lng,
        },
      };
    }

    const response = await this.post<RapidAPIResponse<RawProperty>>(endpoint, requestBody);

    // Extract total count from response
    const totalCount = response.data?.data?.home_search?.total ||
                       response.data?.data?.home_search?.count ||
                       0;

    return {
      ...response,
      data: totalCount,
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

  /**
   * Parse comparables from API response
   */
  private parseComparables(response: RapidAPIResponse<RawProperty>): RealtyComparable[] {
    // Handle the actual API response structure: data.home_search.results
    let rawData: RawProperty[] = [];

    if (response.data?.home_search?.results) {
      rawData = response.data.home_search.results;
    } else if (response.results) {
      rawData = response.results as RawProperty[];
    } else if (Array.isArray(response.data)) {
      rawData = response.data as unknown as RawProperty[];
    }

    if (!Array.isArray(rawData)) {
      return [];
    }

    return rawData.map((item) => this.parseComparable(item));
  }

  /**
   * Parse single comparable from raw API data
   */
  private parseComparable(item: RawProperty): RealtyComparable {
    const location = item.location || {};
    const address = location.address || {};
    const description = item.description || {};
    const coordinate = address.coordinate || {};

    // Calculate price per sqft
    const sqft = description.sqft;
    const soldPrice = item.last_sold_price;
    const listPrice = item.list_price;
    const pricePerSqft = sqft && sqft > 0
      ? Math.round((soldPrice || listPrice || 0) / sqft)
      : undefined;

    // Extract photos
    const photos: string[] = [];
    if (item.primary_photo?.href) {
      photos.push(item.primary_photo.href);
    }
    if (item.photos) {
      item.photos.forEach(p => {
        if (p.href && !photos.includes(p.href)) {
          photos.push(p.href);
        }
      });
    }

    return {
      property_id: String(item.property_id || ''),
      listing_id: item.listing_id,
      address: {
        line: address.line || '',
        city: address.city || '',
        state_code: address.state_code || '',
        postal_code: address.postal_code || '',
        county: address.county?.fips_code,
        lat: coordinate.lat,
        lon: coordinate.lon,
      },
      price: {
        sold_price: item.last_sold_price,
        list_price: item.list_price,
        price_per_sqft: pricePerSqft,
      },
      description: {
        beds: description.beds,
        baths: description.baths,
        sqft: description.sqft,
        lot_sqft: description.lot_sqft,
        year_built: description.year_built,
        type: description.type,
        sub_type: description.sub_type,
        stories: description.stories,
        garage: description.garage,
      },
      sold_date: item.last_sold_date,
      list_date: item.list_date,
      days_on_market: undefined, // Calculate if needed
      distance_miles: undefined, // Calculate if needed
      photos,
      source: 'realty-in-us',
    };
  }

  /**
   * Parse property detail from API response
   */
  private parsePropertyDetail(response: RapidAPIResponse<RealtyPropertyDetail>): RealtyPropertyDetail {
    const data = (response.data as unknown as Record<string, unknown>) || {};
    const location = (data.location || {}) as Record<string, unknown>;
    const address = (location.address || data.address || {}) as Record<string, unknown>;
    const description = (data.description || {}) as Record<string, unknown>;

    return {
      property_id: String(data.property_id || ''),
      address: {
        line: String(address.line || ''),
        city: String(address.city || ''),
        state_code: String(address.state_code || ''),
        postal_code: String(address.postal_code || ''),
        county: address.county as string | undefined,
        lat: address.lat as number | undefined,
        lon: address.lon as number | undefined,
        neighborhood_name: address.neighborhood_name as string | undefined,
      },
      description: {
        beds: description.beds as number | undefined,
        baths: description.baths as number | undefined,
        sqft: description.sqft as number | undefined,
        lot_sqft: description.lot_sqft as number | undefined,
        year_built: description.year_built as number | undefined,
        type: description.type as string | undefined,
        sub_type: description.sub_type as string | undefined,
        stories: description.stories as number | undefined,
        garage: description.garage as number | undefined,
        pool: description.pool as boolean | undefined,
        construction: description.construction as string | undefined,
        heating: description.heating as string | undefined,
        cooling: description.cooling as string | undefined,
      },
      price_history: (data.price_history || []) as RealtyPropertyDetail['price_history'],
      tax_history: (data.tax_history || []) as RealtyPropertyDetail['tax_history'],
      mls_history: (data.mls_history || []) as RealtyPropertyDetail['mls_history'],
      photos: (data.photos || []) as string[],
      estimated_value: data.estimated_value as number | undefined,
      raw: data,
    };
  }

  /**
   * Calculate statistics from comparables
   */
  private calculateStatistics(comparables: RealtyComparable[]): ComparablesAnalysis['statistics'] {
    if (comparables.length === 0) {
      return {
        count: 0,
        avg_sold_price: 0,
        median_sold_price: 0,
        min_sold_price: 0,
        max_sold_price: 0,
        avg_price_per_sqft: 0,
        avg_days_on_market: 0,
      };
    }

    const soldPrices = comparables
      .map((c) => c.price.sold_price)
      .filter((p): p is number => typeof p === 'number' && p > 0);

    const pricesPerSqft = comparables
      .map((c) => c.price.price_per_sqft)
      .filter((p): p is number => typeof p === 'number' && p > 0);

    const daysOnMarket = comparables
      .map((c) => c.days_on_market)
      .filter((d): d is number => typeof d === 'number' && d >= 0);

    const sortedPrices = [...soldPrices].sort((a, b) => a - b);
    const median =
      sortedPrices.length > 0
        ? sortedPrices.length % 2 === 0
          ? (sortedPrices[sortedPrices.length / 2 - 1] + sortedPrices[sortedPrices.length / 2]) / 2
          : sortedPrices[Math.floor(sortedPrices.length / 2)]
        : 0;

    return {
      count: comparables.length,
      avg_sold_price:
        soldPrices.length > 0
          ? Math.round(soldPrices.reduce((a, b) => a + b, 0) / soldPrices.length)
          : 0,
      median_sold_price: Math.round(median),
      min_sold_price: soldPrices.length > 0 ? Math.min(...soldPrices) : 0,
      max_sold_price: soldPrices.length > 0 ? Math.max(...soldPrices) : 0,
      avg_price_per_sqft:
        pricesPerSqft.length > 0
          ? Math.round(pricesPerSqft.reduce((a, b) => a + b, 0) / pricesPerSqft.length)
          : 0,
      avg_days_on_market:
        daysOnMarket.length > 0
          ? Math.round(daysOnMarket.reduce((a, b) => a + b, 0) / daysOnMarket.length)
          : 0,
    };
  }
}

/**
 * Singleton instance
 */
let realtyServiceInstance: RealtyService | null = null;

export function getRealtyService(config?: RealtyServiceConfig): RealtyService {
  if (!realtyServiceInstance) {
    realtyServiceInstance = new RealtyService(config);
  }
  return realtyServiceInstance;
}

export function resetRealtyService(): void {
  realtyServiceInstance = null;
}

export default RealtyService;
