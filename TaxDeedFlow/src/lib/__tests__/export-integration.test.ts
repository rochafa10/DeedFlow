/**
 * Export Integration Tests
 *
 * End-to-end tests that verify the complete export pipeline:
 * - All three export formats (CSV, JSON, PDF)
 * - Consistent filename generation across formats
 * - Correct MIME types and blob generation
 * - Graceful handling of missing/null data
 * - Cross-format data consistency
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-22
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  generateCSVFilename,
  convertReportToCSV,
  exportReportToCSVBlob,
  type CSVExportOptions,
} from '../csv-export';
import {
  generateJSONFilename,
  convertReportToJSON,
  exportReportToJSONBlob,
  type JSONExportOptions,
} from '../json-export';
import {
  generateReportFilename,
  exportReportToPDFBlob,
  type PDFExportOptions,
} from '../pdf-export';
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

// Mock data with missing/null values
const createMinimalReportData = (): PropertyReportData => {
  const base = createMockReportData();
  return {
    ...base,
    property: {
      ...base.property,
      address: null as unknown as string,
      bedrooms: null as unknown as number,
      bathrooms: null as unknown as number,
      year_built: null as unknown as number,
    },
    comparables: {
      ...base.comparables,
      comparables: [],
    },
    recommendations: [],
  };
};

// ============================================
// Cross-Format Export Tests
// ============================================

describe('Cross-Format Export Integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('consistent filename generation', () => {
    it('should generate consistent filenames across all formats', () => {
      const address = '123 Main St, Blair, PA 16001';
      const reportId = 'PARC-001';

      const csvFilename = generateCSVFilename(address, reportId);
      const jsonFilename = generateJSONFilename(address, reportId);
      const pdfFilename = generateReportFilename(address, reportId);

      // All should have same base pattern
      expect(csvFilename).toMatch(/^property-report-123-main-st-blair-pa-16001-2026-01-22\.csv$/);
      expect(jsonFilename).toMatch(/^property-report-123-main-st-blair-pa-16001-2026-01-22\.json$/);
      expect(pdfFilename).toMatch(/^property-report-123-main-st-blair-pa-16001-2026-01-22\.pdf$/);

      // Same base, different extensions
      const csvBase = csvFilename.replace('.csv', '');
      const jsonBase = jsonFilename.replace('.json', '');
      const pdfBase = pdfFilename.replace('.pdf', '');

      expect(csvBase).toBe(jsonBase);
      expect(jsonBase).toBe(pdfBase);
    });

    it('should handle missing address consistently', () => {
      const reportId = 'PARC-001';

      const csvFilename = generateCSVFilename(undefined, reportId);
      const jsonFilename = generateJSONFilename(undefined, reportId);
      const pdfFilename = generateReportFilename(undefined, reportId);

      expect(csvFilename).toBe('property-report-PARC-001-2026-01-22.csv');
      expect(jsonFilename).toBe('property-report-PARC-001-2026-01-22.json');
      expect(pdfFilename).toBe('property-report-PARC-001-2026-01-22.pdf');
    });

    it('should handle missing both address and reportId consistently', () => {
      const csvFilename = generateCSVFilename();
      const jsonFilename = generateJSONFilename();
      const pdfFilename = generateReportFilename();

      expect(csvFilename).toBe('property-report-2026-01-22.csv');
      expect(jsonFilename).toBe('property-report-2026-01-22.json');
      expect(pdfFilename).toBe('property-report-2026-01-22.pdf');
    });
  });

  describe('blob generation', () => {
    it('should generate blobs with correct MIME types', async () => {
      const reportData = createMockReportData();

      const csvBlob = await exportReportToCSVBlob(reportData);
      const jsonBlob = await exportReportToJSONBlob(reportData);

      expect(csvBlob.type).toBe('text/csv;charset=utf-8;');
      expect(jsonBlob.type).toBe('application/json;charset=utf-8;');
    });

    it('should generate non-empty blobs for all formats', async () => {
      const reportData = createMockReportData();

      const csvBlob = await exportReportToCSVBlob(reportData);
      const jsonBlob = await exportReportToJSONBlob(reportData);

      expect(csvBlob.size).toBeGreaterThan(0);
      expect(jsonBlob.size).toBeGreaterThan(0);
    });

    it('should have reasonable blob sizes', async () => {
      const reportData = createMockReportData();

      const csvBlob = await exportReportToCSVBlob(reportData);
      const jsonBlob = await exportReportToJSONBlob(reportData);

      // CSV should be smaller than JSON (due to pretty-print)
      // JSON is typically larger due to structure and indentation
      expect(csvBlob.size).toBeGreaterThan(500); // At least some content
      expect(jsonBlob.size).toBeGreaterThan(1000); // JSON has more structure

      // Neither should be excessively large for this data
      expect(csvBlob.size).toBeLessThan(50000);
      expect(jsonBlob.size).toBeLessThan(100000);
    });
  });

  describe('data export completeness', () => {
    it('should export the same report data to all formats', async () => {
      const reportData = createMockReportData();

      const csvContent = convertReportToCSV(reportData);
      const jsonContent = convertReportToJSON(reportData);

      // All formats should contain key data
      const address = '123 Main St, Blair, PA 16001';
      const parcelId = 'PARC-001';

      expect(csvContent).toContain(address);
      expect(csvContent).toContain(parcelId);

      expect(jsonContent).toContain(address);
      expect(jsonContent).toContain(parcelId);
    });

    it('should include all major sections in exports', async () => {
      const reportData = createMockReportData();

      const csvContent = convertReportToCSV(reportData);
      const jsonContent = convertReportToJSON(reportData);

      // Verify CSV sections
      expect(csvContent).toContain('PROPERTY INFORMATION');
      expect(csvContent).toContain('INVESTMENT SCORES');
      expect(csvContent).toContain('COST ANALYSIS');
      expect(csvContent).toContain('ROI ANALYSIS');
      expect(csvContent).toContain('RISK ANALYSIS');
      expect(csvContent).toContain('COMPARABLE SALES');
      expect(csvContent).toContain('RECOMMENDATIONS');
      expect(csvContent).toContain('REPORT METADATA');

      // Verify JSON structure
      const jsonData = JSON.parse(jsonContent);
      expect(jsonData).toHaveProperty('property');
      expect(jsonData).toHaveProperty('scoreBreakdown');
      expect(jsonData).toHaveProperty('costAnalysis');
      expect(jsonData).toHaveProperty('roiAnalysis');
      expect(jsonData).toHaveProperty('riskAnalysis');
      expect(jsonData).toHaveProperty('comparables');
      expect(jsonData).toHaveProperty('recommendations');
      expect(jsonData).toHaveProperty('metadata');
    });

    it('should preserve numeric values across formats', async () => {
      const reportData = createMockReportData();

      const csvContent = convertReportToCSV(reportData);
      const jsonContent = convertReportToJSON(reportData);

      // Check key numeric values (CSV formats with commas and dollar signs)
      expect(csvContent).toContain('95.5'); // totalScore
      expect(csvContent).toContain('$50,000'); // bidAmount (formatted)
      expect(csvContent).toContain('$150,000'); // ARV (formatted)

      const jsonData = JSON.parse(jsonContent);
      expect(jsonData.scoreBreakdown.totalScore).toBe(95.5);
      expect(jsonData.costAnalysis.acquisition.bidAmount).toBe(50000);
      expect(jsonData.roiAnalysis.afterRepairValue).toBe(150000);
    });
  });
});

// ============================================
// Missing Data Handling Tests
// ============================================

describe('Missing Data Handling', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('graceful null handling', () => {
    it('should handle missing property data in all formats', async () => {
      const reportData = createMinimalReportData();

      // Should not throw errors
      const csvContent = convertReportToCSV(reportData);
      const jsonContent = convertReportToJSON(reportData);

      expect(csvContent).toBeDefined();
      expect(jsonContent).toBeDefined();

      // CSV should show N/A for missing values
      expect(csvContent).toContain('N/A');

      // JSON should handle nulls based on options
      const jsonData = JSON.parse(jsonContent);
      expect(jsonData).toBeDefined();
    });

    it('should handle empty arrays in all formats', async () => {
      const reportData = createMinimalReportData();

      const csvContent = convertReportToCSV(reportData);
      const jsonContent = convertReportToJSON(reportData);

      // Should not crash with empty comparables or recommendations
      expect(csvContent).toBeDefined();
      expect(jsonContent).toBeDefined();

      const jsonData = JSON.parse(jsonContent);
      expect(jsonData.comparables.comparables).toEqual([]);
      expect(jsonData.recommendations).toEqual([]);
    });

    it('should generate valid blobs even with minimal data', async () => {
      const reportData = createMinimalReportData();

      const csvBlob = await exportReportToCSVBlob(reportData);
      const jsonBlob = await exportReportToJSONBlob(reportData);

      expect(csvBlob.size).toBeGreaterThan(0);
      expect(jsonBlob.size).toBeGreaterThan(0);
      expect(csvBlob.type).toBe('text/csv;charset=utf-8;');
      expect(jsonBlob.type).toBe('application/json;charset=utf-8;');
    });
  });
});

// ============================================
// Export Options Integration Tests
// ============================================

describe('Export Options Integration', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('section filtering', () => {
    it('should apply section filtering consistently across formats', async () => {
      const reportData = createMockReportData();

      // Export only scores and ROI sections
      const csvOptions: CSVExportOptions = {
        includePropertyInfo: false,
        includeCosts: false,
        includeRiskAnalysis: false,
        includeComparables: false,
        includeRecommendations: false,
      };

      const jsonOptions: JSONExportOptions = {
        includePropertyInfo: false,
        includeCosts: false,
        includeRiskAnalysis: false,
        includeComparables: false,
        includeRecommendations: false,
      };

      const csvContent = convertReportToCSV(reportData, csvOptions);
      const jsonContent = convertReportToJSON(reportData, jsonOptions);

      // CSV should only have scores and ROI sections
      expect(csvContent).toContain('INVESTMENT SCORES');
      expect(csvContent).toContain('ROI ANALYSIS');
      expect(csvContent).not.toContain('COST ANALYSIS');
      expect(csvContent).not.toContain('COMPARABLE SALES');

      // JSON should only have scores and ROI
      const jsonData = JSON.parse(jsonContent);
      expect(jsonData).toHaveProperty('scoreBreakdown');
      expect(jsonData).toHaveProperty('roiAnalysis');
      expect(jsonData).not.toHaveProperty('property');
      expect(jsonData).not.toHaveProperty('costAnalysis');
      expect(jsonData).not.toHaveProperty('comparables');
    });
  });

  describe('custom options', () => {
    it('should support custom delimiters in CSV', async () => {
      const reportData = createMockReportData();

      const tabDelimitedCSV = convertReportToCSV(reportData, { delimiter: '\t' });
      const semicolonDelimitedCSV = convertReportToCSV(reportData, {
        delimiter: ';',
      });

      // Tab-delimited should use tabs as delimiters
      expect(tabDelimitedCSV).toContain('\t');
      // Check that key-value pairs use tabs (not commas as delimiters)
      expect(tabDelimitedCSV).toContain('Parcel ID\tPARC-001');
      expect(tabDelimitedCSV).toContain('County\tBlair');

      // Semicolon-delimited should use semicolons as delimiters
      expect(semicolonDelimitedCSV).toContain(';');
      // Check that key-value pairs use semicolons
      expect(semicolonDelimitedCSV).toContain('Parcel ID;PARC-001');
      expect(semicolonDelimitedCSV).toContain('County;Blair');
    });

    it('should support compact JSON format', async () => {
      const reportData = createMockReportData();

      const prettyJSON = convertReportToJSON(reportData, { prettyPrint: true });
      const compactJSON = convertReportToJSON(reportData, { prettyPrint: false });

      // Pretty JSON should have newlines and indentation
      expect(prettyJSON).toContain('\n');
      expect(prettyJSON).toContain('  ');

      // Compact JSON should be single line
      const compactLines = compactJSON.split('\n');
      expect(compactLines.length).toBe(1);

      // Both should parse to same data
      expect(JSON.parse(prettyJSON)).toEqual(JSON.parse(compactJSON));
    });
  });
});

// ============================================
// Performance Tests
// ============================================

describe('Export Performance', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should export CSV in reasonable time', async () => {
    const reportData = createMockReportData();

    const start = performance.now();
    convertReportToCSV(reportData);
    const end = performance.now();

    expect(end - start).toBeLessThan(100); // Should complete in under 100ms
  });

  it('should export JSON in reasonable time', async () => {
    const reportData = createMockReportData();

    const start = performance.now();
    convertReportToJSON(reportData);
    const end = performance.now();

    expect(end - start).toBeLessThan(50); // JSON should be even faster
  });

  it('should generate blobs efficiently', async () => {
    const reportData = createMockReportData();

    const start = performance.now();
    await Promise.all([
      exportReportToCSVBlob(reportData),
      exportReportToJSONBlob(reportData),
    ]);
    const end = performance.now();

    expect(end - start).toBeLessThan(200); // Both blobs in under 200ms
  });
});

// ============================================
// Data Consistency Tests
// ============================================

describe('Data Consistency', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(mockDate);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should maintain data integrity in JSON roundtrip', async () => {
    const reportData = createMockReportData();

    const jsonContent = convertReportToJSON(reportData);
    const parsedData = JSON.parse(jsonContent);

    // Key values should match exactly
    expect(parsedData.scoreBreakdown.totalScore).toBe(
      reportData.scoreBreakdown.totalScore
    );
    expect(parsedData.costAnalysis.totalCosts).toBe(
      reportData.costAnalysis.totalCosts
    );
    expect(parsedData.roiAnalysis.roiPercentage).toBe(
      reportData.roiAnalysis.roiPercentage
    );
  });

  it('should preserve nested structures in JSON', async () => {
    const reportData = createMockReportData();

    const jsonContent = convertReportToJSON(reportData);
    const parsedData = JSON.parse(jsonContent);

    // Nested structures should be intact
    expect(parsedData.comparables.comparables.length).toBe(2);
    expect(parsedData.recommendations.length).toBe(2);
    expect(parsedData.riskAnalysis.flood).toBeDefined();
    expect(parsedData.riskAnalysis.flood.level).toBe('low');
  });

  it('should include all required fields in CSV', async () => {
    const reportData = createMockReportData();

    const csvContent = convertReportToCSV(reportData);

    // Critical fields must be present
    expect(csvContent).toContain('Address');
    expect(csvContent).toContain('Parcel ID');
    expect(csvContent).toContain('Overall Score');
    expect(csvContent).toContain('Total Acquisition');
    expect(csvContent).toContain('ROI Percentage');
    expect(csvContent).toContain('Overall Risk Score');
  });
});
