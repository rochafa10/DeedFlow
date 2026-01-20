# Phase 7A: Water Risks Analysis (Flood & Hurricane)

## Overview

This document provides a complete, standalone implementation plan for flood and hurricane risk analysis in the Tax Deed Flow application. Water-related risks are critical for property investment decisions, especially in coastal states like Florida, Texas, and Louisiana, as well as riverine flood zones throughout the country.

### Key Risk Types
| Risk Type | Data Source | Base Weight | Adaptive Notes |
|-----------|-------------|-------------|----------------|
| Flood | FEMA NFHL | 25% | +10% in coastal/riverine areas |
| Hurricane | NOAA/NHC | 15% | +20% in FL, TX, LA coastal; 0% in non-coastal states |

### High-Risk Regions
```typescript
const WATER_RISK_REGIONS = {
  hurricane: {
    coastal_high: ['FL', 'TX', 'LA', 'MS', 'AL'],
    coastal_moderate: ['NC', 'SC', 'GA', 'VA', 'MD', 'NJ', 'NY', 'MA', 'CT', 'RI'],
    non_coastal: [] // All other states
  },
  flood: {
    riverine_high: ['LA', 'MS', 'AR', 'MO', 'IL', 'IN', 'OH', 'KY', 'TN'],
    coastal_high: ['FL', 'TX', 'LA', 'NC', 'SC'],
    flash_flood: ['CO', 'AZ', 'NM', 'UT', 'NV']
  }
};
```

---

## TypeScript Interfaces

```typescript
// src/types/water-risk.ts

export interface FloodRiskAnalysis {
  zone: string;
  zoneDescription: string;
  zoneDetailedExplanation: string;
  inFloodplain: boolean;
  inSpecialFloodHazardArea: boolean;
  baseFloodElevation?: number;
  annualFloodProbability: number;
  thirtyYearFloodProbability: number;
  insuranceRequired: boolean;
  estimatedFloodInsurance: number;
  riskLevel: 'minimal' | 'moderate' | 'high' | 'very_high';
  mapPanel?: string;
  effectiveDate?: string;
  communityNumber?: string;
  communityName?: string;
  loma?: boolean; // Letter of Map Amendment
  mitigationOptions: FloodMitigation[];
}

export interface HurricaneRiskAnalysis {
  inHurricaneZone: boolean;
  windZone: string;
  windZoneDescription: string;
  designWindSpeed: number; // mph
  stormSurgeRisk: boolean;
  stormSurgeZone?: string; // A, B, C, etc.
  distanceToCoast: number;
  historicalHurricanes: number;
  avgCategoryHistory: number;
  riskLevel: 'low' | 'moderate' | 'high' | 'very_high';
  windMitigationCredits: boolean;
  mitigationOptions: HurricaneMitigation[];
}

export interface FloodMitigation {
  riskType: 'flood';
  action: string;
  estimatedCost: { min: number; max: number };
  effectiveness: 'low' | 'moderate' | 'high' | 'very_high';
  timeframe: string;
  insuranceImpact?: string;
  priority: 'optional' | 'recommended' | 'critical';
  bfeElevationGain?: number;
}

export interface HurricaneMitigation {
  riskType: 'hurricane';
  action: string;
  estimatedCost: { min: number; max: number };
  effectiveness: 'low' | 'moderate' | 'high' | 'very_high';
  timeframe: string;
  insuranceImpact?: string;
  priority: 'optional' | 'recommended' | 'critical';
  windRatingImprovement?: string;
}

export interface WaterRiskSummary {
  flood: FloodRiskAnalysis;
  hurricane: HurricaneRiskAnalysis;
  combinedWaterRisk: 'low' | 'moderate' | 'high' | 'severe';
  totalWaterInsurance: number;
  criticalWarnings: string[];
  primaryConcern: 'flood' | 'hurricane' | 'both' | 'none';
}
```

---

## API Endpoints and Data Sources

### FEMA Flood Zone API
```typescript
// src/lib/api-services/fema-service.ts

export interface FEMAFloodData {
  floodZone: string;
  inFloodplain: boolean;
  baseFloodElevation?: number;
  mapPanel?: string;
  effectiveDate?: string;
  communityNumber?: string;
  communityName?: string;
  loma?: boolean;
}

export class FEMAService {
  private baseUrl = 'https://hazards.fema.gov/gis/nfhl/rest/services';

  async getFloodZone(latitude: number, longitude: number): Promise<FEMAFloodData> {
    // FEMA National Flood Hazard Layer (NFHL)
    const url = `${this.baseUrl}/public/NFHL/MapServer/28/query`;

    const params = new URLSearchParams({
      geometry: JSON.stringify({ x: longitude, y: latitude, spatialReference: { wkid: 4326 } }),
      geometryType: 'esriGeometryPoint',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: 'FLD_ZONE,ZONE_SUBTY,STATIC_BFE,DFIRM_ID,VERSION_ID,FLD_AR_ID',
      returnGeometry: 'false',
      f: 'json'
    });

    try {
      const response = await fetch(`${url}?${params}`);
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const feature = data.features[0].attributes;
        return {
          floodZone: feature.FLD_ZONE || 'X',
          inFloodplain: this.isInFloodplain(feature.FLD_ZONE),
          baseFloodElevation: feature.STATIC_BFE,
          mapPanel: feature.DFIRM_ID,
          effectiveDate: feature.VERSION_ID,
          communityNumber: feature.FLD_AR_ID?.substring(0, 6),
          loma: false // Would need additional query
        };
      }

      return {
        floodZone: 'X',
        inFloodplain: false
      };
    } catch (error) {
      console.error('FEMA API error:', error);
      return {
        floodZone: 'X',
        inFloodplain: false
      };
    }
  }

  private isInFloodplain(zone: string): boolean {
    const floodplainZones = ['A', 'AE', 'AH', 'AO', 'AR', 'A99', 'V', 'VE'];
    return floodplainZones.includes(zone?.toUpperCase());
  }

  async getFloodInsuranceZone(latitude: number, longitude: number): Promise<{
    nfipCommunity: boolean;
    preferredRiskEligible: boolean;
    emergencyProgram: boolean;
  }> {
    // NFIP Community Status
    const url = `${this.baseUrl}/public/NFHL/MapServer/3/query`;

    const params = new URLSearchParams({
      geometry: JSON.stringify({ x: longitude, y: latitude, spatialReference: { wkid: 4326 } }),
      geometryType: 'esriGeometryPoint',
      spatialRel: 'esriSpatialRelIntersects',
      outFields: 'CID,COMM_NO,COMM_NAME,PROG_TYPE',
      returnGeometry: 'false',
      f: 'json'
    });

    try {
      const response = await fetch(`${url}?${params}`);
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const feature = data.features[0].attributes;
        return {
          nfipCommunity: true,
          preferredRiskEligible: feature.PROG_TYPE === 'R',
          emergencyProgram: feature.PROG_TYPE === 'E'
        };
      }

      return {
        nfipCommunity: false,
        preferredRiskEligible: false,
        emergencyProgram: false
      };
    } catch (error) {
      return {
        nfipCommunity: false,
        preferredRiskEligible: false,
        emergencyProgram: false
      };
    }
  }
}
```

