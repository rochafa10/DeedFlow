"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import type {
  DealWithMetrics,
  PipelineStageWithMetrics,
  PipelineStats,
  DealFilters,
  CreateDealRequest,
  PipelineFilterOptions,
} from "@/types/deal-pipeline"
// ============================================
// Response Types
// ============================================

interface PipelineResponse {
  data: {
    deals: DealWithMetrics[]
    stages: PipelineStageWithMetrics[]
    stats: PipelineStats
    filterOptions?: PipelineFilterOptions
  }
  source: "database" | "mock"
}

// ============================================
// Default / Empty Helpers
// ============================================

/** Default pipeline stages when database is empty or unavailable */
function getDefaultStages(): PipelineStageWithMetrics[] {
  const defaults = [
    { name: "Lead", description: "New properties identified for potential acquisition", color: "#3B82F6", sort_order: 1 },
    { name: "Research", description: "Active research on property details, liens, and history", color: "#8B5CF6", sort_order: 2 },
    { name: "Analysis", description: "Financial analysis, valuation, and ROI calculations", color: "#F59E0B", sort_order: 3 },
    { name: "Due Diligence", description: "Title search, environmental checks, and final review", color: "#EF4444", sort_order: 4 },
    { name: "Bidding", description: "Registered and ready to bid at auction", color: "#10B981", sort_order: 5 },
    { name: "Won", description: "Successfully acquired property at auction", color: "#059669", sort_order: 6 },
  ]

  return defaults.map((s, i) => ({
    id: `default-stage-${i + 1}`,
    organization_id: "",
    name: s.name,
    description: s.description,
    color: s.color,
    sort_order: s.sort_order,
    is_terminal: s.name === "Won",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deal_count: 0,
    urgent_deals: 0,
    high_priority_deals: 0,
    total_estimated_value: 0,
    total_estimated_profit: 0,
    avg_estimated_profit: 0,
    avg_days_in_stage: 0,
  }))
}

/** Empty stats object */
function getEmptyStats(): PipelineStats {
  return {
    organization_id: "",
    total_active_deals: 0,
    deals_by_status: { active: 0, won: 0, lost: 0, abandoned: 0 },
    deals_by_priority: { low: 0, medium: 0, high: 0, urgent: 0 },
    total_estimated_value: 0,
    total_estimated_profit: 0,
    total_actual_bids: 0,
    total_purchase_price: 0,
    avg_roi_percentage: 0,
    win_rate: 0,
    total_won: 0,
    total_lost: 0,
    avg_time_to_close_days: 0,
    deals_overdue: 0,
  }
}

// ============================================
// Fetch Function
// ============================================

