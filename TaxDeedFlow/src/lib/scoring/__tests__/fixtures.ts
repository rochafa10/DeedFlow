/**
 * Test Fixtures for Scoring Module
 *
 * Provides mock property data, external data, and expected results
 * for comprehensive testing of the 125-point scoring system.
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-16
 */

import type {
  PropertyData,
  ExternalData,
  PropertyType,
  CategoryScore,
  ComponentScore,
  GradeResult,
  DataSource,
} from '@/types/scoring';

// ============================================
// Mock Data Sources
// ============================================

/**
 * Standard data source for test fixtures
 */
export const mockDataSource: DataSource = {
  name: 'Test Fixture',
  type: 'database',
  reliability: 'high',
  lastUpdated: new Date('2026-01-15'),
};

/**
 * API data source for external data
 */
export const mockApiDataSource: DataSource = {
  name: 'Mock API',
  type: 'api',
  reliability: 'medium',
  lastUpdated: new Date('2026-01-14'),
};

/**
 * Default/fallback data source
 */
export const mockDefaultDataSource: DataSource = {
  name: 'Default Value',
  type: 'default',
  reliability: 'low',
};

// ============================================
// Complete Property Fixtures
// ============================================

/**
 * Ideal property with all data available - should score highly
 * Single-family residential in good neighborhood
 */
export const mockIdealProperty: PropertyData = {
  id: 'prop-ideal-001',
  parcel_id: '01.01-04..-156.00-000',
  address: '456 Oak Street',
  city: 'Altoona',
  state: 'PA',
  zip: '16602',
  county_id: 'county-blair-001',
  county_name: 'Blair',
  owner_name: 'John Smith',
  total_due: 8500,
  tax_amount: 6200,
  tax_year: 2024,
  sale_type: 'judicial',
  sale_date: new Date('2026-03-15'),
  coordinates: {
    latitude: 40.5187,
    longitude: -78.3947,
  },
  lot_size_sqft: 8500,
  lot_size_acres: 0.195,
  building_sqft: 1800,
  year_built: 1985,
  bedrooms: 3,
  bathrooms: 2,
  assessed_value: 125000,
  market_value: 145000,
  property_type: 'single_family_residential',
  zoning: 'R-1',
  land_use: 'Residential',
  validation_status: 'APPROVED',
  pipeline_stage: 'scored',
  has_regrid_data: true,
  has_screenshot: true,
  screenshot_url: 'https://storage.example.com/screenshots/prop-ideal-001.png',
};

/**
 * Complete external data for ideal property
 */
export const mockIdealExternalData: ExternalData = {
  walkScore: 78,
  transitScore: 45,
  bikeScore: 55,
  crimeData: {
    crimeIndex: 25,
    violentCrimeRate: 1.2,
    propertyCrimeRate: 8.5,
    source: 'CrimeGrade',
    asOf: new Date('2026-01-01'),
  },
  schoolRating: {
    overallRating: 8,
    elementaryRating: 8,
    middleRating: 7,
    highRating: 8,
    source: 'GreatSchools',
  },
  floodZone: {
    zone: 'X',
    riskLevel: 'minimal',
    insuranceRequired: false,
    baseFloodElevation: null,
  },
  nearbyAmenities: {
    restaurants: 25,
    groceryStores: 5,
    parks: 8,
    hospitals: 2,
    shopping: 12,
    totalScore: 85,
  },
  environmentalHazards: {
    superfundSites: 0,
    brownfieldSites: 0,
    airQualityIndex: 42,
    riskScore: 15,
  },
  marketData: {
    medianDaysOnMarket: 28,
    priceChangeYoY: 5.2,
    inventoryCount: 150,
    absorptionRate: 3.5,
    medianSalePrice: 165000,
    pricePerSqFt: 95,
  },
  comparableSales: {
    count: 8,
    avgSalePrice: 155000,
    medianSalePrice: 152000,
    avgPricePerSqFt: 92,
    dateRange: {
      start: new Date('2025-07-01'),
      end: new Date('2026-01-01'),
    },
  },
  accessData: null,
};

/**
 * Minimal property - only required fields
 * Should trigger many fallback strategies
 */
