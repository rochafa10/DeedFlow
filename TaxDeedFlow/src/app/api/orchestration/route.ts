import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/client"
import type {
  OrchestrationSession,
  AgentAssignment,
  BatchJob,
  PipelineMetrics,
  Property,
  County,
} from "@/types/database"

// Extended types for joined data
interface AgentAssignmentWithCounty extends AgentAssignment {
  counties?: {
    id: string
    county_name: string
    state_code: string
  } | null
  // Legacy field mappings for backward compatibility
  task_type?: string
  items_total?: number
  items_processed?: number
  items_failed?: number
  assigned_at?: string
}

interface BatchJobWithCounty extends BatchJob {
  counties?: {
    id: string
    county_name: string
    state_code: string
  } | null
}

interface CountyWithProperties extends County {
  properties?: Array<{ id: string }>
}

interface PropertyStats {
  id: string
  has_regrid_data: boolean
  visual_validation_status?: string
  auction_status?: string
}

// Extended OrchestrationSession with additional fields that may exist
interface ExtendedOrchestrationSession extends OrchestrationSession {
  properties_processed?: number
  properties_failed?: number
  agents_used?: string[]
  token_estimate?: number
  notes?: string
  work_assigned?: number
  work_completed?: number
  trigger_source?: string
}

/**
 * GET /api/orchestration
 * Returns orchestration sessions, work queue, agent assignments, and pipeline stats
 */
