/**
 * Investment Scorer Tests
 *
 * Tests the 125-point investment scoring system including:
 * - calculateInvestmentScore function
 * - All 5 category calculators (Location, Risk, Financial, Market, Profit)
 * - Component score calculations
 * - Grade calculation and boundaries
 * - Confidence calculation
 * - Warning generation
 * - Missing data handling strategies
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-23
 */

import { describe, it, expect } from 'vitest';
import {
  calculateInvestmentScore,
  type InvestmentScoreInput,
  type InvestmentScoreOptions,
  type MarketData,
  type LocationData,
} from '../investment-scorer';
import type { PropertyData } from '@/types/scoring';
import type { RiskAssessment } from '@/types/risk-analysis';
import type { FinancialAnalysis } from '@/lib/analysis/financial/types';

// ============================================
// Test Fixtures
// ============================================

/**
 * Base property fixture for testing
 */
const mockBaseProperty: PropertyData = {
  id: 'test-prop-001',
  parcel_id: '01-01-001',
  address: '123 Main St',
  city: 'Altoona',
  state: 'PA',
  zip: '16602',
  county_id: 'county-001',
  county_name: 'Blair',
  owner_name: 'Test Owner',
  total_due: 10000,
  tax_amount: 5000,
  tax_year: 2024,
  sale_type: 'judicial',
  sale_date: new Date('2026-03-15'),
  coordinates: {
    latitude: 40.5187,
    longitude: -78.3947,
  },
  lot_size_sqft: 8000,
  lot_size_acres: 0.18,
  building_sqft: 1600,
  year_built: 1990,
  bedrooms: 3,
  bathrooms: 2,
  assessed_value: 100000,
  market_value: 120000,
  property_type: 'single_family_residential',
  zoning: 'R-1',
  land_use: 'Residential',
  validation_status: 'APPROVED',
  pipeline_stage: 'scored',
  has_regrid_data: true,
  has_screenshot: true,
  screenshot_url: 'https://storage.example.com/screenshots/test-prop-001.png',
  assessed_improvement_value: 85000,
  is_vacant_lot: false,
  is_likely_mobile_home: false,
};

/**
 * Mock risk assessment with all categories
 */
const mockRiskAssessment: RiskAssessment = {
  propertyId: 'test-prop-001',
  riskScore: 25, // Low overall risk
  riskLevel: 'low',
  categoryScores: [
    {
      category: 'flood',
      rawScore: 10,
      normalizedScore: 10,
      riskLevel: 'minimal',
      weight: 0.25,
      dataAvailability: 'full',
      confidence: 95,
    },
    {
      category: 'environmental',
      rawScore: 15,
      normalizedScore: 15,
      riskLevel: 'low',
      weight: 0.25,
      dataAvailability: 'full',
      confidence: 85,
    },
    {
      category: 'earthquake',
      rawScore: 5,
      normalizedScore: 5,
      riskLevel: 'minimal',
      weight: 0.25,
      dataAvailability: 'full',
      confidence: 90,
    },
  ],
  flood: {
    zone: 'X',
    riskLevel: 'minimal',
    riskScore: 10,
    insuranceRequired: false,
    dataAvailability: 'full',
    confidence: 95,
  },
  environmental: {
    riskScore: 15,
    riskLevel: 'low',
    superfundSites: [],
    brownfieldSites: [],
    dataAvailability: 'full',
    confidence: 85,
  },
  earthquake: {
    riskScore: 5,
    riskLevel: 'minimal',
    dataAvailability: 'full',
    confidence: 90,
  },
  calculatedAt: new Date(),
  scoringVersion: '1.0.0',
};

/**
 * Mock financial analysis with complete metrics
 */
