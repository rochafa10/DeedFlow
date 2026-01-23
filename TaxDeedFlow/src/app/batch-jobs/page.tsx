"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Play,
  Pause,
  RotateCcw,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  Filter,
  MoreHorizontal,
  Layers,
  Activity,
  TrendingUp,
  Calendar,
  ArrowRight,
  Loader2,
} from "lucide-react"
import { Header } from "@/components/layout/Header"
import { useAuth } from "@/contexts/AuthContext"
import { DateInput } from "@/components/ui/DateInput"
import { authFetch, authPost, authPatch } from "@/lib/api/authFetch"

// Types from API
interface BatchJobError {
  timestamp?: string
  property?: string
  error?: string
  message?: string
  details?: string
}

interface CountyApiResponse {
  id: string
  name: string
  state: string
}

interface BatchJob {
  id: string
  name: string
  type: string
  county: string
  countyId: string | null
  state: string
  status: "running" | "paused" | "pending" | "completed" | "failed"
  progress: number
  totalItems: number
  processedItems: number
  failedItems: number
  startedAt: string | null
  pausedAt: string | null
  completedAt: string | null
  createdAt: string
  batchSize: number
  currentBatch: number
  totalBatches: number
  duration: string | null
  successRate: number
  errorLog: BatchJobError[] | null
  estimatedCompletion: string | null
}

interface BatchJobsData {
  activeJobs: BatchJob[]
  jobHistory: BatchJob[]
  stats: {
    running: number
    paused: number
    completedToday: number
    successRate: number
  }
}

type JobStatus = "running" | "paused" | "completed" | "failed" | "pending"
type FilterStatus = "all" | "active" | "completed" | "failed"

const STATUS_CONFIG: Record<JobStatus, {
  label: string
  color: string
  bgColor: string
  icon: React.ReactNode
}> = {
  running: {
    label: "Running",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
    icon: <Activity className="h-4 w-4 text-blue-600 animate-pulse" />,
  },
  paused: {
    label: "Paused",
    color: "text-amber-700",
    bgColor: "bg-amber-100",
    icon: <Pause className="h-4 w-4 text-amber-600" />,
  },
  pending: {
    label: "Pending",
    color: "text-slate-700",
    bgColor: "bg-slate-100",
    icon: <Clock className="h-4 w-4 text-slate-600" />,
  },
  completed: {
    label: "Completed",
    color: "text-green-700",
    bgColor: "bg-green-100",
    icon: <CheckCircle2 className="h-4 w-4 text-green-600" />,
  },
  failed: {
    label: "Failed",
    color: "text-red-700",
    bgColor: "bg-red-100",
    icon: <XCircle className="h-4 w-4 text-red-600" />,
  },
}

const JOB_TYPE_LABELS: Record<string, string> = {
  regrid_scraping: "Regrid Scraping",
  visual_validation: "Visual Validation",
  pdf_parsing: "PDF Parsing",
  county_research: "County Research",
  title_research: "Title Research",
  property_condition: "Property Condition",
  environmental_research: "Environmental Research",
  bid_strategy: "Bid Strategy",
}

