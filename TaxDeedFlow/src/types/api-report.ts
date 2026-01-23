/**
 * Property Report API Response Types
 *
 * Type definitions for the comprehensive property analysis report API responses.
 * These types define the structure of data returned from the property report
 * aggregation endpoint, which combines data from multiple external APIs.
 *
 * @module types/api-report
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-22
 */

// ============================================
// Data Source Status Types
// ============================================

/**
 * Status information for a single data source in the report
 */
export interface ApiDataSource {
  /** Name of the data source (e.g., "elevation", "census", "amenities") */
  name: string;
  /** Status of the data fetch operation */
  status: 'ok' | 'error' | 'skipped';
  /** Response time in milliseconds */
  latency?: number;
  /** Error message if status is 'error' */
  error?: string;
  /** Raw data from the source (varies by source) */
  data?: unknown;
}

// ============================================
// Report Data Types
// ============================================

/**
 * Comprehensive property analysis report data
 *
 * Contains aggregated data from multiple external APIs including
 * elevation, climate, environmental hazards, amenities, and demographics.
 */
export interface ApiReportData {
  /** Basic property information */
  property: {
    /** Full street address */
    address: string;
    /** Parcel ID or APN if available */
    parcelId?: string;
    /** Geographic coordinates */
    coordinates: { lat: number; lng: number };
    /** State abbreviation (e.g., "PA", "CA") */
    state: string;
  };

  /** Elevation and terrain analysis */
  elevation?: {
    /** Latitude of measurement point */
    latitude: number;
    /** Longitude of measurement point */
    longitude: number;
    /** Elevation in meters */
    elevation: number;
    /** Elevation in feet */
    elevationFeet: number;

    /** Detailed terrain analysis */
    terrain?: {
      /** Elevation in meters */
      elevation: number;
      /** Elevation in feet */
      elevationFeet: number;
      /** Average slope percentage */
      averageSlope: number;
      /** Maximum slope percentage */
      maxSlope: number;
      /** Terrain classification code */
      classification: string;
      /** Human-readable classification */
      classificationLabel: string;
      /** Stability assessment code */
      stability: string;
      /** Human-readable stability assessment */
      stabilityLabel: string;
      /** Primary slope direction (N, S, E, W, etc.) */
      slopeDirection: string;
      /** Overall terrain assessment */
      assessment: string;
    };

    /** Flood risk based on elevation */
    floodRiskAssessment?: {
      /** Flood risk level */
      risk: 'low' | 'moderate' | 'high';
      /** Explanation for risk assessment */
      reason: string;
      /** Whether property is below sea level */
      belowSeaLevel: boolean;
      /** Whether property is in a low-lying area */
      inLowLyingArea: boolean;
    };

    /** Elevation comparison with surroundings */
    surroundingElevations?: {
      /** Whether this is the lowest point in the area */
      isLowestPoint: boolean;
      /** Elevation to the north (meters) */
      northElevation?: number;
      /** Elevation to the south (meters) */
      southElevation?: number;
      /** Elevation to the east (meters) */
      eastElevation?: number;
      /** Elevation to the west (meters) */
      westElevation?: number;
    };
  };

  /** Climate and weather data */
  climate?: {
    /** Current weather conditions */
    current?: {
      /** Temperature in Celsius */
      temperature: number;
      /** Humidity percentage */
      humidity: number;
      /** Precipitation in mm */
      precipitation: number;
      /** WMO weather code */
      weatherCode: number;
      /** Wind speed in km/h */
      windSpeed: number;
      /** Wind direction in degrees */
      windDirection: number;
    };

    /** Daily forecast data */
    daily?: Array<{
      /** Date in ISO format */
      date: string;
      /** Maximum temperature in Celsius */
      temperatureMax: number;
      /** Minimum temperature in Celsius */
      temperatureMin: number;
      /** Precipitation probability (0-100) */
      precipitationProbability: number;
      /** WMO weather code */
      weatherCode: number;
    }>;

    /** Average temperature over forecast period */
    averageTemperature?: number;
    /** Average humidity over forecast period */
    averageHumidity?: number;
    /** Total precipitation over forecast period */
    totalPrecipitation?: number;
  };

