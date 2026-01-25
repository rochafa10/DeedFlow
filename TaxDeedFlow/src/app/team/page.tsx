"use client"

// Force dynamic rendering to prevent build-time errors with context hooks
export const dynamic = 'force-dynamic'

import { useState, Suspense, useEffect } from "react"
import { Search, UserPlus, Users, Shield, User, Settings, Building2 } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useOrganization } from "@/contexts/OrganizationContext"
import { useRouter } from "next/navigation"
import { TeamMemberList } from "@/components/team/TeamMemberList"
import { InviteMemberDialog } from "@/components/team/InviteMemberDialog"

// Loading skeleton component
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <main className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
          <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
        </div>
      </main>
    </div>
  )
}

// Separate component that uses useOrganization - only rendered client-side after mount
function TeamOrganizationContent() {
  const { isAuthenticated, isLoading: authLoading, currentOrganization } = useAuth()
  const router = useRouter()
  const {
    members,
    getMemberCount,
    getActiveMemberCount,
    canPerformAction,
  } = useOrganization()
  const [searchQuery, setSearchQuery] = useState("")
  const [showInviteDialog, setShowInviteDialog] = useState(false)

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login?redirect=/team")
    }
  }, [authLoading, isAuthenticated, router])

  // Show loading state
  if (authLoading) {
    return <LoadingSkeleton />
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated) {
    return null
  }

  // Count members by role
  const adminCount = members.filter((m) => m.role === "admin" && m.status === "active").length
  const analystCount = members.filter((m) => m.role === "analyst" && m.status === "active").length
  const viewerCount = members.filter((m) => m.role === "viewer" && m.status === "active").length

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            <main className="container mx-auto px-4 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                Team Management
              </h1>
              <p className="text-slate-600 dark:text-slate-400">
                Manage your organization&apos;s team members and permissions
              </p>
            </div>
            <div className="flex items-center gap-3">
              {canPerformAction("modify_settings") && (
                <button
                  onClick={() => router.push("/team/settings")}
                  className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                >
                  <Settings className="h-4 w-4" aria-hidden="true" />
                  Settings
                </button>
              )}
              {canPerformAction("invite") && (
                <button
                  onClick={() => setShowInviteDialog(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
                >
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                  Invite Member
                </button>
              )}
            </div>
          </div>

          {/* Organization Info */}
          {currentOrganization && (
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 mb-6">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-6 w-6 text-primary" aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white mb-1">
                    {currentOrganization.name}
                  </h2>
                  {currentOrganization.slug && (
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
                      @{currentOrganization.slug}
                    </p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="h-4 w-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                        <span className="text-sm text-slate-500 dark:text-slate-400">Total Members</span>
                      </div>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        {getMemberCount()}
                      </p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Shield className="h-4 w-4 text-green-500" aria-hidden="true" />
                        <span className="text-sm text-slate-500 dark:text-slate-400">Active Members</span>
                      </div>
                      <p className="text-2xl font-bold text-slate-900 dark:text-white">
                        {getActiveMemberCount()}
                      </p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="h-4 w-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                        <span className="text-sm text-slate-500 dark:text-slate-400">By Role</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm mt-2">
                        <span className="text-purple-600 dark:text-purple-400 font-medium">
                          {adminCount} Admin
                        </span>
                        <span className="text-blue-600 dark:text-blue-400 font-medium">
                          {analystCount} Analyst
                        </span>
                        <span className="text-slate-600 dark:text-slate-400 font-medium">
                          {viewerCount} Viewer
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Search Bar */}
          <div className="relative">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400"
              aria-hidden="true"
            />
            <input
              type="text"
              placeholder="Search team members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            />
          </div>
        </div>

        {/* Team Member List */}
        <TeamMemberList searchQuery={searchQuery} />
      </main>

      {/* Invite Member Dialog */}
      <InviteMemberDialog
        isOpen={showInviteDialog}
        onClose={() => setShowInviteDialog(false)}
      />
    </div>
  )
}

// Wrapper component that handles client-side mounting
function TeamContent() {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Show loading skeleton during SSR and initial mount
  if (!isMounted) {
    return <LoadingSkeleton />
  }

  // Only render the organization content after mounting on client
  return <TeamOrganizationContent />
}

export default function TeamPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
                    <div className="container mx-auto px-4 py-8">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
              <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded"></div>
            </div>
          </div>
        </div>
      }
    >
      <TeamContent />
    </Suspense>
  )
}
