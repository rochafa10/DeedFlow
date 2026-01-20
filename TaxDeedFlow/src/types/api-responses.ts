/**
 * API Response Types
 *
 * Comprehensive type definitions for all external API responses
 * used in the TaxDeedFlow property analysis system.
 *
 * @module types/api-responses
 */

// ============================================================
// REAL ESTATE APIs (RapidAPI)
// ============================================================

/**
 * Zillow Property Data Response
 */
export interface ZillowPropertyResponse {
  zpid: number;
  address: {
    streetAddress: string;
    city: string;
    state: string;
    zipcode: string;
    neighborhood?: string;
    community?: string;
    subdivision?: string;
  };
  price?: number;
  zestimate?: number;
  rentZestimate?: number;
  taxAssessedValue?: number;
  taxAssessedYear?: number;
  lotSize?: number;
  livingArea?: number;
  bedrooms?: number;
  bathrooms?: number;
  yearBuilt?: number;
  homeType?: string;
  homeStatus?: string;
  latitude?: number;
  longitude?: number;
  description?: string;
  photos?: string[];
  priceHistory?: Array<{
    date: string;
    price: number;
    event: string;
  }>;
  taxHistory?: Array<{
    time: number;
    taxPaid: number;
    taxIncreaseRate: number;
    value: number;
    valueIncreaseRate: number;
  }>;
}

/**
 * Realty in US Sold Property Response
 */
export interface RealtySoldPropertyResponse {
  property_id: string;
  address: {
    line: string;
    city: string;
    state_code: string;
    postal_code: string;
    lat?: number;
    lon?: number;
  };
  price: number;
  sold_date: string;
  beds?: number;
  baths?: number;
  sqft?: number;
  lot_sqft?: number;
  year_built?: number;
  property_type?: string;
  price_per_sqft?: number;
  days_on_market?: number;
}

/**
 * Comparable Sales Analysis
 */
export interface ComparableSalesAnalysis {
  targetProperty: {
    address: string;
    coordinates: { lat: number; lng: number };
  };
  comparables: RealtySoldPropertyResponse[];
  analysis: {
    medianPrice: number;
    averagePrice: number;
    minPrice: number;
    maxPrice: number;
    pricePerSqft: number;
    sampleSize: number;
    searchRadius: number; // miles
  };
  estimatedValue?: number;
}

// ============================================================
// GEOGRAPHIC APIs
// ============================================================

/**
 * Geocoding Result (shared structure)
 */
export interface GeocodingResult {
  lat: number;
  lng: number;
  formattedAddress: string;
  confidence: number;
  components?: {
    streetNumber?: string;
    street?: string;
    city?: string;
    county?: string;
    state?: string;
    stateCode?: string;
    postalCode?: string;
    country?: string;
    countryCode?: string;
  };
}

/**
 * Geoapify Place Response
 */
export interface GeoapifyPlaceResponse {
  type: string;
  features: Array<{
    type: string;
    properties: {
      name: string;
      categories: string[];
      street?: string;
      city?: string;
      state?: string;
      postcode?: string;
      country?: string;
      distance?: number;
      place_id: string;
      datasource?: {
        sourcename: string;
        attribution: string;
      };
    };
    geometry: {
      type: string;
      coordinates: [number, number];
    };
  }>;
}

/**
 * Nearby Places Summary
 */
export interface NearbyPlacesSummary {
  location: { lat: number; lng: number };
  radius: number;
  counts: {
    schools: number;
    hospitals: number;
    groceryStores: number;
    restaurants: number;
    parks: number;
    publicTransit: number;
    entertainment: number;
  };
  nearestSchool?: { name: string; distance: number };
  nearestHospital?: { name: string; distance: number };
  nearestGrocery?: { name: string; distance: number };
  walkabilityScore?: number;
}

/**
 * Mapbox Directions Response
 */
