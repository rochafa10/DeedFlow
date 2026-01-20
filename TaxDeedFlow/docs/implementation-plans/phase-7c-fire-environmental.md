# Phase 7C: Wildfire, Environmental & Radon Risk Analysis

## Overview

This implementation plan covers fire-related and environmental hazard analysis for the Tax Deed Flow risk assessment engine. It includes:

1. **Wildfire Risk Analysis** - NASA FIRMS integration, WUI zones, vegetation/fuel types
2. **Environmental Risk Analysis** - EPA Envirofacts (Superfund, UST, TRI, Brownfields)
3. **Radon Risk Analysis** - EPA radon zones, geology-based risk assessment

These three risk types share common characteristics:
- Environmental health and safety concerns
- Geographic and geological basis for risk determination
- Specialized insurance and mitigation requirements
- Phase I ESA considerations for environmental risks

## Data Sources

| Risk Type | Primary Source | API/Data |
|-----------|---------------|----------|
| Wildfire | NASA FIRMS | Fire history, active fires |
| Wildfire | USFS | Wildfire risk classes, WUI zones |
| Environmental | EPA Envirofacts | Superfund (CERCLIS), UST, TRI, ACRES |
| Environmental | AirNow | Air quality index |
| Radon | EPA | Radon zone maps (1, 2, 3) |
| Radon | State Programs | County-level radon data |

---

## TypeScript Interfaces

```typescript
// src/types/risk.ts

// ============================================
// WILDFIRE RISK ANALYSIS
// ============================================

export interface WildfireRiskAnalysis {
  riskLevel: 'low' | 'moderate' | 'high' | 'very_high' | 'extreme';
  riskClass: string;               // USFS risk class (1-6)
  fireHistoryCount: number;        // Total fires within radius
  nearbyFiresLast5Years: number;   // Fires in last 5 years
  vegetationType: string;          // Grass, chaparral, timber, etc.
  fuelLoad: 'light' | 'moderate' | 'heavy' | 'extreme';
  distanceToWildland: number;      // Miles to wildland interface
  withinWUI: boolean;              // Wildland-Urban Interface
  fireSeasonLength: string;        // e.g., "June-November"
  defensibleSpaceRequired: boolean;
  defensibleSpaceStatus?: string;
  estimatedWildfireInsurance: number;
  fairPlanRequired: boolean;       // California FAIR Plan
  emberZone: boolean;              // Ember transport risk
  mitigationOptions: WildfireMitigation[];
}

export interface WildfireMitigation extends RiskMitigation {
  riskType: 'wildfire';
  action: string;
  defensibleSpaceZone?: number;    // Zone 0, 1, or 2
}

// ============================================
// ENVIRONMENTAL RISK ANALYSIS
// ============================================

export interface EnvironmentalRiskAnalysis {
  overallRisk: 'low' | 'moderate' | 'high' | 'very_high';

  // Superfund/NPL Sites
  nearbySuperfundSites: SuperfundSite[];
  withinSuperfundRadius: boolean;
  closestSuperfundDistance?: number;

  // Underground Storage Tanks (UST)
  nearbyUSTs: USTSite[];
  activeUSTsNearby: number;
  closedUSTsNearby: number;
  leakingUSTsNearby: number;

  // Brownfields
  nearbyBrownfields: BrownfieldSite[];

  // Toxic Release Inventory (TRI)
  nearbyTRIFacilities: TRIFacility[];

  // Air Quality
  airQualityIndex?: number;
  airQualityConcerns: string[];

  // Water Quality
  drinkingWaterViolations?: number;
  groundwaterContamination: boolean;

  // Phase I ESA Recommendation
  phaseIRecommended: boolean;
  phaseIUrgency: 'optional' | 'recommended' | 'strongly_recommended' | 'required';

  mitigationOptions: EnvironmentalMitigation[];
}

export interface SuperfundSite {
  name: string;
  epaId: string;
  distance: number;                // Miles from property
  status: 'proposed' | 'final' | 'deleted' | 'partial_delete';
  contaminants: string[];
  cleanupStatus: string;
}

export interface USTSite {
  facilityName: string;
  distance: number;
  status: 'active' | 'closed' | 'leaking';
  tankCount: number;
  substance: string;               // Petroleum, chemicals, etc.
  lastInspection?: string;
}

export interface BrownfieldSite {
  name: string;
  distance: number;
  assessmentStatus: string;
  contaminantTypes: string[];
}

export interface TRIFacility {
  name: string;
  distance: number;
  chemicals: string[];
  totalReleases: number;           // Pounds per year
  riskScore: number;
}

export interface EnvironmentalMitigation extends RiskMitigation {
  riskType: 'environmental';
  action: string;
  remediationType?: string;
}

// ============================================
// RADON RISK ANALYSIS
// ============================================

export interface RadonRiskAnalysis {
  epaZone: 1 | 2 | 3;              // EPA zone (1 = highest)
  zoneDescription: string;
  predictedIndoorLevel: number;    // pCi/L
  predictedLevelCategory: 'low' | 'moderate' | 'high';
  countyAverage?: number;          // pCi/L
  stateAverage?: number;           // pCi/L
  aboveActionLevel: boolean;       // EPA action level is 4 pCi/L
  testingRecommended: boolean;
  mitigationRequired: boolean;
  estimatedMitigationCost: number;
  geologyContributors: string[];   // Uranium-bearing rocks, etc.
  mitigationOptions: RadonMitigation[];
}

export interface RadonMitigation extends RiskMitigation {
  riskType: 'radon';
  action: string;
  systemType?: string;             // ASD, RRNC, Sealing, etc.
}

// ============================================
// BASE MITIGATION TYPE
// ============================================

export interface RiskMitigation {
  riskType: string;
  action: string;
  estimatedCost: { min: number; max: number };
  effectiveness: 'low' | 'moderate' | 'high' | 'very_high';
  timeframe: string;
  insuranceImpact?: string;
  priority: 'optional' | 'recommended' | 'critical';
}
```

---

## API Services

### NASA FIRMS Service

```typescript
// src/lib/api-services/nasa-firms-service.ts

interface NASAFire {
  latitude: number;
  longitude: number;
  acq_date: string;
  acq_time: string;
  confidence: string;
  bright_ti4: number;
  frp: number;           // Fire radiative power
  daynight: 'D' | 'N';
}

export class NASAFIRMSService {
  private baseUrl = 'https://firms.modaps.eosdis.nasa.gov/api';
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.NASA_FIRMS_API_KEY || '';
  }

  /**
   * Get recent fire detections within radius
   * @param lat Latitude
   * @param lng Longitude
   * @param radiusMiles Search radius in miles
   * @param days Number of days to look back (max 365)
   */
  async getRecentFires(
    lat: number,
    lng: number,
    radiusMiles: number,
    days: number
  ): Promise<NASAFire[]> {
    try {
      // NASA FIRMS uses MODIS/VIIRS satellite data
      const url = `${this.baseUrl}/area/csv/${this.apiKey}/VIIRS_SNPP_NRT/${lat},${lng}/${radiusMiles}/${days}`;

      const response = await fetch(url);
      if (!response.ok) {
        console.warn('NASA FIRMS API error:', response.status);
        return [];
      }

      const csvData = await response.text();
      return this.parseCSV(csvData);
    } catch (error) {
      console.error('NASA FIRMS service error:', error);
      return [];
    }
  }

  /**
   * Get fire history for area (up to 5 years)
   * Uses archived data
   */
  async getFireHistory(
    lat: number,
    lng: number,
    radiusMiles: number,
    years: number
  ): Promise<NASAFire[]> {
    const fires: NASAFire[] = [];

    // Query each year separately for archived data
    for (let year = 0; year < years; year++) {
      const yearFires = await this.getArchiveYearFires(lat, lng, radiusMiles, year);
      fires.push(...yearFires);
    }

    return fires;
  }

  private async getArchiveYearFires(
    lat: number,
    lng: number,
    radiusMiles: number,
    yearsAgo: number
  ): Promise<NASAFire[]> {
    // In production, would query NASA FIRMS archive API
    // Returns historical fire data
    return [];
  }

  private parseCSV(csvData: string): NASAFire[] {
    const lines = csvData.trim().split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',');
    const fires: NASAFire[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const fire: any = {};

      headers.forEach((header, index) => {
        fire[header.toLowerCase()] = values[index];
      });

      fires.push({
        latitude: parseFloat(fire.latitude),
        longitude: parseFloat(fire.longitude),
        acq_date: fire.acq_date,
        acq_time: fire.acq_time,
        confidence: fire.confidence,
        bright_ti4: parseFloat(fire.bright_ti4),
        frp: parseFloat(fire.frp),
        daynight: fire.daynight,
      });
    }

    return fires;
  }
}
```

