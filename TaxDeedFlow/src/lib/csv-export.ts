/**
 * CSV Export Utility
 *
 * Client-side CSV generation for property analysis reports.
 * Converts PropertyReportData to downloadable CSV files with proper formatting.
 *
 * @module lib/csv-export
 * @author Claude Code Agent
 * @date 2026-01-22
 */

import type { PropertyReportData } from '@/types/report';

/**
 * CSV column definition
 */
export interface CSVColumn {
  /** Column key/identifier */
  key: string;
  /** Column header text */
  header: string;
  /** Optional formatter function */
  formatter?: (value: unknown) => string;
}

/**
 * Configuration options for CSV export
 */
export interface CSVExportOptions {
  /** Output filename (default: auto-generated) */
  filename?: string;
  /** Field delimiter (default: ',') */
  delimiter?: ',' | '\t' | ';';
  /** Include UTF-8 BOM for Excel compatibility (default: true) */
  includeUtf8Bom?: boolean;
  /** Columns to include (default: all) */
  columns?: CSVColumn[];
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
 * Default configuration for CSV export
 */
const DEFAULT_OPTIONS: Required<Omit<CSVExportOptions, 'filename' | 'columns'>> = {
  delimiter: ',',
  includeUtf8Bom: true,
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
 * Generates a descriptive filename for the property report CSV
 *
 * @param address - Property address
 * @param reportId - Optional report ID
 * @returns Formatted filename
 */
export function generateCSVFilename(
  address?: string,
  reportId?: string
): string {
  const dateStr = getDateString();

  if (address) {
    const sanitizedAddress = sanitizeForFilename(address);
    return `property-report-${sanitizedAddress}-${dateStr}.csv`;
  }

  if (reportId) {
    return `property-report-${reportId}-${dateStr}.csv`;
  }

  return `property-report-${dateStr}.csv`;
}

/**
 * Formats a value for CSV output
 * Handles special characters, quotes, and proper escaping
 *
 * @param value - Value to format
 * @param delimiter - Field delimiter being used
 * @returns Formatted CSV value
 */
export function formatCSVValue(
  value: unknown,
  delimiter: string = ','
): string {
  // Handle null/undefined
  if (value === null || value === undefined) {
    return '';
  }

  // Handle dates
  if (value instanceof Date) {
    return value.toISOString().split('T')[0]; // YYYY-MM-DD format
  }

  // Convert to string
  let stringValue = String(value);

  // Check if value needs quoting
  const needsQuoting =
    stringValue.includes(delimiter) ||
    stringValue.includes('"') ||
    stringValue.includes('\n') ||
    stringValue.includes('\r');

  if (needsQuoting) {
    // Escape existing quotes by doubling them
    stringValue = stringValue.replace(/"/g, '""');
    // Wrap in quotes
    return `"${stringValue}"`;
  }

  return stringValue;
}

/**
 * Converts an array of objects to CSV rows
 *
 * @param data - Array of objects to convert
 * @param columns - Column definitions
 * @param delimiter - Field delimiter
 * @returns CSV string
 */
function arrayToCSV(
  data: unknown[],
  columns: CSVColumn[],
  delimiter: string
): string {
  if (data.length === 0) {
    return '';
  }

  const rows: string[] = [];

  // Add header row
  const headers = columns.map((col) => formatCSVValue(col.header, delimiter));
  rows.push(headers.join(delimiter));

  // Add data rows
  for (const item of data) {
    const values = columns.map((col) => {
      const value = (item as Record<string, unknown>)[col.key];
      const formattedValue = col.formatter ? col.formatter(value) : value;
      return formatCSVValue(formattedValue, delimiter);
    });
    rows.push(values.join(delimiter));
  }

  return rows.join('\n');
}

/**
 * Converts PropertyReportData to CSV format
 * Flattens nested structures into multiple sections
 *
 * @param reportData - Property report data to convert
 * @param options - Export options
 * @returns CSV string
 */
export function convertReportToCSV(
  reportData: PropertyReportData,
  options: CSVExportOptions = {}
): string {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  const { delimiter } = mergedOptions;
  const sections: string[] = [];

  // Property Information Section
  if (mergedOptions.includePropertyInfo) {
    sections.push('PROPERTY INFORMATION');
    const propertyRows = [
      ['Address', reportData.property.address || 'N/A'],
      ['Parcel ID', reportData.property.parcel_id || 'N/A'],
      ['County', reportData.property.county_name || 'N/A'],
      ['Property Type', reportData.property.property_type || 'N/A'],
      ['Square Feet', reportData.property.building_sqft?.toString() || 'N/A'],
      ['Bedrooms', reportData.property.bedrooms?.toString() || 'N/A'],
      ['Bathrooms', reportData.property.bathrooms?.toString() || 'N/A'],
      ['Year Built', reportData.property.year_built?.toString() || 'N/A'],
      ['Lot Size (sqft)', reportData.property.lot_size_sqft?.toString() || 'N/A'],
      ['Zoning', reportData.property.zoning || 'N/A'],
    ];
    sections.push(
      propertyRows
        .map(([key, value]) =>
          [formatCSVValue(key, delimiter), formatCSVValue(value, delimiter)].join(
            delimiter
          )
        )
        .join('\n')
    );
    sections.push(''); // Empty line
  }

  // Score Information Section
  if (mergedOptions.includeScores) {
    sections.push('INVESTMENT SCORES');
    const scoreRows = [
      ['Overall Score', reportData.scoreBreakdown.totalScore.toString()],
      ['Overall Grade', reportData.scoreBreakdown.gradeResult.gradeWithModifier],
      ['Overall Percentage', `${reportData.scoreBreakdown.gradeResult.percentage.toFixed(1)}%`],
      ['Location Score', `${reportData.scoreBreakdown.location.score}/25`],
      ['Risk Score', `${reportData.scoreBreakdown.risk.score}/25`],
      ['Financial Score', `${reportData.scoreBreakdown.financial.score}/25`],
      ['Market Score', `${reportData.scoreBreakdown.market.score}/25`],
      ['Profit Score', `${reportData.scoreBreakdown.profit.score}/25`],
    ];
    sections.push(
      scoreRows
        .map(([key, value]) =>
          [formatCSVValue(key, delimiter), formatCSVValue(value, delimiter)].join(
            delimiter
          )
        )
        .join('\n')
    );
    sections.push(''); // Empty line
  }

  // Cost Analysis Section
  if (mergedOptions.includeCosts) {
    sections.push('COST ANALYSIS');
    const costRows = [
      ['Bid Amount', `$${reportData.costAnalysis.acquisition.bidAmount.toLocaleString()}`],
      [
        'Premium Amount',
        `$${reportData.costAnalysis.acquisition.premiumAmount.toLocaleString()}`,
      ],
      [
        'Title Costs',
        `$${reportData.costAnalysis.acquisition.titleCosts.toLocaleString()}`,
      ],
      [
        'Total Acquisition',
        `$${reportData.costAnalysis.acquisition.total.toLocaleString()}`,
      ],
      [
        'Rehab Estimate (Low)',
        `$${reportData.costAnalysis.rehab.minimumEstimate.toLocaleString()}`,
      ],
      [
        'Rehab Estimate (Expected)',
        `$${reportData.costAnalysis.rehab.expectedEstimate.toLocaleString()}`,
      ],
      [
        'Rehab Estimate (High)',
        `$${reportData.costAnalysis.rehab.maximumEstimate.toLocaleString()}`,
      ],
      [
        'Holding Period (months)',
        reportData.costAnalysis.holding.holdingPeriodMonths.toString(),
      ],
      [
        'Total Holding Costs',
        `$${reportData.costAnalysis.holding.totalHoldingCosts.toLocaleString()}`,
      ],
      [
        'Selling Costs',
        `$${reportData.costAnalysis.selling.total.toLocaleString()}`,
      ],
      ['TOTAL ALL-IN COSTS', `$${reportData.costAnalysis.totalCosts.toLocaleString()}`],
    ];
    sections.push(
      costRows
        .map(([key, value]) =>
          [formatCSVValue(key, delimiter), formatCSVValue(value, delimiter)].join(
            delimiter
          )
        )
        .join('\n')
    );
    sections.push(''); // Empty line
  }

  // ROI Analysis Section
  if (mergedOptions.includeROI) {
    sections.push('ROI ANALYSIS');
    const roiRows = [
      [
        'Total Investment',
        `$${reportData.roiAnalysis.totalInvestment.toLocaleString()}`,
      ],
      [
        'After Repair Value (ARV)',
        `$${reportData.roiAnalysis.afterRepairValue.toLocaleString()}`,
      ],
      [
        'Estimated Profit',
        `$${reportData.roiAnalysis.estimatedProfit.toLocaleString()}`,
      ],
      ['ROI Percentage', `${reportData.roiAnalysis.roiPercentage.toFixed(1)}%`],
      ['Annualized ROI', `${reportData.roiAnalysis.annualizedROI.toFixed(1)}%`],
      ['Profit Margin', `${reportData.roiAnalysis.profitMargin.toFixed(1)}%`],
      [
        'Break-Even Price',
        `$${reportData.roiAnalysis.breakEvenPrice.toLocaleString()}`,
      ],
      [
        'Maximum Allowable Offer',
        `$${reportData.roiAnalysis.maximumAllowableOffer.toLocaleString()}`,
      ],
      ['Confidence Level', reportData.roiAnalysis.confidenceLevel],
    ];
    sections.push(
      roiRows
        .map(([key, value]) =>
          [formatCSVValue(key, delimiter), formatCSVValue(value, delimiter)].join(
            delimiter
          )
        )
        .join('\n')
    );
    sections.push(''); // Empty line
  }

  // Risk Analysis Section
  if (mergedOptions.includeRiskAnalysis) {
    sections.push('RISK ANALYSIS');
    const riskColumns: CSVColumn[] = [
      { key: 'type', header: 'Risk Type' },
      { key: 'level', header: 'Risk Level' },
      { key: 'score', header: 'Risk Score' },
      { key: 'summary', header: 'Summary' },
    ];

    const riskData = [
      {
        type: 'Flood',
        level: reportData.riskAnalysis.flood.level,
        score: reportData.riskAnalysis.flood.score,
        summary: reportData.riskAnalysis.flood.summary,
      },
      {
        type: 'Earthquake',
        level: reportData.riskAnalysis.earthquake.level,
        score: reportData.riskAnalysis.earthquake.score,
        summary: reportData.riskAnalysis.earthquake.summary,
      },
      {
        type: 'Wildfire',
        level: reportData.riskAnalysis.wildfire.level,
        score: reportData.riskAnalysis.wildfire.score,
        summary: reportData.riskAnalysis.wildfire.summary,
      },
      {
        type: 'Hurricane',
        level: reportData.riskAnalysis.hurricane.level,
        score: reportData.riskAnalysis.hurricane.score,
        summary: reportData.riskAnalysis.hurricane.summary,
      },
      {
        type: 'Environmental',
        level: reportData.riskAnalysis.environmental.level,
        score: reportData.riskAnalysis.environmental.score,
        summary: reportData.riskAnalysis.environmental.summary,
      },
    ];

    sections.push(arrayToCSV(riskData, riskColumns, delimiter));
    sections.push(''); // Empty line
    sections.push(
      `Overall Risk Score${delimiter}${reportData.riskAnalysis.overallRiskScore}`
    );
    sections.push(
      `Overall Risk Level${delimiter}${reportData.riskAnalysis.overallRiskLevel}`
    );
    sections.push(''); // Empty line
  }

  // Comparables Section
  if (
    mergedOptions.includeComparables &&
    reportData.comparables.comparables.length > 0
  ) {
    sections.push('COMPARABLE SALES');
    const compColumns: CSVColumn[] = [
      { key: 'address', header: 'Address' },
      {
        key: 'salePrice',
        header: 'Sale Price',
        formatter: (val) => (val ? `$${Number(val).toLocaleString()}` : 'N/A'),
      },
      {
        key: 'saleDate',
        header: 'Sale Date',
        formatter: (val) => (val instanceof Date ? val.toISOString().split('T')[0] : String(val)),
      },
      {
        key: 'pricePerSqFt',
        header: 'Price/SqFt',
        formatter: (val) => (val ? `$${Number(val).toFixed(2)}` : 'N/A'),
      },
      { key: 'squareFeet', header: 'Square Feet' },
      { key: 'bedrooms', header: 'Beds' },
      { key: 'bathrooms', header: 'Baths' },
      {
        key: 'distanceMiles',
        header: 'Distance (mi)',
        formatter: (val) => (val ? Number(val).toFixed(2) : 'N/A'),
      },
      { key: 'similarityScore', header: 'Similarity %' },
    ];

    sections.push(arrayToCSV(reportData.comparables.comparables, compColumns, delimiter));
    sections.push(''); // Empty line
    sections.push(
      `Estimated Market Value${delimiter}$${reportData.comparables.estimatedValue.toLocaleString()}`
    );
    sections.push(''); // Empty line
  }

  // Recommendations Section
  if (
    mergedOptions.includeRecommendations &&
    reportData.recommendations.length > 0
  ) {
    sections.push('RECOMMENDATIONS');
    const recColumns: CSVColumn[] = [
      { key: 'priority', header: 'Priority' },
      { key: 'category', header: 'Category' },
      { key: 'title', header: 'Title' },
      { key: 'description', header: 'Description' },
      {
        key: 'estimatedCost',
        header: 'Estimated Cost',
        formatter: (val) => (val ? `$${Number(val).toLocaleString()}` : 'N/A'),
      },
      { key: 'timeframe', header: 'Timeframe' },
    ];

    sections.push(arrayToCSV(reportData.recommendations, recColumns, delimiter));
    sections.push(''); // Empty line
  }

  // Metadata Section
  sections.push('REPORT METADATA');
  const metadataRows = [
    [
      'Generated At',
      reportData.metadata.generatedAt instanceof Date
        ? reportData.metadata.generatedAt.toISOString()
        : String(reportData.metadata.generatedAt),
    ],
    ['Report Version', reportData.metadata.reportVersion],
    ['Data Freshness', reportData.metadata.dataFreshness],
    [
      'Data Sources',
      reportData.metadata.dataSources.join('; '),
    ],
  ];
  sections.push(
    metadataRows
      .map(([key, value]) =>
        [formatCSVValue(key, delimiter), formatCSVValue(value, delimiter)].join(
          delimiter
        )
      )
      .join('\n')
  );

  return sections.join('\n');
}

/**
 * Triggers browser download of CSV file
 *
 * @param blob - CSV Blob to download
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
 * Exports PropertyReportData to CSV and triggers download
 *
 * @param reportData - Property report data to export
 * @param filename - Output filename (default: auto-generated)
 * @param options - CSV export options
 * @throws Error if browser environment not available
 *
 * @example
 * ```typescript
 * // Basic usage
 * await exportReportToCSV(reportData);
 *
 * // With custom filename
 * await exportReportToCSV(reportData, 'my-report.csv');
 *
 * // With custom options
 * await exportReportToCSV(reportData, undefined, {
 *   delimiter: '\t',
 *   includeComparables: false
 * });
 * ```
 */
export async function exportReportToCSV(
  reportData: PropertyReportData,
  filename?: string,
  options?: CSVExportOptions
): Promise<void> {
  if (typeof window === 'undefined') {
    throw new Error('CSV export is only available in browser environment');
  }

  // Generate filename if not provided
  const finalFilename =
    filename ||
    options?.filename ||
    generateCSVFilename(reportData.property.address || undefined, reportData.property.parcel_id || undefined);

  // Convert report to CSV
  const csvContent = convertReportToCSV(reportData, options);

  // Create blob
  const blob = await exportReportToCSVBlob(reportData, options);

  // Download
  downloadBlob(blob, finalFilename);
}

/**
 * Exports PropertyReportData to CSV and returns as Blob
 * Useful for programmatic handling (e.g., email attachments, uploads)
 *
 * @param reportData - Property report data to export
 * @param options - CSV export options
 * @returns CSV as Blob
 *
 * @example
 * ```typescript
 * // Get CSV as blob
 * const blob = await exportReportToCSVBlob(reportData);
 *
 * // Upload to server
 * const formData = new FormData();
 * formData.append('file', blob, 'report.csv');
 * await fetch('/api/upload', { method: 'POST', body: formData });
 * ```
 */
export async function exportReportToCSVBlob(
  reportData: PropertyReportData,
  options?: CSVExportOptions
): Promise<Blob> {
  // Convert report to CSV
  const csvContent = convertReportToCSV(reportData, options);

  // Prepare content with optional UTF-8 BOM
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  let blobContent = csvContent;

  if (mergedOptions.includeUtf8Bom) {
    // UTF-8 BOM for Excel compatibility
    const BOM = '\uFEFF';
    blobContent = BOM + csvContent;
  }

  // Create and return blob
  return new Blob([blobContent], { type: 'text/csv;charset=utf-8;' });
}