### NOAA Hurricane Data API
```typescript
// src/lib/api-services/noaa-service.ts

export interface NOAAHurricaneData {
  historicalCount: number;
  recentHurricanes: HurricaneEvent[];
  averageCategory: number;
  stormSurgeZone?: string;
}

export interface HurricaneEvent {
  name: string;
  year: number;
  category: number;
  maxWindSpeed: number;
  distanceToProperty: number;
}

export class NOAAService {
  private baseUrl = 'https://www.nhc.noaa.gov/data';

  async getHistoricalHurricanes(
    latitude: number,
    longitude: number,
    radiusMiles: number = 50,
    years: number = 30
  ): Promise<NOAAHurricaneData> {
    // NOAA Historical Hurricane Tracks (HURDAT2)
    // Note: In production, this would query the IBTrACS or HURDAT2 database

    try {
      // Calculate bounding box for search
      const latDelta = radiusMiles / 69; // Approximate miles per degree latitude
      const lngDelta = radiusMiles / (69 * Math.cos(latitude * Math.PI / 180));

      const bbox = {
        minLat: latitude - latDelta,
        maxLat: latitude + latDelta,
        minLng: longitude - lngDelta,
        maxLng: longitude + lngDelta
      };

      // In production, query historical hurricane database
      // For now, return estimated data based on location
      const hurricaneData = this.estimateHurricaneRisk(latitude, longitude);

      return hurricaneData;
    } catch (error) {
      console.error('NOAA API error:', error);
      return {
        historicalCount: 0,
        recentHurricanes: [],
        averageCategory: 0
      };
    }
  }

  private estimateHurricaneRisk(lat: number, lng: number): NOAAHurricaneData {
    // Simplified hurricane risk estimation based on location
    // Florida peninsula
    if (lat >= 24 && lat <= 31 && lng >= -88 && lng <= -79) {
      return {
        historicalCount: 45,
        recentHurricanes: this.getSampleHurricanes('FL'),
        averageCategory: 2.1,
        stormSurgeZone: lat < 27 ? 'A' : 'B'
      };
    }

    // Gulf Coast (TX, LA, MS, AL)
    if (lat >= 27 && lat <= 31 && lng >= -98 && lng <= -87) {
      return {
        historicalCount: 35,
        recentHurricanes: this.getSampleHurricanes('GULF'),
        averageCategory: 1.8,
        stormSurgeZone: 'B'
      };
    }

    // Southeast Atlantic Coast (GA, SC, NC)
    if (lat >= 31 && lat <= 36 && lng >= -82 && lng <= -75) {
      return {
        historicalCount: 25,
        recentHurricanes: this.getSampleHurricanes('SE'),
        averageCategory: 1.5
      };
    }

    // Mid-Atlantic (VA, MD, NJ, NY)
    if (lat >= 36 && lat <= 42 && lng >= -76 && lng <= -72) {
      return {
        historicalCount: 12,
        recentHurricanes: this.getSampleHurricanes('MID'),
        averageCategory: 1.0
      };
    }

    // Default - low hurricane risk
    return {
      historicalCount: 0,
      recentHurricanes: [],
      averageCategory: 0
    };
  }

  private getSampleHurricanes(region: string): HurricaneEvent[] {
    // Sample historical hurricanes by region
    const hurricanes: Record<string, HurricaneEvent[]> = {
      FL: [
        { name: 'Ian', year: 2022, category: 4, maxWindSpeed: 150, distanceToProperty: 25 },
        { name: 'Irma', year: 2017, category: 4, maxWindSpeed: 130, distanceToProperty: 40 },
        { name: 'Michael', year: 2018, category: 5, maxWindSpeed: 160, distanceToProperty: 60 }
      ],
      GULF: [
        { name: 'Laura', year: 2020, category: 4, maxWindSpeed: 150, distanceToProperty: 30 },
        { name: 'Harvey', year: 2017, category: 4, maxWindSpeed: 130, distanceToProperty: 20 },
        { name: 'Ida', year: 2021, category: 4, maxWindSpeed: 150, distanceToProperty: 35 }
      ],
      SE: [
        { name: 'Florence', year: 2018, category: 4, maxWindSpeed: 140, distanceToProperty: 45 },
        { name: 'Hugo', year: 1989, category: 4, maxWindSpeed: 140, distanceToProperty: 30 }
      ],
      MID: [
        { name: 'Sandy', year: 2012, category: 1, maxWindSpeed: 80, distanceToProperty: 50 },
        { name: 'Irene', year: 2011, category: 1, maxWindSpeed: 75, distanceToProperty: 60 }
      ]
    };

    return hurricanes[region] || [];
  }

  async getStormSurgeZone(latitude: number, longitude: number): Promise<string | undefined> {
    // NOAA Storm Surge Inundation Maps
    // In production, would query NOAA SLOSH model data

    // Estimate based on distance to coast and elevation
    const distanceToCoast = await this.estimateDistanceToCoast(latitude, longitude);

    if (distanceToCoast < 1) return 'A'; // Highest surge risk
    if (distanceToCoast < 5) return 'B';
    if (distanceToCoast < 15) return 'C';
    if (distanceToCoast < 30) return 'D';
    return undefined; // Outside surge zone
  }

  async estimateDistanceToCoast(lat: number, lng: number): Promise<number> {
    // Simplified coast distance estimation
    // In production, use actual coastline data

    // Gulf coast approximation
    if (lng >= -98 && lng <= -80) {
      const coastLat = 30; // Approximate Gulf coast latitude
      return Math.abs(lat - coastLat) * 69; // miles
    }

    // Atlantic coast approximation
    if (lng >= -82 && lng <= -72) {
      // Varies by latitude - simplified
      return 50; // Default
    }

    return 100; // Far from coast
  }
}
```

---

## Flood Risk Analysis Implementation