### EPA Envirofacts Service

```typescript
// src/lib/api-services/epa-envirofacts-service.ts

interface EPAQueryParams {
  latitude: number;
  longitude: number;
  radiusMiles: number;
}

export class EPAEnvirofactsService {
  private baseUrl = 'https://enviro.epa.gov/enviro/efservice';

  /**
   * Query Superfund (CERCLIS) sites
   */
  async querySuperfundSites(
    lat: number,
    lng: number,
    radiusMiles: number = 5
  ): Promise<SuperfundSite[]> {
    try {
      // EPA Envirofacts REST API
      const url = `${this.baseUrl}/CERCLIS/LATITUDE/${lat}/LONGITUDE/${lng}/radius/${radiusMiles}/JSON`;

      const response = await fetch(url);
      if (!response.ok) return [];

      const data = await response.json();
      return this.mapSuperfundData(data, lat, lng);
    } catch (error) {
      console.error('EPA Superfund query error:', error);
      return [];
    }
  }

  /**
   * Query Underground Storage Tanks (UST)
   */
  async queryUSTSites(
    lat: number,
    lng: number,
    radiusMiles: number = 1
  ): Promise<USTSite[]> {
    try {
      const url = `${this.baseUrl}/UST/LATITUDE/${lat}/LONGITUDE/${lng}/radius/${radiusMiles}/JSON`;

      const response = await fetch(url);
      if (!response.ok) return [];

      const data = await response.json();
      return this.mapUSTData(data, lat, lng);
    } catch (error) {
      console.error('EPA UST query error:', error);
      return [];
    }
  }

  /**
   * Query Brownfield sites (ACRES database)
   */
  async queryBrownfieldSites(
    lat: number,
    lng: number,
    radiusMiles: number = 3
  ): Promise<BrownfieldSite[]> {
    try {
      const url = `${this.baseUrl}/ACRES/LATITUDE/${lat}/LONGITUDE/${lng}/radius/${radiusMiles}/JSON`;

      const response = await fetch(url);
      if (!response.ok) return [];

      const data = await response.json();
      return this.mapBrownfieldData(data, lat, lng);
    } catch (error) {
      console.error('EPA Brownfields query error:', error);
      return [];
    }
  }

  /**
   * Query Toxic Release Inventory (TRI) facilities
   */
  async queryTRIFacilities(
    lat: number,
    lng: number,
    radiusMiles: number = 5
  ): Promise<TRIFacility[]> {
    try {
      const url = `${this.baseUrl}/TRI_FACILITY/LATITUDE/${lat}/LONGITUDE/${lng}/radius/${radiusMiles}/JSON`;

      const response = await fetch(url);
      if (!response.ok) return [];

      const data = await response.json();
      return this.mapTRIData(data, lat, lng);
    } catch (error) {
      console.error('EPA TRI query error:', error);
      return [];
    }
  }

  /**
   * Query AirNow for current air quality
   */
  async queryAirQuality(
    lat: number,
    lng: number
  ): Promise<{ aqi: number; concerns: string[] } | null> {
    try {
      const apiKey = process.env.AIRNOW_API_KEY;
      if (!apiKey) return null;

      const url = `https://www.airnowapi.org/aq/observation/latLong/current/?format=JSON&latitude=${lat}&longitude=${lng}&distance=25&API_KEY=${apiKey}`;

      const response = await fetch(url);
      if (!response.ok) return null;

      const data = await response.json();
      return this.parseAirQualityData(data);
    } catch (error) {
      console.error('AirNow query error:', error);
      return null;
    }
  }

  // Helper methods to map API data to our interfaces
  private mapSuperfundData(data: any[], lat: number, lng: number): SuperfundSite[] {
    return data.map(site => ({
      name: site.SITE_NAME || 'Unknown',
      epaId: site.EPA_ID || '',
      distance: this.calculateDistance(lat, lng, site.LATITUDE, site.LONGITUDE),
      status: this.mapNPLStatus(site.NPL_STATUS),
      contaminants: site.CONTAMINANTS?.split(',') || [],
      cleanupStatus: site.CLEANUP_STATUS || 'Unknown',
    })).sort((a, b) => a.distance - b.distance);
  }

  private mapUSTData(data: any[], lat: number, lng: number): USTSite[] {
    return data.map(ust => ({
      facilityName: ust.FACILITY_NAME || 'Unknown',
      distance: this.calculateDistance(lat, lng, ust.LATITUDE, ust.LONGITUDE),
      status: this.mapUSTStatus(ust.STATUS),
      tankCount: ust.TANK_COUNT || 1,
      substance: ust.SUBSTANCE || 'Petroleum',
      lastInspection: ust.LAST_INSPECTION,
    })).sort((a, b) => a.distance - b.distance);
  }

  private mapBrownfieldData(data: any[], lat: number, lng: number): BrownfieldSite[] {
    return data.map(site => ({
      name: site.SITE_NAME || 'Unknown',
      distance: this.calculateDistance(lat, lng, site.LATITUDE, site.LONGITUDE),
      assessmentStatus: site.ASSESSMENT_STATUS || 'Unknown',
      contaminantTypes: site.CONTAMINANT_TYPES?.split(',') || [],
    })).sort((a, b) => a.distance - b.distance);
  }

  private mapTRIData(data: any[], lat: number, lng: number): TRIFacility[] {
    return data.map(facility => ({
      name: facility.FACILITY_NAME || 'Unknown',
      distance: this.calculateDistance(lat, lng, facility.LATITUDE, facility.LONGITUDE),
      chemicals: facility.CHEMICALS?.split(',') || [],
      totalReleases: facility.TOTAL_RELEASES || 0,
      riskScore: this.calculateTRIRiskScore(facility),
    })).sort((a, b) => a.distance - b.distance);
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    // Haversine formula for distance in miles
    const R = 3959; // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return Math.round(R * c * 100) / 100;
  }

  private mapNPLStatus(status: string): SuperfundSite['status'] {
    const statusLower = (status || '').toLowerCase();
    if (statusLower.includes('proposed')) return 'proposed';
    if (statusLower.includes('final')) return 'final';
    if (statusLower.includes('deleted')) return 'deleted';
    if (statusLower.includes('partial')) return 'partial_delete';
    return 'final';
  }

  private mapUSTStatus(status: string): USTSite['status'] {
    const statusLower = (status || '').toLowerCase();
    if (statusLower.includes('leak')) return 'leaking';
    if (statusLower.includes('closed')) return 'closed';
    return 'active';
  }

  private calculateTRIRiskScore(facility: any): number {
    // Simple risk score based on releases
    const releases = facility.TOTAL_RELEASES || 0;
    if (releases > 100000) return 100;
    if (releases > 10000) return 75;
    if (releases > 1000) return 50;
    if (releases > 100) return 25;
    return 10;
  }

  private parseAirQualityData(data: any[]): { aqi: number; concerns: string[] } | null {
    if (!data || data.length === 0) return null;

    const maxAQI = Math.max(...data.map(d => d.AQI || 0));
    const concerns: string[] = [];

    data.forEach(reading => {
      if (reading.AQI > 100) {
        concerns.push(`${reading.ParameterName}: ${reading.Category.Name}`);
      }
    });

    return { aqi: maxAQI, concerns };
  }
}
```

---

## Implementation: Wildfire Risk Analysis

```typescript
// src/lib/analysis/risk/wildfireRisk.ts

