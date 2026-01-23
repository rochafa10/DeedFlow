/**
 * Zillow API Service
 *
 * Provides access to Zillow property data, Zestimates, and images via RapidAPI.
 * Used for property valuation validation and enrichment in the Tax Deed Flow system.
 *
 * API Documentation: https://rapidapi.com/apimaker/api/zillow-com1
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
 * Zillow property data
 */
export interface ZillowProperty {
  zpid: string;
  address: {
    streetAddress: string;
    city: string;
    state: string;
    zipcode: string;
    neighborhood?: string;
    county?: string;
    latitude?: number;
    longitude?: number;
  };
  zestimate?: number;
  zestimateHighPercent?: number;
  zestimateLowPercent?: number;
  rentZestimate?: number;
  price?: number;
  dateSold?: string;
  lastSoldPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  livingArea?: number;
  lotSize?: number;
  yearBuilt?: number;
  propertyType?: string;
  homeStatus?: string;
  homeType?: string;
  description?: string;
  taxAssessedValue?: number;
  taxAssessedYear?: number;
  photos?: string[];
  priceHistory?: Array<{
    date: string;
    price: number;
    event: string;
    source?: string;
  }>;
  taxHistory?: Array<{
    year: number;
    taxPaid: number;
    value: number;
  }>;
  schools?: Array<{
    name: string;
    rating: number;
    distance: number;
    type: string;
    grades: string;
  }>;
  raw?: Record<string, unknown>;
}

/**
 * Zillow search result
 */
export interface ZillowSearchResult {
  zpid: string;
  address: string;
  city: string;
  state: string;
  zipcode: string;
  price?: number;
  zestimate?: number;
  bedrooms?: number;
  bathrooms?: number;
  livingArea?: number;
  homeType?: string;
  homeStatus?: string;
  latitude?: number;
  longitude?: number;
  imgSrc?: string;
}

/**
 * Zillow images response
 */
export interface ZillowImages {
  zpid: string;
  images: string[];
  streetViewUrl?: string;
  staticMapUrl?: string;
}

/**
 * Property search options
 */
export interface ZillowSearchOptions {
  location: string; // Address, city, zip, or neighborhood
  status_type?: 'ForSale' | 'RecentlySold' | 'ForRent';
  home_type?: string;
  minPrice?: number;
  maxPrice?: number;
  beds_min?: number;
  beds_max?: number;
  baths_min?: number;
  baths_max?: number;
  sqft_min?: number;
  sqft_max?: number;
  sort?: 'newest' | 'price_high' | 'price_low' | 'most_bedrooms';
  page?: number;
}

/**
 * Zillow API raw response
 */
interface ZillowAPIResponse<T> {
  results?: T[];
  props?: T[];
  data?: T;
  error?: {
    message: string;
    code?: number;
  };
  totalResultCount?: number;
  resultsPerPage?: number;
  currentPage?: number;
}

/**
 * Zillow Service Configuration
 */
export interface ZillowServiceConfig {
  rapidApiKey?: string;
  apiHost?: string;
  cacheConfig?: Partial<CacheConfig>;
  circuitBreakerConfig?: Partial<CircuitBreakerConfig>;
  rateLimitConfig?: Partial<RateLimitConfig>;
}

/**
 * Default configuration
 * Using US Housing Market Data API (us-housing-market-data1.p.rapidapi.com)
 */
const DEFAULT_ZILLOW_CONFIG: Partial<ApiConfig> = {
  baseUrl: 'https://us-housing-market-data1.p.rapidapi.com',
  timeout: 30000,
  retries: 2,
  retryDelay: 2000,
  serviceName: 'zillow',
};

/**
 * Default cache config - 24 hours
 */
const DEFAULT_ZILLOW_CACHE_CONFIG: Partial<CacheConfig> = {
  enabled: true,
  ttl: 86400000, // 24 hours
  maxSize: 200,
};

/**
 * Default rate limit - RapidAPI limits
 */
const DEFAULT_ZILLOW_RATE_LIMIT: Partial<RateLimitConfig> = {
  requestsPerSecond: 1,
  burstSize: 5,
  queueExcess: true,
};

/**
 * Zillow API Service
 *
 * Provides methods to get Zillow property data, Zestimates, and images.
 */
