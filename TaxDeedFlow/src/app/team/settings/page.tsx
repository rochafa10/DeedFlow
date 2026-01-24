"use client"

import { useState, Suspense, useEffect } from "react"

// Force dynamic rendering to prevent build-time errors with context hooks
export const dynamic = 'force-dynamic'
import { Settings, Building2, Save, ArrowLeft, AlertCircle, CheckCircle2 } from "lucide-react"
import { Header } from "@/components/layout/Header"
import { useAuth } from "@/contexts/AuthContext"
import { useOrganization } from "@/contexts/OrganizationContext"
import { useRouter } from "next/navigation"
import type { OrganizationSettings } from "@/types/team"

function TeamSettingsContent() {
  const { isAuthenticated, isLoading: authLoading, currentOrganization } = useAuth()
  const router = useRouter()
  const { canPerformAction, updateOrganizationSettings } = useOrganization()

  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  // Form state
  const [organizationName, setOrganizationName] = useState("")
  const [features, setFeatures] = useState<OrganizationSettings["features"]>({
    shared_watchlists: false,
    deal_pipeline: false,
    audit_log: false,
    advanced_analytics: false,
  })

  // Initialize form with current organization data
  useEffect(() => {
    if (currentOrganization) {
      setOrganizationName(currentOrganization.name)
      setFeatures(currentOrganization.settings.features)
    }
  }, [currentOrganization])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login?redirect=/team/settings")
    }
  }, [authLoading, isAuthenticated, router])

  // Redirect to team page if not admin
  useEffect(() => {
    if (!authLoading && isAuthenticated && !canPerformAction("modify_settings")) {
      router.push("/team")
    }
  }, [authLoading, isAuthenticated, canPerformAction, router])

  const handleSave = async () => {
    if (!currentOrganization) return

    setIsSaving(true)
    setSaveError(null)
    setSaveSuccess(false)

    try {
      const result = await updateOrganizationSettings({
        features,
      })

      if (result.success) {
        setSaveSuccess(true)
        setTimeout(() => setSaveSuccess(false), 3000)
      } else {
        setSaveError(result.error || "Failed to save settings")
      }
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Failed to save settings")
    } finally {
      setIsSaving(false)
    }
  }

  const toggleFeature = (feature: keyof OrganizationSettings["features"]) => {
    setFeatures((prev) => ({
      ...prev,
      [feature]: !prev[feature],
    }))
  }

  // Show loading state
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
            <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded"></div>
          </div>
        </main>
      </div>
    )
  }

  // Don't render if not authenticated (will redirect)
  if (!isAuthenticated || !canPerformAction("modify_settings")) {
    return null
  }

  if (!currentOrganization) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <p className="text-sm text-red-800 dark:text-red-300">
              No organization selected. Please select an organization first.
            </p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Page Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/team")}
            className="flex items-center gap-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Team
          </button>

          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Settings className="h-5 w-5 text-primary" aria-hidden="true" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
              Organization Settings
            </h1>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Configure your organization&apos;s features and preferences
          </p>
        </div>

        {/* Success/Error Messages */}
        {saveSuccess && (
          <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-sm text-green-800 dark:text-green-300">
              Settings saved successfully!
            </p>
          </div>
        )}

        {saveError && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p className="text-sm text-red-800 dark:text-red-300">{saveError}</p>
          </div>
        )}

        {/* Organization Info */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Building2 className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
                Organization Details
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                Basic information about your organization
              </p>

              <div>
                <label
                  htmlFor="org-name"
                  className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2"
                >
                  Organization Name
                </label>
                <input
                  id="org-name"
                  type="text"
                  value={organizationName}
                  onChange={(e) => setOrganizationName(e.target.value)}
                  disabled
                  className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Contact support to change your organization name
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 mb-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-1">
            Features
          </h2>
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
            Enable or disable features for your organization
          </p>

          <div className="space-y-4">
            {/* Deal Pipeline */}
            <label className="flex items-start gap-4 p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={features.deal_pipeline}
                onChange={() => toggleFeature("deal_pipeline")}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              <div className="flex-1">
                <div className="font-medium text-slate-900 dark:text-white mb-1">
                  Deal Pipeline
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Track properties through your investment pipeline from research to closing
                </div>
              </div>
            </label>

            {/* Watchlists */}
            <label className="flex items-start gap-4 p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={features.shared_watchlists}
                onChange={() => toggleFeature("shared_watchlists")}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              <div className="flex-1">
                <div className="font-medium text-slate-900 dark:text-white mb-1">
                  Shared Watchlists
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Create and share watchlists with your team members
                </div>
              </div>
            </label>

            {/* Audit Log */}
            <label className="flex items-start gap-4 p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={features.audit_log}
                onChange={() => toggleFeature("audit_log")}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              <div className="flex-1">
                <div className="font-medium text-slate-900 dark:text-white mb-1">
                  Audit Log
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Track all actions and changes for compliance and security
                </div>
              </div>
            </label>

            {/* Advanced Analytics */}
            <label className="flex items-start gap-4 p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer">
              <input
                type="checkbox"
                checked={features.advanced_analytics}
                onChange={() => toggleFeature("advanced_analytics")}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              <div className="flex-1">
                <div className="font-medium text-slate-900 dark:text-white mb-1">
                  Advanced Analytics
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Access detailed reports and analytics for your investment portfolio
                </div>
              </div>
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={() => router.push("/team")}
            disabled={isSaving}
            className="px-6 py-2 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" aria-hidden="true" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </main>
    </div>
  )
}

export default function TeamSettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
          <Header />
          <div className="container mx-auto px-4 py-8">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/4"></div>
              <div className="h-64 bg-slate-200 dark:bg-slate-700 rounded"></div>
            </div>
          </div>
        </div>
      }
    >
      <TeamSettingsContent />
    </Suspense>
  )
}
