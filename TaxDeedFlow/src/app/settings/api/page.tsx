"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Key,
  Save,
  ArrowLeft,
  User,
  Bell,
  Shield,
  Plus,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"

interface APIKey {
  id: string
  name: string
  key: string
  createdAt: string
  lastUsed: string | null
  permissions: string[]
}

export default function SettingsAPIKeysPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()

  // State
  const [apiKeys, setApiKeys] = useState<APIKey[]>([])
  const [isCreating, setIsCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState("")
  const [newKeyPermissions, setNewKeyPermissions] = useState<string[]>(["read"])
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set())
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null)

  // Load API keys from localStorage
  useEffect(() => {
    const savedKeys = localStorage.getItem("apiKeys")
    if (savedKeys) {
      setApiKeys(JSON.parse(savedKeys))
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

  // Generate a random API key
  const generateAPIKey = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let key = 'tdf_'
    for (let i = 0; i < 32; i++) {
      key += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return key
  }

  // Create new API key
  const handleCreateKey = () => {
    if (!newKeyName.trim()) {
      toast.error("Please enter a name for the API key")
      return
    }

    const newKey: APIKey = {
      id: crypto.randomUUID(),
      name: newKeyName.trim(),
      key: generateAPIKey(),
      createdAt: new Date().toISOString(),
      lastUsed: null,
      permissions: newKeyPermissions,
    }

    const updatedKeys = [...apiKeys, newKey]
    setApiKeys(updatedKeys)
    localStorage.setItem("apiKeys", JSON.stringify(updatedKeys))

    // Reset form
    setNewKeyName("")
    setNewKeyPermissions(["read"])
    setIsCreating(false)

    // Auto-reveal the new key
    setRevealedKeys((prev) => new Set(prev).add(newKey.id))

    toast.success("API key created successfully!", {
      description: "Make sure to copy your key now. You won't be able to see it again."
    })
  }

  // Delete API key
  const handleDeleteKey = (id: string) => {
    const updatedKeys = apiKeys.filter((k) => k.id !== id)
    setApiKeys(updatedKeys)
    localStorage.setItem("apiKeys", JSON.stringify(updatedKeys))
    setShowDeleteDialog(null)
    toast.success("API key deleted")
  }

  // Copy key to clipboard
  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key)
    toast.success("API key copied to clipboard")
  }

  // Toggle key visibility
  const toggleKeyVisibility = (id: string) => {
    setRevealedKeys((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  // Toggle permission
  const togglePermission = (permission: string) => {
    setNewKeyPermissions((prev) =>
      prev.includes(permission)
        ? prev.filter((p) => p !== permission)
        : [...prev, permission]
    )
  }

  // Mask API key
  const maskKey = (key: string) => {
    return key.substring(0, 8) + '••••••••••••••••••••••••' + key.substring(key.length - 4)
  }

  const SETTINGS_TABS = [
    { id: "profile", label: "Profile", icon: <User className="h-4 w-4" />, active: false },
    { id: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" />, active: false },
    { id: "security", label: "Security", icon: <Shield className="h-4 w-4" />, active: false },
    { id: "api", label: "API Keys", icon: <Key className="h-4 w-4" />, active: true },
  ]

  const PERMISSIONS = [
    { id: "read", label: "Read", description: "View data and run queries" },
    { id: "write", label: "Write", description: "Create and modify data" },
    { id: "delete", label: "Delete", description: "Delete data permanently" },
    { id: "admin", label: "Admin", description: "Full administrative access" },
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
            <Key className="h-6 w-6 text-primary" />
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

          {/* API Keys Content */}
          <div className="flex-1 space-y-6">
            {/* API Keys Header */}
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">API Keys</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Manage your API keys for programmatic access</p>
                </div>
                {!isCreating && (
                  <button
                    onClick={() => setIsCreating(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90"
                  >
                    <Plus className="h-4 w-4" />
                    Create Key
                  </button>
                )}
              </div>

              {/* Create New Key Form */}
              {isCreating && (
                <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-700/50">
                  <h3 className="font-medium text-slate-900 dark:text-slate-100 mb-4">Create New API Key</h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Key Name
                      </label>
                      <input
                        type="text"
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        placeholder="e.g., Production Server"
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-slate-700 dark:text-slate-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                        Permissions
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {PERMISSIONS.map((permission) => (
                          <label
                            key={permission.id}
                            className={cn(
                              "flex items-start gap-3 p-3 border rounded-lg cursor-pointer transition-colors",
                              newKeyPermissions.includes(permission.id)
                                ? "border-primary bg-primary/5"
                                : "border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700"
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={newKeyPermissions.includes(permission.id)}
                              onChange={() => togglePermission(permission.id)}
                              className="mt-0.5 h-4 w-4 text-primary focus:ring-primary rounded"
                            />
                            <div>
                              <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                {permission.label}
                              </div>
                              <div className="text-xs text-slate-500 dark:text-slate-400">
                                {permission.description}
                              </div>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={handleCreateKey}
                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90"
                      >
                        <Key className="h-4 w-4" />
                        Create API Key
                      </button>
                      <button
                        onClick={() => {
                          setIsCreating(false)
                          setNewKeyName("")
                          setNewKeyPermissions(["read"])
                        }}
                        className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* API Keys List */}
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                {apiKeys.length === 0 ? (
                  <div className="p-8 text-center">
                    <Key className="h-12 w-12 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-1">No API Keys</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">
                      Create your first API key to access the Tax Deed Flow API
                    </p>
                    {!isCreating && (
                      <button
                        onClick={() => setIsCreating(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90"
                      >
                        <Plus className="h-4 w-4" />
                        Create API Key
                      </button>
                    )}
                  </div>
                ) : (
                  apiKeys.map((apiKey) => (
                    <div key={apiKey.id} className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-slate-900 dark:text-slate-100">{apiKey.name}</h4>
                            <div className="flex gap-1">
                              {apiKey.permissions.map((perm) => (
                                <span
                                  key={perm}
                                  className="px-2 py-0.5 text-xs font-medium bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded"
                                >
                                  {perm}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="mt-1 flex items-center gap-2">
                            <code className="text-sm font-mono text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                              {revealedKeys.has(apiKey.id) ? apiKey.key : maskKey(apiKey.key)}
                            </code>
                            <button
                              onClick={() => toggleKeyVisibility(apiKey.id)}
                              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                              title={revealedKeys.has(apiKey.id) ? "Hide key" : "Show key"}
                            >
                              {revealedKeys.has(apiKey.id) ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={() => handleCopyKey(apiKey.key)}
                              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                              title="Copy key"
                            >
                              <Copy className="h-4 w-4" />
                            </button>
                          </div>
                          <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                            Created: {new Date(apiKey.createdAt).toLocaleDateString()}
                            {apiKey.lastUsed && ` • Last used: ${new Date(apiKey.lastUsed).toLocaleDateString()}`}
                          </div>
                        </div>
                        <button
                          onClick={() => setShowDeleteDialog(apiKey.id)}
                          className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                          title="Delete key"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* API Documentation Link */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900 dark:text-blue-100">API Documentation</h4>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    Learn how to use your API keys to access the Tax Deed Flow API programmatically.
                    Include your API key in the <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">Authorization</code> header
                    as a Bearer token.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl max-w-md w-full mx-4 overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-red-100 dark:bg-red-900">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Delete API Key</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">This action cannot be undone</p>
              </div>
            </div>
            <div className="px-6 py-4">
              <p className="text-slate-600 dark:text-slate-400">
                Are you sure you want to delete this API key? Any applications using this key will lose access immediately.
              </p>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 bg-slate-50 dark:bg-slate-700/50 border-t border-slate-200 dark:border-slate-700">
              <button
                onClick={() => setShowDeleteDialog(null)}
                className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-600"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteKey(showDeleteDialog)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Delete Key
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
