"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Play,
  Pause,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Activity,
  Layers,
  Bot,
  Calendar,
  TrendingUp,
  History,
  ChevronRight,
  XCircle,
  X,
  Sparkles,
  Users,
  Zap,
  ArrowRight,
  Workflow,
  Loader2,
} from "lucide-react"
import { Header } from "@/components/layout/Header"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { authFetch } from "@/lib/api/authFetch"

// Session types
const SESSION_TYPES = [
  { value: "full_pipeline", label: "Full Pipeline", description: "Run all agents in sequence" },
  { value: "regrid_scraping", label: "Regrid Scraping", description: "Scrape property data from Regrid" },
  { value: "visual_validation", label: "Visual Validation", description: "Validate property images" },
  { value: "pdf_parsing", label: "PDF Parsing", description: "Parse property list PDFs" },
  { value: "title_research", label: "Title Research", description: "Research property titles and liens" },
  { value: "environmental_research", label: "Environmental Research", description: "Check environmental risks" },
  { value: "bid_strategy", label: "Bid Strategy", description: "Calculate optimal bid amounts" },
]

// Interfaces for API data
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
  daysUntilAuction?: number
  urgency?: string
}

interface ActiveAgent {
  id: string
  name: string
  type: string
  status: string
  currentTask: string | null
  progress: number
  lastActive: string | null
}

interface AgentAssignment {
  id: string
  sessionId: string
  agent: string
  task: string
  taskType: string
  county: string
  countyId: string
  state: string
  priority: number
  status: string
  progress: number
  itemsTotal: number
  itemsProcessed: number
  itemsFailed: number
  executionMethod: string
  assignedAt: string
  startedAt: string | null
  completedAt: string | null
  errorMessage: string | null
  notes: string | null
}

interface SessionPlan {
  recommendations: Array<{
    agent: string
    task: string
    county: string
    countyId: string
    itemCount: number
    priority: number
    note?: string
  }>
  totalItems: number
  estimatedDuration: string
  constraints: {
    propertiesUsed: number
    maxProperties: number
    agentsUsed: number
    maxAgents: number
  }
}

interface Bottleneck {
  id: string
  stage: string
  severity: string
  backlogCount: number
  description: string
  impact: string
  recommendation: string
  estimatedSessions: number
}

interface PipelineStats {
  totalProperties: number
  withRegrid: number
  validated: number
  approved: number
  activeProperties: number
  regridPending: number
  validationPending: number
  completionPct: number
}

const URGENCY_CONFIG: Record<string, { label: string; color: string }> = {
  critical: { label: "CRITICAL", color: "bg-red-100 text-red-700" },
  high: { label: "HIGH", color: "bg-amber-100 text-amber-700" },
  medium: { label: "MEDIUM", color: "bg-blue-100 text-blue-700" },
  low: { label: "LOW", color: "bg-slate-100 text-slate-600" },
}

// Session plan constraints
const SESSION_LIMITS = {
  maxProperties: 150,
  maxAgents: 3,
}

type BottleneckSeverity = "critical" | "warning" | "info"

const BOTTLENECK_SEVERITY_CONFIG: Record<BottleneckSeverity, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  critical: {
    label: "Critical",
    color: "text-red-700",
    bgColor: "bg-red-50 border-red-200",
    icon: <AlertTriangle className="h-5 w-5 text-red-600" />,
  },
  warning: {
    label: "Warning",
    color: "text-amber-700",
    bgColor: "bg-amber-50 border-amber-200",
    icon: <AlertTriangle className="h-5 w-5 text-amber-600" />,
  },
  info: {
    label: "Info",
    color: "text-blue-700",
    bgColor: "bg-blue-50 border-blue-200",
    icon: <Zap className="h-5 w-5 text-blue-600" />,
  },
}

// Static n8n workflows (these are config, not data from API)
const N8N_WORKFLOWS = [
  {
    id: "TDF-001",
    name: "Data Integrity Check",
    description: "Run audit, check for missing data, and generate work queues",
    webhookPath: "data-integrity",
  },
  {
    id: "TDF-002",
    name: "Daily Pipeline Review",
    description: "Morning summary of pipeline status and priorities",
    webhookPath: "daily-review",
  },
  {
    id: "TDF-003",
    name: "Regrid Batch Scraper",
    description: "Automated property data scraping from Regrid",
    webhookPath: "regrid-scraper",
  },
  {
    id: "TDF-004",
    name: "PDF Parser",
    description: "Parse property list PDFs and extract data",
    webhookPath: "pdf-parser",
  },
]