export class ZillowService extends BaseApiService {
  private rapidApiKey: string;
  private apiHost: string;

  constructor(config?: ZillowServiceConfig) {
    const rapidApiKey = config?.rapidApiKey || process.env.RAPIDAPI_KEY || '';
    const apiHost = config?.apiHost || process.env.ZILLOW_API_HOST || 'us-housing-market-data1.p.rapidapi.com';

    if (!rapidApiKey) {
      logger.warn('No RAPIDAPI_KEY found. API calls will fail.', {
        context: 'ZillowService'
      });
    }

    const apiConfig: Partial<ApiConfig> & { baseUrl: string } = {
      ...DEFAULT_ZILLOW_CONFIG,
      baseUrl: `https://${apiHost}`,
      headers: {
        'X-RapidAPI-Key': rapidApiKey,
        'X-RapidAPI-Host': apiHost,
      },
    };

    super(
      apiConfig,
      { ...DEFAULT_ZILLOW_CACHE_CONFIG, ...config?.cacheConfig },
      config?.circuitBreakerConfig,
      { ...DEFAULT_ZILLOW_RATE_LIMIT, ...config?.rateLimitConfig }
    );

    this.rapidApiKey = rapidApiKey;
    this.apiHost = apiHost;
    this.logger.info('ZillowService initialized');
  }

  /**
   * Get property details by address
   *
   * @param address - Full property address
   * @returns Promise resolving to Zillow property data
   *
   * @example
   * ```typescript
   * const zillow = getZillowService();
   * const property = await zillow.getPropertyByAddress('123 Main St, Altoona, PA 16602');
   * console.log(property.data.zestimate); // 150000
   * ```
   */
  public async getPropertyByAddress(address: string): Promise<ApiResponse<ZillowProperty>> {
    if (!address || address.trim().length === 0) {
      throw new ValidationError(
        'Address is required',
        'address',
        'validation',
        'address',
        { required: 'true' },
        address
      );
    }

    const endpoint = '/property';

    const response = await this.get<ZillowAPIResponse<Record<string, unknown>>>(endpoint, {
      params: {
        address: address.trim(),
      },
    });

    if (response.data.error) {
      throw new ApiError(
        response.data.error.message || 'Property not found',
        response.data.error.code || 404,
        endpoint,
        response.requestId
      );
    }

    return {
      ...response,
      data: this.parseProperty(response.data as unknown as Record<string, unknown>),
    };
  }

  /**
   * Get property details by ZPID (Zillow Property ID)
   *
   * @param zpid - Zillow Property ID
   * @returns Promise resolving to Zillow property data
   */
  public async getPropertyByZpid(zpid: string): Promise<ApiResponse<ZillowProperty>> {
    if (!zpid) {
      throw new ValidationError(
        'ZPID is required',
        'zpid',
        'validation',
        'zpid',
        { required: 'true' },
        zpid
      );
    }

    const endpoint = '/property';

    const response = await this.get<ZillowAPIResponse<Record<string, unknown>>>(endpoint, {
      params: {
        zpid: zpid,
      },
    });

    if (response.data.error) {
      throw new ApiError(
        response.data.error.message || 'Property not found',
        response.data.error.code || 404,
        endpoint,
        response.requestId
      );
    }

    return {
      ...response,
      data: this.parseProperty(response.data as unknown as Record<string, unknown>),
    };
  }

  /**
   * Search for properties by location
   *
   * @param options - Search options
   * @returns Promise resolving to search results
   */
  public async searchProperties(
    options: ZillowSearchOptions
  ): Promise<ApiResponse<ZillowSearchResult[]>> {
    if (!options.location) {
      throw new ValidationError(
        'Location is required',
        'location',
        'validation',
        'location',
        { required: 'true' },
        options.location
      );
    }

    const endpoint = '/propertyExtendedSearch';

    const response = await this.get<ZillowAPIResponse<ZillowSearchResult[]>>(endpoint, {
      params: {
        location: options.location,
        status_type: options.status_type || 'ForSale',
        home_type: options.home_type,
        minPrice: options.minPrice,
        maxPrice: options.maxPrice,
        beds_min: options.beds_min,
        beds_max: options.beds_max,
        baths_min: options.baths_min,
        baths_max: options.baths_max,
        sqft_min: options.sqft_min,
        sqft_max: options.sqft_max,
        sort: options.sort || 'newest',
        page: options.page || 1,
      },
    });

    const results = response.data.props || response.data.results || [];

    return {
      ...response,
      data: results.map((item) => this.parseSearchResult(item as unknown as Record<string, unknown>)),
    };
  }

