"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Shield,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  Info,
  RefreshCw,
  Search,
  Filter,
  Clock,
  Database,
  AlertCircle,
  ChevronRight,
  BarChart3,
  Wrench,
  X,
} from "lucide-react"
import { Header } from "@/components/layout/Header"
import { useAuth } from "@/contexts/AuthContext"
import { authFetch } from "@/lib/api/authFetch"

// Types for API response
interface DataIntegrityIssue {
  id: string
  severity: "critical" | "warning" | "info"
  category: string
  title: string
  description: string
  affectedCount: number
  table: string
  field?: string
  fixable: boolean
  action?: string
  agent?: string
  status?: "open" | "acknowledged" | "resolved"
  detectedAt?: string
  fixAction?: string
}

interface PipelineStats {
  totalProperties: number
  withRegrid: number
  withValidation: number
  approved: number
  rejected: number
  caution: number
  regridPct: number
  validationPct: number
  approvalRate: number
}

interface DataIntegritySummary {
  totalIssues: number
  criticalCount: number
  warningCount: number
  infoCount: number
  lastAuditAt: string
}

type IssueSeverity = "critical" | "warning" | "info"
type IssueStatus = "open" | "acknowledged" | "resolved"
type FilterSeverity = "all" | "critical" | "warning" | "info"
type FilterStatus = "all" | "open" | "acknowledged" | "resolved"

const SEVERITY_CONFIG: Record<IssueSeverity, {
  label: string
  color: string
  bgColor: string
  icon: React.ReactNode
}> = {
  critical: {
    label: "Critical",
    color: "text-red-700",
    bgColor: "bg-red-100",
    icon: <XCircle className="h-5 w-5 text-red-600" />,
  },
  warning: {
    label: "Warning",
    color: "text-amber-700",
    bgColor: "bg-amber-100",
    icon: <AlertTriangle className="h-5 w-5 text-amber-600" />,
  },
  info: {
    label: "Info",
    color: "text-blue-700",
    bgColor: "bg-blue-100",
    icon: <Info className="h-5 w-5 text-blue-600" />,
  },
}

const STATUS_CONFIG: Record<IssueStatus, {
  label: string
  color: string
  bgColor: string
}> = {
  open: {
    label: "Open",
    color: "text-red-700",
    bgColor: "bg-red-100",
  },
  acknowledged: {
    label: "Acknowledged",
    color: "text-amber-700",
    bgColor: "bg-amber-100",
  },
  resolved: {
    label: "Resolved",
    color: "text-green-700",
    bgColor: "bg-green-100",
  },
}