import { NASAFIRMSService } from '@/lib/api-services/nasa-firms-service';
import type { WildfireRiskAnalysis, WildfireMitigation } from '@/types/risk';

// USFS Wildfire Risk Classifications
const WILDFIRE_RISK_CLASSES = {
  1: { class: 'Very Low', level: 'low', fuelLoad: 'light' },
  2: { class: 'Low', level: 'low', fuelLoad: 'light' },
  3: { class: 'Moderate', level: 'moderate', fuelLoad: 'moderate' },
  4: { class: 'High', level: 'high', fuelLoad: 'heavy' },
  5: { class: 'Very High', level: 'very_high', fuelLoad: 'heavy' },
  6: { class: 'Extreme', level: 'extreme', fuelLoad: 'extreme' },
};

// Vegetation/fuel types and their risk contribution
const FUEL_TYPES = {
  'grass': { load: 'light', spreadRate: 'very_high', intensity: 'low' },
  'shrub_chaparral': { load: 'heavy', spreadRate: 'high', intensity: 'high' },
  'timber_understory': { load: 'moderate', spreadRate: 'moderate', intensity: 'moderate' },
  'timber_litter': { load: 'moderate', spreadRate: 'low', intensity: 'high' },
  'slash': { load: 'extreme', spreadRate: 'high', intensity: 'extreme' },
  'urban': { load: 'light', spreadRate: 'low', intensity: 'variable' },
};

// States requiring FAIR Plan (California Specific)
const FAIR_PLAN_STATES = ['CA'];

// States with significant Wildland-Urban Interface
const WUI_STATES = ['CA', 'CO', 'OR', 'WA', 'AZ', 'NM', 'MT', 'ID', 'NV', 'UT', 'TX'];

export async function analyzeWildfireRisk(
  latitude: number,
  longitude: number,
  state: string
): Promise<WildfireRiskAnalysis> {
  const nasaService = new NASAFIRMSService();

  // Get fire history from NASA FIRMS
  const [recentFires, fireHistory, wuiData] = await Promise.all([
    nasaService.getRecentFires(latitude, longitude, 10, 365),
    nasaService.getFireHistory(latitude, longitude, 25, 5),
    checkWUIStatus(latitude, longitude),
  ]);

  // Calculate fire counts
  const fireCount = recentFires.length;
  const historyCount = fireHistory.length;

  // Determine vegetation/fuel type
  const vegetationType = getVegetationType(latitude, longitude, state);
  const fuelInfo = FUEL_TYPES[vegetationType] || FUEL_TYPES.urban;

  // Calculate risk level
  const { riskLevel, riskClass } = calculateWildfireRiskLevel(
    historyCount,
    state,
    wuiData.withinWUI,
    fuelInfo.load
  );

  // Check if in ember transport zone (within 1 mile of high-risk vegetation)
  const emberZone = wuiData.withinWUI || historyCount > 3;

  // Determine if FAIR Plan might be needed
  const fairPlanRequired =
    FAIR_PLAN_STATES.includes(state.toUpperCase()) &&
    (riskLevel === 'extreme' || riskLevel === 'very_high');

  // Calculate insurance estimate
  const estimatedInsurance = calculateWildfireInsurance(riskLevel, fairPlanRequired);

  // Generate mitigation options
  const mitigationOptions = generateWildfireMitigations(
    riskLevel,
    wuiData.withinWUI,
    vegetationType
  );

  return {
    riskLevel,
    riskClass,
    fireHistoryCount: historyCount,
    nearbyFiresLast5Years: historyCount,
    vegetationType: getVegetationDescription(vegetationType),
    fuelLoad: fuelInfo.load as WildfireRiskAnalysis['fuelLoad'],
    distanceToWildland: wuiData.distanceToWildland,
    withinWUI: wuiData.withinWUI,
    fireSeasonLength: getFireSeasonLength(state),
    defensibleSpaceRequired: riskLevel !== 'low',
    estimatedWildfireInsurance: estimatedInsurance,
    fairPlanRequired,
    emberZone,
    mitigationOptions,
  };
}

function calculateWildfireRiskLevel(
  historyCount: number,
  state: string,
  withinWUI: boolean,
  fuelLoad: string
): { riskLevel: WildfireRiskAnalysis['riskLevel']; riskClass: string } {
  let score = 0;

  // Fire history (0-40 points)
  if (historyCount > 10) score += 40;
  else if (historyCount > 5) score += 30;
  else if (historyCount > 2) score += 20;
  else if (historyCount > 0) score += 10;

  // WUI status (0-20 points)
  if (withinWUI) score += 20;

  // Fuel load (0-25 points)
  const fuelScores: Record<string, number> = { light: 5, moderate: 15, heavy: 20, extreme: 25 };
  score += fuelScores[fuelLoad] || 10;

  // State baseline (0-15 points)
  if (['CA'].includes(state.toUpperCase())) score += 15;
  else if (['OR', 'WA', 'CO', 'AZ'].includes(state.toUpperCase())) score += 10;
  else if (WUI_STATES.includes(state.toUpperCase())) score += 5;

  // Determine risk level
  let riskLevel: WildfireRiskAnalysis['riskLevel'];
  let riskClass: string;

  if (score >= 80) {
    riskLevel = 'extreme';
    riskClass = WILDFIRE_RISK_CLASSES[6].class;
  } else if (score >= 60) {
    riskLevel = 'very_high';
    riskClass = WILDFIRE_RISK_CLASSES[5].class;
  } else if (score >= 40) {
    riskLevel = 'high';
    riskClass = WILDFIRE_RISK_CLASSES[4].class;
  } else if (score >= 20) {
    riskLevel = 'moderate';
    riskClass = WILDFIRE_RISK_CLASSES[3].class;
  } else {
    riskLevel = 'low';
    riskClass = WILDFIRE_RISK_CLASSES[2].class;
  }

  return { riskLevel, riskClass };
}

async function checkWUIStatus(lat: number, lng: number): Promise<{
  withinWUI: boolean;
  distanceToWildland: number;
}> {
  // In production, would query USFS WUI data
  // Simplified implementation
  return {
    withinWUI: false, // Would be determined by actual WUI boundary check
    distanceToWildland: 5, // miles - would be calculated from actual data
  };
}

