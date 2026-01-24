"use client"

import { useState, useEffect, useCallback } from "react"
import { supabase, isSupabaseConfigured } from "@/lib/supabase/client"
import type { RealtimeChannel } from "@supabase/supabase-js"

// Activity feed item type
export interface ActivityFeedItem {
  id: string
  type: "session" | "assignment"
  timestamp: string
  agentName?: string
  action: string
  details: string
  status: "active" | "completed" | "failed" | "pending" | "paused"
  county?: string
  state?: string
  countyId?: string
  sessionId?: string
  priority?: number
  progress?: number
  taskType?: string
}

// Orchestration session from database
interface OrchestrationSession {
  id: string
  created_at: string
  started_at: string
  ended_at: string | null
  session_type: string
  status: "active" | "completed" | "failed"
  trigger_source: string
  properties_processed: number
  properties_failed: number
  agents_used: string[]
  token_estimate: number | null
  notes: string | null
  work_assigned: number
  work_completed: number
}

// Agent assignment from database
interface AgentAssignment {
  id: string
  created_at: string
  session_id: string
  agent_name: string
  task_type: string
  county_id: string
  priority: number
  status: "pending" | "in_progress" | "completed" | "failed" | "paused"
  items_total: number
  items_processed: number
  items_failed: number
  execution_method: string
  assigned_at: string
  started_at: string | null
  completed_at: string | null
  error_message: string | null
  notes: string | null
  counties?: {
    id: string
    county_name: string
    state_code: string
  }
}

