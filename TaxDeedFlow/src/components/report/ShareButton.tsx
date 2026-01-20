"use client";

/**
 * ShareButton Component
 *
 * A button that triggers the share dialog for creating shareable report links.
 * Provides a clean, accessible trigger for the sharing workflow.
 *
 * @module components/report/ShareButton
 * @author Claude Code Agent
 * @date 2026-01-17
 */

import * as React from "react";
import { Share2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ShareDialog } from "./ShareDialog";

// ============================================
// Types
// ============================================

interface ShareButtonProps {
  /** ID of the report to share */
  reportId: string;
  /** Optional title of the report for display in dialog */
  reportTitle?: string;
  /** Whether the button is disabled */
  disabled?: boolean;
  /** Optional additional CSS classes */
  className?: string;
  /** Button variant - matches Button component variants */
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive" | "success";
  /** Button size - matches Button component sizes */
  size?: "default" | "sm" | "lg" | "icon";
  /** Whether to show text label alongside icon */
  showLabel?: boolean;
  /** Custom label text */
  label?: string;
}

// ============================================
// Component
// ============================================

/**
 * ShareButton - Trigger button for opening the share dialog
 *
 * A self-contained component that manages its own dialog state.
 * Renders a button that, when clicked, opens the ShareDialog.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <ShareButton reportId="report-uuid-123" />
 *
 * // With title and custom styling
 * <ShareButton
 *   reportId="report-uuid-123"
 *   reportTitle="456 Oak Street Analysis"
 *   variant="outline"
 *   showLabel
 * />
 *
 * // Icon-only button
 * <ShareButton
 *   reportId="report-uuid-123"
 *   size="icon"
 *   variant="ghost"
 * />
 * ```
 */
export function ShareButton({
  reportId,
  reportTitle,
  disabled = false,
  className,
  variant = "outline",
  size = "default",
  showLabel = true,
  label = "Share",
}: ShareButtonProps) {
  // State for dialog visibility
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  /**
   * Open the share dialog
   */
  const handleOpenDialog = () => {
    if (!disabled) {
      setIsDialogOpen(true);
    }
  };

  /**
   * Close the share dialog
   */
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
  };

  return (
    <>
      {/* Share trigger button */}
      <Button
        variant={variant}
        size={size}
        onClick={handleOpenDialog}
        disabled={disabled}
        className={cn(
          "gap-2",
          size === "icon" && "gap-0",
          className
        )}
        aria-label={`Share ${reportTitle || "report"}`}
        title={disabled ? "Sharing is not available" : `Share ${reportTitle || "this report"}`}
      >
        <Share2 className={cn("h-4 w-4", size === "lg" && "h-5 w-5")} />
        {showLabel && size !== "icon" && <span>{label}</span>}
      </Button>

      {/* Share dialog */}
      <ShareDialog
        isOpen={isDialogOpen}
        onClose={handleCloseDialog}
        reportId={reportId}
        reportTitle={reportTitle}
      />
    </>
  );
}

export default ShareButton;