function getVegetationType(lat: number, lng: number, state: string): string {
  // Simplified vegetation classification
  // In production, would use LANDFIRE or similar data
  const stateUpper = state.toUpperCase();

  if (['CA'].includes(stateUpper)) {
    if (lat > 37) return 'timber_understory';
    return 'shrub_chaparral';
  }
  if (['OR', 'WA', 'MT', 'ID'].includes(stateUpper)) return 'timber_understory';
  if (['AZ', 'NM', 'NV', 'UT', 'CO'].includes(stateUpper)) return 'shrub_chaparral';
  if (['TX', 'OK', 'KS', 'NE'].includes(stateUpper)) return 'grass';
  if (['FL', 'GA', 'SC', 'NC'].includes(stateUpper)) return 'timber_litter';
  return 'urban';
}

function getVegetationDescription(vegType: string): string {
  const descriptions: Record<string, string> = {
    'grass': 'Grassland - Fast spreading, low intensity fires',
    'shrub_chaparral': 'Chaparral/Shrubland - High intensity, difficult to control',
    'timber_understory': 'Timber with understory - Moderate spread, can crown',
    'timber_litter': 'Timber with litter - Surface fires, occasional crowning',
    'slash': 'Slash/Logging debris - Extreme intensity possible',
    'urban': 'Urban/Developed - Variable risk based on landscaping',
  };
  return descriptions[vegType] || 'Mixed vegetation';
}

function getFireSeasonLength(state: string): string {
  const seasons: Record<string, string> = {
    'CA': 'Year-round (Peak: June-November)',
    'OR': 'June-October',
    'WA': 'July-September',
    'CO': 'June-September (increasing due to drought)',
    'AZ': 'May-July (pre-monsoon peak)',
    'NM': 'April-July',
    'TX': 'Year-round (Peak: Winter/Spring)',
    'MT': 'July-September',
    'ID': 'July-September',
    'FL': 'Year-round (Peak: Winter/Spring drought)',
    'NV': 'June-October',
    'UT': 'June-September',
  };
  return seasons[state.toUpperCase()] || 'Varies by conditions';
}

function calculateWildfireInsurance(
  riskLevel: WildfireRiskAnalysis['riskLevel'],
  fairPlanRequired: boolean
): number {
  // Annual premium estimates
  const premiums: Record<string, number> = {
    'low': 0,
    'moderate': 500,
    'high': 1500,
    'very_high': 3500,
    'extreme': 6000,
  };

  let premium = premiums[riskLevel];

  // FAIR Plan adds ~50% to premiums
  if (fairPlanRequired) {
    premium *= 1.5;
  }

  return Math.round(premium);
}

function generateWildfireMitigations(
  riskLevel: string,
  withinWUI: boolean,
  vegetationType: string
): WildfireMitigation[] {
  const mitigations: WildfireMitigation[] = [];

  // Defensible space - Zone 0 (0-5 feet)
  mitigations.push({
    riskType: 'wildfire',
    action: 'Create Zone 0 (0-5 feet): Remove all combustibles from immediate structure area',
    estimatedCost: { min: 500, max: 2000 },
    effectiveness: 'very_high',
    timeframe: '1-2 days',
    insuranceImpact: 'May qualify for insurance discounts',
    priority: riskLevel === 'low' ? 'optional' : 'critical',
    defensibleSpaceZone: 0,
  });

  // Defensible space - Zone 1 (5-30 feet)
  if (riskLevel !== 'low') {
    mitigations.push({
      riskType: 'wildfire',
      action: 'Create Zone 1 (5-30 feet): Lean, clean, and green landscaping with irrigated plants',
      estimatedCost: { min: 2000, max: 10000 },
      effectiveness: 'very_high',
      timeframe: '1-2 weeks',
      insuranceImpact: 'Required for insurance in many high-risk areas',
      priority: 'critical',
      defensibleSpaceZone: 1,
    });
  }

  // Defensible space - Zone 2 (30-100 feet)
  if (riskLevel === 'high' || riskLevel === 'very_high' || riskLevel === 'extreme') {
    mitigations.push({
      riskType: 'wildfire',
      action: 'Create Zone 2 (30-100 feet): Reduce fuel load, create spacing between vegetation',
      estimatedCost: { min: 5000, max: 25000 },
      effectiveness: 'high',
      timeframe: '2-4 weeks',
      priority: 'critical',
      defensibleSpaceZone: 2,
    });
  }

  // Ember-resistant vents
  if (withinWUI || riskLevel !== 'low') {
    mitigations.push({
      riskType: 'wildfire',
      action: 'Install ember-resistant vents (1/8" mesh or smaller)',
      estimatedCost: { min: 500, max: 2000 },
      effectiveness: 'very_high',
      timeframe: '1 day',
      insuranceImpact: 'May be required for insurance',
      priority: riskLevel === 'extreme' ? 'critical' : 'recommended',
    });
  }

  // Fire-resistant roofing
  if (riskLevel === 'high' || riskLevel === 'very_high' || riskLevel === 'extreme') {
    mitigations.push({
      riskType: 'wildfire',
      action: 'Replace roofing with Class A fire-rated material',
      estimatedCost: { min: 8000, max: 25000 },
      effectiveness: 'very_high',
      timeframe: '1-2 weeks',
      insuranceImpact: 'Often required for coverage in high-risk areas',
      priority: 'critical',
    });
  }

  // Enclosed eaves
  mitigations.push({
    riskType: 'wildfire',
    action: 'Box in or enclose open eaves',
    estimatedCost: { min: 1500, max: 5000 },
    effectiveness: 'high',
    timeframe: '2-3 days',
    priority: riskLevel === 'low' ? 'optional' : 'recommended',
  });

  // Fire-resistant siding
  if (riskLevel !== 'low') {
    mitigations.push({
      riskType: 'wildfire',
      action: 'Install fire-resistant siding (stucco, fiber cement, brick)',
      estimatedCost: { min: 10000, max: 40000 },
      effectiveness: 'high',
      timeframe: '1-2 weeks',
      priority: 'recommended',
    });
  }

  // Dual-pane windows
  mitigations.push({
    riskType: 'wildfire',
    action: 'Install dual-pane tempered glass windows',
    estimatedCost: { min: 5000, max: 15000 },
    effectiveness: 'high',
    timeframe: '1-3 days',
    priority: riskLevel === 'extreme' ? 'critical' : 'recommended',
  });

  return mitigations;
}
```

---

## Implementation: Environmental Risk Analysis

```typescript
// src/lib/analysis/risk/environmentalRisk.ts

import { EPAEnvirofactsService } from '@/lib/api-services/epa-envirofacts-service';
import type {
  EnvironmentalRiskAnalysis,
  EnvironmentalMitigation,
  SuperfundSite,
  USTSite,
  BrownfieldSite,
  TRIFacility
} from '@/types/risk';

// Risk distance thresholds (in miles)
const RISK_DISTANCES = {
  superfund: {
    immediate: 0.25,  // Very high risk
    near: 1.0,        // High risk
    moderate: 3.0,    // Moderate risk
    low: 5.0,         // Low risk
  },
  ust: {
    immediate: 0.1,
    near: 0.25,
    moderate: 0.5,
    low: 1.0,
  },
  tri: {
    immediate: 0.5,
    near: 1.0,
    moderate: 3.0,
    low: 5.0,
  },
};

