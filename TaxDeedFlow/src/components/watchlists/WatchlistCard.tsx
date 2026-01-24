"use client";

/**
 * Watchlist Card Component
 *
 * Displays a watchlist with name, description, property count, and actions.
 * Supports clicking to view details and menu actions for edit/delete.
 *
 * @component
 * @author Claude Code Agent
 * @date 2026-01-23
 */

import { useState } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Star,
  Users,
  Lock,
  Globe,
  Eye,
  MoreVertical,
  Trash2,
  Edit,
  Share2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { WatchlistWithStats } from "@/types/watchlist";

// ============================================
// Type Definitions
// ============================================

interface WatchlistCardProps {
  /** Watchlist data with statistics */
  watchlist: WatchlistWithStats;
  /** Callback when watchlist is clicked */
  onClick?: (watchlist: WatchlistWithStats) => void;
  /** Callback when edit is requested */
  onEdit?: (watchlist: WatchlistWithStats) => void;
  /** Callback when delete is requested */
  onDelete?: (watchlist: WatchlistWithStats) => void;
  /** Callback when share is requested */
  onShare?: (watchlist: WatchlistWithStats) => void;
  /** Optional additional class names */
  className?: string;
}

// ============================================
// Main Component
// ============================================

export function WatchlistCard({
  watchlist,
  onClick,
  onEdit,
  onDelete,
  onShare,
  className,
}: WatchlistCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  // Determine visibility icon and color
  const visibilityConfig = {
    private: { icon: Lock, color: "text-slate-500", label: "Private" },
    shared: { icon: Users, color: "text-blue-500", label: "Shared" },
    public: { icon: Globe, color: "text-green-500", label: "Public" },
  };

  const visibility = visibilityConfig[watchlist.visibility];
  const VisibilityIcon = visibility.icon;

  // Determine if user is owner
  const isOwner = watchlist.is_owner;
  const canEdit = isOwner || watchlist.user_permission === "admin" || watchlist.user_permission === "edit";
  const canDelete = isOwner || watchlist.user_permission === "admin";

  return (
    <Card
      className={cn(
        "relative transition-all hover:shadow-md cursor-pointer",
        className
      )}
      onClick={() => onClick?.(watchlist)}
    >
      {/* Color accent bar */}
      {watchlist.color && (
        <div
          className="absolute top-0 left-0 right-0 h-1 rounded-t-lg"
          style={{ backgroundColor: watchlist.color }}
        />
      )}

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-lg truncate">
                {watchlist.name}
              </h3>
              {watchlist.favorite_count > 0 && (
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
              )}
            </div>
            {watchlist.description && (
              <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-2">
                {watchlist.description}
              </p>
            )}
          </div>

          {/* Actions Menu */}
          <div className="relative">
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
                      onClick?.(watchlist);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                    View Details
                  </button>
                  {canEdit && (
                    <button
                      className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                        onEdit?.(watchlist);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </button>
                  )}
                  {canEdit && (
                    <button
                      className="w-full px-4 py-2 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowMenu(false);
                        onShare?.(watchlist);
                      }}
                    >
                      <Share2 className="h-4 w-4" />
                      Share
                    </button>
                  )}
                  {canDelete && (
                    <>
                      <div className="border-t border-slate-200 dark:border-slate-700 my-1" />
                      <button
                        className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-2"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowMenu(false);
                          onDelete?.(watchlist);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400 mb-3">
          <div className="flex items-center gap-1">
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {watchlist.property_count}
            </span>
            <span>{watchlist.property_count === 1 ? "property" : "properties"}</span>
          </div>
          {watchlist.collaborator_count > 0 && (
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              <span>{watchlist.collaborator_count}</span>
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-xs">
            <VisibilityIcon className={cn("h-3 w-3 mr-1", visibility.color)} />
            {visibility.label}
          </Badge>
          {isOwner && (
            <Badge variant="outline" className="text-xs">
              Owner
            </Badge>
          )}
          {!isOwner && watchlist.user_permission && (
            <Badge variant="outline" className="text-xs capitalize">
              {watchlist.user_permission}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default WatchlistCard;
