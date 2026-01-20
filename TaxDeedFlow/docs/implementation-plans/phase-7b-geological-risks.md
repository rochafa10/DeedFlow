# Phase 7b: Geological Risk Analysis

## Overview

This document provides a complete, standalone implementation plan for geological risk analysis within the Tax Deed Flow risk assessment engine. Geological risks include:

1. **Earthquake/Seismic Risk** - Fault proximity, ground acceleration, liquefaction potential
2. **Slope/Terrain Analysis** - Landslide risk, erosion, debris flow, grading requirements
3. **Sinkhole/Karst Risk** - Karst geology, subsidence, cover collapse potential

These geological hazards are critical for property investment decisions, especially in high-risk regions like California (earthquakes), Florida (sinkholes), and mountainous areas (slopes).

---

## TypeScript Interfaces

### Core Geological Risk Types

```typescript
// src/types/geological-risk.ts

export interface EarthquakeRiskAnalysis {
  seismicZone: string;
  seismicZoneDescription: string;
  peakGroundAcceleration: number;           // PGA in g
  spectralAcceleration: number;             // Sa in g
  nearbyFaults: FaultInfo[];
  recentEvents: EarthquakeEvent[];
  riskLevel: 'low' | 'moderate' | 'high' | 'very_high';
  buildingCodeZone: string;
  retrofitRecommended: boolean;
  expectedShakingIntensity: string;         // MMI scale description
  soilType?: string;                        // Affects amplification
  liquefactionRisk?: 'low' | 'moderate' | 'high';
  mitigationOptions: EarthquakeMitigation[];
}

export interface SlopeRiskAnalysis {
  averageSlope: number;                     // Percentage
  maxSlope: number;                         // Percentage
  terrainType: string;
  landslideRisk: 'low' | 'moderate' | 'high';
  erosionRisk: 'low' | 'moderate' | 'high';
  debrisFlowRisk: 'low' | 'moderate' | 'high';
  developmentChallenges: string[];
  gradingRequired: boolean;
  estimatedGradingCost: number;
  retainingWallsNeeded: boolean;
  mitigationOptions: SlopeMitigation[];
}

export interface SinkholeRiskAnalysis {
  riskLevel: 'negligible' | 'low' | 'moderate' | 'high' | 'very_high';
  karstTerrain: boolean;
  geologyType: string;
  underlyingBedrock: string;
  historicalSinkholes: number;              // Within 5 miles
  nearbySinkholesCount: number;             // Within 1 mile
  groundwaterDepth?: number;
  soilStability: 'stable' | 'moderate' | 'unstable';
  coverCollapseRisk: boolean;               // Most dangerous type
  subsidenceRisk: boolean;                  // Gradual settling
  solutionSinkholeRisk: boolean;            // Bowl-shaped depression
  insuranceAvailable: boolean;
  insuranceRequired: boolean;               // FL requires disclosure
  estimatedSinkholeInsurance: number;
  mitigationOptions: SinkholeMitigation[];
}

// Supporting Types
export interface FaultInfo {
  name: string;
  distance: number;                         // Miles
  slipRate: number;                         // mm/year
  faultType: 'strike-slip' | 'normal' | 'reverse' | 'thrust' | 'unknown';
  lastRupture?: string;
  maxMagnitude?: number;
}

export interface EarthquakeEvent {
  magnitude: number;
  date: string;
  distance: number;                         // Miles
  depth: number;                            // km
  feltReports?: number;
}

// Mitigation Types
export interface RiskMitigation {
  riskType: string;
  action: string;
  estimatedCost: { min: number; max: number };
  effectiveness: 'low' | 'moderate' | 'high' | 'very_high';
  timeframe: string;
  insuranceImpact?: string;
  priority: 'optional' | 'recommended' | 'critical';
}

export interface EarthquakeMitigation extends RiskMitigation {
  riskType: 'earthquake';
  retrofitType?: string;
}

export interface SlopeMitigation extends RiskMitigation {
  riskType: 'slope';
  engineeringRequired?: boolean;
}

export interface SinkholeMitigation extends RiskMitigation {
  riskType: 'sinkhole';
  groundStabilization?: string;
}
```

---

## API Endpoints and Data Sources

### USGS Earthquake Hazards API

```typescript
// src/lib/api-services/usgs-service.ts

export class USGSService {
  private baseUrl = 'https://earthquake.usgs.gov/ws/designmaps';
  private earthquakeUrl = 'https://earthquake.usgs.gov/fdsnws/event/1/query';
  private faultUrl = 'https://earthquake.usgs.gov/ws/nshm/hazard';

  /**
   * Get seismic hazard data for a location
   * Uses USGS National Seismic Hazard Model
   */
  async getSeismicHazard(latitude: number, longitude: number): Promise<{
    peakGroundAcceleration: number;
    spectralAcceleration: number;
    soilType?: string;
  }> {
    // USGS Design Maps API for PGA and Sa values
    const response = await fetch(
      `${this.baseUrl}/nehrp-2020.json?latitude=${latitude}&longitude=${longitude}&riskCategory=II&siteClass=D&title=PropertyAnalysis`
    );

    if (!response.ok) {
      // Fallback to estimated values based on location
      return this.estimateSeismicHazard(latitude, longitude);
    }

    const data = await response.json();
    return {
      peakGroundAcceleration: data.response?.data?.pga ?? 0.1,
      spectralAcceleration: data.response?.data?.ss ?? 0.2,
      soilType: 'Site Class D (Stiff Soil)', // Default assumption
    };
  }

  /**
   * Get recent earthquakes within radius
   */
  async getRecentEarthquakes(
    latitude: number,
    longitude: number,
    radiusMiles: number = 100,
    daysBack: number = 365
  ): Promise<EarthquakeEvent[]> {
    const radiusKm = radiusMiles * 1.60934;
    const startTime = new Date();
    startTime.setDate(startTime.getDate() - daysBack);

    const response = await fetch(
      `${this.earthquakeUrl}?format=geojson&latitude=${latitude}&longitude=${longitude}&maxradiuskm=${radiusKm}&starttime=${startTime.toISOString()}&minmagnitude=2.5&orderby=time`
    );

    if (!response.ok) {
      return [];
    }

    const data = await response.json();
    return data.features?.map((feature: any) => ({
      magnitude: feature.properties.mag,
      date: new Date(feature.properties.time).toISOString(),
      distance: this.calculateDistance(
        latitude, longitude,
        feature.geometry.coordinates[1],
        feature.geometry.coordinates[0]
      ),
      depth: feature.geometry.coordinates[2],
      feltReports: feature.properties.felt,
    })) ?? [];
  }

  /**
   * Get nearby fault information
   * Note: In production, use USGS Quaternary Fault and Fold Database
   */
  async getNearbyFaults(
    latitude: number,
    longitude: number,
    radiusMiles: number = 50
  ): Promise<FaultInfo[]> {
    // USGS fault data requires specialized access
    // This would query the Quaternary Fault and Fold Database API
    // For now, return based on known major faults
    return this.estimateNearbyFaults(latitude, longitude);
  }

  private estimateSeismicHazard(lat: number, lng: number): {
    peakGroundAcceleration: number;
    spectralAcceleration: number;
    soilType?: string;
  } {
    // Simplified estimation based on region
    // California
    if (lng > -125 && lng < -114 && lat > 32 && lat < 42) {
      return { peakGroundAcceleration: 0.4, spectralAcceleration: 1.0, soilType: 'Variable' };
    }
    // Pacific Northwest
    if (lng > -125 && lng < -116 && lat > 42 && lat < 49) {
      return { peakGroundAcceleration: 0.3, spectralAcceleration: 0.7 };
    }
    // Default low risk
    return { peakGroundAcceleration: 0.05, spectralAcceleration: 0.1 };
  }

  private estimateNearbyFaults(lat: number, lng: number): FaultInfo[] {
    const faults: FaultInfo[] = [];

    // San Andreas (simplified)
    if (lng > -123 && lng < -115 && lat > 33 && lat < 38) {
      faults.push({
        name: 'San Andreas Fault',
        distance: Math.abs(lng + 120) * 50, // Rough estimate
        slipRate: 25,
        faultType: 'strike-slip',
        maxMagnitude: 8.0,
      });
    }

    // Hayward Fault
    if (lng > -122.5 && lng < -121.5 && lat > 37 && lat < 38.5) {
      faults.push({
        name: 'Hayward Fault',
        distance: 10,
        slipRate: 9,
        faultType: 'strike-slip',
        maxMagnitude: 7.0,
      });
    }

    return faults;
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 3959; // Earth radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}
```

