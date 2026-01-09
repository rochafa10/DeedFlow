"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import {
  User,
  Mail,
  Sun,
  Moon,
  Monitor,
  Save,
  ArrowLeft,
  Camera,
  Bell,
  Shield,
  Key,
  AlertTriangle,
  X,
  Users,
} from "lucide-react"
import { Header } from "@/components/layout/Header"
import { useAuth } from "@/contexts/AuthContext"
import { useUnsavedChanges } from "@/hooks/useUnsavedChanges"
import { toast } from "sonner"

type Theme = "light" | "dark" | "system"

export default function SettingsProfilePage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading, user } = useAuth()
  const { theme: currentTheme, setTheme: setGlobalTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Form state
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [theme, setTheme] = useState<Theme>("system")
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  // Track initial values to detect changes
  const initialValuesRef = useRef({ name: "", email: "", theme: "system" as Theme })
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // Use the unsaved changes hook
  const { showDialog, confirmNavigation, cancelNavigation, handleNavigation } = useUnsavedChanges(hasUnsavedChanges)

  // Initialize form with user data (check localStorage first, then fall back to user data)
  useEffect(() => {
    // Check localStorage for saved profile
    const savedProfile = localStorage.getItem("userProfile")
    let initialName = "Demo User"
    let initialEmail = "demo@taxdeedflow.com"
    // Use the global theme from next-themes
    let initialTheme: Theme = (currentTheme as Theme) || "system"

    if (savedProfile) {
      const profile = JSON.parse(savedProfile)
      initialName = profile.name || "Demo User"
      initialEmail = profile.email || "demo@taxdeedflow.com"
    } else if (user) {
      initialName = user.name || "Demo User"
      initialEmail = user.email || "demo@taxdeedflow.com"
    }

    setName(initialName)
    setEmail(initialEmail)
    setTheme(initialTheme)

    // Store initial values for dirty checking
    initialValuesRef.current = { name: initialName, email: initialEmail, theme: initialTheme }
  }, [user, currentTheme])

  // Check for unsaved changes whenever form values change
  useEffect(() => {
    const initial = initialValuesRef.current
    const isDirty = name !== initial.name || email !== initial.email || theme !== initial.theme
    setHasUnsavedChanges(isDirty)
  }, [name, email, theme])

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
    // Save to localStorage and apply theme globally
    setTimeout(() => {
      localStorage.setItem("userProfile", JSON.stringify({ name, email, theme }))
      // Apply theme globally via next-themes
      setGlobalTheme(theme)
      // Update initial values so form is no longer dirty
      initialValuesRef.current = { name, email, theme }
      setHasUnsavedChanges(false)
      setIsSaving(false)
      setSaveSuccess(true)
      // Show success toast
      toast.success("Profile updated successfully!", {
        description: "Your changes have been saved.",
      })
      // Clear success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000)
    }, 1000)
  }

  // Safe navigation that checks for unsaved changes
  const safeNavigate = (path: string) => {
    handleNavigation(() => router.push(path))
  }

  const THEME_OPTIONS = [
    { value: "light", label: "Light", icon: <Sun className="h-4 w-4" /> },
    { value: "dark", label: "Dark", icon: <Moon className="h-4 w-4" /> },
    { value: "system", label: "System", icon: <Monitor className="h-4 w-4" /> },
  ]

  const SETTINGS_TABS = [
    { id: "profile", label: "Profile", icon: <User className="h-4 w-4" />, active: true },
    { id: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" />, active: false },
    { id: "security", label: "Security", icon: <Shield className="h-4 w-4" />, active: false },
    { id: "api", label: "API Keys", icon: <Key className="h-4 w-4" />, active: false },
  ]

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => safeNavigate("/")}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </button>

        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <User className="h-6 w-6 text-primary" />
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
                  onClick={() => !tab.active && safeNavigate(`/settings/${tab.id}`)}
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

          {/* Profile Form */}
          <div className="flex-1">
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">Profile Settings</h2>
                <p className="text-sm text-slate-500">Update your personal information</p>
              </div>

              <div className="p-6 space-y-6">
                {/* Avatar Section */}
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-20 h-20 rounded-full bg-primary text-white flex items-center justify-center text-2xl font-bold">
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <button className="absolute bottom-0 right-0 p-1.5 bg-white rounded-full border border-slate-200 shadow-sm hover:bg-slate-50">
                      <Camera className="h-4 w-4 text-slate-600" />
                    </button>
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">{name}</div>
                    <div className="text-sm text-slate-500">{email}</div>
                  </div>
                </div>

                {/* Name Field */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      id="name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your name"
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Email Field */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email"
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Theme Selector */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2 dark:text-slate-300">
                    Theme Preference
                  </label>
                  <div className="flex gap-2">
                    {THEME_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setTheme(option.value as Theme)
                          // Apply theme immediately for instant feedback
                          setGlobalTheme(option.value)
                        }}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-colors",
                          theme === option.value
                            ? "bg-primary text-white border-primary"
                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600 dark:hover:border-slate-500"
                        )}
                      >
                        {option.icon}
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                <div>
                  {saveSuccess && (
                    <span className="text-sm text-green-600 flex items-center gap-1">
                      <Save className="h-4 w-4" />
                      Changes saved successfully!
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

      {/* Unsaved Changes Dialog */}
      {showDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Unsaved Changes</h3>
                <p className="text-sm text-slate-500">You have unsaved changes that will be lost.</p>
              </div>
              <button
                onClick={cancelNavigation}
                className="ml-auto p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-4">
              <p className="text-slate-600">
                Are you sure you want to leave this page? Your changes have not been saved and will be lost.
              </p>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-200">
              <button
                onClick={cancelNavigation}
                className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Stay on Page
              </button>
              <button
                onClick={confirmNavigation}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Leave Page
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ")
}
