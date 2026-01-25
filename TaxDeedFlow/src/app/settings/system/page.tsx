"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  User,
  ArrowLeft,
  Bell,
  Shield,
  Key,
  Link2,
  Settings,
  Database,
  Clock,
  Trash2,
  RefreshCw,
  Download,
  Upload,
  AlertTriangle,
  CheckCircle2,
  Save,
  Server,
  HardDrive,
  Activity,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"

// System health status
type HealthStatus = "healthy" | "warning" | "critical"

const SYSTEM_HEALTH = {
  database: { status: "healthy" as HealthStatus, message: "All connections healthy", latency: "12ms" },
  storage: { status: "healthy" as HealthStatus, message: "72% capacity used", used: "14.4 GB", total: "20 GB" },
  api: { status: "healthy" as HealthStatus, message: "All endpoints responding", uptime: "99.9%" },
  workers: { status: "warning" as HealthStatus, message: "1 worker restarted today", active: 3, total: 4 },
}

const HEALTH_CONFIG: Record<HealthStatus, { color: string; bgColor: string; icon: React.ReactNode }> = {
  healthy: {
    color: "text-green-600",
    bgColor: "bg-green-100",
    icon: <CheckCircle2 className="h-5 w-5 text-green-600" />,
  },
  warning: {
    color: "text-amber-600",
    bgColor: "bg-amber-100",
    icon: <AlertTriangle className="h-5 w-5 text-amber-600" />,
  },
  critical: {
    color: "text-red-600",
    bgColor: "bg-red-100",
    icon: <AlertTriangle className="h-5 w-5 text-red-600" />,
  },
}

// System settings
const INITIAL_SETTINGS = {
  dataRetentionDays: 365,
  maxConcurrentJobs: 5,
  autoBackupEnabled: true,
  backupFrequency: "daily",
  maintenanceMode: false,
  debugLogging: false,
  emailNotifications: true,
  slackNotifications: false,
}

