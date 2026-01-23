/**
 * Property Report Page Types
 *
 * Type definitions specific to the property report page route.
 * Contains database query result types and page-specific interfaces.
 *
 * @module types/property-page
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-22
 */

// ============================================
// Database Query Result Types
// ============================================

/**
 * Property data structure from Supabase database query
 *
 * This represents the raw data structure returned from the database,
 * which differs slightly from the scoring PropertyData type.
 */
export interface PropertyDatabaseRow {
  /** Unique property identifier (UUID) */
  id: string;
  /** Parcel ID from the county assessor */
  parcel_id: string;
  /** Full street address */
  property_address: string;
  /** City name */
  city?: string;
  /** State abbreviation (e.g., "PA", "CA") */
  state?: string;
  /** ZIP code */
  zip?: string;
  /** County name for display */
  county_name?: string;
  /** Geographic coordinates */
  coordinates?: { lat: number; lng: number };
  /** County assessed value */
  assessed_value?: number;
  /** Estimated market value */
  market_value?: number;
  /** Total amount due (taxes, fees, penalties) */
  total_due?: number;
  /** Base tax amount */
  tax_amount?: number;
  /** Lot size in square feet */
  lot_size_sqft?: number;
  /** Lot size in acres */
  lot_size_acres?: number;
  /** Building square footage */
  building_sqft?: number;
  /** Year the structure was built */
  year_built?: number;
  /** Number of bedrooms */
  bedrooms?: number;
  /** Number of bathrooms */
  bathrooms?: number;
  /** Property type classification */
  property_type?: string;
  /** Zoning designation */
  zoning?: string;
  /** Land use classification */
  land_use?: string;
  /** Type of sale (upset, judicial, repository, etc.) */
  sale_type?: string;
  /** Scheduled auction date (ISO string) */
  sale_date?: string;
  /** Current auction status */
  auction_status?: string;
  /** Current owner name(s) */
  owner_name?: string;
  /** URL to the property screenshot */
  screenshot_url?: string;
}