export default function DataIntegrityPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()

  // API data state
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [issues, setIssues] = useState<DataIntegrityIssue[]>([])
  const [summary, setSummary] = useState<DataIntegritySummary | null>(null)
  const [pipelineStats, setPipelineStats] = useState<PipelineStats | null>(null)

  // UI state
  const [searchQuery, setSearchQuery] = useState("")
  const [severityFilter, setSeverityFilter] = useState<FilterSeverity>("all")
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all")
  const [isAuditing, setIsAuditing] = useState(false)
  const [fixModalIssue, setFixModalIssue] = useState<DataIntegrityIssue | null>(null)
  const [isFixing, setIsFixing] = useState(false)

  // Fetch data from API
  const fetchDataIntegrity = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await authFetch("/api/data-integrity")
      if (!response.ok) {
        throw new Error("Failed to fetch data integrity information")
      }

      const result = await response.json()
      const data = result.data

      // Map API issues to include status field (defaults to "open")
      const mappedIssues: DataIntegrityIssue[] = (data.issues || []).map((issue: any) => ({
        ...issue,
        status: issue.status || "open",
        detectedAt: issue.detectedAt || new Date().toISOString(),
        fixAction: issue.action,
      }))

      setIssues(mappedIssues)
      setSummary(data.summary)
      setPipelineStats(data.pipelineStats)
    } catch (err) {
      console.error("Error fetching data integrity:", err)
      setError(err instanceof Error ? err.message : "Failed to load data")
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
      fetchDataIntegrity()
    }
  }, [isAuthenticated, fetchDataIntegrity])

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

  // Show loading state while fetching data
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 text-primary animate-spin" />
            <span className="ml-3 text-slate-500">Loading data integrity information...</span>
          </div>
        </main>
      </div>
    )
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen bg-slate-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <XCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-red-900 mb-2">Error Loading Data</h3>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={fetchDataIntegrity}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        </main>
      </div>
    )
  }

  // Filter issues
  const filteredIssues = issues.filter((issue) => {
    const matchesSearch =
      searchQuery === "" ||
      issue.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      issue.category.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesSeverity =
      severityFilter === "all" || issue.severity === severityFilter

    const matchesStatus =
      statusFilter === "all" || issue.status === statusFilter

    return matchesSearch && matchesSeverity && matchesStatus
  })

  // Stats - prefer API summary when available
  const criticalCount = summary?.criticalCount ?? issues.filter((i) => i.severity === "critical" && i.status === "open").length
  const warningCount = summary?.warningCount ?? issues.filter((i) => i.severity === "warning" && i.status === "open").length
  const infoCount = summary?.infoCount ?? issues.filter((i) => i.severity === "info" && i.status === "open").length
  const totalOpenCount = summary?.totalIssues ?? issues.filter((i) => i.status === "open").length

  // Handle run audit - refetch from API
  const handleRunAudit = async () => {
    setIsAuditing(true)
    await fetchDataIntegrity()
    setIsAuditing(false)
  }

  // Handle acknowledge
  const handleAcknowledge = (issueId: string) => {
    setIssues((prev) =>
      prev.map((issue) =>
        issue.id === issueId ? { ...issue, status: "acknowledged" } : issue
      )
    )
  }

  // Handle fix - opens confirmation modal
  const handleOpenFixModal = (issue: DataIntegrityIssue) => {
    setFixModalIssue(issue)
  }

  // Confirm fix
  const handleConfirmFix = () => {
    if (!fixModalIssue) return
    setIsFixing(true)
    // Simulate fix running
    setTimeout(() => {
      setIssues((prev) =>
        prev.map((issue) =>
          issue.id === fixModalIssue.id
            ? { ...issue, status: "resolved", affectedCount: 0 }
            : issue
        )
      )
      setIsFixing(false)
      setFixModalIssue(null)
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Data Integrity
            </h1>
            <p className="text-slate-600 mt-1">
              Monitor and resolve data quality issues across the system
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-slate-500">
              Last audit:{" "}
              {summary?.lastAuditAt
                ? new Date(summary.lastAuditAt).toLocaleString("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "Never"}
            </div>
            <button
              onClick={handleRunAudit}
              disabled={isAuditing}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors",
                isAuditing
                  ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                  : "bg-primary text-white hover:bg-primary/90"
              )}
            >
              <RefreshCw className={cn("h-4 w-4", isAuditing && "animate-spin")} />
              {isAuditing ? "Running Audit..." : "Run Full Audit"}
            </button>
          </div>
        </div>

        {/* Severity Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg border border-red-200 p-4">
            <div className="flex items-center gap-2 text-red-600 text-sm mb-1">
              <XCircle className="h-4 w-4" />
              Critical
            </div>
            <div className="text-2xl font-bold text-red-600">{criticalCount}</div>
            <div className="text-xs text-slate-500">Requires immediate action</div>
          </div>
          <div className="bg-white rounded-lg border border-amber-200 p-4">
            <div className="flex items-center gap-2 text-amber-600 text-sm mb-1">
              <AlertTriangle className="h-4 w-4" />
              Warnings
            </div>
            <div className="text-2xl font-bold text-amber-600">{warningCount}</div>
            <div className="text-xs text-slate-500">Should be addressed</div>
          </div>
          <div className="bg-white rounded-lg border border-blue-200 p-4">
            <div className="flex items-center gap-2 text-blue-600 text-sm mb-1">
              <Info className="h-4 w-4" />
              Info
            </div>
            <div className="text-2xl font-bold text-blue-600">{infoCount}</div>
            <div className="text-xs text-slate-500">For your information</div>
          </div>
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-2 text-slate-600 text-sm mb-1">
              <BarChart3 className="h-4 w-4" />
              Total Open
            </div>
            <div className="text-2xl font-bold text-slate-900">{totalOpenCount}</div>
            <div className="text-xs text-slate-500">Issues requiring attention</div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg border border-slate-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search issues..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            {/* Severity Filter */}
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value as FilterSeverity)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as FilterStatus)}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </div>

        {/* Issues Table */}
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50">
            <h2 className="font-semibold text-slate-900 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Issues
              <span className="bg-slate-200 text-slate-700 text-xs px-2 py-0.5 rounded-full">
                {filteredIssues.length}
              </span>
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Severity
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Issue
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Affected
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Detected
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredIssues.length > 0 ? (
                  filteredIssues.map((issue) => {
                    const severityConfig = SEVERITY_CONFIG[issue.severity as IssueSeverity]
                    const statusConfig = STATUS_CONFIG[issue.status as IssueStatus]
                    return (
                      <tr key={issue.id} className="hover:bg-slate-50">
                        <td className="px-4 py-4">
                          <span className={cn(
                            "inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded",
                            severityConfig.bgColor,
                            severityConfig.color
                          )}>
                            {severityConfig.icon}
                            {severityConfig.label}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div>
                            <div className="font-medium text-slate-900">{issue.title}</div>
                            <div className="text-sm text-slate-500 max-w-md truncate">
                              {issue.description}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-slate-700">{issue.category}</span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1">
                            <Database className="h-4 w-4 text-slate-400" />
                            <span className="font-medium text-slate-900">
                              {issue.affectedCount.toLocaleString()}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500">{issue.table}</div>
                        </td>
                        <td className="px-4 py-4">
                          <span className={cn(
                            "px-2 py-1 text-xs font-medium rounded",
                            statusConfig.bgColor,
                            statusConfig.color
                          )}>
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-sm text-slate-700">
                            {issue.detectedAt
                              ? new Date(issue.detectedAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })
                              : "Today"}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            {issue.status === "open" && (
                              <button
                                onClick={() => handleAcknowledge(issue.id)}
                                className="px-2 py-1 text-xs font-medium text-amber-700 bg-amber-100 rounded hover:bg-amber-200 transition-colors"
                              >
                                Acknowledge
                              </button>
                            )}
                            {issue.fixable && issue.status !== "resolved" && (
                              <button
                                onClick={() => handleOpenFixModal(issue)}
                                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded hover:bg-green-200 transition-colors"
                              >
                                <Wrench className="h-3 w-3" />
                                Fix
                              </button>
                            )}
                            <button className="p-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors">
                              <ChevronRight className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                      <CheckCircle2 className="h-12 w-12 text-green-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-slate-900 mb-2">No Issues Found</h3>
                      <p>
                        {searchQuery || severityFilter !== "all" || statusFilter !== "all"
                          ? "No issues match your current filters."
                          : "Great job! No data integrity issues detected."}
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Fix Confirmation Modal */}
      {fixModalIssue && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <Wrench className="h-5 w-5 text-green-600" />
                Confirm Fix
              </h3>
              <button
                onClick={() => setFixModalIssue(null)}
                disabled={isFixing}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="px-6 py-4">
              <div className="mb-4">
                <div className="text-sm text-slate-500 mb-1">Issue</div>
                <div className="font-medium text-slate-900">{fixModalIssue.title}</div>
                <div className="text-sm text-slate-600 mt-1">{fixModalIssue.description}</div>
              </div>

              <div className="mb-4">
                <div className="text-sm text-slate-500 mb-1">Fix Action</div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="font-medium text-green-800">{fixModalIssue.fixAction || fixModalIssue.action || "Apply automatic fix"}</div>
                  <div className="text-sm text-green-600 mt-1">
                    This will affect {fixModalIssue.affectedCount.toLocaleString()} {fixModalIssue.table} records
                  </div>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-700">
                    This action cannot be undone. Please make sure you have a recent backup before proceeding.
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 bg-slate-50">
              <button
                onClick={() => setFixModalIssue(null)}
                disabled={isFixing}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmFix}
                disabled={isFixing}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                  isFixing
                    ? "bg-green-400 text-white cursor-not-allowed"
                    : "bg-green-600 text-white hover:bg-green-700"
                )}
              >
                {isFixing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Applying Fix...
                  </>
                ) : (
                  <>
                    <Wrench className="h-4 w-4" />
                    Apply Fix
                  </>
                )}
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
