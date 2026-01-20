# Phase 6F: Tests & Verification

## Overview

This document provides comprehensive unit tests, integration tests, edge case scenarios, and verification steps for the scoring algorithm system implemented in Phase 6.

---

## Table of Contents

1. [Unit Tests](#unit-tests)
2. [Location Score Tests](#location-score-tests)
3. [Risk Score Tests](#risk-score-tests)
4. [Financial Score Tests](#financial-score-tests)
5. [Market Score Tests](#market-score-tests)
6. [Profit Score Tests](#profit-score-tests)
7. [Edge Case Test Scenarios](#edge-case-test-scenarios)
8. [Integration Testing](#integration-testing)
9. [Verification Checklist](#verification-checklist)

---

## Unit Tests

### Core Scoring System Tests

```typescript
// src/lib/analysis/scoring/__tests__/scoring.test.ts

import { describe, it, expect, beforeEach } from 'vitest';
import { calculatePropertyScore } from '../index';
import { calculateLocationScore } from '../locationScore';
import { calculateGrade } from '../index';
import { handleMissingData } from '../missingDataHandler';
import { detectPropertyType } from '../propertyTypeScoring';
import { handleEdgeCases } from '../edgeCases';

describe('Scoring System', () => {
  const mockProperty = {
    id: 'test-123',
    parcelId: '01.01-04..-156.00-000',
    propertyAddress: '456 Oak St',
    assessedValue: 100000,
    taxAmount: 5000,
    yearBuilt: 1980,
    buildingSqft: 1500,
    state: 'PA',
  };

  const mockExternalData = {
    walkScore: { score: 65 },
    crimeData: { index: 30, grade: 'B' },
    schoolRatings: { averageRating: 7, nearbySchools: 5 },
    nearbyAmenities: { count: 15, categories: ['grocery', 'restaurant'] },
    transitScore: { score: 40 },
    fema: { floodZone: 'X', inFloodplain: false },
    usgs: { risk: 2, nearbyEvents: 0 },
    nasaFirms: { riskLevel: 1, recentFires: 0 },
    marketValue: 150000,
    marketData: {
      yearlyAppreciation: 5,
      avgDaysOnMarket: 30,
      monthsOfInventory: 3,
    },
    rentEstimate: { monthlyRent: 1200 },
  };

  describe('calculatePropertyScore', () => {
    it('calculates total score between 0 and 125', async () => {
      const result = await calculatePropertyScore({
        property: mockProperty,
        externalData: mockExternalData,
      });

      expect(result.totalScore).toBeGreaterThanOrEqual(0);
      expect(result.totalScore).toBeLessThanOrEqual(125);
    });

    it('includes all five category scores', async () => {
      const result = await calculatePropertyScore({
        property: mockProperty,
        externalData: mockExternalData,
      });

      expect(result.location).toBeDefined();
      expect(result.risk).toBeDefined();
      expect(result.financial).toBeDefined();
      expect(result.market).toBeDefined();
      expect(result.profit).toBeDefined();
    });

    it('includes scoring metadata', async () => {
      const result = await calculatePropertyScore({
        property: mockProperty,
        externalData: mockExternalData,
      });

      expect(result.scoringVersion).toBeDefined();
      expect(result.calculatedAt).toBeInstanceOf(Date);
      expect(result.propertyType).toBeDefined();
    });

    it('returns consistent scores for identical inputs', async () => {
      const result1 = await calculatePropertyScore({
        property: mockProperty,
        externalData: mockExternalData,
      });

      const result2 = await calculatePropertyScore({
        property: mockProperty,
        externalData: mockExternalData,
      });

      expect(result1.totalScore).toBe(result2.totalScore);
    });
  });

  describe('Grade Calculation (Unified)', () => {
    it('assigns grade A for scores >= 100 (80%)', () => {
      expect(calculateGrade(100).grade).toBe('A');
      expect(calculateGrade(125).grade).toBe('A');
      expect(calculateGrade(100).percentage).toBe(80);
    });

    it('assigns grade B for scores 75-99 (60-79%)', () => {
      expect(calculateGrade(75).grade).toBe('B');
      expect(calculateGrade(99).grade).toBe('B');
    });

    it('assigns grade C for scores 50-74 (40-59%)', () => {
      expect(calculateGrade(50).grade).toBe('C');
      expect(calculateGrade(74).grade).toBe('C');
    });

    it('assigns grade D for scores 25-49 (20-39%)', () => {
      expect(calculateGrade(25).grade).toBe('D');
      expect(calculateGrade(49).grade).toBe('D');
    });

    it('assigns grade F for scores < 25 (<20%)', () => {
      expect(calculateGrade(0).grade).toBe('F');
      expect(calculateGrade(24).grade).toBe('F');
    });

    it('includes percentage in result', () => {
      const result = calculateGrade(62.5);
      expect(result.percentage).toBe(50);
      expect(result.grade).toBe('C');
    });

    it('handles boundary cases correctly', () => {
      expect(calculateGrade(99.99).grade).toBe('B');
      expect(calculateGrade(100.0).grade).toBe('A');
      expect(calculateGrade(74.99).grade).toBe('C');
      expect(calculateGrade(75.0).grade).toBe('B');
    });

    // Additional grade modifier tests
    describe('Grade Calculation at Boundaries', () => {
      it('handles exact boundary at 79.9 vs 80.0 percent', () => {
        // 79.9% of 125 = 99.875
        // 80.0% of 125 = 100.0
        expect(calculateGrade(99.875).grade).toBe('B');
        expect(calculateGrade(100.0).grade).toBe('A');
      });

      it('handles exact boundary at 59.9 vs 60.0 percent', () => {
        // 59.9% of 125 = 74.875
        // 60.0% of 125 = 75.0
        expect(calculateGrade(74.875).grade).toBe('C');
        expect(calculateGrade(75.0).grade).toBe('B');
      });

      it('handles exact boundary at 39.9 vs 40.0 percent', () => {
        // 39.9% of 125 = 49.875
        // 40.0% of 125 = 50.0
        expect(calculateGrade(49.875).grade).toBe('D');
        expect(calculateGrade(50.0).grade).toBe('C');
      });

      it('handles exact boundary at 19.9 vs 20.0 percent', () => {
        // 19.9% of 125 = 24.875
        // 20.0% of 125 = 25.0
        expect(calculateGrade(24.875).grade).toBe('F');
        expect(calculateGrade(25.0).grade).toBe('D');
      });
    });

    describe('Grade Letter Assignment', () => {
      it('assigns A+ for scores above 95%', () => {
        const result = calculateGrade(118.75); // 95%
        expect(result.grade).toBe('A');
        expect(result.modifier).toBe('+');
        expect(result.displayGrade).toBe('A+');
      });

      it('assigns A for scores between 90-95%', () => {
        const result = calculateGrade(112.5); // 90%
        expect(result.grade).toBe('A');
        expect(result.modifier).toBe(undefined);
        expect(result.displayGrade).toBe('A');
      });

      it('assigns A- for scores between 80-90%', () => {
        const result = calculateGrade(100); // 80%
        expect(result.grade).toBe('A');
        expect(result.modifier).toBe('-');
        expect(result.displayGrade).toBe('A-');
      });

      it('assigns B+, B, B- correctly', () => {
        expect(calculateGrade(98).modifier).toBe('+'); // Top of B range
        expect(calculateGrade(87.5).modifier).toBe(undefined); // Mid B
        expect(calculateGrade(76).modifier).toBe('-'); // Bottom of B range
      });

      it('assigns C+, C, C- correctly', () => {
        expect(calculateGrade(73).modifier).toBe('+'); // Top of C range
        expect(calculateGrade(62.5).modifier).toBe(undefined); // Mid C
        expect(calculateGrade(51).modifier).toBe('-'); // Bottom of C range
      });
    });

    describe('Grade Confidence Impact', () => {
      it('adjusts grade when confidence is below 70%', async () => {
        const lowConfidenceResult = await calculatePropertyScore({
          property: mockProperty,
          externalData: {}, // Minimal data = low confidence
        });

        expect(lowConfidenceResult.confidenceLevel.overall).toBeLessThan(70);
        expect(lowConfidenceResult.grade.confidenceAdjusted).toBe(true);
        expect(lowConfidenceResult.grade.originalGrade).toBeDefined();
      });

      it('does not adjust grade when confidence is above 85%', async () => {
        const highConfidenceResult = await calculatePropertyScore({
          property: mockProperty,
          externalData: mockExternalData,
        });

        expect(highConfidenceResult.confidenceLevel.overall).toBeGreaterThan(85);
        expect(highConfidenceResult.grade.confidenceAdjusted).toBe(false);
      });

      it('shows warning for borderline grades with low confidence', async () => {
        const borderlineResult = await calculatePropertyScore({
          property: mockProperty,
          externalData: { marketValue: 150000 }, // Limited data
        });

        if (borderlineResult.confidenceLevel.overall < 75) {
          expect(borderlineResult.grade.warnings).toContain(
            'Grade may change with more data'
          );
        }
      });

      it('includes confidence range in grade result', () => {
        const result = calculateGrade(75, { confidence: 60 });
        expect(result.gradeRange).toBeDefined();
        expect(result.gradeRange.min).toBe('C'); // Could be lower
        expect(result.gradeRange.max).toBe('B'); // Current grade
      });
    });
  });

  describe('Missing Data Handling', () => {
    it('returns conservative score for crime data', () => {
      const result = handleMissingData('crime_safety', false);
      expect(result.strategy).toBe('default_conservative');
      expect(result.score).toBe(2.0);
      expect(result.confidence).toBe(75); // 100 - 25 penalty
    });

    it('returns neutral score for walkability', () => {
      const result = handleMissingData('walkability', false);
      expect(result.strategy).toBe('default_neutral');
      expect(result.score).toBe(2.5);
    });

    it('requires data for ROI calculation', () => {
      const result = handleMissingData('roi_potential', false);
      expect(result.strategy).toBe('require_data');
      expect(result.score).toBe(0);
    });

    it('applies correct confidence penalties', () => {
      const crimeResult = handleMissingData('crime_safety', false);
      const walkResult = handleMissingData('walkability', false);

      expect(crimeResult.confidence).toBe(75); // -25 penalty
      expect(walkResult.confidence).toBe(90); // -10 penalty
    });

    // Tests for ALL 6 missing data strategies
    describe('Default Neutral Strategy', () => {
      it('returns midpoint score of 2.5 for neutral components', () => {
        const result = handleMissingData('walkability', false);
        expect(result.strategy).toBe('default_neutral');
        expect(result.score).toBe(2.5);
        expect(result.confidence).toBe(90); // -10 penalty for neutral
      });

      it('applies neutral strategy to amenities', () => {
        const result = handleMissingData('nearby_amenities', false);
        expect(result.strategy).toBe('default_neutral');
        expect(result.score).toBe(2.5);
      });

      it('applies neutral strategy to transit score', () => {
        const result = handleMissingData('transit_access', false);
        expect(result.strategy).toBe('default_neutral');
        expect(result.score).toBe(2.5);
      });
    });

    describe('Default Conservative Strategy', () => {
      it('returns below-average score of 2.0 for risk-related components', () => {
        const result = handleMissingData('crime_safety', false);
        expect(result.strategy).toBe('default_conservative');
        expect(result.score).toBe(2.0);
        expect(result.confidence).toBe(75); // -25 penalty for conservative
      });

      it('applies conservative strategy to flood risk', () => {
        const result = handleMissingData('flood_risk', false);
        expect(result.strategy).toBe('default_conservative');
        expect(result.score).toBe(2.0);
      });

      it('applies conservative strategy to seismic risk', () => {
        const result = handleMissingData('seismic_risk', false);
        expect(result.strategy).toBe('default_conservative');
        expect(result.score).toBe(2.0);
      });

      it('applies conservative strategy to fire risk', () => {
        const result = handleMissingData('fire_risk', false);
        expect(result.strategy).toBe('default_conservative');
        expect(result.score).toBe(2.0);
      });
    });

    describe('Default Optimistic Strategy', () => {
      it('returns above-average score of 3.5 for lower-impact components', () => {
        const result = handleMissingData('market_liquidity', false);
        expect(result.strategy).toBe('default_optimistic');
        expect(result.score).toBe(3.5);
        expect(result.confidence).toBe(85); // -15 penalty for optimistic
      });

      it('applies optimistic strategy to sales volume', () => {
        const result = handleMissingData('sales_volume', false);
        expect(result.strategy).toBe('default_optimistic');
        expect(result.score).toBe(3.5);
      });
    });

    describe('Skip Component Strategy', () => {
      it('excludes component from calculation entirely', () => {
        const result = handleMissingData('optional_metric', false, { allowSkip: true });
        expect(result.strategy).toBe('skip_component');
        expect(result.score).toBe(null);
        expect(result.skipReason).toBe('Data not available, component excluded');
        expect(result.redistributeWeight).toBe(true);
      });

      it('redistributes weight to other components when skipped', () => {
        const result = handleMissingData('niche_feature', false, { allowSkip: true });
        expect(result.strategy).toBe('skip_component');
        expect(result.originalWeight).toBeDefined();
        expect(result.redistributeWeight).toBe(true);
      });
    });

    describe('Require Data Strategy', () => {
      it('returns zero score when required data is missing', () => {
        const result = handleMissingData('roi_potential', false);
        expect(result.strategy).toBe('require_data');
        expect(result.score).toBe(0);
        expect(result.confidence).toBe(50); // -50 penalty for required
      });

      it('applies require_data strategy to equity margin', () => {
        const result = handleMissingData('equity_margin', false);
        expect(result.strategy).toBe('require_data');
        expect(result.score).toBe(0);
      });

      it('flags property for manual review when required data missing', () => {
        const result = handleMissingData('roi_potential', false);
        expect(result.requiresManualReview).toBe(true);
        expect(result.missingDataWarning).toBeDefined();
      });
    });

    describe('Estimate From Peers Strategy', () => {
      it('estimates score from similar properties when data missing', () => {
        const peerData = {
          similarProperties: [
            { component: 'school_quality', score: 4.0 },
            { component: 'school_quality', score: 3.5 },
            { component: 'school_quality', score: 4.2 },
          ],
        };
        const result = handleMissingData('school_quality', false, { peerData });
        expect(result.strategy).toBe('estimate_from_peers');
        expect(result.score).toBeCloseTo(3.9, 1); // Average of peers
        expect(result.confidence).toBe(70); // -30 penalty for estimation
      });

      it('falls back to neutral if no peer data available', () => {
        const result = handleMissingData('school_quality', false, { peerData: null });
        expect(result.strategy).toBe('default_neutral');
        expect(result.score).toBe(2.5);
      });

      it('uses county-level averages when available', () => {
        const countyAverages = {
          school_quality: 3.8,
          crime_safety: 3.2,
        };
        const result = handleMissingData('school_quality', false, { countyAverages });
        expect(result.strategy).toBe('estimate_from_peers');
        expect(result.score).toBe(3.8);
        expect(result.dataSource).toBe('county_average');
      });
    });
  });

  describe('Property Type Detection', () => {
    it('detects single family residential', () => {
      const type = detectPropertyType(
        { ...mockProperty, propertyType: 'Single Family' },
        {}
      );
      expect(type).toBe('single_family_residential');
    });

    it('detects vacant land from building sqft', () => {
      const type = detectPropertyType(
        { ...mockProperty, buildingSqft: 0, propertyType: undefined },
        {}
      );
      expect(type).toBe('vacant_land');
    });

    it('infers from zoning when type not specified', () => {
      const type = detectPropertyType(
        { ...mockProperty, zoning: 'R-1', propertyType: undefined },
        {}
      );
      expect(type).toBe('single_family_residential');
    });

    it('detects commercial from zoning', () => {
      const type = detectPropertyType(
        { ...mockProperty, zoning: 'C-1', propertyType: undefined },
        {}
      );
      expect(type).toBe('commercial');
    });

    it('detects multi-family from property type', () => {
      const type = detectPropertyType(
        { ...mockProperty, propertyType: 'Duplex' },
        {}
      );
      expect(type).toBe('multi_family');
    });
  });

  describe('Edge Case Handling', () => {
    it('flags extremely low value properties', () => {
      const result = handleEdgeCases(
        { ...mockProperty, totalDue: 1000 },
        mockExternalData
      );
      expect(result.isEdgeCase).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('flags very old properties', () => {
      const result = handleEdgeCases(
        { ...mockProperty, yearBuilt: 1900 },
        mockExternalData
      );
      expect(result.isEdgeCase).toBe(true);
      expect(result.edgeCaseType).toBe('very_old_property');
    });

    it('flags properties with no structure', () => {
      const result = handleEdgeCases(
        { ...mockProperty, buildingSqft: 0 },
        mockExternalData
      );
      expect(result.isEdgeCase).toBe(true);
      expect(result.edgeCaseType).toBe('no_structure');
      expect(result.handling).toBe('specialized_analysis');
    });

    it('flags extremely high value properties', () => {
      const result = handleEdgeCases(
        { ...mockProperty, assessedValue: 5000000 },
        mockExternalData
      );
      expect(result.isEdgeCase).toBe(true);
      expect(result.edgeCaseType).toBe('high_value_property');
    });

    // Tests for ALL 15 edge case types
    describe('Landlocked Properties', () => {
      it('flags properties with no road access in data', () => {
        const result = handleEdgeCases(
          { ...mockProperty, roadAccess: false },
          mockExternalData
        );
        expect(result.isEdgeCase).toBe(true);
        expect(result.edgeCaseType).toBe('landlocked');
        expect(result.handling).toBe('manual_review');
        expect(result.recommendations).toContain('Verify easement rights');
      });

      it('detects landlocked from parcel geometry', () => {
        const result = handleEdgeCases(
          { ...mockProperty },
          { ...mockExternalData, parcelGeometry: { roadFrontage: 0 } }
        );
        expect(result.isEdgeCase).toBe(true);
        expect(result.edgeCaseType).toBe('landlocked');
      });
    });

    describe('No Road Access Properties', () => {
      it('flags properties requiring easement', () => {
        const result = handleEdgeCases(
          { ...mockProperty, accessType: 'easement_required' },
          mockExternalData
        );
        expect(result.isEdgeCase).toBe(true);
        expect(result.edgeCaseType).toBe('no_road_access');
        expect(result.warnings).toContain('Property may require easement for access');
      });

      it('applies penalty to location score for access issues', async () => {
        const normalResult = await calculatePropertyScore({
          property: mockProperty,
          externalData: mockExternalData,
        });

        const noAccessResult = await calculatePropertyScore({
          property: { ...mockProperty, accessType: 'easement_required' },
          externalData: mockExternalData,
        });

        expect(noAccessResult.location.score).toBeLessThan(normalResult.location.score);
      });
    });

    describe('Title Cloud Properties', () => {
      it('flags properties with title issues', () => {
        const result = handleEdgeCases(
          { ...mockProperty, titleStatus: 'clouded' },
          { ...mockExternalData, titleSearch: { hasIssues: true, issues: ['heir dispute'] } }
        );
        expect(result.isEdgeCase).toBe(true);
        expect(result.edgeCaseType).toBe('title_cloud');
        expect(result.handling).toBe('title_research_required');
      });

      it('identifies specific title issues', () => {
        const result = handleEdgeCases(
          mockProperty,
          { ...mockExternalData, titleSearch: { hasIssues: true, issues: ['missing deed', 'heir claim'] } }
        );
        expect(result.titleIssues).toContain('missing deed');
        expect(result.titleIssues).toContain('heir claim');
      });
    });

    describe('IRS Lien Properties', () => {
      it('flags properties with federal tax liens', () => {
        const result = handleEdgeCases(
          mockProperty,
          { ...mockExternalData, liens: [{ type: 'irs', amount: 50000 }] }
        );
        expect(result.isEdgeCase).toBe(true);
        expect(result.edgeCaseType).toBe('irs_lien');
        expect(result.handling).toBe('lien_analysis_required');
        expect(result.warnings).toContain('Federal tax lien may survive sale');
      });

      it('calculates total lien burden', () => {
        const result = handleEdgeCases(
          mockProperty,
          { ...mockExternalData, liens: [
            { type: 'irs', amount: 25000 },
            { type: 'state_tax', amount: 10000 }
          ]}
        );
        expect(result.totalLienBurden).toBe(35000);
      });
    });

    describe('HOA Super Lien Properties', () => {
      it('flags properties with HOA super liens', () => {
        const result = handleEdgeCases(
          mockProperty,
          { ...mockExternalData, liens: [{ type: 'hoa_super', amount: 15000 }] }
        );
        expect(result.isEdgeCase).toBe(true);
        expect(result.edgeCaseType).toBe('hoa_super_lien');
        expect(result.warnings).toContain('HOA super lien may have priority');
      });

      it('adjusts financial score for HOA burden', async () => {
        const result = await calculatePropertyScore({
          property: mockProperty,
          externalData: { ...mockExternalData, liens: [{ type: 'hoa', amount: 20000 }] },
        });

        expect(result.financial.adjustments).toContain('hoa_lien_deduction');
      });
    });

    describe('Environmental Contamination Properties', () => {
      it('flags properties with known contamination', () => {
        const result = handleEdgeCases(
          mockProperty,
          { ...mockExternalData, environmental: { contaminated: true, type: 'brownfield' } }
        );
        expect(result.isEdgeCase).toBe(true);
        expect(result.edgeCaseType).toBe('environmental_contamination');
        expect(result.handling).toBe('environmental_assessment_required');
      });

      it('identifies contamination type', () => {
        const result = handleEdgeCases(
          mockProperty,
          { ...mockExternalData, environmental: {
            contaminated: true,
            type: 'ust',
            remediationCost: 50000
          }}
        );
        expect(result.contaminationType).toBe('ust');
        expect(result.estimatedRemediationCost).toBe(50000);
      });

      it('severely penalizes risk score for contamination', async () => {
        const cleanResult = await calculatePropertyScore({
          property: mockProperty,
          externalData: mockExternalData,
        });

        const contaminatedResult = await calculatePropertyScore({
          property: mockProperty,
          externalData: { ...mockExternalData, environmental: { contaminated: true } },
        });

        expect(contaminatedResult.risk.score).toBeLessThan(cleanResult.risk.score - 5);
      });
    });

    describe('Wetlands Properties', () => {
      it('flags properties with wetland designations', () => {
        const result = handleEdgeCases(
          mockProperty,
          { ...mockExternalData, wetlands: { present: true, percentage: 40 } }
        );
        expect(result.isEdgeCase).toBe(true);
        expect(result.edgeCaseType).toBe('wetlands');
        expect(result.warnings).toContain('Property contains protected wetlands');
      });

      it('calculates buildable area reduction', () => {
        const result = handleEdgeCases(
          { ...mockProperty, lotSizeAcres: 2.0 },
          { ...mockExternalData, wetlands: { present: true, percentage: 30 } }
        );
        expect(result.buildableAcres).toBeCloseTo(1.4, 1);
      });
    });

    describe('High Competition Area Properties', () => {
      it('flags properties in highly competitive markets', () => {
        const result = handleEdgeCases(
          mockProperty,
          { ...mockExternalData, marketData: { competitionIndex: 85 } }
        );
        expect(result.isEdgeCase).toBe(true);
        expect(result.edgeCaseType).toBe('high_competition_area');
        expect(result.recommendations).toContain('Consider maximum bid carefully');
      });

      it('adjusts profit score for competition', async () => {
        const lowCompResult = await calculatePropertyScore({
          property: mockProperty,
          externalData: { ...mockExternalData, marketData: { competitionIndex: 20 } },
        });

        const highCompResult = await calculatePropertyScore({
          property: mockProperty,
          externalData: { ...mockExternalData, marketData: { competitionIndex: 90 } },
        });

        expect(highCompResult.profit.score).toBeLessThan(lowCompResult.profit.score);
      });
    });

    describe('Declining Market Properties', () => {
      it('flags properties in declining markets', () => {
        const result = handleEdgeCases(
          mockProperty,
          { ...mockExternalData, marketData: { yearlyAppreciation: -5 } }
        );
        expect(result.isEdgeCase).toBe(true);
        expect(result.edgeCaseType).toBe('declining_market');
        expect(result.warnings).toContain('Market showing negative appreciation');
      });

      it('requires additional due diligence for declining markets', () => {
        const result = handleEdgeCases(
          mockProperty,
          { ...mockExternalData, marketData: { yearlyAppreciation: -8, monthsOfInventory: 12 } }
        );
        expect(result.handling).toBe('enhanced_market_analysis');
      });
    });

    describe('Very Small Lot Properties', () => {
      it('flags properties with very small lots', () => {
        const result = handleEdgeCases(
          { ...mockProperty, lotSizeSqft: 1500 },
          mockExternalData
        );
        expect(result.isEdgeCase).toBe(true);
        expect(result.edgeCaseType).toBe('very_small_lot');
        expect(result.warnings).toContain('Lot may be too small for standard development');
      });

      it('checks against local minimum lot requirements', () => {
        const result = handleEdgeCases(
          { ...mockProperty, lotSizeSqft: 2000, zoning: 'R-1' },
          { ...mockExternalData, zoningRequirements: { minLotSize: 5000 } }
        );
        expect(result.isEdgeCase).toBe(true);
        expect(result.edgeCaseType).toBe('very_small_lot');
        expect(result.warnings).toContain('Below minimum lot size for zoning');
      });
    });

    describe('Odd Shaped Lot Properties', () => {
      it('flags properties with irregular lot shapes', () => {
        const result = handleEdgeCases(
          { ...mockProperty, lotShape: 'flag' },
          mockExternalData
        );
        expect(result.isEdgeCase).toBe(true);
        expect(result.edgeCaseType).toBe('odd_shaped_lot');
        expect(result.warnings).toContain('Irregular lot shape may limit use');
      });

      it('calculates lot efficiency factor', () => {
        const result = handleEdgeCases(
          { ...mockProperty, lotShape: 'triangular' },
          { ...mockExternalData, parcelGeometry: { efficiency: 0.65 } }
        );
        expect(result.lotEfficiency).toBe(0.65);
        expect(result.recommendations).toContain('Review buildable envelope');
      });
    });

    describe('Sliver Lot Properties', () => {
      it('flags sliver lots (width < 20ft)', () => {
        const result = handleEdgeCases(
          { ...mockProperty, lotWidth: 15 },
          mockExternalData
        );
        expect(result.isEdgeCase).toBe(true);
        expect(result.edgeCaseType).toBe('sliver_lot');
        expect(result.handling).toBe('reject_unbuildable');
      });
    });

    describe('Cemetery Properties', () => {
      it('flags cemetery properties', () => {
        const result = handleEdgeCases(
          { ...mockProperty, landUse: 'cemetery' },
          mockExternalData
        );
        expect(result.isEdgeCase).toBe(true);
        expect(result.edgeCaseType).toBe('cemetery');
        expect(result.handling).toBe('auto_reject');
        expect(result.rejectReason).toBe('Non-investable property type');
      });
    });

    describe('Utility Property Edge Cases', () => {
      it('flags utility easement properties', () => {
        const result = handleEdgeCases(
          { ...mockProperty, landUse: 'utility_easement' },
          mockExternalData
        );
        expect(result.isEdgeCase).toBe(true);
        expect(result.edgeCaseType).toBe('utility_property');
        expect(result.handling).toBe('auto_reject');
      });
    });

    describe('Multiple Edge Cases Combination', () => {
      it('handles properties with multiple edge case conditions', () => {
        const result = handleEdgeCases(
          { ...mockProperty, yearBuilt: 1900, lotSizeSqft: 2000 },
          { ...mockExternalData, wetlands: { present: true, percentage: 20 } }
        );
        expect(result.isEdgeCase).toBe(true);
        expect(result.edgeCaseTypes).toContain('very_old_property');
        expect(result.edgeCaseTypes).toContain('very_small_lot');
        expect(result.edgeCaseTypes).toContain('wetlands');
        expect(result.combinedSeverity).toBe('high');
      });
    });
  });
});
```

---

## Location Score Tests

```typescript
// src/lib/analysis/scoring/__tests__/locationScore.test.ts

import { describe, it, expect } from 'vitest';
import { calculateLocationScore } from '../locationScore';

describe('Location Score', () => {
  const mockProperty = {
    id: 'test-123',
    propertyAddress: '456 Oak St',
    state: 'PA',
  };

  const mockExternalData = {
    walkScore: { score: 65 },
    crimeData: { index: 30, grade: 'B' },
    schoolRatings: { averageRating: 7, nearbySchools: 5 },
    nearbyAmenities: { count: 15, categories: ['grocery', 'restaurant'] },
    transitScore: { score: 40 },
  };

  it('returns score between 0 and 25', async () => {
    const result = await calculateLocationScore(
      mockProperty,
      mockExternalData,
      'single_family_residential'
    );
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(25);
  });

  it('has 5 components', async () => {
    const result = await calculateLocationScore(
      mockProperty,
      mockExternalData,
      'single_family_residential'
    );
    expect(result.components).toHaveLength(5);
  });

  it('tracks data completeness', async () => {
    const result = await calculateLocationScore(
      mockProperty,
      mockExternalData,
      'single_family_residential'
    );
    expect(result.dataCompleteness).toBeDefined();
    expect(result.dataCompleteness).toBe(100); // All data provided
  });

  it('handles missing data gracefully', async () => {
    const result = await calculateLocationScore(
      mockProperty,
      {}, // No external data
      'single_family_residential'
    );
    expect(result.score).toBeGreaterThan(0); // Should still calculate
    expect(result.confidence).toBeLessThan(100); // Lower confidence
  });

  describe('Walkability Component', () => {
    it('scores high for walk score > 70', async () => {
      const result = await calculateLocationScore(
        mockProperty,
        { ...mockExternalData, walkScore: { score: 85 } },
        'single_family_residential'
      );
      const walkComponent = result.components.find(c => c.name === 'walkability');
      expect(walkComponent?.score).toBeGreaterThan(3.5);
    });

    it('scores low for walk score < 25', async () => {
      const result = await calculateLocationScore(
        mockProperty,
        { ...mockExternalData, walkScore: { score: 15 } },
        'single_family_residential'
      );
      const walkComponent = result.components.find(c => c.name === 'walkability');
      expect(walkComponent?.score).toBeLessThan(2);
    });
  });

  describe('Crime Safety Component', () => {
    it('scores high for low crime index', async () => {
      const result = await calculateLocationScore(
        mockProperty,
        { ...mockExternalData, crimeData: { index: 10, grade: 'A' } },
        'single_family_residential'
      );
      const crimeComponent = result.components.find(c => c.name === 'crime_safety');
      expect(crimeComponent?.score).toBeGreaterThan(4);
    });

    it('scores low for high crime index', async () => {
      const result = await calculateLocationScore(
        mockProperty,
        { ...mockExternalData, crimeData: { index: 90, grade: 'F' } },
        'single_family_residential'
      );
      const crimeComponent = result.components.find(c => c.name === 'crime_safety');
      expect(crimeComponent?.score).toBeLessThan(2);
    });
  });

  describe('School Quality Component', () => {
    it('scores high for top-rated schools', async () => {
      const result = await calculateLocationScore(
        mockProperty,
        { ...mockExternalData, schoolRatings: { averageRating: 9, nearbySchools: 10 } },
        'single_family_residential'
      );
      const schoolComponent = result.components.find(c => c.name === 'school_quality');
      expect(schoolComponent?.score).toBeGreaterThan(4);
    });

    it('reduces weight for vacant land', async () => {
      const residentialResult = await calculateLocationScore(
        mockProperty,
        mockExternalData,
        'single_family_residential'
      );
      const vacantResult = await calculateLocationScore(
        mockProperty,
        mockExternalData,
        'vacant_land'
      );

      const residentialSchool = residentialResult.components.find(c => c.name === 'school_quality');
      const vacantSchool = vacantResult.components.find(c => c.name === 'school_quality');

      expect(vacantSchool?.weight).toBeLessThan(residentialSchool?.weight || 0);
    });
  });
});
```

---

## Risk Score Tests

```typescript
// src/lib/analysis/scoring/__tests__/riskScore.test.ts

import { describe, it, expect } from 'vitest';
import { calculateRiskScore } from '../riskScore';

describe('Risk Score', () => {
  const mockProperty = {
    id: 'test-123',
    state: 'PA',
    yearBuilt: 1980,
  };

  const mockExternalData = {
    fema: { floodZone: 'X', inFloodplain: false },
    usgs: { risk: 2, nearbyEvents: 0 },
    nasaFirms: { riskLevel: 1, recentFires: 0 },
  };

  it('returns score between 0 and 25', async () => {
    const result = await calculateRiskScore(mockProperty, mockExternalData);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(25);
  });

  it('has 5 risk components', async () => {
    const result = await calculateRiskScore(mockProperty, mockExternalData);
    expect(result.components).toHaveLength(5);
  });

  describe('Flood Risk', () => {
    it('scores high for Zone X (minimal flood risk)', async () => {
      const result = await calculateRiskScore(
        mockProperty,
        { ...mockExternalData, fema: { floodZone: 'X', inFloodplain: false } }
      );
      const floodComponent = result.components.find(c => c.name === 'flood_risk');
      expect(floodComponent?.score).toBeGreaterThan(4);
    });

    it('scores low for Zone AE (high flood risk)', async () => {
      const result = await calculateRiskScore(
        mockProperty,
        { ...mockExternalData, fema: { floodZone: 'AE', inFloodplain: true } }
      );
      const floodComponent = result.components.find(c => c.name === 'flood_risk');
      expect(floodComponent?.score).toBeLessThan(2);
    });

    it('applies Florida hurricane adjustment', async () => {
      const paResult = await calculateRiskScore(
        { ...mockProperty, state: 'PA' },
        mockExternalData
      );
      const flResult = await calculateRiskScore(
        { ...mockProperty, state: 'FL' },
        mockExternalData
      );

      // Florida should have higher flood risk weighting
      expect(flResult.regionAdjustment).toBeDefined();
    });
  });

  describe('Seismic Risk', () => {
    it('scores high for low seismic risk', async () => {
      const result = await calculateRiskScore(
        mockProperty,
        { ...mockExternalData, usgs: { risk: 1, nearbyEvents: 0 } }
      );
      const seismicComponent = result.components.find(c => c.name === 'seismic_risk');
      expect(seismicComponent?.score).toBeGreaterThan(4);
    });

    it('applies California earthquake adjustment', async () => {
      const caResult = await calculateRiskScore(
        { ...mockProperty, state: 'CA' },
        { ...mockExternalData, usgs: { risk: 4, nearbyEvents: 5 } }
      );
      expect(caResult.regionAdjustment).toBeDefined();
    });
  });

  describe('Fire Risk', () => {
    it('scores high for no recent fires', async () => {
      const result = await calculateRiskScore(
        mockProperty,
        { ...mockExternalData, nasaFirms: { riskLevel: 1, recentFires: 0 } }
      );
      const fireComponent = result.components.find(c => c.name === 'fire_risk');
      expect(fireComponent?.score).toBeGreaterThan(4);
    });

    it('scores low for high fire risk', async () => {
      const result = await calculateRiskScore(
        mockProperty,
        { ...mockExternalData, nasaFirms: { riskLevel: 5, recentFires: 10 } }
      );
      const fireComponent = result.components.find(c => c.name === 'fire_risk');
      expect(fireComponent?.score).toBeLessThan(2);
    });
  });

  describe('Property Age Risk', () => {
    it('scores high for newer properties', async () => {
      const result = await calculateRiskScore(
        { ...mockProperty, yearBuilt: 2015 },
        mockExternalData
      );
      const ageComponent = result.components.find(c => c.name === 'property_age');
      expect(ageComponent?.score).toBeGreaterThan(4);
    });

    it('scores low for very old properties', async () => {
      const result = await calculateRiskScore(
        { ...mockProperty, yearBuilt: 1920 },
        mockExternalData
      );
      const ageComponent = result.components.find(c => c.name === 'property_age');
      expect(ageComponent?.score).toBeLessThan(3);
    });
  });
});
```

---

## Financial Score Tests

```typescript
// src/lib/analysis/scoring/__tests__/financialScore.test.ts

import { describe, it, expect } from 'vitest';
import { calculateFinancialScore } from '../financialScore';

describe('Financial Score', () => {
  const mockProperty = {
    id: 'test-123',
    assessedValue: 100000,
    taxAmount: 5000,
    totalDue: 5000,
  };

  const mockExternalData = {
    marketValue: 150000,
    rentEstimate: { monthlyRent: 1200 },
    comparablesSoldPrice: 140000,
  };

  it('returns score between 0 and 25', async () => {
    const result = await calculateFinancialScore(mockProperty, mockExternalData);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(25);
  });

  it('has 5 financial components', async () => {
    const result = await calculateFinancialScore(mockProperty, mockExternalData);
    expect(result.components).toHaveLength(5);
  });

  describe('Tax to Value Ratio', () => {
    it('scores high for low tax burden', async () => {
      const result = await calculateFinancialScore(
        { ...mockProperty, taxAmount: 2000, assessedValue: 100000 },
        mockExternalData
      );
      const taxComponent = result.components.find(c => c.name === 'tax_value_ratio');
      expect(taxComponent?.score).toBeGreaterThan(3.5);
    });

    it('scores low for high tax burden', async () => {
      const result = await calculateFinancialScore(
        { ...mockProperty, taxAmount: 15000, assessedValue: 100000 },
        mockExternalData
      );
      const taxComponent = result.components.find(c => c.name === 'tax_value_ratio');
      expect(taxComponent?.score).toBeLessThan(2);
    });
  });

  describe('Acquisition Cost Ratio', () => {
    it('scores high when total due is small vs market value', async () => {
      const result = await calculateFinancialScore(
        { ...mockProperty, totalDue: 2000 },
        { ...mockExternalData, marketValue: 200000 }
      );
      const acqComponent = result.components.find(c => c.name === 'acquisition_ratio');
      expect(acqComponent?.score).toBeGreaterThan(4);
    });

    it('scores low when total due approaches market value', async () => {
      const result = await calculateFinancialScore(
        { ...mockProperty, totalDue: 140000 },
        { ...mockExternalData, marketValue: 150000 }
      );
      const acqComponent = result.components.find(c => c.name === 'acquisition_ratio');
      expect(acqComponent?.score).toBeLessThan(2);
    });
  });

  describe('Rent Potential', () => {
    it('calculates positive rent yield', async () => {
      const result = await calculateFinancialScore(
        mockProperty,
        { ...mockExternalData, rentEstimate: { monthlyRent: 1500 } }
      );
      const rentComponent = result.components.find(c => c.name === 'rent_potential');
      expect(rentComponent?.score).toBeGreaterThan(3);
    });

    it('handles missing rent data', async () => {
      const result = await calculateFinancialScore(
        mockProperty,
        { ...mockExternalData, rentEstimate: undefined }
      );
      const rentComponent = result.components.find(c => c.name === 'rent_potential');
      expect(rentComponent?.dataAvailable).toBe(false);
    });
  });
});
```

---

## Market Score Tests

```typescript
// src/lib/analysis/scoring/__tests__/marketScore.test.ts

import { describe, it, expect } from 'vitest';
import { calculateMarketScore } from '../marketScore';

describe('Market Score', () => {
  const mockProperty = {
    id: 'test-123',
    state: 'PA',
    county: 'Blair',
  };

  const mockExternalData = {
    marketData: {
      yearlyAppreciation: 5,
      avgDaysOnMarket: 30,
      monthsOfInventory: 3,
      salesVolume: 100,
    },
  };

  it('returns score between 0 and 25', async () => {
    const result = await calculateMarketScore(mockProperty, mockExternalData);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(25);
  });

  it('has 5 market components', async () => {
    const result = await calculateMarketScore(mockProperty, mockExternalData);
    expect(result.components).toHaveLength(5);
  });

  describe('Appreciation Trend', () => {
    it('scores high for strong appreciation', async () => {
      const result = await calculateMarketScore(
        mockProperty,
        { marketData: { ...mockExternalData.marketData, yearlyAppreciation: 8 } }
      );
      const appreciationComponent = result.components.find(c => c.name === 'appreciation_trend');
      expect(appreciationComponent?.score).toBeGreaterThan(4);
    });

    it('scores low for negative appreciation', async () => {
      const result = await calculateMarketScore(
        mockProperty,
        { marketData: { ...mockExternalData.marketData, yearlyAppreciation: -3 } }
      );
      const appreciationComponent = result.components.find(c => c.name === 'appreciation_trend');
      expect(appreciationComponent?.score).toBeLessThan(2);
    });
  });

  describe('Days on Market', () => {
    it('scores high for fast-selling market', async () => {
      const result = await calculateMarketScore(
        mockProperty,
        { marketData: { ...mockExternalData.marketData, avgDaysOnMarket: 15 } }
      );
      const domComponent = result.components.find(c => c.name === 'days_on_market');
      expect(domComponent?.score).toBeGreaterThan(4);
    });

    it('scores low for slow market', async () => {
      const result = await calculateMarketScore(
        mockProperty,
        { marketData: { ...mockExternalData.marketData, avgDaysOnMarket: 120 } }
      );
      const domComponent = result.components.find(c => c.name === 'days_on_market');
      expect(domComponent?.score).toBeLessThan(2);
    });
  });

  describe('Inventory Levels', () => {
    it('scores high for seller\'s market (low inventory)', async () => {
      const result = await calculateMarketScore(
        mockProperty,
        { marketData: { ...mockExternalData.marketData, monthsOfInventory: 2 } }
      );
      const inventoryComponent = result.components.find(c => c.name === 'inventory_levels');
      expect(inventoryComponent?.score).toBeGreaterThan(4);
    });

    it('scores low for buyer\'s market (high inventory)', async () => {
      const result = await calculateMarketScore(
        mockProperty,
        { marketData: { ...mockExternalData.marketData, monthsOfInventory: 10 } }
      );
      const inventoryComponent = result.components.find(c => c.name === 'inventory_levels');
      expect(inventoryComponent?.score).toBeLessThan(2);
    });
  });
});
```

---

## Profit Score Tests

```typescript
// src/lib/analysis/scoring/__tests__/profitScore.test.ts

import { describe, it, expect } from 'vitest';
import { calculateProfitScore } from '../profitScore';

describe('Profit Score', () => {
  const mockProperty = {
    id: 'test-123',
    totalDue: 5000,
    assessedValue: 100000,
  };

  const mockExternalData = {
    marketValue: 150000,
    rentEstimate: { monthlyRent: 1200 },
    rehabEstimate: 10000,
    comparablesSoldPrice: 145000,
  };

  it('returns score between 0 and 25', async () => {
    const result = await calculateProfitScore(mockProperty, mockExternalData);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(25);
  });

  it('has 5 profit components', async () => {
    const result = await calculateProfitScore(mockProperty, mockExternalData);
    expect(result.components).toHaveLength(5);
  });

  describe('ROI Potential', () => {
    it('scores high for high ROI potential', async () => {
      const result = await calculateProfitScore(
        { ...mockProperty, totalDue: 3000 },
        { ...mockExternalData, marketValue: 200000 }
      );
      const roiComponent = result.components.find(c => c.name === 'roi_potential');
      expect(roiComponent?.score).toBeGreaterThan(4);
    });

    it('requires data for ROI calculation', async () => {
      const result = await calculateProfitScore(
        mockProperty,
        { ...mockExternalData, marketValue: undefined }
      );
      const roiComponent = result.components.find(c => c.name === 'roi_potential');
      expect(roiComponent?.dataAvailable).toBe(false);
    });
  });

  describe('Equity Margin', () => {
    it('calculates instant equity correctly', async () => {
      const result = await calculateProfitScore(
        { ...mockProperty, totalDue: 10000 },
        { ...mockExternalData, marketValue: 150000 }
      );
      const equityComponent = result.components.find(c => c.name === 'equity_margin');
      // (150000 - 10000) / 150000 = 93% equity margin
      expect(equityComponent?.score).toBeGreaterThan(4);
    });
  });

  describe('Cash Flow Potential', () => {
    it('scores high for positive cash flow', async () => {
      const result = await calculateProfitScore(
        { ...mockProperty, totalDue: 30000 },
        { ...mockExternalData, rentEstimate: { monthlyRent: 1500 } }
      );
      const cashFlowComponent = result.components.find(c => c.name === 'cash_flow');
      expect(cashFlowComponent?.score).toBeGreaterThan(3);
    });
  });

  describe('Exit Strategy Score', () => {
    it('considers multiple exit options', async () => {
      const result = await calculateProfitScore(mockProperty, mockExternalData);
      const exitComponent = result.components.find(c => c.name === 'exit_strategy');
      expect(exitComponent?.details?.exitOptions).toBeDefined();
    });
  });
});
```

---

## Edge Case Test Scenarios

```typescript
// src/lib/analysis/scoring/__tests__/edgeCases.test.ts

import { describe, it, expect } from 'vitest';
import { calculatePropertyScore } from '../index';
import { handleEdgeCases } from '../edgeCases';

describe('Edge Case Scenarios', () => {
  const baseProperty = {
    id: 'test-123',
    parcelId: '01.01-04..-156.00-000',
    propertyAddress: '456 Oak St',
    state: 'PA',
  };

  const baseExternalData = {
    marketValue: 150000,
    rentEstimate: { monthlyRent: 1200 },
  };

  describe('Zero Value Properties', () => {
    it('handles $0 assessed value', async () => {
      const result = await calculatePropertyScore({
        property: { ...baseProperty, assessedValue: 0 },
        externalData: baseExternalData,
      });

      expect(result.totalScore).toBeDefined();
      expect(result.warnings).toContain('Zero assessed value');
    });

    it('handles $0 total due', async () => {
      const result = await calculatePropertyScore({
        property: { ...baseProperty, totalDue: 0 },
        externalData: baseExternalData,
      });

      expect(result.totalScore).toBeDefined();
      expect(result.warnings).toContain('Zero total due amount');
    });

    it('handles $0 market value', async () => {
      const result = await calculatePropertyScore({
        property: baseProperty,
        externalData: { ...baseExternalData, marketValue: 0 },
      });

      expect(result.financial.components.find(c => c.name === 'roi_potential')?.dataAvailable).toBe(false);
    });
  });

  describe('Null Data Properties', () => {
    it('handles null market data', async () => {
      const result = await calculatePropertyScore({
        property: baseProperty,
        externalData: {},
      });

      expect(result.totalScore).toBeDefined();
      expect(result.confidenceLevel.overall).toBeLessThan(80);
    });

    it('handles null year built', async () => {
      const result = await calculatePropertyScore({
        property: { ...baseProperty, yearBuilt: null },
        externalData: baseExternalData,
      });

      expect(result.risk.components.find(c => c.name === 'property_age')?.dataAvailable).toBe(false);
    });
  });

  describe('Very Old Properties', () => {
    it('flags 100+ year old properties', () => {
      const result = handleEdgeCases(
        { ...baseProperty, yearBuilt: 1910 },
        baseExternalData
      );

      expect(result.isEdgeCase).toBe(true);
      expect(result.edgeCaseType).toBe('very_old_property');
      expect(result.warnings).toContain('Property built over 100 years ago');
    });

    it('applies age penalty to risk score', async () => {
      const newPropertyResult = await calculatePropertyScore({
        property: { ...baseProperty, yearBuilt: 2020 },
        externalData: baseExternalData,
      });

      const oldPropertyResult = await calculatePropertyScore({
        property: { ...baseProperty, yearBuilt: 1900 },
        externalData: baseExternalData,
      });

      expect(oldPropertyResult.risk.score).toBeLessThan(newPropertyResult.risk.score);
    });
  });

  describe('Vacant Land Properties', () => {
    it('detects vacant land from zero building sqft', () => {
      const result = handleEdgeCases(
        { ...baseProperty, buildingSqft: 0 },
        baseExternalData
      );

      expect(result.isEdgeCase).toBe(true);
      expect(result.edgeCaseType).toBe('no_structure');
    });

    it('adjusts location weights for vacant land', async () => {
      const result = await calculatePropertyScore({
        property: { ...baseProperty, buildingSqft: 0 },
        externalData: baseExternalData,
      });

      expect(result.propertyType).toBe('vacant_land');
      // School quality should have lower weight for vacant land
      const schoolComponent = result.location.components.find(c => c.name === 'school_quality');
      expect(schoolComponent?.weight).toBeLessThan(1.0);
    });

    it('disables rent-related scoring for vacant land', async () => {
      const result = await calculatePropertyScore({
        property: { ...baseProperty, buildingSqft: 0 },
        externalData: baseExternalData,
      });

      const rentComponent = result.financial.components.find(c => c.name === 'rent_potential');
      expect(rentComponent?.applicableToPropertyType).toBe(false);
    });
  });

  describe('Extreme Value Properties', () => {
    it('flags extremely low value properties (< $1,000 total due)', () => {
      const result = handleEdgeCases(
        { ...baseProperty, totalDue: 500 },
        baseExternalData
      );

      expect(result.isEdgeCase).toBe(true);
      expect(result.warnings).toContain('Extremely low total due amount');
    });

    it('flags extremely high value properties (> $1M)', () => {
      const result = handleEdgeCases(
        { ...baseProperty, assessedValue: 2000000 },
        baseExternalData
      );

      expect(result.isEdgeCase).toBe(true);
      expect(result.edgeCaseType).toBe('high_value_property');
    });
  });

  describe('Regional Edge Cases', () => {
    it('applies Florida hurricane risk adjustment', async () => {
      const result = await calculatePropertyScore({
        property: { ...baseProperty, state: 'FL' },
        externalData: baseExternalData,
      });

      expect(result.regionAdjustments).toContain('hurricane_risk');
    });

    it('applies California earthquake adjustment', async () => {
      const result = await calculatePropertyScore({
        property: { ...baseProperty, state: 'CA' },
        externalData: baseExternalData,
      });

      expect(result.regionAdjustments).toContain('earthquake_risk');
    });

    it('applies Texas property tax adjustment', async () => {
      const result = await calculatePropertyScore({
        property: { ...baseProperty, state: 'TX' },
        externalData: baseExternalData,
      });

      expect(result.regionAdjustments).toContain('high_property_tax');
    });
  });

  describe('Data Consistency Edge Cases', () => {
    it('handles assessed value higher than market value', async () => {
      const result = await calculatePropertyScore({
        property: { ...baseProperty, assessedValue: 200000 },
        externalData: { ...baseExternalData, marketValue: 100000 },
      });

      expect(result.warnings).toContain('Assessed value exceeds market value');
    });

    it('handles future year built', async () => {
      const result = await calculatePropertyScore({
        property: { ...baseProperty, yearBuilt: 2030 },
        externalData: baseExternalData,
      });

      expect(result.warnings).toContain('Invalid year built');
    });

    it('handles negative values gracefully', async () => {
      const result = await calculatePropertyScore({
        property: { ...baseProperty, assessedValue: -5000 },
        externalData: baseExternalData,
      });

      expect(result.warnings).toContain('Negative value detected');
    });
  });
});
```

---

## Integration Testing

```typescript
// src/lib/analysis/scoring/__tests__/integration.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { calculatePropertyScore } from '../index';
import { createClient } from '@supabase/supabase-js';

describe('Scoring System Integration', () => {
  let supabase: ReturnType<typeof createClient>;
  let testPropertyId: string;

  beforeAll(async () => {
    // Setup test database connection
    supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Get a real property for testing
    const { data: property } = await supabase
      .from('properties')
      .select('*')
      .limit(1)
      .single();

    testPropertyId = property?.id;
  });

  describe('Database Integration', () => {
    it('stores scoring results in database', async () => {
      const property = {
        id: testPropertyId,
        parcelId: 'test-parcel',
        assessedValue: 100000,
        state: 'PA',
      };

      const result = await calculatePropertyScore({
        property,
        externalData: { marketValue: 150000 },
        saveToDatabase: true,
        supabase,
      });

      // Verify score was saved
      const { data: savedScore } = await supabase
        .from('property_scores')
        .select('*')
        .eq('property_id', testPropertyId)
        .single();

      expect(savedScore).toBeDefined();
      expect(savedScore?.total_score).toBe(result.totalScore);
    });

    it('updates existing score on recalculation', async () => {
      const property = {
        id: testPropertyId,
        parcelId: 'test-parcel',
        assessedValue: 100000,
        state: 'PA',
      };

      // First calculation
      await calculatePropertyScore({
        property,
        externalData: { marketValue: 150000 },
        saveToDatabase: true,
        supabase,
      });

      // Second calculation with different data
      const result = await calculatePropertyScore({
        property,
        externalData: { marketValue: 200000 },
        saveToDatabase: true,
        supabase,
      });

      // Verify only one record exists (updated, not duplicated)
      const { data: scores } = await supabase
        .from('property_scores')
        .select('*')
        .eq('property_id', testPropertyId);

      expect(scores?.length).toBe(1);
      expect(scores?.[0].total_score).toBe(result.totalScore);
    });
  });

  describe('External API Integration', () => {
    it('fetches and uses walk score data', async () => {
      const property = {
        id: 'test-123',
        propertyAddress: '456 Oak St, Altoona, PA 16602',
        latitude: 40.5089,
        longitude: -78.3947,
      };

      const result = await calculatePropertyScore({
        property,
        fetchExternalData: true,
      });

      // Walk score should be fetched and used
      const walkComponent = result.location.components.find(c => c.name === 'walkability');
      expect(walkComponent?.dataSource).toBe('walk_score_api');
    });

    it('gracefully handles API failures', async () => {
      const property = {
        id: 'test-123',
        propertyAddress: 'Invalid Address',
        latitude: 0,
        longitude: 0,
      };

      // Should not throw, should use fallback scoring
      const result = await calculatePropertyScore({
        property,
        fetchExternalData: true,
      });

      expect(result.totalScore).toBeDefined();
      expect(result.confidenceLevel.overall).toBeLessThan(100);
    });
  });

  describe('Batch Processing', () => {
    it('processes multiple properties in batch', async () => {
      const properties = [
        { id: 'test-1', assessedValue: 100000, state: 'PA' },
        { id: 'test-2', assessedValue: 150000, state: 'PA' },
        { id: 'test-3', assessedValue: 200000, state: 'PA' },
      ];

      const results = await Promise.all(
        properties.map(p => calculatePropertyScore({
          property: p,
          externalData: { marketValue: p.assessedValue * 1.5 },
        }))
      );

      expect(results).toHaveLength(3);
      results.forEach(r => {
        expect(r.totalScore).toBeGreaterThanOrEqual(0);
        expect(r.totalScore).toBeLessThanOrEqual(125);
      });
    });

    it('handles batch with mixed data quality', async () => {
      const properties = [
        { id: 'test-1', assessedValue: 100000, yearBuilt: 1980, state: 'PA' },
        { id: 'test-2', assessedValue: null, yearBuilt: null, state: 'PA' }, // Poor data
        { id: 'test-3', assessedValue: 200000, yearBuilt: 2020, state: 'PA' },
      ];

      const results = await Promise.all(
        properties.map(p => calculatePropertyScore({
          property: p,
          externalData: {},
        }))
      );

      // All should complete without errors
      expect(results).toHaveLength(3);

      // Property with poor data should have lower confidence
      expect(results[1].confidenceLevel.overall).toBeLessThan(results[0].confidenceLevel.overall);
    });
  });

  describe('Performance', () => {
    it('calculates score within acceptable time', async () => {
      const property = {
        id: 'test-123',
        assessedValue: 100000,
        state: 'PA',
      };

      const start = Date.now();
      await calculatePropertyScore({
        property,
        externalData: { marketValue: 150000 },
      });
      const duration = Date.now() - start;

      // Should complete within 500ms (without external API calls)
      expect(duration).toBeLessThan(500);
    });

    it('handles concurrent calculations efficiently', async () => {
      const properties = Array.from({ length: 10 }, (_, i) => ({
        id: `test-${i}`,
        assessedValue: 100000 + i * 10000,
        state: 'PA',
      }));

      const start = Date.now();
      await Promise.all(
        properties.map(p => calculatePropertyScore({
          property: p,
          externalData: { marketValue: p.assessedValue * 1.5 },
        }))
      );
      const duration = Date.now() - start;

      // 10 concurrent calculations should complete within 2 seconds
      expect(duration).toBeLessThan(2000);
    });
  });

  describe('Concurrent Operations Tests', () => {
    it('handles parallel external API calls correctly', async () => {
      const properties = Array.from({ length: 5 }, (_, i) => ({
        id: `parallel-test-${i}`,
        propertyAddress: `${100 + i} Main St, Pittsburgh, PA 15213`,
        latitude: 40.4406 + i * 0.001,
        longitude: -79.9959 + i * 0.001,
      }));

      const results = await Promise.all(
        properties.map(p => calculatePropertyScore({
          property: p,
          fetchExternalData: true,
        }))
      );

      // All requests should complete without collision
      expect(results).toHaveLength(5);
      results.forEach((r, i) => {
        expect(r.propertyId).toBe(`parallel-test-${i}`);
        expect(r.totalScore).toBeDefined();
      });
    });

    it('maintains data integrity during concurrent database writes', async () => {
      const properties = Array.from({ length: 3 }, (_, i) => ({
        id: `db-concurrent-${i}`,
        assessedValue: 100000,
        state: 'PA',
      }));

      // Write concurrently
      const writePromises = properties.map(p =>
        calculatePropertyScore({
          property: p,
          externalData: { marketValue: 150000 },
          saveToDatabase: true,
          supabase,
        })
      );

      await Promise.all(writePromises);

      // Verify all writes succeeded
      const { data: savedScores } = await supabase
        .from('property_scores')
        .select('*')
        .in('property_id', properties.map(p => p.id));

      expect(savedScores?.length).toBe(3);
    });

    it('handles rate limiting behavior gracefully', async () => {
      // Simulate rapid-fire requests that might trigger rate limiting
      const rapidRequests = Array.from({ length: 20 }, (_, i) => ({
        id: `rapid-${i}`,
        assessedValue: 100000,
        state: 'PA',
      }));

      const start = Date.now();
      const results = await Promise.allSettled(
        rapidRequests.map(p => calculatePropertyScore({
          property: p,
          fetchExternalData: true,
          rateLimitRetry: true,
        }))
      );

      // All should eventually complete (with retries if needed)
      const fulfilled = results.filter(r => r.status === 'fulfilled');
      expect(fulfilled.length).toBeGreaterThanOrEqual(18); // Allow some failures

      // Check that retries happened (duration would be longer)
      const duration = Date.now() - start;
      expect(duration).toBeGreaterThan(0);
    });

    it('handles cache hit vs miss performance difference', async () => {
      const property = {
        id: 'cache-test',
        propertyAddress: '456 Oak St, Altoona, PA 16602',
        latitude: 40.5089,
        longitude: -78.3947,
      };

      // First call - cache miss
      const startMiss = Date.now();
      await calculatePropertyScore({
        property,
        fetchExternalData: true,
        useCache: true,
      });
      const missDuration = Date.now() - startMiss;

      // Second call - cache hit
      const startHit = Date.now();
      await calculatePropertyScore({
        property,
        fetchExternalData: true,
        useCache: true,
      });
      const hitDuration = Date.now() - startHit;

      // Cache hit should be significantly faster
      expect(hitDuration).toBeLessThan(missDuration * 0.5);
    });

    it('isolates failures in concurrent batch processing', async () => {
      const properties = [
        { id: 'good-1', assessedValue: 100000, state: 'PA' },
        { id: 'bad-1', assessedValue: null, state: null }, // Will fail
        { id: 'good-2', assessedValue: 150000, state: 'PA' },
        { id: 'bad-2', assessedValue: -1, state: 'XX' }, // Will fail
        { id: 'good-3', assessedValue: 200000, state: 'PA' },
      ];

      const results = await Promise.allSettled(
        properties.map(p => calculatePropertyScore({
          property: p,
          externalData: { marketValue: p.assessedValue ? p.assessedValue * 1.5 : 0 },
        }))
      );

      // Good properties should succeed
      expect(results[0].status).toBe('fulfilled');
      expect(results[2].status).toBe('fulfilled');
      expect(results[4].status).toBe('fulfilled');

      // Failures should be isolated, not affect others
      const fulfilledCount = results.filter(r => r.status === 'fulfilled').length;
      expect(fulfilledCount).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Fallback Chain Tests', () => {
    it('falls back to secondary API when primary fails', async () => {
      const property = {
        id: 'fallback-test',
        propertyAddress: '456 Oak St, Altoona, PA 16602',
        latitude: 40.5089,
        longitude: -78.3947,
      };

      // Mock primary API failure
      const result = await calculatePropertyScore({
        property,
        fetchExternalData: true,
        mockApiFailure: { walkScore: true }, // Simulate Walk Score API failure
      });

      // Should still get a score using fallback
      const walkComponent = result.location.components.find(c => c.name === 'walkability');
      expect(walkComponent?.dataSource).toBe('fallback_estimation');
      expect(walkComponent?.dataAvailable).toBe(true);
      expect(result.totalScore).toBeDefined();
    });

    it('handles complete API failure with graceful degradation', async () => {
      const property = {
        id: 'complete-failure-test',
        assessedValue: 100000,
        state: 'PA',
      };

      // Mock all external APIs failing
      const result = await calculatePropertyScore({
        property,
        fetchExternalData: true,
        mockApiFailure: {
          walkScore: true,
          crimeData: true,
          fema: true,
          marketData: true,
        },
      });

      // Should still calculate a score with defaults
      expect(result.totalScore).toBeDefined();
      expect(result.totalScore).toBeGreaterThan(0);
      expect(result.confidenceLevel.overall).toBeLessThan(60);
      expect(result.warnings).toContain('External data unavailable, using defaults');
    });

    it('uses cached data when API fails on retry', async () => {
      const property = {
        id: 'cache-fallback-test',
        propertyAddress: '456 Oak St, Altoona, PA 16602',
      };

      // First call succeeds and caches
      await calculatePropertyScore({
        property,
        fetchExternalData: true,
        useCache: true,
      });

      // Second call with API failure should use cache
      const result = await calculatePropertyScore({
        property,
        fetchExternalData: true,
        useCache: true,
        mockApiFailure: { walkScore: true },
      });

      const walkComponent = result.location.components.find(c => c.name === 'walkability');
      expect(walkComponent?.dataSource).toBe('cache');
    });

    it('cascades through fallback chain in order', async () => {
      const property = {
        id: 'cascade-test',
        propertyAddress: '456 Oak St, Altoona, PA 16602',
        state: 'PA',
        county: 'Blair',
      };

      // Test fallback order: API -> Cache -> County Average -> State Average -> Default
      const result = await calculatePropertyScore({
        property,
        fetchExternalData: true,
        mockApiFailure: { walkScore: true },
        mockCacheMiss: true,
        countyAverages: { walkability: 45 },
      });

      const walkComponent = result.location.components.find(c => c.name === 'walkability');
      expect(walkComponent?.dataSource).toBe('county_average');
      expect(walkComponent?.score).toBeCloseTo(2.25, 1); // 45/100 * 5 = 2.25
    });

    it('logs fallback chain progression', async () => {
      const property = {
        id: 'log-fallback-test',
        assessedValue: 100000,
        state: 'PA',
      };

      const result = await calculatePropertyScore({
        property,
        fetchExternalData: true,
        mockApiFailure: { walkScore: true, crimeData: true },
        verbose: true,
      });

      expect(result.fallbackLog).toBeDefined();
      expect(result.fallbackLog).toContainEqual({
        component: 'walkability',
        attempted: ['api', 'cache', 'county_average'],
        success: 'county_average',
      });
    });

    it('respects timeout and falls back appropriately', async () => {
      const property = {
        id: 'timeout-test',
        propertyAddress: 'Slow API Address',
      };

      const start = Date.now();
      const result = await calculatePropertyScore({
        property,
        fetchExternalData: true,
        apiTimeout: 100, // Very short timeout
      });
      const duration = Date.now() - start;

      // Should have timed out and used fallback quickly
      expect(duration).toBeLessThan(500);
      expect(result.warnings).toContain('API timeout, using fallback data');
    });

    it('accumulates partial data from multiple fallback sources', async () => {
      const property = {
        id: 'partial-fallback-test',
        assessedValue: 100000,
        state: 'PA',
      };

      const result = await calculatePropertyScore({
        property,
        fetchExternalData: true,
        mockApiFailure: { walkScore: true, crimeData: true },
        mockPartialApiSuccess: {
          schoolRatings: { averageRating: 7 },
          transitScore: { score: 50 },
        },
      });

      // Should have mixed data sources
      const schoolComponent = result.location.components.find(c => c.name === 'school_quality');
      const transitComponent = result.location.components.find(c => c.name === 'transit_access');
      const walkComponent = result.location.components.find(c => c.name === 'walkability');

      expect(schoolComponent?.dataSource).toBe('api');
      expect(transitComponent?.dataSource).toBe('api');
      expect(walkComponent?.dataSource).toBe('fallback_estimation');
    });
  });

  afterAll(async () => {
    // Cleanup test data
    if (testPropertyId) {
      await supabase
        .from('property_scores')
        .delete()
        .eq('property_id', testPropertyId);
    }
  });
});
```

---

## Verification Checklist

### 1. Grade Calculation Consistency

- [ ] Verify percentage-based thresholds work correctly at boundaries
- [ ] Test that 80% (100 points) = A
- [ ] Test that 60% (75 points) = B
- [ ] Test that 40% (50 points) = C
- [ ] Test that 20% (25 points) = D
- [ ] Test that <20% (<25 points) = F
- [ ] Verify boundary cases (99.99 vs 100.0)

### 2. Missing Data Handling

- [ ] Test each component with missing data
- [ ] Verify confidence penalties are applied correctly:
  - Crime safety: -25% penalty
  - Walkability: -10% penalty
  - ROI: requires data (0 score)
- [ ] Check that required data components properly flag issues
- [ ] Verify fallback strategies are correct per component

### 3. Property Type Scoring

- [ ] Test that vacant land reduces location component weights
- [ ] Test that commercial properties emphasize walkability
- [ ] Verify weight adjustments are within expected ranges (0.5-1.5x)
- [ ] Test property type detection from:
  - Direct property type field
  - Building sqft = 0 (vacant land)
  - Zoning codes

### 4. Regional Adjustments

- [ ] Test Florida hurricane risk adjustment
- [ ] Test California earthquake adjustment
- [ ] Test Texas property tax adjustment
- [ ] Verify adjustments don't exceed reasonable bounds (-5 to +5 points)
- [ ] Test states without adjustments remain unaffected

### 5. Edge Cases

- [ ] Test properties with $0 assessed value
- [ ] Test properties with null market data
- [ ] Test 100+ year old properties
- [ ] Test vacant land properties
- [ ] Test extremely low value (<$1,000 due)
- [ ] Test extremely high value (>$1M)
- [ ] Test negative values
- [ ] Test future year built dates
- [ ] Test assessed value > market value

### 6. Confidence Calculation

- [ ] Test with full data availability (should be ~100%)
- [ ] Test with minimal data (should be <60%)
- [ ] Verify factors are correctly weighted
- [ ] Check recommendations are generated for low confidence
- [ ] Verify confidence breakdown by category

### 7. Calibration Framework

- [ ] Verify category weight sums equal 125:
  - Location: 25
  - Risk: 25
  - Financial: 25
  - Market: 25
  - Profit: 25
- [ ] Test component weight sums within each category equal 5
- [ ] Verify calibration adjustments apply correctly
- [ ] Test correlation calculations with sample data

### 8. Database Operations

- [ ] Verify scores are saved correctly
- [ ] Verify updates don't create duplicates
- [ ] Check score history is preserved if enabled
- [ ] Verify JSON fields are properly serialized

### 9. Performance Requirements

- [ ] Single property calculation < 500ms
- [ ] Batch of 10 properties < 2 seconds
- [ ] Concurrent calculations don't degrade performance
- [ ] Memory usage remains stable during batch processing

### 10. API Integration

- [ ] Walk Score API integration works
- [ ] FEMA flood zone API integration works
- [ ] Graceful fallback when APIs fail
- [ ] Rate limiting is respected
- [ ] API errors don't crash calculations

---

## Running the Tests

```bash
# Run all scoring tests
npm run test -- --grep "Scoring"

# Run specific test file
npm run test -- src/lib/analysis/scoring/__tests__/scoring.test.ts

# Run with coverage
npm run test:coverage -- --grep "Scoring"

# Run integration tests (requires .env.test)
npm run test:integration -- --grep "Scoring System Integration"

# Run edge case tests only
npm run test -- --grep "Edge Case"
```

---

## Test Data Fixtures

```typescript
// src/lib/analysis/scoring/__tests__/fixtures.ts

export const mockProperties = {
  standard: {
    id: 'prop-standard',
    parcelId: '01.01-04..-156.00-000',
    propertyAddress: '456 Oak St, Altoona, PA 16602',
    assessedValue: 100000,
    taxAmount: 5000,
    totalDue: 5000,
    yearBuilt: 1980,
    buildingSqft: 1500,
    state: 'PA',
  },

  vacantLand: {
    id: 'prop-vacant',
    parcelId: '02.03-05..-089.00-000',
    propertyAddress: 'Lot 5 Industrial Blvd, Altoona, PA 16602',
    assessedValue: 25000,
    taxAmount: 1000,
    totalDue: 1000,
    yearBuilt: null,
    buildingSqft: 0,
    state: 'PA',
  },

  oldProperty: {
    id: 'prop-old',
    parcelId: '03.04-06..-234.00-000',
    propertyAddress: '123 Historic Ave, Altoona, PA 16602',
    assessedValue: 80000,
    taxAmount: 4000,
    totalDue: 4000,
    yearBuilt: 1890,
    buildingSqft: 2000,
    state: 'PA',
  },

  highValue: {
    id: 'prop-highvalue',
    parcelId: '04.05-07..-345.00-000',
    propertyAddress: '999 Luxury Lane, Pittsburgh, PA 15213',
    assessedValue: 1500000,
    taxAmount: 50000,
    totalDue: 50000,
    yearBuilt: 2010,
    buildingSqft: 5000,
    state: 'PA',
  },

  florida: {
    id: 'prop-florida',
    parcelId: '12-34-56-7890',
    propertyAddress: '100 Beach Rd, Miami, FL 33139',
    assessedValue: 350000,
    taxAmount: 7000,
    totalDue: 7000,
    yearBuilt: 2005,
    buildingSqft: 1800,
    state: 'FL',
  },

  california: {
    id: 'prop-california',
    parcelId: '001-234-567',
    propertyAddress: '500 Valley Blvd, Los Angeles, CA 90012',
    assessedValue: 750000,
    taxAmount: 8000,
    totalDue: 8000,
    yearBuilt: 1995,
    buildingSqft: 1600,
    state: 'CA',
  },

  // Additional diverse test fixtures
  ruralMinimalData: {
    id: 'prop-rural-minimal',
    parcelId: '99.99-01..-001.00-000',
    propertyAddress: 'Rural Route 7, Box 42, Clearfield County, PA 16830',
    assessedValue: 35000,
    taxAmount: 800,
    totalDue: 2400, // Multiple years delinquent
    yearBuilt: null, // Unknown
    buildingSqft: null, // Unknown
    lotSizeAcres: 15.5,
    state: 'PA',
    county: 'Clearfield',
    // Minimal external data available for rural properties
    walkScore: null,
    transitScore: null,
    schoolRatings: null,
  },

  urbanCondoFullData: {
    id: 'prop-urban-condo',
    parcelId: '15.20-30..-456.00-001',
    propertyAddress: 'Unit 1204, The Tower, 500 Market St, Philadelphia, PA 19106',
    assessedValue: 425000,
    taxAmount: 9500,
    totalDue: 9500,
    yearBuilt: 2018,
    buildingSqft: 1200,
    bedrooms: 2,
    bathrooms: 2,
    lotSizeAcres: 0, // Condo - no land
    state: 'PA',
    county: 'Philadelphia',
    propertyType: 'Condominium',
    zoning: 'C-4',
    // Full data available for urban properties
    hoaFees: 450,
    parkingSpaces: 1,
    amenities: ['gym', 'pool', 'doorman', 'rooftop'],
    latitude: 39.9526,
    longitude: -75.1652,
  },

  taxDeedWithTitleIssues: {
    id: 'prop-title-issues',
    parcelId: '07.08-09..-123.00-000',
    propertyAddress: '789 Disputed Lane, Altoona, PA 16601',
    assessedValue: 65000,
    taxAmount: 3200,
    totalDue: 3200,
    yearBuilt: 1965,
    buildingSqft: 1100,
    state: 'PA',
    county: 'Blair',
    saleType: 'judicial',
    saleDate: '2026-03-15',
    // Title issues
    titleStatus: 'clouded',
    titleIssues: ['heir_dispute', 'missing_deed_1985'],
    liens: [
      { type: 'irs', amount: 12000, priority: 1 },
      { type: 'municipal', amount: 3500, priority: 2 },
    ],
  },

  repositoryPropertyOngoing: {
    id: 'prop-repository-ongoing',
    parcelId: '11.12-13..-789.00-000',
    propertyAddress: '321 Repository Rd, Somerset, PA 15501',
    assessedValue: 28000,
    taxAmount: 1500,
    totalDue: 8500, // Accumulated over years
    yearBuilt: 1955,
    buildingSqft: 900,
    state: 'PA',
    county: 'Somerset',
    saleType: 'repository', // Ongoing - no expiration
    auctionStatus: 'active',
    // Repository properties often have more issues
    condition: 'poor',
    occupancyStatus: 'vacant',
    yearsDelinquent: 5,
    previousSaleAttempts: 2,
    minimumBid: 500, // Repository minimum
  },

  floodZoneProperty: {
    id: 'prop-flood-zone',
    parcelId: '20.21-22..-333.00-000',
    propertyAddress: '100 Riverside Dr, Johnstown, PA 15901',
    assessedValue: 95000,
    taxAmount: 2800,
    totalDue: 5600,
    yearBuilt: 1978,
    buildingSqft: 1650,
    state: 'PA',
    county: 'Cambria',
    // Flood zone specific data
    femaFloodZone: 'AE',
    inFloodplain: true,
    floodInsuranceRequired: true,
    baseFloodElevation: 1150,
    propertyElevation: 1148, // Below BFE
    previousFloodDamage: true,
    floodDamageYear: 2018,
    latitude: 40.3267,
    longitude: -78.9220,
  },

  coastalProperty: {
    id: 'prop-coastal',
    parcelId: '45-67-89-0123',
    propertyAddress: '1500 Ocean Blvd, Fort Lauderdale, FL 33304',
    assessedValue: 850000,
    taxAmount: 15000,
    totalDue: 30000, // 2 years delinquent
    yearBuilt: 1995,
    buildingSqft: 2200,
    bedrooms: 4,
    bathrooms: 3,
    lotSizeAcres: 0.25,
    state: 'FL',
    county: 'Broward',
    // Coastal-specific risks
    coastalErosionRisk: 'high',
    hurricaneZone: 'HVHZ', // High Velocity Hurricane Zone
    windMitigation: {
      roofShape: 'hip',
      roofCovering: 'concrete_tile',
      roofDeckAttachment: 'A',
      roofToWallConnection: 'clips',
      openingProtection: 'hurricane_shutters',
    },
    distanceToWater: 500, // feet
    seaLevelRiseRisk: 'moderate',
    floodZone: 'VE',
    latitude: 26.1224,
    longitude: -80.1373,
  },

  mobileHomeProperty: {
    id: 'prop-mobile-home',
    parcelId: '33.44-55..-666.00-000',
    propertyAddress: 'Lot 45, Happy Valley MHP, Indiana, PA 15701',
    assessedValue: 18000,
    taxAmount: 600,
    totalDue: 1800,
    yearBuilt: 1992,
    buildingSqft: 840,
    state: 'PA',
    county: 'Indiana',
    propertyType: 'Manufactured Home',
    // Mobile home specific
    mobileHomeType: 'singlewide',
    permanentFoundation: false,
    lotRent: 350, // Monthly
    hudCode: true,
    titleType: 'personal_property', // Not real estate in many states
  },

  commercialMixedUse: {
    id: 'prop-commercial-mixed',
    parcelId: '50.51-52..-100.00-000',
    propertyAddress: '200 Main Street, Altoona, PA 16601',
    assessedValue: 320000,
    taxAmount: 12000,
    totalDue: 24000,
    yearBuilt: 1920,
    buildingSqft: 8000,
    state: 'PA',
    county: 'Blair',
    propertyType: 'Mixed Use',
    zoning: 'C-2',
    // Mixed use specific
    units: [
      { type: 'retail', sqft: 3000, floor: 1, currentRent: 2500, vacant: false },
      { type: 'retail', sqft: 2500, floor: 1, currentRent: null, vacant: true },
      { type: 'residential', sqft: 1200, floor: 2, currentRent: 900, vacant: false },
      { type: 'residential', sqft: 1300, floor: 2, currentRent: 950, vacant: false },
    ],
    totalUnits: 4,
    occupancyRate: 0.75,
  },

  environmentalConcernProperty: {
    id: 'prop-environmental',
    parcelId: '60.61-62..-777.00-000',
    propertyAddress: '500 Industrial Park Rd, Altoona, PA 16602',
    assessedValue: 150000,
    taxAmount: 4500,
    totalDue: 4500,
    yearBuilt: 1960,
    buildingSqft: 5000,
    lotSizeAcres: 2.5,
    state: 'PA',
    county: 'Blair',
    propertyType: 'Industrial',
    zoning: 'I-1',
    // Environmental issues
    environmentalStatus: 'brownfield',
    contaminationType: ['petroleum', 'metals'],
    epaSuperfund: false,
    stateCleanupList: true,
    phase1Complete: true,
    phase2Complete: true,
    estimatedRemediationCost: 75000,
    previousUse: 'gas_station',
  },

  landlordTaxLienProperty: {
    id: 'prop-landlord-liens',
    parcelId: '70.71-72..-888.00-000',
    propertyAddress: '888 Rental Row, Altoona, PA 16601',
    assessedValue: 180000,
    taxAmount: 5400,
    totalDue: 16200, // 3 years
    yearBuilt: 1975,
    buildingSqft: 2400,
    state: 'PA',
    county: 'Blair',
    propertyType: 'Multi-Family',
    // Rental specific
    units: 4,
    currentRents: [850, 800, 875, 0], // One vacant
    occupancyRate: 0.75,
    // Multiple liens typical of distressed landlord
    liens: [
      { type: 'property_tax', amount: 16200, priority: 1 },
      { type: 'water_sewer', amount: 4500, priority: 2 },
      { type: 'code_violation', amount: 8000, priority: 3 },
      { type: 'contractor', amount: 12000, priority: 4 },
    ],
    codeViolations: ['electrical', 'hvac', 'roof'],
  },
};

export const mockExternalData = {
  complete: {
    walkScore: { score: 65 },
    crimeData: { index: 30, grade: 'B' },
    schoolRatings: { averageRating: 7, nearbySchools: 5 },
    nearbyAmenities: { count: 15, categories: ['grocery', 'restaurant'] },
    transitScore: { score: 40 },
    fema: { floodZone: 'X', inFloodplain: false },
    usgs: { risk: 2, nearbyEvents: 0 },
    nasaFirms: { riskLevel: 1, recentFires: 0 },
    marketValue: 150000,
    marketData: {
      yearlyAppreciation: 5,
      avgDaysOnMarket: 30,
      monthsOfInventory: 3,
    },
    rentEstimate: { monthlyRent: 1200 },
  },

  minimal: {
    marketValue: 150000,
  },

  highRisk: {
    walkScore: { score: 20 },
    crimeData: { index: 80, grade: 'D' },
    fema: { floodZone: 'AE', inFloodplain: true },
    usgs: { risk: 4, nearbyEvents: 3 },
    nasaFirms: { riskLevel: 4, recentFires: 5 },
    marketValue: 100000,
    marketData: {
      yearlyAppreciation: -2,
      avgDaysOnMarket: 120,
      monthsOfInventory: 12,
    },
  },

  excellent: {
    walkScore: { score: 90 },
    crimeData: { index: 10, grade: 'A' },
    schoolRatings: { averageRating: 9, nearbySchools: 10 },
    nearbyAmenities: { count: 50, categories: ['grocery', 'restaurant', 'gym', 'park'] },
    transitScore: { score: 85 },
    fema: { floodZone: 'X', inFloodplain: false },
    usgs: { risk: 1, nearbyEvents: 0 },
    nasaFirms: { riskLevel: 1, recentFires: 0 },
    marketValue: 200000,
    marketData: {
      yearlyAppreciation: 8,
      avgDaysOnMarket: 15,
      monthsOfInventory: 2,
    },
    rentEstimate: { monthlyRent: 2000 },
  },

  // Additional external data fixtures for diverse properties
  ruralMinimal: {
    // Very limited data available for rural properties
    walkScore: null,
    crimeData: null, // Rural areas often not covered
    schoolRatings: { averageRating: 5, nearbySchools: 1 },
    nearbyAmenities: { count: 2, categories: ['gas_station'] },
    transitScore: { score: 0 }, // No public transit
    fema: { floodZone: 'X', inFloodplain: false },
    usgs: { risk: 1, nearbyEvents: 0 },
    nasaFirms: { riskLevel: 2, recentFires: 1 }, // Rural fire risk
    marketValue: null, // Hard to assess
    marketData: {
      yearlyAppreciation: 2,
      avgDaysOnMarket: 180, // Slow market
      monthsOfInventory: 18,
      salesVolume: 5, // Few comparable sales
    },
    rentEstimate: null, // No rental market
  },

  urbanCondo: {
    walkScore: { score: 95 },
    crimeData: { index: 35, grade: 'B' },
    schoolRatings: { averageRating: 7, nearbySchools: 12 },
    nearbyAmenities: { count: 100, categories: ['grocery', 'restaurant', 'gym', 'park', 'entertainment', 'shopping'] },
    transitScore: { score: 92 },
    bikeScore: { score: 78 },
    fema: { floodZone: 'X', inFloodplain: false },
    usgs: { risk: 1, nearbyEvents: 0 },
    nasaFirms: { riskLevel: 1, recentFires: 0 },
    marketValue: 450000,
    marketData: {
      yearlyAppreciation: 6,
      avgDaysOnMarket: 21,
      monthsOfInventory: 2.5,
      salesVolume: 250,
    },
    rentEstimate: { monthlyRent: 2800 },
    hoaData: {
      monthlyFee: 450,
      reserves: 'adequate',
      specialAssessments: false,
      litigationPending: false,
    },
  },

  floodZone: {
    walkScore: { score: 45 },
    crimeData: { index: 40, grade: 'C' },
    schoolRatings: { averageRating: 6, nearbySchools: 4 },
    nearbyAmenities: { count: 12, categories: ['grocery', 'restaurant'] },
    transitScore: { score: 20 },
    fema: {
      floodZone: 'AE',
      inFloodplain: true,
      baseFloodElevation: 1150,
      riskLevel: 'high',
      insuranceRequired: true,
      annualPremiumEstimate: 3500,
    },
    usgs: { risk: 2, nearbyEvents: 0 },
    nasaFirms: { riskLevel: 1, recentFires: 0 },
    marketValue: 75000, // Discounted due to flood risk
    marketData: {
      yearlyAppreciation: -1, // Declining due to flood history
      avgDaysOnMarket: 90,
      monthsOfInventory: 8,
    },
    rentEstimate: { monthlyRent: 800 },
    floodHistory: {
      claims: 2,
      lastClaimYear: 2018,
      totalClaimAmount: 45000,
    },
  },

  coastal: {
    walkScore: { score: 72 },
    crimeData: { index: 25, grade: 'B+' },
    schoolRatings: { averageRating: 8, nearbySchools: 6 },
    nearbyAmenities: { count: 35, categories: ['grocery', 'restaurant', 'beach', 'marina'] },
    transitScore: { score: 35 },
    fema: {
      floodZone: 'VE',
      inFloodplain: true,
      baseFloodElevation: 12,
      riskLevel: 'very_high',
      coastalHighHazard: true,
      insuranceRequired: true,
      annualPremiumEstimate: 8500,
    },
    usgs: { risk: 1, nearbyEvents: 0 },
    nasaFirms: { riskLevel: 1, recentFires: 0 },
    hurricaneRisk: {
      zone: 'HVHZ',
      categoryHistory: [3, 4, 2], // Past hurricane categories
      windMitigationDiscount: 0.35,
    },
    marketValue: 920000,
    marketData: {
      yearlyAppreciation: 4,
      avgDaysOnMarket: 45,
      monthsOfInventory: 4,
      seasonality: 'high', // Tourist area
    },
    rentEstimate: { monthlyRent: 4500, seasonalPeak: 8000 },
    coastalFactors: {
      erosionRate: '2ft/year',
      seaLevelRiseExposure: 'moderate',
      distanceToWater: 500,
    },
  },

  titleIssues: {
    walkScore: { score: 55 },
    crimeData: { index: 45, grade: 'C' },
    schoolRatings: { averageRating: 6, nearbySchools: 5 },
    nearbyAmenities: { count: 10, categories: ['grocery'] },
    transitScore: { score: 25 },
    fema: { floodZone: 'X', inFloodplain: false },
    usgs: { risk: 2, nearbyEvents: 0 },
    nasaFirms: { riskLevel: 1, recentFires: 0 },
    marketValue: 85000, // Discounted for title issues
    marketData: {
      yearlyAppreciation: 3,
      avgDaysOnMarket: 60,
      monthsOfInventory: 5,
    },
    rentEstimate: { monthlyRent: 750 },
    titleSearch: {
      hasIssues: true,
      issues: ['heir_dispute', 'missing_deed'],
      estimatedClearingCost: 5000,
      estimatedClearingTime: '6-12 months',
      quietTitleRequired: true,
    },
    liens: [
      { type: 'irs', amount: 12000, survivesForeclosure: 'partial', redemptionPeriod: 120 },
      { type: 'municipal', amount: 3500, survivesForeclosure: true },
    ],
  },

  repositoryOngoing: {
    walkScore: { score: 35 },
    crimeData: { index: 55, grade: 'D' },
    schoolRatings: { averageRating: 5, nearbySchools: 3 },
    nearbyAmenities: { count: 5, categories: ['convenience_store'] },
    transitScore: { score: 10 },
    fema: { floodZone: 'X', inFloodplain: false },
    usgs: { risk: 2, nearbyEvents: 0 },
    nasaFirms: { riskLevel: 2, recentFires: 0 },
    marketValue: 35000, // Repository properties heavily discounted
    marketData: {
      yearlyAppreciation: 1,
      avgDaysOnMarket: 150,
      monthsOfInventory: 15,
      salesVolume: 10,
    },
    rentEstimate: { monthlyRent: 550 },
    propertyCondition: {
      overall: 'poor',
      roofCondition: 'needs_replacement',
      hvacCondition: 'non_functional',
      estimatedRehabCost: 35000,
      vacancyDuration: 24, // months
    },
    repositoryData: {
      minimumBid: 500,
      previousAttempts: 2,
      lastAttemptPrice: 800,
      yearsOnRepository: 2,
    },
  },

  environmentalConcern: {
    walkScore: { score: 40 },
    crimeData: { index: 50, grade: 'C' },
    schoolRatings: { averageRating: 5, nearbySchools: 2 },
    nearbyAmenities: { count: 8, categories: ['industrial'] },
    transitScore: { score: 15 },
    fema: { floodZone: 'X', inFloodplain: false },
    usgs: { risk: 2, nearbyEvents: 0 },
    nasaFirms: { riskLevel: 2, recentFires: 0 },
    marketValue: 50000, // Severely discounted
    marketData: {
      yearlyAppreciation: 0,
      avgDaysOnMarket: 365,
      monthsOfInventory: 24,
    },
    rentEstimate: null, // Not rentable in current condition
    environmental: {
      contaminated: true,
      type: 'petroleum',
      phase1Complete: true,
      phase2Complete: true,
      remediationRequired: true,
      estimatedCost: 75000,
      stateProgram: 'Act 2',
      liabilityProtection: 'available',
      cleanupTimeline: '18-24 months',
    },
  },
};
```

---

## Next Steps

After completing Phase 6F testing and verification:

1. **Review test coverage** - Ensure >80% code coverage
2. **Run full test suite** - All tests should pass
3. **Performance benchmarks** - Document baseline metrics
4. **Integration verification** - Test with real database
5. **Proceed to Phase 7** - Risk Analysis Engine

---

*Document created: Phase 6F Tests & Verification*
*For Phase 6: Scoring Algorithm implementation*
