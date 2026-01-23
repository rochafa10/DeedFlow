/**
 * Supabase Query Result Utility Types
 *
 * Generic utility types for working with Supabase query results,
 * database operations, and type-safe data access in the TaxDeedFlow system.
 *
 * @module types/supabase
 */

import type { Database } from './database';

// ============================================================
// QUERY RESULT TYPES
// ============================================================

/**
 * Supabase Query Result Wrapper
 *
 * Standard wrapper for all Supabase query results including
 * data, error, and status information.
 *
 * @template T - The type of data returned by the query
 */
export interface SupabaseQueryResult<T> {
  data: T | null;
  error: {
    message: string;
    details?: string;
    hint?: string;
    code?: string;
  } | null;
  count?: number | null;
  status: number;
  statusText?: string;
}

/**
 * Supabase Single Row Result
 *
 * Result type for queries that return a single row (e.g., select().single())
 *
 * @template T - The table name from the database schema
 */
export type SupabaseSingleResult<T extends keyof Database['public']['Tables']> =
  SupabaseQueryResult<Database['public']['Tables'][T]['Row']>;

/**
 * Supabase Multiple Rows Result
 *
 * Result type for queries that return multiple rows
 *
 * @template T - The table name from the database schema
 */
export type SupabaseMultipleResult<T extends keyof Database['public']['Tables']> =
  SupabaseQueryResult<Database['public']['Tables'][T]['Row'][]>;

/**
 * Supabase RPC Result
 *
 * Result type for remote procedure calls (database functions)
 *
 * @template T - The return type of the RPC function
 */
export type SupabaseRPCResult<T> = SupabaseQueryResult<T>;

// ============================================================
// DATABASE ROW TYPES
// ============================================================

/**
 * Database Row Type Extractor
 *
 * Extracts the row type for a specific table from the database schema.
 * Use this when you need to reference a table's row structure.
 *
 * @template T - The table name from the database schema
 *
 * @example
 * ```typescript
 * const property: DatabaseRow<'properties'> = {
 *   id: '123',
 *   county_id: '456',
 *   parcel_number: 'ABC-123',
 *   // ... other property fields
 * };
 * ```
 */
export type DatabaseRow<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row'];

// ============================================================
// DATABASE INSERT TYPES
// ============================================================

/**
 * Database Insert Type
 *
 * Type for inserting new records into a table.
 * Automatically omits auto-generated fields (id, created_at, updated_at).
 *
 * @template T - The table name from the database schema
 *
 * @example
 * ```typescript
 * const newProperty: DatabaseInsert<'properties'> = {
 *   county_id: '456',
 *   parcel_number: 'ABC-123',
 *   property_address: '123 Main St',
 *   has_regrid_data: false,
 *   has_screenshot: false,
 * };
 *
 * const { data, error } = await supabase
 *   .from('properties')
 *   .insert(newProperty);
 * ```
 */
export type DatabaseInsert<T extends keyof Database['public']['Tables']> =
  Omit<Database['public']['Tables'][T]['Row'], 'id' | 'created_at' | 'updated_at'>;

// ============================================================
// DATABASE UPDATE TYPES
// ============================================================

/**
 * Database Update Type
 *
 * Type for updating existing records in a table.
 * All fields are optional (partial update).
 *
 * @template T - The table name from the database schema
 *
 * @example
 * ```typescript
 * const updates: DatabaseUpdate<'properties'> = {
 *   has_regrid_data: true,
 *   assessed_value: 150000,
 * };
 *
 * const { data, error } = await supabase
 *   .from('properties')
 *   .update(updates)
 *   .eq('id', propertyId);
 * ```
 */
export type DatabaseUpdate<T extends keyof Database['public']['Tables']> =
  Partial<DatabaseInsert<T>>;

// ============================================================
// QUERY FILTER TYPES
// ============================================================

/**
 * Database Query Filter
 *
 * Type-safe filter conditions for Supabase queries.
 *
 * @template T - The table name from the database schema
 */
export type DatabaseFilter<T extends keyof Database['public']['Tables']> = {
  [K in keyof Database['public']['Tables'][T]['Row']]?: Database['public']['Tables'][T]['Row'][K];
};

/**
 * Database Order By Direction
 */
export type OrderByDirection = 'asc' | 'desc';

/**
 * Database Order By Configuration
 *
 * Type-safe ordering configuration for Supabase queries.
 *
 * @template T - The table name from the database schema
 */