### Open-Elevation API for Slope Analysis

```typescript
// src/lib/api-services/elevation-service.ts

export class ElevationService {
  private baseUrl = 'https://api.open-elevation.com/api/v1';

  /**
   * Get elevation data for slope calculation
   * Samples points in a grid around the property
   */
  async getElevationData(
    latitude: number,
    longitude: number,
    lotSizeAcres: number = 0.25
  ): Promise<{
    elevations: number[];
    avgSlope: number;
    maxSlope: number;
  }> {
    // Calculate sampling grid based on lot size
    const lotRadiusMiles = Math.sqrt(lotSizeAcres / 640) / 2;
    const points = this.generateSamplePoints(latitude, longitude, lotRadiusMiles);

    // Query elevation for all points
    const response = await fetch(`${this.baseUrl}/lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locations: points }),
    });

    if (!response.ok) {
      return { elevations: [], avgSlope: 0, maxSlope: 0 };
    }

    const data = await response.json();
    const elevations = data.results?.map((r: any) => r.elevation) ?? [];

    // Calculate slopes
    const slopes = this.calculateSlopes(points, elevations);

    return {
      elevations,
      avgSlope: slopes.reduce((a, b) => a + b, 0) / slopes.length,
      maxSlope: Math.max(...slopes),
    };
  }

  private generateSamplePoints(
    lat: number,
    lng: number,
    radiusMiles: number
  ): { latitude: number; longitude: number }[] {
    const points: { latitude: number; longitude: number }[] = [];
    const degreesPerMile = 1 / 69; // Approximate
    const offset = radiusMiles * degreesPerMile;

    // 3x3 grid sampling
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        points.push({
          latitude: lat + (i * offset),
          longitude: lng + (j * offset),
        });
      }
    }

    return points;
  }

  private calculateSlopes(
    points: { latitude: number; longitude: number }[],
    elevations: number[]
  ): number[] {
    const slopes: number[] = [];

    // Calculate slope between adjacent points
    for (let i = 0; i < elevations.length - 1; i++) {
      const eleDiff = Math.abs(elevations[i + 1] - elevations[i]);
      const distance = this.haversineDistance(
        points[i].latitude, points[i].longitude,
        points[i + 1].latitude, points[i + 1].longitude
      );

      if (distance > 0) {
        // Convert to percentage slope
        const slopePercent = (eleDiff / (distance * 5280)) * 100;
        slopes.push(slopePercent);
      }
    }

    return slopes;
  }

  private haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 3959; // Earth radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) ** 2 +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  }
}
```

---

## Earthquake Risk Analysis Implementation

```typescript
// src/lib/analysis/risk/earthquakeRisk.ts

import { USGSService } from '@/lib/api-services/usgs-service';
import type { EarthquakeRiskAnalysis, EarthquakeMitigation } from '@/types/geological-risk';

// Detailed seismic zone definitions
const SEISMIC_ZONES = {
  'california_san_andreas': {
    name: 'San Andreas Fault System',
    description: 'Major transform fault along California coast. High probability of M7+ earthquake.',
    states: ['CA'],
    risk: 'very_high',
    expectedPGA: 0.6,
  },
  'california_other': {
    name: 'California Seismic Region',
    description: 'Active seismic region with multiple fault systems including Hayward, San Jacinto, and others.',
    states: ['CA'],
    risk: 'high',
    expectedPGA: 0.4,
  },
  'pacific_northwest': {
    name: 'Cascadia Subduction Zone',
    description: 'Major subduction zone capable of M9+ megathrust earthquake. Last rupture: 1700 AD.',
    states: ['WA', 'OR'],
    risk: 'high',
    expectedPGA: 0.35,
  },
  'alaska': {
    name: 'Alaska-Aleutian Seismic Zone',
    description: 'Most seismically active region in the US. Subduction zone with frequent large earthquakes.',
    states: ['AK'],
    risk: 'very_high',
    expectedPGA: 0.5,
  },
  'new_madrid': {
    name: 'New Madrid Seismic Zone',
    description: 'Intraplate fault zone in central US. Produced M7-8 earthquakes in 1811-1812.',
    states: ['MO', 'AR', 'TN', 'KY', 'IL', 'MS'],
    risk: 'moderate',
    expectedPGA: 0.25,
  },
  'charleston': {
    name: 'Charleston Seismic Zone',
    description: 'Site of 1886 M7.3 earthquake. Intraplate zone with moderate ongoing risk.',
    states: ['SC', 'GA'],
    risk: 'moderate',
    expectedPGA: 0.2,
  },
  'wasatch': {
    name: 'Wasatch Fault Zone',
    description: 'Major normal fault in Utah. High probability of M7+ earthquake in next 50 years.',
    states: ['UT'],
    risk: 'high',
    expectedPGA: 0.35,
  },
  'intermountain_west': {
    name: 'Intermountain West',
    description: 'Basin and Range province with distributed seismicity.',
    states: ['NV', 'ID', 'WY', 'MT', 'CO', 'AZ', 'NM'],
    risk: 'moderate',
    expectedPGA: 0.15,
  },
  'hawaii': {
    name: 'Hawaiian Volcanic Zone',
    description: 'Volcanic-related seismicity. M6-7 earthquakes occur periodically.',
    states: ['HI'],
    risk: 'moderate',
    expectedPGA: 0.3,
  },
  'stable_interior': {
    name: 'Stable Continental Interior',
    description: 'Very low seismic activity. Occasional small earthquakes possible.',
    states: ['TX', 'OK', 'KS', 'NE', 'SD', 'ND', 'MN', 'IA', 'WI', 'MI', 'OH', 'IN', 'FL', 'GA', 'AL', 'MS', 'LA'],
    risk: 'low',
    expectedPGA: 0.05,
  },
};

