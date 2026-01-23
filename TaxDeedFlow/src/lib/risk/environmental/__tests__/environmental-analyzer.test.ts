/**
 * Environmental Risk Analyzer Tests
 *
 * Tests the environmental risk analysis functionality including:
 * - analyzeContaminationRisk function
 * - analyzeRadonRisk function
 * - analyzeEnvironmentalRisk combined function
 * - Risk score calculations
 * - Mitigation recommendations
 * - Warning generation
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-22
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  analyzeContaminationRisk,
  analyzeRadonRisk,
  analyzeEnvironmentalRisk,
  getContaminationRiskScore,
  getRadonRiskScore,
  getEnvironmentalRiskScore,
  RADON_DISCLOSURE_STATES,
} from '../environmental-analyzer';
import { getEPAService } from '@/lib/api/services';
import type {
  EnvironmentalSitesSummary,
  RadonZoneData,
  SuperfundSite,
  BrownfieldSite,
  USTSite,
  TRIFacility,
  RCRAFacility,
} from '@/lib/api/services';

// ============================================
// Mock EPA Service
// ============================================

vi.mock('@/lib/api/services', () => ({
  getEPAService: vi.fn(),
}));

// ============================================
// Test Fixtures - EPA Site Data
// ============================================

const mockCleanAreaSites: EnvironmentalSitesSummary = {
  counts: {
    superfund: 0,
    brownfield: 0,
    ust: 0,
    tri: 0,
    rcra: 0,
    total: 0,
  },
  countsByDistance: {
    within025Miles: 0,
    within05Miles: 0,
    within1Mile: 0,
    within2Miles: 0,
  },
  superfundSites: [],
  brownfieldSites: [],
  ustSites: [],
  triFacilities: [],
  rcraFacilities: [],
  nearestSite: null,
};

const mockLowRiskSites: EnvironmentalSitesSummary = {
  counts: {
    superfund: 0,
    brownfield: 1,
    ust: 0,
    tri: 0,
    rcra: 0,
    total: 1,
  },
  countsByDistance: {
    within025Miles: 0,
    within05Miles: 0,
    within1Mile: 0,
    within2Miles: 1,
  },
  superfundSites: [],
  brownfieldSites: [
    {
      siteId: 'BF-001',
      name: 'Old Gas Station',
      address: '123 Main St',
      city: 'Altoona',
      state: 'PA',
      latitude: 40.5200,
      longitude: -78.3950,
      assessmentType: 'Phase I',
      cleanupStatus: 'Complete',
      propertyType: 'Commercial',
      lastActivityDate: '2020-01-15',
      distanceMiles: 1.8,
      direction: 'NE',
    },
  ],
  ustSites: [],
  triFacilities: [],
  rcraFacilities: [],
  nearestSite: {
    type: 'brownfield',
    name: 'Old Gas Station',
    distance: 1.8,
    direction: 'NE',
  },
};

const mockModerateRiskSites: EnvironmentalSitesSummary = {
  counts: {
    superfund: 0,
    brownfield: 2,
    ust: 1,
    tri: 1,
    rcra: 0,
    total: 4,
  },
  countsByDistance: {
    within025Miles: 0,
    within05Miles: 0,
    within1Mile: 2,
    within2Miles: 2,
  },
  superfundSites: [],
  brownfieldSites: [
    {
      siteId: 'BF-002',
      name: 'Former Industrial Site',
      address: '456 Industrial Rd',
      city: 'Altoona',
      state: 'PA',
      latitude: 40.5190,
      longitude: -78.3960,
      assessmentType: 'Phase II',
      cleanupStatus: 'In Progress',
      propertyType: 'Industrial',
      lastActivityDate: '2025-06-01',
      distanceMiles: 0.8,
      direction: 'N',
    },
    {
      siteId: 'BF-003',
      name: 'Old Factory',
      address: '789 Factory Ln',
      city: 'Altoona',
      state: 'PA',
      latitude: 40.5210,
      longitude: -78.3930,
      assessmentType: 'Phase I',
      cleanupStatus: 'Monitored',
      propertyType: 'Industrial',
      lastActivityDate: '2023-03-15',
      distanceMiles: 1.2,
      direction: 'SE',
    },
  ],
  ustSites: [
    {
      facilityId: 'UST-001',
      name: 'Current Gas Station',
      address: '321 Highway Blvd',
      city: 'Altoona',
      state: 'PA',
      latitude: 40.5180,
      longitude: -78.3970,
      tankCount: 3,
      hasRelease: false,
      cleanupStatus: 'No Release',
      tankContents: ['gasoline', 'diesel'],
      distanceMiles: 0.9,
      direction: 'W',
    },
  ],
  triFacilities: [
    {
      triId: 'TRI-001',
      name: 'Chemical Manufacturing Plant',
      address: '555 Chemical Way',
      city: 'Altoona',
      state: 'PA',
      latitude: 40.5220,
      longitude: -78.3920,
      industry: 'Chemical Manufacturing',
      chemicals: ['benzene', 'toluene'],
      totalReleasesLbs: 5000,
      airReleasesLbs: 1500,
      waterReleasesLbs: 200,
      landReleasesLbs: 100,
      distanceMiles: 1.5,
      direction: 'E',
    },
  ],
  rcraFacilities: [],
  nearestSite: {
    type: 'brownfield',
    name: 'Former Industrial Site',
    distance: 0.8,
    direction: 'N',
  },
};

const mockHighRiskSites: EnvironmentalSitesSummary = {
  counts: {
    superfund: 0,
    brownfield: 3,
    ust: 2,
    tri: 1,
    rcra: 1,
    total: 7,
  },
  countsByDistance: {
    within025Miles: 1,
    within05Miles: 2,
    within1Mile: 2,
    within2Miles: 2,
  },
  superfundSites: [],
  brownfieldSites: [
    {
      siteId: 'BF-004',
      name: 'Nearby Contaminated Site',
      address: '100 Close St',
      city: 'Altoona',
      state: 'PA',
      latitude: 40.5189,
      longitude: -78.3949,
      assessmentType: 'Phase II',
      cleanupStatus: 'In Progress',
      propertyType: 'Industrial',
      lastActivityDate: '2025-12-01',
      distanceMiles: 0.2,
      direction: 'N',
    },
    {
      siteId: 'BF-005',
      name: 'Old Manufacturing',
      address: '200 Industry Ave',
      city: 'Altoona',
      state: 'PA',
      latitude: 40.5195,
      longitude: -78.3955,
      assessmentType: 'Phase II',
      cleanupStatus: 'Active',
      propertyType: 'Industrial',
      lastActivityDate: '2025-11-15',
      distanceMiles: 0.4,
      direction: 'NE',
    },
    {
      siteId: 'BF-006',
      name: 'Former Warehouse',
      address: '300 Warehouse Dr',
      city: 'Altoona',
      state: 'PA',
      latitude: 40.5200,
      longitude: -78.3960,
      assessmentType: 'Phase I',
      cleanupStatus: 'Monitored',
      propertyType: 'Commercial',
      lastActivityDate: '2024-08-20',
      distanceMiles: 0.9,
      direction: 'E',
    },
  ],
  ustSites: [
    {
      facilityId: 'UST-002',
      name: 'Leaking UST Site',
      address: '400 Leak Rd',
      city: 'Altoona',
      state: 'PA',
      latitude: 40.5192,
      longitude: -78.3952,
      tankCount: 2,
      hasRelease: true,
      cleanupStatus: 'Cleanup In Progress',
      tankContents: ['petroleum', 'gasoline'],
      distanceMiles: 0.3,
      direction: 'NW',
    },
    {
      facilityId: 'UST-003',
      name: 'Old Service Station',
      address: '500 Service St',
      city: 'Altoona',
      state: 'PA',
      latitude: 40.5185,
      longitude: -78.3945,
      tankCount: 4,
      hasRelease: false,
      cleanupStatus: 'Monitored',
      tankContents: ['gasoline', 'diesel', 'kerosene'],
      distanceMiles: 0.6,
      direction: 'SW',
    },
  ],
  triFacilities: [
    {
      triId: 'TRI-002',
      name: 'Heavy Manufacturing',
      address: '600 Heavy Industry Blvd',
      city: 'Altoona',
      state: 'PA',
      latitude: 40.5205,
      longitude: -78.3965,
      industry: 'Metal Processing',
      chemicals: ['lead', 'arsenic', 'cadmium'],
      totalReleasesLbs: 15000,
      airReleasesLbs: 2000,
      waterReleasesLbs: 500,
      landReleasesLbs: 800,
      distanceMiles: 1.1,
      direction: 'E',
    },
  ],
  rcraFacilities: [
    {
      handlerId: 'RCRA-001',
      name: 'Hazardous Waste Facility',
      address: '700 Waste Management Dr',
      city: 'Altoona',
      state: 'PA',
      latitude: 40.5215,
      longitude: -78.3935,
      facilityType: 'Treatment, Storage, Disposal',
      hasViolations: true,
      wasteTypes: ['hazardous chemicals', 'toxic waste'],
      distanceMiles: 1.3,
      direction: 'SE',
    },
  ],
  nearestSite: {
    type: 'brownfield',
    name: 'Nearby Contaminated Site',
    distance: 0.2,
    direction: 'N',
  },
};

const mockSevereRiskSites: EnvironmentalSitesSummary = {
  counts: {
    superfund: 1,
    brownfield: 2,
    ust: 1,
    tri: 0,
    rcra: 0,
    total: 4,
  },
  countsByDistance: {
    within025Miles: 1,
    within05Miles: 2,
    within1Mile: 1,
    within2Miles: 0,
  },
  superfundSites: [
    {
      epaId: 'PAD000000001',
      name: 'Superfund Toxic Site',
      address: '800 Superfund Ave',
      city: 'Altoona',
      state: 'PA',
      zip: '16602',
      latitude: 40.5193,
      longitude: -78.3953,
      nplStatus: 'Listed',
      status: 'cleanup_in_progress',
      contaminants: ['lead', 'arsenic', 'PCB', 'benzene', 'tce'],
      federalFacility: false,
      dateAddedToNPL: '2015-05-20',
      distanceMiles: 0.2,
      direction: 'N',
    },
  ],
  brownfieldSites: [
    {
      siteId: 'BF-007',
      name: 'Adjacent Industrial Site',
      address: '900 Adjacent St',
      city: 'Altoona',
      state: 'PA',
      latitude: 40.5188,
      longitude: -78.3948,
      assessmentType: 'Phase II',
      cleanupStatus: 'Active',
      propertyType: 'Industrial',
      lastActivityDate: '2026-01-10',
      distanceMiles: 0.5,
      direction: 'NW',
    },
    {
      siteId: 'BF-008',
      name: 'Contaminated Property',
      address: '1000 Toxic Ln',
      city: 'Altoona',
      state: 'PA',
      latitude: 40.5197,
      longitude: -78.3957,
      assessmentType: 'Phase II',
      cleanupStatus: 'In Progress',
      propertyType: 'Industrial',
      lastActivityDate: '2025-09-30',
      distanceMiles: 0.7,
      direction: 'E',
    },
  ],
  ustSites: [
    {
      facilityId: 'UST-004',
      name: 'Major UST Contamination',
      address: '1100 Contamination Rd',
      city: 'Altoona',
      state: 'PA',
      latitude: 40.5191,
      longitude: -78.3951,
      tankCount: 6,
      hasRelease: true,
      cleanupStatus: 'Active Cleanup',
      tankContents: ['petroleum', 'chemicals', 'benzene'],
      distanceMiles: 0.3,
      direction: 'W',
    },
  ],
  triFacilities: [],
  rcraFacilities: [],
  nearestSite: {
    type: 'superfund',
    name: 'Superfund Toxic Site',
    distance: 0.2,
    direction: 'N',
  },
};

// ============================================
// Test Fixtures - Radon Zone Data
// ============================================

const mockRadonZone1: RadonZoneData = {
  radonZone: 1,
  predictedLevel: 5.2,
  confidence: 'high',
  description: 'Zone 1 - Highest Potential (>4 pCi/L predicted)',
};

const mockRadonZone2: RadonZoneData = {
  radonZone: 2,
  predictedLevel: 3.1,
  confidence: 'high',
  description: 'Zone 2 - Moderate Potential (2-4 pCi/L predicted)',
};

const mockRadonZone3: RadonZoneData = {
  radonZone: 3,
  predictedLevel: 1.5,
  confidence: 'medium',
  description: 'Zone 3 - Low Potential (<2 pCi/L predicted)',
};

// ============================================
// Mock EPA Service Setup
// ============================================

function setupEPAServiceMock(
  sitesResponse: EnvironmentalSitesSummary,
  radonResponse: RadonZoneData = mockRadonZone3
) {
  const mockService = {
    getEnvironmentalSitesNearby: vi.fn().mockResolvedValue({
      success: true,
      data: sitesResponse,
      timestamp: new Date(),
    }),
    getRadonZone: vi.fn().mockReturnValue({
      success: true,
      data: radonResponse,
      timestamp: new Date(),
    }),
  };

  vi.mocked(getEPAService).mockReturnValue(mockService as any);
  return mockService;
}

// ============================================
// Contamination Risk Analysis Tests
// ============================================

describe('analyzeContaminationRisk', () => {
  const testCoordinates = { latitude: 40.5187, longitude: -78.3947 };
  const testStateCode = 'PA';
  const testCountyFips = '42013';

  describe('basic functionality', () => {
    it('should return valid contamination analysis for clean area', async () => {
      setupEPAServiceMock(mockCleanAreaSites);

      const result = await analyzeContaminationRisk(
        testCoordinates,
        testStateCode,
        testCountyFips
      );

      expect(result).toBeDefined();
      expect(result.riskLevel).toBe('none_known');
      expect(result.superfundSitesNearby).toBe(0);
      expect(result.brownfieldSitesNearby).toBe(0);
      expect(result.ustSitesNearby).toBe(0);
      expect(result.triSitesNearby).toBe(0);
      expect(result.nearestSite).toBeNull();
      expect(result.nearbySites).toHaveLength(0);
      expect(result.phaseIRecommended).toBe(false);
      expect(result.dataSource).toBeDefined();
      expect(result.dataSource.name).toBe('EPA Envirofacts');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should return valid contamination analysis for low risk area', async () => {
      setupEPAServiceMock(mockLowRiskSites);

      const result = await analyzeContaminationRisk(
        testCoordinates,
        testStateCode,
        testCountyFips
      );

      expect(result.riskLevel).toBe('low');
      expect(result.brownfieldSitesNearby).toBe(1);
      expect(result.nearestSite).not.toBeNull();
      expect(result.nearestSite?.type).toBe('brownfield');
      expect(result.nearestSite?.distanceMiles).toBe(1.8);
      expect(result.nearbySites).toHaveLength(1);
      expect(result.phaseIRecommended).toBe(false);
    });

    it('should return valid contamination analysis for moderate risk area', async () => {
      setupEPAServiceMock(mockModerateRiskSites);

      const result = await analyzeContaminationRisk(
        testCoordinates,
        testStateCode,
        testCountyFips
      );

      expect(result.riskLevel).toBe('moderate');
      expect(result.brownfieldSitesNearby).toBe(2);
      expect(result.ustSitesNearby).toBe(1);
      expect(result.triSitesNearby).toBe(1);
      expect(result.nearbySites.length).toBeGreaterThan(0);
      expect(result.phaseIRecommended).toBe(true); // Multiple brownfields
    });

    it('should return valid contamination analysis for high risk area', async () => {
      setupEPAServiceMock(mockHighRiskSites);

      const result = await analyzeContaminationRisk(
        testCoordinates,
        testStateCode,
        testCountyFips
      );

      expect(result.riskLevel).toBe('high');
      expect(result.nearbySites.length).toBeGreaterThan(3);
      expect(result.phaseIRecommended).toBe(true);
      expect(result.nearestSite?.distanceMiles).toBeLessThan(0.5);
    });

    it('should return severe risk for Superfund sites nearby', async () => {
      setupEPAServiceMock(mockSevereRiskSites);

      const result = await analyzeContaminationRisk(
        testCoordinates,
        testStateCode,
        testCountyFips
      );

      expect(result.riskLevel).toBe('severe');
      expect(result.superfundSitesNearby).toBe(1);
      expect(result.phaseIRecommended).toBe(true);
      expect(result.nearbySites.some((s) => s.type === 'superfund')).toBe(true);
    });
  });

  describe('site conversion and sorting', () => {
    it('should convert EPA sites to ContaminationSite format', async () => {
      setupEPAServiceMock(mockModerateRiskSites);

      const result = await analyzeContaminationRisk(
        testCoordinates,
        testStateCode,
        testCountyFips
      );

      expect(result.nearbySites).toBeDefined();
      expect(Array.isArray(result.nearbySites)).toBe(true);

      result.nearbySites.forEach((site) => {
        expect(site.name).toBeDefined();
        expect(site.type).toBeDefined();
        expect(site.status).toBeDefined();
        expect(site.distanceMiles).toBeGreaterThanOrEqual(0);
        expect(site.direction).toMatch(/^(N|NE|E|SE|S|SW|W|NW)$/);
        expect(Array.isArray(site.contaminants)).toBe(true);
        expect(typeof site.groundwaterImpact).toBe('boolean');
      });
    });

    it('should sort sites by distance', async () => {
      setupEPAServiceMock(mockHighRiskSites);

      const result = await analyzeContaminationRisk(
        testCoordinates,
        testStateCode,
        testCountyFips
      );

      const distances = result.nearbySites.map((s) => s.distanceMiles);
      const sortedDistances = [...distances].sort((a, b) => a - b);

      expect(distances).toEqual(sortedDistances);
    });

    it('should identify nearest site correctly', async () => {
      setupEPAServiceMock(mockHighRiskSites);

      const result = await analyzeContaminationRisk(
        testCoordinates,
        testStateCode,
        testCountyFips
      );

      expect(result.nearestSite).not.toBeNull();
      expect(result.nearestSite?.distanceMiles).toBe(
        Math.min(...result.nearbySites.map((s) => s.distanceMiles))
      );
    });
  });

  describe('Phase I ESA recommendations', () => {
    it('should recommend Phase I for Superfund sites', async () => {
      setupEPAServiceMock(mockSevereRiskSites);

      const result = await analyzeContaminationRisk(
        testCoordinates,
        testStateCode,
        testCountyFips
      );

      expect(result.phaseIRecommended).toBe(true);
      expect(result.mitigationRecommendations).toContain(
        'Obtain a Phase I Environmental Site Assessment before purchase'
      );
    });

    it('should recommend Phase I for sites within 0.25 miles', async () => {
      setupEPAServiceMock(mockHighRiskSites);

      const result = await analyzeContaminationRisk(
        testCoordinates,
        testStateCode,
        testCountyFips
      );

      expect(result.phaseIRecommended).toBe(true);
    });

    it('should recommend Phase I for UST with release', async () => {
      setupEPAServiceMock(mockHighRiskSites);

      const result = await analyzeContaminationRisk(
        testCoordinates,
        testStateCode,
        testCountyFips
      );

      expect(result.phaseIRecommended).toBe(true);
    });

    it('should recommend Phase I for multiple brownfields', async () => {
      setupEPAServiceMock(mockModerateRiskSites);

      const result = await analyzeContaminationRisk(
        testCoordinates,
        testStateCode,
        testCountyFips
      );

      expect(result.phaseIRecommended).toBe(true);
    });

    it('should not recommend Phase I for clean areas', async () => {
      setupEPAServiceMock(mockCleanAreaSites);

      const result = await analyzeContaminationRisk(
        testCoordinates,
        testStateCode,
        testCountyFips
      );

      expect(result.phaseIRecommended).toBe(false);
    });
  });

  describe('groundwater concerns', () => {
    it('should identify Superfund groundwater concerns', async () => {
      setupEPAServiceMock(mockSevereRiskSites);

      const result = await analyzeContaminationRisk(
        testCoordinates,
        testStateCode,
        testCountyFips
      );

      expect(result.groundwaterConcerns.length).toBeGreaterThan(0);
      expect(
        result.groundwaterConcerns.some((c) =>
          c.includes('Superfund')
        )
      ).toBe(true);
    });

    it('should identify UST release concerns', async () => {
      setupEPAServiceMock(mockHighRiskSites);

      const result = await analyzeContaminationRisk(
        testCoordinates,
        testStateCode,
        testCountyFips
      );

      expect(
        result.groundwaterConcerns.some((c) =>
          c.includes('underground storage tank')
        )
      ).toBe(true);
    });

    it('should identify TRI land release concerns', async () => {
      setupEPAServiceMock(mockModerateRiskSites);

      const result = await analyzeContaminationRisk(
        testCoordinates,
        testStateCode,
        testCountyFips
      );

      expect(
        result.groundwaterConcerns.some((c) => c.includes('TRI facility'))
      ).toBe(true);
    });

    it('should return empty array for clean areas', async () => {
      setupEPAServiceMock(mockCleanAreaSites);

      const result = await analyzeContaminationRisk(
        testCoordinates,
        testStateCode,
        testCountyFips
      );

      expect(result.groundwaterConcerns).toHaveLength(0);
    });
  });

  describe('air quality concerns', () => {
    it('should identify TRI air release concerns', async () => {
      setupEPAServiceMock(mockModerateRiskSites);

      const result = await analyzeContaminationRisk(
        testCoordinates,
        testStateCode,
        testCountyFips
      );

      expect(result.airQualityConcerns.length).toBeGreaterThan(0);
    });

    it('should identify RCRA facility concerns', async () => {
      setupEPAServiceMock(mockHighRiskSites);

      const result = await analyzeContaminationRisk(
        testCoordinates,
        testStateCode,
        testCountyFips
      );

      expect(
        result.airQualityConcerns.some((c) => c.includes('RCRA'))
      ).toBe(true);
    });

    it('should return empty array for clean areas', async () => {
      setupEPAServiceMock(mockCleanAreaSites);

      const result = await analyzeContaminationRisk(
        testCoordinates,
        testStateCode,
        testCountyFips
      );

      expect(result.airQualityConcerns).toHaveLength(0);
    });
  });

  describe('historical industrial use detection', () => {
    it('should detect historical industrial use from brownfields', async () => {
      setupEPAServiceMock(mockHighRiskSites);

      const result = await analyzeContaminationRisk(
        testCoordinates,
        testStateCode,
        testCountyFips
      );

      expect(result.historicalIndustrialUse).toBe(true);
    });

    it('should detect historical industrial use from RCRA sites', async () => {
      setupEPAServiceMock(mockHighRiskSites);

      const result = await analyzeContaminationRisk(
        testCoordinates,
        testStateCode,
        testCountyFips
      );

      expect(result.historicalIndustrialUse).toBe(true);
    });

    it('should return false for clean areas', async () => {
      setupEPAServiceMock(mockCleanAreaSites);

      const result = await analyzeContaminationRisk(
        testCoordinates,
        testStateCode,
        testCountyFips
      );

      expect(result.historicalIndustrialUse).toBe(false);
    });
  });

  describe('mitigation recommendations', () => {
    it('should provide comprehensive recommendations for severe risk', async () => {
      setupEPAServiceMock(mockSevereRiskSites);

      const result = await analyzeContaminationRisk(
        testCoordinates,
        testStateCode,
        testCountyFips
      );

      expect(result.mitigationRecommendations.length).toBeGreaterThan(3);
      expect(
        result.mitigationRecommendations.some((r) =>
          r.includes('Phase I')
        )
      ).toBe(true);
      expect(
        result.mitigationRecommendations.some((r) =>
          r.includes('Phase II')
        )
      ).toBe(true);
    });

    it('should include well water testing for groundwater concerns', async () => {
      setupEPAServiceMock(mockSevereRiskSites);

      const result = await analyzeContaminationRisk(
        testCoordinates,
        testStateCode,
        testCountyFips
      );

      expect(
        result.mitigationRecommendations.some((r) =>
          r.includes('well water')
        )
      ).toBe(true);
    });

    it('should include Superfund-specific recommendations', async () => {
      setupEPAServiceMock(mockSevereRiskSites);

      const result = await analyzeContaminationRisk(
        testCoordinates,
        testStateCode,
        testCountyFips
      );

      expect(
        result.mitigationRecommendations.some((r) =>
          r.toLowerCase().includes('superfund')
        )
      ).toBe(true);
    });

    it('should provide minimal recommendations for clean areas', async () => {
      setupEPAServiceMock(mockCleanAreaSites);

      const result = await analyzeContaminationRisk(
        testCoordinates,
        testStateCode,
        testCountyFips
      );

      expect(result.mitigationRecommendations).toHaveLength(0);
    });
  });

  describe('confidence calculation', () => {
    it('should have high confidence with EPA data', async () => {
      setupEPAServiceMock(mockModerateRiskSites);

      const result = await analyzeContaminationRisk(
        testCoordinates,
        testStateCode,
        testCountyFips
      );

      expect(result.confidence).toBeGreaterThanOrEqual(70);
      expect(result.confidence).toBeLessThanOrEqual(90);
    });

    it('should increase confidence when sites are found', async () => {
      setupEPAServiceMock(mockModerateRiskSites);

      const result = await analyzeContaminationRisk(
        testCoordinates,
        testStateCode,
        testCountyFips
      );

      expect(result.confidence).toBeGreaterThan(70);
    });
  });
});

// ============================================
// Radon Risk Analysis Tests
// ============================================

describe('analyzeRadonRisk', () => {
  describe('basic functionality', () => {
    it('should return valid radon analysis for Zone 1 (high risk)', () => {
      setupEPAServiceMock(mockCleanAreaSites, mockRadonZone1);

      const result = analyzeRadonRisk('PA', '42', '013', 'Blair', 'Pennsylvania');

      expect(result).toBeDefined();
      expect(result.radonZone).toBe(1);
      expect(result.riskLevel).toBe('high');
      expect(result.predictedLevel).toBe(5.2);
      expect(result.testingRecommended).toBe(true);
      expect(result.mitigationTypicallyNeeded).toBe(true);
      expect(result.dataSource).toBeDefined();
      expect(result.dataSource.name).toBe('EPA Radon Zone Map');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should return valid radon analysis for Zone 2 (moderate risk)', () => {
      setupEPAServiceMock(mockCleanAreaSites, mockRadonZone2);

      const result = analyzeRadonRisk('PA', '42', '013', 'Blair', 'Pennsylvania');

      expect(result.radonZone).toBe(2);
      expect(result.riskLevel).toBe('moderate');
      expect(result.predictedLevel).toBe(3.1);
      expect(result.testingRecommended).toBe(true);
      expect(result.mitigationTypicallyNeeded).toBe(false);
    });

    it('should return valid radon analysis for Zone 3 (low risk)', () => {
      setupEPAServiceMock(mockCleanAreaSites, mockRadonZone3);

      const result = analyzeRadonRisk('CA', '06', '001', 'Alameda', 'California');

      expect(result.radonZone).toBe(3);
      expect(result.riskLevel).toBe('low');
      expect(result.predictedLevel).toBe(1.5);
      expect(result.testingRecommended).toBe(false);
      expect(result.mitigationTypicallyNeeded).toBe(false);
    });
  });

  describe('state disclosure requirements', () => {
    it('should identify disclosure required states correctly', () => {
      setupEPAServiceMock(mockCleanAreaSites, mockRadonZone1);

      const result = analyzeRadonRisk('PA', '42', '013', 'Blair', 'Pennsylvania');

      expect(result.stateDisclosureRequired).toBe(true);
    });

    it('should handle non-disclosure states', () => {
      setupEPAServiceMock(mockCleanAreaSites, mockRadonZone1);

      const result = analyzeRadonRisk('TX', '48', '001', 'Anderson', 'Texas');

      expect(result.stateDisclosureRequired).toBe(false);
    });

    it('should handle case-insensitive state codes', () => {
      setupEPAServiceMock(mockCleanAreaSites, mockRadonZone1);

      const result = analyzeRadonRisk('pa', '42', '013', 'Blair', 'Pennsylvania');

      expect(result.stateDisclosureRequired).toBe(true);
    });
  });

  describe('testing recommendations', () => {
    it('should recommend testing for Zone 1', () => {
      setupEPAServiceMock(mockCleanAreaSites, mockRadonZone1);

      const result = analyzeRadonRisk('PA', '42', '013', 'Blair', 'Pennsylvania');

      expect(result.testingRecommended).toBe(true);
    });

    it('should recommend testing for Zone 2', () => {
      setupEPAServiceMock(mockCleanAreaSites, mockRadonZone2);

      const result = analyzeRadonRisk('PA', '42', '013', 'Blair', 'Pennsylvania');

      expect(result.testingRecommended).toBe(true);
    });

    it('should not require testing for Zone 3', () => {
      setupEPAServiceMock(mockCleanAreaSites, mockRadonZone3);

      const result = analyzeRadonRisk('CA', '06', '001', 'Alameda', 'California');

      expect(result.testingRecommended).toBe(false);
    });
  });

  describe('mitigation cost estimates', () => {
    it('should provide cost estimate for Zone 1', () => {
      setupEPAServiceMock(mockCleanAreaSites, mockRadonZone1);

      const result = analyzeRadonRisk('PA', '42', '013', 'Blair', 'Pennsylvania');

      expect(result.estimatedMitigationCost).not.toBeNull();
      expect(result.estimatedMitigationCost?.min).toBe(800);
      expect(result.estimatedMitigationCost?.max).toBe(2500);
    });

    it('should provide cost estimate for Zone 2', () => {
      setupEPAServiceMock(mockCleanAreaSites, mockRadonZone2);

      const result = analyzeRadonRisk('PA', '42', '013', 'Blair', 'Pennsylvania');

      expect(result.estimatedMitigationCost).not.toBeNull();
      expect(result.estimatedMitigationCost?.min).toBe(800);
      expect(result.estimatedMitigationCost?.max).toBe(1500);
    });

    it('should not provide cost estimate for Zone 3', () => {
      setupEPAServiceMock(mockCleanAreaSites, mockRadonZone3);

      const result = analyzeRadonRisk('CA', '06', '001', 'Alameda', 'California');

      expect(result.estimatedMitigationCost).toBeNull();
    });
  });

  describe('radon level predictions', () => {
    it('should use predicted level from EPA data', () => {
      setupEPAServiceMock(mockCleanAreaSites, mockRadonZone1);

      const result = analyzeRadonRisk('PA', '42', '013', 'Blair', 'Pennsylvania');

      expect(result.stateAverageLevel).toBe(5.2);
      expect(result.countyAverageLevel).toBe(5.2);
    });

    it('should calculate percent above action level for Zone 1', () => {
      setupEPAServiceMock(mockCleanAreaSites, mockRadonZone1);

      const result = analyzeRadonRisk('PA', '42', '013', 'Blair', 'Pennsylvania');

      expect(result.percentAboveActionLevel).toBe(50);
    });

    it('should calculate percent above action level for Zone 2', () => {
      setupEPAServiceMock(mockCleanAreaSites, mockRadonZone2);

      const result = analyzeRadonRisk('PA', '42', '013', 'Blair', 'Pennsylvania');

      expect(result.percentAboveActionLevel).toBe(25);
    });

    it('should calculate percent above action level for Zone 3', () => {
      setupEPAServiceMock(mockCleanAreaSites, mockRadonZone3);

      const result = analyzeRadonRisk('CA', '06', '001', 'Alameda', 'California');

      expect(result.percentAboveActionLevel).toBe(10);
    });
  });

  describe('mitigation recommendations', () => {
    it('should provide comprehensive recommendations for Zone 1', () => {
      setupEPAServiceMock(mockCleanAreaSites, mockRadonZone1);

      const result = analyzeRadonRisk('PA', '42', '013', 'Blair', 'Pennsylvania');

      expect(result.mitigationRecommendations.length).toBeGreaterThan(4);
      expect(
        result.mitigationRecommendations.some((r) =>
          r.includes('Zone 1')
        )
      ).toBe(true);
      expect(
        result.mitigationRecommendations.some((r) =>
          r.includes('testing')
        )
      ).toBe(true);
    });

    it('should provide moderate recommendations for Zone 2', () => {
      setupEPAServiceMock(mockCleanAreaSites, mockRadonZone2);

      const result = analyzeRadonRisk('PA', '42', '013', 'Blair', 'Pennsylvania');

      expect(result.mitigationRecommendations.length).toBeGreaterThan(2);
      expect(
        result.mitigationRecommendations.some((r) =>
          r.includes('Zone 2')
        )
      ).toBe(true);
    });

    it('should provide minimal recommendations for Zone 3', () => {
      setupEPAServiceMock(mockCleanAreaSites, mockRadonZone3);

      const result = analyzeRadonRisk('CA', '06', '001', 'Alameda', 'California');

      expect(result.mitigationRecommendations.length).toBeGreaterThan(0);
      expect(
        result.mitigationRecommendations.some((r) =>
          r.includes('Zone 3')
        )
      ).toBe(true);
    });
  });

  describe('confidence levels', () => {
    it('should have high confidence for high confidence zone data', () => {
      setupEPAServiceMock(mockCleanAreaSites, mockRadonZone1);

      const result = analyzeRadonRisk('PA', '42', '013', 'Blair', 'Pennsylvania');

      expect(result.confidence).toBe(85);
    });

    it('should have medium confidence for medium confidence zone data', () => {
      setupEPAServiceMock(mockCleanAreaSites, mockRadonZone3);

      const result = analyzeRadonRisk('CA', '06', '001', 'Alameda', 'California');

      expect(result.confidence).toBe(70);
    });
  });
});

// ============================================
// Combined Environmental Risk Analysis Tests
// ============================================

describe('analyzeEnvironmentalRisk', () => {
  const testCoordinates = { latitude: 40.5187, longitude: -78.3947 };

  describe('basic functionality', () => {
    it('should return combined analysis with both contamination and radon', async () => {
      setupEPAServiceMock(mockCleanAreaSites, mockRadonZone3);

      const result = await analyzeEnvironmentalRisk(
        testCoordinates,
        'CA',
        '06',
        '001',
        'Alameda',
        'California'
      );

      expect(result).toBeDefined();
      expect(result.contamination).toBeDefined();
      expect(result.radon).toBeDefined();
      expect(result.overallRiskLevel).toBeDefined();
      expect(result.combinedRiskScore).toBeGreaterThanOrEqual(0);
      expect(result.combinedRiskScore).toBeLessThanOrEqual(100);
      expect(result.primaryConcern).toBeDefined();
      expect(result.analyzedAt).toBeInstanceOf(Date);
    });

    it('should identify minimal risk for clean area with low radon', async () => {
      setupEPAServiceMock(mockCleanAreaSites, mockRadonZone3);

      const result = await analyzeEnvironmentalRisk(
        testCoordinates,
        'CA',
        '06',
        '001',
        'Alameda',
        'California'
      );

      expect(result.overallRiskLevel).toMatch(/minimal|low/);
      expect(result.primaryConcern).toBe('none');
      expect(result.criticalWarnings).toHaveLength(0);
    });

    it('should identify high risk for contaminated area with high radon', async () => {
      setupEPAServiceMock(mockSevereRiskSites, mockRadonZone1);

      const result = await analyzeEnvironmentalRisk(
        testCoordinates,
        'PA',
        '42',
        '013',
        'Blair',
        'Pennsylvania'
      );

      expect(result.overallRiskLevel).toMatch(/high|very_high/);
      expect(result.primaryConcern).toBe('both');
      expect(result.criticalWarnings.length).toBeGreaterThan(0);
    });
  });

  describe('primary concern determination', () => {
    it('should identify contamination as primary concern', async () => {
      setupEPAServiceMock(mockSevereRiskSites, mockRadonZone3);

      const result = await analyzeEnvironmentalRisk(
        testCoordinates,
        'CA',
        '06',
        '001',
        'Alameda',
        'California'
      );

      expect(result.primaryConcern).toBe('contamination');
    });

    it('should identify radon as primary concern', async () => {
      setupEPAServiceMock(mockCleanAreaSites, mockRadonZone1);

      const result = await analyzeEnvironmentalRisk(
        testCoordinates,
        'PA',
        '42',
        '013',
        'Blair',
        'Pennsylvania'
      );

      expect(result.primaryConcern).toBe('radon');
    });

    it('should identify both as concerns when applicable', async () => {
      setupEPAServiceMock(mockHighRiskSites, mockRadonZone1);

      const result = await analyzeEnvironmentalRisk(
        testCoordinates,
        'PA',
        '42',
        '013',
        'Blair',
        'Pennsylvania'
      );

      expect(result.primaryConcern).toBe('both');
    });

    it('should identify none when both are low', async () => {
      setupEPAServiceMock(mockCleanAreaSites, mockRadonZone3);

      const result = await analyzeEnvironmentalRisk(
        testCoordinates,
        'CA',
        '06',
        '001',
        'Alameda',
        'California'
      );

      expect(result.primaryConcern).toBe('none');
    });
  });

  describe('critical warnings generation', () => {
    it('should generate severe contamination warnings', async () => {
      setupEPAServiceMock(mockSevereRiskSites, mockRadonZone3);

      const result = await analyzeEnvironmentalRisk(
        testCoordinates,
        'CA',
        '06',
        '001',
        'Alameda',
        'California'
      );

      expect(
        result.criticalWarnings.some((w) =>
          w.includes('SEVERE CONTAMINATION RISK')
        )
      ).toBe(true);
    });

    it('should generate high contamination warnings', async () => {
      setupEPAServiceMock(mockHighRiskSites, mockRadonZone3);

      const result = await analyzeEnvironmentalRisk(
        testCoordinates,
        'CA',
        '06',
        '001',
        'Alameda',
        'California'
      );

      expect(
        result.criticalWarnings.some((w) =>
          w.includes('HIGH CONTAMINATION RISK')
        )
      ).toBe(true);
    });

    it('should generate Phase I warnings', async () => {
      setupEPAServiceMock(mockModerateRiskSites, mockRadonZone3);

      const result = await analyzeEnvironmentalRisk(
        testCoordinates,
        'CA',
        '06',
        '001',
        'Alameda',
        'California'
      );

      expect(
        result.criticalWarnings.some((w) =>
          w.includes('Phase I')
        )
      ).toBe(true);
    });

    it('should generate radon warnings for Zone 1', async () => {
      setupEPAServiceMock(mockCleanAreaSites, mockRadonZone1);

      const result = await analyzeEnvironmentalRisk(
        testCoordinates,
        'PA',
        '42',
        '013',
        'Blair',
        'Pennsylvania'
      );

      expect(
        result.criticalWarnings.some((w) =>
          w.includes('HIGH RADON ZONE')
        )
      ).toBe(true);
    });

    it('should generate no warnings for clean areas', async () => {
      setupEPAServiceMock(mockCleanAreaSites, mockRadonZone3);

      const result = await analyzeEnvironmentalRisk(
        testCoordinates,
        'CA',
        '06',
        '001',
        'Alameda',
        'California'
      );

      expect(result.criticalWarnings).toHaveLength(0);
    });
  });

  describe('combined recommendations', () => {
    it('should combine recommendations from both analyses', async () => {
      setupEPAServiceMock(mockModerateRiskSites, mockRadonZone1);

      const result = await analyzeEnvironmentalRisk(
        testCoordinates,
        'PA',
        '42',
        '013',
        'Blair',
        'Pennsylvania'
      );

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeLessThanOrEqual(5);
    });

    it('should prioritize most important recommendations', async () => {
      setupEPAServiceMock(mockSevereRiskSites, mockRadonZone1);

      const result = await analyzeEnvironmentalRisk(
        testCoordinates,
        'PA',
        '42',
        '013',
        'Blair',
        'Pennsylvania'
      );

      expect(result.recommendations.length).toBeGreaterThan(3);
    });
  });

  describe('combined risk scoring', () => {
    it('should calculate combined risk score correctly', async () => {
      setupEPAServiceMock(mockModerateRiskSites, mockRadonZone2);

      const result = await analyzeEnvironmentalRisk(
        testCoordinates,
        'PA',
        '42',
        '013',
        'Blair',
        'Pennsylvania'
      );

      expect(result.combinedRiskScore).toBeGreaterThan(0);
      expect(result.combinedRiskScore).toBeLessThanOrEqual(100);
    });

    it('should weight contamination higher (60/40)', async () => {
      setupEPAServiceMock(mockModerateRiskSites, mockRadonZone2);

      const result = await analyzeEnvironmentalRisk(
        testCoordinates,
        'PA',
        '42',
        '013',
        'Blair',
        'Pennsylvania'
      );

      const contaminationScore = getContaminationRiskScore(result.contamination);
      const radonScore = getRadonRiskScore(result.radon);
      const expectedScore = Math.round(contaminationScore * 0.6 + radonScore * 0.4);

      expect(result.combinedRiskScore).toBe(expectedScore);
    });
  });

  describe('overall confidence calculation', () => {
    it('should calculate weighted confidence', async () => {
      setupEPAServiceMock(mockModerateRiskSites, mockRadonZone2);

      const result = await analyzeEnvironmentalRisk(
        testCoordinates,
        'PA',
        '42',
        '013',
        'Blair',
        'Pennsylvania'
      );

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
    });

    it('should weight contamination confidence higher', async () => {
      setupEPAServiceMock(mockModerateRiskSites, mockRadonZone2);

      const result = await analyzeEnvironmentalRisk(
        testCoordinates,
        'PA',
        '42',
        '013',
        'Blair',
        'Pennsylvania'
      );

      const expectedConfidence = Math.round(
        result.contamination.confidence * 0.6 + result.radon.confidence * 0.4
      );

      expect(result.confidence).toBe(expectedConfidence);
    });
  });
});

// ============================================
// Risk Scoring Functions Tests
// ============================================

describe('getContaminationRiskScore', () => {
  it('should return 0 for none_known risk level', async () => {
    setupEPAServiceMock(mockCleanAreaSites);
    const analysis = await analyzeContaminationRisk(
      { latitude: 40.5187, longitude: -78.3947 },
      'PA',
      '42013'
    );

    const score = getContaminationRiskScore(analysis);

    expect(score).toBe(0);
  });

  it('should return 25 for low risk level', async () => {
    setupEPAServiceMock(mockLowRiskSites);
    const analysis = await analyzeContaminationRisk(
      { latitude: 40.5187, longitude: -78.3947 },
      'PA',
      '42013'
    );

    const score = getContaminationRiskScore(analysis);

    expect(score).toBe(25);
  });

  it('should return higher score for moderate risk', async () => {
    setupEPAServiceMock(mockModerateRiskSites);
    const analysis = await analyzeContaminationRisk(
      { latitude: 40.5187, longitude: -78.3947 },
      'PA',
      '42013'
    );

    const score = getContaminationRiskScore(analysis);

    expect(score).toBeGreaterThanOrEqual(50);
    expect(score).toBeLessThan(75);
  });

  it('should return higher score for high risk', async () => {
    setupEPAServiceMock(mockHighRiskSites);
    const analysis = await analyzeContaminationRisk(
      { latitude: 40.5187, longitude: -78.3947 },
      'PA',
      '42013'
    );

    const score = getContaminationRiskScore(analysis);

    expect(score).toBeGreaterThanOrEqual(75);
  });

  it('should increase score for close proximity', async () => {
    setupEPAServiceMock(mockHighRiskSites);
    const analysis = await analyzeContaminationRisk(
      { latitude: 40.5187, longitude: -78.3947 },
      'PA',
      '42013'
    );

    const score = getContaminationRiskScore(analysis);

    expect(score).toBeGreaterThan(75);
  });

  it('should increase score for Phase I recommendation', async () => {
    setupEPAServiceMock(mockModerateRiskSites);
    const analysis = await analyzeContaminationRisk(
      { latitude: 40.5187, longitude: -78.3947 },
      'PA',
      '42013'
    );

    const score = getContaminationRiskScore(analysis);

    expect(score).toBeGreaterThan(50);
  });

  it('should increase score for groundwater concerns', async () => {
    setupEPAServiceMock(mockSevereRiskSites);
    const analysis = await analyzeContaminationRisk(
      { latitude: 40.5187, longitude: -78.3947 },
      'PA',
      '42013'
    );

    const score = getContaminationRiskScore(analysis);

    expect(score).toBeGreaterThan(95);
  });

  it('should never exceed 100', async () => {
    setupEPAServiceMock(mockSevereRiskSites);
    const analysis = await analyzeContaminationRisk(
      { latitude: 40.5187, longitude: -78.3947 },
      'PA',
      '42013'
    );

    const score = getContaminationRiskScore(analysis);

    expect(score).toBeLessThanOrEqual(100);
  });
});

describe('getRadonRiskScore', () => {
  it('should return 75 base score for Zone 1', () => {
    setupEPAServiceMock(mockCleanAreaSites, mockRadonZone1);
    const analysis = analyzeRadonRisk('PA', '42', '013', 'Blair', 'Pennsylvania');

    const score = getRadonRiskScore(analysis);

    expect(score).toBeGreaterThanOrEqual(75);
  });

  it('should return 45 base score for Zone 2', () => {
    setupEPAServiceMock(mockCleanAreaSites, mockRadonZone2);
    const analysis = analyzeRadonRisk('PA', '42', '013', 'Blair', 'Pennsylvania');

    const score = getRadonRiskScore(analysis);

    expect(score).toBeGreaterThanOrEqual(45);
    expect(score).toBeLessThan(75);
  });

  it('should return 20 base score for Zone 3', () => {
    setupEPAServiceMock(mockCleanAreaSites, mockRadonZone3);
    const analysis = analyzeRadonRisk('CA', '06', '001', 'Alameda', 'California');

    const score = getRadonRiskScore(analysis);

    expect(score).toBeGreaterThanOrEqual(20);
    expect(score).toBeLessThan(45);
  });

  it('should increase score for high predicted levels', () => {
    setupEPAServiceMock(mockCleanAreaSites, mockRadonZone1);
    const analysis = analyzeRadonRisk('PA', '42', '013', 'Blair', 'Pennsylvania');

    const score = getRadonRiskScore(analysis);

    expect(score).toBeGreaterThan(75);
  });

  it('should increase score for high percentage above action level', () => {
    setupEPAServiceMock(mockCleanAreaSites, mockRadonZone1);
    const analysis = analyzeRadonRisk('PA', '42', '013', 'Blair', 'Pennsylvania');

    const score = getRadonRiskScore(analysis);

    expect(score).toBeGreaterThan(75);
  });

  it('should never exceed 100', () => {
    setupEPAServiceMock(mockCleanAreaSites, mockRadonZone1);
    const analysis = analyzeRadonRisk('PA', '42', '013', 'Blair', 'Pennsylvania');

    const score = getRadonRiskScore(analysis);

    expect(score).toBeLessThanOrEqual(100);
  });
});

describe('getEnvironmentalRiskScore', () => {
  it('should return the combined risk score from result', async () => {
    setupEPAServiceMock(mockModerateRiskSites, mockRadonZone2);

    const result = await analyzeEnvironmentalRisk(
      { latitude: 40.5187, longitude: -78.3947 },
      'PA',
      '42',
      '013',
      'Blair',
      'Pennsylvania'
    );

    const score = getEnvironmentalRiskScore(result);

    expect(score).toBe(result.combinedRiskScore);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

// ============================================
// Constants Tests
// ============================================

describe('RADON_DISCLOSURE_STATES', () => {
  it('should include Pennsylvania', () => {
    expect(RADON_DISCLOSURE_STATES.PA).toBe(true);
  });

  it('should include California', () => {
    expect(RADON_DISCLOSURE_STATES.CA).toBe(true);
  });

  it('should include Colorado', () => {
    expect(RADON_DISCLOSURE_STATES.CO).toBe(true);
  });

  it('should include Illinois', () => {
    expect(RADON_DISCLOSURE_STATES.IL).toBe(true);
  });

  it('should not include Texas', () => {
    expect(RADON_DISCLOSURE_STATES.TX).toBeUndefined();
  });

  it('should have at least 25 states', () => {
    const count = Object.keys(RADON_DISCLOSURE_STATES).length;
    expect(count).toBeGreaterThanOrEqual(25);
  });
});
