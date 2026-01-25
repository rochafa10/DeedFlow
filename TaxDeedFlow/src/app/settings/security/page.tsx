"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Shield,
  Save,
  ArrowLeft,
  User,
  Bell,
  Key,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  Smartphone,
  History,
  AlertTriangle,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"

interface SecuritySettings {
  twoFactorEnabled: boolean
  sessionTimeout: number
  loginNotifications: boolean
}

const DEFAULT_SETTINGS: SecuritySettings = {
  twoFactorEnabled: false,
  sessionTimeout: 30,
  loginNotifications: true,
}

export default function SettingsSecurityPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()

  // Form state
  const [settings, setSettings] = useState<SecuritySettings>(DEFAULT_SETTINGS)
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem("securitySettings")
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

  // Handle save security settings
  const handleSaveSettings = () => {
    setIsSaving(true)
    setSaveSuccess(false)
    setTimeout(() => {
      localStorage.setItem("securitySettings", JSON.stringify(settings))
      setIsSaving(false)
      setSaveSuccess(true)
      toast.success("Security settings saved successfully!")
      setTimeout(() => setSaveSuccess(false), 3000)
    }, 1000)
  }

  // Handle password change
  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("Please fill in all password fields")
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match")
      return
    }
    if (newPassword.length < 8) {
      toast.error("Password must be at least 8 characters long")
      return
    }

    // Simulate password change
    setIsSaving(true)
    setTimeout(() => {
      setIsSaving(false)
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      toast.success("Password changed successfully!")
    }, 1500)
  }

  // Toggle helper
  const toggleSetting = (key: keyof SecuritySettings) => {
    setSettings((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const SETTINGS_TABS = [
    { id: "profile", label: "Profile", icon: <User className="h-4 w-4" />, active: false },
    { id: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" />, active: false },
    { id: "security", label: "Security", icon: <Shield className="h-4 w-4" />, active: true },
    { id: "api", label: "API Keys", icon: <Key className="h-4 w-4" />, active: false },
  ]

  const SESSION_TIMEOUT_OPTIONS = [
    { value: 15, label: "15 minutes" },
    { value: 30, label: "30 minutes" },
    { value: 60, label: "1 hour" },
    { value: 120, label: "2 hours" },
    { value: 480, label: "8 hours" },
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>

        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Settings
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
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
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
                  )}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Security Form */}
          <div className="flex-1 space-y-6">
            {/* Password Change Section */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Change Password
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Update your password to keep your account secure</p>
              </div>

              <div className="p-6 space-y-4">
                {/* Current Password */}
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Current Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      id="currentPassword"
                      type={showCurrentPassword ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                      className="w-full pl-10 pr-10 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-slate-700 dark:text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      aria-pressed={showCurrentPassword}
                      aria-label={showCurrentPassword ? "Hide current password" : "Show current password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      id="newPassword"
                      type={showNewPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full pl-10 pr-10 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-slate-700 dark:text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      aria-pressed={showNewPassword}
                      aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                    </button>
                  </div>
                </div>

                {/* Confirm Password */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full pl-10 pr-10 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-slate-700 dark:text-slate-100"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      aria-pressed={showConfirmPassword}
                      aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleChangePassword}
                  disabled={isSaving}
                  className="w-full md:w-auto px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? "Updating..." : "Update Password"}
                </button>
              </div>
            </div>

            {/* Two-Factor Authentication */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Two-Factor Authentication
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Add an extra layer of security to your account</p>
              </div>

              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "p-2 rounded-lg",
                      settings.twoFactorEnabled ? "bg-green-100 dark:bg-green-900" : "bg-slate-100 dark:bg-slate-700"
                    )}>
                      <Smartphone className={cn(
                        "h-5 w-5",
                        settings.twoFactorEnabled ? "text-green-600 dark:text-green-400" : "text-slate-400"
                      )} />
                    </div>
                    <div>
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {settings.twoFactorEnabled ? "2FA Enabled" : "2FA Disabled"}
                      </div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        {settings.twoFactorEnabled
                          ? "Your account is protected with two-factor authentication"
                          : "Enable two-factor authentication for enhanced security"}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleSetting("twoFactorEnabled")}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                      settings.twoFactorEnabled ? "bg-primary" : "bg-slate-200 dark:bg-slate-600"
                    )}
                    role="switch"
                    aria-checked={settings.twoFactorEnabled}
                  >
                    <span
                      className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                        settings.twoFactorEnabled ? "translate-x-6" : "translate-x-1"
                      )}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Session Settings */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Session Settings
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400">Manage your session security preferences</p>
              </div>

              <div className="p-6 space-y-6">
                {/* Session Timeout */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    Session Timeout
                  </label>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-2">
                    Automatically log out after a period of inactivity
                  </p>
                  <select
                    value={settings.sessionTimeout}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        sessionTimeout: parseInt(e.target.value),
                      }))
                    }
                    className="w-full md:w-64 px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-slate-700 dark:text-slate-100"
                  >
                    {SESSION_TIMEOUT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Login Notifications */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5" />
                    <div>
                      <div className="font-medium text-slate-900 dark:text-slate-100">Login Notifications</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        Receive email alerts for new sign-ins to your account
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => toggleSetting("loginNotifications")}
                    className={cn(
                      "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                      settings.loginNotifications ? "bg-primary" : "bg-slate-200 dark:bg-slate-600"
                    )}
                    role="switch"
                    aria-checked={settings.loginNotifications}
                  >
                    <span
                      className={cn(
                        "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                        settings.loginNotifications ? "translate-x-6" : "translate-x-1"
                      )}
                    />
                  </button>
                </div>
              </div>

              {/* Save Button */}
              <div className="px-6 py-4 bg-slate-50 dark:bg-slate-700/50 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  {saveSuccess && (
                    <span className="text-sm text-green-600 flex items-center gap-1">
                      <CheckCircle className="h-4 w-4" />
                      Settings saved successfully!
                    </span>
                  )}
                </div>
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
          </div>
        </div>
      </main>
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}