// Modified Mercalli Intensity scale
const MMI_SCALE: Record<number, { intensity: string; pga_range: [number, number]; description: string }> = {
  1: { intensity: 'I - Not felt', pga_range: [0, 0.0017], description: 'Not felt except by very few under especially favorable conditions.' },
  2: { intensity: 'II - Weak', pga_range: [0.0017, 0.014], description: 'Felt only by a few persons at rest, especially on upper floors.' },
  3: { intensity: 'III - Weak', pga_range: [0.014, 0.039], description: 'Felt quite noticeably by persons indoors. Vibration similar to passing truck.' },
  4: { intensity: 'IV - Light', pga_range: [0.039, 0.092], description: 'Felt indoors by many, outdoors by few. Dishes, windows, doors disturbed.' },
  5: { intensity: 'V - Moderate', pga_range: [0.092, 0.18], description: 'Felt by nearly everyone. Some dishes, windows broken. Unstable objects overturned.' },
  6: { intensity: 'VI - Strong', pga_range: [0.18, 0.34], description: 'Felt by all. Heavy furniture moved. Some plaster falls. Damage slight.' },
  7: { intensity: 'VII - Very Strong', pga_range: [0.34, 0.65], description: 'Damage negligible in well-built buildings, considerable in poorly built structures.' },
  8: { intensity: 'VIII - Severe', pga_range: [0.65, 1.24], description: 'Damage slight in specially designed structures; considerable in ordinary buildings.' },
  9: { intensity: 'IX - Violent', pga_range: [1.24, 2.0], description: 'Damage considerable in specially designed structures. Buildings shifted off foundations.' },
  10: { intensity: 'X - Extreme', pga_range: [2.0, 999], description: 'Some well-built wooden structures destroyed. Most masonry structures destroyed.' },
};

export async function analyzeEarthquakeRisk(
  latitude: number,
  longitude: number,
  state: string
): Promise<EarthquakeRiskAnalysis> {
  const usgsService = new USGSService();

  // Get seismic hazard data
  const [hazardData, recentEvents, faultData] = await Promise.all([
    usgsService.getSeismicHazard(latitude, longitude),
    usgsService.getRecentEarthquakes(latitude, longitude, 100, 365),
    usgsService.getNearbyFaults(latitude, longitude, 50),
  ]);

  // Determine seismic zone
  const seismicZone = getSeismicZone(latitude, longitude, state);

  // Calculate risk level based on PGA
  const pga = hazardData.peakGroundAcceleration || seismicZone.expectedPGA;
  let riskLevel: EarthquakeRiskAnalysis['riskLevel'] = 'low';
  let buildingCodeZone = 'Zone 0/1';

  if (pga >= 0.4) {
    riskLevel = 'very_high';
    buildingCodeZone = 'Zone 4 (Highest seismic design)';
  } else if (pga >= 0.2) {
    riskLevel = 'high';
    buildingCodeZone = 'Zone 3 (High seismic design)';
  } else if (pga >= 0.1) {
    riskLevel = 'moderate';
    buildingCodeZone = 'Zone 2 (Moderate seismic design)';
  }

  // Get MMI intensity
  const expectedShaking = getMMIIntensity(pga);

  // Map fault data with enhanced info
  const nearbyFaults = faultData.map(fault => ({
    name: fault.name,
    distance: fault.distance,
    slipRate: fault.slipRate,
    faultType: fault.faultType || 'unknown',
    lastRupture: fault.lastRupture,
    maxMagnitude: fault.maxMagnitude,
  }));

  // Map recent events
  const mappedEvents = recentEvents.slice(0, 10).map(event => ({
    magnitude: event.magnitude,
    date: event.date,
    distance: event.distance,
    depth: event.depth,
    feltReports: event.feltReports,
  }));

  // Liquefaction risk assessment
  const liquefactionRisk = getLiquefactionRisk(pga, hazardData.soilType);

  // Determine if retrofit is recommended
  const retrofitRecommended =
    riskLevel === 'very_high' ||
    riskLevel === 'high' ||
    (riskLevel === 'moderate' && nearbyFaults.some(f => f.distance < 10));

  // Generate mitigation options
  const mitigationOptions = generateEarthquakeMitigations(riskLevel, nearbyFaults);

  return {
    seismicZone: seismicZone.name,
    seismicZoneDescription: seismicZone.description,
    peakGroundAcceleration: pga,
    spectralAcceleration: hazardData.spectralAcceleration || 0,
    nearbyFaults,
    recentEvents: mappedEvents,
    riskLevel,
    buildingCodeZone,
    retrofitRecommended,
    expectedShakingIntensity: expectedShaking,
    soilType: hazardData.soilType,
    liquefactionRisk,
    mitigationOptions,
  };
}

function getSeismicZone(lat: number, lng: number, state: string): typeof SEISMIC_ZONES[keyof typeof SEISMIC_ZONES] {
  const stateUpper = state.toUpperCase();

  // California - check proximity to San Andreas
  if (stateUpper === 'CA') {
    // Simplified San Andreas proximity check
    const sanAndreasLng = -122.0;
    if (Math.abs(lng - sanAndreasLng) < 0.5) {
      return SEISMIC_ZONES.california_san_andreas;
    }
    return SEISMIC_ZONES.california_other;
  }

  // Find matching zone by state
  for (const zone of Object.values(SEISMIC_ZONES)) {
    if (zone.states.includes(stateUpper)) {
      return zone;
    }
  }

  return SEISMIC_ZONES.stable_interior;
}

function getMMIIntensity(pga: number): string {
  for (let i = 10; i >= 1; i--) {
    const scale = MMI_SCALE[i];
    if (pga >= scale.pga_range[0]) {
      return `${scale.intensity} - ${scale.description}`;
    }
  }
  return MMI_SCALE[1].intensity;
}

function getLiquefactionRisk(
  pga: number,
  soilType?: string
): 'low' | 'moderate' | 'high' {
  if (pga < 0.1) return 'low';

  const highRiskSoils = ['fill', 'alluvium', 'sandy', 'loose'];
  const isHighRiskSoil = soilType && highRiskSoils.some(s =>
    soilType.toLowerCase().includes(s)
  );

  if (pga >= 0.3 && isHighRiskSoil) return 'high';
  if (pga >= 0.2 || isHighRiskSoil) return 'moderate';
  return 'low';
}

