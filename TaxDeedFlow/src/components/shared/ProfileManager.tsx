"use client";

/**
 * ProfileManager Dialog Component
 *
 * Modal dialog for managing investment profiles (CRUD operations).
 * Allows users to create, edit, and delete investment profiles with
 * custom scoring weights and risk tolerance settings.
 *
 * @module components/shared/ProfileManager
 * @author Claude Code Agent
 * @date 2026-01-23
 */

import * as React from "react";
import {
  Settings,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

// ============================================
// Types
// ============================================

/**
 * Investment Profile structure
 */
interface InvestmentProfile {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  is_default: boolean;
  scoring_weights: {
    location: number;
    risk: number;
    financial: number;
    market: number;
    profit: number;
  };
  risk_tolerance: "conservative" | "moderate" | "aggressive";
  created_at: string;
  updated_at: string;
}

/**
 * Form data for creating/editing profiles
 */
interface ProfileFormData {
  name: string;
  description: string;
  risk_tolerance: "conservative" | "moderate" | "aggressive";
  scoring_weights: {
    location: number;
    risk: number;
    financial: number;
    market: number;
    profit: number;
  };
}

/**
 * Component props
 */
interface ProfileManagerProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when dialog open state changes */
  onClose: () => void;
  /** Optional callback when profiles change */
  onProfilesChange?: () => void;
}

/**
 * View mode: list of profiles or form for create/edit
 */
type ViewMode = "list" | "create" | "edit";

// ============================================
// Constants
// ============================================

const DEFAULT_FORM_DATA: ProfileFormData = {
  name: "",
  description: "",
  risk_tolerance: "moderate",
  scoring_weights: {
    location: 20,
    risk: 20,
    financial: 20,
    market: 20,
    profit: 20,
  },
};

// ============================================
// Helper Functions
// ============================================

/**
 * Get authentication headers for API requests
 */
function getAuthHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (typeof window !== "undefined") {
    try {
      const userToken = localStorage.getItem("taxdeedflow_user");
      if (userToken) {
        headers["X-User-Token"] = userToken;
      }

      const csrfToken = localStorage.getItem("taxdeedflow_csrf_token");
      if (csrfToken) {
        headers["X-CSRF-Token"] = csrfToken;
      }
    } catch {
      console.warn("[ProfileManager] Unable to access localStorage for auth");
    }
  }

  return headers;
}

/**
 * Calculate sum of scoring weights
 */
function calculateWeightsSum(weights: ProfileFormData["scoring_weights"]): number {
  return Object.values(weights).reduce((sum, weight) => sum + weight, 0);
}

// ============================================
// Component
// ============================================

/**
 * ProfileManager - Dialog for managing investment profiles
 *
 * Features:
 * - List view with all user's profiles
 * - Create new profile with form validation
 * - Edit existing profiles
 * - Delete profiles (with confirmation)
 * - Validate scoring weights sum to 100%
 * - Visual feedback for weight validation
 * - Loading and error states
 *
 * @example
 * ```tsx
 * <ProfileManager
 *   isOpen={showManager}
 *   onClose={() => setShowManager(false)}
 *   onProfilesChange={() => refetchProfiles()}
 * />
 * ```
 */