export function useActivityFeed() {
  const [activities, setActivities] = useState<ActivityFeedItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [channel, setChannel] = useState<RealtimeChannel | null>(null)

  // Transform session to activity item
  const transformSession = useCallback((session: OrchestrationSession): ActivityFeedItem => {
    const agentCount = session.agents_used?.length || 0
    const statusLabel = session.status === "active"
      ? "In Progress"
      : session.status === "completed"
      ? "Completed"
      : "Failed"

    return {
      id: session.id,
      type: "session",
      timestamp: session.started_at || session.created_at,
      action: `Orchestration Session ${statusLabel}`,
      details: `${session.session_type} session with ${agentCount} agent${agentCount !== 1 ? 's' : ''}. Processed ${session.properties_processed} properties.`,
      status: session.status,
      sessionId: session.id,
    }
  }, [])

  // Transform assignment to activity item
  const transformAssignment = useCallback((assignment: AgentAssignment): ActivityFeedItem => {
    const county = assignment.counties?.county_name || "Unknown"
    const state = assignment.counties?.state_code || "??"
    const progress = assignment.items_total > 0
      ? Math.round((assignment.items_processed / assignment.items_total) * 100)
      : 0

    const taskLabel = formatTaskType(assignment.task_type)
    const statusLabel = assignment.status === "in_progress"
      ? "In Progress"
      : assignment.status === "completed"
      ? "Completed"
      : assignment.status === "failed"
      ? "Failed"
      : assignment.status === "paused"
      ? "Paused"
      : "Pending"

    // Map database status to ActivityFeedItem status
    // "in_progress" from DB maps to "active" in the feed
    const feedStatus: ActivityFeedItem["status"] =
      assignment.status === "in_progress" ? "active" : assignment.status

    return {
      id: assignment.id,
      type: "assignment",
      timestamp: assignment.started_at || assignment.assigned_at || assignment.created_at,
      agentName: assignment.agent_name,
      action: `${taskLabel} - ${statusLabel}`,
      details: `${county}, ${state} - ${assignment.items_processed}/${assignment.items_total} items (${progress}%)`,
      status: feedStatus,
      county,
      state,
      countyId: assignment.county_id,
      sessionId: assignment.session_id,
      priority: assignment.priority,
      progress,
      taskType: assignment.task_type,
    }
  }, [])

  // Fetch initial data
  const fetchInitialData = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setError(new Error("Supabase not configured"))
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      // Fetch recent sessions and assignments in parallel
      const [sessionsResult, assignmentsResult] = await Promise.all([
        supabase!
          .from("orchestration_sessions")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(20),
        supabase!
          .from("agent_assignments")
          .select(`
            *,
            counties (
              id,
              county_name,
              state_code
            )
          `)
          .order("created_at", { ascending: false })
          .limit(50),
      ])

      if (sessionsResult.error) throw sessionsResult.error
      if (assignmentsResult.error) throw assignmentsResult.error

      // Transform and merge data
      const sessionActivities = (sessionsResult.data || []).map(transformSession)
      const assignmentActivities = (assignmentsResult.data || []).map(transformAssignment)

      // Combine and sort by timestamp (most recent first)
      const allActivities = [...sessionActivities, ...assignmentActivities].sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )

      setActivities(allActivities)
      setIsLoading(false)
    } catch (err) {
      console.error("[useActivityFeed] Error fetching initial data:", err)
      setError(err as Error)
      setIsLoading(false)
    }
  }, [transformSession, transformAssignment])

  // Set up real-time subscriptions
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return
    }

    // Fetch initial data
    fetchInitialData()

    // Create a channel for real-time updates
    const realtimeChannel = supabase!
      .channel("activity-feed")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orchestration_sessions",
        },
        (payload) => {
          console.log("[useActivityFeed] Session change:", payload)

          if (payload.eventType === "INSERT") {
            const newSession = transformSession(payload.new as OrchestrationSession)
            setActivities((prev) => [newSession, ...prev])
          } else if (payload.eventType === "UPDATE") {
            const updatedSession = transformSession(payload.new as OrchestrationSession)
            setActivities((prev) =>
              prev.map((item) =>
                item.id === updatedSession.id && item.type === "session"
                  ? updatedSession
                  : item
              )
            )
          } else if (payload.eventType === "DELETE") {
            setActivities((prev) =>
              prev.filter(
                (item) => !(item.id === payload.old.id && item.type === "session")
              )
            )
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "agent_assignments",
        },
        async (payload) => {
          console.log("[useActivityFeed] Assignment change:", payload)

          // For assignments, we need to fetch the county data
          if (payload.eventType === "INSERT" || payload.eventType === "UPDATE") {
            const assignment = payload.new as AgentAssignment

            // Fetch county data if not included
            if (!assignment.counties && assignment.county_id) {
              const { data: countyData } = await supabase!
                .from("counties")
                .select("id, county_name, state_code")
                .eq("id", assignment.county_id)
                .single()

              if (countyData) {
                assignment.counties = countyData
              }
            }

            const newAssignment = transformAssignment(assignment)

            if (payload.eventType === "INSERT") {
              setActivities((prev) => [newAssignment, ...prev])
            } else {
              setActivities((prev) =>
                prev.map((item) =>
                  item.id === newAssignment.id && item.type === "assignment"
                    ? newAssignment
                    : item
                )
              )
            }
          } else if (payload.eventType === "DELETE") {
            setActivities((prev) =>
              prev.filter(
                (item) => !(item.id === payload.old.id && item.type === "assignment")
              )
            )
          }
        }
      )
      .subscribe((status) => {
        console.log("[useActivityFeed] Subscription status:", status)
      })

    setChannel(realtimeChannel)

    // Cleanup subscription on unmount
    return () => {
      if (realtimeChannel) {
        supabase!.removeChannel(realtimeChannel)
      }
    }
  }, [fetchInitialData, transformSession, transformAssignment])

  return {
    activities,
    isLoading,
    error,
    refetch: fetchInitialData,
  }
}

// Helper function to format task type
function formatTaskType(type: string): string {
  const labels: Record<string, string> = {
    regrid_scraping: "Regrid Scraping",
    visual_validation: "Visual Validation",
    pdf_parsing: "PDF Parsing",
    county_research: "County Research",
    title_research: "Title Research",
    property_condition: "Property Condition",
    environmental_research: "Environmental Research",
    bid_strategy: "Bid Strategy",
    auction_monitoring: "Auction Monitoring",
  }
  return labels[type] || type
}
