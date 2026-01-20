"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Skeleton component for loading states.
 * Uses a subtle pulse animation with a light gray background.
 */
export function Skeleton({ className, style }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-slate-200",
        className
      )}
      style={style}
    />
  )
}

/**
 * Pre-built skeleton for a card layout
 */
export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div className={cn("rounded-lg border border-slate-200 bg-white p-4", className)}>
      <div className="space-y-3">
        <Skeleton className="h-4 w-1/4" />
        <Skeleton className="h-8 w-1/2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
    </div>
  )
}

/**
 * Pre-built skeleton for a table row
 */
export function SkeletonTableRow({ columns = 5 }: { columns?: number }) {
  return (
    <tr className="border-b border-slate-100">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  )
}

/**
 * Pre-built skeleton for a list item
 */
export function SkeletonListItem({ className }: SkeletonProps) {
  return (
    <div className={cn("flex items-center gap-4 p-4", className)}>
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
    </div>
  )
}