function generateEarthquakeMitigations(
  riskLevel: string,
  nearbyFaults: FaultInfo[]
): EarthquakeMitigation[] {
  const mitigations: EarthquakeMitigation[] = [];

  if (riskLevel === 'very_high' || riskLevel === 'high') {
    // Foundation bolting
    mitigations.push({
      riskType: 'earthquake',
      action: 'Bolt house to foundation (cripple wall bracing)',
      estimatedCost: { min: 3000, max: 7000 },
      effectiveness: 'very_high',
      timeframe: '2-4 days',
      insuranceImpact: 'May qualify for earthquake insurance discounts',
      priority: 'critical',
      retrofitType: 'Foundation anchoring',
    });

    // Water heater strapping
    mitigations.push({
      riskType: 'earthquake',
      action: 'Secure water heater with earthquake straps',
      estimatedCost: { min: 50, max: 200 },
      effectiveness: 'moderate',
      timeframe: '1 hour',
      priority: 'critical',
      retrofitType: 'Appliance securing',
    });

    // Soft story retrofit
    mitigations.push({
      riskType: 'earthquake',
      action: 'Soft story retrofit (if applicable - buildings with parking below)',
      estimatedCost: { min: 50000, max: 200000 },
      effectiveness: 'very_high',
      timeframe: '2-6 months',
      priority: 'critical',
      retrofitType: 'Structural strengthening',
    });
  }

  if (riskLevel !== 'low') {
    // Chimney bracing
    mitigations.push({
      riskType: 'earthquake',
      action: 'Brace unreinforced masonry chimney',
      estimatedCost: { min: 1000, max: 5000 },
      effectiveness: 'high',
      timeframe: '1-2 days',
      priority: 'recommended',
      retrofitType: 'Chimney reinforcement',
    });

    // Furniture anchoring
    mitigations.push({
      riskType: 'earthquake',
      action: 'Anchor tall furniture and heavy items to walls',
      estimatedCost: { min: 100, max: 500 },
      effectiveness: 'moderate',
      timeframe: 'DIY weekend project',
      priority: 'recommended',
    });

    // Automatic gas shutoff
    mitigations.push({
      riskType: 'earthquake',
      action: 'Install automatic gas shutoff valve',
      estimatedCost: { min: 300, max: 800 },
      effectiveness: 'high',
      timeframe: '2-4 hours',
      insuranceImpact: 'Reduces fire risk after earthquake',
      priority: 'recommended',
    });
  }

  // Earthquake insurance recommendation for high-risk areas
  if (riskLevel === 'very_high' || riskLevel === 'high') {
    mitigations.push({
      riskType: 'earthquake',
      action: 'Purchase earthquake insurance (not covered by standard homeowners)',
      estimatedCost: { min: 800, max: 5000 },
      effectiveness: 'high',
      timeframe: 'Immediate',
      insuranceImpact: 'Provides financial protection for earthquake damage',
      priority: 'critical',
    });
  }

  return mitigations;
}

export function calculateEarthquakeInsurance(
  propertyValue: number,
  analysis: EarthquakeRiskAnalysis
): number {
  const baseRate: Record<string, number> = {
    'low': 0.003,
    'moderate': 0.008,
    'high': 0.015,
    'very_high': 0.025,
  };

  const coverage = propertyValue * 0.8; // Typical 80% coverage
  return Math.round(coverage * (baseRate[analysis.riskLevel] || 0.008));
}
```

---

## Slope/Terrain Analysis Implementation

```typescript
// src/lib/analysis/risk/slopeAnalysis.ts

import { ElevationService } from '@/lib/api-services/elevation-service';
import type { SlopeRiskAnalysis, SlopeMitigation } from '@/types/geological-risk';

// Terrain classifications
const TERRAIN_TYPES = {
  flat: { maxSlope: 5, description: 'Flat to nearly level' },
  gentle: { maxSlope: 10, description: 'Gently sloping' },
  moderate: { maxSlope: 15, description: 'Moderately sloping' },
  steep: { maxSlope: 25, description: 'Steep slopes' },
  very_steep: { maxSlope: 40, description: 'Very steep slopes' },
  extreme: { maxSlope: 100, description: 'Extremely steep/cliff' },
};

export async function analyzeSlopeRisk(
  latitude: number,
  longitude: number,
  lotSizeAcres?: number
): Promise<SlopeRiskAnalysis> {
  const elevationService = new ElevationService();

  // Get elevation data and calculate slopes
  const elevationData = await elevationService.getElevationData(
    latitude,
    longitude,
    lotSizeAcres ?? 0.25
  );

  const avgSlope = elevationData.avgSlope;
  const maxSlope = elevationData.maxSlope;

  // Determine terrain type
  const terrainType = getTerrainType(avgSlope);

  // Assess landslide risk
  const landslideRisk = assessLandslideRisk(avgSlope, maxSlope);

  // Assess erosion risk
  const erosionRisk = assessErosionRisk(avgSlope);

  // Assess debris flow risk
  const debrisFlowRisk = assessDebrisFlowRisk(avgSlope, maxSlope);

  // Identify development challenges
  const developmentChallenges = identifyDevelopmentChallenges(avgSlope, maxSlope);

  // Determine if grading is required
  const gradingRequired = avgSlope > 10 || maxSlope > 15;

  // Estimate grading cost
  const estimatedGradingCost = calculateGradingCost(avgSlope, lotSizeAcres ?? 0.25);

  // Determine if retaining walls needed
  const retainingWallsNeeded = avgSlope > 15 || maxSlope > 25;

  // Generate mitigation options
  const mitigationOptions = generateSlopeMitigations(
    avgSlope,
    maxSlope,
    landslideRisk,
    erosionRisk
  );

  return {
    averageSlope: Math.round(avgSlope * 10) / 10,
    maxSlope: Math.round(maxSlope * 10) / 10,
    terrainType,
    landslideRisk,
    erosionRisk,
    debrisFlowRisk,
    developmentChallenges,
    gradingRequired,
    estimatedGradingCost,
    retainingWallsNeeded,
    mitigationOptions,
  };
}

function getTerrainType(avgSlope: number): string {
  for (const [type, info] of Object.entries(TERRAIN_TYPES)) {
    if (avgSlope <= info.maxSlope) {
      return info.description;
    }
  }
  return TERRAIN_TYPES.extreme.description;
}

function assessLandslideRisk(avgSlope: number, maxSlope: number): 'low' | 'moderate' | 'high' {
  if (maxSlope > 35 || avgSlope > 25) return 'high';
  if (maxSlope > 20 || avgSlope > 15) return 'moderate';
  return 'low';
}

function assessErosionRisk(avgSlope: number): 'low' | 'moderate' | 'high' {
  if (avgSlope > 20) return 'high';
  if (avgSlope > 10) return 'moderate';
  return 'low';
}

function assessDebrisFlowRisk(avgSlope: number, maxSlope: number): 'low' | 'moderate' | 'high' {
  // Debris flows typically occur on steep slopes, often following fires
  if (maxSlope > 40 || avgSlope > 30) return 'high';
  if (maxSlope > 25 || avgSlope > 20) return 'moderate';
  return 'low';
}

function identifyDevelopmentChallenges(avgSlope: number, maxSlope: number): string[] {
  const challenges: string[] = [];

  if (avgSlope > 5) {
    challenges.push('May require grading for building pad');
  }
  if (avgSlope > 10) {
    challenges.push('Foundation design more complex');
    challenges.push('Driveway grade may exceed standards');
  }
  if (avgSlope > 15) {
    challenges.push('Retaining walls likely required');
    challenges.push('Stormwater management critical');
  }
  if (avgSlope > 20) {
    challenges.push('Specialized foundation required (caissons, stepped)');
    challenges.push('Access for construction equipment difficult');
  }
  if (avgSlope > 25) {
    challenges.push('Geotechnical engineering mandatory');
    challenges.push('May require variances for building codes');
  }
  if (maxSlope > 35) {
    challenges.push('Some areas may be unbuildable');
    challenges.push('Landslide hazard zone considerations');
  }

  return challenges;
}

function calculateGradingCost(avgSlope: number, lotSizeAcres: number): number {
  // Base cost per acre for grading
  let costPerAcre = 5000; // Flat land

  if (avgSlope > 5) costPerAcre = 10000;
  if (avgSlope > 10) costPerAcre = 20000;
  if (avgSlope > 15) costPerAcre = 40000;
  if (avgSlope > 20) costPerAcre = 75000;
  if (avgSlope > 25) costPerAcre = 100000;

  return Math.round(costPerAcre * lotSizeAcres);
}

