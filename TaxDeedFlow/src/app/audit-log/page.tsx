"use client"

import { useState, Suspense, useEffect } from "react"
import { Header } from "@/components/layout/Header"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { AuditLogTable } from "@/components/audit/AuditLogTable"
import { AuditLogFilters } from "@/components/audit/AuditLogFilters"
import { Loader2, Shield } from "lucide-react"
import type { AuditLogWithDetails, AuditLogFilters as AuditLogFiltersType } from "@/types/audit-log"

function AuditLogContent() {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth()
  const router = useRouter()
  const [logs, setLogs] = useState<AuditLogWithDetails[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [itemsPerPage] = useState(50)
  const [sortField, setSortField] = useState<"created_at" | "severity" | "action" | "entity_type" | null>("created_at")
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc")
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState<AuditLogFiltersType>({
    search: "",
    severity: undefined,
    entity_type: undefined,
  })

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  // Fetch audit logs
  useEffect(() => {
    if (!isAuthenticated) return

    const fetchAuditLogs = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // For demo purposes, use mock data
        // In production, this would fetch from /api/audit-log
        const mockLogs: AuditLogWithDetails[] = [
          {
            id: "log-1",
            organization_id: "org-1",
            user_id: user?.id || "user-1",
            action: "auth.login",
            entity_type: "user",
            entity_id: user?.id || "user-1",
            description: "User logged in successfully",
            severity: "info",
            ip_address: "192.168.1.1",
            user_agent: "Mozilla/5.0...",
            request_id: "req-1",
            old_values: undefined,
            new_values: undefined,
            tags: ["authentication"],
            metadata: {},
            created_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
          },
          {
            id: "log-2",
            organization_id: "org-1",
            user_id: user?.id || "user-1",
            action: "watchlist.created",
            entity_type: "watchlist",
            entity_id: "watchlist-1",
            description: "Created new watchlist: My Favorites",
            severity: "info",
            ip_address: "192.168.1.1",
            user_agent: "Mozilla/5.0...",
            request_id: "req-2",
            old_values: undefined,
            new_values: { name: "My Favorites", visibility: "private" },
            tags: ["watchlist", "create"],
            metadata: {},
            created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: "log-3",
            organization_id: "org-1",
            user_id: user?.id || "user-1",
            action: "deal.created",
            entity_type: "deal",
            entity_id: "deal-1",
            description: "Created new deal: 123 Main St, Anytown PA",
            severity: "info",
            ip_address: "192.168.1.1",
            user_agent: "Mozilla/5.0...",
            request_id: "req-3",
            old_values: undefined,
            new_values: {
              title: "123 Main St, Anytown PA",
              status: "active",
              priority: "medium",
            },
            tags: ["deal", "create"],
            metadata: {},
            created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: "log-4",
            organization_id: "org-1",
            user_id: user?.id || "user-1",
            action: "property.viewed",
            entity_type: "property",
            entity_id: "prop-1",
            description: "Viewed property details",
            severity: "debug",
            ip_address: "192.168.1.1",
            user_agent: "Mozilla/5.0...",
            request_id: "req-4",
            old_values: undefined,
            new_values: undefined,
            tags: ["property", "view"],
            metadata: { parcel_id: "12-345-678" },
            created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: "log-5",
            organization_id: "org-1",
            user_id: "user-2",
            action: "organization.member_invited",
            entity_type: "organization",
            entity_id: "org-1",
            description: "Invited new team member: analyst@example.com",
            severity: "warning",
            ip_address: "192.168.1.2",
            user_agent: "Mozilla/5.0...",
            request_id: "req-5",
            old_values: undefined,
            new_values: { email: "analyst@example.com", role: "analyst" },
            tags: ["organization", "invitation"],
            metadata: {},
            created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: "log-6",
            organization_id: "org-1",
            user_id: user?.id || "user-1",
            action: "assignment.completed",
            entity_type: "assignment",
            entity_id: "assignment-1",
            description: "Completed property assignment: Due diligence for 456 Oak Ave",
            severity: "info",
            ip_address: "192.168.1.1",
            user_agent: "Mozilla/5.0...",
            request_id: "req-6",
            old_values: { status: "in_progress" },
            new_values: { status: "completed" },
            tags: ["assignment", "complete"],
            metadata: { property_id: "prop-2" },
            created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: "log-7",
            organization_id: "org-1",
            user_id: "user-2",
            action: "deal.status_changed",
            entity_type: "deal",
            entity_id: "deal-2",
            description: "Deal status changed from active to won",
            severity: "warning",
            ip_address: "192.168.1.2",
            user_agent: "Mozilla/5.0...",
            request_id: "req-7",
            old_values: { status: "active" },
            new_values: { status: "won", won_at: new Date().toISOString() },
            tags: ["deal", "status-change"],
            metadata: {},
            created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
          },
          {
            id: "log-8",
            organization_id: "org-1",
            user_id: user?.id || "user-1",
            action: "report.generated",
            entity_type: "report",
            entity_id: "report-1",
            description: "Generated monthly pipeline report",
            severity: "info",
            ip_address: "192.168.1.1",
            user_agent: "Mozilla/5.0...",
            request_id: "req-8",
            old_values: undefined,
            new_values: undefined,
            tags: ["report", "generate"],
            metadata: { report_type: "pipeline", period: "monthly" },
            created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          },
        ]

        // Apply filters
        let filteredLogs = [...mockLogs]

        // Search filter
        if (filters.search) {
          const searchLower = filters.search.toLowerCase()
          filteredLogs = filteredLogs.filter(
            (log) =>
              log.action.toLowerCase().includes(searchLower) ||
              log.description.toLowerCase().includes(searchLower) ||
              log.entity_type.toLowerCase().includes(searchLower)
          )
        }

        // Severity filter
        if (filters.severity) {
          filteredLogs = filteredLogs.filter((log) => log.severity === filters.severity)
        }

        // Entity type filter
        if (filters.entity_type) {
          filteredLogs = filteredLogs.filter((log) => log.entity_type === filters.entity_type)
        }

        // Date range filter
        if (filters.date_from) {
          filteredLogs = filteredLogs.filter((log) => new Date(log.created_at) >= new Date(filters.date_from!))
        }
        if (filters.date_to) {
          filteredLogs = filteredLogs.filter((log) => new Date(log.created_at) <= new Date(filters.date_to!))
        }

        // Sort
        if (sortField) {
          filteredLogs.sort((a, b) => {
            let aVal: string | number = ""
            let bVal: string | number = ""

            if (sortField === "created_at") {
              aVal = new Date(a.created_at).getTime()
              bVal = new Date(b.created_at).getTime()
            } else {
              aVal = a[sortField] || ""
              bVal = b[sortField] || ""
            }

            if (sortDirection === "asc") {
              return aVal > bVal ? 1 : -1
            } else {
              return aVal < bVal ? 1 : -1
            }
          })
        }

        setTotalCount(filteredLogs.length)

        // Pagination
        const startIndex = (currentPage - 1) * itemsPerPage
        const endIndex = startIndex + itemsPerPage
        const paginatedLogs = filteredLogs.slice(startIndex, endIndex)

        setLogs(paginatedLogs)
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to fetch audit logs"))
      } finally {
        setIsLoading(false)
      }
    }

    fetchAuditLogs()
  }, [isAuthenticated, filters, currentPage, sortField, sortDirection, user, itemsPerPage])

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

  const totalPages = Math.ceil(totalCount / itemsPerPage)

  const handleSort = (field: "created_at" | "severity" | "action" | "entity_type") => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortField(field)
      setSortDirection("desc")
    }
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleFiltersChange = (newFilters: AuditLogFiltersType) => {
    setFilters(newFilters)
    setCurrentPage(1) // Reset to first page on filter change
  }

  const handleResetFilters = () => {
    setFilters({
      search: "",
      severity: undefined,
      entity_type: undefined,
    })
    setCurrentPage(1)
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Header />

      {/* Hero Section */}
      <div className="border-b bg-gradient-to-r from-purple-600 to-blue-600 py-12 text-white">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-3">
            <Shield className="h-10 w-10" />
            <div>
              <h1 className="mb-2 text-4xl font-bold">Audit Log</h1>
              <p className="text-lg text-purple-100">
                Complete activity history for compliance and security tracking
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="border-b bg-white dark:bg-slate-900">
        <div className="container mx-auto px-4 py-4">
          <AuditLogFilters
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onReset={handleResetFilters}
            showFilters={showFilters}
            onToggleFilters={() => setShowFilters(!showFilters)}
          />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="container mx-auto px-4 py-8">
        <AuditLogTable
          logs={logs}
          isLoading={isLoading}
          error={error}
          currentPage={currentPage}
          totalPages={totalPages}
          totalCount={totalCount}
          itemsPerPage={itemsPerPage}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
          onPageChange={handlePageChange}
        />
      </div>
    </div>
  )
}

export default function AuditLogPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      }
    >
      <AuditLogContent />
    </Suspense>
  )
}
