"use client"

import { useState } from "react"
import { X, Mail, UserPlus, AlertCircle } from "lucide-react"
import { useOrganization } from "@/contexts/OrganizationContext"
import { useAuth } from "@/contexts/AuthContext"
import type { MemberRole } from "@/types/team"

interface InviteMemberDialogProps {
  isOpen: boolean
  onClose: () => void
}

export function InviteMemberDialog({ isOpen, onClose }: InviteMemberDialogProps) {
  const { currentOrganization } = useAuth()
  const { inviteMember, canPerformAction } = useOrganization()
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<MemberRole>("analyst")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address")
      return
    }

    if (!currentOrganization) {
      setError("No organization selected")
      return
    }

    setIsLoading(true)
    try {
      const result = await inviteMember({
        email,
        role,
      })

      if (result.success) {
        setEmail("")
        setRole("analyst")
        onClose()
      } else {
        setError(result.error || "Failed to invite member")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setEmail("")
      setRole("analyst")
      setError(null)
      onClose()
    }
  }

  if (!isOpen) {
    return null
  }

  if (!canPerformAction("invite")) {
    return null
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 dark:bg-black/70 z-40 transition-opacity"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="invite-member-title"
      >
        <div
          className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" aria-hidden="true" />
              <h2
                id="invite-member-title"
                className="text-lg font-semibold text-slate-900 dark:text-white"
              >
                Invite Team Member
              </h2>
            </div>
            <button
              onClick={handleClose}
              disabled={isLoading}
              className="min-w-[44px] min-h-[44px] p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
              aria-label="Close dialog"
            >
              <X className="h-5 w-5 text-slate-500" aria-hidden="true" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
            {error && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
              </div>
            )}

            {/* Email Input */}
            <div>
              <label
                htmlFor="member-email"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400"
                  aria-hidden="true"
                />
                <input
                  id="member-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  placeholder="colleague@example.com"
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                  autoComplete="email"
                />
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                They will receive an invitation email
              </p>
            </div>

            {/* Role Select */}
            <div>
              <label
                htmlFor="member-role"
                className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
              >
                Role
              </label>
              <select
                id="member-role"
                value={role}
                onChange={(e) => setRole(e.target.value as MemberRole)}
                disabled={isLoading}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                required
              >
                <option value="viewer">Viewer - Can view data only</option>
                <option value="analyst">Analyst - Can view and edit data</option>
                <option value="admin">Admin - Full access and management</option>
              </select>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                You can change this role later
              </p>
            </div>

            {/* Role Descriptions */}
            <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 space-y-2">
              <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Role Permissions:
              </p>
              <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                <li>• <strong>Admin:</strong> Manage team, settings, and all features</li>
                <li>• <strong>Analyst:</strong> Create and edit properties, watchlists, deals</li>
                <li>• <strong>Viewer:</strong> View-only access to all data</li>
              </ul>
            </div>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-slate-200 dark:border-slate-700">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={isLoading || !email}
              className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" aria-hidden="true" />
                  Send Invitation
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