function generateSlopeMitigations(
  avgSlope: number,
  maxSlope: number,
  landslideRisk: string,
  erosionRisk: string
): SlopeMitigation[] {
  const mitigations: SlopeMitigation[] = [];

  // Geotechnical investigation
  if (landslideRisk === 'high' || avgSlope > 20) {
    mitigations.push({
      riskType: 'slope',
      action: 'Conduct geotechnical investigation before purchase',
      estimatedCost: { min: 2000, max: 8000 },
      effectiveness: 'very_high',
      timeframe: '1-2 weeks',
      priority: 'critical',
      engineeringRequired: true,
    });
  }

  // Retaining walls
  if (avgSlope > 15 || maxSlope > 25) {
    mitigations.push({
      riskType: 'slope',
      action: 'Install engineered retaining walls',
      estimatedCost: { min: 5000, max: 50000 },
      effectiveness: 'very_high',
      timeframe: '2-8 weeks',
      priority: landslideRisk === 'high' ? 'critical' : 'recommended',
      engineeringRequired: true,
    });
  }

  // Drainage systems
  if (landslideRisk !== 'low' || erosionRisk !== 'low') {
    mitigations.push({
      riskType: 'slope',
      action: 'Install comprehensive drainage system (French drains, surface drains)',
      estimatedCost: { min: 3000, max: 15000 },
      effectiveness: 'high',
      timeframe: '1-2 weeks',
      insuranceImpact: 'Reduces water infiltration that triggers slides',
      priority: 'recommended',
    });
  }

  // Slope stabilization
  if (landslideRisk === 'high') {
    mitigations.push({
      riskType: 'slope',
      action: 'Slope stabilization (soil nailing, ground anchors, or reinforced soil)',
      estimatedCost: { min: 20000, max: 100000 },
      effectiveness: 'very_high',
      timeframe: '4-12 weeks',
      priority: 'critical',
      engineeringRequired: true,
    });
  }

  // Erosion control
  if (erosionRisk !== 'low') {
    mitigations.push({
      riskType: 'slope',
      action: 'Install erosion control (riprap, erosion blankets, vegetation)',
      estimatedCost: { min: 2000, max: 10000 },
      effectiveness: 'moderate',
      timeframe: '1-4 weeks',
      priority: 'recommended',
    });
  }

  // Grading
  if (avgSlope > 10) {
    mitigations.push({
      riskType: 'slope',
      action: 'Re-grade to reduce slope and improve drainage',
      estimatedCost: { min: 5000, max: 30000 },
      effectiveness: 'high',
      timeframe: '1-4 weeks',
      priority: avgSlope > 20 ? 'critical' : 'optional',
      engineeringRequired: avgSlope > 20,
    });
  }

  // Foundation design
  if (avgSlope > 15) {
    mitigations.push({
      riskType: 'slope',
      action: 'Ensure foundation designed for slope (stepped, caisson, or grade beam)',
      estimatedCost: { min: 10000, max: 50000 },
      effectiveness: 'very_high',
      timeframe: 'Part of construction',
      priority: 'critical',
      engineeringRequired: true,
    });
  }

  return mitigations;
}
```

---

## Sinkhole/Karst Risk Analysis Implementation

```typescript
// src/lib/analysis/risk/sinkholeRisk.ts

import type { SinkholeRiskAnalysis, SinkholeMitigation } from '@/types/geological-risk';

// Karst geology regions by state
const KARST_REGIONS: Record<string, {
  risk: string;
  geology: string;
  description: string;
  highRiskAreas: Array<{ name: string; latRange: [number, number]; lngRange: [number, number] }>;
}> = {
  'FL': {
    risk: 'very_high',
    geology: 'Carbonate Platform (Limestone/Dolostone)',
    description: 'Florida sits atop extensive carbonate rocks. The state has more sinkholes than any other US state.',
    highRiskAreas: [
      { name: 'Sinkhole Alley', latRange: [27.5, 29.5], lngRange: [-82.5, -81.0] },
      { name: 'Central Florida', latRange: [28.0, 29.0], lngRange: [-82.0, -81.0] },
    ],
  },
  'TX': {
    risk: 'high',
    geology: 'Edwards Aquifer Limestone',
    description: 'Central Texas sits on karst limestone. The Edwards Aquifer region is particularly susceptible.',
    highRiskAreas: [
      { name: 'Hill Country', latRange: [29.5, 31.0], lngRange: [-100.0, -97.0] },
    ],
  },
  'KY': {
    risk: 'high',
    geology: 'Mississippian Limestone',
    description: 'Kentucky has extensive karst terrain, especially in the central Bluegrass region.',
    highRiskAreas: [
      { name: 'Pennyroyal Plateau', latRange: [36.5, 38.0], lngRange: [-87.0, -84.5] },
    ],
  },
  'TN': {
    risk: 'high',
    geology: 'Ordovician Limestone',
    description: 'Middle Tennessee sits on highly soluble limestone with active karst development.',
    highRiskAreas: [
      { name: 'Nashville Basin', latRange: [35.5, 36.5], lngRange: [-87.5, -85.5] },
    ],
  },
  'AL': {
    risk: 'moderate',
    geology: 'Various Carbonates',
    description: 'Northern Alabama has karst terrain associated with the Tennessee River Valley.',
    highRiskAreas: [
      { name: 'Tennessee Valley', latRange: [34.0, 35.0], lngRange: [-88.0, -85.5] },
    ],
  },
  'MO': {
    risk: 'moderate',
    geology: 'Ordovician/Mississippian Limestone',
    description: 'Missouri Ozarks have extensive cave systems and sinkhole-prone terrain.',
    highRiskAreas: [
      { name: 'Ozark Plateau', latRange: [36.5, 38.0], lngRange: [-94.0, -91.0] },
    ],
  },
  'PA': {
    risk: 'moderate',
    geology: 'Ordovician Limestone',
    description: 'Southeastern Pennsylvania has areas of carbonate bedrock with sinkhole activity.',
    highRiskAreas: [
      { name: 'Great Valley', latRange: [39.8, 41.0], lngRange: [-77.5, -75.0] },
    ],
  },
};

// Sinkhole types
const SINKHOLE_TYPES = {
  cover_collapse: {
    description: 'Cover-collapse sinkholes form suddenly when soil/sediment collapses into a void. Most dangerous type.',
    risk: 'very_high',
    warning_signs: ['Circular cracks in soil', 'Trees tilting', 'Doors/windows sticking', 'Cracks in foundation'],
  },
  cover_subsidence: {
    description: 'Cover-subsidence sinkholes form gradually as soil slowly moves into voids. Creates bowl-shaped depressions.',
    risk: 'moderate',
    warning_signs: ['Gradual settling', 'Ponding water', 'Slumping fence posts', 'Cracking in pavement'],
  },
  solution: {
    description: 'Solution sinkholes form in exposed limestone through gradual dissolution. Slow-forming.',
    risk: 'low',
    warning_signs: ['Visible limestone at surface', 'Bowl-shaped depressions', 'Seasonal ponding'],
  },
};