```typescript
// src/lib/analysis/risk/floodRisk.ts

import { FEMAService } from '@/lib/api-services/fema-service';
import type { FloodRiskAnalysis, FloodMitigation } from '@/types/water-risk';

// Comprehensive FEMA flood zone definitions
const FLOOD_ZONES: Record<string, {
  risk: string;
  sfha: boolean;
  insurance: boolean;
  probability: number;
  description: string;
  detailedExplanation: string;
}> = {
  // Minimal Risk Zones
  'X': {
    risk: 'minimal',
    sfha: false,
    insurance: false,
    probability: 0.002,
    description: 'Area of minimal flood hazard',
    detailedExplanation: 'Zone X (unshaded) represents areas outside the 0.2% annual chance floodplain (500-year flood). These areas have less than a 0.2% annual chance of flooding. While flood insurance is not required, about 25% of flood claims come from these low-risk areas.'
  },
  'C': {
    risk: 'minimal',
    sfha: false,
    insurance: false,
    probability: 0.002,
    description: 'Area of minimal flood hazard (older designation)',
    detailedExplanation: 'Zone C is an older designation equivalent to Zone X (unshaded). It represents areas of minimal flood hazard outside the 500-year floodplain.'
  },

  // Moderate Risk Zones (500-year flood)
  'X500': {
    risk: 'moderate',
    sfha: false,
    insurance: false,
    probability: 0.002,
    description: 'Area between 100-year and 500-year floodplain',
    detailedExplanation: 'Zone X (shaded) or X500 represents the 0.2% annual chance flood hazard area (500-year flood). Properties have between 0.2% and 1% annual chance of flooding. Flood insurance is recommended but not required for federally-backed mortgages. Preferred Risk Policy (PRP) rates may be available.'
  },
  'B': {
    risk: 'moderate',
    sfha: false,
    insurance: false,
    probability: 0.002,
    description: 'Moderate flood hazard area (older designation)',
    detailedExplanation: 'Zone B is an older designation equivalent to Zone X (shaded). It represents the area between the 100-year and 500-year flood levels, or areas protected by levees from 100-year floods.'
  },

  // High Risk Zones (100-year flood) - Special Flood Hazard Areas (SFHA)
  'A': {
    risk: 'high',
    sfha: true,
    insurance: true,
    probability: 0.01,
    description: 'High-risk zone, no BFE determined',
    detailedExplanation: 'Zone A is a Special Flood Hazard Area (SFHA) with 1% annual chance of flooding (100-year flood). No Base Flood Elevation (BFE) has been determined. Flood insurance is MANDATORY for federally-backed mortgages. Over a 30-year mortgage, there is a 26% chance of flooding.'
  },
  'AE': {
    risk: 'high',
    sfha: true,
    insurance: true,
    probability: 0.01,
    description: 'High-risk zone with BFE determined',
    detailedExplanation: 'Zone AE is a Special Flood Hazard Area where Base Flood Elevations (BFE) have been determined through detailed hydraulic analyses. Flood insurance is MANDATORY. Building must be elevated to or above BFE. This is the most common high-risk zone designation.'
  },
  'AH': {
    risk: 'high',
    sfha: true,
    insurance: true,
    probability: 0.01,
    description: 'High-risk zone with shallow flooding (1-3 feet)',
    detailedExplanation: 'Zone AH represents areas with 1% annual chance of shallow flooding, usually ponding areas where flood depths are 1-3 feet. BFE is determined. Common around lakes, ponds, and low-lying areas without defined channels.'
  },
  'AO': {
    risk: 'high',
    sfha: true,
    insurance: true,
    probability: 0.01,
    description: 'High-risk zone with sheet flow (1-3 feet)',
    detailedExplanation: 'Zone AO represents areas with 1% annual chance of shallow flooding with sheet flow on sloping terrain. Flood depths are typically 1-3 feet. Instead of BFE, flood depths are specified. Buildings must be elevated above the highest adjacent grade by the depth number.'
  },
  'AR': {
    risk: 'high',
    sfha: true,
    insurance: true,
    probability: 0.01,
    description: 'High-risk zone during levee restoration',
    detailedExplanation: 'Zone AR represents areas with temporarily increased flood risk while a flood control system (like a levee) is being restored. Once restoration is complete, the zone may be revised. Properties face higher risk during this period.'
  },
  'A99': {
    risk: 'high',
    sfha: true,
    insurance: true,
    probability: 0.01,
    description: 'High-risk zone protected by levee under construction',
    detailedExplanation: 'Zone A99 represents areas protected by a federal flood protection system under construction. The system must reach completion within a set timeframe. Once complete, the area may be remapped to a lower-risk zone.'
  },

  // Very High Risk Zones (Coastal)
  'V': {
    risk: 'very_high',
    sfha: true,
    insurance: true,
    probability: 0.01,
    description: 'Coastal high-hazard zone with wave action',
    detailedExplanation: 'Zone V (Velocity) is a coastal Special Flood Hazard Area with additional hazards from storm-induced waves. Wave heights of 3 feet or more are expected. Structures must be elevated on pilings or columns. No BFE determined. This is the highest-risk coastal zone.'
  },
  'VE': {
    risk: 'very_high',
    sfha: true,
    insurance: true,
    probability: 0.01,
    description: 'Coastal high-hazard zone with BFE determined',
    detailedExplanation: 'Zone VE is a coastal Special Flood Hazard Area where Base Flood Elevations have been determined. Subject to high-velocity wave action (waves 3+ feet). Strictest building requirements apply: structures must be on pilings/columns, no fill allowed, breakaway walls required below BFE. Insurance rates are highest in this zone.'
  },

  // Other Zones
  'D': {
    risk: 'moderate',
    sfha: false,
    insurance: false,
    probability: 0.005,
    description: 'Area with possible but undetermined flood hazard',
    detailedExplanation: 'Zone D represents areas where flood hazards are undetermined but possible. No analysis has been performed. This is often found in areas being newly mapped or with limited data. A flood study is recommended before development.'
  },
};

export async function analyzeFloodRisk(
  latitude: number,
  longitude: number,
  propertyValue: number
): Promise<FloodRiskAnalysis> {
  const femaService = new FEMAService();
  const femaData = await femaService.getFloodZone(latitude, longitude);

  const zone = femaData.floodZone?.toUpperCase() || 'X';
  const zoneInfo = FLOOD_ZONES[zone] || FLOOD_ZONES['X'];

  // Calculate flood probability over 30-year mortgage
  const thirtyYearProb = 1 - Math.pow(1 - zoneInfo.probability, 30);

  // Calculate estimated flood insurance
  let estimatedInsurance = 0;
  if (zoneInfo.sfha) {
    // NFIP Risk Rating 2.0 estimates
    const coverage = Math.min(propertyValue, 250000); // NFIP max for building

    if (zone.startsWith('V')) {
      // Coastal: highest rates
      estimatedInsurance = Math.max(coverage * 0.008, 2500);
    } else if (zone === 'AE' || zone === 'A') {
      // Riverine high risk
      estimatedInsurance = Math.max(coverage * 0.004, 1200);
    } else {
      // Other SFHA zones
      estimatedInsurance = Math.max(coverage * 0.003, 800);
    }
  } else if (zone === 'X500' || zone === 'B') {
    // Preferred Risk Policy eligible
    estimatedInsurance = 500; // PRP rates start around $500/year
  }

  // Generate mitigation options
  const mitigationOptions = generateFloodMitigations(zone, femaData.baseFloodElevation);

  return {
    zone,
    zoneDescription: zoneInfo.description,
    zoneDetailedExplanation: zoneInfo.detailedExplanation,
    inFloodplain: femaData.inFloodplain || zoneInfo.sfha,
    inSpecialFloodHazardArea: zoneInfo.sfha,
    baseFloodElevation: femaData.baseFloodElevation,
    annualFloodProbability: zoneInfo.probability,
    thirtyYearFloodProbability: Math.round(thirtyYearProb * 100) / 100,
    insuranceRequired: zoneInfo.insurance,
    estimatedFloodInsurance: Math.round(estimatedInsurance),
    riskLevel: zoneInfo.risk as FloodRiskAnalysis['riskLevel'],
    mapPanel: femaData.mapPanel,
    effectiveDate: femaData.effectiveDate,
    communityNumber: femaData.communityNumber,
    communityName: femaData.communityName,
    loma: femaData.loma,
    mitigationOptions,
  };
}

function generateFloodMitigations(
  zone: string,
  bfe?: number
): FloodMitigation[] {
  const mitigations: FloodMitigation[] = [];
  const zoneInfo = FLOOD_ZONES[zone] || FLOOD_ZONES['X'];

  if (zoneInfo.sfha) {
    // Elevation
    mitigations.push({
      riskType: 'flood',
      action: 'Elevate structure above Base Flood Elevation (BFE)',
      estimatedCost: { min: 30000, max: 150000 },
      effectiveness: 'very_high',
      timeframe: '3-6 months',
      insuranceImpact: 'Can reduce flood insurance premium by 50-90%',
      priority: 'recommended',
      bfeElevationGain: 2, // feet above BFE
    });

    // Flood vents
    mitigations.push({
      riskType: 'flood',
      action: 'Install engineered flood vents in foundation',
      estimatedCost: { min: 500, max: 2500 },
      effectiveness: 'moderate',
      timeframe: '1-2 days',
      insuranceImpact: 'May qualify for lower NFIP rates',
      priority: 'recommended',
    });

    // Dry floodproofing
    mitigations.push({
      riskType: 'flood',
      action: 'Dry floodproof exterior walls (sealants, shields)',
      estimatedCost: { min: 3000, max: 15000 },
      effectiveness: 'moderate',
      timeframe: '1-2 weeks',
      insuranceImpact: 'Only applicable for non-residential or pre-FIRM buildings',
      priority: 'optional',
    });
  }

  if (zone.startsWith('V')) {
    // Coastal-specific
    mitigations.push({
      riskType: 'flood',
      action: 'Install breakaway walls below elevated floor',
      estimatedCost: { min: 5000, max: 20000 },
      effectiveness: 'high',
      timeframe: '2-4 weeks',
      insuranceImpact: 'Required for V-zone compliance',
      priority: 'critical',
    });
  }

  // LOMA application
  if (zoneInfo.sfha) {
    mitigations.push({
      riskType: 'flood',
      action: 'Apply for Letter of Map Amendment (LOMA) if structure is above BFE',
      estimatedCost: { min: 500, max: 2000 },
      effectiveness: 'very_high',
      timeframe: '60-90 days',
      insuranceImpact: 'If approved, removes mandatory flood insurance requirement',
      priority: 'recommended',
    });
  }

  // General recommendations
  mitigations.push({
    riskType: 'flood',
    action: 'Install sump pump with battery backup',
    estimatedCost: { min: 1000, max: 3000 },
    effectiveness: 'moderate',
    timeframe: '1-2 days',
    priority: zone === 'X' || zone === 'C' ? 'optional' : 'recommended',
  });

  return mitigations;
}

export function getFloodInsuranceRecommendation(
  analysis: FloodRiskAnalysis
): string {
  if (analysis.inSpecialFloodHazardArea) {
    return `Flood insurance is REQUIRED for federally-backed mortgages in ${analysis.zone} zone. Over a 30-year mortgage, there is a ${(analysis.thirtyYearFloodProbability * 100).toFixed(0)}% chance of flooding. Estimated annual premium: $${analysis.estimatedFloodInsurance.toLocaleString()}`;
  }
  if (analysis.inFloodplain) {
    return `Property is in ${analysis.zone} zone (moderate risk). Flood insurance is not required but recommended. Preferred Risk Policies may be available at reduced rates (~$500/year).`;
  }
  return `Property is in ${analysis.zone} zone (minimal risk). Flood insurance is optional. Note: About 25% of flood insurance claims come from low-risk areas. Consider coverage for peace of mind.`;
}
```

