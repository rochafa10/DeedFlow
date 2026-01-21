/**
 * Format Utility Functions
 *
 * Provides consistent formatting for currency, percentages, numbers, and dates
 * used throughout the financial analysis UI components.
 *
 * @module lib/utils/format
 * @author Claude Code Agent
 * @date 2026-01-16
 */

// ============================================
// Currency Formatting
// ============================================

/**
 * Format a number as USD currency with full precision
 * @param value - The numeric value to format
 * @returns Formatted currency string (e.g., "$125,000")
 */
export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '$0';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Format a number as compact USD currency
 * @param value - The numeric value to format
 * @returns Compact formatted currency string (e.g., "$125k", "$1.2M")
 */
export function formatCurrencyCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '$0';
  }

  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1_000_000) {
    const millions = absValue / 1_000_000;
    return `${sign}$${millions.toFixed(millions >= 10 ? 1 : 2)}M`;
  }

  if (absValue >= 1_000) {
    const thousands = absValue / 1_000;
    return `${sign}$${thousands.toFixed(thousands >= 100 ? 0 : 1)}k`;
  }

  return formatCurrency(value);
}

/**
 * Format a number as USD currency with cents
 * @param value - The numeric value to format
 * @returns Formatted currency string with cents (e.g., "$125,000.50")
 */
export function formatCurrencyWithCents(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '$0.00';
  }

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

// ============================================
// Percentage Formatting
// ============================================

/**
 * Format a number as a percentage
 * @param value - The numeric value (can be decimal like 0.25 or whole like 25)
 * @param isDecimal - If true, treats value as decimal (0.25 = 25%)
 * @param decimals - Number of decimal places to show
 * @returns Formatted percentage string (e.g., "25%", "25.5%")
 */
export function formatPercent(
  value: number | null | undefined,
  isDecimal: boolean = false,
  decimals: number = 1
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0%';
  }

  const percentValue = isDecimal ? value * 100 : value;

  return new Intl.NumberFormat('en-US', {
    style: 'percent',
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  }).format(percentValue / 100);
}

/**
 * Format a decimal as percentage (0.25 -> 25%)
 * @param value - Decimal value (e.g., 0.25 for 25%)
 * @param decimals - Number of decimal places
 * @returns Formatted percentage string
 */
export function formatPercentDecimal(
  value: number | null | undefined,
  decimals: number = 1
): string {
  return formatPercent(value, true, decimals);
}

/**
 * Format a percentage compactly
 * @param value - Percentage value
 * @param isDecimal - If true, value is a decimal
 * @returns Compact percentage string (e.g., "25%", ">100%")
 */
export function formatPercentCompact(
  value: number | null | undefined,
  isDecimal: boolean = false
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0%';
  }

  const percentValue = isDecimal ? value * 100 : value;

  if (percentValue > 100) {
    return `>${Math.floor(percentValue)}%`;
  }

  if (percentValue < -100) {
    return `<${Math.ceil(percentValue)}%`;
  }

  return `${Math.round(percentValue)}%`;
}

// ============================================
// Number Formatting
// ============================================

/**
 * Format a number with thousand separators
 * @param value - The numeric value to format
 * @param decimals - Number of decimal places
 * @returns Formatted number string (e.g., "125,000")
 */
export function formatNumber(
  value: number | null | undefined,
  decimals: number = 0
): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }

  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Format a number compactly
 * @param value - The numeric value to format
 * @returns Compact number string (e.g., "1.5k", "2.3M")
 */
export function formatNumberCompact(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '0';
  }

  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1_000_000) {
    return `${sign}${(absValue / 1_000_000).toFixed(1)}M`;
  }

  if (absValue >= 1_000) {
    return `${sign}${(absValue / 1_000).toFixed(1)}k`;
  }

  return formatNumber(value);
}

/**
 * Format square footage
 * @param value - Square footage value
 * @returns Formatted string (e.g., "1,500 sqft")
 */
export function formatSqft(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }

  return `${formatNumber(value)} sqft`;
}

/**
 * Format acres
 * @param value - Acres value
 * @returns Formatted string (e.g., "0.25 acres")
 */
export function formatAcres(value: number | null | undefined): string {
  if (value === null || value === undefined || isNaN(value)) {
    return 'N/A';
  }

  return `${value.toFixed(2)} acres`;
}

// ============================================
// Date Formatting
// ============================================

/**
 * Format a date string to a readable format
 * @param dateString - ISO date string or Date object
 * @param format - Output format: 'short', 'medium', 'long', 'relative'
 * @returns Formatted date string
 */