export async function analyzeSinkholeRisk(
  latitude: number,
  longitude: number,
  state: string
): Promise<SinkholeRiskAnalysis> {
  const stateUpper = state.toUpperCase();
  const karstInfo = KARST_REGIONS[stateUpper];

  // Determine if in karst terrain
  const karstTerrain = !!karstInfo;

  // Check if in high-risk area within state
  const inHighRiskArea = karstInfo?.highRiskAreas.some(area =>
    latitude >= area.latRange[0] && latitude <= area.latRange[1] &&
    longitude >= area.lngRange[0] && longitude <= area.lngRange[1]
  ) ?? false;

  // Query historical sinkholes
  const { historicalSinkholes, nearbySinkholes } = await queryHistoricalSinkholes(
    latitude, longitude, state
  );

  // Determine risk level
  let riskLevel: SinkholeRiskAnalysis['riskLevel'] = 'negligible';

  if (!karstTerrain) {
    riskLevel = 'negligible';
  } else if (inHighRiskArea && nearbySinkholes > 2) {
    riskLevel = 'very_high';
  } else if (inHighRiskArea || nearbySinkholes > 0) {
    riskLevel = 'high';
  } else if (karstInfo?.risk === 'high' || karstInfo?.risk === 'very_high') {
    riskLevel = 'moderate';
  } else if (karstTerrain) {
    riskLevel = 'low';
  }

  // Determine sinkhole type risks
  const coverCollapseRisk = riskLevel === 'very_high' || riskLevel === 'high';
  const subsidenceRisk = riskLevel !== 'negligible' && riskLevel !== 'low';
  const solutionRisk = karstTerrain;

  // Insurance considerations (Florida-specific requirements)
  const insuranceRequired = stateUpper === 'FL';
  const insuranceAvailable = riskLevel !== 'very_high';

  // Estimate insurance cost
  const estimatedInsurance = calculateSinkholeInsurance(riskLevel, state);

  // Generate mitigations
  const mitigationOptions = generateSinkholeMitigations(riskLevel, state);

  return {
    riskLevel,
    karstTerrain,
    geologyType: karstInfo?.geology || 'Non-karst bedrock',
    underlyingBedrock: karstInfo ? 'Soluble carbonate (limestone/dolostone)' : 'Non-soluble bedrock',
    historicalSinkholes,
    nearbySinkholesCount: nearbySinkholes,
    soilStability: riskLevel === 'very_high' || riskLevel === 'high' ? 'unstable' :
                   riskLevel === 'moderate' ? 'moderate' : 'stable',
    coverCollapseRisk,
    subsidenceRisk,
    solutionSinkholeRisk: solutionRisk,
    insuranceAvailable,
    insuranceRequired,
    estimatedSinkholeInsurance: estimatedInsurance,
    mitigationOptions,
  };
}

async function queryHistoricalSinkholes(
  lat: number, lng: number, state: string
): Promise<{ historicalSinkholes: number; nearbySinkholes: number }> {
  // In production, would query:
  // - Florida DEP Subsidence Incident Reports
  // - State geological survey databases
  // - USGS karst maps

  const karstInfo = KARST_REGIONS[state.toUpperCase()];
  if (!karstInfo) {
    return { historicalSinkholes: 0, nearbySinkholes: 0 };
  }

  // Check if in high-risk area
  const inHighRisk = karstInfo.highRiskAreas.some(area =>
    lat >= area.latRange[0] && lat <= area.latRange[1] &&
    lng >= area.lngRange[0] && lng <= area.lngRange[1]
  );

  return {
    historicalSinkholes: inHighRisk ? 25 : 5,
    nearbySinkholes: inHighRisk ? 3 : 0,
  };
}

function calculateSinkholeInsurance(
  riskLevel: SinkholeRiskAnalysis['riskLevel'],
  state: string
): number {
  const basePremiums: Record<string, number> = {
    'negligible': 0,
    'low': 200,
    'moderate': 500,
    'high': 1500,
    'very_high': 4000,
  };

  let premium = basePremiums[riskLevel];

  // Florida has specific sinkhole coverage requirements and higher rates
  if (state.toUpperCase() === 'FL') {
    premium *= 1.5;
  }

  return Math.round(premium);
}

function generateSinkholeMitigations(
  riskLevel: string,
  state: string
): SinkholeMitigation[] {
  const mitigations: SinkholeMitigation[] = [];

  // Ground Penetrating Radar survey
  if (riskLevel === 'high' || riskLevel === 'very_high') {
    mitigations.push({
      riskType: 'sinkhole',
      action: 'Conduct Ground Penetrating Radar (GPR) survey to detect subsurface voids',
      estimatedCost: { min: 1500, max: 5000 },
      effectiveness: 'very_high',
      timeframe: '1-2 days',
      priority: 'critical',
      groundStabilization: 'Detection',
    });
  }

  // Geotechnical investigation
  if (riskLevel !== 'negligible' && riskLevel !== 'low') {
    mitigations.push({
      riskType: 'sinkhole',
      action: 'Full geotechnical investigation with soil borings',
      estimatedCost: { min: 3000, max: 10000 },
      effectiveness: 'very_high',
      timeframe: '1-2 weeks',
      priority: riskLevel === 'very_high' ? 'critical' : 'recommended',
      groundStabilization: 'Investigation',
    });
  }

  // Compaction grouting
  if (riskLevel === 'high' || riskLevel === 'very_high') {
    mitigations.push({
      riskType: 'sinkhole',
      action: 'Compaction grouting to stabilize soil and fill voids',
      estimatedCost: { min: 15000, max: 75000 },
      effectiveness: 'very_high',
      timeframe: '1-3 weeks',
      insuranceImpact: 'May be required for insurance coverage',
      priority: 'critical',
      groundStabilization: 'Compaction grouting',
    });
  }

  // Chemical grouting
  mitigations.push({
    riskType: 'sinkhole',
    action: 'Chemical grouting (polyurethane injection) for smaller voids',
    estimatedCost: { min: 5000, max: 25000 },
    effectiveness: 'high',
    timeframe: '3-5 days',
    priority: riskLevel === 'moderate' || riskLevel === 'high' ? 'recommended' : 'optional',
    groundStabilization: 'Chemical grouting',
  });

  // Proper drainage
  mitigations.push({
    riskType: 'sinkhole',
    action: 'Install proper drainage to direct water away from foundation',
    estimatedCost: { min: 2000, max: 8000 },
    effectiveness: 'moderate',
    timeframe: '3-5 days',
    insuranceImpact: 'Reduces water infiltration that accelerates sinkhole formation',
    priority: riskLevel === 'negligible' ? 'optional' : 'recommended',
  });

  // Sinkhole insurance
  if (state.toUpperCase() === 'FL' || riskLevel !== 'negligible') {
    mitigations.push({
      riskType: 'sinkhole',
      action: 'Purchase sinkhole coverage (separate from standard homeowners)',
      estimatedCost: { min: 500, max: 4000 },
      effectiveness: 'high',
      timeframe: 'Immediate',
      insuranceImpact: 'Provides financial protection for sinkhole damage',
      priority: riskLevel === 'high' || riskLevel === 'very_high' ? 'critical' : 'recommended',
    });
  }

  return mitigations;
}
```

---

## Combined Geological Risk Assessment

```typescript
// src/lib/analysis/risk/geologicalRisk.ts

