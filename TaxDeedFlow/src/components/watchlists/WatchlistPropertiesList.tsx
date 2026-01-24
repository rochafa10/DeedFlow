"use client";

/**
 * Watchlist Properties List Component
 *
 * Displays a list of properties within a watchlist with sorting,
 * filtering, and actions for each property.
 *
 * @component
 * @author Claude Code Agent
 * @date 2026-01-23
 */

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MapPin,
  DollarSign,
  Star,
  Trash2,
  Eye,
  MoreVertical,
  ArrowUpDown,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/format";
import type { WatchlistPropertyDetailed } from "@/types/watchlist";

// ============================================
// Type Definitions
// ============================================

interface WatchlistPropertiesListProps {
  /** Watchlist ID */
  watchlistId: string;
  /** Array of properties in the watchlist */
  properties: WatchlistPropertyDetailed[];
  /** Loading state */
  isLoading?: boolean;
  /** Error state */
  error?: Error | null;
  /** Callback when property is clicked */
  onPropertyClick?: (property: WatchlistPropertyDetailed) => void;
  /** Callback when property should be removed */
  onRemoveProperty?: (property: WatchlistPropertyDetailed) => void;
  /** Callback when favorite status should be toggled */
  onToggleFavorite?: (property: WatchlistPropertyDetailed) => void;
  /** Optional additional class names */
  className?: string;
}

interface PropertyCardProps {
  property: WatchlistPropertyDetailed;
  onPropertyClick?: (property: WatchlistPropertyDetailed) => void;
  onRemoveProperty?: (property: WatchlistPropertyDetailed) => void;
  onToggleFavorite?: (property: WatchlistPropertyDetailed) => void;
}

// ============================================
// Sub-components
// ============================================

/**
 * Loading skeleton for property card
 */
