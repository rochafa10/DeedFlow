/**
 * Property Test Fixtures
 *
 * Provides comprehensive mock property data for testing across
 * the TaxDeedFlow application including various property types,
 * validation statuses, and data completeness scenarios.
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-22
 */

import type { PropertyData, ExternalData, PropertyType } from '@/types/scoring';

// ============================================
// County Data
// ============================================

/**
 * Standard county ID for test properties
 */
export const mockCountyId = 'county-blair-001';

/**
 * Standard county name for test properties
 */
export const mockCountyName = 'Blair';

// ============================================
// Base Property Fixtures
// ============================================

/**
 * Ideal single-family residential property with complete data
 * Should pass all validation and scoring tests
 */
export const mockIdealProperty: PropertyData = {
  id: 'prop-ideal-001',
  parcel_id: '01.01-04..-156.00-000',
  address: '456 Oak Street',
  city: 'Altoona',
  state: 'PA',
  zip: '16602',
  county_id: mockCountyId,
  county_name: mockCountyName,
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
};

/**
 * Minimal property with only required fields
 * Tests handling of incomplete data
 */
export const mockMinimalProperty: PropertyData = {
  id: 'prop-minimal-001',
  parcel_id: '02.03-05..-089.00-000',
  address: null,
  city: null,
  state: 'PA',
  zip: null,
  county_id: mockCountyId,
  county_name: mockCountyName,
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
};

// ============================================
// Property Type Variations
// ============================================

/**
 * Multi-family residential property
 */
export const mockMultiFamilyProperty: PropertyData = {
  ...mockIdealProperty,
  id: 'prop-multifamily-001',
  parcel_id: '03.02-01..-045.00-000',
  address: '789 Maple Avenue',
  building_sqft: 3600,
  bedrooms: 6,
  bathrooms: 4,
  assessed_value: 250000,
  market_value: 285000,
  property_type: 'multi_family_residential',
  zoning: 'R-3',
  total_due: 12500,
};

/**
 * Commercial property
 */
export const mockCommercialProperty: PropertyData = {
  ...mockIdealProperty,
  id: 'prop-commercial-001',
  parcel_id: '04.01-02..-078.00-000',
  address: '123 Main Street',
  building_sqft: 5000,
  bedrooms: null,
  bathrooms: 2,
  assessed_value: 350000,
  market_value: 425000,
  property_type: 'commercial',
  zoning: 'C-2',
  land_use: 'Commercial',
  total_due: 18500,
};

/**
 * Vacant land property
 */
export const mockVacantLandProperty: PropertyData = {
  ...mockIdealProperty,
  id: 'prop-vacant-001',
  parcel_id: '05.03-04..-123.00-000',
  address: 'Lot 15 Pine Ridge Drive',
  lot_size_sqft: 21780,
  lot_size_acres: 0.5,
  building_sqft: null,
  year_built: null,
  bedrooms: null,
  bathrooms: null,
  assessed_value: 45000,
  market_value: 52000,
  property_type: 'vacant_land',
  zoning: 'R-2',
  land_use: 'Residential',
  total_due: 2800,
};

/**
 * Industrial property
 */
export const mockIndustrialProperty: PropertyData = {
  ...mockIdealProperty,
  id: 'prop-industrial-001',
  parcel_id: '06.01-03..-089.00-000',
  address: '500 Industrial Boulevard',
  lot_size_sqft: 87120,
  lot_size_acres: 2.0,
  building_sqft: 12000,
  bedrooms: null,
  bathrooms: 4,
  assessed_value: 650000,
  market_value: 725000,
  property_type: 'industrial',
  zoning: 'I-1',
  land_use: 'Industrial',
  total_due: 28000,
};

/**
 * Agricultural property
 */
export const mockAgriculturalProperty: PropertyData = {
  ...mockIdealProperty,
  id: 'prop-agricultural-001',
  parcel_id: '07.02-01..-234.00-000',
  address: '2500 County Road 15',
  lot_size_sqft: 1742400,
  lot_size_acres: 40.0,
  building_sqft: 2200,
  bedrooms: 4,
  bathrooms: 2,
  assessed_value: 285000,
  market_value: 325000,
  property_type: 'agricultural',
  zoning: 'AG-1',
  land_use: 'Agricultural',
  total_due: 9500,
};

// ============================================
// Validation Status Variations
// ============================================

/**
 * Property approved for investment
 */
export const mockApprovedProperty: PropertyData = {
  ...mockIdealProperty,
  id: 'prop-approved-001',
  validation_status: 'APPROVED',
  pipeline_stage: 'validated',
};