---

## Hurricane Risk Analysis Implementation

```typescript
// src/lib/analysis/risk/hurricaneRisk.ts

import { NOAAService } from '@/lib/api-services/noaa-service';
import type { HurricaneRiskAnalysis, HurricaneMitigation } from '@/types/water-risk';

// Wind zone definitions based on ASCE 7 and Florida Building Code
const WIND_ZONES: Record<string, {
  description: string;
  designWindSpeed: number;
  riskLevel: string;
}> = {
  'Zone I': {
    description: 'Basic wind zone (interior regions)',
    designWindSpeed: 85,
    riskLevel: 'low'
  },
  'Zone II': {
    description: 'Moderate wind zone (inland coastal)',
    designWindSpeed: 100,
    riskLevel: 'moderate'
  },
  'Zone III': {
    description: 'High wind zone (coastal)',
    designWindSpeed: 120,
    riskLevel: 'high'
  },
  'Zone IV': {
    description: 'Very high wind zone (hurricane-prone coastal)',
    designWindSpeed: 150,
    riskLevel: 'very_high'
  },
  'HVHZ': {
    description: 'High Velocity Hurricane Zone (South FL)',
    designWindSpeed: 175,
    riskLevel: 'very_high'
  }
};

// Storm surge zone descriptions
const STORM_SURGE_ZONES: Record<string, string> = {
  'A': 'Category 1 storm surge inundation - highest risk, evacuate early',
  'B': 'Category 2 storm surge inundation - high risk, mandatory evacuation likely',
  'C': 'Category 3 storm surge inundation - moderate-high risk, evacuation recommended',
  'D': 'Category 4 storm surge inundation - moderate risk, may need to evacuate',
  'E': 'Category 5 storm surge inundation - lower risk but still possible'
};

export async function analyzeHurricaneRisk(
  latitude: number,
  longitude: number,
  state: string,
  distanceToCoast?: number
): Promise<HurricaneRiskAnalysis> {
  const noaaService = new NOAAService();

  // Get historical hurricane data
  const hurricaneData = await noaaService.getHistoricalHurricanes(
    latitude,
    longitude,
    50, // 50 mile radius
    30  // 30 years of history
  );

  // Get storm surge zone
  const stormSurgeZone = await noaaService.getStormSurgeZone(latitude, longitude);

  // Calculate distance to coast if not provided
  const coastDistance = distanceToCoast ??
    await noaaService.estimateDistanceToCoast(latitude, longitude);

  // Determine wind zone and risk level
  const { windZone, windZoneInfo } = determineWindZone(state, coastDistance, latitude);

  // Determine if in hurricane zone
  const inHurricaneZone = isInHurricaneZone(state, coastDistance);

  // Calculate storm surge risk
  const stormSurgeRisk =
    stormSurgeZone !== undefined &&
    ['A', 'B', 'C'].includes(stormSurgeZone);

  // Determine overall risk level
  const riskLevel = calculateHurricaneRiskLevel(
    hurricaneData.historicalCount,
    hurricaneData.averageCategory,
    coastDistance,
    stormSurgeRisk
  );

  // Check if eligible for wind mitigation credits
  const windMitigationCredits =
    ['FL', 'SC', 'NC', 'GA', 'AL', 'MS', 'LA', 'TX'].includes(state.toUpperCase());

  // Generate mitigation options
  const mitigationOptions = generateHurricaneMitigations(
    riskLevel,
    stormSurgeRisk,
    windMitigationCredits
  );

  return {
    inHurricaneZone,
    windZone,
    windZoneDescription: windZoneInfo.description,
    designWindSpeed: windZoneInfo.designWindSpeed,
    stormSurgeRisk,
    stormSurgeZone,
    distanceToCoast: coastDistance,
    historicalHurricanes: hurricaneData.historicalCount,
    avgCategoryHistory: hurricaneData.averageCategory,
    riskLevel,
    windMitigationCredits,
    mitigationOptions
  };
}

function determineWindZone(
  state: string,
  distanceToCoast: number,
  latitude: number
): { windZone: string; windZoneInfo: typeof WIND_ZONES[string] } {
  const stateUpper = state.toUpperCase();

  // South Florida - High Velocity Hurricane Zone
  if (stateUpper === 'FL' && latitude < 27) {
    return {
      windZone: 'HVHZ',
      windZoneInfo: WIND_ZONES['HVHZ']
    };
  }

  // Florida coastal
  if (stateUpper === 'FL') {
    if (distanceToCoast < 10) {
      return { windZone: 'Zone IV', windZoneInfo: WIND_ZONES['Zone IV'] };
    }
    if (distanceToCoast < 50) {
      return { windZone: 'Zone III', windZoneInfo: WIND_ZONES['Zone III'] };
    }
    return { windZone: 'Zone II', windZoneInfo: WIND_ZONES['Zone II'] };
  }

  // Gulf Coast states
  if (['TX', 'LA', 'MS', 'AL'].includes(stateUpper)) {
    if (distanceToCoast < 25) {
      return { windZone: 'Zone III', windZoneInfo: WIND_ZONES['Zone III'] };
    }
    if (distanceToCoast < 75) {
      return { windZone: 'Zone II', windZoneInfo: WIND_ZONES['Zone II'] };
    }
  }

  // Southeast Atlantic Coast
  if (['NC', 'SC', 'GA'].includes(stateUpper)) {
    if (distanceToCoast < 25) {
      return { windZone: 'Zone III', windZoneInfo: WIND_ZONES['Zone III'] };
    }
    if (distanceToCoast < 50) {
      return { windZone: 'Zone II', windZoneInfo: WIND_ZONES['Zone II'] };
    }
  }

  // Mid-Atlantic
  if (['VA', 'MD', 'DE', 'NJ', 'NY'].includes(stateUpper) && distanceToCoast < 25) {
    return { windZone: 'Zone II', windZoneInfo: WIND_ZONES['Zone II'] };
  }

  // Default - basic wind zone
  return { windZone: 'Zone I', windZoneInfo: WIND_ZONES['Zone I'] };
}

function isInHurricaneZone(state: string, distanceToCoast: number): boolean {
  const hurricaneStates = ['FL', 'TX', 'LA', 'MS', 'AL', 'GA', 'SC', 'NC', 'VA', 'MD', 'DE', 'NJ', 'NY', 'CT', 'RI', 'MA'];

  if (!hurricaneStates.includes(state.toUpperCase())) {
    return false;
  }

  // For coastal states, check distance
  return distanceToCoast < 150; // Within 150 miles of coast
}

function calculateHurricaneRiskLevel(
  historicalCount: number,
  avgCategory: number,
  distanceToCoast: number,
  stormSurgeRisk: boolean
): HurricaneRiskAnalysis['riskLevel'] {
  let score = 0;

  // Historical hurricane count (0-30 points)
  if (historicalCount > 30) score += 30;
  else if (historicalCount > 20) score += 25;
  else if (historicalCount > 10) score += 15;
  else if (historicalCount > 5) score += 10;
  else if (historicalCount > 0) score += 5;

  // Average hurricane category (0-30 points)
  score += Math.min(avgCategory * 10, 30);

  // Distance to coast (0-25 points)
  if (distanceToCoast < 10) score += 25;
  else if (distanceToCoast < 25) score += 20;
  else if (distanceToCoast < 50) score += 15;
  else if (distanceToCoast < 100) score += 10;
  else if (distanceToCoast < 150) score += 5;

  // Storm surge risk (0-15 points)
  if (stormSurgeRisk) score += 15;

  // Determine risk level
  if (score >= 75) return 'very_high';
  if (score >= 50) return 'high';
  if (score >= 25) return 'moderate';
  return 'low';
}

function generateHurricaneMitigations(
  riskLevel: string,
  stormSurgeRisk: boolean,
  windMitigationCredits: boolean
): HurricaneMitigation[] {
  const mitigations: HurricaneMitigation[] = [];

  // Impact-resistant windows
  if (riskLevel === 'high' || riskLevel === 'very_high') {
    mitigations.push({
      riskType: 'hurricane',
      action: 'Install impact-resistant windows and doors (Large Missile certified)',
      estimatedCost: { min: 10000, max: 40000 },
      effectiveness: 'very_high',
      timeframe: '1-2 weeks',
      insuranceImpact: 'Up to 45% discount on windstorm insurance in FL',
      priority: 'critical',
      windRatingImprovement: 'Large Missile Impact Certified',
    });
  }

  // Roof tie-downs
  mitigations.push({
    riskType: 'hurricane',
    action: 'Install roof-to-wall connectors (hurricane clips/straps)',
    estimatedCost: { min: 2000, max: 10000 },
    effectiveness: 'very_high',
    timeframe: '2-5 days',
    insuranceImpact: 'Major insurance discount factor',
    priority: riskLevel === 'low' ? 'optional' : 'critical',
    windRatingImprovement: 'Roof-to-Wall Connection',
  });

  // Reinforced garage door
  mitigations.push({
    riskType: 'hurricane',
    action: 'Install wind-rated garage door or garage door bracing kit',
    estimatedCost: { min: 500, max: 3000 },
    effectiveness: 'high',
    timeframe: '1 day',
    insuranceImpact: 'Garage doors are a common failure point',
    priority: riskLevel === 'high' || riskLevel === 'very_high' ? 'critical' : 'recommended',
  });

  // Roof covering
  if (riskLevel !== 'low') {
    mitigations.push({
      riskType: 'hurricane',
      action: 'Upgrade to wind-rated roofing (120+ mph rating)',
      estimatedCost: { min: 8000, max: 25000 },
      effectiveness: 'very_high',
      timeframe: '1-2 weeks',
      insuranceImpact: 'Secondary water resistance credit available',
      priority: 'recommended',
      windRatingImprovement: 'FBC-rated roof covering',
    });
  }

  // Storm shutters (if not impact windows)
  mitigations.push({
    riskType: 'hurricane',
    action: 'Install storm shutters (accordion, roll-down, or panel)',
    estimatedCost: { min: 3000, max: 15000 },
    effectiveness: 'high',
    timeframe: '1-3 days',
    insuranceImpact: 'Opening protection credit',
    priority: riskLevel === 'low' ? 'optional' : 'recommended',
  });

  // Storm surge mitigation
  if (stormSurgeRisk) {
    mitigations.push({
      riskType: 'hurricane',
      action: 'Elevate structure above storm surge level',
      estimatedCost: { min: 50000, max: 200000 },
      effectiveness: 'very_high',
      timeframe: '2-6 months',
      insuranceImpact: 'Significant flood insurance reduction',
      priority: 'critical',
    });

    mitigations.push({
      riskType: 'hurricane',
      action: 'Install flood vents in enclosures below elevated floor',
      estimatedCost: { min: 500, max: 2000 },
      effectiveness: 'moderate',
      timeframe: '1 day',
      priority: 'critical',
    });
  }

  // Generator
  mitigations.push({
    riskType: 'hurricane',
    action: 'Install whole-house generator for extended power outages',
    estimatedCost: { min: 5000, max: 15000 },
    effectiveness: 'moderate',
    timeframe: '1-2 days',
    priority: 'recommended',
  });

  return mitigations;
}

export function getHurricaneInsuranceRecommendation(
  analysis: HurricaneRiskAnalysis
): string {
  if (analysis.riskLevel === 'very_high') {
    return `Property is in ${analysis.windZone} with very high hurricane risk. Windstorm insurance is ESSENTIAL. Consider Citizens Property Insurance if private coverage is unavailable. Wind mitigation inspection recommended for premium discounts.`;
  }
  if (analysis.riskLevel === 'high') {
    return `Property is in ${analysis.windZone} with high hurricane risk. Separate windstorm/hurricane coverage may be required. Wind mitigation credits can reduce premiums by up to 45% in Florida.`;
  }
  if (analysis.riskLevel === 'moderate') {
    return `Property is in ${analysis.windZone} with moderate hurricane risk. Standard homeowners may include wind coverage, but verify limits. Consider additional windstorm coverage.`;
  }
  return `Property is in ${analysis.windZone} with low hurricane risk. Standard homeowners policy should provide adequate wind coverage.`;
}

export function calculateWindstormInsurance(
  propertyValue: number,
  analysis: HurricaneRiskAnalysis
): number {
  // Windstorm insurance estimates based on risk level
  const ratesByRisk: Record<string, number> = {
    'low': 0.002,
    'moderate': 0.005,
    'high': 0.012,
    'very_high': 0.025
  };

  const baseRate = ratesByRisk[analysis.riskLevel] || 0.005;
  const coverage = propertyValue;

  let premium = coverage * baseRate;

  // Adjust for wind zone
  if (analysis.windZone === 'HVHZ') {
    premium *= 1.5; // 50% surcharge for High Velocity Hurricane Zone
  }

  // Storm surge adds flood insurance need
  if (analysis.stormSurgeRisk) {
    // This is separate flood insurance, but note it
  }

  return Math.round(premium);
}
```