export const mockMinimalProperty: PropertyData = {
  id: 'prop-minimal-001',
  parcel_id: '02.03-05..-089.00-000',
  address: null,
  city: null,
  state: 'PA',
  zip: null,
  county_id: 'county-blair-001',
  county_name: 'Blair',
  owner_name: null,
  total_due: 3500,
  tax_amount: null,
  tax_year: null,
  sale_type: 'repository',
  sale_date: null,
  coordinates: null,
  lot_size_sqft: null,
  lot_size_acres: null,
  building_sqft: null,
  year_built: null,
  bedrooms: null,
  bathrooms: null,
  assessed_value: null,
  market_value: null,
  property_type: 'unknown',
  zoning: null,
  land_use: null,
  validation_status: null,
  pipeline_stage: 'parsed',
  has_regrid_data: false,
  has_screenshot: false,
  screenshot_url: null,
};

/**
 * Null external data for minimal property
 */
export const mockNullExternalData: ExternalData = {
  walkScore: null,
  transitScore: null,
  bikeScore: null,
  crimeData: null,
  schoolRating: null,
  floodZone: null,
  nearbyAmenities: null,
  environmentalHazards: null,
  marketData: null,
  comparableSales: null,
  accessData: null,
};

/**
 * Vacant land property - no structure
 */
export const mockVacantLandProperty: PropertyData = {
  id: 'prop-vacant-001',
  parcel_id: '03.04-06..-112.00-000',
  address: '100 Rural Road',
  city: 'Hollidaysburg',
  state: 'PA',
  zip: '16648',
  county_id: 'county-blair-001',
  county_name: 'Blair',
  owner_name: 'Estate of Jane Doe',
  total_due: 2100,
  tax_amount: 1800,
  tax_year: 2023,
  sale_type: 'upset',
  sale_date: new Date('2026-09-15'),
  coordinates: {
    latitude: 40.4321,
    longitude: -78.3821,
  },
  lot_size_sqft: 43560, // 1 acre
  lot_size_acres: 1.0,
  building_sqft: 0, // No structure
  year_built: null,
  bedrooms: null,
  bathrooms: null,
  assessed_value: 25000,
  market_value: 35000,
  property_type: 'vacant_land',
  zoning: 'A-1',
  land_use: 'Agricultural',
  validation_status: 'CAUTION',
  pipeline_stage: 'validated',
  has_regrid_data: true,
  has_screenshot: true,
  screenshot_url: 'https://storage.example.com/screenshots/prop-vacant-001.png',
};

/**
 * External data for vacant land
 */
export const mockVacantLandExternalData: ExternalData = {
  walkScore: 12,
  transitScore: 0,
  bikeScore: 15,
  crimeData: {
    crimeIndex: 10,
    violentCrimeRate: 0.3,
    propertyCrimeRate: 2.1,
    source: 'CrimeGrade',
    asOf: new Date('2026-01-01'),
  },
  schoolRating: {
    overallRating: 6,
    elementaryRating: 6,
    middleRating: 6,
    highRating: 5,
    source: 'GreatSchools',
  },
  floodZone: {
    zone: 'X',
    riskLevel: 'minimal',
    insuranceRequired: false,
    baseFloodElevation: null,
  },
  nearbyAmenities: {
    restaurants: 2,
    groceryStores: 1,
    parks: 3,
    hospitals: 1,
    shopping: 1,
    totalScore: 25,
  },
  environmentalHazards: {
    superfundSites: 0,
    brownfieldSites: 0,
    airQualityIndex: 35,
    riskScore: 8,
  },
  marketData: {
    medianDaysOnMarket: 120,
    priceChangeYoY: 2.1,
    inventoryCount: 45,
    absorptionRate: 1.2,
    medianSalePrice: 40000,
    pricePerSqFt: null,
  },
  comparableSales: {
    count: 3,
    avgSalePrice: 32000,
    medianSalePrice: 30000,
    avgPricePerSqFt: null,
    dateRange: {
      start: new Date('2025-06-01'),
      end: new Date('2025-12-31'),
    },
  },
  accessData: null,
};

/**
 * Very old property (built before 1900)
 */
