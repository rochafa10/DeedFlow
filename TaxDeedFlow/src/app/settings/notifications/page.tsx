"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Bell,
  Mail,
  Save,
  ArrowLeft,
  User,
  Shield,
  Key,
  AlertTriangle,
  Calendar,
  FileText,
  CheckCircle,
} from "lucide-react"
import { Header } from "@/components/layout/Header"
import { useAuth } from "@/contexts/AuthContext"

type DigestFrequency = "realtime" | "daily" | "weekly" | "never"

interface NotificationSettings {
  emailNotifications: boolean
  pushNotifications: boolean
  digestFrequency: DigestFrequency
  auctionAlerts: boolean
  propertyUpdates: boolean
  systemAlerts: boolean
  weeklyDigest: boolean
}

const DEFAULT_SETTINGS: NotificationSettings = {
  emailNotifications: true,
  pushNotifications: false,
  digestFrequency: "daily",
  auctionAlerts: true,
  propertyUpdates: true,
  systemAlerts: true,
  weeklyDigest: false,
}

export default function SettingsNotificationsPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()

  // Form state
  const [settings, setSettings] = useState<NotificationSettings>(DEFAULT_SETTINGS)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem("notificationSettings")
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings))
    }
  }, [])

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

  // Handle save
  const handleSave = () => {
    setIsSaving(true)
    setSaveSuccess(false)
    setTimeout(() => {
      localStorage.setItem("notificationSettings", JSON.stringify(settings))
      setIsSaving(false)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 3000)
    }, 1000)
  }

  // Toggle helper
  const toggleSetting = (key: keyof NotificationSettings) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const SETTINGS_TABS = [
    { id: "profile", label: "Profile", icon: <User className="h-4 w-4" />, active: false },
    { id: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" />, active: true },
    { id: "security", label: "Security", icon: <Shield className="h-4 w-4" />, active: false },
    { id: "api", label: "API Keys", icon: <Key className="h-4 w-4" />, active: false },
  ]

  const DIGEST_OPTIONS = [
    { value: "realtime", label: "Real-time" },
    { value: "daily", label: "Daily digest" },
    { value: "weekly", label: "Weekly digest" },
    { value: "never", label: "Never" },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

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
            <Bell className="h-6 w-6 text-primary" />
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
                  onClick={() => router.push(`/settings/${tab.id}`)}
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
          </div>

          {/* Notifications Form */}
          <div className="flex-1">
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">Notification Settings</h2>
                <p className="text-sm text-slate-500">Choose how you want to receive notifications</p>
              </div>

              <div className="p-6 space-y-6">
                {/* Email Notifications Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <Mail className="h-5 w-5 text-slate-400 mt-0.5" />
                    <div>
                      <div className="font-medium text-slate-900">Email Notifications</div>
                      <div className="text-sm text-slate-500">Receive notifications via email</div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleSetting("emailNotifications")}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                      settings.emailNotifications ? "bg-primary" : "bg-slate-200"
                    )}
                    role="switch"
                    aria-checked={settings.emailNotifications}
                    aria-label="Toggle email notifications"
                  >
                    <span
                      className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                        settings.emailNotifications ? "translate-x-6" : "translate-x-1"
                      )}
                    />
                  </button>
                </div>

                {/* Push Notifications Toggle */}
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <Bell className="h-5 w-5 text-slate-400 mt-0.5" />
                    <div>
                      <div className="font-medium text-slate-900">Push Notifications</div>
                      <div className="text-sm text-slate-500">Receive browser push notifications</div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleSetting("pushNotifications")}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                      settings.pushNotifications ? "bg-primary" : "bg-slate-200"
                    )}
                    role="switch"
                    aria-checked={settings.pushNotifications}
                    aria-label="Toggle push notifications"
                  >
                    <span
                      className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                        settings.pushNotifications ? "translate-x-6" : "translate-x-1"
                      )}
                    />
                  </button>
                </div>

                {/* Email Digest Frequency */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email Digest Frequency
                  </label>
                  <select
                    value={settings.digestFrequency}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        digestFrequency: e.target.value as DigestFrequency,
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    {DIGEST_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="border-t border-slate-200 pt-6">
                  <h3 className="font-medium text-slate-900 mb-4">Notification Types</h3>

                  {/* Auction Alerts */}
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-start gap-3">
                      <Calendar className="h-5 w-5 text-amber-500 mt-0.5" />
                      <div>
                        <div className="font-medium text-slate-900">Auction Alerts</div>
                        <div className="text-sm text-slate-500">
                          Deadlines, new auctions, and registration reminders
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleSetting("auctionAlerts")}
                      className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                        settings.auctionAlerts ? "bg-primary" : "bg-slate-200"
                      )}
                      role="switch"
                      aria-checked={settings.auctionAlerts}
                      aria-label="Toggle auction alerts"
                    >
                      <span
                        className={cn(
                          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                          settings.auctionAlerts ? "translate-x-6" : "translate-x-1"
                        )}
                      />
                    </button>
                  </div>

                  {/* Property Updates */}
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-start gap-3">
                      <FileText className="h-5 w-5 text-blue-500 mt-0.5" />
                      <div>
                        <div className="font-medium text-slate-900">Property Updates</div>
                        <div className="text-sm text-slate-500">
                          New properties, status changes, and research updates
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleSetting("propertyUpdates")}
                      className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                        settings.propertyUpdates ? "bg-primary" : "bg-slate-200"
                      )}
                      role="switch"
                      aria-checked={settings.propertyUpdates}
                      aria-label="Toggle property updates"
                    >
                      <span
                        className={cn(
                          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                          settings.propertyUpdates ? "translate-x-6" : "translate-x-1"
                        )}
                      />
                    </button>
                  </div>

                  {/* System Alerts */}
                  <div className="flex items-center justify-between py-3">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                      <div>
                        <div className="font-medium text-slate-900">System Alerts</div>
                        <div className="text-sm text-slate-500">
                          Data integrity issues, job failures, and system status
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => toggleSetting("systemAlerts")}
                      className={cn(
                        "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                        settings.systemAlerts ? "bg-primary" : "bg-slate-200"
                      )}
                      role="switch"
                      aria-checked={settings.systemAlerts}
                      aria-label="Toggle system alerts"
                    >
                      <span
                        className={cn(
                          "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                          settings.systemAlerts ? "translate-x-6" : "translate-x-1"
                        )}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <div>
                  {saveSuccess && (
                    <span className="text-sm text-green-600 flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" />
                      Settings saved successfully!
                    </span>
                  )}
                </div>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors",
                    isSaving
                      ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                      : "bg-primary text-white hover:bg-primary/90"
                  )}
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
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
