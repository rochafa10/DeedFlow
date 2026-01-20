"use client";

/**
 * ShareLinkDisplay Component
 *
 * A compact component for displaying and copying share links.
 * Shows the share URL, expiration information, and a copy button
 * with visual feedback when the link is copied.
 *
 * @module components/report/ShareLinkDisplay
 * @author Claude Code Agent
 * @date 2026-01-17
 */

import * as React from "react";
import { Copy, Check, Clock, ExternalLink, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  copyShareLinkToClipboard,
  formatShareExpiration,
  getDaysUntilExpiration,
  isShareExpired,
} from "@/lib/share-utils";

// ============================================
// Types
// ============================================

interface ShareLinkDisplayProps {
  /** The full shareable URL to display */
  shareUrl: string;
  /** ISO 8601 timestamp of when the link expires */
  expiresAt: string;
  /** Optional callback when link is copied */
  onCopy?: () => void;
  /** Optional additional CSS classes */
  className?: string;
  /** Whether to show the expiration info */
  showExpiration?: boolean;
  /** Whether to show an external link button */
  showExternalLink?: boolean;
}

// ============================================
// Component
// ============================================

/**
 * ShareLinkDisplay - Displays a share link with copy functionality
 *
 * Features:
 * - One-click copy to clipboard
 * - Visual "Copied!" feedback
 * - Expiration date display with color coding
 * - Truncated URL display for long links
 * - Optional external link button
 *
 * @example
 * ```tsx
 * <ShareLinkDisplay
 *   shareUrl="https://app.taxdeedflow.com/share/abc-123"
 *   expiresAt="2026-02-17T00:00:00Z"
 *   onCopy={() => console.log("Copied!")}
 * />
 * ```
 */
export function ShareLinkDisplay({
  shareUrl,
  expiresAt,
  onCopy,
  className,
  showExpiration = true,
  showExternalLink = true,
}: ShareLinkDisplayProps) {
  // State for copy feedback
  const [copied, setCopied] = React.useState(false);
  const [copyError, setCopyError] = React.useState(false);

  // Calculate expiration status
  const daysRemaining = getDaysUntilExpiration(expiresAt);
  const expired = isShareExpired(expiresAt);
  const expirationText = formatShareExpiration(expiresAt);

  /**
   * Handle copy button click
   * Copies URL to clipboard and shows feedback (success or failure)
   */
  const handleCopy = async () => {
    // Reset error state before attempting copy
    setCopyError(false);

    const success = await copyShareLinkToClipboard(shareUrl);

    if (success) {
      setCopied(true);
      onCopy?.();

      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } else {
      // Show error state when clipboard copy fails
      setCopyError(true);

      // Reset error state after 2 seconds
      setTimeout(() => {
        setCopyError(false);
      }, 2000);
    }
  };

  /**
   * Get expiration text color based on days remaining
   */
  const getExpirationColor = () => {
    if (expired) {
      return "text-red-500 dark:text-red-400";
    }
    if (daysRemaining <= 3) {
      return "text-orange-500 dark:text-orange-400";
    }
    if (daysRemaining <= 7) {
      return "text-amber-500 dark:text-amber-400";
    }
    return "text-slate-500 dark:text-slate-400";
  };

  /**
   * Truncate the URL for display (keep domain + first part of path)
   */
  const truncateUrl = (url: string, maxLength: number = 50) => {
    if (url.length <= maxLength) return url;

    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split("/").filter(Boolean);

      // Show: domain/share/first-8-chars...
      const token = pathParts[pathParts.length - 1];
      const truncatedToken =
        token.length > 8 ? `${token.substring(0, 8)}...` : token;

      return `${urlObj.host}/share/${truncatedToken}`;
    } catch {
      // If URL parsing fails, just truncate from the end
      return `${url.substring(0, maxLength)}...`;
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {/* URL display with copy button */}
      <div className="flex items-stretch rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 overflow-hidden">
        {/* URL text */}
        <div className="flex-1 px-3 py-2.5 min-w-0">
          <p
            className="text-sm font-mono text-slate-700 dark:text-slate-300 truncate"
            title={shareUrl}
          >
            {truncateUrl(shareUrl)}
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center border-l border-slate-200 dark:border-slate-700">
          {/* External link button */}
          {showExternalLink && (
            <a
              href={shareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "h-full px-3 flex items-center justify-center",
                "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
                "hover:bg-slate-100 dark:hover:bg-slate-700",
                "transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-inset"
              )}
              title="Open link in new tab"
            >
              <ExternalLink className="h-4 w-4" />
              <span className="sr-only">Open link</span>
            </a>
          )}

          {/* Copy button */}
          <button
            onClick={handleCopy}
            className={cn(
              "h-full px-3 flex items-center justify-center gap-1.5",
              "transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-inset",
              copied
                ? "bg-emerald-500 text-white"
                : copyError
                  ? "bg-red-500 text-white"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
            )}
            title={copied ? "Copied!" : copyError ? "Copy failed" : "Copy to clipboard"}
            aria-label={copied ? "Link copied" : copyError ? "Copy failed" : "Copy link to clipboard"}
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                <span className="text-xs font-medium">Copied!</span>
              </>
            ) : copyError ? (
              <>
                <XCircle className="h-4 w-4" />
                <span className="text-xs font-medium">Failed!</span>
              </>
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Expiration info */}
      {showExpiration && (
        <div
          className={cn("flex items-center gap-1.5 text-xs", getExpirationColor())}
        >
          <Clock className="h-3.5 w-3.5" />
          <span>{expirationText}</span>
          {!expired && daysRemaining <= 7 && (
            <span className="ml-1">({daysRemaining} day{daysRemaining !== 1 ? "s" : ""} left)</span>
          )}
        </div>
      )}
    </div>
  );
}

export default ShareLinkDisplay;
