"use client"

import { useState, Suspense, useEffect } from "react"
import { Header } from "@/components/layout/Header"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { PipelineBoard } from "@/components/deal-pipeline/PipelineBoard"
import { Loader2 } from "lucide-react"
import type { PipelineStageWithMetrics, DealWithMetrics } from "@/types/deal-pipeline"

function PipelineContent() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [stages, setStages] = useState<PipelineStageWithMetrics[]>([])
  const [deals, setDeals] = useState<DealWithMetrics[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  // Fetch pipeline data
  useEffect(() => {
    if (!isAuthenticated) return

    const fetchPipelineData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // For demo purposes, use mock data
        // In production, this would fetch from /api/deal-pipeline
        const mockStages: PipelineStageWithMetrics[] = [
          {
            id: "stage-1",
            organization_id: "org-1",
            name: "Lead",
            description: "Initial property leads",
            color: "#3B82F6",
            sort_order: 1,
            is_active: true,
            is_terminal: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deal_count: 5,
            urgent_deals: 1,
            high_priority_deals: 2,
            total_estimated_value: 250000,
            total_estimated_profit: 50000,
            avg_estimated_profit: 10000,
            avg_days_in_stage: 3,
          },
          {
            id: "stage-2",
            organization_id: "org-1",
            name: "Analysis",
            description: "Property analysis in progress",
            color: "#8B5CF6",
            sort_order: 2,
            is_active: true,
            is_terminal: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deal_count: 3,
            urgent_deals: 0,
            high_priority_deals: 1,
            total_estimated_value: 180000,
            total_estimated_profit: 36000,
            avg_estimated_profit: 12000,
            avg_days_in_stage: 5,
          },
          {
            id: "stage-3",
            organization_id: "org-1",
            name: "Due Diligence",
            description: "Final verification before bidding",
            color: "#F59E0B",
            sort_order: 3,
            is_active: true,
            is_terminal: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deal_count: 2,
            urgent_deals: 2,
            high_priority_deals: 1,
            total_estimated_value: 120000,
            total_estimated_profit: 24000,
            avg_estimated_profit: 12000,
            avg_days_in_stage: 4,
          },
          {
            id: "stage-4",
            organization_id: "org-1",
            name: "Bidding",
            description: "Ready to bid at auction",
            color: "#10B981",
            sort_order: 4,
            is_active: true,
            is_terminal: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deal_count: 4,
            urgent_deals: 3,
            high_priority_deals: 2,
            total_estimated_value: 200000,
            total_estimated_profit: 40000,
            avg_estimated_profit: 10000,
            avg_days_in_stage: 7,
          },
          {
            id: "stage-5",
            organization_id: "org-1",
            name: "Won",
            description: "Successfully acquired",
            color: "#059669",
            sort_order: 5,
            is_active: true,
            is_terminal: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deal_count: 8,
            urgent_deals: 0,
            high_priority_deals: 0,
            total_estimated_value: 480000,
            total_estimated_profit: 96000,
            avg_estimated_profit: 12000,
            avg_days_in_stage: 14,
          },
        ]

        const mockDeals: DealWithMetrics[] = [
          {
            id: "deal-1",
            organization_id: "org-1",
            property_id: "prop-1",
            current_stage_id: "stage-1",
            current_stage_name: "Lead",
            current_stage_color: "#3B82F6",
            title: "123 Main St, Anytown PA",
            description: "Single family home with good potential",
            status: "active",
            priority: "medium",
            assigned_to: "user-1",
            created_by: "user-1",
            target_bid_amount: 45000,
            max_bid_amount: 55000,
            actual_bid_amount: undefined,
            purchase_price: undefined,
            estimated_value: 85000,
            estimated_profit: 30000,
            roi_percentage: 54.5,
            auction_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            registration_deadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
            won_at: undefined,
            lost_at: undefined,
            tags: ["residential", "good-condition"],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            days_in_stage: 2,
            days_until_auction: 7,
            days_until_registration_deadline: 3,
            active_team_members: 1,
            activity_count: 5,
            is_overdue: false,
          },
          {
            id: "deal-2",
            organization_id: "org-1",
            property_id: "prop-2",
            current_stage_id: "stage-2",
            current_stage_name: "Analysis",
            current_stage_color: "#8B5CF6",
            title: "456 Oak Ave, Somewhere PA",
            description: "Needs renovation but great location",
            status: "active",
            priority: "high",
            assigned_to: "user-2",
            created_by: "user-1",
            target_bid_amount: 30000,
            max_bid_amount: 40000,
            actual_bid_amount: undefined,
            purchase_price: undefined,
            estimated_value: 65000,
            estimated_profit: 25000,
            roi_percentage: 62.5,
            auction_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            registration_deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString(),
            won_at: undefined,
            lost_at: undefined,
            tags: ["residential", "renovation"],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            days_in_stage: 5,
            days_until_auction: 14,
            days_until_registration_deadline: 10,
            active_team_members: 1,
            activity_count: 8,
            is_overdue: true,
          },
          {
            id: "deal-3",
            organization_id: "org-1",
            property_id: "prop-3",
            current_stage_id: "stage-4",
            current_stage_name: "Bidding",
            current_stage_color: "#10B981",
            title: "789 Pine St, Township PA",
            description: "Commercial property with tenant",
            status: "active",
            priority: "urgent",
            assigned_to: "user-1",
            created_by: "user-1",
            target_bid_amount: 80000,
            max_bid_amount: 95000,
            actual_bid_amount: undefined,
            purchase_price: undefined,
            estimated_value: 130000,
            estimated_profit: 35000,
            roi_percentage: 36.8,
            auction_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            registration_deadline: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
            won_at: undefined,
            lost_at: undefined,
            tags: ["commercial", "tenant-occupied"],
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            days_in_stage: 7,
            days_until_auction: 2,
            days_until_registration_deadline: 1,
            active_team_members: 2,
            activity_count: 12,
            is_overdue: false,
          },
        ]

        setStages(mockStages)
        setDeals(mockDeals)
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to fetch pipeline data"))
      } finally {
        setIsLoading(false)
      }
    }

    fetchPipelineData()
  }, [isAuthenticated])

  // Show loading spinner while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <Header />
        <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      </div>
    )
  }

  // Don't render anything if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null
  }

  const handleMoveDeal = (dealId: string, toStageId: string) => {
    // Find the target stage name and color
    const targetStage = stages.find((s) => s.id === toStageId)

    // Update deal stage
    setDeals((prevDeals) =>
      prevDeals.map((deal) =>
        deal.id === dealId
          ? {
              ...deal,
              current_stage_id: toStageId,
              current_stage_name: targetStage?.name || "",
              current_stage_color: targetStage?.color,
              days_in_stage: 0,
            }
          : deal
      )
    )

    // Update stage counts
    const movedDeal = deals.find((d) => d.id === dealId)
    if (movedDeal) {
      setStages((prevStages) =>
        prevStages.map((stage) => {
          if (stage.id === movedDeal.current_stage_id) {
            // Remove from old stage
            return {
              ...stage,
              deal_count: stage.deal_count - 1,
              total_estimated_value: stage.total_estimated_value - (movedDeal.target_bid_amount || 0),
              total_estimated_profit: stage.total_estimated_profit - (movedDeal.estimated_profit || 0),
            }
          } else if (stage.id === toStageId) {
            // Add to new stage
            return {
              ...stage,
              deal_count: stage.deal_count + 1,
              total_estimated_value: stage.total_estimated_value + (movedDeal.target_bid_amount || 0),
              total_estimated_profit: stage.total_estimated_profit + (movedDeal.estimated_profit || 0),
            }
          }
          return stage
        })
      )
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Header />

      {/* Hero Section */}
      <div className="border-b bg-gradient-to-r from-blue-600 to-purple-600 py-12 text-white">
        <div className="container mx-auto px-4">
          <h1 className="mb-2 text-4xl font-bold">Deal Pipeline</h1>
          <p className="text-lg text-blue-100">
            Track deals through your sales pipeline from lead to closing
          </p>
        </div>
      </div>

      {/* Pipeline Board */}
      <div className="container mx-auto px-4 py-8">
        <PipelineBoard
          stages={stages}
          deals={deals}
          isLoading={isLoading}
          error={error}
          onMoveDeal={handleMoveDeal}
        />
      </div>
    </div>
  )
}

export default function PipelinePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <PipelineContent />
    </Suspense>
  )
}
