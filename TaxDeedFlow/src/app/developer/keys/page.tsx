"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Key,
  ArrowLeft,
  Plus,
  Copy,
  Trash2,
  Eye,
  EyeOff,
  AlertTriangle,
  RefreshCw,
} from "lucide-react"
import { Header } from "@/components/layout/Header"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"
import type { ApiKey, ApiKeyWithSecret, CreateApiKeyRequest, ListApiKeysResponse, CreateApiKeyResponse } from "@/types/api"

export default function DeveloperAPIKeysPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()

  // State
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isCreating, setIsCreating] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [newKeyName, setNewKeyName] = useState("")
  const [newKeyPermissions, setNewKeyPermissions] = useState<string[]>(["read"])
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set())
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null)
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<ApiKeyWithSecret | null>(null)

  // Load API keys from API
  const fetchApiKeys = async () => {
    try {
      setIsLoading(true)
      const response = await fetch("/api/developer/keys")

      if (!response.ok) {
        throw new Error("Failed to fetch API keys")
      }

      const data: ListApiKeysResponse = await response.json()
      setApiKeys(data.data)
    } catch (error) {
      toast.error("Failed to load API keys")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      fetchApiKeys()
    }
  }, [isAuthenticated])

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  // Show loading state while checking auth
  if (authLoading || isLoading) {
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

  // Create new API key
  const handleCreateKey = async () => {
    if (!newKeyName.trim()) {
      toast.error("Please enter a name for the API key")
      return
    }

    if (newKeyPermissions.length === 0) {
      toast.error("Please select at least one permission")
      return
    }

    try {
      setIsSubmitting(true)
      const requestBody: CreateApiKeyRequest = {
        name: newKeyName.trim(),
        permissions: newKeyPermissions,
      }

      const response = await fetch("/api/developer/keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create API key")
      }

      const result: CreateApiKeyResponse = await response.json()

      // Store the newly created key with plaintext api_key
      setNewlyCreatedKey(result.data)

      // Refresh the list
      await fetchApiKeys()

      // Reset form
      setNewKeyName("")
      setNewKeyPermissions(["read"])
      setIsCreating(false)

      toast.success("API key created successfully!", {
        description: result.message,
      })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create API key")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Delete API key
  const handleDeleteKey = async (id: string) => {
    try {
      const response = await fetch(`/api/developer/keys/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to revoke API key")
      }

      // Remove from local state
      setApiKeys(apiKeys.filter((k) => k.id !== id))
      setShowDeleteDialog(null)
      toast.success("API key revoked successfully")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to revoke API key")
    }
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

  const PERMISSIONS = [
    { id: "read", label: "Read", description: "View data and run queries" },
    { id: "write", label: "Write", description: "Create and modify data" },
    { id: "delete", label: "Delete", description: "Delete data permanently" },
    { id: "admin", label: "Admin", description: "Full administrative access" },
  ]

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <Header />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.push("/developer")}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Developer Portal
        </button>

        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Key className="h-6 w-6 text-primary" />
            API Keys
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-1">
            Manage your API keys for programmatic access
          </p>
        </div>

        {/* Newly Created Key Alert */}
        {newlyCreatedKey && (
          <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-medium text-green-900 dark:text-green-100">API Key Created Successfully</h4>
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  Make sure to copy your API key now. You won&apos;t be able to see it again!
                </p>
                <div className="mt-3 flex items-center gap-2">
                  <code className="flex-1 text-sm font-mono text-green-900 dark:text-green-100 bg-green-100 dark:bg-green-800 px-3 py-2 rounded">
                    {newlyCreatedKey.api_key}
                  </code>
                  <button
                    onClick={() => handleCopyKey(newlyCreatedKey.api_key)}
                    className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-green-700 dark:text-green-300 bg-green-100 dark:bg-green-800 rounded hover:bg-green-200 dark:hover:bg-green-700"
                  >
                    <Copy className="h-4 w-4" />
                    Copy
                  </button>
                </div>
                <button
                  onClick={() => setNewlyCreatedKey(null)}
                  className="mt-3 text-sm text-green-700 dark:text-green-300 hover:text-green-900 dark:hover:text-green-100 underline"
                >
                  I&apos;ve saved my key, dismiss this message
                </button>
              </div>
            </div>
          </div>
        )}

        {/* API Keys Content */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Your API Keys</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Create and manage API keys for accessing the Tax Deed Flow API</p>
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
                    disabled={isSubmitting}
                    className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <Key className="h-4 w-4" />
                        Create API Key
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setIsCreating(false)
                      setNewKeyName("")
                      setNewKeyPermissions(["read"])
                    }}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
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
                        {apiKey.revoked_at && (
                          <span className="px-2 py-0.5 text-xs font-medium bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400 rounded">
                            Revoked
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Key ID: {apiKey.id.substring(0, 8)}... (hidden for security)
                      </div>
                      <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">
                        Created: {new Date(apiKey.created_at).toLocaleDateString()}
                        {apiKey.last_used_at && ` • Last used: ${new Date(apiKey.last_used_at).toLocaleDateString()}`}
                        {!apiKey.last_used_at && " • Never used"}
                      </div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Rate Limit: {apiKey.rate_limit_tier} • Requests: {apiKey.request_count.toLocaleString()}
                      </div>
                    </div>
                    {!apiKey.revoked_at && (
                      <button
                        onClick={() => setShowDeleteDialog(apiKey.id)}
                        className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400"
                        title="Revoke key"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* API Documentation Link */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 dark:text-blue-100">API Documentation</h4>
              <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                Learn how to use your API keys to access the Tax Deed Flow API programmatically.
                Include your API key in the <code className="bg-blue-100 dark:bg-blue-800 px-1 rounded">x-api-key</code> header
                with your requests.
              </p>
              <button
                onClick={() => router.push("/developer/docs")}
                className="mt-2 text-sm text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 underline"
              >
                View API Documentation →
              </button>
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
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Revoke API Key</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">This action cannot be undone</p>
              </div>
            </div>
            <div className="px-6 py-4">
              <p className="text-slate-600 dark:text-slate-400">
                Are you sure you want to revoke this API key? Any applications using this key will lose access immediately.
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
                Revoke Key
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