  /** Active weather alerts */
  weatherAlerts?: {
    /** List of active alerts */
    active: Array<{
      /** Alert identifier */
      id: string;
      /** Short headline */
      headline: string;
      /** Event type (e.g., "Winter Storm Warning") */
      event: string;
      /** Severity level */
      severity: string;
      /** Certainty level */
      certainty: string;
      /** Urgency level */
      urgency: string;
      /** When alert becomes effective */
      effective: string;
      /** When alert expires */
      expires: string;
      /** Full alert description */
      description: string;
    }>;
    /** Number of active alerts */
    count: number;
  };

  /** Seismic hazard assessment */
  seismicHazard?: {
    /** USGS hazard category */
    hazardCategory: string;
    /** Peak Ground Acceleration (% g) */
    pga: number;
    /** Risk level classification */
    riskLevel: string;
    /** Description of seismic risk */
    description: string;
    /** Spectral acceleration at 0.2 seconds (% g) */
    ss?: number;
    /** Spectral acceleration at 1.0 second (% g) */
    s1?: number;
  };

  /** Wildfire data from NASA FIRMS */
  wildfireData?: {
    /** Active fires in the area */
    fires: Array<{
      /** Fire latitude */
      latitude: number;
      /** Fire longitude */
      longitude: number;
      /** Brightness temperature (Kelvin) */
      brightness: number;
      /** Confidence level */
      confidence: string;
      /** Satellite that detected the fire */
      satellite: string;
      /** Distance from property in miles */
      distanceMiles: number;
    }>;
    /** Total number of fires detected */
    fireCount: number;
    /** Last update timestamp */
    lastUpdated: string;
    /** Distance to nearest fire in miles (null if none) */
    nearestFireMiles: number | null;
  };

  /** Environmental contamination sites */
  environmentalSites?: {
    /** Query center point */
    queryLocation: { latitude: number; longitude: number };
    /** Search radius in miles */
    searchRadiusMiles: number;
    /** Superfund (NPL) sites */
    superfundSites: Array<{
      /** Site name */
      name: string;
      /** Distance from property in miles */
      distanceMiles?: number;
      /** Cleanup status */
      status?: string;
    }>;
    /** Brownfield sites */
    brownfieldSites: Array<{
      /** Site name */
      name: string;
      /** Distance from property in miles */
      distanceMiles?: number;
      /** Cleanup status */
      cleanupStatus?: string;
    }>;
    /** Underground Storage Tank sites */
    ustSites: Array<{
      /** Site name */
      name: string;
      /** Distance from property in miles */
      distanceMiles?: number;
    }>;
    /** Summary counts by type */
    counts: {
      /** Number of Superfund sites */
      superfund: number;
      /** Number of Brownfield sites */
      brownfield: number;
      /** Number of UST sites */
      ust: number;
      /** Number of TRI facilities */
      tri: number;
      /** Number of RCRA sites */
      rcra: number;
      /** Total sites of all types */
      total: number;
    };
    /** Information about the nearest site */
    nearestSite: {
      /** Type of site */
      type: string;
      /** Site name */
      name: string;
      /** Distance in miles */
      distanceMiles: number;
    } | null;
  };