---

## Combined Water Risk Assessment

```typescript
// src/lib/analysis/risk/waterRisks.ts

import { analyzeFloodRisk, getFloodInsuranceRecommendation } from './floodRisk';
import { analyzeHurricaneRisk, getHurricaneInsuranceRecommendation, calculateWindstormInsurance } from './hurricaneRisk';
import type { FloodRiskAnalysis, HurricaneRiskAnalysis, WaterRiskSummary } from '@/types/water-risk';

export async function analyzeWaterRisks(
  latitude: number,
  longitude: number,
  state: string,
  propertyValue: number,
  distanceToCoast?: number
): Promise<WaterRiskSummary> {
  // Run both analyses in parallel
  const [flood, hurricane] = await Promise.all([
    analyzeFloodRisk(latitude, longitude, propertyValue),
    analyzeHurricaneRisk(latitude, longitude, state, distanceToCoast)
  ]);

  // Calculate combined water risk
  const combinedWaterRisk = calculateCombinedWaterRisk(flood, hurricane);

  // Calculate total water-related insurance
  const floodInsurance = flood.estimatedFloodInsurance;
  const windstormInsurance = calculateWindstormInsurance(propertyValue, hurricane);
  const totalWaterInsurance = floodInsurance + windstormInsurance;

  // Generate critical warnings
  const criticalWarnings = generateWaterWarnings(flood, hurricane);

  // Determine primary concern
  const primaryConcern = determinePrimaryConcern(flood, hurricane);

  return {
    flood,
    hurricane,
    combinedWaterRisk,
    totalWaterInsurance,
    criticalWarnings,
    primaryConcern
  };
}

function calculateCombinedWaterRisk(
  flood: FloodRiskAnalysis,
  hurricane: HurricaneRiskAnalysis
): WaterRiskSummary['combinedWaterRisk'] {
  const floodScore = {
    'minimal': 10,
    'moderate': 30,
    'high': 60,
    'very_high': 90
  }[flood.riskLevel] || 10;

  const hurricaneScore = {
    'low': 10,
    'moderate': 30,
    'high': 60,
    'very_high': 90
  }[hurricane.riskLevel] || 10;

  // Use maximum risk, with bonus if both are elevated
  let combinedScore = Math.max(floodScore, hurricaneScore);
  if (floodScore >= 30 && hurricaneScore >= 30) {
    combinedScore += 10; // Additional risk when both present
  }

  if (combinedScore >= 80) return 'severe';
  if (combinedScore >= 50) return 'high';
  if (combinedScore >= 25) return 'moderate';
  return 'low';
}

function generateWaterWarnings(
  flood: FloodRiskAnalysis,
  hurricane: HurricaneRiskAnalysis
): string[] {
  const warnings: string[] = [];

  // Flood warnings
  if (flood.inSpecialFloodHazardArea) {
    warnings.push(`FLOOD ZONE ${flood.zone}: Property is in a Special Flood Hazard Area. Flood insurance is MANDATORY for federally-backed mortgages.`);
  }
  if (flood.zone.startsWith('V')) {
    warnings.push('COASTAL FLOOD ZONE: Property subject to high-velocity wave action. Strictest building requirements apply.');
  }

  // Hurricane warnings
  if (hurricane.riskLevel === 'very_high') {
    warnings.push(`HIGH HURRICANE RISK: Property is in ${hurricane.windZone} with design wind speed of ${hurricane.designWindSpeed} mph.`);
  }
  if (hurricane.stormSurgeRisk) {
    warnings.push(`STORM SURGE ZONE ${hurricane.stormSurgeZone}: Property is in storm surge inundation area. Evacuation likely required during hurricanes.`);
  }

  // Combined warnings
  if (flood.inSpecialFloodHazardArea && hurricane.stormSurgeRisk) {
    warnings.push('DUAL WATER HAZARD: Property faces both riverine/coastal flood risk AND storm surge risk. Consider this carefully in investment analysis.');
  }

  return warnings;
}

function determinePrimaryConcern(
  flood: FloodRiskAnalysis,
  hurricane: HurricaneRiskAnalysis
): WaterRiskSummary['primaryConcern'] {
  const floodRiskHigh = flood.riskLevel === 'high' || flood.riskLevel === 'very_high';
  const hurricaneRiskHigh = hurricane.riskLevel === 'high' || hurricane.riskLevel === 'very_high';

  if (floodRiskHigh && hurricaneRiskHigh) return 'both';
  if (floodRiskHigh) return 'flood';
  if (hurricaneRiskHigh) return 'hurricane';
  return 'none';
}
```