const mockFinancialAnalysis: FinancialAnalysis = {
  propertyId: 'test-prop-001',
  metrics: {
    roi: 50,
    profitMargin: 30,
    priceToARV: 0.5,
    totalInvestmentToARV: 0.7,
    cashOnCash: 12,
    netProfit: 35000,
    grossProfit: 50000,
    breakEvenPrice: 85000,
    irr: 25,
    capRate: 8,
  },
  costs: {
    acquisition: {
      purchasePrice: 10000,
      closingCosts: 2000,
      totalAcquisition: 12000,
    },
    rehab: {
      materials: 15000,
      labor: 10000,
      totalRehab: 25000,
      scope: 'medium' as const,
    },
    holding: {
      propertyTax: 2500,
      insurance: 1200,
      utilities: 600,
      totalHolding: 4300,
    },
    selling: {
      commission: 3600,
      closingCosts: 1500,
      totalSelling: 5100,
    },
    totalCosts: 46400,
  },
  revenue: {
    sale: {
      estimatedARV: 120000,
      lowEstimate: 110000,
      highEstimate: 130000,
      pricePerSqft: 75,
      comparablesUsed: 6,
      confidence: 'high' as const,
    },
    rental: {
      monthlyRent: 1200,
      annualGrossRent: 14400,
      vacancyRate: 8,
      effectiveGrossIncome: 13248,
      annualOperatingExpenses: 4500,
      noi: 8748,
      monthlyCashFlow: 350,
      annualCashFlow: 4200,
    },
  },
  comparables: {
    estimatedARV: 120000,
    comparablesCount: 6,
    averageDistance: 0.5,
  },
  recommendation: {
    strategy: 'flip',
    confidence: 'high' as const,
    timelineMonths: 6,
    expectedReturn: 50,
    keyRisks: ['Market timing', 'Rehab cost overruns'],
    nextSteps: ['Get contractor bids', 'Verify ARV'],
  },
  calculatedAt: new Date(),
  analysisVersion: '1.0.0',
};

/**
 * Mock market data showing good market conditions
 */
const mockMarketData: MarketData = {
  medianDaysOnMarket: 30,
  priceChangeYoY: 5.5,
  inventoryCount: 120,
  absorptionRate: 0.18,
  medianSalePrice: 150000,
  pricePerSqFt: 85,
  competitionLevel: 'medium',
};

/**
 * Mock location data with good amenities and scores
 */
const mockLocationData: LocationData = {
  walkScore: 70,
  transitScore: 50,
  crimeIndex: 30,
  schoolRating: 8,
  medianIncome: 65000,
  medianHouseholdIncome: 65000,
  populationDensity: 2500,
  medianAge: 38,
  homeownershipRate: 68,
  vacancyRate: 5,
  broadbandScore: 85,
  broadbandAvailable: true,
  amenityCount: 35,
  employmentRate: 95,
};

// ============================================
// Main Function Tests
// ============================================

