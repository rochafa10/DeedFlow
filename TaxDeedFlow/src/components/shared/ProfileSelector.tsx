"use client";

/**
 * ProfileSelector Component
 *
 * Dropdown selector for switching between investment profiles.
 * Fetches user's profiles and allows quick switching between them.
 * Includes a "Manage Profiles" button for profile management.
 *
 * @module components/shared/ProfileSelector
 * @author Claude Code Agent
 * @date 2026-01-23
 */

import * as React from "react";
import { Settings, Loader2, AlertCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

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
 * Component props
 */
interface ProfileSelectorProps {
  /** Optional callback when profile changes */
  onProfileChange?: (profile: InvestmentProfile) => void;
  /** Optional callback to open profile manager */
  onManageProfiles?: () => void;
  /** Optional className for styling */
  className?: string;
}

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
      console.warn("[ProfileSelector] Unable to access localStorage for auth");
    }
  }

  return headers;
}

// ============================================
// Component
// ============================================

/**
 * ProfileSelector - Dropdown for switching investment profiles
 *
 * Features:
 * - Fetches user's profiles on mount
 * - Displays current active profile
 * - Allows switching between profiles
 * - Updates default profile on selection
 * - "Manage Profiles" button for profile management
 * - Loading and error states
 *
 * @example
 * ```tsx
 * <ProfileSelector
 *   onProfileChange={(profile) => console.log("Profile changed:", profile)}
 *   onManageProfiles={() => setShowManager(true)}
 * />
 * ```
 */
export function ProfileSelector({
  onProfileChange,
  onManageProfiles,
  className,
}: ProfileSelectorProps) {
  // State management
  const [profiles, setProfiles] = React.useState<InvestmentProfile[]>([]);
  const [activeProfile, setActiveProfile] = React.useState<InvestmentProfile | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [isSwitching, setIsSwitching] = React.useState(false);

  /**
   * Fetch user's profiles from API
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

      // Set active profile (the one marked as default)
      const defaultProfile = profilesList.find((p: InvestmentProfile) => p.is_default);
      if (defaultProfile) {
        setActiveProfile(defaultProfile);
      } else if (profilesList.length > 0) {
        // Fallback to first profile if no default
        setActiveProfile(profilesList[0]);
      }
    } catch (err) {
      console.error("[ProfileSelector] Failed to fetch profiles:", err);
      setError(err instanceof Error ? err.message : "Failed to load profiles");
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Set a profile as default and switch to it
   */
  const switchProfile = React.useCallback(
    async (profileId: string) => {
      if (!profileId) return;

      setIsSwitching(true);
      setError(null);

      try {
        const response = await fetch(`/api/profiles/${profileId}/set-default`, {
          method: "POST",
          headers: getAuthHeaders(),
        });

        if (!response.ok) {
          throw new Error(`Failed to set default profile: ${response.statusText}`);
        }

        const updatedProfile = await response.json();
        const profile = updatedProfile.data || updatedProfile;

        // Update active profile
        setActiveProfile(profile);

        // Update profiles list to reflect new default
        setProfiles((prev) =>
          prev.map((p) => ({
            ...p,
            is_default: p.id === profileId,
          }))
        );

        // Notify parent component
        if (onProfileChange) {
          onProfileChange(profile);
        }
      } catch (err) {
        console.error("[ProfileSelector] Failed to switch profile:", err);
        setError(err instanceof Error ? err.message : "Failed to switch profile");
      } finally {
        setIsSwitching(false);
      }
    },
    [onProfileChange]
  );

  /**
   * Fetch profiles on mount
   */
  React.useEffect(() => {
    fetchProfiles();
  }, [fetchProfiles]);

  // ============================================
  // Render
  // ============================================

  // Loading state
  if (isLoading) {
    return (
      <div className={className}>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Loading profiles...</span>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className={className}>
        <div className="flex items-center gap-2 text-sm text-red-600">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  // No profiles state
  if (profiles.length === 0) {
    return (
      <div className={className}>
        <Button
          variant="outline"
          size="sm"
          onClick={onManageProfiles}
          className="gap-2"
        >
          <Settings className="h-4 w-4" />
          Create Profile
        </Button>
      </div>
    );
  }

  // Normal state with profiles
  return (
    <div className={`flex items-center gap-2 ${className || ""}`}>
      <Select
        value={activeProfile?.id || ""}
        onValueChange={switchProfile}
        disabled={isSwitching}
      >
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Select profile">
            {isSwitching ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Switching...
              </span>
            ) : (
              activeProfile?.name || "Select profile"
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {profiles.map((profile) => (
            <SelectItem key={profile.id} value={profile.id}>
              <div className="flex items-center justify-between gap-2">
                <span>{profile.name}</span>
                {profile.is_default && (
                  <span className="text-xs text-slate-500">(active)</span>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        size="sm"
        onClick={onManageProfiles}
        className="gap-2"
        title="Manage Profiles"
      >
        <Settings className="h-4 w-4" />
        <span className="hidden sm:inline">Manage</span>
      </Button>
    </div>
  );
}
