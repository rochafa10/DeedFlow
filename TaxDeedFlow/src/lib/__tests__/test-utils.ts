/**
 * Test Utilities Module
 *
 * Provides common testing utilities, helpers, and mock factories
 * for all test suites across the application.
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-22
 */

import { expect } from 'vitest';

// ============================================
// Type Definitions
// ============================================

/**
 * Mock API response structure
 */
export interface MockAPIResponse<T = any> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
}

/**
 * Mock error response structure
 */
export interface MockErrorResponse {
  message: string;
  code?: string;
  status: number;
  details?: any;
}

/**
 * Options for creating mock dates
 */
export interface MockDateOptions {
  daysFromNow?: number;
  monthsFromNow?: number;
  yearsFromNow?: number;
  specificDate?: Date;
}

/**
 * Options for async test helpers
 */
export interface AsyncTestOptions {
  timeout?: number;
  retries?: number;
  delayBetweenRetries?: number;
}

// ============================================
// Date & Time Utilities
// ============================================

/**
 * Creates a deterministic date for testing
 * Defaults to a fixed date to ensure test consistency
 */
export function createTestDate(options: MockDateOptions = {}): Date {
  const {
    daysFromNow = 0,
    monthsFromNow = 0,
    yearsFromNow = 0,
    specificDate,
  } = options;

  if (specificDate) {
    return new Date(specificDate);
  }

  const baseDate = new Date('2026-01-15T12:00:00.000Z');
  const result = new Date(baseDate);

  if (yearsFromNow !== 0) {
    result.setFullYear(result.getFullYear() + yearsFromNow);
  }
  if (monthsFromNow !== 0) {
    result.setMonth(result.getMonth() + monthsFromNow);
  }
  if (daysFromNow !== 0) {
    result.setDate(result.getDate() + daysFromNow);
  }

  return result;
}

/**
 * Freezes time for testing time-dependent functionality
 */
export function freezeTime(date?: Date): () => void {
  const originalNow = Date.now;
  const frozenTime = date ? date.getTime() : new Date('2026-01-15T12:00:00.000Z').getTime();

  Date.now = () => frozenTime;

  // Return cleanup function
  return () => {
    Date.now = originalNow;
  };
}

/**
 * Checks if two dates are equal (ignoring milliseconds)
 */
export function assertDatesEqual(
  actual: Date,
  expected: Date,
  message?: string
): void {
  const actualTime = Math.floor(actual.getTime() / 1000);
  const expectedTime = Math.floor(expected.getTime() / 1000);
  expect(actualTime).toBe(expectedTime);
}

// ============================================
// Mock Data Generators
// ============================================

/**
 * Generates a random integer between min and max (inclusive)
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generates a random float between min and max
 */
export function randomFloat(min: number, max: number, decimals: number = 2): number {
  const value = Math.random() * (max - min) + min;
  return Number(value.toFixed(decimals));
}

/**
 * Generates a random boolean
 */
export function randomBool(): boolean {
  return Math.random() >= 0.5;
}

/**
 * Picks a random item from an array
 */
export function randomPick<T>(array: T[]): T {
  return array[randomInt(0, array.length - 1)];
}

/**
 * Generates a random string of specified length
 */
export function randomString(length: number = 10, charset: string = 'alphanumeric'): string {
  const charsets = {
    alphanumeric: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
    alpha: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz',
    numeric: '0123456789',
    hex: '0123456789ABCDEF',
  };

  const chars = charsets[charset as keyof typeof charsets] || charset;
  let result = '';

  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }

  return result;
}

/**
 * Generates a mock UUID v4
 */
export function mockUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ============================================
// API Mocking Utilities
// ============================================

/**
 * Creates a successful mock API response
 */
export function createMockAPIResponse<T>(
  data: T,
  status: number = 200,
  headers: Record<string, string> = {}
): MockAPIResponse<T> {
  return {
    data,
    status,
    statusText: getStatusText(status),
    headers: {
      'content-type': 'application/json',
      ...headers,
    },
  };
}

/**
 * Creates a mock error response
 */
export function createMockErrorResponse(
  message: string,
  status: number = 500,
  code?: string,
  details?: any
): MockErrorResponse {
  return {
    message,
    status,
    code,
    details,
  };
}

/**
 * Gets standard HTTP status text
 */
function getStatusText(status: number): string {
  const statusTexts: Record<number, string> = {
    200: 'OK',
    201: 'Created',
    204: 'No Content',
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
  };

  return statusTexts[status] || 'Unknown';
}

/**
 * Creates a mock fetch response
 */
export function createMockFetchResponse<T>(
  data: T,
  status: number = 200
): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: getStatusText(status),
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: new Headers({ 'content-type': 'application/json' }),
  } as Response;
}

// ============================================
// Async Test Helpers
// ============================================

/**
 * Waits for a condition to be true with timeout
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  options: AsyncTestOptions = {}
): Promise<void> {
  const { timeout = 5000, retries = 50, delayBetweenRetries = 100 } = options;
  const startTime = Date.now();

  for (let i = 0; i < retries; i++) {
    const result = await condition();
    if (result) {
      return;
    }

    if (Date.now() - startTime > timeout) {
      throw new Error(`Timeout waiting for condition after ${timeout}ms`);
    }

    await sleep(delayBetweenRetries);
  }

  throw new Error(`Condition not met after ${retries} retries`);
}

/**
 * Waits for a promise to reject
 */