export const mockVeryOldProperty: PropertyData = {
  id: 'prop-old-001',
  parcel_id: '04.05-07..-223.00-000',
  address: '123 Historic Lane',
  city: 'Altoona',
  state: 'PA',
  zip: '16601',
  county_id: 'county-blair-001',
  county_name: 'Blair',
  owner_name: 'Historic Trust LLC',
  total_due: 12500,
  tax_amount: 9800,
  tax_year: 2024,
  sale_type: 'judicial',
  sale_date: new Date('2026-04-20'),
  coordinates: {
    latitude: 40.5142,
    longitude: -78.4012,
  },
  lot_size_sqft: 6500,
  lot_size_acres: 0.149,
  building_sqft: 2400,
  year_built: 1885, // Very old
  bedrooms: 4,
  bathrooms: 1.5,
  assessed_value: 85000,
  market_value: 95000,
  property_type: 'single_family_residential',
  zoning: 'R-2',
  land_use: 'Residential',
  validation_status: 'APPROVED',
  pipeline_stage: 'enriched',
  has_regrid_data: true,
  has_screenshot: true,
  screenshot_url: 'https://storage.example.com/screenshots/prop-old-001.png',
};

/**
 * High-value commercial property
 */
export const mockHighValueProperty: PropertyData = {
  id: 'prop-highvalue-001',
  parcel_id: '05.06-08..-334.00-000',
  address: '500 Commerce Drive',
  city: 'Altoona',
  state: 'PA',
  zip: '16602',
  county_id: 'county-blair-001',
  county_name: 'Blair',
  owner_name: 'ABC Corporation',
  total_due: 125000,
  tax_amount: 95000,
  tax_year: 2024,
  sale_type: 'judicial',
  sale_date: new Date('2026-05-10'),
  coordinates: {
    latitude: 40.5223,
    longitude: -78.3889,
  },
  lot_size_sqft: 87120, // 2 acres
  lot_size_acres: 2.0,
  building_sqft: 15000,
  year_built: 2005,
  bedrooms: null,
  bathrooms: null,
  assessed_value: 850000,
  market_value: 950000,
  property_type: 'commercial',
  zoning: 'C-2',
  land_use: 'Commercial',
  validation_status: 'APPROVED',
  pipeline_stage: 'enriched',
  has_regrid_data: true,
  has_screenshot: true,
  screenshot_url: 'https://storage.example.com/screenshots/prop-highvalue-001.png',
};

/**
 * Cemetery property - should be auto-rejected
 */
export const mockCemeteryProperty: PropertyData = {
  id: 'prop-cemetery-001',
  parcel_id: '06.07-09..-445.00-000',
  address: '200 Memorial Drive',
  city: 'Altoona',
  state: 'PA',
  zip: '16601',
  county_id: 'county-blair-001',
  county_name: 'Blair',
  owner_name: 'Memorial Cemetery Association',
  total_due: 500,
  tax_amount: 400,
  tax_year: 2023,
  sale_type: 'repository',
  sale_date: null,
  coordinates: {
    latitude: 40.5089,
    longitude: -78.4156,
  },
  lot_size_sqft: 217800, // 5 acres
  lot_size_acres: 5.0,
  building_sqft: 0,
  year_built: null,
  bedrooms: null,
  bathrooms: null,
  assessed_value: 10000,
  market_value: 10000,
  property_type: 'unknown',
  zoning: 'S-1',
  land_use: 'Cemetery',
  validation_status: 'REJECT',
  pipeline_stage: 'validated',
  has_regrid_data: true,
  has_screenshot: true,
  screenshot_url: 'https://storage.example.com/screenshots/prop-cemetery-001.png',
};

/**
 * Property with environmental contamination
 */
export const mockContaminatedProperty: PropertyData = {
  id: 'prop-contaminated-001',
  parcel_id: '07.08-10..-556.00-000',
  address: '789 Industrial Parkway',
  city: 'Altoona',
  state: 'PA',
  zip: '16602',
  county_id: 'county-blair-001',
  county_name: 'Blair',
  owner_name: 'Former Industrial LLC',
  total_due: 45000,
  tax_amount: 38000,
  tax_year: 2024,
  sale_type: 'judicial',
  sale_date: new Date('2026-06-15'),
  coordinates: {
    latitude: 40.5312,
    longitude: -78.3756,
  },
  lot_size_sqft: 130680, // 3 acres
  lot_size_acres: 3.0,
  building_sqft: 8500,
  year_built: 1960,
  bedrooms: null,
  bathrooms: null,
  assessed_value: 150000,
  market_value: 75000, // Reduced due to contamination
  property_type: 'industrial',
  zoning: 'I-1',
  land_use: 'Industrial',
  validation_status: 'CAUTION',
  pipeline_stage: 'enriched',
  has_regrid_data: true,
  has_screenshot: true,
  screenshot_url: 'https://storage.example.com/screenshots/prop-contaminated-001.png',
};