/**
 * Property flagged for caution
 */
export const mockCautionProperty: PropertyData = {
  ...mockIdealProperty,
  id: 'prop-caution-001',
  address: '999 Hillside Lane',
  validation_status: 'CAUTION',
  pipeline_stage: 'validated',
};

/**
 * Property rejected from consideration
 */
export const mockRejectedProperty: PropertyData = {
  ...mockIdealProperty,
  id: 'prop-rejected-001',
  address: 'Cemetery Plot 42',
  validation_status: 'REJECT',
  pipeline_stage: 'validated',
};

// ============================================
// Pipeline Stage Variations
// ============================================

/**
 * Property in parsing stage
 */
export const mockParsedProperty: PropertyData = {
  ...mockMinimalProperty,
  id: 'prop-parsed-001',
  pipeline_stage: 'parsed',
};

/**
 * Property with Regrid data enrichment
 */
export const mockEnrichedProperty: PropertyData = {
  ...mockIdealProperty,
  id: 'prop-enriched-001',
  pipeline_stage: 'enriched',
  has_regrid_data: true,
  has_screenshot: true,
};

/**
 * Property with visual validation
 */
export const mockValidatedProperty: PropertyData = {
  ...mockIdealProperty,
  id: 'prop-validated-001',
  pipeline_stage: 'validated',
  validation_status: 'APPROVED',
};

/**
 * Property with complete scoring
 */
export const mockScoredProperty: PropertyData = {
  ...mockIdealProperty,
  id: 'prop-scored-001',
  pipeline_stage: 'scored',
  validation_status: 'APPROVED',
};

// ============================================
// Edge Case Properties
// ============================================

/**
 * Property with very high tax debt
 */
export const mockHighDebtProperty: PropertyData = {
  ...mockIdealProperty,
  id: 'prop-highdebt-001',
  total_due: 85000,
  tax_amount: 52000,
  assessed_value: 125000,
  market_value: 145000,
};

/**
 * Property with very low tax debt
 */
export const mockLowDebtProperty: PropertyData = {
  ...mockIdealProperty,
  id: 'prop-lowdebt-001',
  total_due: 850,
  tax_amount: 620,
  assessed_value: 125000,
  market_value: 145000,
};

/**
 * Property with old sale date (past)
 */
export const mockPastSaleProperty: PropertyData = {
  ...mockIdealProperty,
  id: 'prop-pastsale-001',
  sale_date: new Date('2025-06-15'),
};

/**
 * Property with upcoming sale date
 */
export const mockUpcomingSaleProperty: PropertyData = {
  ...mockIdealProperty,
  id: 'prop-upcoming-001',
  sale_date: new Date('2026-02-28'),
};

/**
 * Property with no coordinates
 */
export const mockNoCoordinatesProperty: PropertyData = {
  ...mockIdealProperty,
  id: 'prop-nocoords-001',
  coordinates: null,
};

/**
 * Property with no screenshot
 */
export const mockNoScreenshotProperty: PropertyData = {
  ...mockIdealProperty,
  id: 'prop-noscreenshot-001',
  has_screenshot: false,
  screenshot_url: null,
};

/**
 * Property with missing valuation
 */
export const mockNoValuationProperty: PropertyData = {
  ...mockIdealProperty,
  id: 'prop-novaluation-001',
  assessed_value: null,
  market_value: null,
};

/**
 * Property with very old construction
 */
export const mockOldProperty: PropertyData = {
  ...mockIdealProperty,
  id: 'prop-old-001',
  year_built: 1920,
};

/**
 * Property with new construction
 */
export const mockNewProperty: PropertyData = {
  ...mockIdealProperty,
  id: 'prop-new-001',
  year_built: 2024,
};

// ============================================
// Flood Risk Properties
// ============================================

/**
 * Property in high-risk flood zone
 */
export const mockHighFloodRiskProperty: PropertyData = {
  ...mockIdealProperty,
  id: 'prop-floodzone-high-001',
  address: '100 Riverside Drive',
};

/**
 * External data for high flood risk property
 */
export const mockHighFloodRiskExternalData: ExternalData = {
  ...mockIdealExternalData,
  floodZone: {
    zone: 'AE',
    riskLevel: 'high',
    insuranceRequired: true,
    baseFloodElevation: 1150,
  },
};

/**
 * Property in moderate flood zone
 */
