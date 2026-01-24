"use client";

/**
 * Add to Watchlist Dialog Component
 *
 * Modal dialog for adding a property to one or more watchlists.
 * Allows users to select from existing watchlists or create a new one.
 *
 * @component
 * @author Claude Code Agent
 * @date 2026-01-23
 */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Bookmark,
  Plus,
  Check,
  Loader2,
  Search,
  Heart,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useWatchlists, useAddToWatchlist } from "@/hooks/useWatchlists";
import { toast } from "sonner";

// ============================================
// Type Definitions
// ============================================

interface AddToWatchlistDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Property ID to add to watchlist */
  propertyId: string;
  /** Property address for display */
  propertyAddress?: string;
  /** Callback when property is added successfully */
  onSuccess?: () => void;
}

// ============================================
// Main Component
// ============================================

export function AddToWatchlistDialog({
  open,
  onOpenChange,
  propertyId,
  propertyAddress,
  onSuccess,
}: AddToWatchlistDialogProps) {
  const { data: watchlists, isLoading: isLoadingWatchlists } = useWatchlists();
  const addToWatchlist = useAddToWatchlist();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWatchlistId, setSelectedWatchlistId] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);

  // Reset form when dialog closes or property changes
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSelectedWatchlistId(null);
      setNotes("");
      setIsFavorite(false);
    }
  }, [open, propertyId]);

  // Filter watchlists by search query
  const filteredWatchlists = watchlists?.filter((w) =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Handle adding property to watchlist
  const handleAddToWatchlist = async () => {
    if (!selectedWatchlistId) {
      toast.error("Please select a watchlist");
      return;
    }

    try {
      await addToWatchlist.mutateAsync({
        watchlistId: selectedWatchlistId,
        data: {
          property_id: propertyId,
          notes: notes.trim() || undefined,
          is_favorite: isFavorite,
          priority: 0,
        },
      });

      toast.success("Property added to watchlist");
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to add property";

      // Show user-friendly error for duplicates
      if (errorMessage.includes("already") || errorMessage.includes("duplicate")) {
        toast.error("This property is already in the selected watchlist");
      } else {
        toast.error(errorMessage);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add to Watchlist</DialogTitle>
          <DialogDescription>
            {propertyAddress
              ? `Add ${propertyAddress} to a watchlist`
              : "Add this property to a watchlist"}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 space-y-4">
          {/* Search Watchlists */}
          <div>
            <Label htmlFor="search">Search Watchlists</Label>
            <div className="relative mt-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                id="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="pl-10"
              />
            </div>
          </div>

          {/* Watchlist Selection */}
          <div>
            <Label>Select Watchlist</Label>
            {isLoadingWatchlists ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
              </div>
            ) : filteredWatchlists.length === 0 ? (
              <div className="py-8 text-center">
                <Bookmark className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {searchQuery ? "No watchlists found" : "No watchlists yet"}
                </p>
                {!searchQuery && (
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Create your first watchlist from the Watchlists page
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-2 space-y-2 max-h-[300px] overflow-y-auto">
                {filteredWatchlists.map((watchlist) => {
                  const isSelected = selectedWatchlistId === watchlist.id;
                  return (
                    <button
                      key={watchlist.id}
                      type="button"
                      onClick={() => setSelectedWatchlistId(watchlist.id)}
                      className={cn(
                        "w-full p-3 rounded-lg border-2 text-left transition-all",
                        isSelected
                          ? "border-slate-900 dark:border-slate-100 bg-slate-50 dark:bg-slate-800"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        {/* Color indicator */}
                        {watchlist.color && (
                          <div
                            className="w-3 h-3 rounded-full mt-1"
                            style={{ backgroundColor: watchlist.color }}
                          />
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{watchlist.name}</div>
                          {watchlist.description && (
                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate mt-0.5">
                              {watchlist.description}
                            </div>
                          )}
                          <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                            {watchlist.property_count || 0} properties
                          </div>
                        </div>

                        {isSelected && (
                          <Check className="h-5 w-5 text-slate-900 dark:text-slate-100 flex-shrink-0" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Notes */}
          {selectedWatchlistId && (
            <>
              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add notes about this property..."
                  className={cn(
                    "mt-1 flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm",
                    "placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2",
                    "focus-visible:ring-slate-950 focus-visible:ring-offset-2",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    "dark:border-slate-800 dark:bg-slate-950 dark:placeholder:text-slate-400",
                    "dark:focus-visible:ring-slate-300 min-h-[80px] resize-none"
                  )}
                />
              </div>

              {/* Favorite Toggle */}
              <div>
                <button
                  type="button"
                  onClick={() => setIsFavorite(!isFavorite)}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg border transition-all",
                    isFavorite
                      ? "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300"
                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                  )}
                >
                  <Heart
                    className={cn(
                      "h-4 w-4",
                      isFavorite && "fill-current"
                    )}
                  />
                  <span className="text-sm">
                    {isFavorite ? "Marked as favorite" : "Mark as favorite"}
                  </span>
                </button>
              </div>
            </>
          )}

          {/* Info message */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-blue-600 dark:text-blue-400">
              You can create new watchlists from the Watchlists page
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={addToWatchlist.isPending}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleAddToWatchlist}
            disabled={!selectedWatchlistId || addToWatchlist.isPending}
          >
            {addToWatchlist.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Adding...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Add to Watchlist
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default AddToWatchlistDialog;