export function formatDate(
  dateString: string | Date | null | undefined,
  format: 'short' | 'medium' | 'long' | 'relative' = 'medium'
): string {
  if (!dateString) {
    return 'N/A';
  }

  const date = typeof dateString === 'string' ? new Date(dateString) : dateString;

  if (isNaN(date.getTime())) {
    return 'N/A';
  }

  const formatOptions: Record<string, Intl.DateTimeFormatOptions> = {
    short: { month: 'numeric', day: 'numeric', year: '2-digit' },
    medium: { month: 'short', day: 'numeric', year: 'numeric' },
    long: { month: 'long', day: 'numeric', year: 'numeric' },
    relative: { month: 'short', day: 'numeric', year: 'numeric' },
  };
  const options = formatOptions[format];

  if (format === 'relative') {
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  }

  return new Intl.DateTimeFormat('en-US', options).format(date);
}

/**
 * Format a date for display in tables/lists
 * @param dateString - ISO date string
 * @returns Formatted date (e.g., "Jan 15, 2026")
 */
export function formatDateShort(dateString: string | null | undefined): string {
  return formatDate(dateString, 'short');
}

// ============================================
// Specialized Formatting
// ============================================

/**
 * Format months duration
 * @param months - Number of months
 * @returns Formatted string (e.g., "6 months", "1 month", "1.5 years")
 */
export function formatMonths(months: number | null | undefined): string {
  if (months === null || months === undefined || isNaN(months)) {
    return 'N/A';
  }

  if (months === 1) return '1 month';
  if (months < 12) return `${months} months`;
  if (months === 12) return '1 year';
  if (months % 12 === 0) return `${months / 12} years`;

  const years = months / 12;
  return `${years.toFixed(1)} years`;
}

/**
 * Format distance in miles
 * @param miles - Distance in miles
 * @returns Formatted string (e.g., "0.5 mi", "2.3 mi")
 */
export function formatDistance(miles: number | null | undefined): string {
  if (miles === null || miles === undefined || isNaN(miles)) {
    return 'N/A';
  }

  return `${miles.toFixed(1)} mi`;
}

/**
 * Format price per square foot
 * @param pricePerSqft - Price per square foot value
 * @returns Formatted string (e.g., "$125/sqft")
 */
export function formatPricePerSqft(pricePerSqft: number | null | undefined): string {
  if (pricePerSqft === null || pricePerSqft === undefined || isNaN(pricePerSqft)) {
    return 'N/A';
  }

  return `$${formatNumber(pricePerSqft)}/sqft`;
}

/**
 * Format a ratio (e.g., 0.65 -> "65%")
 * @param ratio - Ratio value between 0 and 1
 * @param decimals - Number of decimal places
 * @returns Formatted percentage string
 */
export function formatRatio(ratio: number | null | undefined, decimals: number = 0): string {
  return formatPercent(ratio, true, decimals);
}

/**
 * Get color class based on value thresholds
 * @param value - Numeric value to evaluate
 * @param thresholds - Object with excellent, good, fair thresholds
 * @param higherIsBetter - If true, higher values are better
 * @returns Tailwind color class
 */
export function getValueColorClass(
  value: number,
  thresholds: { excellent: number; good: number; fair: number },
  higherIsBetter: boolean = true
): string {
  if (higherIsBetter) {
    if (value >= thresholds.excellent) return 'text-green-600 dark:text-green-400';
    if (value >= thresholds.good) return 'text-emerald-600 dark:text-emerald-400';
    if (value >= thresholds.fair) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  } else {
    if (value <= thresholds.excellent) return 'text-green-600 dark:text-green-400';
    if (value <= thresholds.good) return 'text-emerald-600 dark:text-emerald-400';
    if (value <= thresholds.fair) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  }
}

/**
 * Get status badge variant based on value
 * @param value - Numeric value
 * @param thresholds - Threshold configuration
 * @param higherIsBetter - If true, higher values are better
 * @returns Badge variant string
 */
export function getStatusBadgeVariant(
  value: number,
  thresholds: { excellent: number; good: number; fair: number },
  higherIsBetter: boolean = true
): 'excellent' | 'good' | 'fair' | 'poor' {
  if (higherIsBetter) {
    if (value >= thresholds.excellent) return 'excellent';
    if (value >= thresholds.good) return 'good';
    if (value >= thresholds.fair) return 'fair';
    return 'poor';
  } else {
    if (value <= thresholds.excellent) return 'excellent';
    if (value <= thresholds.good) return 'good';
    if (value <= thresholds.fair) return 'fair';
    return 'poor';
  }
}
