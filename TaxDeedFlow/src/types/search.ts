/**
 * Advanced Search & Filter System - Type Definitions
 *
 * This file contains TypeScript interfaces and types for the advanced
 * property search system, including saved searches, filter criteria,
 * and recently viewed properties.
 *
 * @module types/search
 * @author Claude Code Agent
 * @date 2026-01-23
 */

// ============================================
// Risk Factor Types
// ============================================

/**
 * Risk level classification for filter criteria
 */
export type RiskLevel = 'low' | 'medium' | 'high'

// ============================================
// Filter Criteria
// ============================================

/**
 * Risk factor filters for advanced search
 * Allows filtering by individual risk categories
 */
export interface RiskFactorFilters {
  /** Flood risk level filter (null = no filter) */
  flood?: RiskLevel | null
  /** Fire risk level filter (null = no filter) */
  fire?: RiskLevel | null
  /** Earthquake risk level filter (null = no filter) */
  earthquake?: RiskLevel | null
  /** Environmental risk level filter (null = no filter) */
  environmental?: RiskLevel | null
}

/**
 * Geographic coordinate for map-based polygon search
 * Format: [latitude, longitude]
 */
export type Coordinate = [number, number]

/**
 * Filter criteria for property search
 * Matches the JSONB structure in saved_searches.filter_criteria
 */
export interface FilterCriteria {
  /** Minimum investment score (0-125) */
  scoreMin?: number
  /** Maximum investment score (0-125) */
  scoreMax?: number
  /** List of county names to filter by */
  counties?: string[]
  /** Risk factor filters */
  riskFactors?: RiskFactorFilters
  /** Polygon coordinates for map-based search */
  polygonCoords?: Coordinate[]
}

// ============================================
// Saved Search Types
// ============================================

/**
 * Saved search entity from the database
 * Represents a user's saved search configuration
 */
export interface SavedSearch {
  /** Unique identifier (UUID) */
  id: string
  /** User who created this search (UUID) */
  userId: string
  /** Display name for the saved search */
  name: string
  /** Whether this is the user's default search */
  isDefault: boolean
  /** Search filter criteria */
  filterCriteria: FilterCriteria
  /** When the search was created */
  createdAt: Date
  /** When the search was last updated */
  updatedAt: Date
}

/**
 * Input for creating or updating a saved search
 */
export interface SavedSearchInput {
  /** Display name for the saved search */
  name: string
  /** Search filter criteria */
  filterCriteria: FilterCriteria
  /** Whether this should be the default search */
  isDefault?: boolean
}

// ============================================
// Recently Viewed Properties
// ============================================

/**
 * Recently viewed property record
 * Tracks user's property viewing history
 */
export interface RecentlyViewedProperty {
  /** Unique identifier for the view record (UUID) */
  id: string
  /** User who viewed the property (UUID) */
  userId: string
  /** Property that was viewed (UUID) */
  propertyId: string
  /** Property parcel ID for display */
  parcelId: string
  /** Property address for display */
  propertyAddress: string | null
  /** City name */
  city: string | null
  /** State code (e.g., 'PA', 'FL') */
  stateCode: string
  /** Total amount due */
  totalDue: number | null
  /** Scheduled sale date */
  saleDate: Date | null
  /** When the property was viewed */
  viewedAt: Date
}

/**
 * Input for tracking a property view
 */
export interface TrackPropertyViewInput {
  /** Property ID to track (UUID) */
  propertyId: string
}

// ============================================
// Search API Response Types
// ============================================

/**
 * API response for listing saved searches
 */
export interface SavedSearchesResponse {
  /** List of saved searches */
  searches: SavedSearch[]
  /** Total count of saved searches */
  total: number
}

/**
 * API response for a single saved search
 */
export interface SavedSearchResponse {
  /** Saved search details */
  search: SavedSearch
}

/**
 * API response for recently viewed properties
 */
export interface RecentlyViewedResponse {
  /** List of recently viewed properties */
  properties: RecentlyViewedProperty[]
  /** Total count of recently viewed properties */
  total: number
}

/**
 * API response for tracking a property view
 */
export interface TrackViewResponse {
  /** Whether the view was successfully tracked */
  success: boolean
  /** Record ID of the tracked view */
  viewRecordId: string
}

// ============================================
// Search State Management
// ============================================

/**
 * Active search state in the UI
 * Tracks the current filters and search results
 */
export interface SearchState {
  /** Current filter criteria */
  filters: FilterCriteria
  /** Currently selected saved search (if any) */
  selectedSearch: SavedSearch | null
  /** Whether filters have been modified since loading saved search */
  isDirty: boolean
  /** Whether a search is currently in progress */
  isSearching: boolean
}

/**
 * Search query parameters for API requests
 * Used to construct property search queries
 */
export interface SearchQueryParams {
  /** Minimum score filter */
  scoreMin?: number
  /** Maximum score filter */
  scoreMax?: number
  /** Comma-separated county names */
  counties?: string
  /** JSON-encoded risk factors */
  riskFactors?: string
  /** JSON-encoded polygon coordinates */
  polygonCoords?: string
  /** Pagination: page number */
  page?: number
  /** Pagination: items per page */
  limit?: number
}