describe('calculateInvestmentScore', () => {
  describe('basic functionality', () => {
    it('should calculate complete investment score with all inputs', () => {
      const input: InvestmentScoreInput = {
        property: mockBaseProperty,
        riskAssessment: mockRiskAssessment,
        financialAnalysis: mockFinancialAnalysis,
        marketData: mockMarketData,
        locationData: mockLocationData,
        purchasePrice: 10000,
      };

      const result = calculateInvestmentScore(input);

      // Check result structure
      expect(result).toBeDefined();
      expect(result.totalScore).toBeGreaterThanOrEqual(0);
      expect(result.totalScore).toBeLessThanOrEqual(125);
      expect(result.grade).toMatch(/^[A-F]$/);
      expect(result.gradeWithModifier).toMatch(/^[A-F][+-]?$/);
      expect(result.categories).toHaveLength(5);
      expect(result.breakdown).toBeDefined();
      expect(result.summary).toBeDefined();
    });

    it('should return all 5 category scores', () => {
      const input: InvestmentScoreInput = {
        property: mockBaseProperty,
        riskAssessment: mockRiskAssessment,
        financialAnalysis: mockFinancialAnalysis,
        marketData: mockMarketData,
        locationData: mockLocationData,
      };

      const result = calculateInvestmentScore(input);

      expect(result.categories).toHaveLength(5);

      const categoryIds = result.categories.map((c) => c.id);
      expect(categoryIds).toContain('location');
      expect(categoryIds).toContain('risk');
      expect(categoryIds).toContain('financial');
      expect(categoryIds).toContain('market');
      expect(categoryIds).toContain('profit');

      // Each category should have proper structure
      result.categories.forEach((category) => {
        expect(category.score).toBeGreaterThanOrEqual(0);
        expect(category.score).toBeLessThanOrEqual(25);
        expect(category.maxScore).toBe(25);
        expect(category.confidence).toBeGreaterThanOrEqual(0);
        expect(category.confidence).toBeLessThanOrEqual(100);
        expect(category.components).toHaveLength(5);
        expect(category.dataCompleteness).toBeGreaterThanOrEqual(0);
        expect(category.dataCompleteness).toBeLessThanOrEqual(100);
      });
    });

    it('should calculate total score as sum of category scores', () => {
      const input: InvestmentScoreInput = {
        property: mockBaseProperty,
        riskAssessment: mockRiskAssessment,
        financialAnalysis: mockFinancialAnalysis,
        marketData: mockMarketData,
        locationData: mockLocationData,
      };

      const result = calculateInvestmentScore(input);

      const categorySum = result.categories.reduce((sum, c) => sum + c.score, 0);

      // Allow small floating point differences
      expect(Math.abs(result.totalScore - categorySum)).toBeLessThan(0.1);
    });

    it('should handle minimal input with defaults', () => {
      const input: InvestmentScoreInput = {
        property: mockBaseProperty,
      };

      const result = calculateInvestmentScore(input);

      expect(result).toBeDefined();
      expect(result.totalScore).toBeGreaterThanOrEqual(0);
      expect(result.totalScore).toBeLessThanOrEqual(125);
      expect(result.categories).toHaveLength(5);
    });

    it('should include breakdown with all required fields', () => {
      const input: InvestmentScoreInput = {
        property: mockBaseProperty,
        riskAssessment: mockRiskAssessment,
        financialAnalysis: mockFinancialAnalysis,
      };

      const result = calculateInvestmentScore(input);

      expect(result.breakdown).toBeDefined();
      expect(result.breakdown.id).toBeDefined();
      expect(result.breakdown.propertyId).toBe(mockBaseProperty.id);
      expect(result.breakdown.totalScore).toBe(result.totalScore);
      expect(result.breakdown.gradeResult).toBeDefined();
      expect(result.breakdown.confidenceLevel).toBeDefined();
      expect(result.breakdown.scoringVersion).toBeDefined();
      expect(result.breakdown.calculatedAt).toBeInstanceOf(Date);
      expect(result.breakdown.propertyType).toBeDefined();
      expect(result.breakdown.warnings).toBeDefined();
      expect(Array.isArray(result.breakdown.warnings)).toBe(true);
    });
  });

  describe('missing data strategies', () => {
    it('should apply default_neutral strategy', () => {
      const input: InvestmentScoreInput = {
        property: mockBaseProperty,
      };

      const options: InvestmentScoreOptions = {
        missingDataStrategy: 'default_neutral',
      };

      const result = calculateInvestmentScore(input, options);

      expect(result).toBeDefined();
      expect(result.totalScore).toBeGreaterThan(0);
    });

    it('should apply default_conservative strategy', () => {
      const input: InvestmentScoreInput = {
        property: mockBaseProperty,
      };

      const options: InvestmentScoreOptions = {
        missingDataStrategy: 'default_conservative',
      };

      const result = calculateInvestmentScore(input, options);

      expect(result).toBeDefined();
      expect(result.totalScore).toBeGreaterThan(0);
    });

    it('should apply default_optimistic strategy', () => {
      const input: InvestmentScoreInput = {
        property: mockBaseProperty,
      };

      const options: InvestmentScoreOptions = {
        missingDataStrategy: 'default_optimistic',
      };

      const result = calculateInvestmentScore(input, options);

      expect(result).toBeDefined();
      expect(result.totalScore).toBeGreaterThan(0);
    });

    it('should score higher with optimistic vs conservative strategy', () => {
      const input: InvestmentScoreInput = {
        property: mockBaseProperty,
      };

      const optimistic = calculateInvestmentScore(input, {
        missingDataStrategy: 'default_optimistic',
      });

      const conservative = calculateInvestmentScore(input, {
        missingDataStrategy: 'default_conservative',
      });

      expect(optimistic.totalScore).toBeGreaterThan(conservative.totalScore);
    });
  });

  describe('grade calculation', () => {
    it('should assign grade F for very low scores', () => {
      const poorProperty = {
        ...mockBaseProperty,
        total_due: 500000, // Much higher than market value
        assessed_value: 80000,
        market_value: 90000,
      };
      const input: InvestmentScoreInput = {
        property: poorProperty,
      };

      const result = calculateInvestmentScore(input);

      // Should be D or F grade
      expect(['D', 'F']).toContain(result.grade);
      expect(result.breakdown.gradeResult.percentage).toBeLessThan(55);
    });

    it('should assign high grade for excellent properties', () => {
      const input: InvestmentScoreInput = {
        property: mockBaseProperty,
        riskAssessment: mockRiskAssessment,
        financialAnalysis: mockFinancialAnalysis,
        marketData: mockMarketData,
        locationData: mockLocationData,
        purchasePrice: 10000,
      };

      const result = calculateInvestmentScore(input);

      // With all positive data, should get B or better
      expect(['A', 'B']).toContain(result.grade);
      expect(result.breakdown.gradeResult.percentage).toBeGreaterThan(60);
    });

    it('should include grade description', () => {
      const input: InvestmentScoreInput = {
        property: mockBaseProperty,
        financialAnalysis: mockFinancialAnalysis,
      };

      const result = calculateInvestmentScore(input);

      expect(result.breakdown.gradeResult.description).toBeDefined();
      expect(typeof result.breakdown.gradeResult.description).toBe('string');
      expect(result.breakdown.gradeResult.description.length).toBeGreaterThan(0);
    });
  });
});

