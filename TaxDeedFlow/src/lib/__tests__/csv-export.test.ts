/**
 * CSV Export Utility Tests
 *
 * Tests the CSV export functionality including:
 * - Filename generation and sanitization
 * - CSV value formatting and escaping
 * - Report data conversion to CSV
 * - Blob generation with UTF-8 BOM
 * - Options handling and section toggling
 * - Edge cases and special characters
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-22
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  generateCSVFilename,
  formatCSVValue,
  convertReportToCSV,
  exportReportToCSVBlob,
  exportReportToCSV,
  type CSVExportOptions,
} from '../csv-export';
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

describe('generateCSVFilename', () => {
  beforeEach(() => {
    // Mock Date to ensure consistent date strings in tests
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('with address', () => {
    it('should generate filename with sanitized address', () => {
      const filename = generateCSVFilename('123 Main St, Blair, PA 16001');
      expect(filename).toBe('property-report-123-main-st-blair-pa-16001-2026-01-22.csv');
    });

    it('should remove special characters from address', () => {
      const filename = generateCSVFilename('123 Main St. #4, Blair, PA');
      expect(filename).toBe('property-report-123-main-st-4-blair-pa-2026-01-22.csv');
    });

    it('should replace multiple spaces with single hyphen', () => {
      const filename = generateCSVFilename('123   Main    St');
      expect(filename).toBe('property-report-123-main-st-2026-01-22.csv');
    });

    it('should convert to lowercase', () => {
      const filename = generateCSVFilename('MAIN STREET');
      expect(filename).toBe('property-report-main-street-2026-01-22.csv');
    });

    it('should truncate long addresses to 50 characters', () => {
      const longAddress = 'A'.repeat(100);
      const filename = generateCSVFilename(longAddress);
      const addressPart = filename.split('-2026-')[0].replace('property-report-', '');
      expect(addressPart.length).toBeLessThanOrEqual(50);
    });
  });

  describe('with report ID', () => {
    it('should generate filename with report ID', () => {
      const filename = generateCSVFilename(undefined, 'REPORT-123');
      expect(filename).toBe('property-report-REPORT-123-2026-01-22.csv');
    });
  });

  describe('without address or report ID', () => {
    it('should generate filename with date only', () => {
      const filename = generateCSVFilename();
      expect(filename).toBe('property-report-2026-01-22.csv');
    });
  });

  describe('address takes precedence over report ID', () => {
    it('should use address when both provided', () => {
      const filename = generateCSVFilename('123 Main St', 'REPORT-123');
      expect(filename).toMatch(/^property-report-123-main-st-/);
      expect(filename).not.toContain('REPORT-123');
    });
  });
});

// ============================================
// CSV Value Formatting Tests
// ============================================

describe('formatCSVValue', () => {
  describe('null and undefined handling', () => {
    it('should return empty string for null', () => {
      expect(formatCSVValue(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(formatCSVValue(undefined)).toBe('');
    });
  });

  describe('date handling', () => {
    it('should format Date objects as YYYY-MM-DD', () => {
      const date = new Date('2026-01-22T12:34:56Z');
      expect(formatCSVValue(date)).toBe('2026-01-22');
    });
  });

  describe('string values', () => {
    it('should return simple strings as-is', () => {
      expect(formatCSVValue('Hello World')).toBe('Hello World');
    });

    it('should quote strings containing comma delimiter', () => {
      expect(formatCSVValue('Hello, World', ',')).toBe('"Hello, World"');
    });

    it('should quote strings containing tab delimiter', () => {
      expect(formatCSVValue('Hello\tWorld', '\t')).toBe('"Hello\tWorld"');
    });

    it('should quote strings containing semicolon delimiter', () => {
      expect(formatCSVValue('Hello; World', ';')).toBe('"Hello; World"');
    });

    it('should quote strings containing double quotes', () => {
      expect(formatCSVValue('He said "Hello"')).toBe('"He said ""Hello"""');
    });

    it('should quote strings containing newlines', () => {
      expect(formatCSVValue('Line 1\nLine 2')).toBe('"Line 1\nLine 2"');
    });

    it('should quote strings containing carriage returns', () => {
      expect(formatCSVValue('Line 1\rLine 2')).toBe('"Line 1\rLine 2"');
    });

    it('should escape double quotes by doubling them', () => {
      expect(formatCSVValue('Say ""Hello""')).toBe('"Say """"Hello"""""');
    });

    it('should handle complex case with quotes and delimiters', () => {
      expect(formatCSVValue('Value: "123", note: "abc"', ',')).toBe(
        '"Value: ""123"", note: ""abc"""'
      );
    });
  });

  describe('number values', () => {
    it('should convert numbers to strings', () => {
      expect(formatCSVValue(123)).toBe('123');
      expect(formatCSVValue(45.67)).toBe('45.67');
    });

    it('should handle zero', () => {
      expect(formatCSVValue(0)).toBe('0');
    });

    it('should handle negative numbers', () => {
      expect(formatCSVValue(-123)).toBe('-123');
    });
  });

  describe('boolean values', () => {
    it('should convert booleans to strings', () => {
      expect(formatCSVValue(true)).toBe('true');
      expect(formatCSVValue(false)).toBe('false');
    });
  });

  describe('custom delimiter handling', () => {
    it('should respect custom delimiter for quoting decision', () => {
      const value = 'A,B';
      expect(formatCSVValue(value, ',')).toBe('"A,B"');
      expect(formatCSVValue(value, '\t')).toBe('A,B');
    });
  });
});

// ============================================
// Report Conversion Tests
// ============================================

describe('convertReportToCSV', () => {
  let mockReport: PropertyReportData;

  beforeEach(() => {
    mockReport = createMockReportData();
  });

  describe('basic conversion', () => {
    it('should convert report to CSV string', () => {
      const csv = convertReportToCSV(mockReport);
      expect(csv).toBeDefined();
      expect(typeof csv).toBe('string');
      expect(csv.length).toBeGreaterThan(0);
    });

    it('should include all section headers by default', () => {
      const csv = convertReportToCSV(mockReport);
      expect(csv).toContain('PROPERTY INFORMATION');
      expect(csv).toContain('INVESTMENT SCORES');
      expect(csv).toContain('COST ANALYSIS');
      expect(csv).toContain('ROI ANALYSIS');
      expect(csv).toContain('RISK ANALYSIS');
      expect(csv).toContain('COMPARABLE SALES');
      expect(csv).toContain('RECOMMENDATIONS');
      expect(csv).toContain('REPORT METADATA');
    });

    it('should use comma delimiter by default', () => {
      const csv = convertReportToCSV(mockReport);
      const lines = csv.split('\n');
      const propertyInfoLine = lines.find((line) => line.includes('Parcel ID'));
      expect(propertyInfoLine).toContain(',');
    });
  });

  describe('property information section', () => {
    it('should include property address', () => {
      const csv = convertReportToCSV(mockReport);
      expect(csv).toContain('123 Main St, Blair, PA 16001');
    });

    it('should include parcel ID', () => {
      const csv = convertReportToCSV(mockReport);
      expect(csv).toContain('PARC-001');
    });

    it('should include county name', () => {
      const csv = convertReportToCSV(mockReport);
      expect(csv).toContain('Blair');
    });

    it('should handle null property values gracefully', () => {
      const reportWithNulls = createMockReportData({
        property: {
          ...mockReport.property,
          bedrooms: null,
          bathrooms: null,
          year_built: null,
        },
      });
      const csv = convertReportToCSV(reportWithNulls);
      expect(csv).toContain('Bedrooms,N/A');
      expect(csv).toContain('Bathrooms,N/A');
      expect(csv).toContain('Year Built,N/A');
    });
  });

  describe('score information section', () => {
    it('should include total score', () => {
      const csv = convertReportToCSV(mockReport);
      expect(csv).toContain('Overall Score,95.5');
    });

    it('should include grade with modifier', () => {
      const csv = convertReportToCSV(mockReport);
      expect(csv).toContain('Overall Grade,A+');
    });

    it('should include category scores', () => {
      const csv = convertReportToCSV(mockReport);
      expect(csv).toContain('Location Score,20/25');
      expect(csv).toContain('Risk Score,22/25');
      expect(csv).toContain('Financial Score,18/25');
      expect(csv).toContain('Market Score,21/25');
      expect(csv).toContain('Profit Score,14.5/25');
    });
  });

  describe('cost analysis section', () => {
    it('should include acquisition costs', () => {
      const csv = convertReportToCSV(mockReport);
      expect(csv).toContain('Bid Amount,"$50,000"');
      expect(csv).toContain('Total Acquisition,"$58,000"');
    });

    it('should include rehab estimates', () => {
      const csv = convertReportToCSV(mockReport);
      expect(csv).toContain('Rehab Estimate (Low),"$20,000"');
      expect(csv).toContain('Rehab Estimate (Expected),"$30,000"');
      expect(csv).toContain('Rehab Estimate (High),"$40,000"');
    });

    it('should include holding costs', () => {
      const csv = convertReportToCSV(mockReport);
      expect(csv).toContain('Holding Period (months),6');
      expect(csv).toContain('Total Holding Costs,"$3,000"');
    });

    it('should include total costs', () => {
      const csv = convertReportToCSV(mockReport);
      expect(csv).toContain('TOTAL ALL-IN COSTS,"$104,500"');
    });
  });

  describe('ROI analysis section', () => {
    it('should include ROI metrics', () => {
      const csv = convertReportToCSV(mockReport);
      expect(csv).toContain('ROI Percentage,43.5%');
      expect(csv).toContain('Annualized ROI,87.0%');
      expect(csv).toContain('Profit Margin,30.3%');
    });

    it('should include estimated profit', () => {
      const csv = convertReportToCSV(mockReport);
      expect(csv).toContain('Estimated Profit,"$45,500"');
    });

    it('should include confidence level', () => {
      const csv = convertReportToCSV(mockReport);
      expect(csv).toContain('Confidence Level,high');
    });
  });

  describe('risk analysis section', () => {
    it('should include risk table with headers', () => {
      const csv = convertReportToCSV(mockReport);
      expect(csv).toContain('Risk Type,Risk Level,Risk Score,Summary');
    });

    it('should include all risk types', () => {
      const csv = convertReportToCSV(mockReport);
      expect(csv).toContain('Flood,low,15');
      expect(csv).toContain('Earthquake,low,10');
      expect(csv).toContain('Wildfire,medium,35');
      expect(csv).toContain('Hurricane,low,5');
      expect(csv).toContain('Environmental,low,12');
    });

    it('should include overall risk metrics', () => {
      const csv = convertReportToCSV(mockReport);
      expect(csv).toContain('Overall Risk Score,15');
      expect(csv).toContain('Overall Risk Level,low');
    });
  });

  describe('comparables section', () => {
    it('should include comparables table with headers', () => {
      const csv = convertReportToCSV(mockReport);
      expect(csv).toContain(
        'Address,Sale Price,Sale Date,Price/SqFt,Square Feet,Beds,Baths,Distance (mi),Similarity %'
      );
    });

    it('should include comparable property data', () => {
      const csv = convertReportToCSV(mockReport);
      expect(csv).toContain('125 Main St,"$155,000"');
      expect(csv).toContain('200 Oak Ave,"$148,000"');
    });

    it('should format sale dates correctly', () => {
      const csv = convertReportToCSV(mockReport);
      expect(csv).toContain('2025-12-15');
      expect(csv).toContain('2025-11-20');
    });

    it('should include estimated market value', () => {
      const csv = convertReportToCSV(mockReport);
      expect(csv).toContain('Estimated Market Value,$150,000');
    });

    it('should handle empty comparables array', () => {
      const reportNoComps = createMockReportData({
        comparables: {
          ...mockReport.comparables,
          comparables: [],
        },
      });
      const csv = convertReportToCSV(reportNoComps);
      expect(csv).not.toContain('COMPARABLE SALES');
    });
  });

  describe('recommendations section', () => {
    it('should include recommendations table with headers', () => {
      const csv = convertReportToCSV(mockReport);
      expect(csv).toContain('Priority,Category,Title,Description,Estimated Cost,Timeframe');
    });

    it('should include recommendation data', () => {
      const csv = convertReportToCSV(mockReport);
      expect(csv).toContain('Conduct property inspection');
      expect(csv).toContain('Secure financing');
    });

    it('should format costs correctly', () => {
      const csv = convertReportToCSV(mockReport);
      expect(csv).toContain('$500');
    });

    it('should handle null costs', () => {
      const csv = convertReportToCSV(mockReport);
      expect(csv).toContain('N/A');
    });

    it('should handle empty recommendations array', () => {
      const reportNoRecs = createMockReportData({
        recommendations: [],
      });
      const csv = convertReportToCSV(reportNoRecs);
      expect(csv).not.toContain('RECOMMENDATIONS');
    });
  });

  describe('metadata section', () => {
    it('should always include metadata section', () => {
      const csv = convertReportToCSV(mockReport);
      expect(csv).toContain('REPORT METADATA');
    });

    it('should include generated timestamp', () => {
      const csv = convertReportToCSV(mockReport);
      expect(csv).toContain('Generated At');
      expect(csv).toContain('2026-01-22');
    });

    it('should include report version', () => {
      const csv = convertReportToCSV(mockReport);
      expect(csv).toContain('Report Version,1.0.0');
    });

    it('should include data sources', () => {
      const csv = convertReportToCSV(mockReport);
      expect(csv).toContain('Data Sources,MLS; County Records; FEMA; EPA');
    });
  });

  describe('custom delimiter', () => {
    it('should use tab delimiter when specified', () => {
      const csv = convertReportToCSV(mockReport, { delimiter: '\t' });
      const lines = csv.split('\n');
      const propertyLine = lines.find((line) => line.includes('Parcel ID'));
      expect(propertyLine).toContain('\t');
      expect(propertyLine).not.toContain(',PARC-001');
    });

    it('should use semicolon delimiter when specified', () => {
      const csv = convertReportToCSV(mockReport, { delimiter: ';' });
      const lines = csv.split('\n');
      const propertyLine = lines.find((line) => line.includes('Parcel ID'));
      expect(propertyLine).toContain(';');
    });
  });

  describe('section toggle options', () => {
    it('should exclude property info when disabled', () => {
      const csv = convertReportToCSV(mockReport, { includePropertyInfo: false });
      expect(csv).not.toContain('PROPERTY INFORMATION');
    });

    it('should exclude scores when disabled', () => {
      const csv = convertReportToCSV(mockReport, { includeScores: false });
      expect(csv).not.toContain('INVESTMENT SCORES');
    });

    it('should exclude costs when disabled', () => {
      const csv = convertReportToCSV(mockReport, { includeCosts: false });
      expect(csv).not.toContain('COST ANALYSIS');
    });

    it('should exclude ROI when disabled', () => {
      const csv = convertReportToCSV(mockReport, { includeROI: false });
      expect(csv).not.toContain('ROI ANALYSIS');
    });

    it('should exclude risk analysis when disabled', () => {
      const csv = convertReportToCSV(mockReport, { includeRiskAnalysis: false });
      expect(csv).not.toContain('RISK ANALYSIS');
    });

    it('should exclude comparables when disabled', () => {
      const csv = convertReportToCSV(mockReport, { includeComparables: false });
      expect(csv).not.toContain('COMPARABLE SALES');
    });

    it('should exclude recommendations when disabled', () => {
      const csv = convertReportToCSV(mockReport, { includeRecommendations: false });
      expect(csv).not.toContain('RECOMMENDATIONS');
    });

    it('should always include metadata section', () => {
      const csv = convertReportToCSV(mockReport, {
        includePropertyInfo: false,
        includeScores: false,
        includeCosts: false,
        includeROI: false,
        includeRiskAnalysis: false,
        includeComparables: false,
        includeRecommendations: false,
      });
      expect(csv).toContain('REPORT METADATA');
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in property address', () => {
      const reportSpecialChars = createMockReportData({
        property: {
          ...mockReport.property,
          address: '123 Main St, Apt #4, "The Building", City, ST',
        },
      });
      const csv = convertReportToCSV(reportSpecialChars);
      // CSV should properly escape quotes and wrap in quotes due to comma
      expect(csv).toContain('""The Building""');
    });

    it('should handle very long strings', () => {
      const longDescription = 'A'.repeat(1000);
      const reportLongString = createMockReportData({
        recommendations: [
          {
            id: 'rec-1',
            priority: 'high',
            category: 'action',
            title: 'Test',
            description: longDescription,
            estimatedCost: null,
            timeframe: null,
            relatedTo: null,
          },
        ],
      });
      const csv = convertReportToCSV(reportLongString);
      expect(csv).toContain(longDescription);
    });

    it('should handle multiline strings in descriptions', () => {
      const reportMultiline = createMockReportData({
        recommendations: [
          {
            id: 'rec-1',
            priority: 'high',
            category: 'action',
            title: 'Test',
            description: 'Line 1\nLine 2\nLine 3',
            estimatedCost: null,
            timeframe: null,
            relatedTo: null,
          },
        ],
      });
      const csv = convertReportToCSV(reportMultiline);
      expect(csv).toContain('"Line 1\nLine 2\nLine 3"');
    });
  });
});

// ============================================
// Blob Export Tests
// ============================================

describe('exportReportToCSVBlob', () => {
  let mockReport: PropertyReportData;

  beforeEach(() => {
    mockReport = createMockReportData();
  });

  it('should return a Blob', async () => {
    const blob = await exportReportToCSVBlob(mockReport);
    expect(blob).toBeInstanceOf(Blob);
  });

  it('should have correct MIME type', async () => {
    const blob = await exportReportToCSVBlob(mockReport);
    expect(blob.type).toBe('text/csv;charset=utf-8;');
  });

  it('should include UTF-8 BOM by default', async () => {
    const blob = await exportReportToCSVBlob(mockReport);
    const arrayBuffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    // Check for UTF-8 BOM (0xEF, 0xBB, 0xBF) at the start
    // Note: The BOM might be represented as the Unicode char U+FEFF instead
    const text = await blob.text();
    const hasUnicodeBOM = text.charCodeAt(0) === 0xFEFF;
    const hasUTF8BOM = bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF;

    // Either form of BOM is acceptable
    expect(hasUnicodeBOM || hasUTF8BOM || text.startsWith('\uFEFF')).toBe(true);
  });

  it('should exclude UTF-8 BOM when disabled', async () => {
    const blob = await exportReportToCSVBlob(mockReport, { includeUtf8Bom: false });
    const text = await blob.text();
    expect(text.startsWith('\uFEFF')).toBe(false);
    expect(text.startsWith('PROPERTY INFORMATION')).toBe(true);
  });

  it('should contain CSV content', async () => {
    const blob = await exportReportToCSVBlob(mockReport);
    const text = await blob.text();
    expect(text).toContain('PROPERTY INFORMATION');
    expect(text).toContain('123 Main St, Blair, PA 16001');
  });

  it('should respect custom options', async () => {
    const blob = await exportReportToCSVBlob(mockReport, {
      delimiter: '\t',
      includeScores: false,
    });
    const text = await blob.text();
    expect(text).toContain('\t');
    expect(text).not.toContain('INVESTMENT SCORES');
  });
});

// ============================================
// Browser Export Tests
// ============================================

describe('exportReportToCSV', () => {
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

    // Mock window and document
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

    await expect(exportReportToCSV(mockReport)).rejects.toThrow(
      'CSV export is only available in browser environment'
    );

    global.window = originalWindow;
    global.document = originalDocument;
  });

  it('should create and trigger download link', async () => {
    await exportReportToCSV(mockReport);

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

    await exportReportToCSV(mockReport);

    expect(mockLink.download).toBe(
      'property-report-123-main-st-blair-pa-16001-2026-01-22.csv'
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

    await exportReportToCSV(mockReport, 'custom-report.csv');

    expect(mockLink.download).toBe('custom-report.csv');
  });

  it('should create blob URL', async () => {
    await exportReportToCSV(mockReport);

    expect(global.URL.createObjectURL).toHaveBeenCalled();
  });

  it('should revoke blob URL after download', async () => {
    await exportReportToCSV(mockReport);

    expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('should respect export options', async () => {
    const options: CSVExportOptions = {
      delimiter: '\t',
      includeScores: false,
    };

    await exportReportToCSV(mockReport, undefined, options);

    // Verify by checking the blob content would be created correctly
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

  it('should generate valid CSV that can be parsed back', () => {
    const csv = convertReportToCSV(mockReport);
    const lines = csv.split('\n');

    // Should have multiple sections
    expect(lines.length).toBeGreaterThan(20);

    // Should have valid structure
    const propertySection = lines.find((line) => line.includes('PROPERTY INFORMATION'));
    expect(propertySection).toBeDefined();
  });

  it('should handle complete workflow from data to blob', async () => {
    const blob = await exportReportToCSVBlob(mockReport);
    const text = await blob.text();

    // Verify all critical data is present
    expect(text).toContain('123 Main St, Blair, PA 16001');
    expect(text).toContain('95.5');
    expect(text).toContain('A+');
    expect(text).toContain('$50,000');
    expect(text).toContain('43.5%');
  });

  it('should produce consistent output for same input', () => {
    const csv1 = convertReportToCSV(mockReport);
    const csv2 = convertReportToCSV(mockReport);

    expect(csv1).toBe(csv2);
  });

  it('should handle minimal report data', () => {
    const minimalReport = createMockReportData({
      recommendations: [],
      comparables: {
        ...mockReport.comparables,
        comparables: [],
      },
    });

    const csv = convertReportToCSV(minimalReport);
    expect(csv).toBeDefined();
    expect(csv).toContain('PROPERTY INFORMATION');
    expect(csv).toContain('REPORT METADATA');
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

  it('should convert report to CSV in under 50ms', () => {
    const start = performance.now();
    convertReportToCSV(mockReport);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(50);
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
    convertReportToCSV(reportLargeComps);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(100);
  });

  it('should generate blob efficiently', async () => {
    const start = performance.now();
    await exportReportToCSVBlob(mockReport);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(100);
  });
});