export interface MapboxDirectionsResponse {
  routes: Array<{
    geometry: string; // encoded polyline
    duration: number; // seconds
    distance: number; // meters
    legs: Array<{
      summary: string;
      duration: number;
      distance: number;
      steps: Array<{
        maneuver: {
          instruction: string;
          type: string;
        };
        distance: number;
        duration: number;
      }>;
    }>;
  }>;
  waypoints: Array<{
    name: string;
    location: [number, number];
  }>;
}

/**
 * Isochrone Result
 */
export interface IsochroneResult {
  center: { lat: number; lng: number };
  contours: Array<{
    minutes: number;
    polygon: Array<[number, number]>;
  }>;
}

// ============================================================
// GOVERNMENT DATA APIs
// ============================================================

/**
 * FBI Crime Data Response
 */
export interface FBICrimeDataResponse {
  results: Array<{
    ori?: string;
    state_abbr: string;
    year: number;
    offense: string;
    actual: number;
    cleared: number;
    data_year?: number;
  }>;
  pagination?: {
    count: number;
    page: number;
    pages: number;
  };
}

/**
 * Crime Summary for Property Analysis
 */
export interface CrimeSummaryResponse {
  location: {
    state: string;
    county?: string;
    city?: string;
  };
  year: number;
  crimeStats: {
    violentCrime: {
      total: number;
      rate: number; // per 100k
      breakdown: {
        murder: number;
        rape: number;
        robbery: number;
        aggravatedAssault: number;
      };
    };
    propertyCrime: {
      total: number;
      rate: number;
      breakdown: {
        burglary: number;
        larceny: number;
        motorVehicleTheft: number;
        arson?: number;
      };
    };
  };
  safetyRating: 'low' | 'moderate' | 'high'; // Based on crime rates
  nationalComparison: 'below_average' | 'average' | 'above_average';
}

/**
 * BLS Employment Data Response
 */
export interface BLSDataResponse {
  status: string;
  responseTime: number;
  message: string[];
  Results: {
    series: Array<{
      seriesID: string;
      data: Array<{
        year: string;
        period: string;
        periodName: string;
        value: string;
        footnotes: Array<{ code: string; text: string }>;
      }>;
    }>;
  };
}

/**
 * Employment Summary for Property Analysis
 */
export interface EmploymentSummaryResponse {
  location: {
    state: string;
    stateCode: string;
    county?: string;
  };
  unemployment: {
    rate: number;
    periodLabel: string;
    trend: 'improving' | 'stable' | 'worsening';
    nationalAverage: number;
    comparison: 'better' | 'similar' | 'worse';
  };
  employment?: {
    totalJobs: number;
    changeFromLastYear: number;
    changePercent: number;
  };
  economicHealth: 'strong' | 'moderate' | 'weak';
}

/**
 * FCC Broadband Data Response
 */
export interface FCCBroadbandResponse {
  providers: Array<{
    frn: string;
    provider_name: string;
    technology: number;
    technology_name?: string;
    max_download: number;
    max_upload: number;
    consumer: boolean;
    business: boolean;
  }>;
  location: {
    lat: number;
    lng: number;
    block_fips?: string;
    state_fips?: string;
    county_fips?: string;
  };
}

/**
 * Broadband Summary for Property Analysis
 */
export interface BroadbandSummaryResponse {
  location: { lat: number; lng: number };
  hasAdequateBroadband: boolean;
  providerCount: number;
  maxDownloadSpeed: number; // Mbps
  maxUploadSpeed: number; // Mbps
  technologies: string[]; // ['Fiber', 'Cable', 'DSL', etc.]
  connectivityScore: number; // 0-100
  providers: Array<{
    name: string;
    maxDownload: number;
    maxUpload: number;
    technology: string;
  }>;
}

// ============================================================
// ENVIRONMENTAL APIs
// ============================================================

/**
 * NOAA Weather Alert Response
 */
