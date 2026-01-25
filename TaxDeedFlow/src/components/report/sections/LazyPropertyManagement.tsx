"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Loading skeleton for PropertyManagementSection
 *
 * Displays a placeholder UI while the PropertyManagementSection
 * component is being dynamically loaded. Matches the visual structure
 * of the actual component for a smooth loading experience.
 */
function PropertyManagementSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 print:hidden">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-6 w-48" />
        </div>
        <Skeleton className="h-8 w-24 rounded-lg" />
      </div>

      {/* Content skeleton - 2x2 grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Notes skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-32 w-full rounded-lg" />
        </div>

        {/* Images skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-5 w-32" />
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="aspect-square rounded-lg" />
            <Skeleton className="aspect-square rounded-lg" />
            <Skeleton className="aspect-square rounded-lg" />
          </div>
        </div>

        {/* History skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-5 w-36" />
          <div className="space-y-2">
            <Skeleton className="h-12 w-full rounded-lg" />
            <Skeleton className="h-12 w-full rounded-lg" />
          </div>
        </div>

        {/* Enrichment skeleton */}
        <div className="space-y-3">
          <Skeleton className="h-5 w-40" />
          <div className="grid grid-cols-3 gap-2">
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
            <Skeleton className="h-20 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Lazy-loaded PropertyManagementSection
 *
 * Uses Next.js dynamic import to load the PropertyManagementSection
 * only when needed, reducing initial bundle size. This is particularly
 * beneficial since the PropertyManagementSection includes several
 * sub-components (notes, images, timeline, enrichment status).
 *
 * Features:
 * - Dynamic import with code splitting
 * - Skeleton loader during loading state
 * - SSR disabled (client-only component)
 * - Re-exports props type for convenience
 *
 * @example
 * ```tsx
 * <LazyPropertyManagementSection
 *   propertyId="abc123"
 *   notes={notes}
 *   onNotesChange={setNotes}
 *   canEditNotes={true}
 *   currentUserName="John Doe"
 *   images={images}
 *   activityLog={activityLog}
 *   enrichmentStatus={{
 *     regridComplete: true,
 *     regridLastFetched: "2026-01-20T10:30:00Z",
 *     screenshotComplete: true,
 *     screenshotCount: 3,
 *     validationStatus: "approved"
 *   }}
 * />
 * ```
 */
export const LazyPropertyManagementSection = dynamic(
  () => import("./PropertyManagementSection").then(mod => ({ default: mod.PropertyManagementSection })),
  {
    loading: () => <PropertyManagementSkeleton />,
    ssr: false, // Client-only since it uses browser APIs
  }
);

// Re-export props type for convenience
export type { PropertyManagementSectionProps } from "./PropertyManagementSection";

// Also export the skeleton for potential standalone use
export { PropertyManagementSkeleton };