export async function analyzeEnvironmentalRisk(
  latitude: number,
  longitude: number,
  state: string
): Promise<EnvironmentalRiskAnalysis> {
  const epaService = new EPAEnvirofactsService();

  // Query all environmental databases
  const [superfundSites, ustSites, brownfieldSites, triFacilities, airQuality] =
    await Promise.all([
      epaService.querySuperfundSites(latitude, longitude),
      epaService.queryUSTSites(latitude, longitude),
      epaService.queryBrownfieldSites(latitude, longitude),
      epaService.queryTRIFacilities(latitude, longitude),
      epaService.queryAirQuality(latitude, longitude),
    ]);

  // Determine if within concerning distance of Superfund
  const closestSuperfund = superfundSites[0];
  const withinSuperfundRadius = closestSuperfund &&
    closestSuperfund.distance < RISK_DISTANCES.superfund.moderate;

  // Count UST types
  const activeUSTs = ustSites.filter(u => u.status === 'active').length;
  const closedUSTs = ustSites.filter(u => u.status === 'closed').length;
  const leakingUSTs = ustSites.filter(u => u.status === 'leaking').length;

  // Calculate overall risk
  const overallRisk = calculateEnvironmentalRiskLevel(
    superfundSites,
    ustSites,
    brownfieldSites,
    triFacilities
  );

  // Determine Phase I ESA recommendation
  const { phaseIRecommended, phaseIUrgency } = determinePhaseIRecommendation(
    overallRisk,
    superfundSites,
    ustSites,
    brownfieldSites
  );

  // Generate mitigations
  const mitigationOptions = generateEnvironmentalMitigations(
    overallRisk,
    phaseIUrgency,
    superfundSites,
    ustSites
  );

  return {
    overallRisk,
    nearbySuperfundSites: superfundSites,
    withinSuperfundRadius,
    closestSuperfundDistance: closestSuperfund?.distance,
    nearbyUSTs: ustSites,
    activeUSTsNearby: activeUSTs,
    closedUSTsNearby: closedUSTs,
    leakingUSTsNearby: leakingUSTs,
    nearbyBrownfields: brownfieldSites,
    nearbyTRIFacilities: triFacilities,
    airQualityIndex: airQuality?.aqi,
    airQualityConcerns: airQuality?.concerns || [],
    drinkingWaterViolations: undefined, // Would query SDWIS
    groundwaterContamination: leakingUSTs > 0 || withinSuperfundRadius,
    phaseIRecommended,
    phaseIUrgency,
    mitigationOptions,
  };
}

function calculateEnvironmentalRiskLevel(
  superfundSites: SuperfundSite[],
  ustSites: USTSite[],
  brownfieldSites: BrownfieldSite[],
  triFacilities: TRIFacility[]
): 'low' | 'moderate' | 'high' | 'very_high' {
  let score = 0;

  // Superfund proximity (highest weight)
  if (superfundSites.length > 0) {
    const closest = superfundSites[0].distance;
    if (closest < 0.25) score += 50;
    else if (closest < 1.0) score += 35;
    else if (closest < 3.0) score += 20;
    else if (closest < 5.0) score += 10;
  }

  // Leaking USTs
  const leakingUSTs = ustSites.filter(u => u.status === 'leaking').length;
  if (leakingUSTs > 0) {
    score += leakingUSTs * 15; // 15 points per leaking tank nearby
  }

  // Active USTs nearby
  const activeUSTs = ustSites.filter(u => u.status === 'active' && u.distance < 0.25).length;
  score += activeUSTs * 5;

  // TRI facilities
  const nearbyTRI = triFacilities.filter(t => t.distance < 1.0).length;
  score += nearbyTRI * 10;

  // Brownfields
  const nearbyBrownfields = brownfieldSites.filter(b => b.distance < 0.5).length;
  score += nearbyBrownfields * 8;

  if (score >= 50) return 'very_high';
  if (score >= 30) return 'high';
  if (score >= 15) return 'moderate';
  return 'low';
}

function determinePhaseIRecommendation(
  overallRisk: string,
  superfundSites: SuperfundSite[],
  ustSites: USTSite[],
  brownfieldSites: BrownfieldSite[]
): { phaseIRecommended: boolean; phaseIUrgency: EnvironmentalRiskAnalysis['phaseIUrgency'] } {
  // Always recommend if near Superfund site
  if (superfundSites.length > 0 && superfundSites[0].distance < 3.0) {
    return {
      phaseIRecommended: true,
      phaseIUrgency: superfundSites[0].distance < 1.0 ? 'required' : 'strongly_recommended'
    };
  }

  // Recommend if leaking USTs nearby
  if (ustSites.some(u => u.status === 'leaking')) {
    return { phaseIRecommended: true, phaseIUrgency: 'strongly_recommended' };
  }

  // Recommend if nearby brownfields
  if (brownfieldSites.length > 0 && brownfieldSites[0].distance < 0.5) {
    return { phaseIRecommended: true, phaseIUrgency: 'recommended' };
  }

  // Based on overall risk
  if (overallRisk === 'very_high') {
    return { phaseIRecommended: true, phaseIUrgency: 'required' };
  }
  if (overallRisk === 'high') {
    return { phaseIRecommended: true, phaseIUrgency: 'strongly_recommended' };
  }
  if (overallRisk === 'moderate') {
    return { phaseIRecommended: true, phaseIUrgency: 'recommended' };
  }

  return { phaseIRecommended: false, phaseIUrgency: 'optional' };
}

function generateEnvironmentalMitigations(
  overallRisk: string,
  phaseIUrgency: string,
  superfundSites: SuperfundSite[],
  ustSites: USTSite[]
): EnvironmentalMitigation[] {
  const mitigations: EnvironmentalMitigation[] = [];

  // Phase I ESA
  if (phaseIUrgency !== 'optional') {
    mitigations.push({
      riskType: 'environmental',
      action: 'Conduct Phase I Environmental Site Assessment (ESA)',
      estimatedCost: { min: 2000, max: 5000 },
      effectiveness: 'very_high',
      timeframe: '2-4 weeks',
      insuranceImpact: 'Required for most commercial lending',
      priority: phaseIUrgency === 'required' ? 'critical' :
               phaseIUrgency === 'strongly_recommended' ? 'critical' : 'recommended',
    });
  }

  // Phase II if Phase I indicates concerns
  if (overallRisk === 'high' || overallRisk === 'very_high') {
    mitigations.push({
      riskType: 'environmental',
      action: 'May need Phase II ESA (soil/groundwater sampling) if Phase I identifies concerns',
      estimatedCost: { min: 10000, max: 50000 },
      effectiveness: 'very_high',
      timeframe: '4-8 weeks',
      priority: 'recommended',
      remediationType: 'Investigation',
    });
  }

  // Groundwater testing
  if (ustSites.some(u => u.status === 'leaking') || superfundSites.length > 0) {
    mitigations.push({
      riskType: 'environmental',
      action: 'Test private well water (if applicable) for contamination',
      estimatedCost: { min: 200, max: 500 },
      effectiveness: 'high',
      timeframe: '1-2 weeks',
      priority: 'critical',
    });
  }

  // Vapor intrusion assessment
  if (overallRisk === 'high' || overallRisk === 'very_high') {
    mitigations.push({
      riskType: 'environmental',
      action: 'Assess vapor intrusion risk (subsurface contamination entering building)',
      estimatedCost: { min: 3000, max: 10000 },
      effectiveness: 'high',
      timeframe: '2-4 weeks',
      priority: 'recommended',
    });
  }

  // Environmental liability insurance
  mitigations.push({
    riskType: 'environmental',
    action: 'Consider environmental liability insurance (Pollution Legal Liability)',
    estimatedCost: { min: 1000, max: 5000 },
    effectiveness: 'moderate',
    timeframe: 'Immediate',
    insuranceImpact: 'Protects against unknown pre-existing contamination',
    priority: overallRisk === 'high' || overallRisk === 'very_high' ? 'recommended' : 'optional',
  });

  return mitigations;
}
```

---

## Implementation: Radon Risk Analysis

```typescript
// src/lib/analysis/risk/radonRisk.ts

