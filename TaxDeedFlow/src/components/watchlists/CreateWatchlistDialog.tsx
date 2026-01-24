"use client";

/**
 * Create Watchlist Dialog Component
 *
 * Modal dialog for creating a new watchlist with name, description,
 * color, visibility, and organization settings.
 *
 * @component
 * @author Claude Code Agent
 * @date 2026-01-23
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lock, Users, Globe, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useCreateWatchlist } from "@/hooks/useWatchlists";
import { useAuth } from "@/contexts/AuthContext";
import type { WatchlistVisibility, CreateWatchlistRequest } from "@/types/watchlist";

// ============================================
// Type Definitions
// ============================================

interface CreateWatchlistDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Callback when watchlist is created successfully */
  onSuccess?: () => void;
}

// ============================================
// Constants
// ============================================

const PRESET_COLORS = [
  "#3B82F6", // blue
  "#8B5CF6", // purple
  "#EF4444", // red
  "#F97316", // orange
  "#10B981", // green
  "#06B6D4", // cyan
  "#EC4899", // pink
  "#6366F1", // indigo
];

const VISIBILITY_OPTIONS: Array<{
  value: WatchlistVisibility;
  label: string;
  description: string;
  icon: React.ElementType;
}> = [
  {
    value: "private",
    label: "Private",
    description: "Only you can view",
    icon: Lock,
  },
  {
    value: "shared",
    label: "Shared",
    description: "Organization members can view",
    icon: Users,
  },
  {
    value: "public",
    label: "Public",
    description: "Anyone with link can view",
    icon: Globe,
  },
];

// ============================================
// Main Component
// ============================================

export function CreateWatchlistDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateWatchlistDialogProps) {
  const { user } = useAuth();
  const createWatchlist = useCreateWatchlist();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0]);
  const [visibility, setVisibility] = useState<WatchlistVisibility>("private");
  const [error, setError] = useState<string | null>(null);

  // Reset form when dialog closes
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setName("");
      setDescription("");
      setSelectedColor(PRESET_COLORS[0]);
      setVisibility("private");
      setError(null);
    }
    onOpenChange(open);
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!name.trim()) {
      setError("Please enter a watchlist name");
      return;
    }

    try {
      const data: CreateWatchlistRequest = {
        name: name.trim(),
        description: description.trim() || undefined,
        color: selectedColor,
        visibility,
        organization_id: user?.currentOrganizationId || undefined,
        is_shared: visibility === "shared",
      };

      await createWatchlist.mutateAsync(data);
      onSuccess?.();
      handleOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create watchlist");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md" onClose={() => handleOpenChange(false)}>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Watchlist</DialogTitle>
            <DialogDescription>
              Create a new watchlist to organize and track properties of interest.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-4 space-y-4">
            {/* Name Input */}
            <div>
              <Label htmlFor="name">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., High Priority, Q1 Targets"
                className="mt-1"
                required
              />
            </div>

            {/* Description Input */}
            <div>
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description..."
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

            {/* Color Picker */}
            <div>
              <Label>Color</Label>
              <div className="flex gap-2 mt-2">
                {PRESET_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    className={cn(
                      "w-8 h-8 rounded-full border-2 transition-all",
                      selectedColor === color
                        ? "border-slate-900 dark:border-slate-100 scale-110"
                        : "border-transparent hover:scale-105"
                    )}
                    style={{ backgroundColor: color }}
                    onClick={() => setSelectedColor(color)}
                  />
                ))}
              </div>
            </div>

            {/* Visibility Options */}
            <div>
              <Label>Visibility</Label>
              <div className="mt-2 space-y-2">
                {VISIBILITY_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isSelected = visibility === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setVisibility(option.value)}
                      className={cn(
                        "w-full p-3 rounded-lg border-2 text-left transition-all",
                        isSelected
                          ? "border-slate-900 dark:border-slate-100 bg-slate-50 dark:bg-slate-800"
                          : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className={cn("h-5 w-5 mt-0.5", isSelected ? "text-slate-900 dark:text-slate-100" : "text-slate-500")} />
                        <div className="flex-1">
                          <div className="font-medium">{option.label}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {option.description}
                          </div>
                        </div>
                        {isSelected && (
                          <Badge variant="default" className="text-xs">
                            Selected
                          </Badge>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
                {error}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={createWatchlist.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createWatchlist.isPending}>
              {createWatchlist.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Watchlist"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default CreateWatchlistDialog;
