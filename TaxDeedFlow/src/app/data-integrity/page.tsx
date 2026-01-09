"use client"

import { useState, useEffect } from "react"
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

// Mock data integrity issues
const MOCK_ISSUES = [
  {
    id: "issue-001",
    severity: "critical",
    category: "Missing Data",
    title: "Properties missing Regrid data",
    description: "7,358 properties have not been enriched with Regrid parcel data",
    affectedCount: 7358,
    table: "properties",
    detectedAt: "2026-01-09T08:00:00Z",
    status: "open",
    fixable: false, // Requires batch job to fix
  },
  {
    id: "issue-002",
    severity: "critical",
    category: "Missing Data",
    title: "Properties missing address",
    description: "6,221 properties do not have a valid street address",
    affectedCount: 6221,
    table: "properties",
    detectedAt: "2026-01-09T08:00:00Z",
    status: "open",
    fixable: false, // Requires manual data entry
  },
  {
    id: "issue-003",
    severity: "warning",
    category: "Missing Data",
    title: "Properties missing amount due",
    description: "3,711 properties do not have total_due amount populated",
    affectedCount: 3711,
    table: "properties",
    detectedAt: "2026-01-09T08:00:00Z",
    status: "open",
    fixable: false,
  },
  {
    id: "issue-004",
    severity: "warning",
    category: "Validation Required",
    title: "Regrid data needing validation",
    description: "17 properties have Regrid data but haven't been visually validated",
    affectedCount: 17,
    table: "regrid_data",
    detectedAt: "2026-01-09T08:00:00Z",
    status: "open",
    fixable: false, // Requires manual validation
  },
  {
    id: "issue-005",
    severity: "info",
    category: "Data Quality",
    title: "Duplicate parcel numbers detected",
    description: "5 properties appear to have duplicate parcel numbers that should be reviewed",
    affectedCount: 5,
    table: "properties",
    detectedAt: "2026-01-08T14:30:00Z",
    status: "open",
    fixable: true, // Can auto-dedupe
    fixAction: "Remove duplicate parcel entries",
  },
  {
    id: "issue-006",
    severity: "info",
    category: "Stale Data",
    title: "Counties not researched recently",
    description: "2 counties have not been researched in the last 30 days",
    affectedCount: 2,
    table: "counties",
    detectedAt: "2026-01-08T08:00:00Z",
    status: "acknowledged",
    fixable: false,
  },
  {
    id: "issue-007",
    severity: "warning",
    category: "Orphaned Records",
    title: "Parsing jobs without documents",
    description: "3 parsing jobs reference documents that no longer exist",
    affectedCount: 3,
    table: "parsing_jobs",
    detectedAt: "2026-01-07T10:00:00Z",
    status: "open",
    fixable: true, // Can delete orphaned records
    fixAction: "Delete orphaned parsing job records",
  },
  {
    id: "issue-008",
    severity: "critical",
    category: "Flag Mismatch",
    title: "Regrid flag inconsistencies",
    description: "12 properties have has_regrid=true but no corresponding regrid_data record",
    affectedCount: 12,
    table: "properties",
    detectedAt: "2026-01-06T16:00:00Z",
    status: "open",
    fixable: true, // Can fix with fix_regrid_flags()
    fixAction: "Reset has_regrid flags to false for affected properties",
  },
]

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
  const [issues, setIssues] = useState(MOCK_ISSUES)
  const [searchQuery, setSearchQuery] = useState("")
  const [severityFilter, setSeverityFilter] = useState<FilterSeverity>("all")
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all")
  const [isAuditing, setIsAuditing] = useState(false)
  const [lastAuditTime, setLastAuditTime] = useState("2026-01-09T08:00:00Z")
  const [fixModalIssue, setFixModalIssue] = useState<typeof MOCK_ISSUES[0] | null>(null)
  const [isFixing, setIsFixing] = useState(false)

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

  // Stats
  const criticalCount = issues.filter((i) => i.severity === "critical" && i.status === "open").length
  const warningCount = issues.filter((i) => i.severity === "warning" && i.status === "open").length
  const infoCount = issues.filter((i) => i.severity === "info" && i.status === "open").length
  const totalOpenCount = issues.filter((i) => i.status === "open").length

  // Handle run audit
  const handleRunAudit = () => {
    setIsAuditing(true)
    // Simulate audit running
    setTimeout(() => {
      setIsAuditing(false)
      setLastAuditTime(new Date().toISOString())
    }, 2000)
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
  const handleOpenFixModal = (issue: typeof MOCK_ISSUES[0]) => {
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
              {new Date(lastAuditTime).toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
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
                            {new Date(issue.detectedAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })}
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
                  <div className="font-medium text-green-800">{fixModalIssue.fixAction}</div>
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