export default function SettingsSystemPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading, user } = useAuth()
  const [settings, setSettings] = useState(INITIAL_SETTINGS)
  const [isSaving, setIsSaving] = useState(false)
  const [isClearing, setIsClearing] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

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

  const handleSaveSettings = () => {
    setIsSaving(true)
    setTimeout(() => {
      setIsSaving(false)
      toast.success("System settings saved successfully!")
    }, 1500)
  }

  const handleClearCache = () => {
    setIsClearing(true)
    setTimeout(() => {
      setIsClearing(false)
      toast.success("Cache cleared successfully!")
    }, 2000)
  }

  const handleExportData = () => {
    setIsExporting(true)
    setTimeout(() => {
      setIsExporting(false)
      toast.success("Data export started. You'll receive an email when ready.")
    }, 1500)
  }

  const SETTINGS_TABS = [
    { id: "profile", label: "Profile", icon: <User className="h-4 w-4" />, active: false },
    { id: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" />, active: false },
    { id: "integrations", label: "Integrations", icon: <Link2 className="h-4 w-4" />, active: false },
    { id: "system", label: "System", icon: <Settings className="h-4 w-4" />, active: true },
    { id: "security", label: "Security", icon: <Shield className="h-4 w-4" />, active: false },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>

        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            Settings
          </h1>
          <p className="text-slate-600 mt-1">
            Manage your account settings and preferences
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Settings Sidebar */}
          <div className="md:w-48 flex-shrink-0">
            <nav className="space-y-1">
              {SETTINGS_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => !tab.active && router.push(`/settings/${tab.id}`)}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                    tab.active
                      ? "bg-primary text-white"
                      : "text-slate-600 hover:bg-slate-100"
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* Admin Badge */}
            <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 text-amber-700">
                <Shield className="h-4 w-4" />
                <span className="text-sm font-medium">Admin Access</span>
              </div>
              <p className="text-xs text-amber-600 mt-1">
                You have full system access
              </p>
            </div>
          </div>

          {/* System Settings Content */}
          <div className="flex-1 space-y-6">
            {/* System Health */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold text-slate-900">System Health</h2>
                </div>
                <p className="text-sm text-slate-500 mt-1">Current status of system components</p>
              </div>

              <div className="grid grid-cols-2 gap-4 p-6">
                {/* Database */}
                <div className={cn("p-4 rounded-lg border", HEALTH_CONFIG[SYSTEM_HEALTH.database.status].bgColor, "border-transparent")}>
                  <div className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-slate-600" />
                    <span className="font-medium text-slate-900">Database</span>
                    {HEALTH_CONFIG[SYSTEM_HEALTH.database.status].icon}
                  </div>
                  <p className="text-sm text-slate-600 mt-1">{SYSTEM_HEALTH.database.message}</p>
                  <p className="text-xs text-slate-500 mt-1">Latency: {SYSTEM_HEALTH.database.latency}</p>
                </div>

                {/* Storage */}
                <div className={cn("p-4 rounded-lg border", HEALTH_CONFIG[SYSTEM_HEALTH.storage.status].bgColor, "border-transparent")}>
                  <div className="flex items-center gap-2">
                    <HardDrive className="h-5 w-5 text-slate-600" />
                    <span className="font-medium text-slate-900">Storage</span>
                    {HEALTH_CONFIG[SYSTEM_HEALTH.storage.status].icon}
                  </div>
                  <p className="text-sm text-slate-600 mt-1">{SYSTEM_HEALTH.storage.message}</p>
                  <p className="text-xs text-slate-500 mt-1">{SYSTEM_HEALTH.storage.used} / {SYSTEM_HEALTH.storage.total}</p>
                </div>

                {/* API */}
                <div className={cn("p-4 rounded-lg border", HEALTH_CONFIG[SYSTEM_HEALTH.api.status].bgColor, "border-transparent")}>
                  <div className="flex items-center gap-2">
                    <Server className="h-5 w-5 text-slate-600" />
                    <span className="font-medium text-slate-900">API</span>
                    {HEALTH_CONFIG[SYSTEM_HEALTH.api.status].icon}
                  </div>
                  <p className="text-sm text-slate-600 mt-1">{SYSTEM_HEALTH.api.message}</p>
                  <p className="text-xs text-slate-500 mt-1">Uptime: {SYSTEM_HEALTH.api.uptime}</p>
                </div>

                {/* Workers */}
                <div className={cn("p-4 rounded-lg border", HEALTH_CONFIG[SYSTEM_HEALTH.workers.status].bgColor, "border-transparent")}>
                  <div className="flex items-center gap-2">
                    <Activity className="h-5 w-5 text-slate-600" />
                    <span className="font-medium text-slate-900">Workers</span>
                    {HEALTH_CONFIG[SYSTEM_HEALTH.workers.status].icon}
                  </div>
                  <p className="text-sm text-slate-600 mt-1">{SYSTEM_HEALTH.workers.message}</p>
                  <p className="text-xs text-slate-500 mt-1">{SYSTEM_HEALTH.workers.active} / {SYSTEM_HEALTH.workers.total} active</p>
                </div>
              </div>
            </div>

            {/* General Settings */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">General Settings</h2>
                <p className="text-sm text-slate-500 mt-1">Configure system-wide settings</p>
              </div>

              <div className="p-6 space-y-6">
                {/* Data Retention */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Data Retention Period
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={settings.dataRetentionDays}
                      onChange={(e) => setSettings({ ...settings, dataRetentionDays: parseInt(e.target.value) })}
                      className="w-24 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                    <span className="text-sm text-slate-500">days</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    How long to retain historical data before archiving
                  </p>
                </div>

                {/* Max Concurrent Jobs */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Max Concurrent Jobs
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={settings.maxConcurrentJobs}
                      onChange={(e) => setSettings({ ...settings, maxConcurrentJobs: parseInt(e.target.value) })}
                      min={1}
                      max={10}
                      className="w-24 px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                    <span className="text-sm text-slate-500">jobs</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Maximum number of background jobs that can run simultaneously
                  </p>
                </div>

                {/* Toggle Settings */}
                <div className="space-y-4">
                  {/* Maintenance Mode */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-slate-700">Maintenance Mode</div>
                      <div className="text-xs text-slate-500">Disable user access during maintenance</div>
                    </div>
                    <button
                      onClick={() => setSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })}
                      className={cn(
                        "relative w-11 h-6 rounded-full transition-colors",
                        settings.maintenanceMode ? "bg-amber-500" : "bg-slate-200"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform",
                          settings.maintenanceMode && "translate-x-5"
                        )}
                      />
                    </button>
                  </div>

                  {/* Debug Logging */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-slate-700">Debug Logging</div>
                      <div className="text-xs text-slate-500">Enable verbose logging for troubleshooting</div>
                    </div>
                    <button
                      onClick={() => setSettings({ ...settings, debugLogging: !settings.debugLogging })}
                      className={cn(
                        "relative w-11 h-6 rounded-full transition-colors",
                        settings.debugLogging ? "bg-primary" : "bg-slate-200"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform",
                          settings.debugLogging && "translate-x-5"
                        )}
                      />
                    </button>
                  </div>

                  {/* Auto Backup */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium text-slate-700">Automatic Backups</div>
                      <div className="text-xs text-slate-500">Automatically backup data on schedule</div>
                    </div>
                    <button
                      onClick={() => setSettings({ ...settings, autoBackupEnabled: !settings.autoBackupEnabled })}
                      className={cn(
                        "relative w-11 h-6 rounded-full transition-colors",
                        settings.autoBackupEnabled ? "bg-primary" : "bg-slate-200"
                      )}
                    >
                      <span
                        className={cn(
                          "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform",
                          settings.autoBackupEnabled && "translate-x-5"
                        )}
                      />
                    </button>
                  </div>
                </div>

                {/* Backup Frequency */}
                {settings.autoBackupEnabled && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Backup Frequency
                    </label>
                    <select
                      value={settings.backupFrequency}
                      onChange={(e) => setSettings({ ...settings, backupFrequency: e.target.value })}
                      className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    >
                      <option value="hourly">Hourly</option>
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                )}
              </div>

              {/* Save Button */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                <button
                  onClick={handleSaveSettings}
                  disabled={isSaving}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors",
                    isSaving
                      ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                      : "bg-primary text-white hover:bg-primary/90"
                  )}
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </div>

            {/* Maintenance Actions */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">Maintenance Actions</h2>
                <p className="text-sm text-slate-500 mt-1">System maintenance and data management</p>
              </div>

              <div className="p-6 space-y-4">
                {/* Clear Cache */}
                <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <RefreshCw className="h-5 w-5 text-slate-600" />
                      <span className="font-medium text-slate-900">Clear Cache</span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">Clear all cached data and regenerate</p>
                  </div>
                  <button
                    onClick={handleClearCache}
                    disabled={isClearing}
                    className={cn(
                      "flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors",
                      isClearing
                        ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                        : "text-slate-600 border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    <RefreshCw className={cn("h-4 w-4", isClearing && "animate-spin")} />
                    {isClearing ? "Clearing..." : "Clear Cache"}
                  </button>
                </div>

                {/* Export Data */}
                <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                  <div>
                    <div className="flex items-center gap-2">
                      <Download className="h-5 w-5 text-slate-600" />
                      <span className="font-medium text-slate-900">Export All Data</span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">Download a complete backup of all data</p>
                  </div>
                  <button
                    onClick={handleExportData}
                    disabled={isExporting}
                    className={cn(
                      "flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors",
                      isExporting
                        ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                        : "text-slate-600 border-slate-200 hover:bg-slate-50"
                    )}
                  >
                    <Download className="h-4 w-4" />
                    {isExporting ? "Exporting..." : "Export"}
                  </button>
                </div>

                {/* Danger Zone */}
                <div className="mt-6 p-4 border border-red-200 rounded-lg bg-red-50">
                  <div className="flex items-center gap-2 text-red-700">
                    <AlertTriangle className="h-5 w-5" />
                    <span className="font-medium">Danger Zone</span>
                  </div>
                  <p className="text-sm text-red-600 mt-2">
                    These actions are irreversible. Please proceed with caution.
                  </p>
                  <div className="mt-4 flex gap-3">
                    <button className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-100">
                      <Trash2 className="h-4 w-4" />
                      Purge Old Data
                    </button>
                    <button className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-red-600 border border-red-300 rounded-lg hover:bg-red-100">
                      <RefreshCw className="h-4 w-4" />
                      Reset System
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}
