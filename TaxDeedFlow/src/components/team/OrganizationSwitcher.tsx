"use client"

import { useState } from "react"
import { Building2, ChevronDown, Check } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"

interface Organization {
  id: string
  name: string
  slug: string
}

export function OrganizationSwitcher() {
  const { user, currentOrganization, switchOrganization } = useAuth()
  const [showDropdown, setShowDropdown] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Mock organizations - in production, this would come from an API
  const organizations: Organization[] = [
    {
      id: "demo-org-1",
      name: "Demo Investment Firm",
      slug: "demo-firm",
    },
    {
      id: "org-2",
      name: "Real Estate Partners LLC",
      slug: "re-partners",
    },
    {
      id: "org-3",
      name: "Property Ventures Inc",
      slug: "prop-ventures",
    },
  ]

  const handleOrganizationSwitch = async (organizationId: string) => {
    if (organizationId === currentOrganization?.id) {
      setShowDropdown(false)
      return
    }

    setIsLoading(true)
    try {
      await switchOrganization(organizationId)
      setShowDropdown(false)
    } catch (error) {
      console.error("Failed to switch organization:", error)
    } finally {
      setIsLoading(false)
    }
  }

  if (!user || !currentOrganization) {
    return null
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="min-w-[44px] min-h-[44px] px-3 py-2 flex items-center gap-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        aria-label="Switch organization"
        aria-expanded={showDropdown}
        disabled={isLoading}
      >
        <Building2 className="h-5 w-5 text-slate-600 dark:text-slate-300" aria-hidden="true" />
        <span className="text-sm font-medium text-slate-900 dark:text-white max-w-[150px] truncate">
          {currentOrganization.name}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-slate-500 dark:text-slate-400 transition-transform ${
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
          <div className="absolute right-0 mt-2 w-64 rounded-lg bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 z-20 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-750">
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                Switch Organization
              </p>
            </div>

            <div className="py-1 max-h-80 overflow-y-auto">
              {organizations.map((org) => (
                <button
                  key={org.id}
                  onClick={() => handleOrganizationSwitch(org.id)}
                  disabled={isLoading}
                  className="w-full px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-between gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Building2 className="h-4 w-4 text-slate-400 dark:text-slate-500 flex-shrink-0" aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                        {org.name}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {org.slug}
                      </p>
                    </div>
                  </div>
                  {currentOrganization.id === org.id && (
                    <Check className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
                  )}
                </button>
              ))}
            </div>

            {organizations.length === 0 && (
              <div className="px-4 py-8 text-center">
                <Building2 className="h-8 w-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" aria-hidden="true" />
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  No organizations available
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
