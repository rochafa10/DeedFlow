/**
 * localStorage Migration Utility
 * Migrates legacy watchlist data from localStorage to the API-based watchlist system
 */

import { toast } from "sonner"

// Possible localStorage keys used in the old system
const LEGACY_STORAGE_KEYS = [
  "watchlist_items",
  "tax_deed_watchlist",
  "tdf_watchlist",
  "watchlist",
]

// Legacy watchlist item structure (best guess based on removed code)
interface LegacyWatchlistItem {
  id?: string
  propertyId?: string
  property_id?: string
  maxBid?: number
  max_bid?: number
  notes?: string
  addedAt?: string
  added_at?: string
}

interface MigrationResult {
  success: boolean
  migratedCount: number
  errors: string[]
}

/**
 * Check if localStorage contains legacy watchlist data
 */
export function hasLegacyWatchlistData(): boolean {
  if (typeof window === "undefined") {
    return false
  }

  for (const key of LEGACY_STORAGE_KEYS) {
    const data = localStorage.getItem(key)
    if (data && data !== "[]" && data !== "{}") {
      try {
        const parsed = JSON.parse(data)
        // Check if it's a non-empty array or object
        if (Array.isArray(parsed) && parsed.length > 0) {
          return true
        }
        if (typeof parsed === "object" && Object.keys(parsed).length > 0) {
          return true
        }
      } catch (err) {
        continue
      }
    }
  }

  return false
}

/**
 * Extract legacy watchlist items from localStorage
 */
function extractLegacyItems(): LegacyWatchlistItem[] {
  const items: LegacyWatchlistItem[] = []

  for (const key of LEGACY_STORAGE_KEYS) {
    const data = localStorage.getItem(key)
    if (!data) continue

    try {
      const parsed = JSON.parse(data)

      if (Array.isArray(parsed)) {
        items.push(...parsed)
      } else if (typeof parsed === "object") {
        // If it's an object with property IDs as keys
        Object.entries(parsed).forEach(([propertyId, itemData]) => {
          if (typeof itemData === "object" && itemData !== null) {
            items.push({
              ...itemData as LegacyWatchlistItem,
              property_id: propertyId,
            })
          } else {
            // Just a property ID
            items.push({ property_id: propertyId })
          }
        })
      }
    } catch (err) {
      console.error(`[Migration] Failed to parse ${key}:`, err)
    }
  }

  return items
}

/**
 * Clear legacy watchlist data from localStorage
 */
function clearLegacyData(): void {
  for (const key of LEGACY_STORAGE_KEYS) {
    localStorage.removeItem(key)
  }
}

/**
 * Check if user already has watchlists in the API
 */
async function hasExistingWatchlists(): Promise<boolean> {
  try {
    const response = await fetch("/api/watchlist", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      return false
    }

    const result = await response.json()
    return (result.data?.length ?? 0) > 0
  } catch (err) {
    console.error("[Migration] Failed to check existing watchlists:", err)
    return false
  }
}

/**
 * Create a default watchlist for migrated items
 */
async function createMigrationWatchlist(): Promise<string | null> {
  try {
    const response = await fetch("/api/watchlist", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Migrated Properties",
        description: "Properties migrated from previous watchlist",
        color: "#8b5cf6",
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || "Failed to create watchlist")
    }

    const result = await response.json()
    return result.data?.id || result.data?.watchlist_id || null
  } catch (err) {
    console.error("[Migration] Failed to create migration watchlist:", err)
    return null
  }
}

/**
 * Migrate a single property to the new watchlist
 */
async function migrateItem(
  watchlistId: string,
  item: LegacyWatchlistItem
): Promise<{ success: boolean; error?: string }> {
  // Extract property ID (handle multiple possible field names)
  const propertyId = item.property_id || item.propertyId || item.id

  if (!propertyId) {
    return { success: false, error: "No property ID found" }
  }

  // Extract max bid (handle multiple possible field names)
  const maxBid = item.max_bid ?? item.maxBid ?? null

  try {
    const response = await fetch("/api/watchlist/items", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        watchlist_id: watchlistId,
        property_id: propertyId,
        max_bid: maxBid,
        notes: item.notes || null,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      // 409 conflict means item already exists - that's okay
      if (response.status === 409) {
        return { success: true }
      }
      throw new Error(errorData.message || "Failed to migrate item")
    }

    return { success: true }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error"
    return { success: false, error: errorMessage }
  }
}

/**
 * Main migration function
 * Checks for localStorage data and migrates it to the API
 */
export async function migrateLocalStorageWatchlist(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    migratedCount: 0,
    errors: [],
  }

  // Check if we're in browser environment
  if (typeof window === "undefined") {
    result.errors.push("Migration can only run in browser environment")
    return result
  }

  // Check if there's legacy data to migrate
  if (!hasLegacyWatchlistData()) {
    // No legacy data found - this is okay, not an error
    result.success = true
    return result
  }

  // Check if user already has watchlists (skip migration if they do)
  const hasWatchlists = await hasExistingWatchlists()
  if (hasWatchlists) {
    // User already has watchlists, skip migration but clear old data
    clearLegacyData()
    result.success = true
    return result
  }

  // Extract legacy items
  const legacyItems = extractLegacyItems()

  if (legacyItems.length === 0) {
    // No items to migrate
    clearLegacyData()
    result.success = true
    return result
  }

  // Create default watchlist for migrated items
  const watchlistId = await createMigrationWatchlist()

  if (!watchlistId) {
    result.errors.push("Failed to create migration watchlist")
    return result
  }

  // Migrate each item
  for (const item of legacyItems) {
    const itemResult = await migrateItem(watchlistId, item)

    if (itemResult.success) {
      result.migratedCount++
    } else {
      result.errors.push(itemResult.error || "Unknown error")
    }
  }

  // Clear legacy data from localStorage
  clearLegacyData()

  // Consider migration successful if at least one item was migrated
  result.success = result.migratedCount > 0

  return result
}

/**
 * Run migration with user feedback
 * Shows toast notifications for migration status
 */
export async function runMigrationWithFeedback(): Promise<void> {
  // Check if migration is needed
  if (!hasLegacyWatchlistData()) {
    return
  }

  // Show loading toast
  const loadingToast = toast.loading("Migrating your watchlist data...")

  try {
    const result = await migrateLocalStorageWatchlist()

    // Dismiss loading toast
    toast.dismiss(loadingToast)

    if (result.success && result.migratedCount > 0) {
      toast.success(
        `Successfully migrated ${result.migratedCount} ${
          result.migratedCount === 1 ? "property" : "properties"
        } to your watchlist`,
        {
          duration: 5000,
        }
      )

      // Show errors if any
      if (result.errors.length > 0) {
        setTimeout(() => {
          toast.warning(
            `${result.errors.length} ${
              result.errors.length === 1 ? "item" : "items"
            } could not be migrated`,
            {
              duration: 4000,
            }
          )
        }, 1000)
      }
    } else if (result.errors.length > 0) {
      toast.error("Failed to migrate watchlist data", {
        description: result.errors[0],
        duration: 5000,
      })
    }
  } catch (err) {
    toast.dismiss(loadingToast)
    toast.error("Migration failed", {
      description: err instanceof Error ? err.message : "An unexpected error occurred",
      duration: 5000,
    })
  }
}