export async function waitForError(
  fn: () => Promise<any>,
  expectedError?: string | RegExp
): Promise<Error> {
  let caughtError: Error | null = null;

  try {
    await fn();
  } catch (error) {
    caughtError = error as Error;
  }

  if (!caughtError) {
    throw new Error('Expected function to throw an error, but it succeeded');
  }

  if (expectedError) {
    const errorMessage = caughtError instanceof Error ? caughtError.message : String(caughtError);
    if (typeof expectedError === 'string') {
      expect(errorMessage).toContain(expectedError);
    } else {
      expect(errorMessage).toMatch(expectedError);
    }
  }

  return caughtError;
}

/**
 * Simple sleep utility for tests
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Flushes all pending promises
 */
export async function flushPromises(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

// ============================================
// Validation Helpers
// ============================================

/**
 * Asserts that a value is within a range
 */
export function assertInRange(
  value: number,
  min: number,
  max: number,
  message?: string
): void {
  expect(value).toBeGreaterThanOrEqual(min);
  expect(value).toBeLessThanOrEqual(max);
}

/**
 * Asserts that an object has all required properties
 */
export function assertHasProperties<T extends object>(
  obj: T,
  properties: (keyof T)[],
  message?: string
): void {
  properties.forEach((prop) => {
    expect(obj).toHaveProperty(prop);
  });
}

/**
 * Asserts that an object matches a partial shape
 */
export function assertMatchesShape<T extends object>(
  obj: T,
  shape: Partial<T>
): void {
  Object.keys(shape).forEach((key) => {
    expect(obj).toHaveProperty(key);
    expect((obj as any)[key]).toEqual((shape as any)[key]);
  });
}

/**
 * Asserts that an array contains items matching a predicate
 */
export function assertArrayContains<T>(
  array: T[],
  predicate: (item: T) => boolean,
  message?: string
): void {
  const found = array.some(predicate);
  expect(found).toBe(true);
}

/**
 * Asserts that all items in an array match a predicate
 */
export function assertAllItemsMatch<T>(
  array: T[],
  predicate: (item: T) => boolean,
  message?: string
): void {
  const allMatch = array.every(predicate);
  expect(allMatch).toBe(true);
}

// ============================================
// Object Manipulation Utilities
// ============================================

/**
 * Deep clones an object for test isolation
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (obj instanceof Date) {
    return new Date(obj.getTime()) as any;
  }

  if (obj instanceof Array) {
    return obj.map((item) => deepClone(item)) as any;
  }

  if (obj instanceof Object) {
    const clonedObj = {} as T;
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }

  return obj;
}

/**
 * Merges objects deeply for creating test variations
 */
export function deepMerge<T extends object>(target: T, ...sources: Partial<T>[]): T {
  if (!sources.length) return target;

  const source = sources.shift();
  if (!source) return target;

  const result = { ...target };

  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      const sourceValue = source[key];
      const targetValue = result[key];

      if (
        sourceValue &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        !(sourceValue instanceof Date)
      ) {
        result[key] = deepMerge(
          targetValue && typeof targetValue === 'object' ? targetValue : ({} as any),
          sourceValue as any
        );
      } else {
        result[key] = sourceValue as any;
      }
    }
  }

  return deepMerge(result, ...sources);
}

/**
 * Omits properties from an object
 */
export function omit<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  keys.forEach((key) => delete result[key]);
  return result;
}

/**
 * Picks properties from an object
 */
export function pick<T extends object, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach((key) => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
}

// ============================================
// Performance Testing Utilities
// ============================================

/**
 * Measures execution time of a function
 */
export async function measureExecutionTime<T>(
  fn: () => T | Promise<T>
): Promise<{ result: T; timeMs: number }> {
  const start = performance.now();
  const result = await fn();
  const timeMs = performance.now() - start;

  return { result, timeMs };
}

/**
 * Asserts that a function executes within a time limit
 */
export async function assertExecutionTime<T>(
  fn: () => T | Promise<T>,
  maxTimeMs: number,
  message?: string
): Promise<T> {
  const { result, timeMs } = await measureExecutionTime(fn);

  expect(timeMs).toBeLessThanOrEqual(maxTimeMs);

  return result;
}

// ============================================
// Console Utilities
// ============================================

/**
 * Captures console output during test execution
 */
export function captureConsole(): {
  logs: string[];
  warns: string[];
  errors: string[];
  restore: () => void;
} {
  const logs: string[] = [];
  const warns: string[] = [];
  const errors: string[] = [];

  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  console.log = (...args: any[]) => logs.push(args.join(' '));
  console.warn = (...args: any[]) => warns.push(args.join(' '));
  console.error = (...args: any[]) => errors.push(args.join(' '));

  return {
    logs,
    warns,
    errors,
    restore: () => {
      console.log = originalLog;
      console.warn = originalWarn;
      console.error = originalError;
    },
  };
}

/**
 * Suppresses console output during test execution
 */
export function suppressConsole(): () => void {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};

  return () => {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
  };
}

// ============================================
// Exports
// ============================================

/**
 * Test utilities namespace for grouped imports
 */
export const TestUtils = {
  // Date utilities
  createTestDate,
  freezeTime,
  assertDatesEqual,

  // Random generators
  randomInt,
  randomFloat,
  randomBool,
  randomPick,
  randomString,
  mockUUID,

  // API mocking
  createMockAPIResponse,
  createMockErrorResponse,
  createMockFetchResponse,

  // Async helpers
  waitFor,
  waitForError,
  sleep,
  flushPromises,

  // Validation
  assertInRange,
  assertHasProperties,
  assertMatchesShape,
  assertArrayContains,
  assertAllItemsMatch,

  // Object manipulation
  deepClone,
  deepMerge,
  omit,
  pick,

  // Performance
  measureExecutionTime,
  assertExecutionTime,

  // Console
  captureConsole,
  suppressConsole,
};

export default TestUtils;