export interface NOAAAlertResponse {
  '@context': Array<string | object>;
  type: string;
  features: Array<{
    id: string;
    type: string;
    properties: {
      id: string;
      areaDesc: string;
      event: string;
      severity: 'Extreme' | 'Severe' | 'Moderate' | 'Minor' | 'Unknown';
      certainty: string;
      urgency: string;
      headline: string;
      description: string;
      instruction?: string;
      effective: string;
      expires: string;
      senderName: string;
    };
  }>;
}

/**
 * NOAA Forecast Response
 */
export interface NOAAForecastResponse {
  properties: {
    updated: string;
    units: string;
    forecastGenerator: string;
    generatedAt: string;
    updateTime: string;
    periods: Array<{
      number: number;
      name: string;
      startTime: string;
      endTime: string;
      isDaytime: boolean;
      temperature: number;
      temperatureUnit: string;
      windSpeed: string;
      windDirection: string;
      icon: string;
      shortForecast: string;
      detailedForecast: string;
    }>;
  };
}

/**
 * Climate Risk Assessment Response
 */
export interface ClimateRiskResponse {
  location: { lat: number; lng: number };
  risks: {
    hurricane: 'low' | 'moderate' | 'high';
    tornado: 'low' | 'moderate' | 'high';
    flood: 'low' | 'moderate' | 'high';
    wildfire: 'low' | 'moderate' | 'high';
    extremeHeat: 'low' | 'moderate' | 'high';
    extremeCold: 'low' | 'moderate' | 'high';
  };
  overallRisk: 'low' | 'moderate' | 'high';
  activeAlerts: Array<{
    event: string;
    severity: string;
    headline: string;
    expires: string;
  }>;
  historicalData?: {
    hurricanesNearby5yr: number;
    tornadoesNearby5yr: number;
    floodEvents5yr: number;
    wildfires5yr: number;
  };
}

/**
 * Open-Elevation Response
 */
export interface ElevationResponse {
  results: Array<{
    latitude: number;
    longitude: number;
    elevation: number; // meters
  }>;
}

/**
 * Elevation Analysis for Property
 */
export interface ElevationAnalysisResponse {
  location: { lat: number; lng: number };
  elevation: {
    meters: number;
    feet: number;
  };
  floodRisk: {
    level: 'low' | 'moderate' | 'high';
    reason: string;
    belowSeaLevel: boolean;
    nearCoast: boolean;
    isLowestPoint: boolean;
  };
  surroundingTerrain?: {
    north: number;
    south: number;
    east: number;
    west: number;
    averageElevation: number;
    relativePosition: 'higher' | 'same' | 'lower';
  };
}

/**
 * Open-Meteo Weather Response
 */
export interface OpenMeteoWeatherResponse {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  current?: {
    time: string;
    interval: number;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    is_day: number;
    weather_code: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
  };
  daily?: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_sum: number[];
    weather_code: number[];
    wind_speed_10m_max: number[];
  };
}

/**
 * Climate Summary for Property
 */
export interface ClimateSummaryResponse {
  location: { lat: number; lng: number };
  currentWeather?: {
    temperature: number;
    humidity: number;
    condition: string;
    windSpeed: number;
  };
  climate: {
    avgHighSummer: number;
    avgLowWinter: number;
    annualPrecipitation: number; // inches
    rainyDaysPerYear: number;
    snowDaysPerYear: number;
    sunnyDaysPerYear: number;
  };
  seasonalRisks: {
    winterSeverity: 'mild' | 'moderate' | 'severe';
    summerHeat: 'mild' | 'moderate' | 'severe';
    stormSeason: string; // e.g., "April-September"
  };
}

// ============================================================
// AI APIs
// ============================================================

/**
 * OpenAI Chat Completion Response
 */
export interface OpenAIChatResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * AI Property Analysis Response
 */