export function ProfileManager({
  isOpen,
  onClose,
  onProfilesChange,
}: ProfileManagerProps) {
  // State management
  const [viewMode, setViewMode] = React.useState<ViewMode>("list");
  const [profiles, setProfiles] = React.useState<InvestmentProfile[]>([]);
  const [editingProfile, setEditingProfile] = React.useState<InvestmentProfile | null>(null);
  const [formData, setFormData] = React.useState<ProfileFormData>(DEFAULT_FORM_DATA);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = React.useState<string | null>(null);

  /**
   * Fetch profiles from API
   */
  const fetchProfiles = React.useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/profiles", {
        method: "GET",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch profiles: ${response.statusText}`);
      }

      const data = await response.json();
      const profilesList = Array.isArray(data) ? data : data.data || [];
      setProfiles(profilesList);
    } catch (err) {
      console.error("[ProfileManager] Failed to fetch profiles:", err);
      setError(err instanceof Error ? err.message : "Failed to load profiles");
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Reset state when dialog closes
   */
  React.useEffect(() => {
    if (!isOpen) {
      const timeout = setTimeout(() => {
        setViewMode("list");
        setEditingProfile(null);
        setFormData(DEFAULT_FORM_DATA);
        setError(null);
        setDeleteConfirmId(null);
      }, 200);
      return () => clearTimeout(timeout);
    } else {
      // Fetch profiles when dialog opens
      fetchProfiles();
    }
  }, [isOpen, fetchProfiles]);

  /**
   * Handle create new profile button
   */
  const handleCreateNew = () => {
    setFormData(DEFAULT_FORM_DATA);
    setEditingProfile(null);
    setViewMode("create");
    setError(null);
  };

  /**
   * Handle edit profile button
   */
  const handleEdit = (profile: InvestmentProfile) => {
    setFormData({
      name: profile.name,
      description: profile.description || "",
      risk_tolerance: profile.risk_tolerance,
      scoring_weights: {
        location: Math.round(profile.scoring_weights.location * 100),
        risk: Math.round(profile.scoring_weights.risk * 100),
        financial: Math.round(profile.scoring_weights.financial * 100),
        market: Math.round(profile.scoring_weights.market * 100),
        profit: Math.round(profile.scoring_weights.profit * 100),
      },
    });
    setEditingProfile(profile);
    setViewMode("edit");
    setError(null);
  };

  /**
   * Handle cancel form
   */
  const handleCancel = () => {
    setViewMode("list");
    setEditingProfile(null);
    setFormData(DEFAULT_FORM_DATA);
    setError(null);
  };

  /**
   * Handle save profile (create or update)
   */
  const handleSave = async () => {
    // Validate form
    if (!formData.name.trim()) {
      setError("Profile name is required");
      return;
    }

    const weightsSum = calculateWeightsSum(formData.scoring_weights);
    if (weightsSum !== 100) {
      setError(`Scoring weights must sum to 100% (currently ${weightsSum}%)`);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // Convert percentages to decimals for API
      const payload = {
        name: formData.name.trim(),
        description: formData.description.trim() || null,
        risk_tolerance: formData.risk_tolerance,
        scoring_weights: {
          location: formData.scoring_weights.location / 100,
          risk: formData.scoring_weights.risk / 100,
          financial: formData.scoring_weights.financial / 100,
          market: formData.scoring_weights.market / 100,
          profit: formData.scoring_weights.profit / 100,
        },
      };

      let response;
      if (viewMode === "edit" && editingProfile) {
        // Update existing profile
        response = await fetch(`/api/profiles/${editingProfile.id}`, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });
      } else {
        // Create new profile
        response = await fetch("/api/profiles", {
          method: "POST",
          headers: getAuthHeaders(),
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to save profile: ${response.statusText}`);
      }

      // Refresh profiles list
      await fetchProfiles();

      // Notify parent component
      if (onProfilesChange) {
        onProfilesChange();
      }

      // Return to list view
      setViewMode("list");
      setEditingProfile(null);
      setFormData(DEFAULT_FORM_DATA);
    } catch (err) {
      console.error("[ProfileManager] Failed to save profile:", err);
      setError(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handle delete profile
   */
  const handleDelete = async (profileId: string) => {
    setIsDeleting(profileId);
    setError(null);

    try {
      const response = await fetch(`/api/profiles/${profileId}`, {
        method: "DELETE",
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to delete profile: ${response.statusText}`);
      }

      // Refresh profiles list
      await fetchProfiles();

      // Notify parent component
      if (onProfilesChange) {
        onProfilesChange();
      }

      setDeleteConfirmId(null);
    } catch (err) {
      console.error("[ProfileManager] Failed to delete profile:", err);
      setError(err instanceof Error ? err.message : "Failed to delete profile");
    } finally {
      setIsDeleting(null);
    }
  };

  /**
   * Handle weight slider change
   */
  const handleWeightChange = (category: keyof ProfileFormData["scoring_weights"], value: number[]) => {
    setFormData((prev) => ({
      ...prev,
      scoring_weights: {
        ...prev.scoring_weights,
        [category]: value[0],
      },
    }));
  };

  // ============================================
  // Render Helpers
  // ============================================

  /**
   * Render list view
   */
  const renderListView = () => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      );
    }

    if (profiles.length === 0) {
      return (
        <div className="text-center py-12 space-y-3">
          <Settings className="h-12 w-12 mx-auto text-slate-300" />
          <p className="text-slate-500">No profiles yet</p>
          <Button onClick={handleCreateNew} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Your First Profile
          </Button>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {profiles.map((profile) => (
          <div
            key={profile.id}
            className="border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-medium text-slate-900 truncate">
                    {profile.name}
                  </h3>
                  {profile.is_default && (
                    <span className="px-2 py-0.5 text-xs font-medium bg-emerald-100 text-emerald-700 rounded">
                      Active
                    </span>
                  )}
                </div>
                {profile.description && (
                  <p className="text-sm text-slate-500 line-clamp-2">
                    {profile.description}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                  <span className="capitalize">{profile.risk_tolerance}</span>
                  <span>•</span>
                  <span>
                    Risk: {Math.round(profile.scoring_weights.risk * 100)}%
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleEdit(profile)}
                  title="Edit profile"
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setDeleteConfirmId(profile.id)}
                  disabled={isDeleting === profile.id}
                  title="Delete profile"
                >
                  {isDeleting === profile.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Delete confirmation */}
            {deleteConfirmId === profile.id && (
              <div className="mt-3 pt-3 border-t border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <p className="text-sm text-slate-700">
                    Delete this profile?
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(profile.id)}
                    disabled={isDeleting === profile.id}
                  >
                    Delete
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setDeleteConfirmId(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  /**
   * Render form view (create or edit)
   */
  const renderFormView = () => {
    const weightsSum = calculateWeightsSum(formData.scoring_weights);
    const weightsValid = weightsSum === 100;

    return (
      <div className="space-y-5">
        {/* Name */}
        <div className="space-y-2">
          <Label htmlFor="profile-name">Profile Name *</Label>
          <Input
            id="profile-name"
            placeholder="e.g., Conservative Land Only"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
          />
        </div>

        {/* Description */}
        <div className="space-y-2">
          <Label htmlFor="profile-description">Description</Label>
          <textarea
            id="profile-description"
            placeholder="Brief description of this profile's strategy..."
            value={formData.description}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, description: e.target.value }))
            }
            rows={3}
            className="flex w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white placeholder:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
          />
        </div>

        {/* Risk Tolerance */}
        <div className="space-y-2">
          <Label htmlFor="risk-tolerance">Risk Tolerance *</Label>
          <Select
            value={formData.risk_tolerance}
            onValueChange={(value) =>
              setFormData((prev) => ({
                ...prev,
                risk_tolerance: value as ProfileFormData["risk_tolerance"],
              }))
            }
          >
            <SelectTrigger id="risk-tolerance">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="conservative">Conservative</SelectItem>
              <SelectItem value="moderate">Moderate</SelectItem>
              <SelectItem value="aggressive">Aggressive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Scoring Weights */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label>Scoring Weights *</Label>
            <div className="flex items-center gap-2">
              {weightsValid ? (
                <span className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                  <CheckCircle className="h-3.5 w-3.5" />
                  {weightsSum}%
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-medium text-amber-600">
                  <AlertCircle className="h-3.5 w-3.5" />
                  {weightsSum}%
                </span>
              )}
            </div>
          </div>

          <div className="space-y-4 p-4 bg-slate-50 rounded-lg">
            {/* Location */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="weight-location" className="text-xs">
                  Location Score
                </Label>
                <span className="text-xs font-medium text-slate-600">
                  {formData.scoring_weights.location}%
                </span>
              </div>
              <Slider
                id="weight-location"
                value={[formData.scoring_weights.location]}
                onValueChange={(value) => handleWeightChange("location", value)}
                min={0}
                max={100}
                step={5}
              />
            </div>

            {/* Risk */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="weight-risk" className="text-xs">
                  Risk Score
                </Label>
                <span className="text-xs font-medium text-slate-600">
                  {formData.scoring_weights.risk}%
                </span>
              </div>
              <Slider
                id="weight-risk"
                value={[formData.scoring_weights.risk]}
                onValueChange={(value) => handleWeightChange("risk", value)}
                min={0}
                max={100}
                step={5}
              />
            </div>

            {/* Financial */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="weight-financial" className="text-xs">
                  Financial Score
                </Label>
                <span className="text-xs font-medium text-slate-600">
                  {formData.scoring_weights.financial}%
                </span>
              </div>
              <Slider
                id="weight-financial"
                value={[formData.scoring_weights.financial]}
                onValueChange={(value) => handleWeightChange("financial", value)}
                min={0}
                max={100}
                step={5}
              />
            </div>

            {/* Market */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="weight-market" className="text-xs">
                  Market Score
                </Label>
                <span className="text-xs font-medium text-slate-600">
                  {formData.scoring_weights.market}%
                </span>
              </div>
              <Slider
                id="weight-market"
                value={[formData.scoring_weights.market]}
                onValueChange={(value) => handleWeightChange("market", value)}
                min={0}
                max={100}
                step={5}
              />
            </div>

            {/* Profit */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="weight-profit" className="text-xs">
                  Profit Potential
                </Label>
                <span className="text-xs font-medium text-slate-600">
                  {formData.scoring_weights.profit}%
                </span>
              </div>
              <Slider
                id="weight-profit"
                value={[formData.scoring_weights.profit]}
                onValueChange={(value) => handleWeightChange("profit", value)}
                min={0}
                max={100}
                step={5}
              />
            </div>
          </div>

          {!weightsValid && (
            <p className="text-xs text-amber-600">
              Weights must sum to exactly 100%
            </p>
          )}
        </div>
      </div>
    );
  };

  // ============================================
  // Main Render
  // ============================================

  const isFormView = viewMode === "create" || viewMode === "edit";
  const dialogTitle =
    viewMode === "create"
      ? "Create Investment Profile"
      : viewMode === "edit"
      ? "Edit Investment Profile"
      : "Manage Investment Profiles";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className={cn(
          "dark:bg-slate-900",
          isFormView ? "max-w-lg" : "max-w-md"
        )}
        onClose={onClose}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 dark:text-slate-100">
            <Settings className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            {dialogTitle}
          </DialogTitle>
          <DialogDescription className="dark:text-slate-400">
            {viewMode === "list"
              ? "Create and manage your investment strategy profiles"
              : "Customize scoring weights to match your investment strategy"}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
          {/* Error display */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 mb-4">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800">Error</p>
                <p className="text-sm text-red-600 mt-0.5">{error}</p>
              </div>
            </div>
          )}

          {/* Content */}
          {viewMode === "list" ? renderListView() : renderFormView()}
        </div>

        <DialogFooter>
          {viewMode === "list" ? (
            <>
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button onClick={handleCreateNew} className="gap-2">
                <Plus className="h-4 w-4" />
                New Profile
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleCancel}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={isSaving || calculateWeightsSum(formData.scoring_weights) !== 100}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Profile"
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ProfileManager;
