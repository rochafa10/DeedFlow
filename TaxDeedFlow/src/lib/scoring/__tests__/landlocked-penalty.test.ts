/**
 * Landlocked Penalty Tests
 *
 * Tests the landlocked and private road access penalties in location scoring
 */

import { describe, it, expect } from 'vitest';
import { calculateLocationScore } from '../categories/location/locationScore';

describe('Landlocked Penalty', () => {
  const baseExternalData = {
    walkScore: 75,
    transitScore: 45,
    bikeScore: null,
    crimeData: {
      crimeIndex: 30,
      violentCrimeRate: 2.5,
      propertyCrimeRate: 15.0,
      source: 'FBI',
      asOf: new Date('2026-01-01'),
    },
    schoolRating: {
      overallRating: 7,
      elementaryRating: 7,
      middleRating: 6,
      highRating: 7,
      source: 'GreatSchools',
    },
    nearbyAmenities: {
      totalScore: 60,
      restaurants: 10,
      groceryStores: 5,
      parks: 3,
      hospitals: 2,
      shopping: 8,
    },
    floodZone: null,
    environmentalHazards: null,
    marketData: null,
    comparableSales: null,
    accessData: null,
  };

  it('should not apply penalty when accessData is null', () => {
    const result = calculateLocationScore(
      { id: 'test-1', address: '123 Test St' },
      baseExternalData
    );

    expect(result.score).toBeGreaterThan(0);
    expect(result.adjustments).toHaveLength(0);
    expect(result.notes.some(n => n.includes('landlocked'))).toBe(false);
  });

  it('should apply -2 point penalty for landlocked property', () => {
    const withLandlocked = {
      ...baseExternalData,
      accessData: {
        landlocked: true,
        roadAccessType: 'none',
        distanceToPublicRoad: 500,
        riskLevel: 'severe',
        notes: ['No road access found'],
      },
    };

    const resultWithoutPenalty = calculateLocationScore(
      { id: 'test-1' },
      baseExternalData
    );
    const resultWithPenalty = calculateLocationScore(
      { id: 'test-2' },
      withLandlocked
    );

    // Should be approximately 2 points lower
    const difference = resultWithoutPenalty.score - resultWithPenalty.score;
    expect(difference).toBeGreaterThan(1.9);
    expect(difference).toBeLessThan(2.1);

    // Should have adjustment recorded
    expect(resultWithPenalty.adjustments.length).toBeGreaterThan(0);
    expect(resultWithPenalty.adjustments[0].reason).toContain('Landlocked');

    // Should have critical note
    expect(resultWithPenalty.notes.some(n => n.includes('CRITICAL'))).toBe(true);
    expect(resultWithPenalty.notes.some(n => n.includes('landlocked'))).toBe(true);
  });

  it('should apply -1 point penalty for private road access', () => {
    const withPrivateRoad = {
      ...baseExternalData,
      accessData: {
        landlocked: false,
        roadAccessType: 'private',
        distanceToPublicRoad: 0,
        riskLevel: 'moderate',
        notes: ['Private road access only'],
      },
    };

    const resultWithoutPenalty = calculateLocationScore(
      { id: 'test-1' },
      baseExternalData
    );
    const resultWithPenalty = calculateLocationScore(
      { id: 'test-3' },
      withPrivateRoad
    );

    // Should be approximately 1 point lower
    const difference = resultWithoutPenalty.score - resultWithPenalty.score;
    expect(difference).toBeGreaterThan(0.9);
    expect(difference).toBeLessThan(1.1);

    // Should have adjustment recorded
    expect(resultWithPenalty.adjustments.length).toBeGreaterThan(0);
    expect(resultWithPenalty.adjustments[0].reason).toContain('Private road');

    // Should have note about private road
    expect(resultWithPenalty.notes.some(n => n.includes('private'))).toBe(true);
  });

  it('should not apply private road penalty if already landlocked', () => {
    const withLandlocked = {
      ...baseExternalData,
      accessData: {
        landlocked: true,
        roadAccessType: 'private', // Even though it says private, landlocked takes precedence
        distanceToPublicRoad: 500,
        riskLevel: 'severe',
        notes: ['No road access'],
      },
    };

    const resultWithoutPenalty = calculateLocationScore(
      { id: 'test-1' },
      baseExternalData
    );
    const resultWithPenalty = calculateLocationScore(
      { id: 'test-4' },
      withLandlocked
    );

    // Should only be ~2 points lower (landlocked penalty), not 3
    const difference = resultWithoutPenalty.score - resultWithPenalty.score;
    expect(difference).toBeGreaterThan(1.9);
    expect(difference).toBeLessThan(2.1);
  });

  it('should ensure score does not go below zero', () => {
    const lowScoreData = {
      walkScore: 0,
      transitScore: 0,
      bikeScore: null,
      crimeData: {
        crimeIndex: 100,
        violentCrimeRate: 10.0,
        propertyCrimeRate: 50.0,
        source: 'FBI',
        asOf: new Date('2026-01-01'),
      },
      schoolRating: {
        overallRating: 1,
        elementaryRating: 1,
        middleRating: 1,
        highRating: 1,
        source: 'GreatSchools',
      },
      nearbyAmenities: {
        restaurants: 0,
        groceryStores: 0,
        parks: 0,
        hospitals: 0,
        shopping: 0,
        totalScore: 0,
      },
      floodZone: null,
      environmentalHazards: null,
      marketData: null,
      comparableSales: null,
      accessData: {
        landlocked: true,
        roadAccessType: 'none',
        distanceToPublicRoad: 1000,
        riskLevel: 'severe',
        notes: ['Completely landlocked'],
      },
    };

    const result = calculateLocationScore(
      { id: 'test-5' },
      lowScoreData
    );

    expect(result.score).toBeGreaterThanOrEqual(0);
  });
});