export interface AIPropertyAnalysisResponse {
  executiveSummary: string;
  investmentPotential: 'excellent' | 'good' | 'fair' | 'poor';
  keyStrengths: string[];
  keyRisks: string[];
  recommendedAction: 'strong_buy' | 'buy' | 'hold' | 'avoid';
  estimatedROI?: string;
  fullAnalysis: string;
  confidence: number; // 0-100
}

/**
 * AI Investment Recommendation
 */
export interface AIInvestmentRecommendation {
  recommendation: 'BID' | 'PASS';
  maxBidSuggestion?: number;
  reasoning: string;
  riskFactors: string[];
  opportunities: string[];
  confidenceLevel: 'high' | 'medium' | 'low';
}

// ============================================================
// COMBINED REPORT TYPES
// ============================================================

/**
 * Complete Property Report Data
 */
export interface PropertyReportData {
  property: {
    address: string;
    parcelId?: string;
    coordinates?: { lat: number; lng: number };
    propertyType?: string;
    lotSize?: number;
    buildingSize?: number;
    yearBuilt?: number;
    bedrooms?: number;
    bathrooms?: number;
  };
  valuation?: {
    zestimate?: number;
    taxAssessedValue?: number;
    comparableMedian?: number;
    estimatedARV?: number;
    confidenceLevel?: 'high' | 'medium' | 'low';
  };
  comparables?: ComparableSalesAnalysis;
  location?: {
    geocoding?: GeocodingResult;
    nearbyPlaces?: NearbyPlacesSummary;
    walkabilityScore?: number;
  };
  economic?: {
    crime?: CrimeSummaryResponse;
    employment?: EmploymentSummaryResponse;
    broadband?: BroadbandSummaryResponse;
  };
  environmental?: {
    elevation?: ElevationAnalysisResponse;
    climate?: ClimateSummaryResponse;
    climateRisk?: ClimateRiskResponse;
    femaFloodZone?: {
      zone: string;
      description: string;
      insuranceRequired: boolean;
    };
  };
  aiAnalysis?: AIPropertyAnalysisResponse;
  metadata: {
    generatedAt: string;
    sourcesUsed: string[];
    sourcesFailed: string[];
    dataQuality: 'complete' | 'partial' | 'minimal';
    reportVersion: string;
  };
}

/**
 * API Source Status
 */
export interface APISourceStatus {
  name: string;
  status: 'success' | 'failed' | 'skipped' | 'pending';
  responseTime?: number; // ms
  errorMessage?: string;
  dataPoints?: number;
}

/**
 * Report Generation Progress
 */
export interface ReportGenerationProgress {
  totalSources: number;
  completedSources: number;
  currentSource?: string;
  status: 'initializing' | 'fetching' | 'analyzing' | 'complete' | 'error';
  sources: APISourceStatus[];
  estimatedTimeRemaining?: number; // seconds
}

// ============================================================
// UTILITY TYPES
// ============================================================

/**
 * API Response Wrapper
 */
export interface APIResponseWrapper<T> {
  data: T;
  status: number;
  headers?: Record<string, string>;
  cached: boolean;
  requestId: string;
  responseTime: number;
}

/**
 * Paginated Response
 */
export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    perPage: number;
    totalItems: number;
    totalPages: number;
    hasMore: boolean;
  };
}

/**
 * Coordinate Pair
 */
export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Address Components
 */
export interface AddressComponents {
  streetNumber?: string;
  street?: string;
  city?: string;
  county?: string;
  state?: string;
  stateCode?: string;
  postalCode?: string;
  country?: string;
  countryCode?: string;
}

/**
 * Risk Level
 */
export type RiskLevel = 'low' | 'moderate' | 'high' | 'critical';

/**
 * Trend Direction
 */
export type TrendDirection = 'improving' | 'stable' | 'worsening';

/**
 * Data Quality Level
 */
export type DataQualityLevel = 'complete' | 'partial' | 'minimal' | 'unavailable';