/**
 * External data showing contamination
 */
export const mockContaminatedExternalData: ExternalData = {
  walkScore: 35,
  transitScore: 20,
  bikeScore: 25,
  crimeData: {
    crimeIndex: 45,
    violentCrimeRate: 2.5,
    propertyCrimeRate: 15.2,
    source: 'CrimeGrade',
    asOf: new Date('2026-01-01'),
  },
  schoolRating: null,
  floodZone: {
    zone: 'X',
    riskLevel: 'low',
    insuranceRequired: false,
    baseFloodElevation: null,
  },
  nearbyAmenities: {
    restaurants: 5,
    groceryStores: 2,
    parks: 1,
    hospitals: 1,
    shopping: 3,
    totalScore: 35,
  },
  environmentalHazards: {
    superfundSites: 1,
    brownfieldSites: 2,
    airQualityIndex: 85,
    riskScore: 75,
  },
  marketData: {
    medianDaysOnMarket: 180,
    priceChangeYoY: -8.5,
    inventoryCount: 25,
    absorptionRate: 0.5,
    medianSalePrice: 125000,
    pricePerSqFt: 45,
  },
  comparableSales: {
    count: 2,
    avgSalePrice: 100000,
    medianSalePrice: 100000,
    avgPricePerSqFt: 40,
    dateRange: {
      start: new Date('2025-01-01'),
      end: new Date('2025-12-31'),
    },
  },
  accessData: null,
};

/**
 * Sliver lot property - should be rejected as unbuildable
 */
export const mockSliverLotProperty: PropertyData = {
  id: 'prop-sliver-001',
  parcel_id: '08.09-11..-667.00-000',
  address: '50 Narrow Lane',
  city: 'Hollidaysburg',
  state: 'PA',
  zip: '16648',
  county_id: 'county-blair-001',
  county_name: 'Blair',
  owner_name: 'Unknown',
  total_due: 150,
  tax_amount: 120,
  tax_year: 2022,
  sale_type: 'repository',
  sale_date: null,
  coordinates: {
    latitude: 40.4289,
    longitude: -78.3901,
  },
  lot_size_sqft: 650, // Very small
  lot_size_acres: 0.015,
  building_sqft: 0,
  year_built: null,
  bedrooms: null,
  bathrooms: null,
  assessed_value: 500,
  market_value: 500,
  property_type: 'vacant_land',
  zoning: 'R-1',
  land_use: 'Vacant',
  validation_status: 'REJECT',
  pipeline_stage: 'validated',
  has_regrid_data: true,
  has_screenshot: true,
  screenshot_url: 'https://storage.example.com/screenshots/prop-sliver-001.png',
};

/**
 * Property in flood zone
 */
export const mockFloodZoneProperty: PropertyData = {
  id: 'prop-flood-001',
  parcel_id: '09.10-12..-778.00-000',
  address: '321 River Road',
  city: 'Altoona',
  state: 'PA',
  zip: '16601',
  county_id: 'county-blair-001',
  county_name: 'Blair',
  owner_name: 'River Properties Inc',
  total_due: 7500,
  tax_amount: 6000,
  tax_year: 2024,
  sale_type: 'upset',
  sale_date: new Date('2026-09-20'),
  coordinates: {
    latitude: 40.5056,
    longitude: -78.4234,
  },
  lot_size_sqft: 12000,
  lot_size_acres: 0.275,
  building_sqft: 1600,
  year_built: 1970,
  bedrooms: 3,
  bathrooms: 1,
  assessed_value: 80000,
  market_value: 95000,
  property_type: 'single_family_residential',
  zoning: 'R-1',
  land_use: 'Residential',
  validation_status: 'CAUTION',
  pipeline_stage: 'enriched',
  has_regrid_data: true,
  has_screenshot: true,
  screenshot_url: 'https://storage.example.com/screenshots/prop-flood-001.png',
};

/**
 * External data for flood zone property
 */
