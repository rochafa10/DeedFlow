/**
 * Metro Area Detection
 *
 * This file provides functionality for detecting which metropolitan
 * statistical area (MSA) a property belongs to based on coordinates
 * and/or county information.
 *
 * @author Claude Code Agent
 * @version 1.0.0
 * @date 2026-01-16
 */

// ============================================
// Type Definitions
// ============================================

/**
 * Geographic bounding box for metro area detection
 */
export interface BoundingBox {
  /** Northern latitude boundary */
  north: number;
  /** Southern latitude boundary */
  south: number;
  /** Eastern longitude boundary (more positive/less negative) */
  east: number;
  /** Western longitude boundary (more negative/less positive) */
  west: number;
}

/**
 * Metro area definition with boundaries and county list
 */
export interface MetroBoundary {
  /** Metro area name */
  name: string;
  /** State code */
  state: string;
  /** Geographic bounding box (approximate) */
  bounds: BoundingBox;
  /** List of counties that are part of this metro */
  counties: string[];
  /** Primary city name for display */
  primaryCity: string;
}

// ============================================
// Metro Boundaries Configuration
// ============================================

/**
 * Metro area boundaries for 18 major metros
 *
 * Each metro includes:
 * - Approximate bounding box coordinates
 * - List of counties in the metro area
 *
 * Note: Bounding boxes are approximate and intended for
 * quick filtering. County matching provides more accuracy.
 */
export const METRO_BOUNDARIES: Record<string, MetroBoundary> = {
  // ============================================
  // Florida Metros
  // ============================================
  'FL_Miami': {
    name: 'Miami',
    state: 'FL',
    bounds: {
      north: 26.5,
      south: 25.0,
      east: -80.0,
      west: -81.0,
    },
    counties: ['Miami-Dade', 'Broward', 'Palm Beach'],
    primaryCity: 'Miami',
  },

  'FL_Tampa': {
    name: 'Tampa',
    state: 'FL',
    bounds: {
      north: 28.5,
      south: 27.5,
      east: -82.0,
      west: -83.0,
    },
    counties: ['Hillsborough', 'Pinellas', 'Pasco', 'Hernando'],
    primaryCity: 'Tampa',
  },

  'FL_Orlando': {
    name: 'Orlando',
    state: 'FL',
    bounds: {
      north: 29.0,
      south: 28.2,
      east: -80.8,
      west: -81.8,
    },
    counties: ['Orange', 'Seminole', 'Osceola', 'Lake'],
    primaryCity: 'Orlando',
  },

  // ============================================
  // Texas Metros
  // ============================================
  'TX_Houston': {
    name: 'Houston',
    state: 'TX',
    bounds: {
      north: 30.5,
      south: 29.0,
      east: -94.5,
      west: -96.0,
    },
    counties: [
      'Harris',
      'Fort Bend',
      'Montgomery',
      'Brazoria',
      'Galveston',
      'Liberty',
      'Waller',
      'Chambers',
    ],
    primaryCity: 'Houston',
  },

  'TX_Dallas': {
    name: 'Dallas',
    state: 'TX',
    bounds: {
      north: 33.5,
      south: 32.5,
      east: -96.0,
      west: -97.5,
    },
    counties: [
      'Dallas',
      'Tarrant',
      'Collin',
      'Denton',
      'Rockwall',
      'Ellis',
      'Kaufman',
      'Johnson',
    ],
    primaryCity: 'Dallas',
  },

  'TX_Austin': {
    name: 'Austin',
    state: 'TX',
    bounds: {
      north: 30.8,
      south: 29.8,
      east: -97.2,
      west: -98.2,
    },
    counties: ['Travis', 'Williamson', 'Hays', 'Bastrop', 'Caldwell'],
    primaryCity: 'Austin',
  },

  'TX_SanAntonio': {
    name: 'San Antonio',
    state: 'TX',
    bounds: {
      north: 29.8,
      south: 29.0,
      east: -98.0,
      west: -99.0,
    },
    counties: ['Bexar', 'Comal', 'Guadalupe', 'Medina', 'Wilson'],
    primaryCity: 'San Antonio',
  },

  // ============================================
  // California Metros
  // ============================================
  'CA_LosAngeles': {
    name: 'Los Angeles',
    state: 'CA',
    bounds: {
      north: 34.8,
      south: 33.4,
      east: -117.0,
      west: -119.0,
    },
    counties: ['Los Angeles', 'Orange', 'Riverside', 'San Bernardino', 'Ventura'],
    primaryCity: 'Los Angeles',
  },

  'CA_SanFrancisco': {
    name: 'San Francisco',
    state: 'CA',
    bounds: {
      north: 38.2,
      south: 37.2,
      east: -121.5,
      west: -123.0,
    },
    counties: [
      'San Francisco',
      'San Mateo',
      'Santa Clara',
      'Alameda',
      'Contra Costa',
      'Marin',
    ],
    primaryCity: 'San Francisco',
  },

  'CA_SanDiego': {
    name: 'San Diego',
    state: 'CA',
    bounds: {
      north: 33.5,
      south: 32.5,
      east: -116.0,
      west: -117.5,
    },
    counties: ['San Diego'],
    primaryCity: 'San Diego',
  },

  // ============================================
  // Arizona Metros
  // ============================================
  'AZ_Phoenix': {
    name: 'Phoenix',
    state: 'AZ',
    bounds: {
      north: 34.0,
      south: 33.0,
      east: -111.0,
      west: -113.0,
    },
    counties: ['Maricopa', 'Pinal'],
    primaryCity: 'Phoenix',
  },

  // ============================================
  // Georgia Metros
  // ============================================
  'GA_Atlanta': {
    name: 'Atlanta',
    state: 'GA',
    bounds: {
      north: 34.4,
      south: 33.4,
      east: -83.5,
      west: -85.0,
    },
    counties: [
      'Fulton',
      'DeKalb',
      'Gwinnett',
      'Cobb',
      'Clayton',
      'Cherokee',
      'Forsyth',
      'Henry',
      'Douglas',
    ],
    primaryCity: 'Atlanta',
  },

  // ============================================
  // North Carolina Metros
  // ============================================
  'NC_Charlotte': {
    name: 'Charlotte',
    state: 'NC',
    bounds: {
      north: 35.6,
      south: 34.8,
      east: -80.4,
      west: -81.2,
    },
    counties: ['Mecklenburg', 'Gaston', 'Union', 'Cabarrus', 'Iredell', 'Lincoln'],
    primaryCity: 'Charlotte',
  },

  'NC_Raleigh': {
    name: 'Raleigh',
    state: 'NC',
    bounds: {
      north: 36.2,
      south: 35.5,
      east: -78.2,
      west: -79.2,
    },
    counties: ['Wake', 'Durham', 'Johnston', 'Franklin', 'Harnett'],
    primaryCity: 'Raleigh',
  },

  // ============================================
  // Nevada Metros
  // ============================================
  'NV_LasVegas': {
    name: 'Las Vegas',
    state: 'NV',
    bounds: {
      north: 36.5,
      south: 35.8,
      east: -114.5,
      west: -115.5,
    },
    counties: ['Clark'],
    primaryCity: 'Las Vegas',
  },

  // ============================================
  // Colorado Metros
  // ============================================
  'CO_Denver': {
    name: 'Denver',
    state: 'CO',
    bounds: {
      north: 40.2,
      south: 39.4,
      east: -104.4,
      west: -105.3,
    },
    counties: [
      'Denver',
      'Arapahoe',
      'Jefferson',
      'Adams',
      'Douglas',
      'Boulder',
      'Broomfield',
    ],
    primaryCity: 'Denver',
  },

  // ============================================
  // Pennsylvania Metros
  // ============================================
  'PA_Philadelphia': {
    name: 'Philadelphia',
    state: 'PA',
    bounds: {
      north: 40.3,
      south: 39.8,
      east: -74.8,
      west: -75.6,
    },
    counties: [
      'Philadelphia',
      'Montgomery',
      'Bucks',
      'Delaware',
      'Chester',
    ],
    primaryCity: 'Philadelphia',
  },

  'PA_Pittsburgh': {
    name: 'Pittsburgh',
    state: 'PA',
    bounds: {
      north: 40.7,
      south: 40.2,
      east: -79.5,
      west: -80.5,
    },
    counties: [
      'Allegheny',
      'Westmoreland',
      'Butler',
      'Washington',
      'Beaver',
      'Fayette',
    ],
    primaryCity: 'Pittsburgh',
  },
} as const;