import { analyzeEarthquakeRisk, calculateEarthquakeInsurance } from './earthquakeRisk';
import { analyzeSlopeRisk } from './slopeAnalysis';
import { analyzeSinkholeRisk } from './sinkholeRisk';
import type {
  EarthquakeRiskAnalysis,
  SlopeRiskAnalysis,
  SinkholeRiskAnalysis,
  RiskMitigation
} from '@/types/geological-risk';

export interface GeologicalRiskAssessment {
  overallGeologicalRisk: 'low' | 'moderate' | 'high' | 'very_high';
  riskScore: number;
  earthquake: EarthquakeRiskAnalysis;
  slope: SlopeRiskAnalysis;
  sinkhole: SinkholeRiskAnalysis;
  allMitigations: RiskMitigation[];
  criticalWarnings: string[];
  insuranceEstimates: {
    earthquakeInsurance: number;
    sinkholeInsurance: number;
  };
}

export async function analyzeGeologicalRisks(
  latitude: number,
  longitude: number,
  state: string,
  propertyValue: number,
  lotSizeAcres?: number
): Promise<GeologicalRiskAssessment> {
  // Run all geological analyses in parallel
  const [earthquake, slope, sinkhole] = await Promise.all([
    analyzeEarthquakeRisk(latitude, longitude, state),
    analyzeSlopeRisk(latitude, longitude, lotSizeAcres),
    analyzeSinkholeRisk(latitude, longitude, state),
  ]);

  // Calculate overall geological risk score
  const riskScore = calculateGeologicalRiskScore(earthquake, slope, sinkhole);

  // Determine overall risk level
  const overallGeologicalRisk = getOverallRiskLevel(riskScore);

  // Collect all mitigation options
  const allMitigations = collectMitigations(earthquake, slope, sinkhole);

  // Generate critical warnings
  const criticalWarnings = generateWarnings(earthquake, slope, sinkhole);

  // Calculate insurance estimates
  const insuranceEstimates = {
    earthquakeInsurance: calculateEarthquakeInsurance(propertyValue, earthquake),
    sinkholeInsurance: sinkhole.estimatedSinkholeInsurance,
  };

  return {
    overallGeologicalRisk,
    riskScore,
    earthquake,
    slope,
    sinkhole,
    allMitigations,
    criticalWarnings,
    insuranceEstimates,
  };
}

function calculateGeologicalRiskScore(
  earthquake: EarthquakeRiskAnalysis,
  slope: SlopeRiskAnalysis,
  sinkhole: SinkholeRiskAnalysis
): number {
  const riskScores: Record<string, number> = {
    negligible: 5,
    low: 20,
    moderate: 50,
    high: 75,
    very_high: 95,
  };

  const earthquakeScore = riskScores[earthquake.riskLevel] || 20;
  const sinkholeScore = riskScores[sinkhole.riskLevel] || 10;
  const slopeScore =
    slope.landslideRisk === 'high' ? 75 :
    slope.landslideRisk === 'moderate' ? 50 : 20;

  // Weighted average (earthquake and sinkhole more impactful than slope)
  return Math.round(
    earthquakeScore * 0.4 +
    sinkholeScore * 0.35 +
    slopeScore * 0.25
  );
}

function getOverallRiskLevel(score: number): GeologicalRiskAssessment['overallGeologicalRisk'] {
  if (score >= 75) return 'very_high';
  if (score >= 50) return 'high';
  if (score >= 30) return 'moderate';
  return 'low';
}

function collectMitigations(
  earthquake: EarthquakeRiskAnalysis,
  slope: SlopeRiskAnalysis,
  sinkhole: SinkholeRiskAnalysis
): RiskMitigation[] {
  const allMitigations: RiskMitigation[] = [
    ...earthquake.mitigationOptions,
    ...slope.mitigationOptions,
    ...sinkhole.mitigationOptions,
  ];

  // Sort by priority: critical > recommended > optional
  const priorityOrder: Record<string, number> = { critical: 0, recommended: 1, optional: 2 };
  return allMitigations.sort((a, b) =>
    (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2)
  );
}

function generateWarnings(
  earthquake: EarthquakeRiskAnalysis,
  slope: SlopeRiskAnalysis,
  sinkhole: SinkholeRiskAnalysis
): string[] {
  const warnings: string[] = [];

  if (earthquake.riskLevel === 'very_high') {
    warnings.push('CRITICAL: Property is in a very high seismic risk zone. Foundation bolting and structural retrofits strongly recommended.');
  } else if (earthquake.riskLevel === 'high') {
    warnings.push('WARNING: Property is in a high seismic risk zone. Earthquake insurance and retrofits recommended.');
  }

  if (earthquake.liquefactionRisk === 'high') {
    warnings.push('CRITICAL: High liquefaction risk. Soil may lose stability during earthquake shaking.');
  }

  if (slope.landslideRisk === 'high') {
    warnings.push('CRITICAL: High landslide risk. Geotechnical investigation required before purchase.');
  }

  if (slope.maxSlope > 35) {
    warnings.push('WARNING: Some areas of the lot may be unbuildable due to extreme slopes.');
  }

  if (sinkhole.riskLevel === 'very_high') {
    warnings.push('CRITICAL: Very high sinkhole risk. Ground penetrating radar survey essential before purchase.');
  } else if (sinkhole.riskLevel === 'high') {
    warnings.push('WARNING: High sinkhole risk. Geotechnical investigation recommended.');
  }

  if (sinkhole.coverCollapseRisk) {
    warnings.push('ALERT: Property is at risk for cover-collapse sinkholes (sudden ground failure).');
  }

  return warnings;
}
```

---

## UI Components for Displaying Geological Risks

### GeologicalRiskCard Component

```tsx
// src/components/risk/GeologicalRiskCard.tsx

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Mountain, Target, Waves } from 'lucide-react';
import type { GeologicalRiskAssessment } from '@/lib/analysis/risk/geologicalRisk';

interface GeologicalRiskCardProps {
  assessment: GeologicalRiskAssessment;
}