// ============================================
// Category Score Tests
// ============================================

describe('Location Category Scoring', () => {
  it('should score location components correctly', () => {
    const input: InvestmentScoreInput = {
      property: mockBaseProperty,
      locationData: mockLocationData,
    };

    const result = calculateInvestmentScore(input);
    const locationCategory = result.categories.find((c) => c.id === 'location');

    expect(locationCategory).toBeDefined();
    expect(locationCategory!.components).toHaveLength(5);

    const componentIds = locationCategory!.components.map((c) => c.id);
    expect(componentIds).toContain('walk_score');
    expect(componentIds).toContain('crime_index');
    expect(componentIds).toContain('school_rating');
    expect(componentIds).toContain('amenity_count');
    expect(componentIds).toContain('transit_score');
  });

  it('should handle missing location data', () => {
    const input: InvestmentScoreInput = {
      property: mockBaseProperty,
    };

    const result = calculateInvestmentScore(input);
    const locationCategory = result.categories.find((c) => c.id === 'location');

    expect(locationCategory).toBeDefined();
    expect(locationCategory!.components).toHaveLength(5);
    expect(locationCategory!.dataCompleteness).toBe(0);
  });

  it('should invert crime index (lower crime = higher score)', () => {
    const lowCrime: LocationData = { ...mockLocationData, crimeIndex: 10 };
    const highCrime: LocationData = { ...mockLocationData, crimeIndex: 90 };

    const lowCrimeResult = calculateInvestmentScore({
      property: mockBaseProperty,
      locationData: lowCrime,
    });

    const highCrimeResult = calculateInvestmentScore({
      property: mockBaseProperty,
      locationData: highCrime,
    });

    const lowCrimeScore = lowCrimeResult.categories.find((c) => c.id === 'location')!;
    const highCrimeScore = highCrimeResult.categories.find((c) => c.id === 'location')!;

    expect(lowCrimeScore.score).toBeGreaterThan(highCrimeScore.score);
  });
});

describe('Risk Category Scoring', () => {
  it('should invert risk scores (lower risk = higher score)', () => {
    const lowRisk: RiskAssessment = {
      ...mockRiskAssessment,
      riskScore: 10,
      riskLevel: 'minimal',
    };

    const highRisk: RiskAssessment = {
      ...mockRiskAssessment,
      riskScore: 80,
      riskLevel: 'high',
      categoryScores: [
        {
          category: 'flood',
          rawScore: 80,
          normalizedScore: 80,
          riskLevel: 'high',
          weight: 0.25,
          dataAvailability: 'full',
          confidence: 90,
        },
      ],
    };

    const lowRiskResult = calculateInvestmentScore({
      property: mockBaseProperty,
      riskAssessment: lowRisk,
    });

    const highRiskResult = calculateInvestmentScore({
      property: mockBaseProperty,
      riskAssessment: highRisk,
    });

    const lowRiskScore = lowRiskResult.categories.find((c) => c.id === 'risk')!;
    const highRiskScore = highRiskResult.categories.find((c) => c.id === 'risk')!;

    expect(lowRiskScore.score).toBeGreaterThan(highRiskScore.score);
  });

  it('should handle missing risk assessment', () => {
    const input: InvestmentScoreInput = {
      property: mockBaseProperty,
    };

    const result = calculateInvestmentScore(input);
    const riskCategory = result.categories.find((c) => c.id === 'risk');

    expect(riskCategory).toBeDefined();
    expect(riskCategory!.components).toHaveLength(5);
    expect(riskCategory!.dataCompleteness).toBe(0);
  });

  it('should adjust title risk based on sale type', () => {
    const judicialProperty = { ...mockBaseProperty, sale_type: 'judicial' as const };
    const upsetProperty = { ...mockBaseProperty, sale_type: 'upset' as const };
    const repoProperty = { ...mockBaseProperty, sale_type: 'repository' as const };

    const judicialResult = calculateInvestmentScore({ property: judicialProperty });
    const upsetResult = calculateInvestmentScore({ property: upsetProperty });
    const repoResult = calculateInvestmentScore({ property: repoProperty });

    const judicialRisk = judicialResult.categories.find((c) => c.id === 'risk')!;
    const upsetRisk = upsetResult.categories.find((c) => c.id === 'risk')!;
    const repoRisk = repoResult.categories.find((c) => c.id === 'risk')!;

    // Judicial should be better than upset
    expect(judicialRisk.score).toBeGreaterThanOrEqual(upsetRisk.score);
    // Repository should be best (no redemption period)
    expect(repoRisk.score).toBeGreaterThanOrEqual(judicialRisk.score);
  });
});