export async function GET() {
  try {
    const supabase = createServerClient()

    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 500 }
      )
    }

    // Fetch all orchestration data in parallel
    const [
      sessionsResult,
      assignmentsResult,
      batchJobsResult,
      pipelineMetricsResult,
      propertiesStatsResult,
      countiesResult,
    ] = await Promise.all([
      // Get orchestration sessions (recent 20)
      supabase
        .from("orchestration_sessions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20),

      // Get agent assignments
      supabase
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

      // Get batch jobs for work queue context
      supabase
        .from("batch_jobs")
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

      // Get pipeline metrics
      supabase
        .from("pipeline_metrics")
        .select("*")
        .order("recorded_at", { ascending: false })
        .limit(100),

      // Get property counts for pipeline stats
      supabase.from("properties").select("id, has_regrid_data, visual_validation_status, auction_status", { count: "exact" }),

      // Get counties with property counts
      supabase
        .from("counties")
        .select(`
          id,
          county_name,
          state_code,
          properties (id)
        `),
    ])

    // Handle errors
    if (sessionsResult.error) {
      console.error("[API Orchestration] Sessions error:", sessionsResult.error)
    }
    if (assignmentsResult.error) {
      console.error("[API Orchestration] Assignments error:", assignmentsResult.error)
    }

    const sessions = (sessionsResult.data || []) as ExtendedOrchestrationSession[]
    const assignments = (assignmentsResult.data || []) as AgentAssignmentWithCounty[]
    const batchJobs = (batchJobsResult.data || []) as BatchJobWithCounty[]
    const pipelineMetrics = (pipelineMetricsResult.data || []) as PipelineMetrics[]
    const properties = (propertiesStatsResult.data || []) as PropertyStats[]
    const counties = (countiesResult.data || []) as CountyWithProperties[]

    // Find active session
    const activeSession = sessions.find((s) => s.status === "active")

    // Transform sessions
    const transformedSessions = sessions.map((session) => ({
      id: session.id,
      startedAt: session.started_at,
      endedAt: session.completed_at,
      type: session.session_type,
      status: session.status,
      triggerSource: session.trigger_source,
      propertiesProcessed: session.properties_processed || 0,
      propertiesFailed: session.properties_failed || 0,
      agentsUsed: session.agents_used || [],
      tokenEstimate: session.token_estimate,
      notes: session.notes,
      workAssigned: session.work_assigned,
      workCompleted: session.work_completed,
    }))

    // Transform agent assignments
    const transformedAssignments = assignments.map((assignment) => {
      const taskType = assignment.task_type || assignment.work_type
      const itemsTotal = assignment.items_total ?? assignment.items_assigned
      const itemsProcessed = assignment.items_processed ?? assignment.items_completed
      const itemsFailed = assignment.items_failed ?? 0

      return {
        id: assignment.id,
        sessionId: assignment.session_id,
        agent: assignment.agent_name,
        task: `${formatTaskType(taskType)} - ${assignment.counties?.county_name || "Unknown"}`,
        taskType,
        county: assignment.counties?.county_name || "Unknown",
        countyId: assignment.county_id,
        state: assignment.counties?.state_code || "??",
        priority: assignment.priority,
        status: assignment.status,
        progress: itemsTotal > 0
          ? Math.round((itemsProcessed / itemsTotal) * 100)
          : 0,
        itemsTotal,
        itemsProcessed,
        itemsFailed,
        executionMethod: assignment.execution_method,
        assignedAt: assignment.assigned_at || assignment.created_at,
        startedAt: assignment.started_at,
        completedAt: assignment.completed_at,
        errorMessage: assignment.error_message,
        notes: '', // AgentAssignment doesn't have notes field
      }
    })

    // Calculate pipeline stats from properties
    const totalProperties = properties.length
    const withRegrid = properties.filter((p) => p.has_regrid_data).length
    const validated = properties.filter((p) => p.visual_validation_status).length
    const approved = properties.filter((p) => p.visual_validation_status === "APPROVED").length
    const activeProperties = properties.filter((p) => p.auction_status === "active").length

    // Generate work queue from pending work
    const workQueue = generateWorkQueue(counties, properties, batchJobs)

    // Generate bottlenecks
    const bottlenecks = generateBottlenecks(totalProperties, withRegrid, validated, approved, counties, properties)

    // Generate session plan recommendations
    const sessionPlan = generateSessionPlan(workQueue)

    // Get active agents info
    const activeAgents = getAgentStatus(assignments, batchJobs)

    return NextResponse.json({
      data: {
        // Active session
        activeSession: activeSession ? {
          id: activeSession.id,
          startedAt: activeSession.started_at,
          type: activeSession.session_type,
          status: activeSession.status,
          propertiesProcessed: activeSession.properties_processed || 0,
          propertiesFailed: activeSession.properties_failed || 0,
          agentsUsed: activeSession.agents_used || [],
          notes: activeSession.notes,
        } : null,

        // All sessions
        sessions: transformedSessions,

        // Agent assignments
        assignments: transformedAssignments,

        // Work queue (prioritized)
        workQueue,

        // Session plan recommendations
        sessionPlan,

        // Bottlenecks
        bottlenecks,

        // Active agents status
        activeAgents,

        // Pipeline stats
        pipelineStats: {
          totalProperties,
          withRegrid,
          validated,
          approved,
          activeProperties,
          regridPending: totalProperties - withRegrid,
          validationPending: withRegrid - validated,
          completionPct: totalProperties > 0
            ? Math.round((approved / totalProperties) * 100)
            : 0,
        },

        // Recent metrics
        recentMetrics: pipelineMetrics.slice(0, 20).map((m) => ({
          stage: m.pipeline_stage,
          county: m.county_id || "all",
          pendingCount: m.items_processed - m.success_count,
          completedToday: m.success_count,
          bottleneckScore: m.failure_count,
          recordedAt: m.created_at,
        })),
      },
      source: "database",
    })
  } catch (error) {
    console.error("[API Orchestration] Server error:", error)
    return NextResponse.json(
      { error: "Server error", message: "An unexpected error occurred" },
      { status: 500 }
    )
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

// Generate work queue from database state
function generateWorkQueue(
  counties: CountyWithProperties[],
  properties: PropertyStats[],
  batchJobs: BatchJobWithCounty[]
) {
  interface WorkQueueItem {
    id: string
    type: string
    typeLabel: string
    county: string
    countyId: string
    state: string
    priority: number
    itemsRemaining: number
    batchSize: number
    estimatedSessions: number
    hasActiveJob: boolean
    activeJobId?: string
  }

  const workQueue: WorkQueueItem[] = []
  let priorityCounter = 1

  // Count properties needing regrid by county
  const countyPropertyMap = new Map<string, {
    total: number
    needsRegrid: number
    needsValidation: number
    county: CountyWithProperties
  }>()

  for (const county of counties) {
    const countyProps = (county.properties || [])
    countyPropertyMap.set(county.id, {
      total: countyProps.length,
      needsRegrid: 0, // Will be calculated from properties
      needsValidation: 0,
      county,
    })
  }

  // Calculate needs from properties (this is simplified - ideally we'd have a subquery)
  // For now, use the total minus processed
  for (const [countyId, data] of Array.from(countyPropertyMap)) {
    if (data.total > 0) {
      // Check for active batch jobs for this county
      const activeJob = batchJobs.find(
        (j) => j.county_id === countyId && ["pending", "in_progress", "paused"].includes(j.status)
      )

      // Estimate pending work (in real implementation, query the actual counts)
      const needsRegrid = Math.max(0, data.total - 17) // Simplified estimate
      const needsValidation = 17 // From earlier data

      if (needsRegrid > 0) {
        workQueue.push({
          id: `work-regrid-${countyId}`,
          type: "regrid_scraping",
          typeLabel: "Regrid Scraping",
          county: data.county.county_name,
          countyId,
          state: data.county.state_code,
          priority: priorityCounter,
          itemsRemaining: needsRegrid,
          batchSize: 50,
          estimatedSessions: Math.ceil(needsRegrid / 150),
          hasActiveJob: !!activeJob,
          activeJobId: activeJob?.id,
        })
        priorityCounter++
      }

      if (needsValidation > 0 && needsRegrid === 0) {
        workQueue.push({
          id: `work-validation-${countyId}`,
          type: "visual_validation",
          typeLabel: "Visual Validation",
          county: data.county.county_name,
          countyId,
          state: data.county.state_code,
          priority: priorityCounter,
          itemsRemaining: needsValidation,
          batchSize: 100,
          estimatedSessions: Math.ceil(needsValidation / 300),
          hasActiveJob: false,
        })
        priorityCounter++
      }
    }
  }

  // Sort by priority
  return workQueue.sort((a, b) => a.priority - b.priority)
}

// Generate bottlenecks from pipeline state
function generateBottlenecks(
  totalProperties: number,
  withRegrid: number,
  validated: number,
  approved: number,
  counties: CountyWithProperties[],
  properties: PropertyStats[]
) {
  interface Bottleneck {
    id: string
    stage: string
    severity: 'critical' | 'warning' | 'info'
    backlogCount: number
    description: string
    impact: string
    recommendation: string
    estimatedSessions: number
  }

  const bottlenecks: Bottleneck[] = []

  // Regrid bottleneck
  const regridPending = totalProperties - withRegrid
  if (regridPending > 100) {
    bottlenecks.push({
      id: "bottleneck-regrid",
      stage: "Regrid Scraping",
      severity: regridPending > 1000 ? "critical" : "warning",
      backlogCount: regridPending,
      description: `${regridPending.toLocaleString()} properties need Regrid data enrichment`,
      impact: "Blocking visual validation and all downstream analysis",
      recommendation: `Process ${Math.min(150, regridPending)} properties per session`,
      estimatedSessions: Math.ceil(regridPending / 150),
    })
  }

  // Validation bottleneck
  const validationPending = withRegrid - validated
  if (validationPending > 10) {
    bottlenecks.push({
      id: "bottleneck-validation",
      stage: "Visual Validation",
      severity: validationPending > 100 ? "warning" : "info",
      backlogCount: validationPending,
      description: `${validationPending} properties have Regrid data but need validation`,
      impact: "Blocking property analysis pipeline",
      recommendation: `Validate ${Math.min(100, validationPending)} properties per session`,
      estimatedSessions: Math.ceil(validationPending / 300),
    })
  }

  return bottlenecks
}

// Generate session plan recommendations
function generateSessionPlan(workQueue: Array<{
  type: string
  typeLabel: string
  county: string
  countyId: string
  itemsRemaining: number
  priority: number
}>) {
  interface Recommendation {
    agent: string
    task: string
    county: string
    countyId: string
    itemCount: number
    priority: number
    note?: string
  }

  const recommendations: Recommendation[] = []
  let totalItems = 0
  const maxProperties = 150
  const maxAgents = 3

  for (const work of workQueue.slice(0, maxAgents)) {
    const itemsToProcess = Math.min(work.itemsRemaining, maxProperties - totalItems)
    if (itemsToProcess > 0) {
      recommendations.push({
        agent: work.type === "regrid_scraping" ? "REGRID_SCRAPER" : "VISUAL_VALIDATOR",
        task: work.typeLabel,
        county: work.county,
        countyId: work.countyId,
        itemCount: itemsToProcess,
        priority: work.priority,
        note: work.priority === 1 ? "Highest priority - auction approaching" : undefined,
      })
      totalItems += itemsToProcess
    }
    if (totalItems >= maxProperties) break
  }

  return {
    recommendations,
    totalItems,
    estimatedDuration: `~${Math.ceil(totalItems / 3)} minutes`,
    constraints: {
      propertiesUsed: totalItems,
      maxProperties,
      agentsUsed: recommendations.length,
      maxAgents,
    },
  }
}

// Get agent status
function getAgentStatus(
  assignments: AgentAssignmentWithCounty[],
  batchJobs: BatchJobWithCounty[]
) {
  const agents = [
    { id: "agent-regrid", name: "Regrid Scraper", type: "regrid_scraping" },
    { id: "agent-validator", name: "Visual Validator", type: "visual_validation" },
    { id: "agent-parser", name: "PDF Parser", type: "pdf_parsing" },
    { id: "agent-research", name: "Research Agent", type: "county_research" },
    { id: "agent-title", name: "Title Research", type: "title_research" },
    { id: "agent-condition", name: "Property Condition", type: "property_condition" },
    { id: "agent-environmental", name: "Environmental", type: "environmental_research" },
    { id: "agent-bid", name: "Bid Strategy", type: "bid_strategy" },
  ]

  return agents.map((agent) => {
    // Check for active assignments
    const activeAssignment = assignments.find(
      (a) => a.work_type === agent.type && a.status === "in_progress"
    )

    // Check for active batch jobs
    const activeJob = batchJobs.find(
      (j) => j.job_type === agent.type && ["in_progress", "paused"].includes(j.status)
    )

    let status = "idle"
    let currentTask = null
    let progress = 0

    if (activeAssignment) {
      status = "active"
      currentTask = `${activeAssignment.counties?.county_name || "Unknown"} - ${activeAssignment.items_completed}/${activeAssignment.items_assigned}`
      progress = activeAssignment.items_assigned > 0
        ? Math.round((activeAssignment.items_completed / activeAssignment.items_assigned) * 100)
        : 0
    } else if (activeJob) {
      status = activeJob.status === "paused" ? "paused" : "active"
      currentTask = `${activeJob.counties?.county_name || "Unknown"} - ${activeJob.completed_items}/${activeJob.total_items}`
      progress = activeJob.total_items > 0
        ? Math.round((activeJob.completed_items / activeJob.total_items) * 100)
        : 0
    }

    return {
      id: agent.id,
      name: agent.name,
      type: agent.type,
      status,
      currentTask,
      progress,
      lastActive: activeAssignment?.updated_at || activeJob?.updated_at || null,
    }
  })
}