// ============================================
// Core Detection Functions
// ============================================

/**
 * Detect which metro area a property belongs to
 *
 * Uses a two-step approach:
 * 1. First try coordinate-based matching (most accurate)
 * 2. Fallback to county name matching
 *
 * @param coordinates - Property coordinates (optional)
 * @param county - County name (optional)
 * @param state - State code (required)
 * @returns Metro name if detected, null otherwise
 *
 * @example
 * // Detection by coordinates
 * detectMetro({ latitude: 25.7617, longitude: -80.1918 }, null, 'FL');
 * // Returns: 'Miami'
 *
 * @example
 * // Detection by county
 * detectMetro(null, 'Miami-Dade', 'FL');
 * // Returns: 'Miami'
 *
 * @example
 * // No match found
 * detectMetro(null, 'Alachua', 'FL');
 * // Returns: null (Gainesville is not in our metro list)
 */
export function detectMetro(
  coordinates: { latitude: number; longitude: number } | null,
  county: string | null,
  state: string
): string | null {
  // Get all metros for this state
  const stateMetros = Object.entries(METRO_BOUNDARIES).filter(
    ([, metro]) => metro.state === state
  );

  if (stateMetros.length === 0) {
    return null;
  }

  // Step 1: Try coordinate matching (most accurate)
  if (coordinates) {
    for (const [, metro] of stateMetros) {
      if (isWithinBounds(coordinates, metro.bounds)) {
        // Verify with county if available for higher confidence
        if (county && !isCountyInMetro(county, metro)) {
          // Coordinates suggest metro but county doesn't match
          // This can happen at metro boundaries - trust coordinates
          continue;
        }
        return metro.name;
      }
    }
  }

  // Step 2: Fallback to county matching
  if (county) {
    for (const [, metro] of stateMetros) {
      if (isCountyInMetro(county, metro)) {
        return metro.name;
      }
    }
  }

  // No metro match found
  return null;
}