export const mockModerateFloodRiskProperty: PropertyData = {
  ...mockIdealProperty,
  id: 'prop-floodzone-moderate-001',
  address: '200 Creek Lane',
};

/**
 * External data for moderate flood risk property
 */
export const mockModerateFloodRiskExternalData: ExternalData = {
  ...mockIdealExternalData,
  floodZone: {
    zone: 'X500',
    riskLevel: 'moderate',
    insuranceRequired: false,
    baseFloodElevation: null,
  },
};

// ============================================
// Crime Area Properties
// ============================================

/**
 * Property in high-crime area
 */
export const mockHighCrimeProperty: PropertyData = {
  ...mockIdealProperty,
  id: 'prop-highcrime-001',
  address: '300 Urban Street',
};

/**
 * External data for high-crime property
 */
export const mockHighCrimeExternalData: ExternalData = {
  ...mockIdealExternalData,
  crimeData: {
    crimeIndex: 85,
    violentCrimeRate: 12.5,
    propertyCrimeRate: 45.8,
    source: 'CrimeGrade',
    asOf: new Date('2026-01-01'),
  },
};

/**
 * Property in low-crime area
 */
export const mockLowCrimeProperty: PropertyData = {
  ...mockIdealProperty,
  id: 'prop-lowcrime-001',
  address: '400 Safe Haven Lane',
};

/**
 * External data for low-crime property
 */
export const mockLowCrimeExternalData: ExternalData = {
  ...mockIdealExternalData,
  crimeData: {
    crimeIndex: 8,
    violentCrimeRate: 0.5,
    propertyCrimeRate: 3.2,
    source: 'CrimeGrade',
    asOf: new Date('2026-01-01'),
  },
};

// ============================================
// Market Condition Properties
// ============================================

/**
 * Property in hot market
 */
export const mockHotMarketProperty: PropertyData = {
  ...mockIdealProperty,
  id: 'prop-hotmarket-001',
  address: '500 Desirable Avenue',
};

/**
 * External data for hot market property
 */
export const mockHotMarketExternalData: ExternalData = {
  ...mockIdealExternalData,
  marketData: {
    medianDaysOnMarket: 8,
    priceChangeYoY: 15.5,
    inventoryCount: 45,
    absorptionRate: 2.1,
    medianSalePrice: 185000,
    pricePerSqFt: 110,
  },
};

/**
 * Property in cold market
 */
export const mockColdMarketProperty: PropertyData = {
  ...mockIdealProperty,
  id: 'prop-coldmarket-001',
  address: '600 Slow Sales Road',
};

/**
 * External data for cold market property
 */
export const mockColdMarketExternalData: ExternalData = {
  ...mockIdealExternalData,
  marketData: {
    medianDaysOnMarket: 120,
    priceChangeYoY: -3.5,
    inventoryCount: 450,
    absorptionRate: 8.5,
    medianSalePrice: 95000,
    pricePerSqFt: 55,
  },
};

// ============================================
// Helper Functions
// ============================================

/**
 * Creates a custom property fixture with partial overrides
 */
export function createMockProperty(
  overrides: Partial<PropertyData> = {}
): PropertyData {
  return {
    ...mockIdealProperty,
    ...overrides,
    id: overrides.id || `prop-custom-${Date.now()}`,
  };
}

/**
 * Creates custom external data with partial overrides
 */
export function createMockExternalData(
  overrides: Partial<ExternalData> = {}
): ExternalData {
  return {
    ...mockIdealExternalData,
    ...overrides,
  };
}

/**
 * Creates a property with specific property type
 */
export function createPropertyByType(
  propertyType: PropertyType,
  overrides: Partial<PropertyData> = {}
): PropertyData {
  const baseProperties: Record<PropertyType, Partial<PropertyData>> = {
    single_family_residential: {
      bedrooms: 3,
      bathrooms: 2,
      building_sqft: 1800,
      lot_size_acres: 0.195,
      zoning: 'R-1',
    },
    multi_family_residential: {
      bedrooms: 6,
      bathrooms: 4,
      building_sqft: 3600,
      lot_size_acres: 0.25,
      zoning: 'R-3',
    },
    commercial: {
      bedrooms: null,
      bathrooms: 2,
      building_sqft: 5000,
      lot_size_acres: 0.5,
      zoning: 'C-2',
    },
    industrial: {
      bedrooms: null,
      bathrooms: 4,
      building_sqft: 12000,
      lot_size_acres: 2.0,
      zoning: 'I-1',
    },
    vacant_land: {
      bedrooms: null,
      bathrooms: null,
      building_sqft: null,
      year_built: null,
      lot_size_acres: 0.5,
      zoning: 'R-2',
    },
    mixed_use: {
      bedrooms: 2,
      bathrooms: 2,
      building_sqft: 4000,
      lot_size_acres: 0.3,
      zoning: 'MU-1',
    },
    agricultural: {
      bedrooms: 4,
      bathrooms: 2,
      building_sqft: 2200,
      lot_size_acres: 40.0,
      zoning: 'AG-1',
    },
    unknown: {
      bedrooms: null,
      bathrooms: null,
      building_sqft: null,
      year_built: null,
      lot_size_acres: null,
      zoning: null,
    },
  };

  return createMockProperty({
    property_type: propertyType,
    ...baseProperties[propertyType],
    ...overrides,
  });
}