export const mockFloodZoneExternalData: ExternalData = {
  walkScore: 55,
  transitScore: 30,
  bikeScore: 40,
  crimeData: {
    crimeIndex: 30,
    violentCrimeRate: 1.5,
    propertyCrimeRate: 10.2,
    source: 'CrimeGrade',
    asOf: new Date('2026-01-01'),
  },
  schoolRating: {
    overallRating: 7,
    elementaryRating: 7,
    middleRating: 7,
    highRating: 6,
    source: 'GreatSchools',
  },
  floodZone: {
    zone: 'AE',
    riskLevel: 'high',
    insuranceRequired: true,
    baseFloodElevation: 12,
  },
  nearbyAmenities: {
    restaurants: 15,
    groceryStores: 3,
    parks: 5,
    hospitals: 2,
    shopping: 8,
    totalScore: 65,
  },
  environmentalHazards: {
    superfundSites: 0,
    brownfieldSites: 0,
    airQualityIndex: 48,
    riskScore: 20,
  },
  marketData: {
    medianDaysOnMarket: 45,
    priceChangeYoY: 2.8,
    inventoryCount: 120,
    absorptionRate: 2.8,
    medianSalePrice: 140000,
    pricePerSqFt: 85,
  },
  comparableSales: {
    count: 6,
    avgSalePrice: 135000,
    medianSalePrice: 130000,
    avgPricePerSqFt: 82,
    dateRange: {
      start: new Date('2025-06-01'),
      end: new Date('2026-01-01'),
    },
  },
  accessData: null,
};

// ============================================
// Expected Score Results
// ============================================

/**
 * Expected location score for ideal property
 */
export const expectedIdealLocationScore: Partial<CategoryScore> = {
  id: 'location',
  name: 'Location',
  score: 20.5, // High but not perfect
  maxScore: 25,
  confidence: 95,
  dataCompleteness: 100,
};

/**
 * Expected grade result for ideal property
 * Should be A- or B+ range
 */
export const expectedIdealGradeResult: Partial<GradeResult> = {
  grade: 'B',
  percentage: 70, // Approximate
};

/**
 * Expected grade result for minimal property
 * Should be C or D range due to missing data
 */
export const expectedMinimalGradeResult: Partial<GradeResult> = {
  grade: 'C',
};

// ============================================
// Edge Case Test Properties
// ============================================

/**
 * Properties for testing specific edge cases
 */
export const edgeCaseProperties = {
  /**
   * Property with IRS lien (title cloud)
   */
  irsLien: {
    ...mockIdealProperty,
    id: 'prop-irslien-001',
    parcel_id: '10.11-13..-889.00-000',
    // IRS lien would be detected from title research data
  } as PropertyData,

  /**
   * Property with no road access (landlocked)
   */
  landlocked: {
    ...mockVacantLandProperty,
    id: 'prop-landlocked-001',
    parcel_id: '11.12-14..-990.00-000',
    address: 'No Address',
    // Would be flagged by Regrid data showing no road frontage
  } as PropertyData,

  /**
   * Property with extremely low value
   */
  extremelyLowValue: {
    ...mockMinimalProperty,
    id: 'prop-lowvalue-001',
    parcel_id: '12.13-15..-101.00-000',
    total_due: 75,
    assessed_value: 200,
    market_value: 150,
  } as PropertyData,

  /**
   * Property in declining market
   */
  decliningMarket: {
    ...mockIdealProperty,
    id: 'prop-declining-001',
    parcel_id: '13.14-16..-202.00-000',
  } as PropertyData,
};

/**
 * External data for declining market
 */
export const decliningMarketExternalData: ExternalData = {
  ...mockIdealExternalData,
  marketData: {
    medianDaysOnMarket: 120,
    priceChangeYoY: -15.5, // Declining
    inventoryCount: 450,
    absorptionRate: 0.8,
    medianSalePrice: 95000,
    pricePerSqFt: 55,
  },
};

// ============================================
// Batch Test Data
// ============================================

/**
 * Array of properties for batch testing
 */
export const batchTestProperties: PropertyData[] = [
  mockIdealProperty,
  mockMinimalProperty,
  mockVacantLandProperty,
  mockVeryOldProperty,
  mockHighValueProperty,
  mockCemeteryProperty,
  mockContaminatedProperty,
  mockSliverLotProperty,
  mockFloodZoneProperty,
];

/**
 * Map of property IDs to their external data
 */
export const batchExternalDataMap: Record<string, ExternalData | null> = {
  'prop-ideal-001': mockIdealExternalData,
  'prop-minimal-001': mockNullExternalData,
  'prop-vacant-001': mockVacantLandExternalData,
  'prop-old-001': mockIdealExternalData,
  'prop-highvalue-001': mockIdealExternalData,
  'prop-cemetery-001': null,
  'prop-contaminated-001': mockContaminatedExternalData,
  'prop-sliver-001': null,
  'prop-flood-001': mockFloodZoneExternalData,
};

