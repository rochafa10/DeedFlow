/**
 * JSON Export Utility Tests
 *
 * Tests the JSON export functionality including:
 * - Filename generation and sanitization
 * - Report data preparation and filtering
 * - JSON conversion with formatting options
 * - Blob generation
 * - Null/undefined value handling
 * - Section toggling
 * - Edge cases and special characters
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-22
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  generateJSONFilename,
  prepareReportForJSON,
  convertReportToJSON,
  exportReportToJSONBlob,
  exportReportToJSON,
  type JSONExportOptions,
} from '../json-export';
import type { PropertyReportData } from '@/types/report';

// ============================================
// Mock Data
// ============================================

const mockDate = new Date('2026-01-22T12:00:00Z');

const createMockReportData = (overrides?: Partial<PropertyReportData>): PropertyReportData => ({
  property: {
    id: 'test-property-123',
    parcel_id: 'PARC-001',
    address: '123 Main St, Blair, PA 16001',
    county_name: 'Blair',
    property_type: 'Single Family',
    building_sqft: 1500,
    bedrooms: 3,
    bathrooms: 2,
    year_built: 2000,
    lot_size_sqft: 5000,
    zoning: 'R1',
    ...overrides?.property,
  },
  scoreBreakdown: {
    totalScore: 95.5,
    gradeResult: {
      grade: 'A',
      gradeWithModifier: 'A+',
      percentage: 76.4,
      description: 'Excellent investment opportunity',
    },
    location: {
      id: 'location',
      name: 'Location',
      score: 20,
      maxScore: 25,
      confidence: 85,
      components: [],
    },
    risk: {
      id: 'risk',
      name: 'Risk',
      score: 22,
      maxScore: 25,
      confidence: 90,
      components: [],
    },
    financial: {
      id: 'financial',
      name: 'Financial',
      score: 18,
      maxScore: 25,
      confidence: 80,
      components: [],
    },
    market: {
      id: 'market',
      name: 'Market',
      score: 21,
      maxScore: 25,
      confidence: 85,
      components: [],
    },
    profit: {
      id: 'profit',
      name: 'Profit',
      score: 14.5,
      maxScore: 25,
      confidence: 75,
      components: [],
    },
    ...overrides?.scoreBreakdown,
  },
  costAnalysis: {
    acquisition: {
      bidAmount: 50000,
      premiumPercentage: 10,
      premiumAmount: 5000,
      titleCosts: 1500,
      recordingFees: 200,
      legalFees: 1000,
      otherCosts: 300,
      total: 58000,
    },
    rehab: {
      minimumEstimate: 20000,
      expectedEstimate: 30000,
      maximumEstimate: 40000,
      conditionAssessment: 'fair',
      breakdown: [],
    },
    holding: {
      monthlyTaxes: 200,
      monthlyInsurance: 150,
      monthlyUtilities: 100,
      monthlyMaintenance: 50,
      monthlyHOA: 0,
      monthlyTotal: 500,
      holdingPeriodMonths: 6,
      totalHoldingCosts: 3000,
    },
    selling: {
      commissionPercentage: 6,
      commissionAmount: 9000,
      closingCostsPercentage: 2,
      closingCostsAmount: 3000,
      stagingCosts: 1000,
      marketingCosts: 500,
      total: 13500,
    },
    totalCosts: 104500,
    costBreakdown: [
      { category: 'Acquisition', amount: 58000, percentage: 55.5, color: '#3b82f6' },
      { category: 'Rehab', amount: 30000, percentage: 28.7, color: '#10b981' },
      { category: 'Holding', amount: 3000, percentage: 2.9, color: '#f59e0b' },
      { category: 'Selling', amount: 13500, percentage: 12.9, color: '#ef4444' },
    ],
    ...overrides?.costAnalysis,
  },
  roiAnalysis: {
    totalInvestment: 104500,
    afterRepairValue: 150000,
    estimatedProfit: 45500,
    roiPercentage: 43.5,
    annualizedROI: 87.0,
    profitMargin: 30.3,
    cashOnCashReturn: 43.5,
    breakEvenPrice: 104500,
    maximumAllowableOffer: 75000,
    confidenceLevel: 'high',
    assumptions: [
      { key: 'ARV', value: '$150,000', source: 'Comparables Analysis' },
      { key: 'Holding Period', value: '6 months', source: 'Market Average' },
    ],
    ...overrides?.roiAnalysis,
  },
  riskAnalysis: {
    flood: {
      type: 'flood',
      name: 'Flood Risk',
      level: 'low',
      score: 15,
      summary: 'Low flood risk area',
      findings: ['Zone X - Minimal flood risk'],
      mitigations: [],
      insuranceRecommendation: 'Standard homeowners insurance sufficient',
      estimatedInsuranceCost: 1200,
      dataSource: 'FEMA',
      lastUpdated: mockDate,
    },
    earthquake: {
      type: 'earthquake',
      name: 'Earthquake Risk',
      level: 'low',
      score: 10,
      summary: 'Minimal earthquake risk',
      findings: [],
      mitigations: [],
      insuranceRecommendation: null,
      estimatedInsuranceCost: null,
      dataSource: 'USGS',
      lastUpdated: mockDate,
    },
    wildfire: {
      type: 'wildfire',
      name: 'Wildfire Risk',
      level: 'medium',
      score: 35,
      summary: 'Moderate wildfire risk',
      findings: ['Within 5 miles of forested area'],
      mitigations: [],
      insuranceRecommendation: 'Consider additional coverage',
      estimatedInsuranceCost: 800,
      dataSource: 'USFS',
      lastUpdated: mockDate,
    },
    hurricane: {
      type: 'hurricane',
      name: 'Hurricane Risk',
      level: 'low',
      score: 5,
      summary: 'Low hurricane risk',
      findings: [],
      mitigations: [],
      insuranceRecommendation: null,
      estimatedInsuranceCost: null,
      dataSource: 'NOAA',
      lastUpdated: mockDate,
    },
    sinkhole: {
      type: 'sinkhole',
      name: 'Sinkhole Risk',
      level: 'low',
      score: 8,
      summary: 'Low sinkhole risk',
      findings: [],
      mitigations: [],
      insuranceRecommendation: null,
      estimatedInsuranceCost: null,
      dataSource: 'State Geological Survey',
      lastUpdated: mockDate,
    },
    environmental: {
      type: 'environmental',
      name: 'Environmental Risk',
      level: 'low',
      score: 12,
      summary: 'No known environmental issues',
      findings: ['No EPA sites within 1 mile'],
      mitigations: [],
      insuranceRecommendation: null,
      estimatedInsuranceCost: null,
      dataSource: 'EPA',
      lastUpdated: mockDate,
    },
    radon: {
      type: 'radon',
      name: 'Radon Risk',
      level: 'medium',
      score: 25,
      summary: 'Moderate radon risk',
      findings: [],
      mitigations: [],
      insuranceRecommendation: 'Radon testing recommended',
      estimatedInsuranceCost: null,
      dataSource: 'EPA',
      lastUpdated: mockDate,
    },
    slope: {
      type: 'slope',
      name: 'Slope/Landslide Risk',
      level: 'low',
      score: 10,
      summary: 'Minimal slope risk',
      findings: [],
      mitigations: [],
      insuranceRecommendation: null,
      estimatedInsuranceCost: null,
      dataSource: 'USGS',
      lastUpdated: mockDate,
    },
    overallRiskScore: 15,
    overallRiskLevel: 'low',
    totalInsuranceCosts: 2000,
    recommendations: ['Obtain standard homeowners insurance'],
    topRiskFactors: ['Wildfire proximity'],
    positiveFactors: ['Low flood zone', 'Stable ground'],
    warnings: [],
    ...overrides?.riskAnalysis,
  },
  comparables: {
    subject: {
      address: '123 Main St, Blair, PA 16001',
      squareFeet: 1500,
      bedrooms: 3,
      bathrooms: 2,
      yearBuilt: 2000,
      lotSize: 5000,
    },
    comparables: [
      {
        address: '125 Main St',
        salePrice: 155000,
        saleDate: new Date('2025-12-15'),
        pricePerSqFt: 103.33,
        squareFeet: 1500,
        bedrooms: 3,
        bathrooms: 2,
        yearBuilt: 1998,
        distanceMiles: 0.1,
        daysSinceSale: 38,
        similarityScore: 95,
        adjustments: [],
        adjustedPrice: 155000,
      },
      {
        address: '200 Oak Ave',
        salePrice: 148000,
        saleDate: new Date('2025-11-20'),
        pricePerSqFt: 98.67,
        squareFeet: 1500,
        bedrooms: 3,
        bathrooms: 2,
        yearBuilt: 2002,
        distanceMiles: 0.3,
        daysSinceSale: 63,
        similarityScore: 92,
        adjustments: [],
        adjustedPrice: 148000,
      },
    ],
    estimatedValue: 150000,
    valueLowRange: 145000,
    valueHighRange: 158000,
    averagePricePerSqFt: 100.0,
    medianPricePerSqFt: 100.0,
    searchRadiusMiles: 1.0,
    dateRange: {
      start: new Date('2025-08-01'),
      end: new Date('2026-01-22'),
    },
    confidenceLevel: 'high',
    dataSource: 'MLS',
    notes: ['Strong market with limited inventory'],
    ...overrides?.comparables,
  },
  auctionDetails: {
    saleType: 'Tax Deed Sale',
    saleDate: new Date('2026-02-15'),
    daysUntilSale: 24,
    platform: 'Bid4Assets',
    platformUrl: 'https://bid4assets.com',
    startingBid: 45000,
    depositRequired: 2500,
    registrationDeadline: new Date('2026-02-10'),
    registrationStatus: 'open',
    registrationRequirements: ['Valid ID', 'Deposit'],
    paymentDeadline: '10 days after sale',
    paymentMethods: ['Wire Transfer', 'Certified Check'],
    buyersPremiumPercentage: 10,
    specialConditions: ['Sold as-is'],
    countyContact: {
      name: 'John Smith',
      phone: '555-1234',
      email: 'taxsale@county.gov',
      website: 'https://county.gov/taxsale',
    },
    ...overrides?.auctionDetails,
  },
  recommendations: [
    {
      id: 'rec-1',
      priority: 'high',
      category: 'due_diligence',
      title: 'Conduct property inspection',
      description: 'Schedule a thorough inspection before bidding',
      estimatedCost: 500,
      timeframe: 'Before auction',
      relatedTo: 'Property condition',
    },
    {
      id: 'rec-2',
      priority: 'medium',
      category: 'financing',
      title: 'Secure financing',
      description: 'Pre-arrange funding for quick payment',
      estimatedCost: null,
      timeframe: '1 week',
      relatedTo: 'Payment deadline',
    },
  ],
  metadata: {
    generatedAt: mockDate,
    reportVersion: '1.0.0',
    dataSources: ['MLS', 'County Records', 'FEMA', 'EPA'],
    dataFreshness: 'current',
    overallConfidence: {
      overall: 85,
      label: 'High',
      factors: [],
      recommendations: [],
    },
  },
  ...overrides,
});

// ============================================
// Filename Generation Tests
// ============================================

describe('generateJSONFilename', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('with address', () => {
    it('should generate filename with sanitized address', () => {
      const filename = generateJSONFilename('123 Main St, Blair, PA 16001');
      expect(filename).toBe('property-report-123-main-st-blair-pa-16001-2026-01-22.json');
    });

    it('should remove special characters from address', () => {
      const filename = generateJSONFilename('123 Main St. #4, Blair, PA');
      expect(filename).toBe('property-report-123-main-st-4-blair-pa-2026-01-22.json');
    });

    it('should replace multiple spaces with single hyphen', () => {
      const filename = generateJSONFilename('123   Main    St');
      expect(filename).toBe('property-report-123-main-st-2026-01-22.json');
    });

    it('should convert to lowercase', () => {
      const filename = generateJSONFilename('MAIN STREET');
      expect(filename).toBe('property-report-main-street-2026-01-22.json');
    });

    it('should truncate long addresses to 50 characters', () => {
      const longAddress = 'A'.repeat(100);
      const filename = generateJSONFilename(longAddress);
      const addressPart = filename.split('-2026-')[0].replace('property-report-', '');
      expect(addressPart.length).toBeLessThanOrEqual(50);
    });

    it('should handle consecutive hyphens', () => {
      const filename = generateJSONFilename('123 - - Main - - St');
      expect(filename).not.toContain('--');
    });
  });

  describe('with report ID', () => {
    it('should generate filename with report ID', () => {
      const filename = generateJSONFilename(undefined, 'REPORT-123');
      expect(filename).toBe('property-report-REPORT-123-2026-01-22.json');
    });
  });

  describe('without address or report ID', () => {
    it('should generate filename with date only', () => {
      const filename = generateJSONFilename();
      expect(filename).toBe('property-report-2026-01-22.json');
    });
  });

  describe('address takes precedence over report ID', () => {
    it('should use address when both provided', () => {
      const filename = generateJSONFilename('123 Main St', 'REPORT-123');
      expect(filename).toMatch(/^property-report-123-main-st-/);
      expect(filename).not.toContain('REPORT-123');
    });
  });
});

// ============================================
// Report Preparation Tests
// ============================================

describe('prepareReportForJSON', () => {
  let mockReport: PropertyReportData;

  beforeEach(() => {
    mockReport = createMockReportData();
  });

  describe('default behavior', () => {
    it('should include all sections by default', () => {
      const prepared = prepareReportForJSON(mockReport);

      expect(prepared.property).toBeDefined();
      expect(prepared.scoreBreakdown).toBeDefined();
      expect(prepared.costAnalysis).toBeDefined();
      expect(prepared.roiAnalysis).toBeDefined();
      expect(prepared.riskAnalysis).toBeDefined();
      expect(prepared.comparables).toBeDefined();
      expect(prepared.recommendations).toBeDefined();
      expect(prepared.metadata).toBeDefined();
    });

    it('should preserve data integrity', () => {
      const prepared = prepareReportForJSON(mockReport);

      expect(prepared.property?.address).toBe('123 Main St, Blair, PA 16001');
      expect(prepared.scoreBreakdown?.totalScore).toBe(95.5);
      expect(prepared.costAnalysis?.totalCosts).toBe(104500);
    });

    it('should exclude undefined values by default', () => {
      const reportWithUndefined = createMockReportData({
        property: {
          ...mockReport.property,
          // @ts-expect-error - Testing undefined value
          customField: undefined,
        },
      });

      const prepared = prepareReportForJSON(reportWithUndefined);
      const jsonString = JSON.stringify(prepared);

      expect(jsonString).not.toContain('customField');
    });

    it('should keep null values by default', () => {
      const reportWithNull = createMockReportData({
        recommendations: [
          {
            ...mockReport.recommendations[0],
            estimatedCost: null,
          },
        ],
      });

      const prepared = prepareReportForJSON(reportWithNull);
      const rec = prepared.recommendations?.[0];

      expect(rec?.estimatedCost).toBeNull();
    });
  });

  describe('section filtering', () => {
    it('should exclude property info when disabled', () => {
      const prepared = prepareReportForJSON(mockReport, {
        includePropertyInfo: false,
      });

      expect(prepared.property).toBeUndefined();
      expect(prepared.scoreBreakdown).toBeDefined();
    });

    it('should exclude scores when disabled', () => {
      const prepared = prepareReportForJSON(mockReport, {
        includeScores: false,
      });

      expect(prepared.scoreBreakdown).toBeUndefined();
      expect(prepared.property).toBeDefined();
    });

    it('should exclude costs when disabled', () => {
      const prepared = prepareReportForJSON(mockReport, {
        includeCosts: false,
      });

      expect(prepared.costAnalysis).toBeUndefined();
    });

    it('should exclude ROI when disabled', () => {
      const prepared = prepareReportForJSON(mockReport, {
        includeROI: false,
      });

      expect(prepared.roiAnalysis).toBeUndefined();
    });

    it('should exclude risk analysis when disabled', () => {
      const prepared = prepareReportForJSON(mockReport, {
        includeRiskAnalysis: false,
      });

      expect(prepared.riskAnalysis).toBeUndefined();
    });

    it('should exclude comparables when disabled', () => {
      const prepared = prepareReportForJSON(mockReport, {
        includeComparables: false,
      });

      expect(prepared.comparables).toBeUndefined();
    });

    it('should exclude recommendations when disabled', () => {
      const prepared = prepareReportForJSON(mockReport, {
        includeRecommendations: false,
      });

      expect(prepared.recommendations).toBeUndefined();
    });

    it('should exclude metadata when disabled', () => {
      const prepared = prepareReportForJSON(mockReport, {
        includeMetadata: false,
      });

      expect(prepared.metadata).toBeUndefined();
    });

    it('should handle multiple sections disabled', () => {
      const prepared = prepareReportForJSON(mockReport, {
        includePropertyInfo: false,
        includeScores: false,
        includeCosts: false,
      });

      expect(prepared.property).toBeUndefined();
      expect(prepared.scoreBreakdown).toBeUndefined();
      expect(prepared.costAnalysis).toBeUndefined();
      expect(prepared.roiAnalysis).toBeDefined();
    });

    it('should handle all sections disabled except one', () => {
      const prepared = prepareReportForJSON(mockReport, {
        includePropertyInfo: false,
        includeScores: false,
        includeCosts: false,
        includeROI: false,
        includeRiskAnalysis: false,
        includeComparables: false,
        includeRecommendations: false,
        includeMetadata: true,
      });

      expect(Object.keys(prepared)).toHaveLength(1);
      expect(prepared.metadata).toBeDefined();
    });
  });

  describe('null/undefined value handling', () => {
    it('should remove null values when excludeNullValues is true', () => {
      const reportWithNulls = createMockReportData({
        recommendations: [
          {
            ...mockReport.recommendations[0],
            estimatedCost: null,
            timeframe: null,
          },
        ],
      });

      const prepared = prepareReportForJSON(reportWithNulls, {
        excludeNullValues: true,
      });

      const rec = prepared.recommendations?.[0];
      expect(rec).toBeDefined();
      expect('estimatedCost' in rec!).toBe(false);
      expect('timeframe' in rec!).toBe(false);
    });

    it('should remove undefined values when excludeUndefinedValues is true', () => {
      const reportWithUndefined = createMockReportData({
        property: {
          ...mockReport.property,
          // @ts-expect-error - Testing undefined value
          optionalField: undefined,
        },
      });

      const prepared = prepareReportForJSON(reportWithUndefined, {
        excludeUndefinedValues: true,
      });

      const jsonString = JSON.stringify(prepared);
      expect(jsonString).not.toContain('optionalField');
    });

    it('should remove both null and undefined when both options enabled', () => {
      const reportWithBoth = createMockReportData({
        recommendations: [
          {
            ...mockReport.recommendations[0],
            estimatedCost: null,
            // @ts-expect-error - Testing undefined value
            optionalField: undefined,
          },
        ],
      });

      const prepared = prepareReportForJSON(reportWithBoth, {
        excludeNullValues: true,
        excludeUndefinedValues: true,
      });

      const rec = prepared.recommendations?.[0];
      expect('estimatedCost' in rec!).toBe(false);
      expect('optionalField' in rec!).toBe(false);
    });

    it('should handle nested null values', () => {
      const reportNestedNulls = createMockReportData({
        riskAnalysis: {
          ...mockReport.riskAnalysis,
          earthquake: {
            ...mockReport.riskAnalysis.earthquake,
            insuranceRecommendation: null,
            estimatedInsuranceCost: null,
          },
        },
      });

      const prepared = prepareReportForJSON(reportNestedNulls, {
        excludeNullValues: true,
      });

      const earthquake = prepared.riskAnalysis?.earthquake;
      expect('insuranceRecommendation' in earthquake!).toBe(false);
      expect('estimatedInsuranceCost' in earthquake!).toBe(false);
    });

    it('should handle arrays with null values', () => {
      const reportArrayNulls = createMockReportData({
        riskAnalysis: {
          ...mockReport.riskAnalysis,
          recommendations: ['Item 1', null, 'Item 2', null],
        },
      });

      const prepared = prepareReportForJSON(reportArrayNulls, {
        excludeNullValues: true,
      });

      const recommendations = prepared.riskAnalysis?.recommendations;
      expect(recommendations).toEqual(['Item 1', 'Item 2']);
    });
  });
});

// ============================================
// JSON Conversion Tests
// ============================================

describe('convertReportToJSON', () => {
  let mockReport: PropertyReportData;

  beforeEach(() => {
    mockReport = createMockReportData();
  });

  describe('basic conversion', () => {
    it('should convert report to JSON string', () => {
      const json = convertReportToJSON(mockReport);

      expect(json).toBeDefined();
      expect(typeof json).toBe('string');
      expect(json.length).toBeGreaterThan(0);
    });

    it('should produce valid JSON', () => {
      const json = convertReportToJSON(mockReport);

      expect(() => JSON.parse(json)).not.toThrow();
    });

    it('should preserve all data when parsed back', () => {
      const json = convertReportToJSON(mockReport);
      const parsed = JSON.parse(json);

      expect(parsed.property.address).toBe('123 Main St, Blair, PA 16001');
      expect(parsed.scoreBreakdown.totalScore).toBe(95.5);
      expect(parsed.costAnalysis.totalCosts).toBe(104500);
    });

    it('should include all sections by default', () => {
      const json = convertReportToJSON(mockReport);
      const parsed = JSON.parse(json);

      expect(parsed.property).toBeDefined();
      expect(parsed.scoreBreakdown).toBeDefined();
      expect(parsed.costAnalysis).toBeDefined();
      expect(parsed.roiAnalysis).toBeDefined();
      expect(parsed.riskAnalysis).toBeDefined();
      expect(parsed.comparables).toBeDefined();
      expect(parsed.recommendations).toBeDefined();
      expect(parsed.metadata).toBeDefined();
    });
  });

  describe('pretty printing', () => {
    it('should pretty-print by default', () => {
      const json = convertReportToJSON(mockReport);

      // Pretty-printed JSON should have newlines and indentation
      expect(json).toContain('\n');
      expect(json).toContain('  ');
    });

    it('should use 2-space indentation by default', () => {
      const json = convertReportToJSON(mockReport);

      // Check for 2-space indentation pattern
      const lines = json.split('\n');
      const indentedLine = lines.find(line => line.startsWith('  "property"'));
      expect(indentedLine).toBeDefined();
    });

    it('should respect custom indent spaces', () => {
      const json = convertReportToJSON(mockReport, { indentSpaces: 4 });

      // Check for 4-space indentation
      const lines = json.split('\n');
      const indentedLine = lines.find(line => line.startsWith('    "property"'));
      expect(indentedLine).toBeDefined();
    });

    it('should produce compact JSON when prettyPrint is false', () => {
      const json = convertReportToJSON(mockReport, { prettyPrint: false });

      // Compact JSON should be single line (no formatting newlines)
      const lines = json.split('\n');
      expect(lines.length).toBe(1);
    });

    it('should be smaller when not pretty-printed', () => {
      const prettyJson = convertReportToJSON(mockReport, { prettyPrint: true });
      const compactJson = convertReportToJSON(mockReport, { prettyPrint: false });

      expect(compactJson.length).toBeLessThan(prettyJson.length);
    });
  });

  describe('section filtering', () => {
    it('should exclude property info when disabled', () => {
      const json = convertReportToJSON(mockReport, {
        includePropertyInfo: false,
      });
      const parsed = JSON.parse(json);

      expect(parsed.property).toBeUndefined();
    });

    it('should exclude scores when disabled', () => {
      const json = convertReportToJSON(mockReport, {
        includeScores: false,
      });
      const parsed = JSON.parse(json);

      expect(parsed.scoreBreakdown).toBeUndefined();
    });

    it('should exclude multiple sections when disabled', () => {
      const json = convertReportToJSON(mockReport, {
        includePropertyInfo: false,
        includeScores: false,
        includeCosts: false,
      });
      const parsed = JSON.parse(json);

      expect(parsed.property).toBeUndefined();
      expect(parsed.scoreBreakdown).toBeUndefined();
      expect(parsed.costAnalysis).toBeUndefined();
      expect(parsed.roiAnalysis).toBeDefined();
    });
  });

  describe('null/undefined handling', () => {
    it('should exclude null values when requested', () => {
      const reportWithNulls = createMockReportData({
        recommendations: [
          {
            ...mockReport.recommendations[0],
            estimatedCost: null,
          },
        ],
      });

      const json = convertReportToJSON(reportWithNulls, {
        excludeNullValues: true,
      });
      const parsed = JSON.parse(json);

      expect('estimatedCost' in parsed.recommendations[0]).toBe(false);
    });

    it('should keep null values by default', () => {
      const reportWithNulls = createMockReportData({
        recommendations: [
          {
            ...mockReport.recommendations[0],
            estimatedCost: null,
          },
        ],
      });

      const json = convertReportToJSON(reportWithNulls);
      const parsed = JSON.parse(json);

      expect(parsed.recommendations[0].estimatedCost).toBeNull();
    });
  });

  describe('edge cases', () => {
    it('should handle empty arrays', () => {
      const reportEmptyArrays = createMockReportData({
        recommendations: [],
        comparables: {
          ...mockReport.comparables,
          comparables: [],
        },
      });

      const json = convertReportToJSON(reportEmptyArrays);
      const parsed = JSON.parse(json);

      expect(parsed.recommendations).toEqual([]);
      expect(parsed.comparables.comparables).toEqual([]);
    });

    it('should handle special characters in strings', () => {
      const reportSpecialChars = createMockReportData({
        property: {
          ...mockReport.property,
          address: '123 "Main" St, O\'Brien\'s Place, City & State',
        },
      });

      const json = convertReportToJSON(reportSpecialChars);
      const parsed = JSON.parse(json);

      expect(parsed.property.address).toBe('123 "Main" St, O\'Brien\'s Place, City & State');
    });

    it('should handle unicode characters', () => {
      const reportUnicode = createMockReportData({
        property: {
          ...mockReport.property,
          address: '123 Café Rd, São Paulo, 日本',
        },
      });

      const json = convertReportToJSON(reportUnicode);
      const parsed = JSON.parse(json);

      expect(parsed.property.address).toBe('123 Café Rd, São Paulo, 日本');
    });

    it('should handle very large numbers', () => {
      const reportLargeNumbers = createMockReportData({
        costAnalysis: {
          ...mockReport.costAnalysis,
          totalCosts: 999999999,
        },
      });

      const json = convertReportToJSON(reportLargeNumbers);
      const parsed = JSON.parse(json);

      expect(parsed.costAnalysis.totalCosts).toBe(999999999);
    });

    it('should handle deeply nested objects', () => {
      const json = convertReportToJSON(mockReport);
      const parsed = JSON.parse(json);

      expect(parsed.riskAnalysis.flood.findings[0]).toBe('Zone X - Minimal flood risk');
    });
  });
});

// ============================================
// Blob Export Tests
// ============================================

describe('exportReportToJSONBlob', () => {
  let mockReport: PropertyReportData;

  beforeEach(() => {
    mockReport = createMockReportData();
  });

  it('should return a Blob', async () => {
    const blob = await exportReportToJSONBlob(mockReport);
    expect(blob).toBeInstanceOf(Blob);
  });

  it('should have correct MIME type', async () => {
    const blob = await exportReportToJSONBlob(mockReport);
    expect(blob.type).toBe('application/json;charset=utf-8;');
  });

  it('should contain JSON content', async () => {
    const blob = await exportReportToJSONBlob(mockReport);
    const text = await blob.text();

    expect(() => JSON.parse(text)).not.toThrow();
  });

  it('should include all data in blob', async () => {
    const blob = await exportReportToJSONBlob(mockReport);
    const text = await blob.text();
    const parsed = JSON.parse(text);

    expect(parsed.property.address).toBe('123 Main St, Blair, PA 16001');
    expect(parsed.scoreBreakdown.totalScore).toBe(95.5);
  });

  it('should respect custom options', async () => {
    const blob = await exportReportToJSONBlob(mockReport, {
      prettyPrint: false,
      includeScores: false,
    });
    const text = await blob.text();

    expect(text.split('\n').length).toBe(1);
    expect(text).not.toContain('scoreBreakdown');
  });

  it('should create blob with pretty-printed JSON by default', async () => {
    const blob = await exportReportToJSONBlob(mockReport);
    const text = await blob.text();

    expect(text).toContain('\n');
    expect(text).toContain('  ');
  });

  it('should handle section filtering in blob', async () => {
    const blob = await exportReportToJSONBlob(mockReport, {
      includePropertyInfo: false,
      includeCosts: false,
    });
    const text = await blob.text();
    const parsed = JSON.parse(text);

    expect(parsed.property).toBeUndefined();
    expect(parsed.costAnalysis).toBeUndefined();
    expect(parsed.roiAnalysis).toBeDefined();
  });
});

// ============================================
// Browser Export Tests
// ============================================

describe('exportReportToJSON', () => {
  let mockReport: PropertyReportData;
  let originalWindow: typeof window | undefined;
  let originalDocument: typeof document | undefined;

  beforeEach(() => {
    mockReport = createMockReportData();
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);

    // Save originals
    originalWindow = global.window;
    originalDocument = global.document;

    // Mock browser APIs
    global.URL = {
      ...global.URL,
      createObjectURL: vi.fn(() => 'blob:mock-url'),
      revokeObjectURL: vi.fn(),
    } as unknown as typeof URL;

    // Mock document methods
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
    };

    const mockBody = {
      appendChild: vi.fn(),
      removeChild: vi.fn(),
    };

    // @ts-expect-error - Mocking window for testing
    global.window = {};

    // @ts-expect-error - Mocking document for testing
    global.document = {
      createElement: vi.fn(() => mockLink as unknown as HTMLElement),
      body: mockBody,
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();

    // Restore originals
    if (originalWindow === undefined) {
      // @ts-expect-error - Restoring original undefined state
      delete global.window;
    } else {
      global.window = originalWindow;
    }

    if (originalDocument === undefined) {
      // @ts-expect-error - Restoring original undefined state
      delete global.document;
    } else {
      global.document = originalDocument;
    }
  });

  it('should throw error if not in browser environment', async () => {
    const originalWindow = global.window;
    const originalDocument = global.document;

    // @ts-expect-error - Testing undefined window
    global.window = undefined;
    // @ts-expect-error - Testing undefined document
    global.document = undefined;

    await expect(exportReportToJSON(mockReport)).rejects.toThrow(
      'JSON export is only available in browser environment'
    );

    global.window = originalWindow;
    global.document = originalDocument;
  });

  it('should create and trigger download link', async () => {
    await exportReportToJSON(mockReport);

    expect(global.document.createElement).toHaveBeenCalledWith('a');
    expect(global.document.body.appendChild).toHaveBeenCalled();
    expect(global.document.body.removeChild).toHaveBeenCalled();
  });

  it('should use auto-generated filename by default', async () => {
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
    };

    // @ts-expect-error - Mocking document
    global.document.createElement = vi.fn(() => mockLink as unknown as HTMLElement);

    await exportReportToJSON(mockReport);

    expect(mockLink.download).toBe(
      'property-report-123-main-st-blair-pa-16001-2026-01-22.json'
    );
  });

  it('should use custom filename when provided', async () => {
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
    };

    // @ts-expect-error - Mocking document
    global.document.createElement = vi.fn(() => mockLink as unknown as HTMLElement);

    await exportReportToJSON(mockReport, 'custom-report.json');

    expect(mockLink.download).toBe('custom-report.json');
  });

  it('should use filename from options', async () => {
    const mockLink = {
      href: '',
      download: '',
      click: vi.fn(),
    };

    // @ts-expect-error - Mocking document
    global.document.createElement = vi.fn(() => mockLink as unknown as HTMLElement);

    await exportReportToJSON(mockReport, undefined, {
      filename: 'options-report.json',
    });

    expect(mockLink.download).toBe('options-report.json');
  });

  it('should create blob URL', async () => {
    await exportReportToJSON(mockReport);

    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });

  it('should revoke blob URL after download', async () => {
    await exportReportToJSON(mockReport);

    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('should respect export options', async () => {
    const options: JSONExportOptions = {
      prettyPrint: false,
      includeScores: false,
    };

    await exportReportToJSON(mockReport, undefined, options);

    expect(global.document.createElement).toHaveBeenCalled();
  });
});

// ============================================
// Integration Tests
// ============================================

describe('integration tests', () => {
  let mockReport: PropertyReportData;

  beforeEach(() => {
    mockReport = createMockReportData();
  });

  it('should handle complete workflow from data to blob', async () => {
    const blob = await exportReportToJSONBlob(mockReport);
    const text = await blob.text();
    const parsed = JSON.parse(text);

    expect(parsed.property.address).toBe('123 Main St, Blair, PA 16001');
    expect(parsed.scoreBreakdown.totalScore).toBe(95.5);
    expect(parsed.scoreBreakdown.gradeResult.gradeWithModifier).toBe('A+');
    expect(parsed.costAnalysis.totalCosts).toBe(104500);
    expect(parsed.roiAnalysis.roiPercentage).toBe(43.5);
  });

  it('should produce consistent output for same input', () => {
    const json1 = convertReportToJSON(mockReport);
    const json2 = convertReportToJSON(mockReport);

    expect(json1).toBe(json2);
  });

  it('should handle minimal report data', () => {
    const minimalReport = createMockReportData({
      recommendations: [],
      comparables: {
        ...mockReport.comparables,
        comparables: [],
      },
    });

    const json = convertReportToJSON(minimalReport);
    const parsed = JSON.parse(json);

    expect(parsed).toBeDefined();
    expect(parsed.property).toBeDefined();
    expect(parsed.recommendations).toEqual([]);
    expect(parsed.comparables.comparables).toEqual([]);
  });

  it('should handle partial export with selected sections', async () => {
    const blob = await exportReportToJSONBlob(mockReport, {
      includePropertyInfo: true,
      includeScores: true,
      includeCosts: false,
      includeROI: false,
      includeRiskAnalysis: false,
      includeComparables: false,
      includeRecommendations: false,
      includeMetadata: true,
    });

    const text = await blob.text();
    const parsed = JSON.parse(text);

    expect(parsed.property).toBeDefined();
    expect(parsed.scoreBreakdown).toBeDefined();
    expect(parsed.metadata).toBeDefined();
    expect(parsed.costAnalysis).toBeUndefined();
    expect(parsed.roiAnalysis).toBeUndefined();
    expect(parsed.riskAnalysis).toBeUndefined();
  });

  it('should roundtrip data through JSON', async () => {
    const blob = await exportReportToJSONBlob(mockReport);
    const text = await blob.text();
    const parsed = JSON.parse(text);
    const reExported = convertReportToJSON(parsed as PropertyReportData);
    const reParsed = JSON.parse(reExported);

    expect(reParsed.property.address).toBe(mockReport.property.address);
    expect(reParsed.scoreBreakdown.totalScore).toBe(mockReport.scoreBreakdown.totalScore);
  });
});

// ============================================
// Performance Tests
// ============================================

describe('performance', () => {
  let mockReport: PropertyReportData;

  beforeEach(() => {
    mockReport = createMockReportData();
  });

  it('should convert report to JSON in under 50ms', () => {
    const start = performance.now();
    convertReportToJSON(mockReport);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(50);
  });

  it('should generate blob efficiently', async () => {
    const start = performance.now();
    await exportReportToJSONBlob(mockReport);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(100);
  });

  it('should handle large comparables array efficiently', () => {
    const largeComparables = Array.from({ length: 50 }, (_, i) => ({
      address: `${i} Test St`,
      salePrice: 150000,
      saleDate: new Date('2025-12-01'),
      pricePerSqFt: 100,
      squareFeet: 1500,
      bedrooms: 3,
      bathrooms: 2,
      yearBuilt: 2000,
      distanceMiles: 0.5,
      daysSinceSale: 30,
      similarityScore: 90,
      adjustments: [],
      adjustedPrice: 150000,
    }));

    const reportLargeComps = createMockReportData({
      comparables: {
        ...mockReport.comparables,
        comparables: largeComparables,
      },
    });

    const start = performance.now();
    convertReportToJSON(reportLargeComps);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(100);
  });

  it('should handle compact JSON faster than pretty-printed', () => {
    const startCompact = performance.now();
    convertReportToJSON(mockReport, { prettyPrint: false });
    const compactDuration = performance.now() - startCompact;

    const startPretty = performance.now();
    convertReportToJSON(mockReport, { prettyPrint: true });
    const prettyDuration = performance.now() - startPretty;

    expect(compactDuration).toBeLessThanOrEqual(prettyDuration);
  });
});