type SessionStatus = "active" | "completed" | "failed" | "paused"

interface Session {
  id: string
  startedAt: string
  endedAt: string | null
  status: string
  type: string
  agentsUsed: number
  propertiesProcessed: number
  errors: number
  notes: string
}

// API response types
interface ApiSession {
  id: string
  startedAt: string
  endedAt: string | null
  status: string
  type?: string
  agentsUsed?: string[]
  propertiesProcessed?: number
  propertiesFailed?: number
  notes?: string
}

const SESSION_STATUS_CONFIG: Record<
  SessionStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  active: {
    label: "Active",
    color: "bg-green-100 text-green-700",
    icon: <Activity className="h-3 w-3" />,
  },
  completed: {
    label: "Completed",
    color: "bg-blue-100 text-blue-700",
    icon: <CheckCircle2 className="h-3 w-3" />,
  },
  failed: {
    label: "Failed",
    color: "bg-red-100 text-red-700",
    icon: <XCircle className="h-3 w-3" />,
  },
  paused: {
    label: "Paused",
    color: "bg-amber-100 text-amber-700",
    icon: <Pause className="h-3 w-3" />,
  },
}

const WORK_TYPE_LABELS: Record<string, string> = {
  full_pipeline: "Full Pipeline",
  regrid_scraping: "Regrid Scraping",
  visual_validation: "Visual Validation",
  pdf_parsing: "PDF Parsing",
  title_research: "Title Research",
  environmental_research: "Environmental Research",
  bid_strategy: "Bid Strategy",
}

const ASSIGNMENT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  running: { label: "Running", color: "bg-green-100 text-green-700" },
  queued: { label: "Queued", color: "bg-amber-100 text-amber-700" },
  idle: { label: "Idle", color: "bg-slate-100 text-slate-600" },
}