---

## UI Components

### Flood Risk Card Component
```tsx
// src/components/risk/FloodRiskCard.tsx

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Droplets, AlertTriangle, ChevronDown, DollarSign, Shield } from 'lucide-react';
import type { FloodRiskAnalysis } from '@/types/water-risk';

interface FloodRiskCardProps {
  analysis: FloodRiskAnalysis;
}

const riskColors = {
  minimal: 'bg-green-100 text-green-800 border-green-200',
  moderate: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  very_high: 'bg-red-100 text-red-800 border-red-200'
};

const riskBadgeVariants = {
  minimal: 'default',
  moderate: 'secondary',
  high: 'destructive',
  very_high: 'destructive'
} as const;

export function FloodRiskCard({ analysis }: FloodRiskCardProps) {
  return (
    <Card className={riskColors[analysis.riskLevel]}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Droplets className="h-5 w-5" />
            <CardTitle>Flood Risk</CardTitle>
          </div>
          <Badge variant={riskBadgeVariants[analysis.riskLevel]}>
            {analysis.riskLevel.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>
        <CardDescription>{analysis.zoneDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Flood Zone Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">FEMA Zone</p>
            <p className="text-2xl font-bold">{analysis.zone}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">30-Year Flood Probability</p>
            <p className="text-2xl font-bold">{(analysis.thirtyYearFloodProbability * 100).toFixed(0)}%</p>
          </div>
        </div>

        {/* Base Flood Elevation */}
        {analysis.baseFloodElevation && (
          <div className="bg-background/50 p-3 rounded-lg">
            <p className="text-sm font-medium">Base Flood Elevation (BFE)</p>
            <p className="text-lg font-semibold">{analysis.baseFloodElevation} feet</p>
          </div>
        )}

        {/* Insurance Requirement */}
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          {analysis.insuranceRequired ? (
            <span className="text-sm font-medium text-red-700">
              Flood insurance is REQUIRED for federally-backed mortgages
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">
              Flood insurance is optional but recommended
            </span>
          )}
        </div>

        {/* Insurance Estimate */}
        {analysis.estimatedFloodInsurance > 0 && (
          <div className="flex items-center gap-2 bg-background/50 p-3 rounded-lg">
            <DollarSign className="h-4 w-4" />
            <div>
              <p className="text-sm text-muted-foreground">Estimated Annual Premium</p>
              <p className="text-lg font-bold">${analysis.estimatedFloodInsurance.toLocaleString()}/year</p>
            </div>
          </div>
        )}

        {/* Zone Explanation */}
        <Collapsible>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full justify-between">
              <span>Zone Details</span>
              <ChevronDown className="h-4 w-4" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <p className="text-sm text-muted-foreground p-3 bg-background/50 rounded-lg">
              {analysis.zoneDetailedExplanation}
            </p>
          </CollapsibleContent>
        </Collapsible>

        {/* LOMA Notice */}
        {analysis.loma && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Letter of Map Amendment (LOMA)</AlertTitle>
            <AlertDescription>
              This property has a LOMA, which may affect flood insurance requirements.
            </AlertDescription>
          </Alert>
        )}

        {/* Mitigations */}
        {analysis.mitigationOptions.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Recommended Mitigations</h4>
            {analysis.mitigationOptions
              .filter(m => m.priority !== 'optional')
              .slice(0, 3)
              .map((mitigation, idx) => (
                <div key={idx} className="bg-background/50 p-3 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{mitigation.action}</span>
                    <Badge variant={mitigation.priority === 'critical' ? 'destructive' : 'secondary'}>
                      {mitigation.priority}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Est. cost: ${mitigation.estimatedCost.min.toLocaleString()} - ${mitigation.estimatedCost.max.toLocaleString()}
                  </p>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### Hurricane Risk Card Component
```tsx
// src/components/risk/HurricaneRiskCard.tsx

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { Wind, AlertTriangle, ChevronDown, DollarSign, MapPin } from 'lucide-react';
import type { HurricaneRiskAnalysis } from '@/types/water-risk';

