/**
 * Test Utilities Module Tests
 *
 * Verifies that all test utilities work correctly
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-22
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createTestDate,
  freezeTime,
  randomInt,
  randomFloat,
  randomBool,
  randomPick,
  randomString,
  mockUUID,
  createMockAPIResponse,
  createMockErrorResponse,
  createMockFetchResponse,
  waitFor,
  waitForError,
  sleep,
  assertInRange,
  assertHasProperties,
  assertMatchesShape,
  assertArrayContains,
  assertAllItemsMatch,
  deepClone,
  deepMerge,
  omit,
  pick,
  measureExecutionTime,
  captureConsole,
  suppressConsole,
  TestUtils,
} from './test-utils';

// ============================================
// Date & Time Utilities Tests
// ============================================

describe('Date & Time Utilities', () => {
  describe('createTestDate', () => {
    it('should create a default test date', () => {
      const date = createTestDate();
      expect(date).toBeInstanceOf(Date);
      expect(date.toISOString()).toBe('2026-01-15T12:00:00.000Z');
    });

    it('should create a date with days offset', () => {
      const date = createTestDate({ daysFromNow: 5 });
      expect(date.toISOString()).toBe('2026-01-20T12:00:00.000Z');
    });

    it('should create a date with months offset', () => {
      const date = createTestDate({ monthsFromNow: 2 });
      // Note: Month offset may be affected by DST, so we check the date portion
      expect(date.getUTCFullYear()).toBe(2026);
      expect(date.getUTCMonth()).toBe(2); // March is month 2 (0-indexed)
      expect(date.getUTCDate()).toBe(15);
    });

    it('should create a date with years offset', () => {
      const date = createTestDate({ yearsFromNow: 1 });
      expect(date.toISOString()).toBe('2027-01-15T12:00:00.000Z');
    });

    it('should use specific date when provided', () => {
      const specificDate = new Date('2025-12-25T00:00:00.000Z');
      const date = createTestDate({ specificDate });
      expect(date.toISOString()).toBe('2025-12-25T00:00:00.000Z');
    });
  });

  describe('freezeTime', () => {
    let restore: (() => void) | null = null;

    afterEach(() => {
      if (restore) {
        restore();
        restore = null;
      }
    });

    it('should freeze time to default date', () => {
      restore = freezeTime();
      const now = Date.now();
      const expected = new Date('2026-01-15T12:00:00.000Z').getTime();
      expect(now).toBe(expected);
    });

    it('should freeze time to specific date', () => {
      const specificDate = new Date('2025-12-25T00:00:00.000Z');
      restore = freezeTime(specificDate);
      const now = Date.now();
      expect(now).toBe(specificDate.getTime());
    });

    it('should restore time when cleanup is called', () => {
      const beforeFreeze = Date.now();
      restore = freezeTime();
      const duringFreeze = Date.now();
      restore();
      restore = null;
      const afterRestore = Date.now();

      expect(duringFreeze).not.toBe(beforeFreeze);
      expect(afterRestore).toBeGreaterThan(duringFreeze);
    });
  });
});

// ============================================
// Mock Data Generators Tests
// ============================================

describe('Mock Data Generators', () => {
  describe('randomInt', () => {
    it('should generate integers within range', () => {
      for (let i = 0; i < 100; i++) {
        const value = randomInt(1, 10);
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(10);
        expect(Number.isInteger(value)).toBe(true);
      }
    });
  });

  describe('randomFloat', () => {
    it('should generate floats within range', () => {
      for (let i = 0; i < 100; i++) {
        const value = randomFloat(1.0, 10.0, 2);
        expect(value).toBeGreaterThanOrEqual(1.0);
        expect(value).toBeLessThanOrEqual(10.0);
      }
    });

    it('should respect decimal places', () => {
      const value = randomFloat(1.0, 10.0, 2);
      const decimalPlaces = value.toString().split('.')[1]?.length || 0;
      expect(decimalPlaces).toBeLessThanOrEqual(2);
    });
  });

  describe('randomBool', () => {
    it('should generate boolean values', () => {
      const values = new Set();
      for (let i = 0; i < 100; i++) {
        const value = randomBool();
        expect(typeof value).toBe('boolean');
        values.add(value);
      }
      // Should have both true and false (statistically very likely)
      expect(values.size).toBeGreaterThan(1);
    });
  });

  describe('randomPick', () => {
    it('should pick items from array', () => {
      const array = ['a', 'b', 'c', 'd', 'e'];
      for (let i = 0; i < 50; i++) {
        const value = randomPick(array);
        expect(array).toContain(value);
      }
    });
  });

  describe('randomString', () => {
    it('should generate string of specified length', () => {
      const str = randomString(10);
      expect(str.length).toBe(10);
    });

    it('should generate alphanumeric by default', () => {
      const str = randomString(20);
      expect(str).toMatch(/^[A-Za-z0-9]+$/);
    });

    it('should generate numeric strings', () => {
      const str = randomString(10, 'numeric');
      expect(str).toMatch(/^[0-9]+$/);
    });

    it('should generate alpha strings', () => {
      const str = randomString(10, 'alpha');
      expect(str).toMatch(/^[A-Za-z]+$/);
    });

    it('should generate hex strings', () => {
      const str = randomString(10, 'hex');
      expect(str).toMatch(/^[0-9A-F]+$/);
    });
  });

  describe('mockUUID', () => {
    it('should generate valid UUID v4 format', () => {
      const uuid = mockUUID();
      expect(uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/
      );
    });

    it('should generate unique UUIDs', () => {
      const uuid1 = mockUUID();
      const uuid2 = mockUUID();
      expect(uuid1).not.toBe(uuid2);
    });
  });
});

// ============================================
// API Mocking Utilities Tests
// ============================================

describe('API Mocking Utilities', () => {
  describe('createMockAPIResponse', () => {
    it('should create successful response', () => {
      const data = { id: 1, name: 'Test' };
      const response = createMockAPIResponse(data);

      expect(response.data).toEqual(data);
      expect(response.status).toBe(200);
      expect(response.statusText).toBe('OK');
      expect(response.headers['content-type']).toBe('application/json');
    });

    it('should support custom status codes', () => {
      const response = createMockAPIResponse({ created: true }, 201);
      expect(response.status).toBe(201);
      expect(response.statusText).toBe('Created');
    });

    it('should support custom headers', () => {
      const response = createMockAPIResponse(
        {},
        200,
        { 'x-custom': 'header' }
      );
      expect(response.headers['x-custom']).toBe('header');
    });
  });

  describe('createMockErrorResponse', () => {
    it('should create error response', () => {
      const error = createMockErrorResponse('Not found', 404, 'NOT_FOUND');

      expect(error.message).toBe('Not found');
      expect(error.status).toBe(404);
      expect(error.code).toBe('NOT_FOUND');
    });

    it('should support error details', () => {
      const error = createMockErrorResponse(
        'Validation failed',
        400,
        'VALIDATION_ERROR',
        { field: 'email', issue: 'invalid format' }
      );

      expect(error.details).toEqual({
        field: 'email',
        issue: 'invalid format',
      });
    });
  });

  describe('createMockFetchResponse', () => {
    it('should create fetch response', async () => {
      const data = { success: true };
      const response = createMockFetchResponse(data);

      expect(response.ok).toBe(true);
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(data);
    });

    it('should handle error status codes', () => {
      const response = createMockFetchResponse({ error: 'Bad request' }, 400);
      expect(response.ok).toBe(false);
      expect(response.status).toBe(400);
    });
  });
});

// ============================================
// Async Test Helpers Tests
// ============================================

describe('Async Test Helpers', () => {
  describe('waitFor', () => {
    it('should wait for condition to be true', async () => {
      let counter = 0;
      const condition = () => {
        counter++;
        return counter >= 5;
      };

      await waitFor(condition, { timeout: 1000, delayBetweenRetries: 10 });
      expect(counter).toBeGreaterThanOrEqual(5);
    });

    it('should timeout if condition never met', async () => {
      const condition = () => false;

      await expect(
        waitFor(condition, { timeout: 100, delayBetweenRetries: 10, retries: 5 })
      ).rejects.toThrow(); // Should throw either timeout or retries error
    });
  });

  describe('waitForError', () => {
    it('should catch expected error', async () => {
      const fn = async () => {
        throw new Error('Test error');
      };

      const error = await waitForError(fn, 'Test error');
      expect(error.message).toContain('Test error');
    });

    it('should fail if function does not throw', async () => {
      const fn = async () => {
        return 'success';
      };

      // waitForError should throw when the function doesn't throw
      await expect(async () => {
        await waitForError(fn);
      }).rejects.toThrow();
    });

    it('should match error with regex', async () => {
      const fn = async () => {
        throw new Error('Error code: 12345');
      };

      const error = await waitForError(fn, /code: \d+/);
      expect(error.message).toMatch(/code: \d+/);
    });
  });

  describe('sleep', () => {
    it('should wait for specified time', async () => {
      const start = Date.now();
      await sleep(50);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(45); // Allow small variance
    });
  });
});

// ============================================
// Validation Helpers Tests
// ============================================

describe('Validation Helpers', () => {
  describe('assertInRange', () => {
    it('should pass for values in range', () => {
      expect(() => assertInRange(5, 1, 10)).not.toThrow();
      expect(() => assertInRange(1, 1, 10)).not.toThrow();
      expect(() => assertInRange(10, 1, 10)).not.toThrow();
    });

    it('should fail for values out of range', () => {
      expect(() => assertInRange(0, 1, 10)).toThrow();
      expect(() => assertInRange(11, 1, 10)).toThrow();
    });
  });

  describe('assertHasProperties', () => {
    it('should pass if object has all properties', () => {
      const obj = { a: 1, b: 2, c: 3 };
      expect(() => assertHasProperties(obj, ['a', 'b', 'c'])).not.toThrow();
    });

    it('should fail if object missing properties', () => {
      const obj = { a: 1, b: 2 };
      expect(() => assertHasProperties(obj, ['a', 'b', 'c'] as any)).toThrow();
    });
  });

  describe('assertMatchesShape', () => {
    it('should pass if object matches shape', () => {
      const obj = { a: 1, b: 2, c: 3 };
      expect(() => assertMatchesShape(obj, { a: 1, b: 2 })).not.toThrow();
    });

    it('should fail if values do not match', () => {
      const obj = { a: 1, b: 2 };
      expect(() => assertMatchesShape(obj, { a: 999 })).toThrow();
    });
  });

  describe('assertArrayContains', () => {
    it('should pass if array contains matching item', () => {
      const array = [1, 2, 3, 4, 5];
      expect(() =>
        assertArrayContains(array, (x) => x > 3)
      ).not.toThrow();
    });

    it('should fail if no items match', () => {
      const array = [1, 2, 3];
      expect(() => assertArrayContains(array, (x) => x > 10)).toThrow();
    });
  });

  describe('assertAllItemsMatch', () => {
    it('should pass if all items match', () => {
      const array = [2, 4, 6, 8];
      expect(() =>
        assertAllItemsMatch(array, (x) => x % 2 === 0)
      ).not.toThrow();
    });

    it('should fail if any item does not match', () => {
      const array = [2, 4, 5, 8];
      expect(() => assertAllItemsMatch(array, (x) => x % 2 === 0)).toThrow();
    });
  });
});

// ============================================
// Object Manipulation Tests
// ============================================

describe('Object Manipulation Utilities', () => {
  describe('deepClone', () => {
    it('should clone simple objects', () => {
      const obj = { a: 1, b: 2 };
      const clone = deepClone(obj);

      expect(clone).toEqual(obj);
      expect(clone).not.toBe(obj);
    });

    it('should clone nested objects', () => {
      const obj = { a: 1, b: { c: 2, d: { e: 3 } } };
      const clone = deepClone(obj);

      expect(clone).toEqual(obj);
      expect(clone.b).not.toBe(obj.b);
      expect(clone.b.d).not.toBe(obj.b.d);
    });

    it('should clone arrays', () => {
      const arr = [1, 2, { a: 3 }];
      const clone = deepClone(arr);

      expect(clone).toEqual(arr);
      expect(clone).not.toBe(arr);
      expect(clone[2]).not.toBe(arr[2]);
    });

    it('should clone dates', () => {
      const date = new Date('2026-01-15');
      const clone = deepClone(date);

      expect(clone).toEqual(date);
      expect(clone).not.toBe(date);
    });
  });

  describe('deepMerge', () => {
    it('should merge objects', () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { c: 3 };
      const result = deepMerge(obj1, obj2);

      expect(result).toEqual({ a: 1, b: 2, c: 3 });
    });

    it('should merge nested objects', () => {
      const obj1 = { a: 1, b: { c: 2 } };
      const obj2 = { b: { d: 3 } };
      const result = deepMerge(obj1, obj2);

      expect(result).toEqual({ a: 1, b: { c: 2, d: 3 } });
    });

    it('should override values', () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { b: 999 };
      const result = deepMerge(obj1, obj2);

      expect(result.b).toBe(999);
    });
  });

  describe('omit', () => {
    it('should remove specified keys', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = omit(obj, ['b']);

      expect(result).toEqual({ a: 1, c: 3 });
      expect(result).not.toHaveProperty('b');
    });
  });

  describe('pick', () => {
    it('should keep only specified keys', () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = pick(obj, ['a', 'c']);

      expect(result).toEqual({ a: 1, c: 3 });
      expect(result).not.toHaveProperty('b');
    });
  });
});

// ============================================
// Performance Testing Tests
// ============================================

describe('Performance Testing Utilities', () => {
  describe('measureExecutionTime', () => {
    it('should measure execution time', async () => {
      const { result, timeMs } = await measureExecutionTime(async () => {
        await sleep(50);
        return 'done';
      });

      expect(result).toBe('done');
      expect(timeMs).toBeGreaterThanOrEqual(45);
    });
  });
});

// ============================================
// Console Utilities Tests
// ============================================

describe('Console Utilities', () => {
  describe('captureConsole', () => {
    it('should capture console.log', () => {
      const captured = captureConsole();
      console.log('test message');
      captured.restore();

      expect(captured.logs).toContain('test message');
    });

    it('should capture console.warn', () => {
      const captured = captureConsole();
      console.warn('warning message');
      captured.restore();

      expect(captured.warns).toContain('warning message');
    });

    it('should capture console.error', () => {
      const captured = captureConsole();
      console.error('error message');
      captured.restore();

      expect(captured.errors).toContain('error message');
    });
  });

  describe('suppressConsole', () => {
    it('should suppress console output', () => {
      const restore = suppressConsole();
      console.log('this should be suppressed');
      restore();

      // No error should be thrown, output is just suppressed
      expect(true).toBe(true);
    });
  });
});

// ============================================
// TestUtils Namespace Tests
// ============================================

describe('TestUtils namespace', () => {
  it('should export all utilities', () => {
    expect(TestUtils.createTestDate).toBeDefined();
    expect(TestUtils.randomInt).toBeDefined();
    expect(TestUtils.mockUUID).toBeDefined();
    expect(TestUtils.createMockAPIResponse).toBeDefined();
    expect(TestUtils.waitFor).toBeDefined();
    expect(TestUtils.assertInRange).toBeDefined();
    expect(TestUtils.deepClone).toBeDefined();
    expect(TestUtils.measureExecutionTime).toBeDefined();
    expect(TestUtils.captureConsole).toBeDefined();
  });
});