  /**
   * Get recently sold properties in a location
   *
   * @param location - Address, city, zip, or neighborhood
   * @param limit - Maximum results (default 20)
   * @returns Promise resolving to sold properties
   */
  public async getRecentlySold(
    location: string,
    limit: number = 20
  ): Promise<ApiResponse<ZillowSearchResult[]>> {
    return this.searchProperties({
      location,
      status_type: 'RecentlySold',
      sort: 'newest',
      page: 1,
    });
  }

  /**
   * Get property images
   *
   * @param zpid - Zillow Property ID
   * @returns Promise resolving to property images
   */
  public async getPropertyImages(zpid: string): Promise<ApiResponse<ZillowImages>> {
    if (!zpid) {
      throw new ValidationError(
        'ZPID is required',
        'zpid',
        'validation',
        'zpid',
        { required: 'true' },
        zpid
      );
    }

    const endpoint = '/images';

    const response = await this.get<{ images?: string[] }>(endpoint, {
      params: {
        zpid: zpid,
      },
    });

    return {
      ...response,
      data: {
        zpid,
        images: response.data.images || [],
      },
    };
  }

  /**
   * Get Zestimate value for a property
   *
   * @param address - Property address
   * @returns Promise resolving to Zestimate data
   */
  public async getZestimate(
    address: string
  ): Promise<ApiResponse<{ zestimate: number; lowPercent: number; highPercent: number; rentZestimate?: number }>> {
    const property = await this.getPropertyByAddress(address);

    if (!property.data.zestimate) {
      throw new ApiError(
        'No Zestimate available for this property',
        404,
        'zestimate',
        property.requestId
      );
    }

    return {
      ...property,
      data: {
        zestimate: property.data.zestimate,
        lowPercent: property.data.zestimateLowPercent || 0,
        highPercent: property.data.zestimateHighPercent || 0,
        rentZestimate: property.data.rentZestimate,
      },
    };
  }

  /**
   * Parse raw property data
   */
  private parseProperty(data: Record<string, unknown>): ZillowProperty {
    const address = (data.address || {}) as Record<string, unknown>;
    const resoFacts = (data.resoFacts || {}) as Record<string, unknown>;

    return {
      zpid: String(data.zpid || ''),
      address: {
        streetAddress: String(address.streetAddress || data.streetAddress || ''),
        city: String(address.city || data.city || ''),
        state: String(address.state || data.state || ''),
        zipcode: String(address.zipcode || data.zipcode || ''),
        neighborhood: address.neighborhood as string | undefined,
        county: address.county as string | undefined,
        latitude: data.latitude as number | undefined,
        longitude: data.longitude as number | undefined,
      },
      zestimate: data.zestimate as number | undefined,
      zestimateHighPercent: data.zestimateHighPercent as number | undefined,
      zestimateLowPercent: data.zestimateLowPercent as number | undefined,
      rentZestimate: data.rentZestimate as number | undefined,
      price: data.price as number | undefined,
      dateSold: data.dateSold as string | undefined,
      lastSoldPrice: data.lastSoldPrice as number | undefined,
      bedrooms: (data.bedrooms ?? resoFacts.bedrooms) as number | undefined,
      bathrooms: (data.bathrooms ?? resoFacts.bathrooms) as number | undefined,
      livingArea: (data.livingArea ?? data.livingAreaValue ?? resoFacts.livingArea) as number | undefined,
      lotSize: (data.lotSize ?? data.lotAreaValue ?? resoFacts.lotSize) as number | undefined,
      yearBuilt: (data.yearBuilt ?? resoFacts.yearBuilt) as number | undefined,
      propertyType: data.propertyType as string | undefined ?? data.homeType as string | undefined,
      homeStatus: data.homeStatus as string | undefined,
      homeType: data.homeType as string | undefined,
      description: data.description as string | undefined,
      taxAssessedValue: data.taxAssessedValue as number | undefined,
      taxAssessedYear: data.taxAssessedYear as number | undefined,
      photos: this.parsePhotos(data.photos || data.responsivePhotos),
      priceHistory: this.parsePriceHistory(data.priceHistory),
      taxHistory: this.parseTaxHistory(data.taxHistory),
      schools: this.parseSchools(data.schools),
      raw: data,
    };
  }

