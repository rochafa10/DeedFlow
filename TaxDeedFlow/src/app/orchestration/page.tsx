"use client"

import { useState } from "react"
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
} from "lucide-react"
import { Header } from "@/components/layout/Header"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

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

// Mock session data - will be updated dynamically
const INITIAL_SESSIONS = [
  {
    id: "session-001",
    startedAt: "2026-01-09T08:30:00Z",
    endedAt: "2026-01-09T10:45:00Z",
    status: "completed",
    type: "full_pipeline",
    agentsUsed: 4,
    propertiesProcessed: 156,
    errors: 0,
    notes: "",
  },
  {
    id: "session-002",
    startedAt: "2026-01-08T14:00:00Z",
    endedAt: "2026-01-08T16:30:00Z",
    status: "completed",
    type: "regrid_scraping",
    agentsUsed: 2,
    propertiesProcessed: 89,
    errors: 2,
    notes: "",
  },
  {
    id: "session-003",
    startedAt: "2026-01-07T09:00:00Z",
    endedAt: null,
    status: "failed",
    type: "visual_validation",
    agentsUsed: 1,
    propertiesProcessed: 45,
    errors: 5,
    notes: "",
  },
]

// Mock work queue
const MOCK_WORK_QUEUE = [
  {
    id: "work-001",
    type: "regrid_scraping",
    county: "Somerset",
    priority: 1,
    itemsRemaining: 2400,
    estimatedTime: "4 hours",
  },
  {
    id: "work-002",
    type: "visual_validation",
    county: "Westmoreland",
    priority: 2,
    itemsRemaining: 150,
    estimatedTime: "45 min",
  },
  {
    id: "work-003",
    type: "pdf_parsing",
    county: "Blair",
    priority: 3,
    itemsRemaining: 12,
    estimatedTime: "30 min",
  },
  {
    id: "work-004",
    type: "regrid_scraping",
    county: "Philadelphia",
    priority: 4,
    itemsRemaining: 4200,
    estimatedTime: "7 hours",
  },
]

// Mock active agents
const MOCK_ACTIVE_AGENTS = [
  {
    id: "agent-001",
    name: "Regrid Scraper",
    status: "idle",
    lastActive: "2026-01-09T10:45:00Z",
    propertiesProcessed: 156,
  },
  {
    id: "agent-002",
    name: "Visual Validator",
    status: "idle",
    lastActive: "2026-01-09T10:30:00Z",
    propertiesProcessed: 89,
  },
  {
    id: "agent-003",
    name: "Parser Agent",
    status: "idle",
    lastActive: "2026-01-08T16:00:00Z",
    propertiesProcessed: 252,
  },
]

// Mock agent assignments
const MOCK_AGENT_ASSIGNMENTS = [
  { id: 1, agent: "Regrid Scraper", task: "Regrid Scraping - Somerset", status: "running", progress: 45, processed: 1080, total: 2400 },
  { id: 2, agent: "Visual Validator", task: "Visual Validation - Westmoreland", status: "queued", progress: 0, processed: 0, total: 150 },
  { id: 3, agent: "Parser Agent", task: "PDF Parsing - Blair", status: "idle", progress: 0, processed: 0, total: 12 },
]

// Mock AI session plan
const SESSION_PLAN = {
  recommendations: [
    { id: 1, task: "Regrid Scraping", county: "Somerset", priority: "High", items: 2400, estimatedTime: "4 hours", reason: "Highest priority backlog" },
    { id: 2, task: "Visual Validation", county: "Westmoreland", priority: "Medium", items: 150, estimatedTime: "45 min", reason: "Properties awaiting validation" },
    { id: 3, task: "PDF Parsing", county: "Blair", priority: "Medium", items: 12, estimatedTime: "30 min", reason: "New documents available" },
  ],
  totalItems: 2562,
  estimatedDuration: "~5 hours",
}

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
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()
  const [isSessionActive, setIsSessionActive] = useState(false)
  const [activeSession, setActiveSession] = useState<Session | null>(null)
  const [sessions, setSessions] = useState<Session[]>(INITIAL_SESSIONS)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [selectedType, setSelectedType] = useState("full_pipeline")
  const [sessionNotes, setSessionNotes] = useState("")

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

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
    if (activeSession) {
      const updatedSessions = sessions.map((session) =>
        session.id === activeSession.id
          ? {
              ...session,
              status: "completed",
              endedAt: new Date().toISOString(),
            }
          : session
      )
      setSessions(updatedSessions)
    }
    setActiveSession(null)
    setIsSessionActive(false)
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
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Pause className="h-4 w-4" />
                Stop Session
              </button>
            ) : (
              <button
                onClick={handleOpenDialog}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
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
                  {MOCK_AGENT_ASSIGNMENTS.map((assignment) => {
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
                                    assignment.status === "running"
                                      ? "bg-green-500"
                                      : assignment.status === "queued"
                                      ? "bg-amber-500"
                                      : "bg-slate-400"
                                  )}
                                  style={{ width: `${assignment.progress}%` }}
                                />
                              </div>
                            </div>
                            <span className="text-sm text-slate-600 whitespace-nowrap">
                              {assignment.processed.toLocaleString()}/{assignment.total.toLocaleString()} items
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
              {MOCK_WORK_QUEUE.reduce((sum, w) => sum + w.itemsRemaining, 0).toLocaleString()}
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
                      Agent
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Task
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      County
                    </th>
                    <th className="px-4 py-2 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Pending
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {MOCK_WORK_QUEUE.map((item) => {
                    const typeLabel = WORK_TYPE_LABELS[item.type] || item.type
                    const agentName = typeLabel.split(" ")[0]
                    return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-600">
                            {item.priority}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-slate-900">
                          {agentName}
                        </td>
                        <td className="px-4 py-2 text-sm text-slate-700">
                          {typeLabel}
                        </td>
                        <td className="px-4 py-2 text-sm text-slate-700">
                          {item.county}
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
              {MOCK_ACTIVE_AGENTS.map((agent) => (
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
                          Last active:{" "}
                          {new Date(agent.lastActive).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-slate-500">
                        {agent.propertiesProcessed} processed
                      </div>
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
            </div>
          </div>
          <div className="divide-y divide-slate-100">
            {SESSION_PLAN.recommendations.map((rec) => (
              <div
                key={rec.id}
                className="px-4 py-3 hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-purple-100 text-purple-700 font-semibold text-sm">
                      {rec.id}
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
                            rec.priority === "High"
                              ? "bg-red-100 text-red-700"
                              : rec.priority === "Medium"
                              ? "bg-amber-100 text-amber-700"
                              : "bg-green-100 text-green-700"
                          )}
                        >
                          {rec.priority}
                        </span>
                      </div>
                      <div className="text-sm text-slate-500 mt-0.5">
                        {rec.reason}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium text-slate-900">
                      {rec.items.toLocaleString()} items
                    </div>
                    <div className="text-xs text-slate-500">
                      Est. {rec.estimatedTime}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm text-slate-600">
                <span>
                  <span className="font-medium text-slate-900">
                    {SESSION_PLAN.totalItems.toLocaleString()}
                  </span>{" "}
                  total items
                </span>
                <span className="text-slate-300">|</span>
                <span>
                  <span className="font-medium text-slate-900">
                    {SESSION_PLAN.estimatedDuration}
                  </span>{" "}
                  estimated
                </span>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors">
                <Play className="h-4 w-4" />
                Execute Plan
              </button>
            </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={handleCloseDialog}
          />

          {/* Dialog */}
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
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
            <div className="px-6 py-4">
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
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-lg">
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
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}