export function GeologicalRiskCard({ assessment }: GeologicalRiskCardProps) {
  const getRiskColor = (level: string) => {
    switch (level) {
      case 'very_high': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'moderate': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      case 'negligible': return 'bg-green-300';
      default: return 'bg-gray-400';
    }
  };

  const getRiskBadgeVariant = (level: string): 'destructive' | 'warning' | 'default' | 'secondary' => {
    switch (level) {
      case 'very_high':
      case 'high':
        return 'destructive';
      case 'moderate':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mountain className="h-5 w-5" />
          Geological Risk Assessment
          <Badge variant={getRiskBadgeVariant(assessment.overallGeologicalRisk)}>
            {assessment.overallGeologicalRisk.replace('_', ' ').toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Risk Score */}
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">Risk Score:</span>
          <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full ${getRiskColor(assessment.overallGeologicalRisk)}`}
              style={{ width: `${assessment.riskScore}%` }}
            />
          </div>
          <span className="font-bold">{assessment.riskScore}/100</span>
        </div>

        {/* Individual Risk Types */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Earthquake Risk */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Waves className="h-4 w-4" />
              <span className="font-medium">Earthquake</span>
            </div>
            <Badge variant={getRiskBadgeVariant(assessment.earthquake.riskLevel)}>
              {assessment.earthquake.riskLevel.toUpperCase()}
            </Badge>
            <p className="text-sm text-muted-foreground mt-2">
              {assessment.earthquake.seismicZone}
            </p>
            <p className="text-xs mt-1">
              PGA: {assessment.earthquake.peakGroundAcceleration.toFixed(2)}g
            </p>
          </div>

          {/* Slope Risk */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Mountain className="h-4 w-4" />
              <span className="font-medium">Slope/Terrain</span>
            </div>
            <Badge variant={getRiskBadgeVariant(assessment.slope.landslideRisk)}>
              {assessment.slope.landslideRisk.toUpperCase()} LANDSLIDE RISK
            </Badge>
            <p className="text-sm text-muted-foreground mt-2">
              {assessment.slope.terrainType}
            </p>
            <p className="text-xs mt-1">
              Avg: {assessment.slope.averageSlope}% | Max: {assessment.slope.maxSlope}%
            </p>
          </div>

          {/* Sinkhole Risk */}
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="h-4 w-4" />
              <span className="font-medium">Sinkhole</span>
            </div>
            <Badge variant={getRiskBadgeVariant(assessment.sinkhole.riskLevel)}>
              {assessment.sinkhole.riskLevel.toUpperCase()}
            </Badge>
            <p className="text-sm text-muted-foreground mt-2">
              {assessment.sinkhole.karstTerrain ? 'Karst Terrain' : 'Non-Karst'}
            </p>
            <p className="text-xs mt-1">
              Nearby: {assessment.sinkhole.nearbySinkholesCount} sinkholes
            </p>
          </div>
        </div>

        {/* Critical Warnings */}
        {assessment.criticalWarnings.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span className="font-medium text-red-700">Critical Warnings</span>
            </div>
            <ul className="space-y-1">
              {assessment.criticalWarnings.map((warning, index) => (
                <li key={index} className="text-sm text-red-600">
                  {warning}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Insurance Estimates */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-2">Estimated Annual Insurance</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-muted-foreground">Earthquake:</span>
              <span className="font-bold ml-2">
                ${assessment.insuranceEstimates.earthquakeInsurance.toLocaleString()}
              </span>
            </div>
            <div>
              <span className="text-sm text-muted-foreground">Sinkhole:</span>
              <span className="font-bold ml-2">
                ${assessment.insuranceEstimates.sinkholeInsurance.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

### MitigationList Component

```tsx
// src/components/risk/MitigationList.tsx

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, AlertCircle, Info } from 'lucide-react';
import type { RiskMitigation } from '@/types/geological-risk';

interface MitigationListProps {
  mitigations: RiskMitigation[];
  title?: string;
}

export function MitigationList({ mitigations, title = 'Recommended Mitigations' }: MitigationListProps) {
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'recommended':
        return <CheckCircle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getPriorityBadgeVariant = (priority: string): 'destructive' | 'warning' | 'secondary' => {
    switch (priority) {
      case 'critical':
        return 'destructive';
      case 'recommended':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  const formatCost = (cost: { min: number; max: number }) => {
    return `$${cost.min.toLocaleString()} - $${cost.max.toLocaleString()}`;
  };

  const groupedMitigations = mitigations.reduce((groups, mitigation) => {
    const priority = mitigation.priority;
    if (!groups[priority]) {
      groups[priority] = [];
    }
    groups[priority].push(mitigation);
    return groups;
  }, {} as Record<string, RiskMitigation[]>);

  const priorityOrder = ['critical', 'recommended', 'optional'];

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {priorityOrder.map(priority => {
          const items = groupedMitigations[priority];
          if (!items || items.length === 0) return null;

          return (
            <div key={priority}>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                {getPriorityIcon(priority)}
                <span className="capitalize">{priority}</span>
                <Badge variant={getPriorityBadgeVariant(priority)} className="ml-2">
                  {items.length}
                </Badge>
              </h4>
              <div className="space-y-3">
                {items.map((mitigation, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium">{mitigation.action}</span>
                      <Badge variant="outline" className="text-xs">
                        {mitigation.riskType}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-muted-foreground">
                      <div>
                        <span className="font-medium">Cost:</span>{' '}
                        {formatCost(mitigation.estimatedCost)}
                      </div>
                      <div>
                        <span className="font-medium">Time:</span>{' '}
                        {mitigation.timeframe}
                      </div>
                      <div>
                        <span className="font-medium">Effectiveness:</span>{' '}
                        <span className="capitalize">{mitigation.effectiveness}</span>
                      </div>
                      {mitigation.insuranceImpact && (
                        <div className="col-span-2 md:col-span-4 text-green-600">
                          <span className="font-medium">Insurance:</span>{' '}
                          {mitigation.insuranceImpact}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {mitigations.length === 0 && (
          <p className="text-muted-foreground text-center py-4">
            No specific mitigations required for this property.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
```

---

## Integration with Property Detail Page

```tsx
// src/app/properties/[id]/page.tsx (partial)

import { GeologicalRiskCard } from '@/components/risk/GeologicalRiskCard';
import { MitigationList } from '@/components/risk/MitigationList';
import { analyzeGeologicalRisks } from '@/lib/analysis/risk/geologicalRisk';

// Inside the component:
const geologicalRisks = await analyzeGeologicalRisks(
  property.latitude,
  property.longitude,
  property.state,
  property.estimatedValue || 100000,
  property.lotSizeAcres
);

// In the render:
<Tabs defaultValue="risk">
  <TabsList>
    <TabsTrigger value="overview">Overview</TabsTrigger>
    <TabsTrigger value="risk">Risk Analysis</TabsTrigger>
    <TabsTrigger value="mitigations">Mitigations</TabsTrigger>
  </TabsList>

  <TabsContent value="risk">
    <GeologicalRiskCard assessment={geologicalRisks} />
  </TabsContent>

  <TabsContent value="mitigations">
    <MitigationList
      mitigations={geologicalRisks.allMitigations}
      title="Geological Risk Mitigations"
    />
  </TabsContent>
</Tabs>
```

---

## Verification Steps

1. **Earthquake Risk Testing:**
   - Test California addresses (expect high/very_high risk)
   - Test Pennsylvania addresses (expect low/moderate risk)
   - Verify fault proximity detection for Bay Area properties
   - Verify liquefaction risk assessment

2. **Slope Analysis Testing:**
   - Test hilly terrain (e.g., San Francisco hills)
   - Test flat terrain (e.g., Florida)
   - Verify grading cost estimates
   - Verify landslide risk levels

3. **Sinkhole Risk Testing:**
   - Test Central Florida addresses (expect very_high risk)
   - Test Texas Hill Country addresses (expect high risk)
   - Test Pennsylvania addresses (expect moderate risk)
   - Test Michigan addresses (expect negligible risk)

4. **Mitigation Verification:**
   - Verify critical mitigations appear first
   - Verify cost estimates are reasonable
   - Verify insurance impact descriptions

5. **UI Component Testing:**
   - Verify badges display correct colors
   - Verify warnings appear for high-risk properties
   - Verify insurance estimates display correctly

---

## Next Steps

After implementing Phase 7b, proceed to:
- **Phase 7c: Environmental Risk Analysis** - Superfund sites, UST, brownfields
- **Phase 7d: Climate Risk Analysis** - Flood, wildfire, hurricane
- **Phase 8: Financial Analysis Engine** - Investment calculations and projections
