/**
 * API Services Index
 *
 * Re-exports all API service implementations for convenient importing.
 *
 * @module lib/api/services
 */

// FEMA Service
export {
  FEMAService,
  getFEMAService,
  resetFEMAService,
} from './fema-service';

// Census Service
export {
  CensusService,
  getCensusService,
  resetCensusService,
} from './census-service';

// USGS Service
export {
  USGSService,
  getUSGSService,
  resetUSGSService,
} from './usgs-service';

export type {
  SeismicHazardData,
  HistoricalEarthquakeSummary,
} from './usgs-service';

// NASA FIRMS Service
export {
  NASAFIRMSService,
  getNASAFIRMSService,
  resetNASAFIRMSService,
} from './nasa-firms-service';

export type {
  FIRMSFirePoint,
  ActiveFireSummary,
  WildfireHazardPotential,
} from './nasa-firms-service';

// EPA Service
export {
  EPAService,
  getEPAService,
  resetEPAService,
} from './epa-service';

export type {
  EPASiteType,
  EPASiteStatus,
  SuperfundSite,
  BrownfieldSite,
  USTSite,
  TRIFacility,
  RCRAFacility,
  EnvironmentalSitesSummary,
  RadonZoneData,
} from './epa-service';

// ============================================================
// NEW API SERVICES (Integrated January 2026)
// ============================================================

// Real Estate APIs (RapidAPI)
// ----------------------------------------------------------

// Realty Service - Comparable sales data
export {
  RealtyService,
  getRealtyService,
  resetRealtyService,
} from './realty-service';

export type {
  RealtyComparable,
  PropertySearchFilters,
  ComparableSearchOptions,
  RealtyPropertyDetail,
  ComparablesAnalysis,
  RealtyServiceConfig,
} from './realty-service';

// Zillow Service - Property valuations and data
export {
  ZillowService,
  getZillowService,
  resetZillowService,
} from './zillow-service';

export type {
  ZillowProperty,
  ZillowSearchResult,
  ZillowImages,
  ZillowSearchOptions,
  ZillowServiceConfig,
} from './zillow-service';

// Geographic APIs
// ----------------------------------------------------------

// Geoapify Service - Geocoding and nearby places
export {
  GeoapifyService,
  getGeoapifyService,
  resetGeoapifyService,
} from './geoapify-service';

export type {
  PlaceCategory,
  GeoapifyPlace,
  AmenitiesSummary,
  GeoapifyGeocodingResult,
  GeoapifyIsochrone,
  GeoapifyServiceConfig,
} from './geoapify-service';

// OpenStreetMap Service - Free geocoding
export {
  OSMService,
  getOSMService,
  resetOSMService,
} from './osm-service';

export type {
  NominatimResult,
  GeocodingResult as OSMGeocodingResult,
  OSMServiceConfig,
} from './osm-service';

// Mapbox Service - Geocoding and directions
export {
  MapboxService,
  getMapboxService,
  resetMapboxService,
} from './mapbox-service';

export type {
  GeocodingResult as MapboxGeocodingResult,
  IsochroneResult,
  DirectionsResult,
  StaticMapOptions,
  MapboxServiceConfig,
} from './mapbox-service';

// Government Data APIs (Free)
// ----------------------------------------------------------

// FBI Crime Data Service
export {
  FBICrimeService,
  getFBICrimeService,
  resetFBICrimeService,
} from './fbi-crime-service';

export type {
  OffenseType,
  CrimeData,
  CrimeSummary,
  FBICrimeServiceConfig,
} from './fbi-crime-service';

// BLS Service - Bureau of Labor Statistics
export {
  BLSService,
  getBLSService,
  resetBLSService,
} from './bls-service';

export type {
  BLSDataPoint,
  BLSSeries,
  EmploymentSummary,
  BLSServiceConfig,
} from './bls-service';

// FCC Service - Broadband availability
export {
  FCCService,
  getFCCService,
  resetFCCService,
} from './fcc-service';

export type {
  BroadbandTechnology,
  BroadbandProvider,
  BroadbandAvailability,
  CountyBroadbandStats,
  FCCServiceConfig,
} from './fcc-service';

// Environmental APIs (Free)
// ----------------------------------------------------------

// NOAA Service - Weather forecasts and alerts
export {
  NOAAService,
  getNOAAService,
  resetNOAAService,
} from './noaa-service';

export type {
  AlertSeverity,
  WeatherAlert,
  ForecastPeriod,
  LocationWeather,
  ClimateRiskAssessment,
  NOAAServiceConfig,
} from './noaa-service';

// Elevation Service - Open-Elevation for flood risk
export {
  ElevationService,
  getElevationService,
  resetElevationService,
} from './elevation-service';

export type {
  ElevationPoint,
  ElevationAnalysis,
  ElevationServiceConfig,
} from './elevation-service';

// Climate Service - Open-Meteo weather and climate
export {
  ClimateService,
  getClimateService,
  resetClimateService,
} from './climate-service';

export type {
  CurrentWeather,
  DailyForecast,
  ClimateNormals,
  ClimateSummary,
  ClimateServiceConfig,
} from './climate-service';

// AI APIs
// ----------------------------------------------------------

// OpenAI Service - AI-powered property analysis
export {
  OpenAIService,
  getOpenAIService,
  resetOpenAIService,
} from './openai-service';

export type {
  MessageRole,
  ChatMessage,
  ChatCompletionOptions,
  ChatCompletion,
  PropertyAnalysisRequest,
  PropertyAnalysis,
  OpenAIServiceConfig,
} from './openai-service';

// Report Orchestrator
// ----------------------------------------------------------

// Central coordinator for all API services
export {
  ReportOrchestrator,
  getReportOrchestrator,
  resetReportOrchestrator,
} from './report-orchestrator';

export type {
  EnrichedPropertyData,
  ReportOptions,
} from './report-orchestrator';

// Unified Report Orchestrator
// ----------------------------------------------------------

// Complete property report generation with all analysis engines
export {
  generateFullReport,
  generateMockReport,
} from './unified-report-orchestrator';

export type {
  UnifiedReportInput,
  UnifiedReportOptions,
  UnifiedReportResult,
} from './unified-report-orchestrator';
