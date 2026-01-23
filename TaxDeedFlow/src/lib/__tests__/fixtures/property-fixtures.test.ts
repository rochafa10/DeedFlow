/**
 * Property Fixtures Tests
 *
 * Verifies that property fixtures can be imported and used correctly
 */

import { describe, it, expect } from 'vitest';
import {
  mockIdealProperty,
  mockMinimalProperty,
  mockMultiFamilyProperty,
  mockCommercialProperty,
  mockVacantLandProperty,
  mockApprovedProperty,
  mockCautionProperty,
  mockRejectedProperty,
  createMockProperty,
  createMockExternalData,
  createPropertyByType,
  createPropertyAtStage,
  createMockPropertyArray,
  PropertyFixtures,
} from './property-fixtures';

describe('Property Fixtures', () => {
  describe('Base Fixtures', () => {
    it('should export ideal property fixture', () => {
      expect(mockIdealProperty).toBeDefined();
      expect(mockIdealProperty.id).toBe('prop-ideal-001');
      expect(mockIdealProperty.property_type).toBe('single_family_residential');
      expect(mockIdealProperty.validation_status).toBe('APPROVED');
    });

    it('should export minimal property fixture', () => {
      expect(mockMinimalProperty).toBeDefined();
      expect(mockMinimalProperty.id).toBe('prop-minimal-001');
      expect(mockMinimalProperty.address).toBeNull();
      expect(mockMinimalProperty.has_regrid_data).toBe(false);
    });
  });

  describe('Property Type Fixtures', () => {
    it('should export multi-family property', () => {
      expect(mockMultiFamilyProperty).toBeDefined();
      expect(mockMultiFamilyProperty.property_type).toBe('multi_family_residential');
      expect(mockMultiFamilyProperty.bedrooms).toBe(6);
    });

    it('should export commercial property', () => {
      expect(mockCommercialProperty).toBeDefined();
      expect(mockCommercialProperty.property_type).toBe('commercial');
      expect(mockCommercialProperty.zoning).toBe('C-2');
    });

    it('should export vacant land property', () => {
      expect(mockVacantLandProperty).toBeDefined();
      expect(mockVacantLandProperty.property_type).toBe('vacant_land');
      expect(mockVacantLandProperty.building_sqft).toBeNull();
    });
  });

  describe('Validation Status Fixtures', () => {
    it('should export approved property', () => {
      expect(mockApprovedProperty).toBeDefined();
      expect(mockApprovedProperty.validation_status).toBe('APPROVED');
    });

    it('should export caution property', () => {
      expect(mockCautionProperty).toBeDefined();
      expect(mockCautionProperty.validation_status).toBe('CAUTION');
    });

    it('should export rejected property', () => {
      expect(mockRejectedProperty).toBeDefined();
      expect(mockRejectedProperty.validation_status).toBe('REJECT');
    });
  });

  describe('Helper Functions', () => {
    it('should create custom property with createMockProperty', () => {
      const customProperty = createMockProperty({
        address: 'Test Address',
        total_due: 5000,
      });

      expect(customProperty).toBeDefined();
      expect(customProperty.address).toBe('Test Address');
      expect(customProperty.total_due).toBe(5000);
      expect(customProperty.id).toMatch(/^prop-custom-/);
    });

    it('should create custom external data with createMockExternalData', () => {
      const customExternal = createMockExternalData({
        walkScore: 90,
      });

      expect(customExternal).toBeDefined();
      expect(customExternal.walkScore).toBe(90);
    });

    it('should create property by type with createPropertyByType', () => {
      const vacantLand = createPropertyByType('vacant_land');

      expect(vacantLand.property_type).toBe('vacant_land');
      expect(vacantLand.building_sqft).toBeNull();
      expect(vacantLand.bedrooms).toBeNull();
    });

    it('should create property at pipeline stage with createPropertyAtStage', () => {
      const parsedProperty = createPropertyAtStage('parsed');

      expect(parsedProperty.pipeline_stage).toBe('parsed');
      expect(parsedProperty.has_regrid_data).toBe(false);
      expect(parsedProperty.validation_status).toBeNull();

      const scoredProperty = createPropertyAtStage('scored');

      expect(scoredProperty.pipeline_stage).toBe('scored');
      expect(scoredProperty.has_regrid_data).toBe(true);
      expect(scoredProperty.validation_status).toBe('APPROVED');
    });

    it('should create array of properties with createMockPropertyArray', () => {
      const properties = createMockPropertyArray(5);

      expect(properties).toHaveLength(5);
      expect(properties[0].id).toBe('prop-batch-1');
      expect(properties[4].id).toBe('prop-batch-5');
    });

    it('should create array with custom template', () => {
      const properties = createMockPropertyArray(3, {
        state: 'FL',
        property_type: 'commercial',
      });

      expect(properties).toHaveLength(3);
      expect(properties[0].state).toBe('FL');
      expect(properties[0].property_type).toBe('commercial');
      expect(properties[2].state).toBe('FL');
    });
  });

  describe('PropertyFixtures Namespace', () => {
    it('should export all fixtures through namespace', () => {
      expect(PropertyFixtures.ideal).toBeDefined();
      expect(PropertyFixtures.minimal).toBeDefined();
      expect(PropertyFixtures.singleFamily).toBeDefined();
      expect(PropertyFixtures.multiFamily).toBeDefined();
      expect(PropertyFixtures.commercial).toBeDefined();
      expect(PropertyFixtures.approved).toBeDefined();
      expect(PropertyFixtures.caution).toBeDefined();
      expect(PropertyFixtures.rejected).toBeDefined();
    });

    it('should export helper functions through namespace', () => {
      expect(PropertyFixtures.create).toBeDefined();
      expect(PropertyFixtures.createExternal).toBeDefined();
      expect(PropertyFixtures.createByType).toBeDefined();
      expect(PropertyFixtures.createAtStage).toBeDefined();
      expect(PropertyFixtures.createArray).toBeDefined();
    });

    it('should work with namespace helpers', () => {
      const property = PropertyFixtures.create({ address: 'Namespace Test' });
      expect(property.address).toBe('Namespace Test');

      const commercial = PropertyFixtures.createByType('commercial');
      expect(commercial.property_type).toBe('commercial');
    });
  });
});