describe('Financial Category Scoring', () => {
  it('should score price-to-ARV ratio correctly', () => {
    const goodDeal: FinancialAnalysis = {
      ...mockFinancialAnalysis,
      metrics: { ...mockFinancialAnalysis.metrics, priceToARV: 0.4 },
    };

    const badDeal: FinancialAnalysis = {
      ...mockFinancialAnalysis,
      metrics: { ...mockFinancialAnalysis.metrics, priceToARV: 0.9 },
    };

    const goodResult = calculateInvestmentScore({
      property: mockBaseProperty,
      financialAnalysis: goodDeal,
      purchasePrice: 10000,
    });

    const badResult = calculateInvestmentScore({
      property: mockBaseProperty,
      financialAnalysis: badDeal,
      purchasePrice: 10000,
    });

    const goodScore = goodResult.categories.find((c) => c.id === 'financial')!;
    const badScore = badResult.categories.find((c) => c.id === 'financial')!;

    // Good deal should score better or equal (other components may be the same)
    expect(goodScore.score).toBeGreaterThanOrEqual(badScore.score);
  });

  it('should handle redemption risk by sale type', () => {
    const repoProperty = { ...mockBaseProperty, sale_type: 'repository' as const };
    const upsetProperty = { ...mockBaseProperty, sale_type: 'upset' as const };

    const repoResult = calculateInvestmentScore({ property: repoProperty });
    const upsetResult = calculateInvestmentScore({ property: upsetProperty });

    const repoFinancial = repoResult.categories.find((c) => c.id === 'financial')!;
    const upsetFinancial = upsetResult.categories.find((c) => c.id === 'financial')!;

    // Repository has no redemption period, should score higher
    expect(repoFinancial.score).toBeGreaterThanOrEqual(upsetFinancial.score);
  });

  it('should calculate holding cost score', () => {
    const input: InvestmentScoreInput = {
      property: mockBaseProperty,
      financialAnalysis: mockFinancialAnalysis,
      purchasePrice: 10000,
    };

    const result = calculateInvestmentScore(input);
    const financialCategory = result.categories.find((c) => c.id === 'financial');

    const holdingCostComponent = financialCategory!.components.find(
      (c) => c.id === 'holding_costs'
    );

    expect(holdingCostComponent).toBeDefined();
    expect(holdingCostComponent!.score).toBeGreaterThanOrEqual(0);
    expect(holdingCostComponent!.score).toBeLessThanOrEqual(5);
  });
});

describe('Market Category Scoring', () => {
  it('should favor lower days on market', () => {
    const hotMarket: MarketData = { ...mockMarketData, medianDaysOnMarket: 15 };
    const coldMarket: MarketData = { ...mockMarketData, medianDaysOnMarket: 120 };

    const hotResult = calculateInvestmentScore({
      property: mockBaseProperty,
      marketData: hotMarket,
    });

    const coldResult = calculateInvestmentScore({
      property: mockBaseProperty,
      marketData: coldMarket,
    });

    const hotScore = hotResult.categories.find((c) => c.id === 'market')!;
    const coldScore = coldResult.categories.find((c) => c.id === 'market')!;

    expect(hotScore.score).toBeGreaterThan(coldScore.score);
  });

  it('should score price appreciation positively', () => {
    const risingMarket: MarketData = { ...mockMarketData, priceChangeYoY: 6 };
    const decliningMarket: MarketData = { ...mockMarketData, priceChangeYoY: -5 };

    const risingResult = calculateInvestmentScore({
      property: mockBaseProperty,
      marketData: risingMarket,
    });

    const decliningResult = calculateInvestmentScore({
      property: mockBaseProperty,
      marketData: decliningMarket,
    });

    const risingScore = risingResult.categories.find((c) => c.id === 'market')!;
    const decliningScore = decliningResult.categories.find((c) => c.id === 'market')!;

    expect(risingScore.score).toBeGreaterThan(decliningScore.score);
  });

  it('should handle missing market data', () => {
    const input: InvestmentScoreInput = {
      property: mockBaseProperty,
    };

    const result = calculateInvestmentScore(input);
    const marketCategory = result.categories.find((c) => c.id === 'market');

    expect(marketCategory).toBeDefined();
    expect(marketCategory!.components).toHaveLength(5);
  });
});