// ============================================
// Helper Functions
// ============================================

/**
 * Create a property with specific overrides
 */
export function createMockProperty(
  overrides: Partial<PropertyData>
): PropertyData {
  return {
    ...mockIdealProperty,
    id: `prop-${Date.now()}`,
    ...overrides,
  };
}

/**
 * Create external data with specific overrides
 */
export function createMockExternalData(
  overrides: Partial<ExternalData>
): ExternalData {
  return {
    ...mockIdealExternalData,
    ...overrides,
  };
}

/**
 * Create a mock component score
 */
export function createMockComponentScore(
  overrides: Partial<ComponentScore>
): ComponentScore {
  return {
    id: 'walk_score',
    name: 'Walkability',
    score: 3.5,
    maxScore: 5,
    rawValue: 70,
    normalizedValue: 70,
    confidence: 90,
    description: 'Good walkability score',
    dataSource: mockDataSource,
    missingDataStrategy: 'default_neutral',
    ...overrides,
  };
}

/**
 * Create multiple properties for performance testing
 */
export function createBulkMockProperties(count: number): PropertyData[] {
  const properties: PropertyData[] = [];
  for (let i = 0; i < count; i++) {
    properties.push(
      createMockProperty({
        id: `prop-bulk-${i.toString().padStart(4, '0')}`,
        parcel_id: `${i}.00-00..-000.00-${i.toString().padStart(3, '0')}`,
        address: `${100 + i} Test Street`,
        total_due: 1000 + i * 100,
        assessed_value: 50000 + i * 5000,
        market_value: 60000 + i * 6000,
      })
    );
  }
  return properties;
}

// ============================================
// Grade Boundary Test Data
// ============================================

/**
 * Test cases for grade boundary verification
 * Maps score percentages to expected grades
 */
export const gradeBoundaryTestCases = [
  { score: 125, percentage: 100, expectedGrade: 'A', expectedModifier: 'A+' },
  { score: 112.5, percentage: 90, expectedGrade: 'A', expectedModifier: 'A' },
  { score: 100, percentage: 80, expectedGrade: 'A', expectedModifier: 'A-' },
  { score: 99, percentage: 79.2, expectedGrade: 'B', expectedModifier: 'B+' },
  { score: 87.5, percentage: 70, expectedGrade: 'B', expectedModifier: 'B' },
  { score: 75, percentage: 60, expectedGrade: 'B', expectedModifier: 'B-' },
  { score: 74, percentage: 59.2, expectedGrade: 'C', expectedModifier: 'C+' },
  { score: 62.5, percentage: 50, expectedGrade: 'C', expectedModifier: 'C' },
  { score: 50, percentage: 40, expectedGrade: 'C', expectedModifier: 'C-' },
  { score: 49, percentage: 39.2, expectedGrade: 'D', expectedModifier: 'D+' },
  { score: 37.5, percentage: 30, expectedGrade: 'D', expectedModifier: 'D' },
  { score: 25, percentage: 20, expectedGrade: 'D', expectedModifier: 'D-' },
  { score: 24, percentage: 19.2, expectedGrade: 'F', expectedModifier: 'F' },
  { score: 12.5, percentage: 10, expectedGrade: 'F', expectedModifier: 'F' },
  { score: 0, percentage: 0, expectedGrade: 'F', expectedModifier: 'F' },
];

// ============================================
// State-Specific Test Data
// ============================================

/**
 * Pennsylvania property for regional adjustment testing
 */
export const mockPennsylvaniaProperty: PropertyData = {
  ...mockIdealProperty,
  id: 'prop-pa-001',
  state: 'PA',
  county_name: 'Blair',
};

/**
 * Florida property for regional adjustment testing
 */
export const mockFloridaProperty: PropertyData = {
  ...mockIdealProperty,
  id: 'prop-fl-001',
  state: 'FL',
  county_name: 'Miami-Dade',
  county_id: 'county-miamidade-001',
  sale_type: 'tax_deed',
};

/**
 * Texas property for regional adjustment testing
 */
export const mockTexasProperty: PropertyData = {
  ...mockIdealProperty,
  id: 'prop-tx-001',
  state: 'TX',
  county_name: 'Harris',
  county_id: 'county-harris-001',
  sale_type: 'sheriff_sale',
};
