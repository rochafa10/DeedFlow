"use client";

/**
 * ShareDialog Component
 *
 * Modal dialog for creating and managing shareable report links.
 * Allows users to generate links with configurable expiration periods
 * and provides copy-to-clipboard functionality.
 *
 * @module components/report/ShareDialog
 * @author Claude Code Agent
 * @date 2026-01-17
 */

import * as React from "react";
import { Share2, Link2, Loader2, AlertCircle } from "lucide-react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShareLinkDisplay } from "./ShareLinkDisplay";
import { createShareLink } from "@/lib/share-utils";
import type { ShareLinkResponse } from "@/types/sharing";

// ============================================
// Types
// ============================================

interface ShareDialogProps {
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when dialog open state changes */
  onClose: () => void;
  /** ID of the report to share */
  reportId: string;
  /** Optional title of the report for display */
  reportTitle?: string;
}

/** Expiration option configuration */
interface ExpirationOption {
  value: string;
  label: string;
  days: number;
}

// ============================================
// Constants
// ============================================

/** Available expiration options */
const EXPIRATION_OPTIONS: ExpirationOption[] = [
  { value: "7", label: "7 days", days: 7 },
  { value: "14", label: "14 days", days: 14 },
  { value: "30", label: "30 days (default)", days: 30 },
  { value: "90", label: "90 days", days: 90 },
];

// ============================================
// Component
// ============================================

/**
 * ShareDialog - Modal for creating and sharing report links
 *
 * Features:
 * - Generate shareable links with one click
 * - Configurable expiration period (7/14/30/90 days)
 * - Copy link to clipboard with feedback
 * - Display expiration date
 * - Error handling with user-friendly messages
 *
 * @example
 * ```tsx
 * <ShareDialog
 *   isOpen={showShareDialog}
 *   onClose={() => setShowShareDialog(false)}
 *   reportId="report-uuid-123"
 *   reportTitle="456 Oak Street Property Analysis"
 * />
 * ```
 */
export function ShareDialog({
  isOpen,
  onClose,
  reportId,
  reportTitle,
}: ShareDialogProps) {
  // State management
  const [expirationDays, setExpirationDays] = React.useState("30");
  const [isGenerating, setIsGenerating] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [shareData, setShareData] = React.useState<ShareLinkResponse | null>(null);
  const [copySuccess, setCopySuccess] = React.useState(false);

  /**
   * Reset state when dialog closes
   */
  React.useEffect(() => {
    if (!isOpen) {
      // Delay reset to allow close animation
      const timeout = setTimeout(() => {
        setShareData(null);
        setError(null);
        setExpirationDays("30");
        setCopySuccess(false);
      }, 200);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  /**
   * Generate a new share link
   * Checks isOpen before state updates to prevent updates on unmounted component
   */
  const handleGenerateLink = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const days = parseInt(expirationDays, 10);
      const response = await createShareLink(reportId, days);
      // Only update state if dialog is still open (prevents update on unmounted component)
      if (isOpen) {
        setShareData(response);
      }
    } catch (err) {
      console.error("[ShareDialog] Failed to generate share link:", err);
      // Only update state if dialog is still open
      if (isOpen) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to generate share link. Please try again."
        );
      }
    } finally {
      // Only update state if dialog is still open
      if (isOpen) {
        setIsGenerating(false);
      }
    }
  };

  /**
   * Handle copy success feedback
   */
  const handleCopySuccess = () => {
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  /**
   * Handle dialog close
   */
  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="dark:bg-slate-900" onClose={handleClose}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 dark:text-slate-100">
            <Share2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
            Share Report
          </DialogTitle>
          <DialogDescription className="dark:text-slate-400">
            {reportTitle
              ? `Create a shareable link for "${reportTitle}"`
              : "Create a shareable link for this property analysis report"}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-4 space-y-6">
          {/* Error display */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
              <AlertCircle className="h-5 w-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-800 dark:text-red-300">
                  Error generating link
                </p>
                <p className="text-sm text-red-600 dark:text-red-400 mt-0.5">
                  {error}
                </p>
              </div>
            </div>
          )}

          {/* Generated link display */}
          {shareData ? (
            <div className="space-y-4">
              {/* Success message */}
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <Link2 className="h-5 w-5" />
                <span className="font-medium">Link generated successfully!</span>
              </div>

              {/* Link display component */}
              <ShareLinkDisplay
                shareUrl={shareData.share_url}
                expiresAt={shareData.expires_at}
                onCopy={handleCopySuccess}
              />

              {/* Copy success toast */}
              {copySuccess && (
                <p className="text-sm text-emerald-600 dark:text-emerald-400 text-center animate-in fade-in-0 duration-200">
                  Link copied to clipboard!
                </p>
              )}

              {/* Info text */}
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Anyone with this link can view the report without signing in.
                The link will expire automatically after the specified period.
              </p>
            </div>
          ) : (
            /* Link generation form */
            <div className="space-y-4">
              {/* Expiration selector */}
              <div className="space-y-2">
                <label
                  htmlFor="expiration-select"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300"
                >
                  Link expires in
                </label>
                <Select
                  value={expirationDays}
                  onValueChange={setExpirationDays}
                >
                  <SelectTrigger
                    id="expiration-select"
                    className="w-full dark:bg-slate-800 dark:border-slate-700"
                  >
                    <SelectValue placeholder="Select expiration" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPIRATION_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Generate button */}
              <Button
                onClick={handleGenerateLink}
                disabled={isGenerating}
                className="w-full"
                variant="default"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating Link...
                  </>
                ) : (
                  <>
                    <Link2 className="h-4 w-4 mr-2" />
                    Generate Shareable Link
                  </>
                )}
              </Button>

              {/* Info text */}
              <p className="text-xs text-slate-500 dark:text-slate-400">
                The link will allow anyone to view this report without signing in.
                You can generate a new link at any time.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          {shareData ? (
            <>
              <Button
                variant="outline"
                onClick={() => setShareData(null)}
                className="dark:border-slate-700 dark:text-slate-300"
              >
                Generate New Link
              </Button>
              <Button onClick={handleClose}>Done</Button>
            </>
          ) : (
            <Button
              variant="outline"
              onClick={handleClose}
              className="dark:border-slate-700 dark:text-slate-300"
            >
              Cancel
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ShareDialog;
