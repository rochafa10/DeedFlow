/**
 * ROI Calculator Tests
 *
 * Tests the ROI calculation functionality including:
 * - NPV (Net Present Value) calculation
 * - IRR (Internal Rate of Return) using Newton-Raphson method
 * - IRR using bisection method fallback
 * - Cash flow generation for flip and hold strategies
 * - ROI metrics (gross, net, annualized)
 * - Investment metrics and strategy comparisons
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-22
 */

import { describe, it, expect } from 'vitest';
import {
  calculateNPV,
  calculateNPVDerivative,
  calculateIRR,
  annualizeMonthlyIRR,
  monthlyFromAnnualIRR,
  generateFlipCashFlows,
  generateHoldCashFlows,
  calculateGrossROI,
  calculateNetROI,
  calculateAnnualizedROI,
  calculateCapRate,
  calculateCashOnCash,
  calculateInstantEquity,
  calculateBreakEvenPrice,
  calculateROIAnalysis,
  calculateInvestmentMetrics,
  compareStrategies,
  formatROIPercent,
  formatCurrency,
  validateROIInputs,
  type ROIInputs,
  type CashFlowEntry,
} from '../roiCalculator';

// ============================================
// Test Fixtures
// ============================================

/**
 * Standard flip investment scenario
 * $50k purchase, $20k rehab, $100k ARV, 6-month hold
 */
const mockFlipInputs: ROIInputs = {
  bidAmount: 50000,
  marketValue: 60000,
  arv: 100000,
  rehabCost: 20000,
  closingCosts: 3000,
  holdingMonths: 6,
  monthlyHoldingCosts: 800,
  sellingCosts: 6000,
  confidenceLevel: 0.8,
};

/**
 * Rental property scenario
 * $80k purchase, $15k rehab, $1200/month rent
 */
const mockHoldInputs: ROIInputs = {
  bidAmount: 80000,
  marketValue: 95000,
  arv: 110000,
  rehabCost: 15000,
  closingCosts: 4000,
  holdingMonths: 12,
  monthlyHoldingCosts: 500,
  sellingCosts: 6600,
  monthlyRent: 1200,
  monthlyOperatingExpenses: 400,
  confidenceLevel: 0.75,
};

/**
 * Minimal valid inputs
 */
const mockMinimalInputs: ROIInputs = {
  bidAmount: 30000,
  marketValue: 35000,
  arv: 50000,
  rehabCost: 5000,
  closingCosts: 2000,
  holdingMonths: 3,
  monthlyHoldingCosts: 300,
  sellingCosts: 3000,
};

/**
 * High-value property scenario
 */
const mockHighValueInputs: ROIInputs = {
  bidAmount: 250000,
  marketValue: 300000,
  arv: 400000,
  rehabCost: 50000,
  closingCosts: 15000,
  holdingMonths: 12,
  monthlyHoldingCosts: 3000,
  sellingCosts: 24000,
  confidenceLevel: 0.7,
};

/**
 * Simple cash flow for IRR testing
 * Initial -$10,000, then +$5,000 for 3 periods
 */
const mockSimpleCashFlow = [-10000, 5000, 5000, 5000];

/**
 * Complex cash flow with varying amounts
 */
const mockComplexCashFlow = [-50000, 10000, 15000, 20000, 25000];

/**
 * Cash flow with no positive values (no IRR exists)
 */
const mockNoPositiveCashFlow = [-10000, -5000, -3000];

/**
 * Cash flow with no negative values (no IRR exists)
 */
const mockNoNegativeCashFlow = [10000, 5000, 3000];

/**
 * Single cash flow entry (invalid for IRR)
 */
const mockSingleCashFlow = [-10000];

// ============================================
// NPV Calculation Tests
// ============================================