export default function OrchestrationPage() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth()
  const router = useRouter()
  const [isSessionActive, setIsSessionActive] = useState(false)

  // Check if user can execute (admin or analyst only)
  const canExecute = user?.role === "admin" || user?.role === "analyst"
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedType, setSelectedType] = useState("full_pipeline")
  const [sessionNotes, setSessionNotes] = useState("")

  // End Session dialog state
  const [isEndDialogOpen, setIsEndDialogOpen] = useState(false)
  const [endSessionStatus, setEndSessionStatus] = useState("completed")
  const [endSessionNotes, setEndSessionNotes] = useState("")

  // n8n workflow state
  const [triggeringWorkflow, setTriggeringWorkflow] = useState<string | null>(null)
  const [workflowFeedback, setWorkflowFeedback] = useState<{ id: string; success: boolean; message: string } | null>(null)

  // API data state
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [workQueue, setWorkQueue] = useState<WorkQueueItem[]>([])
  const [activeAgents, setActiveAgents] = useState<ActiveAgent[]>([])
  const [assignments, setAssignments] = useState<AgentAssignment[]>([])
  const [sessionPlan, setSessionPlan] = useState<SessionPlan | null>(null)
  const [bottlenecks, setBottlenecks] = useState<Bottleneck[]>([])
  const [pipelineStats, setPipelineStats] = useState<PipelineStats | null>(null)

  // Fetch orchestration data from API
  const fetchOrchestrationData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await authFetch("/api/orchestration")
      if (!response.ok) {
        throw new Error("Failed to fetch orchestration data")
      }

      const result = await response.json()
      const data = result.data

      // Update state from API response
      if (data.activeSession) {
        setActiveSession({
          id: data.activeSession.id,
          startedAt: data.activeSession.startedAt,
          endedAt: null,
          status: data.activeSession.status,
          type: data.activeSession.type || "full_pipeline",
          agentsUsed: data.activeSession.agentsUsed?.length || 0,
          propertiesProcessed: data.activeSession.propertiesProcessed || 0,
          errors: data.activeSession.propertiesFailed || 0,
          notes: data.activeSession.notes || "",
        })
        setIsSessionActive(true)
      }

      // Transform sessions from API
      const transformedSessions = (data.sessions || []).map((s: ApiSession) => ({
        id: s.id,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        status: s.status,
        type: s.type || "full_pipeline",
        agentsUsed: s.agentsUsed?.length || 0,
        propertiesProcessed: s.propertiesProcessed || 0,
        errors: s.propertiesFailed || 0,
        notes: s.notes || "",
      }))
      setSessions(transformedSessions)

      // Set other state from API
      setWorkQueue(data.workQueue || [])
      setActiveAgents(data.activeAgents || [])
      setAssignments(data.assignments || [])
      setSessionPlan(data.sessionPlan || null)
      setBottlenecks(data.bottlenecks || [])
      setPipelineStats(data.pipelineStats || null)

    } catch (err) {
      console.error("Error fetching orchestration data:", err)
      setError(err instanceof Error ? err.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  // Fetch data on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetchOrchestrationData()
    }
  }, [isAuthenticated, fetchOrchestrationData])

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    )
  }

  // Don't render content if not authenticated
  if (!isAuthenticated) {
    return null
  }

  const handleOpenDialog = () => {
    setSelectedType("full_pipeline")
    setSessionNotes("")
    setIsDialogOpen(true)
  }

  const handleCloseDialog = () => {
    setIsDialogOpen(false)
    setSelectedType("full_pipeline")
    setSessionNotes("")
  }

  const handleStartSession = () => {
    const newSession: Session = {
      id: `session-${String(sessions.length + 1).padStart(3, "0")}`,
      startedAt: new Date().toISOString(),
      endedAt: null,
      status: "active",
      type: selectedType,
      agentsUsed: 0,
      propertiesProcessed: 0,
      errors: 0,
      notes: sessionNotes,
    }

    setSessions([newSession, ...sessions])
    setActiveSession(newSession)
    setIsSessionActive(true)
    handleCloseDialog()
  }

  const handleStopSession = () => {
    setEndSessionStatus("completed")
    setEndSessionNotes("")
    setIsEndDialogOpen(true)
  }

  const handleCloseEndDialog = () => {
    setIsEndDialogOpen(false)
    setEndSessionStatus("completed")
    setEndSessionNotes("")
  }

  const handleConfirmEndSession = () => {
    if (activeSession) {
      const updatedSessions = sessions.map((session) =>
        session.id === activeSession.id
          ? {
              ...session,
              status: endSessionStatus,
              endedAt: new Date().toISOString(),
              notes: endSessionNotes || session.notes,
            }
          : session
      )
      setSessions(updatedSessions)
    }
    setActiveSession(null)
    setIsSessionActive(false)
    handleCloseEndDialog()
  }

  // Trigger n8n workflow
  const handleTriggerWorkflow = (workflowId: string, workflowName: string) => {
    setTriggeringWorkflow(workflowId)
    setWorkflowFeedback(null)

    // Simulate workflow trigger with delay
    setTimeout(() => {
      // Simulate success/failure (randomly fail for PDF Parser to show error state)
      const success = workflowId !== "TDF-004"
      setTriggeringWorkflow(null)
      setWorkflowFeedback({
        id: workflowId,
        success,
        message: success
          ? `Workflow "${workflowName}" triggered successfully!`
          : `Failed to trigger "${workflowName}". Check n8n dashboard for details.`,
      })

      // Clear feedback after 5 seconds
      setTimeout(() => setWorkflowFeedback(null), 5000)
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Title and Actions */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Orchestration Console
            </h1>
            <p className="text-slate-600 mt-1">
              Manage agent sessions and monitor pipeline progress
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isSessionActive ? (
              <button
                onClick={handleStopSession}
                disabled={!canExecute}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
                  canExecute
                    ? "bg-red-600 text-white hover:bg-red-700"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                )}
                title={!canExecute ? "Viewers cannot stop sessions" : undefined}
              >
                <Pause className="h-4 w-4" />
                Stop Session
              </button>
            ) : (
              <button
                onClick={handleOpenDialog}
                disabled={!canExecute}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
                  canExecute
                    ? "bg-primary text-white hover:bg-primary/90"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                )}
                title={!canExecute ? "Viewers cannot start sessions" : undefined}
              >
                <Play className="h-4 w-4" />
                Start Session
              </button>
            )}
          </div>
        </div>

        {/* Session Status Banner */}
        {isSessionActive && activeSession && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 bg-green-500 rounded-full animate-pulse" />
                <div>
                  <div className="font-semibold text-green-800">
                    Session Active - {WORK_TYPE_LABELS[activeSession.type] || activeSession.type}
                  </div>
                  <div className="text-sm text-green-600">
                    Started at {new Date(activeSession.startedAt).toLocaleTimeString()}
                    {activeSession.notes && (
                      <span className="ml-2 text-green-500">| {activeSession.notes}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-green-700">
                <div className="flex items-center gap-1">
                  <Bot className="h-4 w-4" />
                  <span>3 agents ready</span>
                </div>
                <div className="flex items-center gap-1">
                  <Layers className="h-4 w-4" />
                  <span>6,762 items in queue</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Agent Assignments Table - Only shown when session is active */}
        {activeSession && (
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden mb-6">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Agent Assignments
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Agent
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Task
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Progress
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {assignments.map((assignment) => {
                    const statusConfig = ASSIGNMENT_STATUS_CONFIG[assignment.status] || ASSIGNMENT_STATUS_CONFIG.idle
                    return (
                      <tr key={assignment.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3 text-sm font-medium text-slate-900">
                          {assignment.agent}
                        </td>
                        <td className="px-4 py-3 text-sm text-slate-700">
                          {assignment.task}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center px-2 py-1 rounded-full text-xs font-medium",
                              statusConfig.color
                            )}
                          >
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 min-w-[100px]">
                              <div className="w-full bg-slate-200 rounded-full h-2">
                                <div
                                  className={cn(
                                    "h-2 rounded-full transition-all",
                                    assignment.status === "in_progress"
                                      ? "bg-green-500"
                                      : assignment.status === "pending"
                                      ? "bg-amber-500"
                                      : "bg-slate-400"
                                  )}
                                  style={{ width: `${assignment.progress}%` }}
                                />
                              </div>
                            </div>
                            <span className="text-sm text-slate-600 whitespace-nowrap">
                              {assignment.itemsProcessed.toLocaleString()}/{assignment.itemsTotal.toLocaleString()} items
                            </span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
              <Activity className="h-4 w-4" />
              Active Agents
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {isSessionActive ? 3 : 0}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
              <Layers className="h-4 w-4" />
              Queue Size
            </div>
            <div className="text-2xl font-bold text-slate-900">
              {workQueue.reduce((sum, w) => sum + w.itemsRemaining, 0).toLocaleString()}
            </div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
              <TrendingUp className="h-4 w-4" />
              Processed Today
            </div>
            <div className="text-2xl font-bold text-green-600">156</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-slate-500 text-sm mb-1">
              <AlertTriangle className="h-4 w-4" />
              Errors Today
            </div>
            <div className="text-2xl font-bold text-red-600">0</div>
          </div>
        </div>

        {/* Bottleneck Detection Section */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-red-50 to-amber-50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Zap className="h-4 w-4 text-amber-600" />
                  Bottleneck Detection
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Pipeline stages with backlogs requiring attention
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Last checked: Just now</span>
                <button className="text-sm text-primary hover:underline flex items-center gap-1">
                  <RefreshCw className="h-3 w-3" />
                  Refresh
                </button>
              </div>
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {bottlenecks.map((bottleneck) => {
              const severityConfig = BOTTLENECK_SEVERITY_CONFIG[bottleneck.severity as BottleneckSeverity]
              return (
                <div
                  key={bottleneck.id}
                  className={cn(
                    "px-4 py-4 border-l-4",
                    severityConfig.bgColor
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      {severityConfig.icon}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-slate-900">
                            {bottleneck.stage}
                          </span>
                          <span
                            className={cn(
                              "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                              bottleneck.severity === "critical"
                                ? "bg-red-100 text-red-700"
                                : bottleneck.severity === "warning"
                                ? "bg-amber-100 text-amber-700"
                                : "bg-blue-100 text-blue-700"
                            )}
                          >
                            {severityConfig.label}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-2">
                          <div>
                            <span className="text-slate-500">Backlog:</span>{" "}
                            <span className="font-medium text-slate-900">
                              {bottleneck.backlogCount.toLocaleString()} items
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Est. Sessions:</span>{" "}
                            <span className="font-medium text-slate-900">
                              {bottleneck.estimatedSessions}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500">Impact:</span>{" "}
                            <span className="font-medium text-slate-900">
                              {bottleneck.impact}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-start gap-2 p-2 bg-white/50 rounded border border-slate-200">
                          <ArrowRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-slate-700">
                            <span className="font-medium">Recommendation:</span> {bottleneck.recommendation}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
          {bottlenecks.length === 0 && (
            <div className="px-4 py-8 text-center text-slate-500">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500" />
              <p className="font-medium text-slate-900">No bottlenecks detected</p>
              <p className="text-sm">All pipeline stages are operating within normal parameters</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Work Queue Panel */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Layers className="h-4 w-4" />
                  Work Queue
                </h2>
                <button className="text-sm text-primary hover:underline flex items-center gap-1">
                  <RefreshCw className="h-3 w-3" />
                  Refresh
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Task
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      County
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Auction
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Urgency
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Pending
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {workQueue.map((item) => {
                    const typeLabel = item.typeLabel || WORK_TYPE_LABELS[item.type] || item.type
                    const urgencyConfig = URGENCY_CONFIG[item.urgency || "low"] || URGENCY_CONFIG.low
                    return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                            {item.priority}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-slate-900">
                          {typeLabel}
                        </td>
                        <td className="px-4 py-2 text-sm text-slate-700">
                          {item.county}
                        </td>
                        <td className="px-4 py-2">
                          {item.daysUntilAuction ? (
                            <span className={cn(
                              "text-sm",
                              item.daysUntilAuction <= 14 ? "text-red-600 font-medium" :
                              item.daysUntilAuction <= 60 ? "text-amber-600" :
                              "text-slate-600"
                            )}>
                              {item.daysUntilAuction} days
                            </span>
                          ) : (
                            <span className="text-sm text-slate-400">-</span>
                          )}
                        </td>
                        <td className="px-4 py-2">
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                            urgencyConfig.color
                          )}>
                            {urgencyConfig.label}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm font-medium text-slate-900 text-right">
                          {item.itemsRemaining.toLocaleString()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Active Agents Panel */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <Bot className="h-4 w-4" />
                Available Agents
              </h2>
            </div>
            <div className="divide-y divide-slate-100">
              {activeAgents.map((agent) => (
                <div
                  key={agent.id}
                  className="px-4 py-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "h-2 w-2 rounded-full",
                          agent.status === "active"
                            ? "bg-green-500"
                            : agent.status === "idle"
                            ? "bg-slate-300"
                            : "bg-amber-500"
                        )}
                      />
                      <div>
                        <div className="font-medium text-slate-900">
                          {agent.name}
                        </div>
                        <div className="text-xs text-slate-500">
                          {agent.currentTask ? (
                            <span>Working on: {agent.currentTask}</span>
                          ) : agent.lastActive ? (
                            <span>Last active: {new Date(agent.lastActive).toLocaleString()}</span>
                          ) : (
                            <span>Ready</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {agent.progress > 0 && (
                        <div className="text-sm text-slate-500">
                          {agent.progress}% complete
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* AI Session Plan */}
        <div className="mt-6 bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-purple-50 to-indigo-50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  AI Session Plan
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Recommended work based on priority and resource availability
                </p>
              </div>
              {/* Session Constraints */}
              {sessionPlan && (
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs text-slate-500">Properties</div>
                    <div className="text-sm font-medium">
                      <span className={sessionPlan.constraints.propertiesUsed <= sessionPlan.constraints.maxProperties ? "text-green-600" : "text-red-600"}>
                        {sessionPlan.constraints.propertiesUsed}
                      </span>
                      <span className="text-slate-400">/{sessionPlan.constraints.maxProperties} max</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500">Agents</div>
                    <div className="text-sm font-medium">
                      <span className={sessionPlan.constraints.agentsUsed <= sessionPlan.constraints.maxAgents ? "text-green-600" : "text-red-600"}>
                        {sessionPlan.constraints.agentsUsed}
                      </span>
                      <span className="text-slate-400">/{sessionPlan.constraints.maxAgents} max</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {sessionPlan?.recommendations.map((rec, index) => (
              <div
                key={`${rec.agent}-${rec.county}-${index}`}
                className="px-4 py-3 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-purple-100 text-purple-700 font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-900">
                          {rec.task}
                        </span>
                        <span className="text-slate-400">-</span>
                        <span className="text-slate-700">{rec.county}</span>
                        <span
                          className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                            rec.priority === 1
                              ? "bg-red-100 text-red-700"
                              : rec.priority <= 3
                              ? "bg-amber-100 text-amber-700"
                              : "bg-green-100 text-green-700"
                          )}
                        >
                          P{rec.priority}
                        </span>
                      </div>
                      {rec.note && (
                        <div className="text-sm text-slate-500 mt-0.5">
                          {rec.note}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-slate-900">
                      {rec.itemCount.toLocaleString()} items
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {(!sessionPlan || sessionPlan.recommendations.length === 0) && (
              <div className="px-4 py-8 text-center text-slate-500">
                <Sparkles className="h-8 w-8 mx-auto mb-2 text-purple-400" />
                <p className="font-medium text-slate-900">No recommendations available</p>
                <p className="text-sm">Check the work queue for pending tasks</p>
              </div>
            )}
          </div>
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <span>
                  <span className="font-medium text-slate-900">
                    {sessionPlan?.totalItems.toLocaleString() || 0}
                  </span>{" "}
                  total items
                </span>
                <span className="text-slate-300">|</span>
                <span>
                  <span className="font-medium text-slate-900">
                    {sessionPlan?.estimatedDuration || "N/A"}
                  </span>{" "}
                  estimated
                </span>
              </div>
              <button
                disabled={!canExecute}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                  canExecute
                    ? "bg-purple-600 text-white hover:bg-purple-700"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                )}
                title={!canExecute ? "Viewers cannot execute plans" : undefined}
              >
                <Play className="h-4 w-4" />
                Execute Plan
              </button>
            </div>
          </div>
        </div>

        {/* n8n Workflows Section */}
        <div className="mt-6 bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-orange-50 to-amber-50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                  <Workflow className="h-4 w-4 text-orange-600" />
                  n8n Workflows
                </h2>
                <p className="text-sm text-slate-500 mt-0.5">
                  Automated workflows for routine tasks
                </p>
              </div>
              <a
                href="https://n8n.lfb-investments.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline"
              >
                Open n8n Dashboard →
              </a>
            </div>
          </div>
          {/* Workflow Feedback */}
          {workflowFeedback && (
            <div
              className={cn(
                "px-4 py-3 flex items-center gap-2 border-b",
                workflowFeedback.success
                  ? "bg-green-50 border-green-200 text-green-700"
                  : "bg-red-50 border-red-200 text-red-700"
              )}
            >
              {workflowFeedback.success ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <span className="text-sm">{workflowFeedback.message}</span>
            </div>
          )}
          <div className="divide-y divide-slate-100">
            {N8N_WORKFLOWS.map((workflow) => (
              <div
                key={workflow.id}
                className="px-4 py-3 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-slate-400" />
                    <div>
                      <div className="font-medium text-slate-900">
                        {workflow.name}
                      </div>
                      <div className="text-sm text-slate-500">
                        {workflow.description}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">
                        Webhook: /{workflow.webhookPath}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleTriggerWorkflow(workflow.id, workflow.name)}
                    disabled={triggeringWorkflow === workflow.id || !canExecute}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                      !canExecute
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                        : triggeringWorkflow === workflow.id
                        ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                        : "bg-orange-100 text-orange-700 hover:bg-orange-200"
                    )}
                    title={!canExecute ? "Viewers cannot trigger workflows" : undefined}
                  >
                    {triggeringWorkflow === workflow.id ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Triggering...
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5" />
                        Trigger
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Session History */}
        <div className="mt-6 bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <History className="h-4 w-4" />
              Session History
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Session ID
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Started
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Processed
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Errors
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sessions.map((session) => {
                  const statusConfig =
                    SESSION_STATUS_CONFIG[session.status as SessionStatus]
                  const duration = session.endedAt
                    ? Math.round(
                        (new Date(session.endedAt).getTime() -
                          new Date(session.startedAt).getTime()) /
                          (1000 * 60)
                      )
                    : null

                  return (
                    <tr key={session.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3">
                        <span className="font-mono text-sm text-slate-900">
                          {session.id}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-700">
                          {WORK_TYPE_LABELS[session.type] || session.type}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium",
                            statusConfig.color
                          )}
                        >
                          {statusConfig.icon}
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-700">
                          {new Date(session.startedAt).toLocaleString()}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-slate-700">
                          {duration !== null ? `${duration} min` : "-"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-slate-900">
                          {session.propertiesProcessed}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "text-sm font-medium",
                            session.errors > 0 ? "text-red-600" : "text-green-600"
                          )}
                        >
                          {session.errors}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Start Session Dialog */}
      {isDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={handleCloseDialog}
          />

          {/* Dialog */}
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
              <h2 className="text-lg font-semibold text-slate-900">
                Start New Session
              </h2>
              <button
                onClick={handleCloseDialog}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-4 overflow-y-auto flex-1">
              {/* Session Type Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Session Type
                </label>
                <div className="space-y-2">
                  {SESSION_TYPES.map((type) => (
                    <label
                      key={type.value}
                      className={cn(
                        "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                        selectedType === type.value
                          ? "border-primary bg-primary/5"
                          : "border-slate-200 hover:border-slate-300"
                      )}
                    >
                      <input
                        type="radio"
                        name="sessionType"
                        value={type.value}
                        checked={selectedType === type.value}
                        onChange={(e) => setSelectedType(e.target.value)}
                        className="mt-0.5 h-4 w-4 text-primary focus:ring-primary"
                      />
                      <div>
                        <div className="font-medium text-slate-900">
                          {type.label}
                        </div>
                        <div className="text-sm text-slate-500">
                          {type.description}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label
                  htmlFor="sessionNotes"
                  className="block text-sm font-medium text-slate-700 mb-2"
                >
                  Notes (optional)
                </label>
                <textarea
                  id="sessionNotes"
                  rows={3}
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  placeholder="Add any notes about this session..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-lg flex-shrink-0">
              <button
                onClick={handleCloseDialog}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleStartSession}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Play className="h-4 w-4" />
                Start
              </button>
            </div>
          </div>
        </div>
      )}

      {/* End Session Dialog */}
      {isEndDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={handleCloseEndDialog}
          />

          {/* Dialog */}
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-900">
                End Session
              </h2>
              <button
                onClick={handleCloseEndDialog}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-4">
              {/* Completion Status Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-3">
                  Completion Status
                </label>
                <div className="space-y-2">
                  <label
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                      endSessionStatus === "completed"
                        ? "border-primary bg-primary/5"
                        : "border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <input
                      type="radio"
                      name="endSessionStatus"
                      value="completed"
                      checked={endSessionStatus === "completed"}
                      onChange={(e) => setEndSessionStatus(e.target.value)}
                      className="mt-0.5 h-4 w-4 text-primary focus:ring-primary"
                    />
                    <div>
                      <div className="font-medium text-slate-900">Completed</div>
                      <div className="text-sm text-slate-500">
                        Session completed successfully
                      </div>
                    </div>
                  </label>
                  <label
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                      endSessionStatus === "paused"
                        ? "border-primary bg-primary/5"
                        : "border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <input
                      type="radio"
                      name="endSessionStatus"
                      value="paused"
                      checked={endSessionStatus === "paused"}
                      onChange={(e) => setEndSessionStatus(e.target.value)}
                      className="mt-0.5 h-4 w-4 text-primary focus:ring-primary"
                    />
                    <div>
                      <div className="font-medium text-slate-900">Paused</div>
                      <div className="text-sm text-slate-500">
                        Session paused for later resumption
                      </div>
                    </div>
                  </label>
                  <label
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
                      endSessionStatus === "failed"
                        ? "border-primary bg-primary/5"
                        : "border-slate-200 hover:border-slate-300"
                    )}
                  >
                    <input
                      type="radio"
                      name="endSessionStatus"
                      value="failed"
                      checked={endSessionStatus === "failed"}
                      onChange={(e) => setEndSessionStatus(e.target.value)}
                      className="mt-0.5 h-4 w-4 text-primary focus:ring-primary"
                    />
                    <div>
                      <div className="font-medium text-slate-900">Failed</div>
                      <div className="text-sm text-slate-500">
                        Session encountered errors
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label
                  htmlFor="endSessionNotes"
                  className="block text-sm font-medium text-slate-700 mb-2"
                >
                  Notes (optional)
                </label>
                <textarea
                  id="endSessionNotes"
                  rows={3}
                  value={endSessionNotes}
                  onChange={(e) => setEndSessionNotes(e.target.value)}
                  placeholder="Add any notes about this session..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary resize-none"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-lg">
              <button
                onClick={handleCloseEndDialog}
                className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmEndSession}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors"
              >
                <Pause className="h-4 w-4" />
                End Session
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}