interface HurricaneRiskCardProps {
  analysis: HurricaneRiskAnalysis;
}

const riskColors = {
  low: 'bg-green-100 text-green-800 border-green-200',
  moderate: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  very_high: 'bg-red-100 text-red-800 border-red-200'
};

const riskBadgeVariants = {
  low: 'default',
  moderate: 'secondary',
  high: 'destructive',
  very_high: 'destructive'
} as const;

export function HurricaneRiskCard({ analysis }: HurricaneRiskCardProps) {
  return (
    <Card className={riskColors[analysis.riskLevel]}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wind className="h-5 w-5" />
            <CardTitle>Hurricane Risk</CardTitle>
          </div>
          <Badge variant={riskBadgeVariants[analysis.riskLevel]}>
            {analysis.riskLevel.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>
        <CardDescription>{analysis.windZoneDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Wind Zone Info */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Wind Zone</p>
            <p className="text-2xl font-bold">{analysis.windZone}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Design Wind Speed</p>
            <p className="text-2xl font-bold">{analysis.designWindSpeed} mph</p>
          </div>
        </div>

        {/* Distance to Coast */}
        <div className="flex items-center gap-2 bg-background/50 p-3 rounded-lg">
          <MapPin className="h-4 w-4" />
          <div>
            <p className="text-sm text-muted-foreground">Distance to Coast</p>
            <p className="text-lg font-semibold">{analysis.distanceToCoast} miles</p>
          </div>
        </div>

        {/* Historical Hurricanes */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-background/50 p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">Historical Hurricanes (30yr)</p>
            <p className="text-xl font-bold">{analysis.historicalHurricanes}</p>
          </div>
          <div className="bg-background/50 p-3 rounded-lg">
            <p className="text-sm text-muted-foreground">Average Category</p>
            <p className="text-xl font-bold">{analysis.avgCategoryHistory.toFixed(1)}</p>
          </div>
        </div>

        {/* Storm Surge Warning */}
        {analysis.stormSurgeRisk && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Storm Surge Zone {analysis.stormSurgeZone}</AlertTitle>
            <AlertDescription>
              Property is in a storm surge inundation area. Evacuation will likely be required during major hurricanes.
            </AlertDescription>
          </Alert>
        )}

        {/* Wind Mitigation Credits */}
        {analysis.windMitigationCredits && (
          <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
            <p className="text-sm font-medium text-blue-800">Wind Mitigation Credits Available</p>
            <p className="text-xs text-blue-600 mt-1">
              A wind mitigation inspection can qualify you for significant insurance discounts (up to 45% in FL).
            </p>
          </div>
        )}

        {/* Mitigations */}
        {analysis.mitigationOptions.length > 0 && (
          <Collapsible>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="w-full justify-between">
                <span>Recommended Mitigations ({analysis.mitigationOptions.filter(m => m.priority === 'critical').length} critical)</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-2 mt-2">
              {analysis.mitigationOptions
                .filter(m => m.priority !== 'optional')
                .map((mitigation, idx) => (
                  <div key={idx} className="bg-background/50 p-3 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{mitigation.action}</span>
                      <Badge variant={mitigation.priority === 'critical' ? 'destructive' : 'secondary'}>
                        {mitigation.priority}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground mt-1">
                      <span>Est. cost: ${mitigation.estimatedCost.min.toLocaleString()} - ${mitigation.estimatedCost.max.toLocaleString()}</span>
                      {mitigation.insuranceImpact && (
                        <span className="text-green-600">{mitigation.insuranceImpact}</span>
                      )}
                    </div>
                  </div>
                ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}
```

### Water Risk Summary Component
```tsx
// src/components/risk/WaterRiskSummary.tsx

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Droplets, Wind, AlertTriangle, DollarSign } from 'lucide-react';
import type { WaterRiskSummary } from '@/types/water-risk';

interface WaterRiskSummaryProps {
  summary: WaterRiskSummary;
}

const riskColors = {
  low: 'bg-green-500',
  moderate: 'bg-yellow-500',
  high: 'bg-orange-500',
  severe: 'bg-red-500'
};

export function WaterRiskSummaryCard({ summary }: WaterRiskSummaryProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-blue-500" />
            <Wind className="h-5 w-5 text-gray-500" />
            Combined Water Risk
          </CardTitle>
          <Badge className={riskColors[summary.combinedWaterRisk]}>
            {summary.combinedWaterRisk.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Insurance Summary */}
        <div className="bg-muted p-4 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-4 w-4" />
            <span className="font-medium">Total Water-Related Insurance</span>
          </div>
          <p className="text-3xl font-bold">${summary.totalWaterInsurance.toLocaleString()}/year</p>
          <div className="grid grid-cols-2 gap-2 mt-2 text-sm text-muted-foreground">
            <div>Flood: ${summary.flood.estimatedFloodInsurance.toLocaleString()}</div>
            <div>Windstorm: ${(summary.totalWaterInsurance - summary.flood.estimatedFloodInsurance).toLocaleString()}</div>
          </div>
        </div>

        {/* Primary Concern */}
        {summary.primaryConcern !== 'none' && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-sm">
              Primary concern: <span className="font-medium capitalize">{summary.primaryConcern}</span>
            </span>
          </div>
        )}

        {/* Critical Warnings */}
        {summary.criticalWarnings.length > 0 && (
          <div className="space-y-2">
            {summary.criticalWarnings.map((warning, idx) => (
              <Alert key={idx} variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>{warning}</AlertDescription>
              </Alert>
            ))}
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <p className="text-xs text-blue-600">Flood Zone</p>
            <p className="text-lg font-bold text-blue-800">{summary.flood.zone}</p>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600">Wind Zone</p>
            <p className="text-lg font-bold text-gray-800">{summary.hurricane.windZone}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

## API Route

```typescript
// src/app/api/analysis/water-risks/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { analyzeWaterRisks } from '@/lib/analysis/risk/waterRisks';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { latitude, longitude, state, propertyValue, distanceToCoast } = body;

    if (!latitude || !longitude || !state || !propertyValue) {
      return NextResponse.json(
        { error: 'Missing required fields: latitude, longitude, state, propertyValue' },
        { status: 400 }
      );
    }

    const waterRisks = await analyzeWaterRisks(
      latitude,
      longitude,
      state,
      propertyValue,
      distanceToCoast
    );

    return NextResponse.json(waterRisks);
  } catch (error) {
    console.error('Water risk analysis error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze water risks' },
      { status: 500 }
    );
  }
}
```

---

## Verification Steps

1. Test flood risk with known FEMA flood zone addresses:
   - Zone AE address in Houston, TX
   - Zone VE address in Miami Beach, FL
   - Zone X address in Denver, CO

2. Test hurricane risk in different regions:
   - South Florida (HVHZ)
   - Gulf Coast (TX, LA)
   - Southeast coast (NC, SC)
   - Non-coastal state (PA, OH)

3. Verify insurance estimates are reasonable:
   - NFIP rates for SFHA zones
   - Preferred Risk Policy rates for non-SFHA
   - Windstorm insurance for coastal FL

4. Test storm surge zone detection:
   - Coastal FL property < 1 mile from coast
   - Inland FL property > 50 miles from coast

5. Verify mitigation recommendations:
   - Critical mitigations shown for high-risk zones
   - Insurance impact information accurate
   - Cost estimates reasonable

---

## Next Steps

After completing Phase 7A, proceed to:
- [Phase 7B: Seismic Risks](./phase-7b-seismic-risks.md) - Earthquake and sinkhole analysis
- [Phase 7C: Fire Risks](./phase-7c-fire-risks.md) - Wildfire analysis
- [Phase 7D: Environmental Risks](./phase-7d-environmental-risks.md) - Environmental hazards and radon
