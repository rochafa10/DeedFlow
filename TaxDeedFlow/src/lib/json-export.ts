/**
 * JSON Export Utility
 *
 * Client-side JSON generation for property analysis reports.
 * Converts PropertyReportData to downloadable JSON files with proper formatting.
 *
 * @module lib/json-export
 * @author Claude Code Agent
 * @date 2026-01-22
 */

import type { PropertyReportData } from '@/types/report';

/**
 * Configuration options for JSON export
 */
export interface JSONExportOptions {
  /** Output filename (default: auto-generated) */
  filename?: string;
  /** Pretty-print with indentation (default: true) */
  prettyPrint?: boolean;
  /** Indentation spaces for pretty-print (default: 2) */
  indentSpaces?: number;
  /** Exclude null values from output (default: false) */
  excludeNullValues?: boolean;
  /** Exclude undefined values from output (default: true) */
  excludeUndefinedValues?: boolean;
  /** Include metadata section (default: true) */
  includeMetadata?: boolean;
  /** Include property info section (default: true) */
  includePropertyInfo?: boolean;
  /** Include scores section (default: true) */
  includeScores?: boolean;
  /** Include costs section (default: true) */
  includeCosts?: boolean;
  /** Include ROI section (default: true) */
  includeROI?: boolean;
  /** Include risk analysis section (default: true) */
  includeRiskAnalysis?: boolean;
  /** Include comparables section (default: true) */
  includeComparables?: boolean;
  /** Include recommendations section (default: true) */
  includeRecommendations?: boolean;
}

/**
 * Default configuration for JSON export
 */
const DEFAULT_OPTIONS: Required<Omit<JSONExportOptions, 'filename'>> = {
  prettyPrint: true,
  indentSpaces: 2,
  excludeNullValues: false,
  excludeUndefinedValues: true,
  includeMetadata: true,
  includePropertyInfo: true,
  includeScores: true,
  includeCosts: true,
  includeROI: true,
  includeRiskAnalysis: true,
  includeComparables: true,
  includeRecommendations: true,
};

/**
 * Sanitizes address string for use in filename
 * Removes special characters and replaces spaces with hyphens
 *
 * @param address - Property address to sanitize
 * @returns Filename-safe string
 */
function sanitizeForFilename(address: string): string {
  return address
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Remove consecutive hyphens
    .substring(0, 50); // Limit length
}

/**
 * Generates a formatted date string for filename
 *
 * @returns Date string in YYYY-MM-DD format
 */
function getDateString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Generates a descriptive filename for the property report JSON
 *
 * @param address - Property address
 * @param reportId - Optional report ID
 * @returns Formatted filename
 */
export function generateJSONFilename(
  address?: string,
  reportId?: string
): string {
  const dateStr = getDateString();

  if (address) {
    const sanitizedAddress = sanitizeForFilename(address);
    return `property-report-${sanitizedAddress}-${dateStr}.json`;
  }

  if (reportId) {
    return `property-report-${reportId}-${dateStr}.json`;
  }

  return `property-report-${dateStr}.json`;
}

/**
 * Recursively removes null and/or undefined values from an object
 *
 * @param obj - Object to clean
 * @param excludeNull - Whether to remove null values
 * @param excludeUndefined - Whether to remove undefined values
 * @returns Cleaned object
 */
function removeEmptyValues(
  obj: unknown,
  excludeNull: boolean,
  excludeUndefined: boolean
): unknown {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj
      .map((item) => removeEmptyValues(item, excludeNull, excludeUndefined))
      .filter((item) => {
        if (excludeNull && item === null) return false;
        if (excludeUndefined && item === undefined) return false;
        return true;
      });
  }

  if (typeof obj === 'object' && obj !== null) {
    const cleaned: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(obj)) {
      if (excludeNull && value === null) continue;
      if (excludeUndefined && value === undefined) continue;

      cleaned[key] = removeEmptyValues(value, excludeNull, excludeUndefined);
    }

    return cleaned;
  }

  return obj;
}

/**
 * Prepares PropertyReportData for JSON export
 * Filters sections and cleans values based on options
 *
 * @param reportData - Property report data to prepare
 * @param options - Export options
 * @returns Prepared data object
 */