import type { RadonRiskAnalysis, RadonMitigation } from '@/types/risk';

// EPA Radon Zones (1 = highest risk, 3 = lowest)
const EPA_RADON_ZONES = {
  // Zone 1: Predicted average indoor radon screening level > 4 pCi/L
  zone1: {
    states: ['CO', 'CT', 'DE', 'IA', 'ID', 'IL', 'IN', 'KS', 'KY', 'MA', 'MD', 'ME', 'MN',
             'MT', 'ND', 'NE', 'NH', 'NJ', 'NM', 'NY', 'OH', 'PA', 'RI', 'SD', 'UT', 'VT',
             'WI', 'WV', 'WY'],
    avgLevel: 6.0,
    description: 'High radon potential. Average indoor levels typically exceed EPA action level of 4 pCi/L.',
  },
  // Zone 2: Predicted average 2-4 pCi/L
  zone2: {
    states: ['AL', 'AK', 'GA', 'MI', 'MO', 'NC', 'NV', 'OK', 'OR', 'SC', 'TN', 'VA', 'WA'],
    avgLevel: 3.0,
    description: 'Moderate radon potential. Average indoor levels typically 2-4 pCi/L.',
  },
  // Zone 3: Predicted average < 2 pCi/L
  zone3: {
    states: ['AR', 'AZ', 'CA', 'FL', 'HI', 'LA', 'MS', 'TX'],
    avgLevel: 1.5,
    description: 'Low radon potential. Average indoor levels typically below 2 pCi/L.',
  },
};

// EPA Action Level
const EPA_ACTION_LEVEL = 4.0; // pCi/L

// Geology contributing to radon
const RADON_GEOLOGY = {
  granite: { risk: 'very_high', description: 'Granite bedrock contains uranium' },
  shale: { risk: 'high', description: 'Black shales can contain uranium' },
  limestone: { risk: 'moderate', description: 'Limestone may contain radium' },
  sandstone: { risk: 'low', description: 'Generally lower uranium content' },
  volcanic: { risk: 'moderate', description: 'Some volcanic rocks contain uranium' },
};

export async function analyzeRadonRisk(
  latitude: number,
  longitude: number,
  state: string
): Promise<RadonRiskAnalysis> {
  const stateUpper = state.toUpperCase();

  // Determine EPA zone
  const zoneInfo = getEPAZone(stateUpper);

  // Get county-level data (would use EPA/state radon data in production)
  const countyData = await getCountyRadonData(latitude, longitude, state);

  // Estimate indoor level based on zone and local factors
  const predictedLevel = countyData?.avgLevel ?? zoneInfo.avgLevel;

  // Determine risk category
  let levelCategory: RadonRiskAnalysis['predictedLevelCategory'];
  if (predictedLevel >= 4.0) {
    levelCategory = 'high';
  } else if (predictedLevel >= 2.0) {
    levelCategory = 'moderate';
  } else {
    levelCategory = 'low';
  }

  // Determine if above action level
  const aboveActionLevel = predictedLevel >= EPA_ACTION_LEVEL;

  // Testing recommendation
  const testingRecommended = zoneInfo.zone === 1 || predictedLevel >= 2.0;

  // Mitigation requirement
  const mitigationRequired = aboveActionLevel;

  // Estimate mitigation cost
  const estimatedMitigationCost = aboveActionLevel ? 1200 : 0;

  // Geology factors
  const geologyContributors = getGeologyContributors(state, latitude, longitude);

  // Generate mitigations
  const mitigationOptions = generateRadonMitigations(
    predictedLevel,
    zoneInfo.zone,
    aboveActionLevel
  );

  return {
    epaZone: zoneInfo.zone as 1 | 2 | 3,
    zoneDescription: zoneInfo.description,
    predictedIndoorLevel: predictedLevel,
    predictedLevelCategory: levelCategory,
    countyAverage: countyData?.avgLevel,
    stateAverage: zoneInfo.avgLevel,
    aboveActionLevel,
    testingRecommended,
    mitigationRequired,
    estimatedMitigationCost,
    geologyContributors,
    mitigationOptions,
  };
}

function getEPAZone(state: string): { zone: number; avgLevel: number; description: string } {
  if (EPA_RADON_ZONES.zone1.states.includes(state)) {
    return { zone: 1, avgLevel: EPA_RADON_ZONES.zone1.avgLevel, description: EPA_RADON_ZONES.zone1.description };
  }
  if (EPA_RADON_ZONES.zone2.states.includes(state)) {
    return { zone: 2, avgLevel: EPA_RADON_ZONES.zone2.avgLevel, description: EPA_RADON_ZONES.zone2.description };
  }
  return { zone: 3, avgLevel: EPA_RADON_ZONES.zone3.avgLevel, description: EPA_RADON_ZONES.zone3.description };
}

async function getCountyRadonData(
  lat: number,
  lng: number,
  state: string
): Promise<{ avgLevel: number } | null> {
  // In production, would query:
  // - State radon programs
  // - EPA State Indoor Radon Grants (SIRG) data
  // - County health department data
  return null;
}

function getGeologyContributors(state: string, lat: number, lng: number): string[] {
  const contributors: string[] = [];
  const zone = getEPAZone(state);

  if (zone.zone === 1) {
    contributors.push('Uranium-bearing bedrock common in region');

    // State-specific geology
    if (['PA', 'NJ', 'NY'].includes(state)) {
      contributors.push('Reading Prong geological formation (high uranium granite)');
    }
    if (['CO', 'UT', 'NM'].includes(state)) {
      contributors.push('Colorado Plateau uranium deposits');
    }
    if (['MN', 'WI', 'MI'].includes(state)) {
      contributors.push('Glacial deposits over uranium-bearing formations');
    }
    if (['IA', 'IL', 'IN', 'OH'].includes(state)) {
      contributors.push('Devonian and Ordovician shales');
    }
  } else if (zone.zone === 2) {
    contributors.push('Moderate uranium content in local geology');
  }

  return contributors;
}