function PropertyCardSkeleton() {
  return (
    <Card className="mb-3">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-1/3" />
          </div>
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Individual property card component
 */
function PropertyCard({
  property,
  onPropertyClick,
  onRemoveProperty,
  onToggleFavorite,
}: PropertyCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <Card
      className={cn(
        "mb-3 transition-all hover:shadow-md cursor-pointer",
        property.is_favorite && "border-yellow-400 dark:border-yellow-600"
      )}
      onClick={() => onPropertyClick?.(property)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Parcel Number */}
            {property.property.parcel_number && (
              <div className="font-mono text-sm text-slate-500 dark:text-slate-400 mb-1">
                {property.property.parcel_number}
              </div>
            )}

            {/* Address */}
            <div className="flex items-start gap-2 mb-2">
              <MapPin className="h-4 w-4 text-slate-400 mt-1 flex-shrink-0" />
              <div className="font-semibold text-slate-900 dark:text-slate-100">
                {property.property.address || "No address available"}
                {property.property.city && property.property.state && (
                  <div className="text-sm font-normal text-slate-500 dark:text-slate-400">
                    {property.property.city}, {property.property.state} {property.property.zip_code}
                  </div>
                )}
              </div>
            </div>

            {/* Financial Info */}
            <div className="flex items-center gap-4 text-sm mb-2">
              {property.property.total_due !== null && (
                <div className="flex items-center gap-1 text-slate-600 dark:text-slate-400">
                  <DollarSign className="h-3 w-3" />
                  <span className="font-medium">
                    {formatCurrency(property.property.total_due)}
                  </span>
                  <span className="text-xs">due</span>
                </div>
              )}
              {property.property.assessed_value !== null && (
                <div className="text-slate-500 dark:text-slate-400 text-xs">
                  Assessed: {formatCurrency(property.property.assessed_value)}
                </div>
              )}
            </div>

            {/* Tags and Badges */}
            <div className="flex flex-wrap gap-2">
              {property.is_favorite && (
                <Badge variant="outline" className="text-xs">
                  <Star className="h-3 w-3 mr-1 text-yellow-500 fill-yellow-500" />
                  Favorite
                </Badge>
              )}
              {property.priority > 0 && (
                <Badge variant="outline" className="text-xs">
                  Priority: {property.priority}
                </Badge>
              )}
              {property.property.status && (
                <Badge variant="outline" className="text-xs capitalize">
                  {property.property.status}
                </Badge>
              )}
              {property.tags && property.tags.length > 0 && (
                <>
                  {property.tags.slice(0, 2).map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                  {property.tags.length > 2 && (
                    <Badge variant="secondary" className="text-xs">
                      +{property.tags.length - 2} more
                    </Badge>
                  )}
                </>
              )}
            </div>

            {/* Notes */}
            {property.notes && (
              <div className="mt-2 text-sm text-slate-600 dark:text-slate-400 line-clamp-2">
                {property.notes}
              </div>
            )}
          </div>

          {/* Actions Menu */}
          <div className="relative flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
            >
              <MoreVertical className="h-4 w-4" />
            </Button>

            {showMenu && (
              <>
                {/* Backdrop */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                  }}
                />
                {/* Menu */}
                <div className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-20 min-w-[160px]">
                  <button
                    className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onPropertyClick?.(property);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                    View Details
                  </button>
                  <button
                    className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onToggleFavorite?.(property);
                    }}
                  >
                    <Star className={cn("h-4 w-4", property.is_favorite && "text-yellow-500 fill-yellow-500")} />
                    {property.is_favorite ? "Remove from Favorites" : "Add to Favorites"}
                  </button>
                  <div className="border-t border-slate-200 dark:border-slate-700 my-1" />
                  <button
                    className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowMenu(false);
                      onRemoveProperty?.(property);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Remove from Watchlist
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// Main Component
// ============================================

export function WatchlistPropertiesList({
  watchlistId,
  properties,
  isLoading = false,
  error = null,
  onPropertyClick,
  onRemoveProperty,
  onToggleFavorite,
  className,
}: WatchlistPropertiesListProps) {
  const [sortBy, setSortBy] = useState<"priority" | "added_at" | "total_due">("priority");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Sort properties
  const sortedProperties = [...properties].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case "priority":
        comparison = a.priority - b.priority;
        break;
      case "added_at":
        comparison = new Date(a.added_at).getTime() - new Date(b.added_at).getTime();
        break;
      case "total_due":
        comparison = (a.property.total_due || 0) - (b.property.total_due || 0);
        break;
    }
    return sortOrder === "asc" ? comparison : -comparison;
  });

  return (
    <div className={className}>
      {/* Header with Sort */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-slate-600 dark:text-slate-400">
          {properties.length} {properties.length === 1 ? "property" : "properties"}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600 dark:text-slate-400">Sort by:</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (sortBy === "priority") {
                setSortOrder(sortOrder === "asc" ? "desc" : "asc");
              } else {
                setSortBy("priority");
                setSortOrder("desc");
              }
            }}
            className={cn(sortBy === "priority" && "bg-slate-100 dark:bg-slate-800")}
          >
            Priority
            {sortBy === "priority" && (
              <ArrowUpDown className="ml-1 h-3 w-3" />
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (sortBy === "added_at") {
                setSortOrder(sortOrder === "asc" ? "desc" : "asc");
              } else {
                setSortBy("added_at");
                setSortOrder("desc");
              }
            }}
            className={cn(sortBy === "added_at" && "bg-slate-100 dark:bg-slate-800")}
          >
            Date Added
            {sortBy === "added_at" && (
              <ArrowUpDown className="ml-1 h-3 w-3" />
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (sortBy === "total_due") {
                setSortOrder(sortOrder === "asc" ? "desc" : "asc");
              } else {
                setSortBy("total_due");
                setSortOrder("desc");
              }
            }}
            className={cn(sortBy === "total_due" && "bg-slate-100 dark:bg-slate-800")}
          >
            Amount
            {sortBy === "total_due" && (
              <ArrowUpDown className="ml-1 h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="space-y-3">
          <PropertyCardSkeleton />
          <PropertyCardSkeleton />
          <PropertyCardSkeleton />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <div>
            <div className="font-medium">Failed to load properties</div>
            <div className="text-sm">{error.message}</div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && properties.length === 0 && (
        <div className="text-center py-12">
          <div className="text-slate-400 mb-2">
            <MapPin className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-1">
            No properties yet
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Add properties to this watchlist to start tracking them.
          </p>
        </div>
      )}

      {/* Properties List */}
      {!isLoading && !error && properties.length > 0 && (
        <div>
          {sortedProperties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              onPropertyClick={onPropertyClick}
              onRemoveProperty={onRemoveProperty}
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default WatchlistPropertiesList;
