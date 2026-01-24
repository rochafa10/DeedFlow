"use client"

import { useState } from "react"
import { User, Shield, Eye, Trash2, MoreVertical, Mail, Calendar } from "lucide-react"
import { useOrganization } from "@/contexts/OrganizationContext"
import { useAuth } from "@/contexts/AuthContext"
import { MemberRoleSelect } from "./MemberRoleSelect"
import type { OrganizationMember, MemberRole, MemberStatus } from "@/types/team"

interface TeamMemberListProps {
  searchQuery?: string
}

export function TeamMemberList({ searchQuery = "" }: TeamMemberListProps) {
  const { user } = useAuth()
  const { members, isLoadingMembers, memberError, removeMember, canPerformAction } = useOrganization()
  const [loadingMemberId, setLoadingMemberId] = useState<string | null>(null)
  const [showActionsMenu, setShowActionsMenu] = useState<string | null>(null)

  // Filter members by search query
  const filteredMembers = members.filter((member) => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    // In production, you'd have user details from the member object
    return member.userId.toLowerCase().includes(query) || member.role.toLowerCase().includes(query)
  })

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm("Are you sure you want to remove this team member?")) {
      return
    }

    setLoadingMemberId(memberId)
    try {
      const result = await removeMember(memberId)
      if (!result.success) {
        alert(result.error || "Failed to remove member")
      }
    } finally {
      setLoadingMemberId(null)
      setShowActionsMenu(null)
    }
  }

  const getRoleBadgeColor = (role: MemberRole) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
      case "analyst":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
      case "viewer":
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
      default:
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
    }
  }

  const getStatusBadgeColor = (status: MemberStatus) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
      case "pending":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
      case "suspended":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
      case "removed":
        return "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
      default:
        return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
    }
  }

  const getRoleIcon = (role: MemberRole) => {
    switch (role) {
      case "admin":
        return <Shield className="h-4 w-4" aria-hidden="true" />
      case "analyst":
        return <User className="h-4 w-4" aria-hidden="true" />
      case "viewer":
        return <Eye className="h-4 w-4" aria-hidden="true" />
      default:
        return <User className="h-4 w-4" aria-hidden="true" />
    }
  }

  const formatDate = (date: Date | undefined) => {
    if (!date) return "N/A"
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    })
  }

  if (isLoadingMembers) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-20 bg-slate-100 dark:bg-slate-800 rounded-lg animate-pulse"
          />
        ))}
      </div>
    )
  }

  if (memberError) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <p className="text-sm text-red-800 dark:text-red-300">{memberError}</p>
      </div>
    )
  }

  if (filteredMembers.length === 0) {
    return (
      <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-8 text-center">
        <User className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" aria-hidden="true" />
        <p className="text-slate-600 dark:text-slate-400">
          {searchQuery ? "No members found matching your search" : "No team members yet"}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {filteredMembers.map((member) => {
        const isCurrentUser = user?.id === member.userId
        const canRemove = canPerformAction("remove") && !isCurrentUser
        const isLoading = loadingMemberId === member.id

        return (
          <div
            key={member.id}
            className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Avatar */}
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  {getRoleIcon(member.role)}
                </div>

                {/* Member Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {member.userId}
                      {isCurrentUser && (
                        <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                          (You)
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(
                        member.role
                      )}`}
                    >
                      {member.role}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(
                        member.status
                      )}`}
                    >
                      {member.status}
                    </span>
                    {member.joinedAt && (
                      <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <Calendar className="h-3 w-3" aria-hidden="true" />
                        Joined {formatDate(member.joinedAt)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {/* Role Select */}
                {canPerformAction("invite") && !isCurrentUser && (
                  <MemberRoleSelect
                    memberId={member.id}
                    currentRole={member.role}
                    disabled={isLoading}
                  />
                )}

                {/* More Actions */}
                {canRemove && (
                  <div className="relative">
                    <button
                      onClick={() =>
                        setShowActionsMenu(showActionsMenu === member.id ? null : member.id)
                      }
                      disabled={isLoading}
                      className="min-w-[44px] min-h-[44px] p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
                      aria-label="Member actions"
                      aria-expanded={showActionsMenu === member.id}
                    >
                      <MoreVertical className="h-5 w-5 text-slate-500" aria-hidden="true" />
                    </button>

                    {showActionsMenu === member.id && (
                      <>
                        {/* Backdrop */}
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowActionsMenu(null)}
                          aria-hidden="true"
                        />

                        {/* Actions Menu */}
                        <div className="absolute right-0 mt-1 w-48 rounded-lg bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 z-20 overflow-hidden">
                          <button
                            onClick={() => handleRemoveMember(member.id)}
                            disabled={isLoading}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2 disabled:opacity-50"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                            Remove member
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