function generateRadonMitigations(
  predictedLevel: number,
  zone: number,
  aboveActionLevel: boolean
): RadonMitigation[] {
  const mitigations: RadonMitigation[] = [];

  // Radon testing (always recommend in Zone 1)
  mitigations.push({
    riskType: 'radon',
    action: 'Conduct short-term radon test (2-7 days) before purchase',
    estimatedCost: { min: 15, max: 50 },
    effectiveness: 'very_high',
    timeframe: '2-7 days',
    priority: zone === 1 || predictedLevel >= 2.0 ? 'critical' : 'recommended',
    systemType: 'Testing - Short-term',
  });

  // Long-term testing
  if (zone === 1) {
    mitigations.push({
      riskType: 'radon',
      action: 'Conduct long-term radon test (90+ days) for accurate year-round average',
      estimatedCost: { min: 25, max: 75 },
      effectiveness: 'very_high',
      timeframe: '3-12 months',
      priority: 'recommended',
      systemType: 'Testing - Long-term',
    });
  }

  // Active mitigation system
  if (aboveActionLevel) {
    mitigations.push({
      riskType: 'radon',
      action: 'Install Active Soil Depressurization (ASD) radon mitigation system',
      estimatedCost: { min: 800, max: 2500 },
      effectiveness: 'very_high',
      timeframe: '1 day',
      insuranceImpact: 'Can reduce radon levels by 99%',
      priority: 'critical',
      systemType: 'Active Soil Depressurization',
    });
  } else if (predictedLevel >= 2.0) {
    mitigations.push({
      riskType: 'radon',
      action: 'Consider radon mitigation system if testing confirms elevated levels',
      estimatedCost: { min: 800, max: 2500 },
      effectiveness: 'very_high',
      timeframe: '1 day',
      priority: 'recommended',
      systemType: 'Active Soil Depressurization',
    });
  }

  // Seal cracks
  mitigations.push({
    riskType: 'radon',
    action: 'Seal cracks and openings in foundation and basement floor',
    estimatedCost: { min: 100, max: 500 },
    effectiveness: 'moderate',
    timeframe: '1-2 days',
    priority: zone === 1 ? 'recommended' : 'optional',
    systemType: 'Sealing',
  });

  // Improve ventilation
  mitigations.push({
    riskType: 'radon',
    action: 'Improve basement/crawlspace ventilation',
    estimatedCost: { min: 200, max: 1000 },
    effectiveness: 'moderate',
    timeframe: '1-3 days',
    priority: 'optional',
    systemType: 'Ventilation',
  });

  // Radon-resistant new construction
  mitigations.push({
    riskType: 'radon',
    action: 'For new construction: Install radon-resistant features (RRNC)',
    estimatedCost: { min: 350, max: 750 },
    effectiveness: 'very_high',
    timeframe: 'During construction',
    insuranceImpact: 'Much cheaper than retrofitting later',
    priority: zone === 1 ? 'critical' : 'recommended',
    systemType: 'Radon-Resistant New Construction',
  });

  return mitigations;
}
```

---

## UI Components

### Wildfire Risk Card

```typescript
// src/components/risk/WildfireRiskCard.tsx

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Flame, TreePine, Shield } from 'lucide-react';
import type { WildfireRiskAnalysis } from '@/types/risk';

interface WildfireRiskCardProps {
  analysis: WildfireRiskAnalysis;
}

const riskColors = {
  low: 'bg-green-100 text-green-800',
  moderate: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  very_high: 'bg-red-100 text-red-800',
  extreme: 'bg-red-200 text-red-900',
};