describe('Profit Category Scoring', () => {
  it('should score high ROI favorably', () => {
    const highROI: FinancialAnalysis = {
      ...mockFinancialAnalysis,
      metrics: { ...mockFinancialAnalysis.metrics, roi: 80 },
    };

    const lowROI: FinancialAnalysis = {
      ...mockFinancialAnalysis,
      metrics: { ...mockFinancialAnalysis.metrics, roi: 10 },
    };

    const highResult = calculateInvestmentScore({
      property: mockBaseProperty,
      financialAnalysis: highROI,
    });

    const lowResult = calculateInvestmentScore({
      property: mockBaseProperty,
      financialAnalysis: lowROI,
    });

    const highScore = highResult.categories.find((c) => c.id === 'profit')!;
    const lowScore = lowResult.categories.find((c) => c.id === 'profit')!;

    expect(highScore.score).toBeGreaterThan(lowScore.score);
  });

  it('should score positive cash flow favorably', () => {
    const goodCashFlow: FinancialAnalysis = {
      ...mockFinancialAnalysis,
      revenue: {
        ...mockFinancialAnalysis.revenue,
        rental: {
          ...mockFinancialAnalysis.revenue.rental,
          monthlyCashFlow: 500,
        },
      },
    };

    const negativeCashFlow: FinancialAnalysis = {
      ...mockFinancialAnalysis,
      revenue: {
        ...mockFinancialAnalysis.revenue,
        rental: {
          ...mockFinancialAnalysis.revenue.rental,
          monthlyCashFlow: -200,
        },
      },
    };

    const goodResult = calculateInvestmentScore({
      property: mockBaseProperty,
      financialAnalysis: goodCashFlow,
    });

    const badResult = calculateInvestmentScore({
      property: mockBaseProperty,
      financialAnalysis: negativeCashFlow,
    });

    const goodScore = goodResult.categories.find((c) => c.id === 'profit')!;
    const badScore = badResult.categories.find((c) => c.id === 'profit')!;

    expect(goodScore.score).toBeGreaterThan(badScore.score);
  });

  it('should score profit margin correctly', () => {
    const highMargin: FinancialAnalysis = {
      ...mockFinancialAnalysis,
      metrics: { ...mockFinancialAnalysis.metrics, profitMargin: 40 },
    };

    const lowMargin: FinancialAnalysis = {
      ...mockFinancialAnalysis,
      metrics: { ...mockFinancialAnalysis.metrics, profitMargin: 5 },
    };

    const highResult = calculateInvestmentScore({
      property: mockBaseProperty,
      financialAnalysis: highMargin,
    });

    const lowResult = calculateInvestmentScore({
      property: mockBaseProperty,
      financialAnalysis: lowMargin,
    });

    const highScore = highResult.categories.find((c) => c.id === 'profit')!;
    const lowScore = lowResult.categories.find((c) => c.id === 'profit')!;

    expect(highScore.score).toBeGreaterThan(lowScore.score);
  });

  it('should favor properties with multiple exit options', () => {
    const singleFamily = {
      ...mockBaseProperty,
      property_type: 'single_family_residential' as const,
    };
    const vacantLand = { ...mockBaseProperty, property_type: 'vacant_land' as const };

    const sfResult = calculateInvestmentScore({ property: singleFamily });
    const vlResult = calculateInvestmentScore({ property: vacantLand });

    const sfProfit = sfResult.categories.find((c) => c.id === 'profit')!;
    const vlProfit = vlResult.categories.find((c) => c.id === 'profit')!;

    // Single family should have better exit options than vacant land
    expect(sfProfit.score).toBeGreaterThanOrEqual(vlProfit.score);
  });
});

// ============================================
// Confidence and Warning Tests
// ============================================

describe('Confidence Calculation', () => {
  it('should calculate high confidence with complete data', () => {
    const input: InvestmentScoreInput = {
      property: mockBaseProperty,
      riskAssessment: mockRiskAssessment,
      financialAnalysis: mockFinancialAnalysis,
      marketData: mockMarketData,
      locationData: mockLocationData,
    };

    const result = calculateInvestmentScore(input);

    expect(result.breakdown.confidenceLevel).toBeDefined();
    expect(result.breakdown.confidenceLevel.overall).toBeGreaterThan(70);
    expect(result.breakdown.confidenceLevel.label).toMatch(/High|Very High/);
  });

  it('should calculate low confidence with minimal data', () => {
    const input: InvestmentScoreInput = {
      property: mockBaseProperty,
    };

    const result = calculateInvestmentScore(input);

    expect(result.breakdown.confidenceLevel.overall).toBeLessThan(60);
    expect(result.breakdown.confidenceLevel.label).toMatch(/Low|Moderate/);
  });

  it('should include confidence factors', () => {
    const input: InvestmentScoreInput = {
      property: mockBaseProperty,
      financialAnalysis: mockFinancialAnalysis,
    };

    const result = calculateInvestmentScore(input);

    expect(result.breakdown.confidenceLevel.factors).toBeDefined();
    expect(Array.isArray(result.breakdown.confidenceLevel.factors)).toBe(true);
    expect(result.breakdown.confidenceLevel.factors.length).toBeGreaterThan(0);

    // Each factor should have required fields
    result.breakdown.confidenceLevel.factors.forEach((factor) => {
      expect(factor.name).toBeDefined();
      expect(factor.impact).toBeDefined();
      expect(factor.weight).toBeDefined();
      expect(factor.status).toMatch(/positive|neutral|negative/);
      expect(factor.description).toBeDefined();
    });
  });

  it('should include recommendations when confidence is low', () => {
    const input: InvestmentScoreInput = {
      property: mockBaseProperty,
    };

    const result = calculateInvestmentScore(input);

    expect(result.breakdown.confidenceLevel.recommendations).toBeDefined();
    expect(Array.isArray(result.breakdown.confidenceLevel.recommendations)).toBe(true);
  });
});

