/**
 * Report Orchestrator Service
 *
 * Central coordinator that fetches data from all API services
 * and compiles comprehensive property analysis reports.
 *
 * This orchestrator handles:
 * - Parallel API calls for efficiency
 * - Graceful degradation when APIs fail
 * - Data aggregation and normalization
 * - Report generation with AI enhancement
 */

import { logger } from '@/lib/logger';
import { getZillowService, ZillowProperty } from './zillow-service';
import { getRealtyService, ComparablesAnalysis } from './realty-service';
import { getMapboxService, GeocodingResult } from './mapbox-service';
import { getGeoapifyService, AmenitiesSummary } from './geoapify-service';
import { getFBICrimeService, CrimeSummary } from './fbi-crime-service';
import { getBLSService, EmploymentSummary } from './bls-service';
import { getFCCService, BroadbandAvailability } from './fcc-service';
import { getNOAAService, ClimateRiskAssessment } from './noaa-service';
import { getElevationService, ElevationAnalysis } from './elevation-service';
import { getClimateService, ClimateSummary } from './climate-service';
import { getOpenAIService, PropertyAnalysis } from './openai-service';

// Create context logger
const reportLogger = logger.withContext('Report Orchestrator');

/**
 * Enriched property data from all sources
 */
export interface EnrichedPropertyData {
  // Core property info
  property: {
    address: string;
    parcelId?: string;
    coordinates?: {
      lat: number;
      lng: number;
    };
  };

  // Zillow data
  zillow?: {
    zestimate?: number;
    rentZestimate?: number;
    bedrooms?: number;
    bathrooms?: number;
    livingArea?: number;
    lotSize?: number;
    yearBuilt?: number;
    propertyType?: string;
    taxAssessedValue?: number;
    priceHistory?: ZillowProperty['priceHistory'];
    schools?: ZillowProperty['schools'];
  };

  // Comparables
  comparables?: {
    count: number;
    avgSalePrice: number;
    medianSalePrice: number;
    pricePerSqft: number;
    recentSales: Array<{
      address: string;
      salePrice: number;
      saleDate: string;
      distance: number;
    }>;
  };

  // Location data
  location?: {
    geocoding?: GeocodingResult;
    amenities?: AmenitiesSummary;
    walkScore?: number;
  };

  // Economic data
  economic?: {
    crime?: CrimeSummary;
    employment?: EmploymentSummary;
    broadband?: BroadbandAvailability;
  };

  // Environmental/Climate data
  environmental?: {
    elevation?: ElevationAnalysis;
    climate?: ClimateSummary;
    climateRisk?: ClimateRiskAssessment;
  };

  // AI-generated analysis
  aiAnalysis?: PropertyAnalysis;

  // Metadata
  metadata: {
    fetchedAt: string;
    sourcesUsed: string[];
    sourcesFailed: string[];
    dataQuality: 'complete' | 'partial' | 'minimal';
  };
}

/**
 * Report generation options
 */
export interface ReportOptions {
  includeZillow?: boolean;
  includeComparables?: boolean;
  includeAmenities?: boolean;
  includeCrime?: boolean;
  includeEmployment?: boolean;
  includeBroadband?: boolean;
  includeClimate?: boolean;
  includeElevation?: boolean;
  includeAIAnalysis?: boolean;
  radiusMiles?: number;
}

/**
 * Default options
 */
const DEFAULT_OPTIONS: ReportOptions = {
  includeZillow: true,
  includeComparables: true,
  includeAmenities: true,
  includeCrime: true,
  includeEmployment: true,
  includeBroadband: true,
  includeClimate: true,
  includeElevation: true,
  includeAIAnalysis: true,
  radiusMiles: 1,
};

/**
 * Report Orchestrator
 *
 * Coordinates all API calls and generates comprehensive property reports.
 */
export class ReportOrchestrator {
  private options: ReportOptions;