  /**
   * Parse search result
   */
  private parseSearchResult(item: Record<string, unknown>): ZillowSearchResult {
    return {
      zpid: String(item.zpid || ''),
      address: String(item.address || item.streetAddress || ''),
      city: String(item.city || ''),
      state: String(item.state || ''),
      zipcode: String(item.zipcode || ''),
      price: item.price as number | undefined,
      zestimate: item.zestimate as number | undefined,
      bedrooms: item.bedrooms as number | undefined,
      bathrooms: item.bathrooms as number | undefined,
      livingArea: item.livingArea as number | undefined,
      homeType: item.homeType as string | undefined,
      homeStatus: item.homeStatus as string | undefined,
      latitude: item.latitude as number | undefined,
      longitude: item.longitude as number | undefined,
      imgSrc: (item.imgSrc as string | undefined) ?? ((item.miniCardPhotos as string[] | undefined)?.[0]),
    };
  }

  /**
   * Parse photos from various formats
   */
  private parsePhotos(photos: unknown): string[] {
    if (!photos) return [];

    if (Array.isArray(photos)) {
      return photos.map((p) => {
        if (typeof p === 'string') return p;
        if (p && typeof p === 'object') {
          const photo = p as Record<string, unknown>;
          const mixedSources = photo.mixedSources as Record<string, Array<{ url?: string }>> | undefined;
          return String(photo.url || mixedSources?.jpeg?.[0]?.url || photo.href || '');
        }
        return '';
      }).filter(Boolean);
    }

    return [];
  }

  /**
   * Parse price history
   */
  private parsePriceHistory(history: unknown): ZillowProperty['priceHistory'] {
    if (!Array.isArray(history)) return undefined;

    return history.map((item: Record<string, unknown>) => ({
      date: String(item.date || item.time || ''),
      price: Number(item.price || 0),
      event: String(item.event || item.priceChangeRate || ''),
      source: item.source as string | undefined,
    }));
  }

  /**
   * Parse tax history
   */
  private parseTaxHistory(history: unknown): ZillowProperty['taxHistory'] {
    if (!Array.isArray(history)) return undefined;

    return history.map((item: Record<string, unknown>) => ({
      year: Number(item.time || item.year || 0),
      taxPaid: Number(item.taxPaid || 0),
      value: Number(item.value || item.taxAssessment || 0),
    }));
  }

  /**
   * Parse schools
   */
  private parseSchools(schools: unknown): ZillowProperty['schools'] {
    if (!Array.isArray(schools)) return undefined;

    return schools.map((school: Record<string, unknown>) => ({
      name: String(school.name || ''),
      rating: Number(school.rating || 0),
      distance: Number(school.distance || 0),
      type: String(school.type || school.level || ''),
      grades: String(school.grades || school.gradesRange || ''),
    }));
  }

