"use client"

import { useQuery } from "@tanstack/react-query"

// County data types
export interface County {
  id: string
  name: string
  state: string
  stateName: string
  status: "active" | "pending" | "archived"
  propertyCount: number
  progress: number
  nextAuctionDate: string | null
  daysUntilAuction: number | null
  documentsCount: number
  researchedAt: string | null
}

interface CountyDashboardResponse {
  data: County[]
  total: number
  source: "database" | "mock"
  error?: string
}

async function fetchCountyDashboard(): Promise<CountyDashboardResponse> {
  const response = await fetch("/api/counties")

  if (!response.ok) {
    throw new Error("Failed to fetch county dashboard data")
  }

  return response.json()
}

export function useCountyDashboard() {
  return useQuery<CountyDashboardResponse, Error>({
    queryKey: ["counties", "dashboard"],
    queryFn: fetchCountyDashboard,
    staleTime: 5 * 1000, // 5 seconds
    refetchInterval: 10 * 1000, // Refetch every 10 seconds for real-time updates
    retry: 2,
  })
}

// Export individual hooks for more granular access
export function useCounties() {
  const { data, isLoading, error, refetch } = useCountyDashboard()

  return {
    counties: data?.data ?? [],
    total: data?.total ?? 0,
    isLoading,
    error,
    refetch,
    source: data?.source,
  }
}

export function useActiveCounties() {
  const { data, isLoading, error } = useCountyDashboard()

  return {
    counties: data?.data.filter((county) => county.status === "active") ?? [],
    isLoading,
    error,
  }
}

export function useUpcomingAuctionCounties() {
  const { data, isLoading, error } = useCountyDashboard()

  return {
    counties:
      data?.data
        .filter((county) => county.nextAuctionDate !== null)
        .sort((a, b) => {
          // Sort by days until auction (earliest first)
          if (a.daysUntilAuction === null) return 1
          if (b.daysUntilAuction === null) return -1
          return a.daysUntilAuction - b.daysUntilAuction
        }) ?? [],
    isLoading,
    error,
  }
}

export function useCountyProgress() {
  const { data, isLoading, error } = useCountyDashboard()

  return {
    counties:
      data?.data
        .filter((county) => county.propertyCount > 0)
        .sort((a, b) => b.progress - a.progress) ?? [],
    isLoading,
    error,
  }
}