export function prepareReportForJSON(
  reportData: PropertyReportData,
  options: JSONExportOptions = {}
): Partial<PropertyReportData> {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  // Start with empty object and selectively add sections
  const prepared: Partial<PropertyReportData> = {};

  // Property Information
  if (mergedOptions.includePropertyInfo) {
    prepared.property = reportData.property;
  }

  // Score Breakdown
  if (mergedOptions.includeScores) {
    prepared.scoreBreakdown = reportData.scoreBreakdown;
  }

  // Cost Analysis
  if (mergedOptions.includeCosts) {
    prepared.costAnalysis = reportData.costAnalysis;
  }

  // ROI Analysis
  if (mergedOptions.includeROI) {
    prepared.roiAnalysis = reportData.roiAnalysis;
  }

  // Risk Analysis
  if (mergedOptions.includeRiskAnalysis) {
    prepared.riskAnalysis = reportData.riskAnalysis;
  }

  // Comparables
  if (mergedOptions.includeComparables) {
    prepared.comparables = reportData.comparables;
  }

  // Recommendations
  if (mergedOptions.includeRecommendations) {
    prepared.recommendations = reportData.recommendations;
  }

  // Metadata
  if (mergedOptions.includeMetadata) {
    prepared.metadata = reportData.metadata;
  }

  // Clean null/undefined values if requested
  if (mergedOptions.excludeNullValues || mergedOptions.excludeUndefinedValues) {
    return removeEmptyValues(
      prepared,
      mergedOptions.excludeNullValues,
      mergedOptions.excludeUndefinedValues
    ) as Partial<PropertyReportData>;
  }

  return prepared;
}

/**
 * Converts PropertyReportData to JSON string
 *
 * @param reportData - Property report data to convert
 * @param options - Export options
 * @returns JSON string
 */
export function convertReportToJSON(
  reportData: PropertyReportData,
  options: JSONExportOptions = {}
): string {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  // Prepare the data
  const prepared = prepareReportForJSON(reportData, options);

  // Convert to JSON with optional pretty-printing
  if (mergedOptions.prettyPrint) {
    return JSON.stringify(prepared, null, mergedOptions.indentSpaces);
  }

  return JSON.stringify(prepared);
}

/**
 * Triggers browser download of JSON file
 *
 * @param blob - JSON Blob to download
 * @param filename - Filename for download
 */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports PropertyReportData to JSON and triggers download
 *
 * @param reportData - Property report data to export
 * @param filename - Output filename (default: auto-generated)
 * @param options - JSON export options
 * @throws Error if browser environment not available
 *
 * @example
 * ```typescript
 * // Basic usage
 * await exportReportToJSON(reportData);
 *
 * // With custom filename
 * await exportReportToJSON(reportData, 'my-report.json');
 *
 * // With custom options
 * await exportReportToJSON(reportData, undefined, {
 *   prettyPrint: false,
 *   excludeNullValues: true,
 *   includeComparables: false
 * });
 * ```
 */
export async function exportReportToJSON(
  reportData: PropertyReportData,
  filename?: string,
  options?: JSONExportOptions
): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('JSON export is only available in browser environment');
  }

  // Generate filename if not provided
  const finalFilename =
    filename ||
    options?.filename ||
    generateJSONFilename(
      reportData.property.address || undefined,
      reportData.property.parcel_id || undefined
    );

  // Create blob
  const blob = await exportReportToJSONBlob(reportData, options);

  // Download
  downloadBlob(blob, finalFilename);
}

/**
 * Exports PropertyReportData to JSON and returns as Blob
 * Useful for programmatic handling (e.g., API uploads, email attachments)
 *
 * @param reportData - Property report data to export
 * @param options - JSON export options
 * @returns JSON as Blob
 *
 * @example
 * ```typescript
 * // Get JSON as blob
 * const blob = await exportReportToJSONBlob(reportData);
 *
 * // Upload to server
 * const formData = new FormData();
 * formData.append('file', blob, 'report.json');
 * await fetch('/api/upload', { method: 'POST', body: formData });
 *
 * // Export only scores and ROI (partial export)
 * const blob = await exportReportToJSONBlob(reportData, {
 *   includePropertyInfo: false,
 *   includeCosts: false,
 *   includeRiskAnalysis: false,
 *   includeComparables: false,
 *   includeRecommendations: false,
 *   includeMetadata: false
 * });
 * ```
 */
export async function exportReportToJSONBlob(
  reportData: PropertyReportData,
  options?: JSONExportOptions
): Promise<Blob> {
  // Convert report to JSON
  const jsonContent = convertReportToJSON(reportData, options);

  // Create and return blob
  return new Blob([jsonContent], {
    type: 'application/json;charset=utf-8;',
  });
}
