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
  CheckCircle2,
  XCircle,
  ExternalLink,
  RefreshCw,
  Copy,
  Eye,
  EyeOff,
  Save,
  Workflow,
} from "lucide-react"
import { Header } from "@/components/layout/Header"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"

// Integration status type
type IntegrationStatus = "connected" | "disconnected" | "error"

// Mock integration data
const MOCK_INTEGRATIONS = [
  {
    id: "n8n",
    name: "n8n Workflows",
    description: "Automation platform for workflow orchestration",
    icon: <Workflow className="h-6 w-6" />,
    status: "connected" as IntegrationStatus,
    url: "https://n8n.lfb-investments.com",
    lastSync: "2026-01-09T06:00:00Z",
    webhookUrl: "https://n8n.lfb-investments.com/webhook/taxdeedflow",
  },
  {
    id: "supabase",
    name: "Supabase",
    description: "Database and authentication backend",
    icon: <Shield className="h-6 w-6" />,
    status: "connected" as IntegrationStatus,
    url: "https://supabase.com",
    lastSync: "2026-01-09T08:30:00Z",
  },
  {
    id: "regrid",
    name: "Regrid API",
    description: "Property data and parcel information",
    icon: <Link2 className="h-6 w-6" />,
    status: "connected" as IntegrationStatus,
    url: "https://regrid.com",
    lastSync: "2026-01-09T05:45:00Z",
  },
  {
    id: "google-maps",
    name: "Google Maps API",
    description: "Mapping and geolocation services",
    icon: <Link2 className="h-6 w-6" />,
    status: "disconnected" as IntegrationStatus,
    url: "https://console.cloud.google.com",
  },
]

// Mock API keys
const MOCK_API_KEYS = [
  {
    id: "key-1",
    name: "Production API Key",
    prefix: "tdf_prod_",
    created: "2025-12-01T10:00:00Z",
    lastUsed: "2026-01-09T08:30:00Z",
    status: "active",
  },
  {
    id: "key-2",
    name: "Development API Key",
    prefix: "tdf_dev_",
    created: "2025-11-15T14:00:00Z",
    lastUsed: "2026-01-08T16:00:00Z",
    status: "active",
  },
]

const STATUS_CONFIG: Record<IntegrationStatus, { label: string; color: string; icon: React.ReactNode }> = {
  connected: {
    label: "Connected",
    color: "bg-green-100 text-green-700",
    icon: <CheckCircle2 className="h-4 w-4" />,
  },
  disconnected: {
    label: "Disconnected",
    color: "bg-slate-100 text-slate-600",
    icon: <XCircle className="h-4 w-4" />,
  },
  error: {
    label: "Error",
    color: "bg-red-100 text-red-700",
    icon: <XCircle className="h-4 w-4" />,
  },
}