export default function BatchJobsPage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()

  // Check if user can create batch jobs (admin and analyst can, viewer cannot)
  const canCreateJobs = user?.role === 'admin' || user?.role === 'analyst'

  // Data fetching state
  const [batchJobsData, setBatchJobsData] = useState<BatchJobsData | null>(null)
  const [isLoadingJobs, setIsLoadingJobs] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all")
  const [showCreateModal, setShowCreateModal] = useState(false)

  // Form state for new job
  const [newJobType, setNewJobType] = useState("")
  const [newJobCounty, setNewJobCounty] = useState("")
  const [newJobBatchSize, setNewJobBatchSize] = useState(50)
  const [scheduleDate, setScheduleDate] = useState("")
  const [scheduleDateValid, setScheduleDateValid] = useState(false)

  // Job detail modal state
  const [selectedJob, setSelectedJob] = useState<BatchJob | null>(null)

  // Counties for dropdown
  const [counties, setCounties] = useState<Array<{ id: string; name: string; state: string }>>([])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  // Fetch batch jobs from API
  useEffect(() => {
    async function fetchBatchJobs() {
      if (!isAuthenticated) return

      setIsLoadingJobs(true)
      setLoadError(null)

      try {
        const response = await authFetch("/api/batch-jobs")

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `Failed to fetch batch jobs: ${response.status}`)
        }

        const result = await response.json()
        setBatchJobsData(result.data)
      } catch (error) {
        console.error("Failed to fetch batch jobs:", error)
        setLoadError(error instanceof Error ? error.message : "Failed to load batch jobs")
      } finally {
        setIsLoadingJobs(false)
      }
    }

    if (isAuthenticated) {
      fetchBatchJobs()
    }
  }, [isAuthenticated])

  // Fetch counties for dropdown
  useEffect(() => {
    async function fetchCounties() {
      if (!isAuthenticated) return

      try {
        const response = await authFetch("/api/counties")
        if (response.ok) {
          const result = await response.json()
          setCounties(
            (result.data || []).map((c: CountyApiResponse) => ({
              id: c.id,
              name: c.name,
              state: c.state,
            }))
          )
        }
      } catch (error) {
        console.error("Failed to fetch counties:", error)
      }
    }

    if (isAuthenticated) {
      fetchCounties()
    }
  }, [isAuthenticated])

  // Real-time progress polling for running jobs
  useEffect(() => {
    if (!batchJobsData?.activeJobs.some((j) => j.status === "running")) return

    const interval = setInterval(async () => {
      try {
        const response = await authFetch("/api/batch-jobs")
        if (response.ok) {
          const result = await response.json()
          setBatchJobsData(result.data)
        }
      } catch (error) {
        console.error("Failed to refresh batch jobs:", error)
      }
    }, 5000) // Poll every 5 seconds for running jobs

    return () => clearInterval(interval)
  }, [batchJobsData?.activeJobs])

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-slate-500 dark:text-slate-400">Loading...</div>
      </div>
    )
  }

  // Don't render content if not authenticated
  if (!isAuthenticated) {
    return null
  }

  // Show loading state while fetching batch jobs
  if (isLoadingJobs) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-slate-500 dark:text-slate-400">Loading batch jobs...</p>
          </div>
        </div>
      </div>
    )
  }

  // Show error state if loading failed
  if (loadError) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="flex flex-col items-center gap-3 text-center">
            <AlertTriangle className="h-10 w-10 text-red-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Failed to load batch jobs</h2>
            <p className="text-slate-500 dark:text-slate-400">{loadError}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Get active jobs and history from API data
  const activeJobs = batchJobsData?.activeJobs || []
  const jobHistory = batchJobsData?.jobHistory || []

  // Filter job history
  const filteredHistory = jobHistory.filter((job) => {
    const matchesSearch =
      searchQuery === "" ||
      job.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.county.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.type.toLowerCase().includes(searchQuery.toLowerCase())

    let matchesStatus = true
    if (statusFilter === "completed") {
      matchesStatus = job.status === "completed"
    } else if (statusFilter === "failed") {
      matchesStatus = job.status === "failed"
    } else if (statusFilter === "active") {
      matchesStatus = false // History doesn't have active jobs
    }

    return matchesSearch && matchesStatus
  })

  // Handle pause/resume via API
  const handleToggleJob = async (jobId: string) => {
    const job = activeJobs.find((j) => j.id === jobId)
    if (!job) return

    const newStatus = job.status === "running" ? "paused" : "in_progress"

    try {
      const response = await authPatch(`/api/batch-jobs/${jobId}`, { status: newStatus })

      if (response.ok) {
        // Refresh the data
        const refreshResponse = await authFetch("/api/batch-jobs")
        if (refreshResponse.ok) {
          const result = await refreshResponse.json()
          setBatchJobsData(result.data)
        }
      }
    } catch (error) {
      console.error("Failed to toggle job status:", error)
    }
  }

  // Handle create new job via API
  const handleCreateJob = async () => {
    if (!newJobType || !newJobCounty) return

    const selectedCounty = counties.find((c) => c.id === newJobCounty)
    if (!selectedCounty) return

    try {
      const response = await authPost("/api/batch-jobs", {
        job_type: newJobType,
        county_id: newJobCounty,
        batch_size: newJobBatchSize,
      })

      if (response.ok) {
        // Refresh the data
        const refreshResponse = await authFetch("/api/batch-jobs")
        if (refreshResponse.ok) {
          const result = await refreshResponse.json()
          setBatchJobsData(result.data)
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        console.error("Failed to create job:", errorData.error || errorData.message)
        alert(errorData.error || errorData.message || "Failed to create job")
      }
    } catch (error) {
      console.error("Failed to create job:", error)
    }

    setShowCreateModal(false)
    setNewJobType("")
    setNewJobCounty("")
    setNewJobBatchSize(50)
    setScheduleDate("")
    setScheduleDateValid(false)
  }

  // Stats from API
  const runningCount = batchJobsData?.stats?.running || 0
  const pausedCount = batchJobsData?.stats?.paused || 0
  const completedToday = batchJobsData?.stats?.completedToday || 0
  const successRate = batchJobsData?.stats?.successRate || 100

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Layers className="h-6 w-6 text-primary" />
              Batch Jobs
            </h1>
            <p className="text-slate-600 mt-1">
              Manage and monitor batch processing jobs
            </p>
          </div>
          {canCreateJobs && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium"
          >
            <Plus className="h-4 w-4" />
            Create New Job
          </button>
        )}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-slate-600 text-sm mb-1">
              <Activity className="h-4 w-4" />
              Running
            </div>
            <div className="text-2xl font-bold text-blue-600">{runningCount}</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-slate-600 text-sm mb-1">
              <Pause className="h-4 w-4" />
              Paused
            </div>
            <div className="text-2xl font-bold text-amber-600">{pausedCount}</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-slate-600 text-sm mb-1">
              <CheckCircle2 className="h-4 w-4" />
              Completed Today
            </div>
            <div className="text-2xl font-bold text-green-600">{completedToday}</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-slate-600 text-sm mb-1">
              <TrendingUp className="h-4 w-4" />
              Success Rate
            </div>
            <div className="text-2xl font-bold text-slate-900">{successRate}%</div>
          </div>
        </div>

        {/* Active Jobs Section */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Active Jobs
              {activeJobs.length > 0 && (
                <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                  {activeJobs.length}
                </span>
              )}
            </h2>
          </div>

          {activeJobs.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {activeJobs.map((job) => {
                const statusConfig = STATUS_CONFIG[job.status as JobStatus]
                return (
                  <div key={job.id} className="p-4">
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-slate-900">{job.name}</h3>
                          <span className={cn(
                            "px-2 py-0.5 text-xs font-medium rounded",
                            statusConfig.bgColor,
                            statusConfig.color
                          )}>
                            {statusConfig.label}
                          </span>
                        </div>
                        <div className="text-sm text-slate-500 mt-1">
                          {JOB_TYPE_LABELS[job.type]} • {job.county}, {job.state}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleJob(job.id)}
                          className={cn(
                            "p-2 rounded-lg transition-colors",
                            job.status === "running"
                              ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                              : "bg-blue-100 text-blue-700 hover:bg-blue-200"
                          )}
                          title={job.status === "running" ? "Pause" : "Resume"}
                        >
                          {job.status === "running" ? (
                            <Pause className="h-4 w-4" />
                          ) : (
                            <Play className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          className="p-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors"
                          title="More options"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mb-2">
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-slate-600">
                          {job.processedItems.toLocaleString()} / {job.totalItems.toLocaleString()} items
                        </span>
                        <span className="font-medium text-slate-900">{job.progress}%</span>
                      </div>
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            job.status === "running" ? "bg-blue-500" : "bg-amber-500"
                          )}
                          style={{ width: `${job.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Job Details */}
                    <div className="flex items-center gap-4 text-xs text-slate-500">
                      <span>Batch {job.currentBatch} of {job.totalBatches}</span>
                      <span>•</span>
                      <span>Batch size: {job.batchSize}</span>
                      {job.estimatedCompletion && (
                        <>
                          <span>•</span>
                          <span>
                            Est. completion:{" "}
                            {new Date(job.estimatedCompletion).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="p-8 text-center">
              <Activity className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900 mb-2">No Active Jobs</h3>
              <p className="text-slate-500 mb-4">
                {canCreateJobs
                  ? "Start a new batch job to process properties in bulk."
                  : "No batch jobs are currently running."}
              </p>
              {canCreateJobs && (
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  Create New Job
                </button>
              )}
            </div>
          )}
        </div>

        {/* Job History Section */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="font-semibold text-slate-900 flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Job History
              </h2>
              <div className="flex items-center gap-2">
                {/* Status Filter Tabs */}
                <div className="flex bg-slate-100 rounded-lg p-1">
                  {(["all", "completed", "failed"] as FilterStatus[]).map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={cn(
                        "px-3 py-1 text-sm font-medium rounded-md transition-colors",
                        statusFilter === status
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-600 hover:text-slate-900"
                      )}
                    >
                      {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
                {/* Search */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search jobs..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Job
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Progress
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Completed
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredHistory.length > 0 ? (
                  filteredHistory.map((job) => {
                    const statusConfig = STATUS_CONFIG[job.status as JobStatus]
                    return (
                      <tr key={job.id} className="hover:bg-slate-50">
                        <td className="px-4 py-4">
                          <div>
                            <div className="font-medium text-slate-900">{job.name}</div>
                            <div className="text-sm text-slate-500">
                              {job.county}, {job.state}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-slate-700">
                            {JOB_TYPE_LABELS[job.type]}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={cn(
                            "inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded",
                            statusConfig.bgColor,
                            statusConfig.color
                          )}>
                            {statusConfig.icon}
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-sm">
                            <span className="font-medium text-slate-900">
                              {job.processedItems}/{job.totalItems}
                            </span>
                            <span className="text-slate-500 ml-1">
                              ({job.successRate}%)
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-slate-700">{job.duration}</span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-slate-700">
                            {job.completedAt
                              ? new Date(job.completedAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "-"}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1">
                            {job.status === "failed" && (
                              <button
                                className="p-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                                title="Retry"
                              >
                                <RotateCcw className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => setSelectedJob(job)}
                              className="p-1.5 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 transition-colors"
                              title="View Details"
                            >
                              <ArrowRight className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      No jobs found matching your criteria
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Create Job Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
              <h2 className="text-lg font-semibold text-slate-900">Create New Batch Job</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-4 overflow-y-auto flex-1">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Job Type
                  </label>
                  <select
                    value={newJobType}
                    onChange={(e) => setNewJobType(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select job type...</option>
                    <option value="regrid_scraping">Regrid Scraping</option>
                    <option value="visual_validation">Visual Validation</option>
                    <option value="pdf_parsing">PDF Parsing</option>
                    <option value="county_research">County Research</option>
                    <option value="title_research">Title Research</option>
                    <option value="property_condition">Property Condition</option>
                    <option value="environmental_research">Environmental Research</option>
                    <option value="bid_strategy">Bid Strategy</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    County
                  </label>
                  <select
                    value={newJobCounty}
                    onChange={(e) => setNewJobCounty(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Select county...</option>
                    {counties.map((county) => (
                      <option key={county.id} value={county.id}>
                        {county.name}, {county.state}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Batch Size
                  </label>
                  <input
                    type="number"
                    value={newJobBatchSize}
                    onChange={(e) => setNewJobBatchSize(parseInt(e.target.value) || 50)}
                    min={10}
                    max={200}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Recommended: 50 for scraping, 100 for validation
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Priority
                  </label>
                  <select className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary">
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <DateInput
                  label="Schedule Date"
                  placeholder="YYYY-MM-DD"
                  value={scheduleDate}
                  onChange={(value, isValid) => {
                    setScheduleDate(value)
                    setScheduleDateValid(isValid)
                  }}
                  minDate={new Date().toISOString().split('T')[0]}
                  helpText="Optional: Leave empty to start immediately"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-lg flex-shrink-0">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-slate-700 text-sm font-medium hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateJob}
                disabled={!newJobType || !newJobCounty}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                  newJobType && newJobCounty
                    ? "bg-primary text-white hover:bg-primary/90"
                    : "bg-slate-200 text-slate-400 cursor-not-allowed"
                )}
              >
                Create Job
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Job Detail Modal */}
      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSelectedJob(null)}
          />
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 flex-shrink-0">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">{selectedJob.name}</h2>
                <p className="text-sm text-slate-500">{selectedJob.county}, {selectedJob.state}</p>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <XCircle className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-4 overflow-y-auto flex-1">
              {/* Job Summary */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs text-slate-500 mb-1">Status</div>
                  <span className={cn(
                    "inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded",
                    STATUS_CONFIG[selectedJob.status as JobStatus].bgColor,
                    STATUS_CONFIG[selectedJob.status as JobStatus].color
                  )}>
                    {STATUS_CONFIG[selectedJob.status as JobStatus].icon}
                    {STATUS_CONFIG[selectedJob.status as JobStatus].label}
                  </span>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs text-slate-500 mb-1">Duration</div>
                  <div className="font-medium text-slate-900">{selectedJob.duration || "-"}</div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs text-slate-500 mb-1">Processed</div>
                  <div className="font-medium text-slate-900">
                    {selectedJob.processedItems}/{selectedJob.totalItems} items
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3">
                  <div className="text-xs text-slate-500 mb-1">Success Rate</div>
                  <div className={cn(
                    "font-medium",
                    selectedJob.successRate >= 90 ? "text-green-600" :
                    selectedJob.successRate >= 50 ? "text-amber-600" : "text-red-600"
                  )}>
                    {selectedJob.successRate}%
                  </div>
                </div>
              </div>

              {/* Error Summary (if failed) */}
              {selectedJob.status === "failed" && selectedJob.failedItems > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-medium text-red-800">Job Failed</h3>
                      <p className="text-sm text-red-700 mt-1">
                        {selectedJob.failedItems} items failed to process
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Error Log (if available) */}
              {selectedJob.errorLog && Array.isArray(selectedJob.errorLog) && selectedJob.errorLog.length > 0 && (
                <div>
                  <h3 className="font-medium text-slate-900 mb-3 flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-red-500" />
                    Error Log
                    <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full">
                      {selectedJob.errorLog.length} errors
                    </span>
                  </h3>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <div className="bg-slate-800 text-slate-200 text-xs p-3 font-mono max-h-64 overflow-y-auto">
                      {selectedJob.errorLog.map((err: BatchJobError, index: number) => (
                        <div key={index} className="mb-3 last:mb-0">
                          {err.timestamp && (
                            <div className="text-slate-400">
                              [{new Date(err.timestamp).toLocaleTimeString()}] {err.property && `Property: ${err.property}`}
                            </div>
                          )}
                          <div className="text-red-400 font-semibold">{err.error || err.message || JSON.stringify(err)}</div>
                          {err.details && <div className="text-slate-300 text-xs">{err.details}</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Showing first {selectedJob.errorLog.length} errors. Full log available in system logs.
                  </p>
                </div>
              )}

              {/* Timestamps */}
              <div className="mt-6 pt-4 border-t border-slate-200">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-500">Started:</span>{" "}
                    <span className="text-slate-900">
                      {selectedJob.startedAt
                        ? new Date(selectedJob.startedAt).toLocaleString()
                        : "-"}
                    </span>
                  </div>
                  {selectedJob.completedAt && (
                    <div>
                      <span className="text-slate-500">Completed:</span>{" "}
                      <span className="text-slate-900">
                        {new Date(selectedJob.completedAt).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-lg flex-shrink-0">
              {selectedJob.status === "failed" && (
                <button
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                  Retry Job
                </button>
              )}
              <button
                onClick={() => setSelectedJob(null)}
                className="px-4 py-2 text-slate-700 text-sm font-medium hover:bg-slate-100 rounded-lg transition-colors"
              >
                Close
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