describe('calculateNPV', () => {
  describe('basic NPV calculations', () => {
    it('should calculate NPV with zero discount rate', () => {
      const cashFlows = [-1000, 500, 500, 500];
      const npv = calculateNPV(cashFlows, 0);

      // At 0% discount, NPV = sum of cash flows
      expect(npv).toBe(500);
    });

    it('should calculate NPV with positive discount rate', () => {
      const cashFlows = [-1000, 500, 500, 500];
      const npv = calculateNPV(cashFlows, 0.10);

      // NPV should be positive but less than sum
      expect(npv).toBeGreaterThan(0);
      expect(npv).toBeLessThan(500);
      expect(npv).toBeCloseTo(243.43, 1);
    });

    it('should calculate NPV with negative discount rate', () => {
      const cashFlows = [-1000, 500, 500];
      const npv = calculateNPV(cashFlows, -0.05);

      // Negative discount increases future value
      expect(npv).toBeGreaterThan(0);
    });

    it('should return 0 for empty cash flows', () => {
      const npv = calculateNPV([], 0.10);
      expect(npv).toBe(0);
    });

    it('should handle single cash flow', () => {
      const npv = calculateNPV([1000], 0.10);
      expect(npv).toBe(1000);
    });

    it('should calculate NPV for real flip scenario', () => {
      const cashFlows = generateFlipCashFlows(mockFlipInputs).map(cf => cf.amount);
      const npv = calculateNPV(cashFlows, 0.10);

      expect(npv).toBeDefined();
      expect(isNaN(npv)).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('should handle very high discount rates', () => {
      const cashFlows = [-1000, 2000];
      const npv = calculateNPV(cashFlows, 5.0);

      expect(npv).toBeDefined();
      expect(isNaN(npv)).toBe(false);
    });

    it('should handle discount rate of -1 for period > 0', () => {
      const cashFlows = [-1000, 500, 500];
      const npv = calculateNPV(cashFlows, -1);

      expect(npv).toBe(Infinity);
    });

    it('should handle large cash flows', () => {
      const cashFlows = [-1000000, 500000, 500000, 500000];
      const npv = calculateNPV(cashFlows, 0.08);

      expect(npv).toBeDefined();
      expect(isNaN(npv)).toBe(false);
      expect(npv).toBeGreaterThan(0);
    });

    it('should handle all negative cash flows', () => {
      const cashFlows = [-1000, -500, -500];
      const npv = calculateNPV(cashFlows, 0.10);

      expect(npv).toBeLessThan(0);
    });

    it('should handle alternating cash flows', () => {
      const cashFlows = [-1000, 500, -200, 800];
      const npv = calculateNPV(cashFlows, 0.10);

      expect(npv).toBeDefined();
      expect(isNaN(npv)).toBe(false);
    });
  });

  describe('NPV properties', () => {
    it('should decrease as discount rate increases', () => {
      const cashFlows = [-1000, 500, 500, 500];
      const npv5 = calculateNPV(cashFlows, 0.05);
      const npv10 = calculateNPV(cashFlows, 0.10);
      const npv15 = calculateNPV(cashFlows, 0.15);

      expect(npv5).toBeGreaterThan(npv10);
      expect(npv10).toBeGreaterThan(npv15);
    });

    it('should be additive for combined cash flows', () => {
      const cashFlows1 = [-1000, 500, 500];
      const cashFlows2 = [-2000, 800, 800];
      const rate = 0.10;

      const npv1 = calculateNPV(cashFlows1, rate);
      const npv2 = calculateNPV(cashFlows2, rate);

      const combined = cashFlows1.map((cf, i) => cf + cashFlows2[i]);
      const npvCombined = calculateNPV(combined, rate);

      expect(npvCombined).toBeCloseTo(npv1 + npv2, 2);
    });
  });
});

// ============================================
// NPV Derivative Tests
// ============================================

describe('calculateNPVDerivative', () => {
  it('should calculate derivative for simple cash flows', () => {
    const cashFlows = [-1000, 500, 500];
    const derivative = calculateNPVDerivative(cashFlows, 0.10);

    expect(derivative).toBeDefined();
    expect(isNaN(derivative)).toBe(false);
    expect(derivative).toBeLessThan(0); // Derivative should be negative
  });

  it('should return 0 for empty cash flows', () => {
    const derivative = calculateNPVDerivative([], 0.10);
    expect(derivative).toBe(0);
  });

  it('should return 0 for single cash flow', () => {
    const derivative = calculateNPVDerivative([1000], 0.10);
    expect(derivative).toBe(0);
  });

  it('should handle discount rate of 0', () => {
    const cashFlows = [-1000, 500, 500];
    const derivative = calculateNPVDerivative(cashFlows, 0);

    expect(derivative).toBeDefined();
    expect(isNaN(derivative)).toBe(false);
  });

  it('should be negative for typical investment cash flows', () => {
    const cashFlows = mockSimpleCashFlow;
    const derivative = calculateNPVDerivative(cashFlows, 0.10);

    expect(derivative).toBeLessThan(0);
  });
});

// ============================================
// IRR Calculation Tests
// ============================================

describe('calculateIRR', () => {
  describe('basic IRR calculations', () => {
    it('should calculate IRR for simple cash flows', () => {
      const irr = calculateIRR(mockSimpleCashFlow);

      expect(irr).toBeDefined();
      expect(isNaN(irr)).toBe(false);
      expect(irr).toBeGreaterThan(0);
      expect(irr).toBeLessThan(1); // Should be reasonable monthly IRR
    });

    it('should calculate IRR for complex cash flows', () => {
      const irr = calculateIRR(mockComplexCashFlow);

      expect(irr).toBeDefined();
      expect(isNaN(irr)).toBe(false);
      expect(irr).toBeGreaterThan(-0.5);
      expect(irr).toBeLessThan(2);
    });

    it('should verify IRR makes NPV equal to zero', () => {
      const cashFlows = mockSimpleCashFlow;
      const irr = calculateIRR(cashFlows);
      const npvAtIRR = calculateNPV(cashFlows, irr);

      expect(Math.abs(npvAtIRR)).toBeLessThan(0.01);
    });

    it('should calculate IRR for real flip scenario', () => {
      const cashFlows = generateFlipCashFlows(mockFlipInputs).map(cf => cf.amount);
      const irr = calculateIRR(cashFlows);

      expect(irr).toBeDefined();
      expect(isNaN(irr)).toBe(false);
      expect(irr).toBeGreaterThan(-0.5);
    });

    it('should calculate IRR for hold scenario', () => {
      const cashFlows = generateHoldCashFlows(mockHoldInputs, 5).map(cf => cf.amount);
      const irr = calculateIRR(cashFlows);

      expect(irr).toBeDefined();
      expect(isNaN(irr)).toBe(false);
    });
  });

  describe('IRR edge cases', () => {
    it('should return NaN for no positive cash flows', () => {
      const irr = calculateIRR(mockNoPositiveCashFlow);
      expect(isNaN(irr)).toBe(true);
    });

    it('should return NaN for no negative cash flows', () => {
      const irr = calculateIRR(mockNoNegativeCashFlow);
      expect(isNaN(irr)).toBe(true);
    });

    it('should return NaN for single cash flow', () => {
      const irr = calculateIRR(mockSingleCashFlow);
      expect(isNaN(irr)).toBe(true);
    });

    it('should return NaN for empty cash flows', () => {
      const irr = calculateIRR([]);
      expect(isNaN(irr)).toBe(true);
    });

    it('should handle very high IRR scenarios', () => {
      const cashFlows = [-1000, 5000];
      const irr = calculateIRR(cashFlows);

      expect(irr).toBeDefined();
      expect(isNaN(irr)).toBe(false);
      expect(irr).toBeGreaterThan(0);
    });

    it('should handle negative IRR scenarios', () => {
      const cashFlows = [-1000, 200, 200];
      const irr = calculateIRR(cashFlows);

      expect(irr).toBeDefined();
      expect(isNaN(irr)).toBe(false);
    });

    it('should handle alternating cash flows', () => {
      const cashFlows = [-1000, 2000, -500, 1000];
      const irr = calculateIRR(cashFlows);

      // May have multiple solutions or no solution
      expect(irr).toBeDefined();
    });
  });

  describe('IRR convergence', () => {
    it('should converge within max iterations', () => {
      const cashFlows = mockSimpleCashFlow;
      const irr = calculateIRR(cashFlows, 100, 0.0001);

      expect(isNaN(irr)).toBe(false);
    });

    it('should respect custom tolerance', () => {
      const cashFlows = mockSimpleCashFlow;
      const irr1 = calculateIRR(cashFlows, 100, 0.01);
      const irr2 = calculateIRR(cashFlows, 100, 0.0001);

      expect(Math.abs(irr1 - irr2)).toBeLessThan(0.02);
    });

    it('should use bisection fallback when Newton-Raphson fails', () => {
      const cashFlows = [-1000, 100, 100, 100, 100, 100, 100, 100, 100, 100, 100];
      const irr = calculateIRR(cashFlows);

      expect(irr).toBeDefined();
      expect(isNaN(irr)).toBe(false);
    });
  });

  describe('IRR bounds', () => {
    it('should respect minimum IRR bound', () => {
      const cashFlows = [-1000, 50, 50];
      const irr = calculateIRR(cashFlows);

      expect(irr).toBeGreaterThanOrEqual(-0.99);
    });

    it('should respect maximum IRR bound', () => {
      const cashFlows = [-100, 10000];
      const irr = calculateIRR(cashFlows);

      if (!isNaN(irr)) {
        expect(irr).toBeLessThanOrEqual(10);
      }
    });
  });
});

// ============================================
// IRR Conversion Tests
// ============================================

describe('IRR conversion functions', () => {
  describe('annualizeMonthlyIRR', () => {
    it('should convert monthly IRR to annual IRR', () => {
      const monthlyIRR = 0.01; // 1% monthly
      const annualIRR = annualizeMonthlyIRR(monthlyIRR);

      expect(annualIRR).toBeCloseTo(0.1268, 3); // ~12.68% annual
    });

    it('should handle zero monthly IRR', () => {
      const annualIRR = annualizeMonthlyIRR(0);
      expect(annualIRR).toBe(0);
    });

    it('should handle negative monthly IRR', () => {
      const monthlyIRR = -0.02;
      const annualIRR = annualizeMonthlyIRR(monthlyIRR);

      expect(annualIRR).toBeLessThan(0);
      expect(annualIRR).toBeGreaterThan(-1);
    });

    it('should handle high monthly IRR', () => {
      const monthlyIRR = 0.10;
      const annualIRR = annualizeMonthlyIRR(monthlyIRR);

      expect(annualIRR).toBeGreaterThan(1);
    });
  });

  describe('monthlyFromAnnualIRR', () => {
    it('should convert annual IRR to monthly IRR', () => {
      const annualIRR = 0.12; // 12% annual
      const monthlyIRR = monthlyFromAnnualIRR(annualIRR);

      expect(monthlyIRR).toBeCloseTo(0.00949, 4);
    });

    it('should handle zero annual IRR', () => {
      const monthlyIRR = monthlyFromAnnualIRR(0);
      expect(monthlyIRR).toBe(0);
    });

    it('should be inverse of annualizeMonthlyIRR', () => {
      const monthlyIRR = 0.015;
      const annualIRR = annualizeMonthlyIRR(monthlyIRR);
      const backToMonthly = monthlyFromAnnualIRR(annualIRR);

      expect(backToMonthly).toBeCloseTo(monthlyIRR, 6);
    });
  });
});

// ============================================
// Cash Flow Generation Tests
// ============================================

describe('generateFlipCashFlows', () => {
  it('should generate correct number of cash flow entries', () => {
    const cashFlows = generateFlipCashFlows(mockFlipInputs);

    // Should have: initial + (holding months - 1) + final = holding months + 1
    expect(cashFlows.length).toBe(mockFlipInputs.holdingMonths + 1);
  });

  it('should have negative initial investment', () => {
    const cashFlows = generateFlipCashFlows(mockFlipInputs);
    const initial = cashFlows[0];

    expect(initial.month).toBe(0);
    expect(initial.amount).toBeLessThan(0);
    expect(initial.description).toContain('Initial investment');
  });

  it('should calculate correct initial investment', () => {
    const cashFlows = generateFlipCashFlows(mockFlipInputs);
    const expectedInitial = -(
      mockFlipInputs.bidAmount +
      mockFlipInputs.closingCosts +
      mockFlipInputs.rehabCost
    );

    expect(cashFlows[0].amount).toBe(expectedInitial);
  });

  it('should have negative monthly holding costs', () => {
    const cashFlows = generateFlipCashFlows(mockFlipInputs);

    // Check months 1 to holdingMonths-1
    for (let i = 1; i < mockFlipInputs.holdingMonths; i++) {
      expect(cashFlows[i].month).toBe(i);
      expect(cashFlows[i].amount).toBe(-mockFlipInputs.monthlyHoldingCosts);
      expect(cashFlows[i].description).toContain('holding costs');
    }
  });

  it('should have positive sale proceeds at end', () => {
    const cashFlows = generateFlipCashFlows(mockFlipInputs);
    const final = cashFlows[cashFlows.length - 1];

    expect(final.month).toBe(mockFlipInputs.holdingMonths);
    expect(final.amount).toBeGreaterThan(0);
    expect(final.description).toContain('Sale proceeds');
  });

  it('should calculate correct sale proceeds', () => {
    const cashFlows = generateFlipCashFlows(mockFlipInputs);
    const final = cashFlows[cashFlows.length - 1];

    const expectedProceeds =
      mockFlipInputs.arv -
      mockFlipInputs.sellingCosts -
      mockFlipInputs.monthlyHoldingCosts;

    expect(final.amount).toBe(expectedProceeds);
  });

  it('should handle short holding period', () => {
    const shortInputs = { ...mockFlipInputs, holdingMonths: 1 };
    const cashFlows = generateFlipCashFlows(shortInputs);

    expect(cashFlows.length).toBe(2); // Initial + sale
    expect(cashFlows[0].month).toBe(0);
    expect(cashFlows[1].month).toBe(1);
  });

  it('should handle long holding period', () => {
    const longInputs = { ...mockFlipInputs, holdingMonths: 24 };
    const cashFlows = generateFlipCashFlows(longInputs);

    expect(cashFlows.length).toBe(25);
  });
});

describe('generateHoldCashFlows', () => {
  it('should generate correct number of cash flow entries', () => {
    const holdYears = 5;
    const cashFlows = generateHoldCashFlows(mockHoldInputs, holdYears);

    // Should have: initial + (months - 1) + final = months + 1
    const expectedMonths = holdYears * 12;
    expect(cashFlows.length).toBe(expectedMonths + 1);
  });

  it('should have negative initial investment', () => {
    const cashFlows = generateHoldCashFlows(mockHoldInputs, 5);
    const initial = cashFlows[0];

    expect(initial.month).toBe(0);
    expect(initial.amount).toBeLessThan(0);
  });

  it('should calculate correct monthly cash flow', () => {
    const cashFlows = generateHoldCashFlows(mockHoldInputs, 5);
    const expectedMonthlyCashFlow =
      (mockHoldInputs.monthlyRent || 0) -
      (mockHoldInputs.monthlyOperatingExpenses || 0);

    // Check several middle months
    for (let i = 1; i < 10; i++) {
      expect(cashFlows[i].amount).toBe(expectedMonthlyCashFlow);
    }
  });

  it('should handle missing rent parameters', () => {
    const noRentInputs = { ...mockHoldInputs };
    delete noRentInputs.monthlyRent;
    delete noRentInputs.monthlyOperatingExpenses;

    const cashFlows = generateHoldCashFlows(noRentInputs, 5);

    // Should still generate, with 0 monthly cash flow
    expect(cashFlows.length).toBeGreaterThan(0);
    expect(cashFlows[1].amount).toBe(0);
  });

  it('should include appreciation in final sale', () => {
    const cashFlows = generateHoldCashFlows(mockHoldInputs, 5);
    const final = cashFlows[cashFlows.length - 1];

    // Final amount should be higher than ARV due to appreciation
    const appreciatedValue = mockHoldInputs.arv * Math.pow(1.03, 5);
    expect(final.amount).toBeGreaterThan(mockHoldInputs.arv);
  });

  it('should vary with different hold periods', () => {
    const cashFlows3Years = generateHoldCashFlows(mockHoldInputs, 3);
    const cashFlows5Years = generateHoldCashFlows(mockHoldInputs, 5);

    expect(cashFlows3Years.length).toBe(37); // 36 months + initial
    expect(cashFlows5Years.length).toBe(61); // 60 months + initial
  });
});

// ============================================
// ROI Metric Tests
// ============================================

describe('calculateGrossROI', () => {
  it('should calculate basic gross ROI', () => {
    const roi = calculateGrossROI(50000, 100000);
    expect(roi).toBe(1.0); // 100% return
  });

  it('should handle zero profit', () => {
    const roi = calculateGrossROI(50000, 50000);
    expect(roi).toBe(0);
  });

  it('should handle loss', () => {
    const roi = calculateGrossROI(50000, 40000);
    expect(roi).toBe(-0.2); // -20%
  });

  it('should return 0 for zero acquisition cost', () => {
    const roi = calculateGrossROI(0, 100000);
    expect(roi).toBe(0);
  });

  it('should return 0 for negative acquisition cost', () => {
    const roi = calculateGrossROI(-10000, 100000);
    expect(roi).toBe(0);
  });

  it('should calculate high ROI correctly', () => {
    const roi = calculateGrossROI(10000, 100000);
    expect(roi).toBe(9.0); // 900%
  });
});

describe('calculateNetROI', () => {
  it('should calculate basic net ROI', () => {
    const roi = calculateNetROI(75000, 25000);
    expect(roi).toBeCloseTo(0.3333, 3); // 33.33%
  });

  it('should handle zero profit', () => {
    const roi = calculateNetROI(75000, 0);
    expect(roi).toBe(0);
  });

  it('should handle negative profit (loss)', () => {
    const roi = calculateNetROI(75000, -10000);
    expect(roi).toBeCloseTo(-0.1333, 3);
  });

  it('should return 0 for zero investment', () => {
    const roi = calculateNetROI(0, 25000);
    expect(roi).toBe(0);
  });

  it('should calculate high net ROI', () => {
    const roi = calculateNetROI(50000, 100000);
    expect(roi).toBe(2.0); // 200%
  });
});

describe('calculateAnnualizedROI', () => {
  it('should calculate annualized ROI for 6-month hold', () => {
    const roi = calculateAnnualizedROI(75000, 100000, 6);

    expect(roi).toBeGreaterThan(0);
    expect(roi).toBeCloseTo(0.7778, 2); // ~77.78% annualized
  });

  it('should calculate annualized ROI for 12-month hold', () => {
    const roi = calculateAnnualizedROI(100000, 125000, 12);

    expect(roi).toBe(0.25); // 25% annualized
  });

  it('should handle very short holding periods', () => {
    const roi = calculateAnnualizedROI(50000, 60000, 1);

    // 20% in 1 month = extremely high annualized
    expect(roi).toBeGreaterThan(1);
  });

  it('should return 0 for zero investment', () => {
    const roi = calculateAnnualizedROI(0, 100000, 6);
    expect(roi).toBe(0);
  });

  it('should return 0 for zero holding period', () => {
    const roi = calculateAnnualizedROI(100000, 125000, 0);
    expect(roi).toBe(0);
  });

  it('should handle multi-year periods', () => {
    const roi = calculateAnnualizedROI(100000, 200000, 36); // 3 years

    expect(roi).toBeGreaterThan(0);
    expect(roi).toBeLessThan(1);
  });
});

describe('calculateCapRate', () => {
  it('should calculate basic cap rate', () => {
    const capRate = calculateCapRate(12000, 150000);
    expect(capRate).toBeCloseTo(0.08, 3); // 8%
  });

  it('should handle zero NOI', () => {
    const capRate = calculateCapRate(0, 150000);
    expect(capRate).toBe(0);
  });

  it('should handle negative NOI', () => {
    const capRate = calculateCapRate(-5000, 150000);
    expect(capRate).toBeCloseTo(-0.0333, 3);
  });

  it('should return 0 for zero property value', () => {
    const capRate = calculateCapRate(12000, 0);
    expect(capRate).toBe(0);
  });

  it('should calculate high cap rate', () => {
    const capRate = calculateCapRate(20000, 100000);
    expect(capRate).toBe(0.2); // 20%
  });

  it('should calculate low cap rate', () => {
    const capRate = calculateCapRate(5000, 200000);
    expect(capRate).toBe(0.025); // 2.5%
  });
});

describe('calculateCashOnCash', () => {
  it('should calculate basic cash-on-cash return', () => {
    const coc = calculateCashOnCash(10000, 100000);
    expect(coc).toBe(0.1); // 10%
  });

  it('should handle zero cash flow', () => {
    const coc = calculateCashOnCash(0, 100000);
    expect(coc).toBe(0);
  });

  it('should handle negative cash flow', () => {
    const coc = calculateCashOnCash(-5000, 100000);
    expect(coc).toBe(-0.05);
  });

  it('should return 0 for zero investment', () => {
    const coc = calculateCashOnCash(10000, 0);
    expect(coc).toBe(0);
  });

  it('should calculate high CoC return', () => {
    const coc = calculateCashOnCash(25000, 100000);
    expect(coc).toBe(0.25); // 25%
  });
});

describe('calculateInstantEquity', () => {
  it('should calculate positive instant equity', () => {
    const equity = calculateInstantEquity(100000, 75000);
    expect(equity).toBe(25000);
  });

  it('should calculate zero instant equity', () => {
    const equity = calculateInstantEquity(100000, 100000);
    expect(equity).toBe(0);
  });

  it('should calculate negative instant equity', () => {
    const equity = calculateInstantEquity(75000, 100000);
    expect(equity).toBe(-25000);
  });

  it('should handle large values', () => {
    const equity = calculateInstantEquity(1000000, 750000);
    expect(equity).toBe(250000);
  });
});

describe('calculateBreakEvenPrice', () => {
  it('should calculate break-even with default selling costs', () => {
    const breakEven = calculateBreakEvenPrice(75000);

    // 75000 / (1 - 0.08) = 81521.74
    expect(breakEven).toBeCloseTo(81521.74, 1);
  });

  it('should calculate break-even with custom selling costs', () => {
    const breakEven = calculateBreakEvenPrice(75000, 0.06);

    expect(breakEven).toBeCloseTo(79787.23, 1);
  });

  it('should handle zero selling costs', () => {
    const breakEven = calculateBreakEvenPrice(75000, 0);
    expect(breakEven).toBe(75000);
  });

  it('should return Infinity for 100% selling costs', () => {
    const breakEven = calculateBreakEvenPrice(75000, 1);
    expect(breakEven).toBe(Infinity);
  });

  it('should return Infinity for >100% selling costs', () => {
    const breakEven = calculateBreakEvenPrice(75000, 1.5);
    expect(breakEven).toBe(Infinity);
  });
});

// ============================================
// Complete ROI Analysis Tests
// ============================================

describe('calculateROIAnalysis', () => {
  describe('basic analysis', () => {
    it('should return complete ROI analysis structure', () => {
      const analysis = calculateROIAnalysis(mockFlipInputs);

      // Check all required fields exist
      expect(analysis.acquisitionCost).toBeDefined();
      expect(analysis.estimatedClosingCosts).toBeDefined();
      expect(analysis.estimatedMarketValue).toBeDefined();
      expect(analysis.estimatedARV).toBeDefined();
      expect(analysis.estimatedRehabCost).toBeDefined();
      expect(analysis.grossROI).toBeDefined();
      expect(analysis.netROI).toBeDefined();
      expect(analysis.annualizedROI).toBeDefined();
      expect(analysis.irr).toBeDefined();
      expect(analysis.irrMonthly).toBeDefined();
      expect(analysis.monthlyRentEstimate).toBeDefined();
      expect(analysis.monthlyCashFlow).toBeDefined();
      expect(analysis.capRate).toBeDefined();
      expect(analysis.cashOnCashReturn).toBeDefined();
      expect(analysis.instantEquity).toBeDefined();
      expect(analysis.instantEquityPercent).toBeDefined();
      expect(analysis.riskAdjustedROI).toBeDefined();
      expect(analysis.confidenceRange).toBeDefined();
    });

    it('should calculate positive ROI for profitable flip', () => {
      const analysis = calculateROIAnalysis(mockFlipInputs);

      expect(analysis.grossROI).toBeGreaterThan(0);
      expect(analysis.netROI).toBeGreaterThan(0);
      expect(analysis.annualizedROI).toBeGreaterThan(0);
    });

    it('should calculate instant equity correctly', () => {
      const analysis = calculateROIAnalysis(mockFlipInputs);
      const expectedEquity =
        mockFlipInputs.marketValue -
        (mockFlipInputs.bidAmount + mockFlipInputs.closingCosts);

      expect(analysis.instantEquity).toBe(expectedEquity);
    });

    it('should calculate instant equity percent', () => {
      const analysis = calculateROIAnalysis(mockFlipInputs);

      expect(analysis.instantEquityPercent).toBeGreaterThan(0);
      expect(analysis.instantEquityPercent).toBeLessThan(1);
    });

    it('should generate monthly IRR progression', () => {
      const analysis = calculateROIAnalysis(mockFlipInputs);

      expect(analysis.irrMonthly).toHaveLength(mockFlipInputs.holdingMonths);
      expect(analysis.irrMonthly.every(irr => typeof irr === 'number')).toBe(true);
    });
  });

  describe('rental analysis', () => {
    it('should calculate rental metrics when rent provided', () => {
      const analysis = calculateROIAnalysis(mockHoldInputs);

      expect(analysis.monthlyRentEstimate).toBe(mockHoldInputs.monthlyRent);
      expect(analysis.monthlyCashFlow).toBeGreaterThan(0);
      expect(analysis.capRate).toBeGreaterThan(0);
      expect(analysis.cashOnCashReturn).toBeGreaterThan(0);
    });

    it('should handle missing rental data', () => {
      const analysis = calculateROIAnalysis(mockFlipInputs);

      expect(analysis.monthlyRentEstimate).toBe(0);
      expect(analysis.monthlyCashFlow).toBe(0);
    });
  });

  describe('risk adjustment', () => {
    it('should apply confidence level to risk-adjusted ROI', () => {
      const analysis = calculateROIAnalysis(mockFlipInputs);

      expect(analysis.riskAdjustedROI).toBeLessThan(analysis.netROI);
      expect(analysis.riskAdjustedROI).toBeCloseTo(
        analysis.netROI * (mockFlipInputs.confidenceLevel || 0.7),
        4
      );
    });

    it('should calculate confidence range', () => {
      const analysis = calculateROIAnalysis(mockFlipInputs);

      expect(analysis.confidenceRange.min).toBeLessThan(analysis.netROI);
      expect(analysis.confidenceRange.max).toBeGreaterThan(analysis.netROI);
      expect(analysis.confidenceRange.min).toBeGreaterThan(0);
    });

    it('should use default confidence level if not provided', () => {
      const analysis = calculateROIAnalysis(mockMinimalInputs);

      expect(analysis.riskAdjustedROI).toBeDefined();
      expect(analysis.confidenceRange).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('should handle minimal inputs', () => {
      const analysis = calculateROIAnalysis(mockMinimalInputs);

      expect(analysis).toBeDefined();
      expect(analysis.grossROI).toBeDefined();
      expect(analysis.netROI).toBeDefined();
    });

    it('should handle high-value property', () => {
      const analysis = calculateROIAnalysis(mockHighValueInputs);

      expect(analysis).toBeDefined();
      expect(analysis.acquisitionCost).toBe(mockHighValueInputs.bidAmount);
    });

    it('should handle unprofitable scenarios', () => {
      const lossInputs: ROIInputs = {
        ...mockFlipInputs,
        arv: 40000, // Less than total investment
      };

      const analysis = calculateROIAnalysis(lossInputs);

      expect(analysis.netROI).toBeLessThan(0);
    });

    it('should set IRR to 0 when NaN', () => {
      const badInputs: ROIInputs = {
        ...mockFlipInputs,
        arv: 0, // Would create invalid cash flows
      };

      const analysis = calculateROIAnalysis(badInputs);

      expect(analysis.irr).toBe(0);
    });
  });
});

// ============================================
// Investment Metrics Tests
// ============================================

describe('calculateInvestmentMetrics', () => {
  it('should return complete investment metrics', () => {
    const metrics = calculateInvestmentMetrics(mockFlipInputs);

    expect(metrics.totalCashRequired).toBeDefined();
    expect(metrics.expectedGrossProfit).toBeDefined();
    expect(metrics.expectedNetProfit).toBeDefined();
    expect(metrics.grossROIPercent).toBeDefined();
    expect(metrics.netROIPercent).toBeDefined();
    expect(metrics.annualizedReturn).toBeDefined();
    expect(metrics.breakEvenPrice).toBeDefined();
    expect(metrics.profitPerMonth).toBeDefined();
  });

  it('should calculate total cash required correctly', () => {
    const metrics = calculateInvestmentMetrics(mockFlipInputs);
    const expected =
      mockFlipInputs.bidAmount +
      mockFlipInputs.closingCosts +
      mockFlipInputs.rehabCost +
      mockFlipInputs.monthlyHoldingCosts * mockFlipInputs.holdingMonths;

    expect(metrics.totalCashRequired).toBe(expected);
  });

  it('should calculate expected profit correctly', () => {
    const metrics = calculateInvestmentMetrics(mockFlipInputs);

    expect(metrics.expectedGrossProfit).toBeGreaterThan(0);
    expect(metrics.expectedNetProfit).toBeGreaterThan(0);
    expect(metrics.expectedNetProfit).toBeLessThan(metrics.expectedGrossProfit);
  });

  it('should convert ROI to percentages', () => {
    const metrics = calculateInvestmentMetrics(mockFlipInputs);

    expect(metrics.grossROIPercent).toBeGreaterThan(0);
    expect(metrics.netROIPercent).toBeGreaterThan(0);
    expect(metrics.annualizedReturn).toBeGreaterThan(0);
  });

  it('should calculate profit per month', () => {
    const metrics = calculateInvestmentMetrics(mockFlipInputs);

    expect(metrics.profitPerMonth).toBeGreaterThan(0);
    expect(metrics.profitPerMonth).toBe(
      metrics.expectedNetProfit / mockFlipInputs.holdingMonths
    );
  });
});

// ============================================
// Strategy Comparison Tests
// ============================================

describe('compareStrategies', () => {
  it('should compare flip and hold strategies', () => {
    const comparison = compareStrategies(mockHoldInputs, 5);

    expect(comparison.flip).toBeDefined();
    expect(comparison.hold).toBeDefined();
    expect(comparison.flip.irr).toBeDefined();
    expect(comparison.hold.irr).toBeDefined();
  });

  it('should calculate metrics for both strategies', () => {
    const comparison = compareStrategies(mockHoldInputs, 5);

    expect(comparison.flip.netROI).toBeDefined();
    expect(comparison.flip.totalProfit).toBeDefined();
    expect(comparison.hold.netROI).toBeDefined();
    expect(comparison.hold.totalProfit).toBeDefined();
    expect(comparison.hold.monthlyCashFlow).toBeDefined();
  });

  it('should show hold strategy benefits from appreciation', () => {
    const comparison = compareStrategies(mockHoldInputs, 10);

    // Longer hold should show appreciation benefits
    expect(comparison.hold.totalProfit).toBeGreaterThan(0);
  });

  it('should handle different hold periods', () => {
    const comparison3 = compareStrategies(mockHoldInputs, 3);
    const comparison10 = compareStrategies(mockHoldInputs, 10);

    // Longer hold should generally have higher total profit (but lower IRR)
    expect(comparison10.hold.totalProfit).toBeGreaterThan(
      comparison3.hold.totalProfit
    );
  });

  it('should set IRR to 0 when NaN', () => {
    const comparison = compareStrategies(mockFlipInputs, 5);

    expect(comparison.flip.irr).toBeDefined();
    expect(comparison.hold.irr).toBeDefined();
    expect(isNaN(comparison.flip.irr)).toBe(false);
    expect(isNaN(comparison.hold.irr)).toBe(false);
  });
});

// ============================================
// Utility Function Tests
// ============================================

describe('formatROIPercent', () => {
  it('should format positive ROI', () => {
    expect(formatROIPercent(0.25)).toBe('25.0%');
  });

  it('should format negative ROI', () => {
    expect(formatROIPercent(-0.15)).toBe('-15.0%');
  });

  it('should format zero ROI', () => {
    expect(formatROIPercent(0)).toBe('0.0%');
  });

  it('should respect decimal places', () => {
    expect(formatROIPercent(0.12345, 2)).toBe('12.35%');
    expect(formatROIPercent(0.12345, 3)).toBe('12.345%');
  });

  it('should handle NaN', () => {
    expect(formatROIPercent(NaN)).toBe('N/A');
  });

  it('should handle Infinity', () => {
    expect(formatROIPercent(Infinity)).toBe('N/A');
  });

  it('should handle very large values', () => {
    const formatted = formatROIPercent(10.5);
    expect(formatted).toBe('1050.0%');
  });
});

describe('formatCurrency', () => {
  it('should format positive amounts', () => {
    expect(formatCurrency(12500)).toBe('$12,500');
  });

  it('should format negative amounts', () => {
    expect(formatCurrency(-5000)).toBe('-$5,000');
  });

  it('should format zero', () => {
    expect(formatCurrency(0)).toBe('$0');
  });

  it('should handle NaN', () => {
    expect(formatCurrency(NaN)).toBe('$0');
  });

  it('should handle Infinity', () => {
    expect(formatCurrency(Infinity)).toBe('$0');
  });

  it('should format large amounts', () => {
    expect(formatCurrency(1250000)).toBe('$1,250,000');
  });

  it('should round to nearest dollar', () => {
    expect(formatCurrency(12345.67)).toBe('$12,346');
  });
});

describe('validateROIInputs', () => {
  it('should return empty array for valid inputs', () => {
    const errors = validateROIInputs(mockFlipInputs);
    expect(errors).toHaveLength(0);
  });

  it('should detect missing bid amount', () => {
    const errors = validateROIInputs({ ...mockFlipInputs, bidAmount: 0 });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.includes('Bid amount'))).toBe(true);
  });

  it('should detect missing ARV', () => {
    const errors = validateROIInputs({ ...mockFlipInputs, arv: 0 });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.includes('ARV'))).toBe(true);
  });

  it('should warn when ARV < bid amount', () => {
    const errors = validateROIInputs({
      ...mockFlipInputs,
      bidAmount: 100000,
      arv: 50000,
    });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.includes('less than bid'))).toBe(true);
  });

  it('should detect invalid holding period', () => {
    const errors = validateROIInputs({ ...mockFlipInputs, holdingMonths: 0 });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.includes('Holding period'))).toBe(true);
  });

  it('should warn about very long holding periods', () => {
    const errors = validateROIInputs({ ...mockFlipInputs, holdingMonths: 72 });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.includes('exceeds 5 years'))).toBe(true);
  });

  it('should detect negative rehab cost', () => {
    const errors = validateROIInputs({ ...mockFlipInputs, rehabCost: -5000 });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors.some(e => e.includes('Rehab cost'))).toBe(true);
  });

  it('should handle partial inputs', () => {
    const errors = validateROIInputs({ bidAmount: 50000 });
    expect(errors.length).toBeGreaterThan(0);
  });
});