export default function SettingsIntegrationsPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const [testingConnection, setTestingConnection] = useState<string | null>(null)
  const [showApiKey, setShowApiKey] = useState<string | null>(null)
  const [n8nApiKey, setN8nApiKey] = useState("n8n_api_xxxxxxxxxxxxxx")
  const [isSaving, setIsSaving] = useState(false)

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

  const handleTestConnection = (integrationId: string) => {
    setTestingConnection(integrationId)
    setTimeout(() => {
      setTestingConnection(null)
      toast.success("Connection test successful!")
    }, 1500)
  }

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success("Copied to clipboard!")
  }

  const handleSaveApiKey = () => {
    setIsSaving(true)
    setTimeout(() => {
      setIsSaving(false)
      toast.success("API key saved successfully!")
    }, 1000)
  }

  const SETTINGS_TABS = [
    { id: "profile", label: "Profile", icon: <User className="h-4 w-4" />, active: false },
    { id: "notifications", label: "Notifications", icon: <Bell className="h-4 w-4" />, active: false },
    { id: "integrations", label: "Integrations", icon: <Link2 className="h-4 w-4" />, active: true },
    { id: "security", label: "Security", icon: <Shield className="h-4 w-4" />, active: false },
    { id: "api", label: "API Keys", icon: <Key className="h-4 w-4" />, active: false },
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
            <Link2 className="h-6 w-6 text-primary" />
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
          </div>

          {/* Integrations Content */}
          <div className="flex-1 space-y-6">
            {/* Connected Services */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <h2 className="text-lg font-semibold text-slate-900">Connected Services</h2>
                <p className="text-sm text-slate-500">Manage your external service integrations</p>
              </div>

              <div className="divide-y divide-slate-200">
                {MOCK_INTEGRATIONS.map((integration) => (
                  <div key={integration.id} className="px-6 py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        <div className="p-2 bg-slate-100 rounded-lg text-slate-600">
                          {integration.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-medium text-slate-900">{integration.name}</h3>
                            <span
                              className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                                STATUS_CONFIG[integration.status].color
                              )}
                            >
                              {STATUS_CONFIG[integration.status].icon}
                              {STATUS_CONFIG[integration.status].label}
                            </span>
                          </div>
                          <p className="text-sm text-slate-500 mt-1">{integration.description}</p>
                          {integration.lastSync && (
                            <p className="text-xs text-slate-400 mt-1">
                              Last sync: {new Date(integration.lastSync).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleTestConnection(integration.id)}
                          disabled={testingConnection === integration.id}
                          className={cn(
                            "flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors",
                            testingConnection === integration.id
                              ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed"
                              : "text-slate-600 border-slate-200 hover:bg-slate-50"
                          )}
                        >
                          <RefreshCw className={cn("h-3.5 w-3.5", testingConnection === integration.id && "animate-spin")} />
                          {testingConnection === integration.id ? "Testing..." : "Test"}
                        </button>
                        <a
                          href={integration.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-primary hover:text-primary/80"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Open
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* n8n Configuration */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Workflow className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold text-slate-900">n8n Configuration</h2>
                </div>
                <p className="text-sm text-slate-500 mt-1">Configure your n8n workflow automation</p>
              </div>

              <div className="p-6 space-y-4">
                {/* n8n URL */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    n8n Instance URL
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value="https://n8n.lfb-investments.com"
                      readOnly
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                    />
                    <button
                      onClick={() => handleCopyToClipboard("https://n8n.lfb-investments.com")}
                      className="p-2 text-slate-400 hover:text-slate-600"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Webhook URL */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Webhook URL
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value="https://n8n.lfb-investments.com/webhook/taxdeedflow"
                      readOnly
                      className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                    />
                    <button
                      onClick={() => handleCopyToClipboard("https://n8n.lfb-investments.com/webhook/taxdeedflow")}
                      className="p-2 text-slate-400 hover:text-slate-600"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* n8n API Key */}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    n8n API Key
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <input
                        type={showApiKey === "n8n" ? "text" : "password"}
                        value={n8nApiKey}
                        onChange={(e) => setN8nApiKey(e.target.value)}
                        className="w-full px-3 py-2 pr-10 border border-slate-200 rounded-lg text-sm"
                      />
                      <button
                        onClick={() => setShowApiKey(showApiKey === "n8n" ? null : "n8n")}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600"
                      >
                        {showApiKey === "n8n" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <button
                      onClick={handleSaveApiKey}
                      disabled={isSaving}
                      className={cn(
                        "flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                        isSaving
                          ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                          : "bg-primary text-white hover:bg-primary/90"
                      )}
                    >
                      <Save className="h-4 w-4" />
                      {isSaving ? "Saving..." : "Save"}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Your n8n API key for authentication with workflows
                  </p>
                </div>
              </div>
            </div>

            {/* API Keys Section */}
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Key className="h-5 w-5 text-primary" />
                      <h2 className="text-lg font-semibold text-slate-900">API Keys</h2>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">Manage your Tax Deed Flow API keys</p>
                  </div>
                  <button className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90">
                    <Key className="h-3.5 w-3.5" />
                    Generate New Key
                  </button>
                </div>
              </div>

              <div className="divide-y divide-slate-200">
                {MOCK_API_KEYS.map((apiKey) => (
                  <div key={apiKey.id} className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-medium text-slate-900">{apiKey.name}</h3>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            Active
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                          <code className="text-sm text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                            {apiKey.prefix}••••••••••••
                          </code>
                          <span className="text-xs text-slate-500">
                            Created: {new Date(apiKey.created).toLocaleDateString()}
                          </span>
                          <span className="text-xs text-slate-500">
                            Last used: {new Date(apiKey.lastUsed).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <button className="text-sm text-red-600 hover:text-red-700 font-medium">
                        Revoke
                      </button>
                    </div>
                  </div>
                ))}
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
