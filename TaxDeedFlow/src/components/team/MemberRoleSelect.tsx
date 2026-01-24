"use client"

import { useState } from "react"
import { Shield, User, Eye, ChevronDown } from "lucide-react"
import { useOrganization } from "@/contexts/OrganizationContext"
import type { MemberRole } from "@/types/team"

interface MemberRoleSelectProps {
  memberId: string
  currentRole: MemberRole
  disabled?: boolean
}

export function MemberRoleSelect({ memberId, currentRole, disabled = false }: MemberRoleSelectProps) {
  const { updateMemberRole, canPerformAction } = useOrganization()
  const [isLoading, setIsLoading] = useState(false)
  const [showDropdown, setShowDropdown] = useState(false)

  const roles: Array<{ value: MemberRole; label: string; icon: typeof Shield }> = [
    { value: "admin", label: "Admin", icon: Shield },
    { value: "analyst", label: "Analyst", icon: User },
    { value: "viewer", label: "Viewer", icon: Eye },
  ]

  const currentRoleData = roles.find((r) => r.value === currentRole) || roles[1]
  const CurrentIcon = currentRoleData.icon

  const handleRoleChange = async (newRole: MemberRole) => {
    if (newRole === currentRole) {
      setShowDropdown(false)
      return
    }

    setIsLoading(true)
    try {
      const result = await updateMemberRole(memberId, newRole)
      if (!result.success) {
        alert(result.error || "Failed to update role")
      }
      setShowDropdown(false)
    } finally {
      setIsLoading(false)
    }
  }

  const getRoleColor = (role: MemberRole) => {
    switch (role) {
      case "admin":
        return "text-purple-700 dark:text-purple-300"
      case "analyst":
        return "text-blue-700 dark:text-blue-300"
      case "viewer":
        return "text-slate-700 dark:text-slate-300"
      default:
        return "text-slate-700 dark:text-slate-300"
    }
  }

  if (!canPerformAction("invite")) {
    // Read-only display for non-admin users
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
        <CurrentIcon className={`h-4 w-4 ${getRoleColor(currentRole)}`} aria-hidden="true" />
        <span className={`text-sm font-medium ${getRoleColor(currentRole)}`}>
          {currentRoleData.label}
        </span>
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        disabled={disabled || isLoading}
        className="min-w-[120px] px-3 py-1.5 flex items-center justify-between gap-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Change member role"
        aria-expanded={showDropdown}
      >
        <div className="flex items-center gap-1.5">
          <CurrentIcon className={`h-4 w-4 ${getRoleColor(currentRole)}`} aria-hidden="true" />
          <span className={`text-sm font-medium ${getRoleColor(currentRole)}`}>
            {currentRoleData.label}
          </span>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition-transform ${
            showDropdown ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {showDropdown && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
            aria-hidden="true"
          />

          {/* Dropdown Menu */}
          <div className="absolute right-0 mt-1 w-48 rounded-lg bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 z-20 overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Change Role
              </p>
            </div>

            <div className="py-1">
              {roles.map((role) => {
                const RoleIcon = role.icon
                const isSelected = role.value === currentRole

                return (
                  <button
                    key={role.value}
                    onClick={() => handleRoleChange(role.value)}
                    disabled={isLoading}
                    className={`w-full px-4 py-2 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                      isSelected ? "bg-slate-50 dark:bg-slate-700" : ""
                    }`}
                  >
                    <RoleIcon className={`h-4 w-4 ${getRoleColor(role.value)}`} aria-hidden="true" />
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${getRoleColor(role.value)}`}>
                        {role.label}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {role.value === "admin" && "Full access"}
                        {role.value === "analyst" && "Edit permissions"}
                        {role.value === "viewer" && "View only"}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="h-2 w-2 rounded-full bg-primary" aria-hidden="true" />
                    )}
                  </button>
                )
              })}
            </div>

            {isLoading && (
              <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 border-2 border-slate-400 border-t-slate-600 rounded-full animate-spin" />
                  <p className="text-xs text-slate-600 dark:text-slate-400">Updating...</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