/**
 * Creates a property at specific pipeline stage
 */
export function createPropertyAtStage(
  stage: string,
  overrides: Partial<PropertyData> = {}
): PropertyData {
  const stageDefaults: Record<string, Partial<PropertyData>> = {
    parsed: {
      has_regrid_data: false,
      has_screenshot: false,
      validation_status: null,
    },
    enriched: {
      has_regrid_data: true,
      has_screenshot: true,
      validation_status: null,
    },
    validated: {
      has_regrid_data: true,
      has_screenshot: true,
      validation_status: 'APPROVED',
    },
    scored: {
      has_regrid_data: true,
      has_screenshot: true,
      validation_status: 'APPROVED',
    },
  };

  return createMockProperty({
    pipeline_stage: stage,
    ...(stageDefaults[stage] || {}),
    ...overrides,
  });
}

/**
 * Creates an array of mock properties
 */
export function createMockPropertyArray(
  count: number,
  template: Partial<PropertyData> = {}
): PropertyData[] {
  return Array.from({ length: count }, (_, index) =>
    createMockProperty({
      ...template,
      id: `prop-batch-${index + 1}`,
      parcel_id: `${String(index + 1).padStart(2, '0')}.01-02..-${String(index + 100).padStart(3, '0')}.00-000`,
    })
  );
}

// ============================================
// Exports
// ============================================

/**
 * Property fixtures namespace for grouped imports
 */
export const PropertyFixtures = {
  // Base fixtures
  ideal: mockIdealProperty,
  idealExternal: mockIdealExternalData,
  minimal: mockMinimalProperty,
  minimalExternal: mockNullExternalData,

  // Property types
  singleFamily: mockIdealProperty,
  multiFamily: mockMultiFamilyProperty,
  commercial: mockCommercialProperty,
  vacantLand: mockVacantLandProperty,
  industrial: mockIndustrialProperty,
  agricultural: mockAgriculturalProperty,

  // Validation statuses
  approved: mockApprovedProperty,
  caution: mockCautionProperty,
  rejected: mockRejectedProperty,

  // Pipeline stages
  parsed: mockParsedProperty,
  enriched: mockEnrichedProperty,
  validated: mockValidatedProperty,
  scored: mockScoredProperty,

  // Edge cases
  highDebt: mockHighDebtProperty,
  lowDebt: mockLowDebtProperty,
  pastSale: mockPastSaleProperty,
  upcomingSale: mockUpcomingSaleProperty,
  noCoordinates: mockNoCoordinatesProperty,
  noScreenshot: mockNoScreenshotProperty,
  noValuation: mockNoValuationProperty,
  oldProperty: mockOldProperty,
  newProperty: mockNewProperty,

  // Flood risk
  highFloodRisk: {
    property: mockHighFloodRiskProperty,
    external: mockHighFloodRiskExternalData,
  },
  moderateFloodRisk: {
    property: mockModerateFloodRiskProperty,
    external: mockModerateFloodRiskExternalData,
  },

  // Crime areas
  highCrime: {
    property: mockHighCrimeProperty,
    external: mockHighCrimeExternalData,
  },
  lowCrime: {
    property: mockLowCrimeProperty,
    external: mockLowCrimeExternalData,
  },

  // Market conditions
  hotMarket: {
    property: mockHotMarketProperty,
    external: mockHotMarketExternalData,
  },
  coldMarket: {
    property: mockColdMarketProperty,
    external: mockColdMarketExternalData,
  },

  // Helper functions
  create: createMockProperty,
  createExternal: createMockExternalData,
  createByType: createPropertyByType,
  createAtStage: createPropertyAtStage,
  createArray: createMockPropertyArray,
};

export default PropertyFixtures;
