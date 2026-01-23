/**
 * Tests for Report Data Transformation Utilities
 *
 * @module lib/utils/__tests__/report-data-transformation.test
 */

import { describe, it, expect } from 'vitest';
import {
  transformRawApiComparable,
  transformRawApiComparables,
  convertToLandComparable,
  convertLandComparableToProperty,
  createLandSubject,
  filterLandComparables,
  isVacantLand,
  convertToRealtyComparable,
  parseLotSizeAcres,
  formatLotSize,
  calculateMedian,
  calculateAverage,
  type RawApiComparable,
} from '../report-data-transformation';

describe('Report Data Transformation', () => {
  describe('transformRawApiComparable', () => {
    it('should transform a complete API comparable', () => {
      const rawComp: RawApiComparable = {
        property_id: 'test-123',
        address: {
          line: '123 Main St',
          city: 'Springfield',
          state_code: 'PA',
          postal_code: '12345',
          lat: 40.5,
          lon: -75.5,
        },
        price: {
          sold_price: 150000,
          list_price: 160000,
          price_per_sqft: 100,
        },
        description: {
          beds: 3,
          baths: 2,
          sqft: 1500,
          lot_sqft: 10000,
          year_built: 2000,
          type: 'Single Family',
        },
        sold_date: '2024-01-15',
        days_on_market: 30,
        distance_miles: 0.5,
        photos: ['photo1.jpg'],
      };

      const result = transformRawApiComparable(rawComp, 0);

      expect(result.id).toBe('test-123');
      expect(result.address).toBe('123 Main St');
      expect(result.city).toBe('Springfield');
      expect(result.salePrice).toBe(150000);
      expect(result.sqft).toBe(1500);
      expect(result.bedrooms).toBe(3);
      expect(result.bathrooms).toBe(2);
      expect(result.yearBuilt).toBe(2000);
      expect(result.pricePerSqft).toBe(100);
      expect(result.distance).toBe(0.5);
      expect(result.daysOnMarket).toBe(30);
      expect(result.lotSizeAcres).toBeCloseTo(10000 / 43560, 2);
      expect(result.similarityScore).toBeGreaterThan(0);
      expect(result.similarityScore).toBeLessThanOrEqual(100);
    });

    it('should handle missing optional data', () => {
      const rawComp: RawApiComparable = {
        property_id: 'test-456',
        address: {
          line: '456 Oak Ave',
          city: 'Springfield',
          state_code: 'PA',
        },
        price: {
          sold_price: 120000,
        },
        description: {
          sqft: 1200,
        },
      };

      const result = transformRawApiComparable(rawComp, 1);

      expect(result.id).toBe('test-456');
      expect(result.bedrooms).toBeUndefined();
      expect(result.bathrooms).toBeUndefined();
      expect(result.yearBuilt).toBeUndefined();
      expect(result.lotSizeAcres).toBeUndefined();
    });

    it('should calculate price per sqft when not provided', () => {
      const rawComp: RawApiComparable = {
        property_id: 'test-789',
        address: {
          line: '789 Pine Rd',
          city: 'Springfield',
          state_code: 'PA',
        },
        price: {
          sold_price: 200000,
        },
        description: {
          sqft: 2000,
        },
      };

      const result = transformRawApiComparable(rawComp, 2);

      expect(result.pricePerSqft).toBe(100); // 200000 / 2000
    });

    it('should use fallback ID when property_id is missing', () => {
      const rawComp: RawApiComparable = {
        property_id: '',
        address: {
          line: 'No ID Street',
          city: 'Springfield',
          state_code: 'PA',
        },
        price: {},
        description: {},
      };

      const result = transformRawApiComparable(rawComp, 5);

      expect(result.id).toBe('comp-5');
    });
  });

  describe('transformRawApiComparables', () => {
    it('should transform multiple comparables', () => {
      const rawComps: RawApiComparable[] = [
        {
          property_id: 'test-1',
          address: { line: 'Addr 1', city: 'City', state_code: 'PA' },
          price: { sold_price: 100000 },
          description: { sqft: 1000 },
        },
        {
          property_id: 'test-2',
          address: { line: 'Addr 2', city: 'City', state_code: 'PA' },
          price: { sold_price: 150000 },
          description: { sqft: 1500 },
        },
      ];

      const results = transformRawApiComparables(rawComps);

      expect(results).toHaveLength(2);
      expect(results[0].id).toBe('test-1');
      expect(results[1].id).toBe('test-2');
    });
  });

  describe('convertToLandComparable', () => {
    it('should convert to land comparable format', () => {
      const comp = {
        id: 'land-1',
        address: '123 Land St',
        city: 'City',
        latitude: 40.5,
        longitude: -75.5,
        salePrice: 50000,
        saleDate: new Date('2024-01-01'),
        sqft: 0,
        lotSizeAcres: 2.5,
        bedrooms: 0,
        bathrooms: 0,
        yearBuilt: 0,
        propertyType: 'Land',
        pricePerSqft: 0,
        distance: 0.3,
        similarityScore: 85,
      };

      const result = convertToLandComparable(comp);

      expect(result).not.toBeNull();
      expect(result!.latitude).toBe(40.5);
      expect(result!.longitude).toBe(-75.5);
      expect(result!.salePrice).toBe(50000);
      expect(result!.address).toBe('123 Land St');
      expect(result!.lotSizeSqft).toBeCloseTo(2.5 * 43560, 0);
      expect(result!.distanceMiles).toBe(0.3);
    });

    it('should return null for missing coordinates', () => {
      const comp = {
        id: 'land-2',
        address: '456 Land Ave',
        city: 'City',
        salePrice: 60000,
        saleDate: new Date('2024-01-01'),
        sqft: 0,
        lotSizeAcres: 1.5,
        bedrooms: 0,
        bathrooms: 0,
        yearBuilt: 0,
        propertyType: 'Land',
        pricePerSqft: 0,
        distance: 0.5,
        similarityScore: 80,
      };

      const result = convertToLandComparable(comp);

      expect(result).toBeNull();
    });

    it('should return null for zero sale price', () => {
      const comp = {
        id: 'land-3',
        address: '789 Land Rd',
        city: 'City',
        latitude: 40.5,
        longitude: -75.5,
        salePrice: 0,
        saleDate: new Date('2024-01-01'),
        sqft: 0,
        lotSizeAcres: 1.0,
        bedrooms: 0,
        bathrooms: 0,
        yearBuilt: 0,
        propertyType: 'Land',
        pricePerSqft: 0,
        distance: 0.2,
        similarityScore: 90,
      };

      const result = convertToLandComparable(comp);

      expect(result).toBeNull();
    });
  });

  describe('createLandSubject', () => {
    it('should create land subject from coordinates and lot size', () => {
      const coords = { lat: 40.5, lng: -75.5 };
      const lotSize = 2.0;

      const result = createLandSubject(coords, lotSize, 'land');

      expect(result.latitude).toBe(40.5);
      expect(result.longitude).toBe(-75.5);
      expect(result.lotSizeSqft).toBe(2.0 * 43560);
      expect(result.propertyType).toBe('land');
    });

    it('should parse string lot size', () => {
      const coords = { lat: 40.5, lng: -75.5 };
      const lotSize = '1.5 acres';

      const result = createLandSubject(coords, lotSize);

      expect(result.lotSizeSqft).toBe(1.5 * 43560);
    });

    it('should use default lot size for invalid input', () => {
      const coords = { lat: 40.5, lng: -75.5 };

      const result = createLandSubject(coords, undefined);

      expect(result.lotSizeSqft).toBe(5000); // Default
    });

    it('should handle null coordinates', () => {
      const result = createLandSubject(null, 1.0);

      expect(result.latitude).toBe(0);
      expect(result.longitude).toBe(0);
      expect(result.lotSizeSqft).toBe(43560);
    });
  });

  describe('isVacantLand', () => {
    it('should detect vacant land from property type', () => {
      expect(isVacantLand('Vacant Land', 0)).toBe(true);
      expect(isVacantLand('Land', 0)).toBe(true);
      expect(isVacantLand('Residential Lot', 0)).toBe(true);
    });

    it('should detect land from zero building sqft', () => {
      expect(isVacantLand('Unknown', 0)).toBe(true);
      expect(isVacantLand('Single Family', 0)).toBe(true);
    });

    it('should not detect land for buildings', () => {
      expect(isVacantLand('Single Family', 1500)).toBe(false);
      expect(isVacantLand('Condo', 1200)).toBe(false);
    });

    it('should handle undefined property type', () => {
      expect(isVacantLand(undefined, 0)).toBe(false);
    });
  });

  describe('parseLotSizeAcres', () => {
    it('should parse numeric lot size', () => {
      expect(parseLotSizeAcres(1.5)).toBe(1.5);
      expect(parseLotSizeAcres(2.0)).toBe(2.0);
    });

    it('should parse string lot size with units', () => {
      expect(parseLotSizeAcres('1.5 acres')).toBe(1.5);
      expect(parseLotSizeAcres('2.0ac')).toBe(2.0);
      expect(parseLotSizeAcres('0.5 ac')).toBe(0.5);
    });

    it('should parse string numbers', () => {
      expect(parseLotSizeAcres('1.5')).toBe(1.5);
      expect(parseLotSizeAcres('2')).toBe(2);
    });

    it('should return 0 for undefined', () => {
      expect(parseLotSizeAcres(undefined)).toBe(0);
    });

    it('should return 0 for invalid strings', () => {
      expect(parseLotSizeAcres('invalid')).toBe(0);
      expect(parseLotSizeAcres('')).toBe(0);
    });
  });

  describe('formatLotSize', () => {
    it('should format lot size with units', () => {
      expect(formatLotSize(1.5, true)).toBe('1.5 acres');
      expect(formatLotSize(0.25, true)).toBe('0.25 acres');
      expect(formatLotSize(10.0, true)).toBe('10.0 acres');
    });

    it('should format without units', () => {
      expect(formatLotSize(1.5, false)).toBe('1.5');
      expect(formatLotSize(0.25, false)).toBe('0.25');
    });

    it('should use appropriate precision', () => {
      expect(formatLotSize(0.75, true)).toBe('0.75 acres'); // 2 decimals for < 1
      expect(formatLotSize(1.75, true)).toBe('1.8 acres');  // 1 decimal for >= 1
    });

    it('should handle zero and undefined', () => {
      expect(formatLotSize(0, true)).toBe('0 acres');
      expect(formatLotSize(undefined, true)).toBe('0 acres');
    });
  });

  describe('calculateMedian', () => {
    it('should calculate median for odd-length array', () => {
      expect(calculateMedian([1, 2, 3, 4, 5])).toBe(3);
      expect(calculateMedian([10, 20, 30])).toBe(20);
    });

    it('should calculate median for even-length array', () => {
      expect(calculateMedian([1, 2, 3, 4])).toBe(2.5);
      expect(calculateMedian([10, 20, 30, 40])).toBe(25);
    });

    it('should handle unsorted arrays', () => {
      expect(calculateMedian([5, 1, 3, 4, 2])).toBe(3);
      expect(calculateMedian([40, 10, 30, 20])).toBe(25);
    });

    it('should handle single element', () => {
      expect(calculateMedian([42])).toBe(42);
    });

    it('should return 0 for empty array', () => {
      expect(calculateMedian([])).toBe(0);
    });
  });

  describe('calculateAverage', () => {
    it('should calculate average', () => {
      expect(calculateAverage([1, 2, 3, 4, 5])).toBe(3);
      expect(calculateAverage([10, 20, 30])).toBe(20);
    });

    it('should handle decimals', () => {
      expect(calculateAverage([1, 2, 4])).toBeCloseTo(2.33, 1);
    });

    it('should handle single element', () => {
      expect(calculateAverage([42])).toBe(42);
    });

    it('should return 0 for empty array', () => {
      expect(calculateAverage([])).toBe(0);
    });
  });

  describe('convertToRealtyComparable', () => {
    it('should convert ComparableProperty to RealtyComparable', () => {
      const comp = {
        id: 'test-1',
        address: '123 Main St',
        city: 'Springfield',
        latitude: 40.5,
        longitude: -75.5,
        salePrice: 150000,
        saleDate: new Date('2024-01-15'),
        sqft: 1500,
        lotSizeAcres: 0.25,
        bedrooms: 3,
        bathrooms: 2,
        yearBuilt: 2000,
        propertyType: 'Single Family',
        pricePerSqft: 100,
        distance: 0.5,
        similarityScore: 85,
        daysOnMarket: 30,
      };

      const result = convertToRealtyComparable(comp);

      expect(result.property_id).toBe('test-1');
      expect(result.address.line).toBe('123 Main St');
      expect(result.address.city).toBe('Springfield');
      expect(result.address.state_code).toBe(''); // Not available in ComparableProperty
      expect(result.address.postal_code).toBe(''); // Not available in ComparableProperty
      expect(result.address.lat).toBe(40.5);
      expect(result.address.lon).toBe(-75.5);
      expect(result.price.sold_price).toBe(150000);
      expect(result.price.price_per_sqft).toBe(100);
      expect(result.description.sqft).toBe(1500);
      expect(result.description.beds).toBe(3);
      expect(result.description.baths).toBe(2);
      expect(result.description.year_built).toBe(2000);
      expect(result.description.type).toBe('Single Family');
      expect(result.description.lot_sqft).toBeCloseTo(0.25 * 43560, 0);
      expect(result.distance_miles).toBe(0.5);
      expect(result.days_on_market).toBe(30);
      expect(result.source).toBe('transformed');
    });
  });
});