async function fetchPipelineData(filters?: DealFilters): Promise<PipelineResponse> {
  try {
    const params = new URLSearchParams()
    params.set("include_stats", "true")

    if (filters?.organization_id) params.set("organization_id", filters.organization_id)
    if (filters?.stage_id) params.set("stage_id", filters.stage_id)
    if (filters?.status) params.set("status", filters.status)
    if (filters?.priority) params.set("priority", filters.priority)
    if (filters?.assigned_to) params.set("assigned_to", filters.assigned_to)
    if (filters?.property_id) params.set("property_id", filters.property_id)
    if (filters?.search) params.set("search", filters.search)
    if (filters?.state_code) params.set("state_code", filters.state_code)
    if (filters?.county_id) params.set("county_id", filters.county_id)
    if (filters?.sale_type) params.set("sale_type", filters.sale_type)
    if (filters?.date_range) params.set("date_range", filters.date_range)
    if (filters?.limit) params.set("limit", String(filters.limit))

    const response = await fetch(`/api/deal-pipeline?${params.toString()}`)

    if (!response.ok) {
      throw new Error(`Failed to fetch pipeline data: ${response.status}`)
    }

    const json = await response.json()

    if (json.error) {
      throw new Error(json.error)
    }

    // The API returns deals and stats but not stages separately.
    // Build stages from the deals data if the API did not return them.
    const deals: DealWithMetrics[] = json.data?.deals ?? []
    const stats: PipelineStats | undefined = json.data?.stats
    const filterOptions: PipelineFilterOptions | undefined = json.data?.filterOptions

    // Derive stages from deals when the API response doesn't include them
    const stageMap = new Map<string, PipelineStageWithMetrics>()
    for (const deal of deals) {
      if (!stageMap.has(deal.current_stage_id)) {
        stageMap.set(deal.current_stage_id, {
          id: deal.current_stage_id,
          organization_id: deal.organization_id,
          name: deal.current_stage_name,
          description: undefined,
          color: deal.current_stage_color,
          sort_order: 0,
          is_terminal: false,
          is_active: true,
          created_at: deal.created_at,
          updated_at: deal.updated_at,
          deal_count: 0,
          urgent_deals: 0,
          high_priority_deals: 0,
          total_estimated_value: 0,
          total_estimated_profit: 0,
          avg_estimated_profit: 0,
          avg_days_in_stage: 0,
        })
      }

      const stage = stageMap.get(deal.current_stage_id)!
      stage.deal_count += 1
      if (deal.priority === "urgent") stage.urgent_deals += 1
      if (deal.priority === "high") stage.high_priority_deals += 1
      stage.total_estimated_value += deal.estimated_value || 0
      stage.total_estimated_profit += deal.estimated_profit || 0
    }

    // Compute averages for derived stages
    const derivedStages = Array.from(stageMap.values())
    derivedStages.forEach((stage) => {
      if (stage.deal_count > 0) {
        stage.avg_estimated_profit = Math.round(stage.total_estimated_profit / stage.deal_count)
      }
    })

    const stages = json.data?.stages
      ? (json.data.stages as PipelineStageWithMetrics[])
      : derivedStages

    // If we got valid data, return it
    if (deals.length > 0 || stats) {
      return {
        data: {
          deals,
          stages,
          filterOptions,
          stats: stats || {
            organization_id: "",
            total_active_deals: deals.filter((d) => d.status === "active").length,
            deals_by_status: {
              active: deals.filter((d) => d.status === "active").length,
              won: deals.filter((d) => d.status === "won").length,
              lost: deals.filter((d) => d.status === "lost").length,
              abandoned: deals.filter((d) => d.status === "abandoned").length,
            },
            deals_by_priority: {
              low: deals.filter((d) => d.priority === "low").length,
              medium: deals.filter((d) => d.priority === "medium").length,
              high: deals.filter((d) => d.priority === "high").length,
              urgent: deals.filter((d) => d.priority === "urgent").length,
            },
            total_estimated_value: deals.reduce((s, d) => s + (d.estimated_value || 0), 0),
            total_estimated_profit: deals.reduce((s, d) => s + (d.estimated_profit || 0), 0),
            total_actual_bids: 0,
            total_purchase_price: 0,
            avg_roi_percentage: 0,
            win_rate: 0,
            total_won: 0,
            total_lost: 0,
            avg_time_to_close_days: 0,
            deals_overdue: deals.filter((d) => d.is_overdue).length,
          },
        },
        source: "database",
      }
    }

    // Empty database -- return empty state
    return {
      data: {
        deals: [],
        stages: getDefaultStages(),
        stats: getEmptyStats(),
        filterOptions: { states: [], counties: [], saleTypes: [] },
      },
      source: "database",
    }
  } catch {
    // API unavailable -- return empty state
    return {
      data: {
        deals: [],
        stages: getDefaultStages(),
        stats: getEmptyStats(),
        filterOptions: { states: [], counties: [], saleTypes: [] },
      },
      source: "mock",
    }
  }
}

// ============================================
// Query Hook
// ============================================

/**
 * Hook for fetching pipeline data (deals, stages, and stats).
 *
 * Returns empty state with default stages when the API is unavailable.
 *
 * @param filters - Optional deal filters
 * @returns React Query result with PipelineResponse
 */
export function usePipelineData(filters?: DealFilters) {
  return useQuery<PipelineResponse, Error>({
    queryKey: ["pipeline", "data", filters],
    queryFn: () => fetchPipelineData(filters),
    staleTime: 5000,
    refetchInterval: 10000,
    retry: 1,
  })
}

// ============================================
// Mutation Hooks
// ============================================

/**
 * Hook that returns mutations for creating and moving deals.
 *
 * Both mutations automatically invalidate the pipeline query cache on success.
 */
export function useDealMutations() {
  const queryClient = useQueryClient()

  const createDeal = useMutation<
    { deal_id: string; title: string; current_stage_id: string; message?: string },
    Error,
    CreateDealRequest
  >({
    mutationFn: async (data) => {
      const response = await fetch("/api/deal-pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || "Failed to create deal")
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline"] })
    },
  })

  const moveDeal = useMutation<
    { deal_id: string; message?: string },
    Error,
    { dealId: string; toStageId: string; note?: string }
  >({
    mutationFn: async ({ dealId, toStageId, note }) => {
      const response = await fetch(`/api/deal-pipeline/${dealId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ current_stage_id: toStageId, note }),
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(error.message || "Failed to move deal")
      }

      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pipeline"] })
    },
  })

  return { createDeal, moveDeal }
}