  /** Nearby amenities analysis */
  amenities?: {
    /** Center point of amenities search */
    location?: { lat: number; lng: number };
    /** Search radius in meters */
    radius_meters?: number;
    /** Count of each amenity type */
    counts?: {
      /** Number of hospitals */
      hospitals: number;
      /** Number of schools */
      schools: number;
      /** Number of grocery stores */
      grocery_stores: number;
      /** Number of restaurants */
      restaurants: number;
      /** Number of gas stations */
      gas_stations: number;
      /** Number of banks */
      banks: number;
      /** Number of pharmacies */
      pharmacies: number;
      /** Number of parks */
      parks: number;
      /** Number of shopping centers */
      shopping: number;
      /** Number of public transport stops */
      public_transport: number;
    };
    /** Nearest amenities with details */
    nearest?: {
      /** Nearest hospital */
      hospital?: { name?: string; distance?: number };
      /** Nearest school */
      school?: { name?: string; distance?: number };
      /** Nearest grocery store */
      grocery_store?: { name?: string; distance?: number };
      /** Nearest gas station */
      gas_station?: { name?: string; distance?: number };
      /** Nearest park */
      park?: { name?: string; distance?: number };
    };
    /** Overall amenity score (0-100) */
    score?: number;
    /** Walkability score (0-100) - alternative to score */
    walkabilityScore?: number;
    /** Direct property: Number of hospitals (alternative to counts.hospitals) */
    hospitals?: number;
    /** Direct property: Number of schools (alternative to counts.schools) */
    schools?: number;
    /** Direct property: Number of parks (alternative to counts.parks) */
    parks?: number;
    /** Direct property: Number of restaurants (alternative to counts.restaurants) */
    restaurants?: number;
    /** Direct property: Number of grocery stores (alternative to counts.grocery_stores) */
    groceryStores?: number;
    /** Direct property: Number of public transit stops (alternative to counts.public_transport) */
    publicTransit?: number;
    /** Total number of amenities */
    total?: number;
  };

  /** Broadband internet availability */
  broadband?: {
    /** Whether broadband is available */
    available: boolean;
    /** Maximum download speed (Mbps) */
    maxDownload: number;
    /** Maximum upload speed (Mbps) */
    maxUpload: number;
    /** List of internet service providers */
    providers: string[];
    /** Available technologies (e.g., "Fiber", "Cable") */
    technologies: string[];
    /** Whether fiber optic is available */
    fiberAvailable: boolean;
  };

  /** Census demographic data */
  census?: {
    /** Geographic identifiers */
    geographic?: {
      /** Full FIPS code */
      fips: string;
      /** State FIPS code */
      stateFips: string;
      /** County FIPS code */
      countyFips: string;
      /** County name */
      countyName: string;
      /** State name */
      stateName: string;
      /** Census tract */
      tract?: string;
      /** Block group */
      blockGroup?: string;
      /** Block */
      block?: string;
      /** Congressional district */
      congressionalDistrict?: string;
      /** School district */
      schoolDistrict?: string;
    };
    /** Demographic statistics */
    demographics?: {
      /** Total population */
      population: number;
      /** Median household income in dollars */
      medianHouseholdIncome: number;
      /** Median home value in dollars */
      medianHomeValue: number;
      /** Percentage of owner-occupied housing */
      ownerOccupiedPct: number;
      /** Poverty rate percentage */
      povertyPct: number;
      /** Median age in years */
      medianAge: number;
      /** Percentage with bachelor's degree or higher */
      bachelorsDegreeOrHigherPct: number;
      /** Unemployment rate percentage */
      unemploymentRate: number;
      /** Total number of housing units */
      totalHousingUnits: number;
      /** Vacancy rate percentage */
      vacancyRate: number;
      /** Year of data */
      dataYear: number;
    };
  };

  /** AI-generated summary of the property */
  aiSummary?: string;
}

// ============================================
// API Response Wrapper
// ============================================

/**
 * Complete API response for property analysis report
 *
 * Wraps the property data with metadata about the request,
 * data quality, and status of individual data sources.
 */
export interface ApiResponse {
  /** Whether the request was successful */
  success: boolean;
  /** ISO timestamp of when the report was generated */
  timestamp: string;
  /** Overall data quality assessment */
  dataQuality: 'complete' | 'partial' | 'minimal';
  /** Status of each data source */
  sources: ApiDataSource[];
  /** The actual property report data */
  data: ApiReportData;
}