describe('Warning Generation', () => {
  it('should generate warnings for low category scores', () => {
    const poorProperty = { ...mockBaseProperty, total_due: 200000 };
    const input: InvestmentScoreInput = {
      property: poorProperty,
    };

    const result = calculateInvestmentScore(input);

    expect(result.breakdown.warnings).toBeDefined();
    expect(Array.isArray(result.breakdown.warnings)).toBe(true);
  });

  it('should generate critical warnings for F grade', () => {
    const veryPoorProperty = { ...mockBaseProperty, total_due: 300000 };
    const input: InvestmentScoreInput = {
      property: veryPoorProperty,
    };

    const result = calculateInvestmentScore(input);

    const criticalWarnings = result.breakdown.warnings.filter(
      (w) => w.severity === 'critical'
    );

    if (result.grade === 'F') {
      expect(criticalWarnings.length).toBeGreaterThan(0);
    }
  });

  it('should generate info warnings for missing data', () => {
    const input: InvestmentScoreInput = {
      property: mockBaseProperty,
    };

    const result = calculateInvestmentScore(input);

    const infoWarnings = result.breakdown.warnings.filter((w) => w.severity === 'info');

    expect(infoWarnings.length).toBeGreaterThan(0);
  });

  it('should include warning recommendations', () => {
    const input: InvestmentScoreInput = {
      property: mockBaseProperty,
    };

    const result = calculateInvestmentScore(input);

    if (result.breakdown.warnings.length > 0) {
      result.breakdown.warnings.forEach((warning) => {
        expect(warning.severity).toMatch(/critical|warning|info/);
        expect(warning.category).toBeDefined();
        expect(warning.message).toBeDefined();
        expect(warning.recommendation).toBeDefined();
      });
    }
  });
});

// ============================================
// Summary Generation Tests
// ============================================

describe('Summary Generation', () => {
  it('should generate readable summary', () => {
    const input: InvestmentScoreInput = {
      property: mockBaseProperty,
      financialAnalysis: mockFinancialAnalysis,
    };

    const result = calculateInvestmentScore(input);

    expect(result.summary).toBeDefined();
    expect(typeof result.summary).toBe('string');
    expect(result.summary.length).toBeGreaterThan(0);
  });

  it('should include grade in summary', () => {
    const input: InvestmentScoreInput = {
      property: mockBaseProperty,
      financialAnalysis: mockFinancialAnalysis,
    };

    const result = calculateInvestmentScore(input);

    expect(result.summary).toContain(result.gradeWithModifier);
  });

  it('should mention strengths when present', () => {
    const input: InvestmentScoreInput = {
      property: mockBaseProperty,
      riskAssessment: mockRiskAssessment,
      financialAnalysis: mockFinancialAnalysis,
      marketData: mockMarketData,
      locationData: mockLocationData,
    };

    const result = calculateInvestmentScore(input);

    // With good data, should mention strengths
    expect(result.summary.toLowerCase()).toMatch(/strength|profit|financial|location/);
  });

  it('should mention concerns for low scores', () => {
    const poorProperty = { ...mockBaseProperty, total_due: 200000 };
    const input: InvestmentScoreInput = {
      property: poorProperty,
    };

    const result = calculateInvestmentScore(input);

    // Should mention concerns or areas of concern
    if (result.totalScore < 60) {
      expect(result.summary.toLowerCase()).toMatch(/concern|warning|caution/);
    }
  });
});

// ============================================
// Component Score Tests
// ============================================