  constructor(options?: Partial<ReportOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Generate a complete property report
   *
   * @param address - Property address
   * @param parcelId - Optional parcel ID
   * @param stateAbbr - State abbreviation (for crime/employment data)
   * @returns Promise resolving to enriched property data
   */
  public async generateReport(
    address: string,
    parcelId?: string,
    stateAbbr?: string
  ): Promise<EnrichedPropertyData> {
    const startTime = Date.now();
    const sourcesUsed: string[] = [];
    const sourcesFailed: string[] = [];

    // Initialize result
    const result: EnrichedPropertyData = {
      property: {
        address,
        parcelId,
      },
      metadata: {
        fetchedAt: new Date().toISOString(),
        sourcesUsed: [],
        sourcesFailed: [],
        dataQuality: 'minimal',
      },
    };

    // Step 1: Geocode the address to get coordinates
    let coordinates: { lat: number; lng: number } | undefined;

    try {
      const mapbox = getMapboxService();
      const geocodeResult = await mapbox.geocode(address);
      if (geocodeResult.data.length > 0) {
        const [lng, lat] = geocodeResult.data[0].center;
        coordinates = { lat, lng };
        result.property.coordinates = coordinates;
        result.location = {
          geocoding: geocodeResult.data[0] as unknown as GeocodingResult,
        };
        sourcesUsed.push('mapbox-geocoding');
      }
    } catch (error) {
      reportLogger.warn('Mapbox geocoding failed', {
        address,
        error: error instanceof Error ? error.message : String(error)
      });
      sourcesFailed.push('mapbox-geocoding');
    }

    // Extract state from address if not provided
    const state = stateAbbr || this.extractStateFromAddress(address);

    // Step 2: Fetch data from all sources in parallel
    const promises: Promise<void>[] = [];

    // Zillow data
    if (this.options.includeZillow) {
      promises.push(
        this.fetchZillowData(address, result, sourcesUsed, sourcesFailed)
      );
    }

    // Comparables (needs coordinates)
    if (this.options.includeComparables && coordinates) {
      promises.push(
        this.fetchComparables(coordinates, result, sourcesUsed, sourcesFailed)
      );
    }

    // Amenities (needs coordinates)
    if (this.options.includeAmenities && coordinates) {
      promises.push(
        this.fetchAmenities(coordinates, result, sourcesUsed, sourcesFailed)
      );
    }

    // Crime data (needs state)
    if (this.options.includeCrime && state) {
      promises.push(
        this.fetchCrimeData(state, result, sourcesUsed, sourcesFailed)
      );
    }

    // Employment data (needs state)
    if (this.options.includeEmployment && state) {
      promises.push(
        this.fetchEmploymentData(state, result, sourcesUsed, sourcesFailed)
      );
    }

    // Broadband (needs coordinates)
    if (this.options.includeBroadband && coordinates) {
      promises.push(
        this.fetchBroadbandData(coordinates, result, sourcesUsed, sourcesFailed)
      );
    }

    // Elevation (needs coordinates)
    if (this.options.includeElevation && coordinates) {
      promises.push(
        this.fetchElevationData(coordinates, result, sourcesUsed, sourcesFailed)
      );
    }

    // Climate (needs coordinates and state)
    if (this.options.includeClimate && coordinates && state) {
      promises.push(
        this.fetchClimateData(coordinates, state, result, sourcesUsed, sourcesFailed)
      );
    }

    // Wait for all parallel requests
    await Promise.allSettled(promises);

    // Step 3: Generate AI analysis (after all data is collected)
    if (this.options.includeAIAnalysis) {
      await this.generateAIAnalysis(result, sourcesUsed, sourcesFailed);
    }

    // Calculate data quality
    result.metadata.sourcesUsed = sourcesUsed;
    result.metadata.sourcesFailed = sourcesFailed;
    result.metadata.dataQuality = this.calculateDataQuality(sourcesUsed, sourcesFailed);

    reportLogger.info('Report generated', {
      durationMs: Date.now() - startTime,
      sourcesUsed: sourcesUsed.length,
      sourcesFailed: sourcesFailed.length
    });

    return result;
  }

  /**
   * Fetch Zillow data
   */
  private async fetchZillowData(
    address: string,
    result: EnrichedPropertyData,
    sourcesUsed: string[],
    sourcesFailed: string[]
  ): Promise<void> {
    try {
      const zillow = getZillowService();
      const zillowData = await zillow.getPropertyByAddress(address);

      result.zillow = {
        zestimate: zillowData.data.zestimate,
        rentZestimate: zillowData.data.rentZestimate,
        bedrooms: zillowData.data.bedrooms,
        bathrooms: zillowData.data.bathrooms,
        livingArea: zillowData.data.livingArea,
        lotSize: zillowData.data.lotSize,
        yearBuilt: zillowData.data.yearBuilt,
        propertyType: zillowData.data.propertyType,
        taxAssessedValue: zillowData.data.taxAssessedValue,
        priceHistory: zillowData.data.priceHistory,
        schools: zillowData.data.schools,
      };
      sourcesUsed.push('zillow');
    } catch (error) {
      reportLogger.warn('Zillow data fetch failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      sourcesFailed.push('zillow');
    }
  }

  /**
   * Fetch comparables data
   */
  private async fetchComparables(
    coordinates: { lat: number; lng: number },
    result: EnrichedPropertyData,
    sourcesUsed: string[],
    sourcesFailed: string[]
  ): Promise<void> {
    try {
      const realty = getRealtyService();
      const compsData = await realty.getSoldComparables({
        lat: coordinates.lat,
        lng: coordinates.lng,
        radius_miles: this.options.radiusMiles,
        sold_within_days: 365, // 12 months
        limit: 10,
      });

      if (compsData.data.comparables.length > 0) {
        result.comparables = {
          count: compsData.data.statistics.count,
          avgSalePrice: compsData.data.statistics.avg_sold_price,
          medianSalePrice: compsData.data.statistics.median_sold_price,
          pricePerSqft: compsData.data.statistics.avg_price_per_sqft,
          recentSales: compsData.data.comparables.map((c) => ({
            address: c.address.line,
            salePrice: c.price.sold_price || 0,
            saleDate: c.sold_date || '',
            distance: c.distance_miles || 0,
          })),
        };
        sourcesUsed.push('realty-comparables');
      }
    } catch (error) {
      reportLogger.warn('Comparables fetch failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      sourcesFailed.push('realty-comparables');
    }
  }

  /**
   * Fetch amenities data
   */
  private async fetchAmenities(
    coordinates: { lat: number; lng: number },
    result: EnrichedPropertyData,
    sourcesUsed: string[],
    sourcesFailed: string[]
  ): Promise<void> {
    try {
      const geoapify = getGeoapifyService();
      const amenitiesData = await geoapify.getAmenitiesSummary(
        coordinates.lat,
        coordinates.lng,
        5000 // 5km radius
      );

      if (!result.location) result.location = {};
      result.location.amenities = amenitiesData.data;
      result.location.walkScore = amenitiesData.data.score;
      sourcesUsed.push('geoapify-amenities');
    } catch (error) {
      reportLogger.warn('Amenities fetch failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      sourcesFailed.push('geoapify-amenities');
    }
  }

  /**
   * Fetch crime data
   */
  private async fetchCrimeData(
    state: string,
    result: EnrichedPropertyData,
    sourcesUsed: string[],
    sourcesFailed: string[]
  ): Promise<void> {
    try {
      const fbi = getFBICrimeService();
      const crimeData = await fbi.getCrimeSummary(state);

      if (!result.economic) result.economic = {};
      result.economic.crime = crimeData.data;
      sourcesUsed.push('fbi-crime');
    } catch (error) {
      reportLogger.warn('Crime data fetch failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      sourcesFailed.push('fbi-crime');
    }
  }

  /**
   * Fetch employment data
   */
  private async fetchEmploymentData(
    state: string,
    result: EnrichedPropertyData,
    sourcesUsed: string[],
    sourcesFailed: string[]
  ): Promise<void> {
    try {
      const bls = getBLSService();
      const employmentData = await bls.getEmploymentSummary(state);

      if (!result.economic) result.economic = {};
      result.economic.employment = employmentData.data;
      sourcesUsed.push('bls-employment');
    } catch (error) {
      reportLogger.warn('Employment data fetch failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      sourcesFailed.push('bls-employment');
    }
  }

  /**
   * Fetch broadband data
   */
  private async fetchBroadbandData(
    coordinates: { lat: number; lng: number },
    result: EnrichedPropertyData,
    sourcesUsed: string[],
    sourcesFailed: string[]
  ): Promise<void> {
    try {
      const fcc = getFCCService();
      const broadbandData = await fcc.getBroadbandAvailability(
        coordinates.lat,
        coordinates.lng
      );

      if (!result.economic) result.economic = {};
      result.economic.broadband = broadbandData.data;
      sourcesUsed.push('fcc-broadband');
    } catch (error) {
      reportLogger.warn('Broadband data fetch failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      sourcesFailed.push('fcc-broadband');
    }
  }

  /**
   * Fetch elevation data
   */
  private async fetchElevationData(
    coordinates: { lat: number; lng: number },
    result: EnrichedPropertyData,
    sourcesUsed: string[],
    sourcesFailed: string[]
  ): Promise<void> {
    try {
      const elevation = getElevationService();
      const elevationData = await elevation.getElevationAnalysis(
        coordinates.lat,
        coordinates.lng,
        true
      );

      if (!result.environmental) result.environmental = {};
      result.environmental.elevation = elevationData.data;
      sourcesUsed.push('open-elevation');
    } catch (error) {
      reportLogger.warn('Elevation data fetch failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      sourcesFailed.push('open-elevation');
    }
  }

  /**
   * Fetch climate data
   */
  private async fetchClimateData(
    coordinates: { lat: number; lng: number },
    state: string,
    result: EnrichedPropertyData,
    sourcesUsed: string[],
    sourcesFailed: string[]
  ): Promise<void> {
    try {
      const [climateService, noaaService] = [getClimateService(), getNOAAService()];

      const [climateData, climateRiskData] = await Promise.allSettled([
        climateService.getClimateSummary(coordinates.lat, coordinates.lng),
        noaaService.getClimateRiskAssessment(coordinates.lat, coordinates.lng, state),
      ]);

      if (!result.environmental) result.environmental = {};

      if (climateData.status === 'fulfilled') {
        result.environmental.climate = climateData.value.data;
        sourcesUsed.push('open-meteo-climate');
      } else {
        sourcesFailed.push('open-meteo-climate');
      }

      if (climateRiskData.status === 'fulfilled') {
        result.environmental.climateRisk = climateRiskData.value.data;
        sourcesUsed.push('noaa-climate-risk');
      } else {
        sourcesFailed.push('noaa-climate-risk');
      }
    } catch (error) {
      reportLogger.warn('Climate data fetch failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      sourcesFailed.push('climate');
    }
  }

  /**
   * Generate AI analysis
   */
  private async generateAIAnalysis(
    result: EnrichedPropertyData,
    sourcesUsed: string[],
    sourcesFailed: string[]
  ): Promise<void> {
    try {
      const openai = getOpenAIService();

      const analysisRequest = {
        propertyData: {
          address: result.property.address,
          parcelId: result.property.parcelId,
          propertyType: result.zillow?.propertyType,
          lotSize: result.zillow?.lotSize,
          buildingSize: result.zillow?.livingArea,
          yearBuilt: result.zillow?.yearBuilt,
          bedrooms: result.zillow?.bedrooms,
          bathrooms: result.zillow?.bathrooms,
        },
        financialData: result.zillow || result.comparables ? {
          assessedValue: result.zillow?.taxAssessedValue,
          estimatedMarketValue: result.zillow?.zestimate,
          comparableSales: result.comparables?.recentSales.map((s) => ({
            address: s.address,
            salePrice: s.salePrice,
            saleDate: s.saleDate,
          })),
        } : undefined,
        locationData: result.economic || result.location ? {
          crimeRate: result.economic?.crime?.riskLevel,
          schoolRating: result.zillow?.schools?.[0]?.rating,
          walkScore: result.location?.walkScore,
          nearbyAmenities: result.location?.amenities
            ? Object.entries(result.location.amenities.counts)
                .filter(([_, count]) => (count as number) > 0)
                .map(([type]) => type)
            : undefined,
        } : undefined,
        riskData: result.environmental ? {
          floodRisk: result.environmental.elevation?.floodRiskAssessment.risk,
          environmentalIssues: [],
          climateRisks: result.environmental.climateRisk
            ? Object.entries(result.environmental.climateRisk.risks)
                .filter(([_, level]) => level !== 'low')
                .map(([risk, level]) => `${risk}: ${level}`)
            : undefined,
        } : undefined,
      };

      const analysis = await openai.generatePropertyAnalysis(analysisRequest);
      result.aiAnalysis = analysis.data;
      sourcesUsed.push('openai-analysis');
    } catch (error) {
      reportLogger.warn('AI analysis generation failed', {
        error: error instanceof Error ? error.message : String(error)
      });
      sourcesFailed.push('openai-analysis');
    }
  }

  /**
   * Extract state abbreviation from address
   */
  private extractStateFromAddress(address: string): string | undefined {
    // Common state patterns
    const statePattern = /\b([A-Z]{2})\s*\d{5}/;
    const match = address.toUpperCase().match(statePattern);
    if (match) {
      return match[1];
    }

    // Try to find state name
    const stateNames: Record<string, string> = {
      'PENNSYLVANIA': 'PA', 'FLORIDA': 'FL', 'TEXAS': 'TX', 'CALIFORNIA': 'CA',
      'NEW YORK': 'NY', 'OHIO': 'OH', 'GEORGIA': 'GA', 'NORTH CAROLINA': 'NC',
      // Add more as needed
    };

    const upperAddress = address.toUpperCase();
    for (const [name, abbr] of Object.entries(stateNames)) {
      if (upperAddress.includes(name)) {
        return abbr;
      }
    }

    return undefined;
  }

  /**
   * Calculate data quality based on sources
   */
  private calculateDataQuality(
    sourcesUsed: string[],
    sourcesFailed: string[]
  ): 'complete' | 'partial' | 'minimal' {
    const total = sourcesUsed.length + sourcesFailed.length;
    if (total === 0) return 'minimal';

    const successRate = sourcesUsed.length / total;

    if (successRate >= 0.8) return 'complete';
    if (successRate >= 0.5) return 'partial';
    return 'minimal';
  }
}

/**
 * Singleton instance
 */
let orchestratorInstance: ReportOrchestrator | null = null;

export function getReportOrchestrator(options?: Partial<ReportOptions>): ReportOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new ReportOrchestrator(options);
  }
  return orchestratorInstance;
}

export function resetReportOrchestrator(): void {
  orchestratorInstance = null;
}

export default ReportOrchestrator;
