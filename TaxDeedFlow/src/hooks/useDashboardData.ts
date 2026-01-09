"use client"

import { useQuery } from "@tanstack/react-query"
import type { DashboardData } from "@/types/dashboard"

interface DashboardResponse {
  data: DashboardData
  source: "database" | "mock"
  error?: string
}

async function fetchDashboardStats(): Promise<DashboardResponse> {
  const response = await fetch("/api/dashboard/stats")

  if (!response.ok) {
    throw new Error("Failed to fetch dashboard stats")
  }

  return response.json()
}

export function useDashboardData() {
  return useQuery<DashboardResponse, Error>({
    queryKey: ["dashboard", "stats"],
    queryFn: fetchDashboardStats,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
    retry: 2,
  })
}

// Export individual stats hooks for more granular updates
export function useDashboardStats() {
  const { data, isLoading, error, refetch } = useDashboardData()

  return {
    stats: data?.data.stats,
    isLoading,
    error,
    refetch,
    source: data?.source,
  }
}

export function usePipelineFunnel() {
  const { data, isLoading, error } = useDashboardData()

  return {
    funnel: data?.data.funnel,
    isLoading,
    error,
  }
}

export function useUpcomingAuctions() {
  const { data, isLoading, error } = useDashboardData()

  return {
    auctions: data?.data.upcomingAuctions ?? [],
    isLoading,
    error,
  }
}

export function useBottlenecks() {
  const { data, isLoading, error } = useDashboardData()

  return {
    bottlenecks: data?.data.bottlenecks ?? [],
    isLoading,
    error,
  }
}

export function useCountyProgress() {
  const { data, isLoading, error } = useDashboardData()

  return {
    counties: data?.data.countyProgress ?? [],
    isLoading,
    error,
  }
}