export interface DatabaseOrderBy<T extends keyof Database['public']['Tables']> {
  column: keyof Database['public']['Tables'][T]['Row'];
  direction?: OrderByDirection;
  nullsFirst?: boolean;
}

// ============================================================
// PAGINATION TYPES
// ============================================================

/**
 * Pagination Parameters
 *
 * Standard pagination configuration for list queries.
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
  offset?: number;
}

/**
 * Paginated Result
 *
 * Wrapper for paginated query results with metadata.
 *
 * @template T - The type of data in the results array
 */
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

/**
 * Paginated Supabase Result
 *
 * Combines Supabase query result with pagination metadata.
 *
 * @template T - The table name from the database schema
 */
export type PaginatedSupabaseResult<T extends keyof Database['public']['Tables']> =
  SupabaseQueryResult<PaginatedResult<Database['public']['Tables'][T]['Row']>>;

// ============================================================
// RELATIONSHIP TYPES
// ============================================================

/**
 * Database Row With Relations
 *
 * Extended row type that includes related data from other tables.
 *
 * @template T - The main table name
 * @template R - Object mapping relation names to their table names
 *
 * @example
 * ```typescript
 * type PropertyWithCounty = DatabaseRowWithRelations<'properties', {
 *   county: 'counties';
 * }>;
 *
 * // Result type:
 * // {
 * //   ...properties fields,
 * //   county: County
 * // }
 * ```
 */
export type DatabaseRowWithRelations<
  T extends keyof Database['public']['Tables'],
  R extends Record<string, keyof Database['public']['Tables']>
> = Database['public']['Tables'][T]['Row'] & {
  [K in keyof R]: Database['public']['Tables'][R[K]]['Row'];
};

// ============================================================
// COMMON QUERY PATTERNS
// ============================================================

/**
 * Property With All Relations
 *
 * Complete property data including all related tables.
 * Commonly used for property detail views and reports.
 */
export type PropertyWithRelations = DatabaseRowWithRelations<'properties', {
  county: 'counties';
  regrid_data: 'regrid_data';
  visual_validation: 'property_visual_validation';
  document: 'documents';
}>;

/**
 * County With Sales
 *
 * County data with its upcoming sales.
 * Useful for auction monitoring and planning.
 */
export type CountyWithSales = DatabaseRowWithRelations<'counties', {
  upcoming_sales: 'upcoming_sales';
}>;

/**
 * Report With Property
 *
 * Property report with its associated property data.
 */
export type ReportWithProperty = DatabaseRowWithRelations<'property_reports', {
  property: 'properties';
}>;

// ============================================================
// UPSERT TYPES
// ============================================================

/**
 * Database Upsert Type
 *
 * Type for upsert operations (insert or update).
 * Includes all fields from insert type, plus optional id for updates.
 *
 * @template T - The table name from the database schema
 */
export type DatabaseUpsert<T extends keyof Database['public']['Tables']> =
  DatabaseInsert<T> & { id?: string };

// ============================================================
// ERROR TYPES
// ============================================================

/**
 * Supabase Error Codes
 *
 * Common Supabase error codes for better error handling.
 */
export enum SupabaseErrorCode {
  PGRST116 = 'PGRST116', // Row not found
  PGRST301 = 'PGRST301', // Invalid JSON
  UNIQUE_VIOLATION = '23505',     // Unique violation
  FOREIGN_KEY_VIOLATION = '23503',     // Foreign key violation
  TABLE_NOT_EXISTS = '42P01',     // Table does not exist
  COLUMN_NOT_EXISTS = '42703',     // Column does not exist
}

/**
 * Typed Supabase Error
 *
 * Enhanced error type with typed error codes.
 */
export interface TypedSupabaseError {
  message: string;
  details?: string;
  hint?: string;
  code: SupabaseErrorCode | string;
}

// ============================================================
// UTILITY FUNCTIONS TYPES
// ============================================================

/**
 * Supabase Query Builder Type
 *
 * Type for the Supabase query builder instance.
 * Used for defining reusable query functions.
 */
export type SupabaseClient = {
  from: <T extends keyof Database['public']['Tables']>(
    table: T
  ) => unknown; // Actual Supabase query builder type
};

/**
 * Query Function Type
 *
 * Type for reusable query functions that accept a Supabase client.
 *
 * @template T - The return type of the query
 */
export type QueryFunction<T> = (client: SupabaseClient) => Promise<SupabaseQueryResult<T>>;