/**
 * Check if coordinates are within a bounding box
 *
 * @param coords - Coordinates to check
 * @param bounds - Bounding box to check against
 * @returns True if coordinates are within bounds
 */
function isWithinBounds(
  coords: { latitude: number; longitude: number },
  bounds: BoundingBox
): boolean {
  return (
    coords.latitude <= bounds.north &&
    coords.latitude >= bounds.south &&
    coords.longitude <= bounds.east &&
    coords.longitude >= bounds.west
  );
}

/**
 * Check if a county is part of a metro area
 *
 * Performs case-insensitive matching and handles common
 * county name variations (with/without "County" suffix).
 *
 * @param county - County name to check
 * @param metro - Metro definition to check against
 * @returns True if county is in metro
 */
function isCountyInMetro(county: string, metro: MetroBoundary): boolean {
  // Normalize the input county name
  const normalizedCounty = normalizeCountyName(county);

  // Check against metro's county list (also normalized)
  return metro.counties.some(
    (metroCounty) => normalizeCountyName(metroCounty) === normalizedCounty
  );
}

/**
 * Normalize county name for comparison
 *
 * - Removes "County" suffix
 * - Converts to lowercase
 * - Trims whitespace
 *
 * @param county - County name to normalize
 * @returns Normalized county name
 */
function normalizeCountyName(county: string): string {
  return county
    .toLowerCase()
    .replace(/\s*county\s*$/i, '')
    .replace(/-/g, '')
    .trim();
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get the metro key for regional adjustments lookup
 *
 * Combines state and metro name in the format used by METRO_ADJUSTMENTS.
 *
 * @param metro - Metro name
 * @param state - State code
 * @returns Metro key (e.g., 'FL_Miami')
 */
export function getMetroKey(metro: string, state: string): string {
  return `${state}_${metro}`;
}

/**
 * Get all metros for a state
 *
 * @param state - State code
 * @returns Array of metro definitions
 */
export function getMetrosForState(state: string): MetroBoundary[] {
  return Object.values(METRO_BOUNDARIES).filter((metro) => metro.state === state);
}

/**
 * Get metro definition by key
 *
 * @param metroKey - Metro key (e.g., 'FL_Miami')
 * @returns Metro definition or null
 */
export function getMetroByKey(metroKey: string): MetroBoundary | null {
  return METRO_BOUNDARIES[metroKey] || null;
}

/**
 * Get metro definition by name and state
 *
 * @param metro - Metro name
 * @param state - State code
 * @returns Metro definition or null
 */
export function getMetro(metro: string, state: string): MetroBoundary | null {
  const key = getMetroKey(metro, state);
  return getMetroByKey(key);
}

/**
 * Check if a state has any defined metros
 *
 * @param state - State code
 * @returns True if state has metro definitions
 */
export function hasDefinedMetros(state: string): boolean {
  return getMetrosForState(state).length > 0;
}

/**
 * Get list of all defined state codes
 *
 * @returns Array of state codes with metro definitions
 */
export function getStatesWithMetros(): string[] {
  const states = new Set(
    Object.values(METRO_BOUNDARIES).map((metro) => metro.state)
  );
  return Array.from(states).sort();
}

/**
 * Find the nearest metro to given coordinates
 *
 * Useful when coordinates don't fall within any metro bounds
 * but we want to identify the closest major market.
 *
 * @param coordinates - Property coordinates
 * @param state - State code
 * @returns Nearest metro name and distance, or null
 */
export function findNearestMetro(
  coordinates: { latitude: number; longitude: number },
  state: string
): { metro: string; distanceKm: number } | null {
  const stateMetros = getMetrosForState(state);

  if (stateMetros.length === 0) {
    return null;
  }

  let nearestMetro: string | null = null;
  let nearestDistance = Infinity;

  for (const metro of stateMetros) {
    // Calculate center of bounding box
    const centerLat = (metro.bounds.north + metro.bounds.south) / 2;
    const centerLon = (metro.bounds.east + metro.bounds.west) / 2;

    // Calculate distance using Haversine formula
    const distance = calculateDistanceKm(
      coordinates.latitude,
      coordinates.longitude,
      centerLat,
      centerLon
    );

    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearestMetro = metro.name;
    }
  }

  if (nearestMetro) {
    return {
      metro: nearestMetro,
      distanceKm: Math.round(nearestDistance),
    };
  }

  return null;
}

/**
 * Calculate distance between two points using Haversine formula
 *
 * @param lat1 - Latitude of first point
 * @param lon1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lon2 - Longitude of second point
 * @returns Distance in kilometers
 */
function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}