  /**
   * Calculate price trends from price history
   *
   * @param priceHistory - Array of price history events
   * @returns Price trend analysis
   */
  public calculatePriceTrends(priceHistory: ZillowProperty['priceHistory']): PriceTrendAnalysis {
    if (!priceHistory || priceHistory.length === 0) {
      return {
        lastSalePrice: null,
        lastSaleDate: null,
        previousSalePrice: null,
        previousSaleDate: null,
        priceAppreciation: null,
        annualAppreciation: null,
        yearsHeld: null,
        listingHistory: [],
      };
    }

    // Filter to only sale events (not listings or rentals)
    const sales = priceHistory.filter(
      (e) => e.event.toLowerCase().includes('sold') && e.price > 0
    );

    const listings = priceHistory.filter(
      (e) => e.event.toLowerCase().includes('listed') && e.price > 0
    );

    const lastSale = sales.length > 0 ? sales[0] : null;
    const previousSale = sales.length > 1 ? sales[1] : null;

    let priceAppreciation: number | null = null;
    let annualAppreciation: number | null = null;
    let yearsHeld: number | null = null;

    if (lastSale && previousSale && lastSale.price > 0 && previousSale.price > 0) {
      priceAppreciation = (lastSale.price - previousSale.price) / previousSale.price;

      const lastDate = new Date(lastSale.date);
      const prevDate = new Date(previousSale.date);
      yearsHeld = (lastDate.getTime() - prevDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);

      if (yearsHeld > 0) {
        // CAGR formula: (ending/beginning)^(1/years) - 1
        annualAppreciation = Math.pow(lastSale.price / previousSale.price, 1 / yearsHeld) - 1;
      }
    }

    return {
      lastSalePrice: lastSale?.price || null,
      lastSaleDate: lastSale?.date || null,
      previousSalePrice: previousSale?.price || null,
      previousSaleDate: previousSale?.date || null,
      priceAppreciation,
      annualAppreciation,
      yearsHeld,
      listingHistory: listings.slice(0, 5).map((l) => ({
        date: l.date,
        price: l.price,
        source: l.source || 'Unknown',
      })),
    };
  }

  /**
   * Calculate tax trends from tax history
   *
   * @param taxHistory - Array of tax history entries
   * @returns Tax trend analysis
   */
  public calculateTaxTrends(taxHistory: ZillowProperty['taxHistory']): TaxTrendAnalysis {
    if (!taxHistory || taxHistory.length === 0) {
      return {
        currentTax: null,
        currentAssessedValue: null,
        avgAnnualTaxIncrease: null,
        avgAnnualValueIncrease: null,
        taxHistory: [],
      };
    }

    // Sort by year descending (most recent first)
    const sorted = [...taxHistory].sort((a, b) => b.year - a.year);

    const currentTax = sorted[0].taxPaid;
    const currentAssessedValue = sorted[0].value;

    // Calculate year-over-year changes
    const changes: { taxChange: number; valueChange: number }[] = [];
    for (let i = 0; i < sorted.length - 1; i++) {
      const current = sorted[i];
      const previous = sorted[i + 1];

      if (previous.taxPaid > 0 && current.taxPaid > 0) {
        changes.push({
          taxChange: (current.taxPaid - previous.taxPaid) / previous.taxPaid,
          valueChange: previous.value > 0 ? (current.value - previous.value) / previous.value : 0,
        });
      }
    }

    const avgAnnualTaxIncrease = changes.length > 0
      ? changes.reduce((sum, c) => sum + c.taxChange, 0) / changes.length
      : null;

    const avgAnnualValueIncrease = changes.length > 0
      ? changes.reduce((sum, c) => sum + c.valueChange, 0) / changes.length
      : null;

    return {
      currentTax,
      currentAssessedValue,
      avgAnnualTaxIncrease,
      avgAnnualValueIncrease,
      taxHistory: sorted.slice(0, 5).map((t) => ({
        year: t.year,
        taxPaid: t.taxPaid,
        assessedValue: t.value,
      })),
    };
  }
}

/**
 * Price trend analysis result
 */
export interface PriceTrendAnalysis {
  lastSalePrice: number | null;
  lastSaleDate: string | null;
  previousSalePrice: number | null;
  previousSaleDate: string | null;
  priceAppreciation: number | null; // Total appreciation as decimal (0.15 = 15%)
  annualAppreciation: number | null; // CAGR as decimal
  yearsHeld: number | null;
  listingHistory: Array<{ date: string; price: number; source: string }>;
}

/**
 * Tax trend analysis result
 */
export interface TaxTrendAnalysis {
  currentTax: number | null;
  currentAssessedValue: number | null;
  avgAnnualTaxIncrease: number | null; // As decimal
  avgAnnualValueIncrease: number | null; // As decimal
  taxHistory: Array<{ year: number; taxPaid: number; assessedValue: number }>;
}

/**
 * Singleton instance
 */
let zillowServiceInstance: ZillowService | null = null;

export function getZillowService(config?: ZillowServiceConfig): ZillowService {
  if (!zillowServiceInstance) {
    zillowServiceInstance = new ZillowService(config);
  }
  return zillowServiceInstance;
}

export function resetZillowService(): void {
  zillowServiceInstance = null;
}

export default ZillowService;