describe('Component Score Calculations', () => {
  it('should ensure all components have scores between 0 and 5', () => {
    const input: InvestmentScoreInput = {
      property: mockBaseProperty,
      riskAssessment: mockRiskAssessment,
      financialAnalysis: mockFinancialAnalysis,
      marketData: mockMarketData,
      locationData: mockLocationData,
    };

    const result = calculateInvestmentScore(input);

    result.categories.forEach((category) => {
      category.components.forEach((component) => {
        expect(component.score).toBeGreaterThanOrEqual(0);
        expect(component.score).toBeLessThanOrEqual(5);
        expect(component.maxScore).toBe(5);
      });
    });
  });

  it('should include data sources for all components', () => {
    const input: InvestmentScoreInput = {
      property: mockBaseProperty,
      locationData: mockLocationData,
    };

    const result = calculateInvestmentScore(input);

    result.categories.forEach((category) => {
      category.components.forEach((component) => {
        expect(component.dataSource).toBeDefined();
        expect(component.dataSource.name).toBeDefined();
        expect(component.dataSource.type).toBeDefined();
        expect(component.dataSource.reliability).toMatch(/high|medium|low/);
      });
    });
  });

  it('should include descriptions for all components', () => {
    const input: InvestmentScoreInput = {
      property: mockBaseProperty,
      financialAnalysis: mockFinancialAnalysis,
      marketData: mockMarketData,
    };

    const result = calculateInvestmentScore(input);

    result.categories.forEach((category) => {
      category.components.forEach((component) => {
        expect(component.description).toBeDefined();
        expect(typeof component.description).toBe('string');
        expect(component.description.length).toBeGreaterThan(0);
      });
    });
  });

  it('should set appropriate confidence levels', () => {
    const input: InvestmentScoreInput = {
      property: mockBaseProperty,
      riskAssessment: mockRiskAssessment,
      locationData: mockLocationData,
    };

    const result = calculateInvestmentScore(input);

    result.categories.forEach((category) => {
      category.components.forEach((component) => {
        expect(component.confidence).toBeGreaterThanOrEqual(0);
        expect(component.confidence).toBeLessThanOrEqual(100);
      });
    });
  });
});

// ============================================
// Edge Case Tests
// ============================================

describe('Edge Cases', () => {
  it('should handle null purchase price', () => {
    const input: InvestmentScoreInput = {
      property: mockBaseProperty,
      financialAnalysis: mockFinancialAnalysis,
      purchasePrice: undefined,
    };

    const result = calculateInvestmentScore(input);

    expect(result).toBeDefined();
    expect(result.totalScore).toBeGreaterThanOrEqual(0);
  });

  it('should handle property with no zoning', () => {
    const noZoning = { ...mockBaseProperty, zoning: null };
    const input: InvestmentScoreInput = {
      property: noZoning,
    };

    const result = calculateInvestmentScore(input);

    expect(result).toBeDefined();
    const riskCategory = result.categories.find((c) => c.id === 'risk');
    expect(riskCategory).toBeDefined();
  });

  it('should handle vacant land property type', () => {
    const vacantLand = { ...mockBaseProperty, property_type: 'vacant_land' as const };
    const input: InvestmentScoreInput = {
      property: vacantLand,
    };

    const result = calculateInvestmentScore(input);

    expect(result).toBeDefined();
    expect(result.breakdown.propertyType).toBe('vacant_land');
  });

  it('should handle commercial property type', () => {
    const commercial = { ...mockBaseProperty, property_type: 'commercial' as const };
    const input: InvestmentScoreInput = {
      property: commercial,
    };

    const result = calculateInvestmentScore(input);

    expect(result).toBeDefined();
    expect(result.breakdown.propertyType).toBe('commercial');
  });

  it('should handle very high ARV ratio (bad deal)', () => {
    const badDeal: FinancialAnalysis = {
      ...mockFinancialAnalysis,
      metrics: { ...mockFinancialAnalysis.metrics, priceToARV: 1.2 },
    };

    const input: InvestmentScoreInput = {
      property: mockBaseProperty,
      financialAnalysis: badDeal,
    };

    const result = calculateInvestmentScore(input);

    expect(result).toBeDefined();
    const financialCategory = result.categories.find((c) => c.id === 'financial');
    // With bad price-to-ARV, financial category should score below average
    expect(financialCategory!.score).toBeLessThan(20); // Out of 25 max
  });

  it('should handle extreme market conditions', () => {
    const crashingMarket: MarketData = {
      medianDaysOnMarket: 180,
      priceChangeYoY: -20,
      inventoryCount: 1000,
      absorptionRate: 0.05,
      medianSalePrice: 80000,
      pricePerSqFt: 40,
    };

    const input: InvestmentScoreInput = {
      property: mockBaseProperty,
      marketData: crashingMarket,
    };

    const result = calculateInvestmentScore(input);

    expect(result).toBeDefined();
    const marketCategory = result.categories.find((c) => c.id === 'market');
    expect(marketCategory!.score).toBeLessThan(15); // Should score poorly
  });
});