export function WildfireRiskCard({ analysis }: WildfireRiskCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          Wildfire Risk
        </CardTitle>
        <Badge className={riskColors[analysis.riskLevel]}>
          {analysis.riskClass}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Fire History */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Fires (Last 5 Years)</p>
            <p className="text-2xl font-bold">{analysis.nearbyFiresLast5Years}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Distance to Wildland</p>
            <p className="text-2xl font-bold">{analysis.distanceToWildland} mi</p>
          </div>
        </div>

        {/* WUI Status */}
        {analysis.withinWUI && (
          <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            <span className="text-sm font-medium">
              Within Wildland-Urban Interface (WUI)
            </span>
          </div>
        )}

        {/* Vegetation Type */}
        <div className="flex items-center gap-2">
          <TreePine className="h-5 w-5 text-green-600" />
          <div>
            <p className="text-sm font-medium">{analysis.vegetationType}</p>
            <p className="text-xs text-muted-foreground">
              Fuel Load: {analysis.fuelLoad}
            </p>
          </div>
        </div>

        {/* Fire Season */}
        <div>
          <p className="text-sm text-muted-foreground">Fire Season</p>
          <p className="text-sm font-medium">{analysis.fireSeasonLength}</p>
        </div>

        {/* Ember Zone Warning */}
        {analysis.emberZone && (
          <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
            <Flame className="h-5 w-5 text-red-500" />
            <span className="text-sm">
              Ember transport zone - flying embers can ignite structures
            </span>
          </div>
        )}

        {/* Insurance */}
        <div className="pt-2 border-t">
          <div className="flex justify-between items-center">
            <span className="text-sm">Est. Wildfire Insurance</span>
            <span className="font-bold">
              ${analysis.estimatedWildfireInsurance.toLocaleString()}/yr
            </span>
          </div>
          {analysis.fairPlanRequired && (
            <p className="text-xs text-orange-600 mt-1">
              May require FAIR Plan (California last-resort insurance)
            </p>
          )}
        </div>

        {/* Defensible Space Required */}
        {analysis.defensibleSpaceRequired && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
            <Shield className="h-5 w-5 text-blue-500" />
            <span className="text-sm">
              Defensible space required - see mitigation recommendations
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### Environmental Risk Card

```typescript
// src/components/risk/EnvironmentalRiskCard.tsx

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Factory, Droplets, Wind, FileSearch } from 'lucide-react';
import type { EnvironmentalRiskAnalysis } from '@/types/risk';

interface EnvironmentalRiskCardProps {
  analysis: EnvironmentalRiskAnalysis;
}

const riskColors = {
  low: 'bg-green-100 text-green-800',
  moderate: 'bg-yellow-100 text-yellow-800',
  high: 'bg-orange-100 text-orange-800',
  very_high: 'bg-red-100 text-red-800',
};

const phaseIColors = {
  optional: 'bg-gray-100 text-gray-800',
  recommended: 'bg-yellow-100 text-yellow-800',
  strongly_recommended: 'bg-orange-100 text-orange-800',
  required: 'bg-red-100 text-red-800',
};

export function EnvironmentalRiskCard({ analysis }: EnvironmentalRiskCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2">
          <Factory className="h-5 w-5 text-purple-500" />
          Environmental Risk
        </CardTitle>
        <Badge className={riskColors[analysis.overallRisk]}>
          {analysis.overallRisk.replace('_', ' ')}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Phase I ESA Recommendation */}
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSearch className="h-5 w-5 text-blue-500" />
              <span className="text-sm font-medium">Phase I ESA</span>
            </div>
            <Badge className={phaseIColors[analysis.phaseIUrgency]}>
              {analysis.phaseIUrgency.replace('_', ' ')}
            </Badge>
          </div>
        </div>

        {/* Superfund Sites */}
        {analysis.nearbySuperfundSites.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Nearby Superfund Sites: {analysis.nearbySuperfundSites.length}
            </p>
            {analysis.closestSuperfundDistance && (
              <p className="text-sm text-muted-foreground">
                Closest: {analysis.closestSuperfundDistance.toFixed(2)} miles
              </p>
            )}
            {analysis.withinSuperfundRadius && (
              <div className="p-2 bg-red-50 rounded text-sm text-red-700">
                Property within 3 miles of Superfund site - increased scrutiny
              </div>
            )}
          </div>
        )}

        {/* Underground Storage Tanks */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 bg-gray-50 rounded">
            <p className="text-lg font-bold">{analysis.activeUSTsNearby}</p>
            <p className="text-xs text-muted-foreground">Active USTs</p>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded">
            <p className="text-lg font-bold">{analysis.closedUSTsNearby}</p>
            <p className="text-xs text-muted-foreground">Closed USTs</p>
          </div>
          <div className="text-center p-2 bg-red-50 rounded">
            <p className="text-lg font-bold text-red-600">{analysis.leakingUSTsNearby}</p>
            <p className="text-xs text-red-600">Leaking USTs</p>
          </div>
        </div>

        {/* TRI Facilities */}
        {analysis.nearbyTRIFacilities.length > 0 && (
          <div>
            <p className="text-sm font-medium">
              TRI Facilities Nearby: {analysis.nearbyTRIFacilities.length}
            </p>
          </div>
        )}

        {/* Groundwater Warning */}
        {analysis.groundwaterContamination && (
          <div className="flex items-center gap-2 p-3 bg-orange-50 rounded-lg">
            <Droplets className="h-5 w-5 text-orange-500" />
            <span className="text-sm">
              Potential groundwater contamination - test well water if applicable
            </span>
          </div>
        )}

        {/* Air Quality */}
        {analysis.airQualityIndex && (
          <div className="flex items-center gap-2">
            <Wind className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm">
                Air Quality Index: <span className="font-medium">{analysis.airQualityIndex}</span>
              </p>
              {analysis.airQualityConcerns.length > 0 && (
                <p className="text-xs text-orange-600">
                  Concerns: {analysis.airQualityConcerns.join(', ')}
                </p>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### Radon Risk Card

```typescript
// src/components/risk/RadonRiskCard.tsx

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Radiation, TestTube, Home } from 'lucide-react';
import type { RadonRiskAnalysis } from '@/types/risk';

interface RadonRiskCardProps {
  analysis: RadonRiskAnalysis;
}

const levelColors = {
  low: 'bg-green-100 text-green-800',
  moderate: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800',
};

const zoneColors = {
  1: 'bg-red-100 text-red-800',
  2: 'bg-yellow-100 text-yellow-800',
  3: 'bg-green-100 text-green-800',
};

export function RadonRiskCard({ analysis }: RadonRiskCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="flex items-center gap-2">
          <Radiation className="h-5 w-5 text-yellow-500" />
          Radon Risk
        </CardTitle>
        <Badge className={zoneColors[analysis.epaZone]}>
          EPA Zone {analysis.epaZone}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Predicted Level */}
        <div className="text-center p-4 bg-gray-50 rounded-lg">
          <p className="text-3xl font-bold">
            {analysis.predictedIndoorLevel.toFixed(1)}
          </p>
          <p className="text-sm text-muted-foreground">
            Predicted Indoor Level (pCi/L)
          </p>
          <Badge className={`mt-2 ${levelColors[analysis.predictedLevelCategory]}`}>
            {analysis.predictedLevelCategory}
          </Badge>
        </div>

        {/* EPA Action Level Warning */}
        {analysis.aboveActionLevel && (
          <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <div>
              <p className="text-sm font-medium text-red-700">
                Above EPA Action Level (4.0 pCi/L)
              </p>
              <p className="text-xs text-red-600">
                Mitigation strongly recommended
              </p>
            </div>
          </div>
        )}

        {/* Zone Description */}
        <div>
          <p className="text-sm text-muted-foreground">{analysis.zoneDescription}</p>
        </div>

        {/* Geology Contributors */}
        {analysis.geologyContributors.length > 0 && (
          <div>
            <p className="text-sm font-medium mb-1">Contributing Factors:</p>
            <ul className="text-sm text-muted-foreground space-y-1">
              {analysis.geologyContributors.map((factor, index) => (
                <li key={index}>• {factor}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Testing Recommendation */}
        {analysis.testingRecommended && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
            <TestTube className="h-5 w-5 text-blue-500" />
            <span className="text-sm">
              Radon testing recommended before purchase
            </span>
          </div>
        )}

        {/* Mitigation Cost */}
        {analysis.mitigationRequired && (
          <div className="pt-2 border-t">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Home className="h-5 w-5 text-gray-500" />
                <span className="text-sm">Est. Mitigation Cost</span>
              </div>
              <span className="font-bold">
                ${analysis.estimatedMitigationCost.toLocaleString()}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active soil depressurization system
            </p>
          </div>
        )}

        {/* Comparison */}
        <div className="grid grid-cols-2 gap-2 text-sm">
          {analysis.countyAverage && (
            <div className="p-2 bg-gray-50 rounded text-center">
              <p className="font-medium">{analysis.countyAverage.toFixed(1)} pCi/L</p>
              <p className="text-xs text-muted-foreground">County Average</p>
            </div>
          )}
          {analysis.stateAverage && (
            <div className="p-2 bg-gray-50 rounded text-center">
              <p className="font-medium">{analysis.stateAverage.toFixed(1)} pCi/L</p>
              <p className="text-xs text-muted-foreground">State Average</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## API Routes

### Fire & Environmental Risk API

```typescript
// src/app/api/risk/fire-environmental/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { analyzeWildfireRisk } from '@/lib/analysis/risk/wildfireRisk';
import { analyzeEnvironmentalRisk } from '@/lib/analysis/risk/environmentalRisk';
import { analyzeRadonRisk } from '@/lib/analysis/risk/radonRisk';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { latitude, longitude, state, analysisTypes } = body;

    if (!latitude || !longitude || !state) {
      return NextResponse.json(
        { error: 'Missing required parameters: latitude, longitude, state' },
        { status: 400 }
      );
    }

    const results: any = {};

    // Run requested analyses in parallel
    const analysesToRun = analysisTypes || ['wildfire', 'environmental', 'radon'];

    const promises = [];

    if (analysesToRun.includes('wildfire')) {
      promises.push(
        analyzeWildfireRisk(latitude, longitude, state)
          .then(result => { results.wildfire = result; })
      );
    }

    if (analysesToRun.includes('environmental')) {
      promises.push(
        analyzeEnvironmentalRisk(latitude, longitude, state)
          .then(result => { results.environmental = result; })
      );
    }

    if (analysesToRun.includes('radon')) {
      promises.push(
        analyzeRadonRisk(latitude, longitude, state)
          .then(result => { results.radon = result; })
      );
    }

    await Promise.all(promises);

    return NextResponse.json(results);
  } catch (error) {
    console.error('Fire/Environmental risk analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze risks' },
      { status: 500 }
    );
  }
}
```

---

## Verification Steps

1. **Wildfire Risk Testing**
   - Test California property (should show extreme/very_high)
   - Test property in New York City (should show low)
   - Verify WUI detection in Colorado mountain property
   - Confirm FAIR Plan flag for high-risk California

2. **Environmental Risk Testing**
   - Test property near known Superfund site
   - Test property in industrial area (TRI facilities)
   - Verify Phase I ESA recommendations based on risk
   - Test groundwater contamination flag with leaking USTs

3. **Radon Risk Testing**
   - Test Pennsylvania property (Zone 1, high risk)
   - Test Florida property (Zone 3, low risk)
   - Verify EPA action level flag at 4.0 pCi/L
   - Confirm geology contributors match state

4. **Mitigation Generation**
   - Verify appropriate mitigations for each risk level
   - Confirm cost estimates are reasonable
   - Check priority assignments (critical vs recommended)
   - Verify insurance impact notes

---

## Environment Variables Required

```bash
# NASA FIRMS API Key (free registration required)
NASA_FIRMS_API_KEY=your_nasa_firms_api_key

# AirNow API Key (for air quality data)
AIRNOW_API_KEY=your_airnow_api_key
```

---

## Next Steps

After completing Phase 7C, proceed to:
- **Phase 7D**: Slope and terrain analysis
- **Phase 8**: Financial analysis engine
- **Phase 9**: Bid strategy calculations
