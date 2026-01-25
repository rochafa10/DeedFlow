"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  BookOpen,
  ArrowLeft,
  Code,
  Lock,
  Zap,
  AlertTriangle,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { toast } from "sonner"

interface CodeExampleProps {
  language: string
  code: string
  title?: string
}

function CodeExample({ language, code, title }: CodeExampleProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    toast.success("Code copied to clipboard")
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="relative">
      {title && (
        <div className="text-xs font-medium text-slate-400 mb-2">{title}</div>
      )}
      <div className="relative bg-slate-900 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 border-b border-slate-700">
          <span className="text-xs font-medium text-slate-400">{language}</span>
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 text-xs text-slate-400 hover:text-white transition-colors"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                Copy
              </>
            )}
          </button>
        </div>
        <div className="p-4 overflow-x-auto">
          <pre className="text-sm text-slate-100">
            <code>{code}</code>
          </pre>
        </div>
      </div>
    </div>
  )
}

interface EndpointSectionProps {
  method: string
  path: string
  description: string
  children: React.ReactNode
}

function EndpointSection({ method, path, description, children }: EndpointSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const methodColors: Record<string, string> = {
    GET: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    POST: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    PUT: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
    PATCH: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
    DELETE: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  }

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span
            className={`px-2 py-1 text-xs font-bold rounded ${
              methodColors[method] || "bg-slate-100 text-slate-700"
            }`}
          >
            {method}
          </span>
          <code className="text-sm font-mono text-slate-900 dark:text-slate-100">
            {path}
          </code>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600 dark:text-slate-400">
            {description}
          </span>
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronRight className="h-4 w-4 text-slate-400" />
          )}
        </div>
      </button>
      {isExpanded && (
        <div className="px-4 py-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700">
          {children}
        </div>
      )}
    </div>
  )
}

export default function DeveloperDocsPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login")
    }
  }, [isAuthenticated, authLoading, router])

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    )
  }

  // Don't render content if not authenticated
  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => router.push("/developer")}
          className="flex items-center gap-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Developer Portal
        </button>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <BookOpen className="h-8 w-8 text-primary" />
            API Documentation
          </h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            Complete reference for the Tax Deed Flow API
          </p>
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <a
            href="#authentication"
            className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow"
          >
            <Lock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div>
              <div className="font-medium text-slate-900 dark:text-slate-100">
                Authentication
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                How to authenticate
              </div>
            </div>
          </a>
          <a
            href="#endpoints"
            className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow"
          >
            <Code className="h-5 w-5 text-green-600 dark:text-green-400" />
            <div>
              <div className="font-medium text-slate-900 dark:text-slate-100">
                API Endpoints
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Available endpoints
              </div>
            </div>
          </a>
          <a
            href="#rate-limits"
            className="flex items-center gap-3 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:shadow-lg transition-shadow"
          >
            <Zap className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            <div>
              <div className="font-medium text-slate-900 dark:text-slate-100">
                Rate Limits
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">
                Usage limits
              </div>
            </div>
          </a>
        </div>

        {/* Authentication Section */}
        <section id="authentication" className="mb-12">
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Lock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              Authentication
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              The Tax Deed Flow API uses API keys for authentication. Include your API key in the{" "}
              <code className="bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded text-sm">
                x-api-key
              </code>{" "}
              header with every request.
            </p>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Creating an API Key
                </h3>
                <ol className="list-decimal list-inside space-y-1 text-slate-600 dark:text-slate-400 text-sm">
                  <li>Navigate to the API Keys page</li>
                  <li>Click &quot;Create Key&quot;</li>
                  <li>Enter a name and select permissions</li>
                  <li>Copy your API key immediately (it&apos;s only shown once!)</li>
                </ol>
              </div>

              <CodeExample
                language="bash"
                title="Example Request"
                code={`curl https://taxdeedflow.com/api/v1/properties \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`}
              />

              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-amber-900 dark:text-amber-100">
                      Keep Your API Keys Secret
                    </h4>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      Never share your API keys or commit them to version control. Store them securely
                      in environment variables or a secrets manager.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Rate Limits Section */}
        <section id="rate-limits" className="mb-12">
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Zap className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              Rate Limits
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              Rate limits are enforced per API key on an hourly basis. When you exceed your limit,
              the API will return a 429 status code.
            </p>

            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 dark:bg-slate-700">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-slate-900 dark:text-slate-100">
                      Tier
                    </th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-900 dark:text-slate-100">
                      Requests/Hour
                    </th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-900 dark:text-slate-100">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  <tr>
                    <td className="px-4 py-2 text-slate-900 dark:text-slate-100">
                      <span className="font-mono text-sm bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                        free
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-400">1,000</td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-400">
                      Default tier for new API keys
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-slate-900 dark:text-slate-100">
                      <span className="font-mono text-sm bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                        pro
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-400">10,000</td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-400">
                      For production applications
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-slate-900 dark:text-slate-100">
                      <span className="font-mono text-sm bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                        enterprise
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-400">100,000</td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-400">
                      For high-volume applications
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 text-slate-900 dark:text-slate-100">
                      <span className="font-mono text-sm bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                        unlimited
                      </span>
                    </td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-400">∞</td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-400">
                      No rate limiting (internal use)
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
                Rate Limit Headers
              </h3>
              <p className="text-slate-600 dark:text-slate-400 mb-3 text-sm">
                Every API response includes headers showing your current rate limit status:
              </p>
              <CodeExample
                language="http"
                code={`X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 950
X-RateLimit-Reset: 1674489600`}
              />
            </div>
          </div>
        </section>

        {/* API Endpoints Section */}
        <section id="endpoints" className="mb-12">
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Code className="h-6 w-6 text-green-600 dark:text-green-400" />
              API Endpoints
            </h2>

            {/* Properties Endpoints */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                Properties
              </h3>
              <div className="space-y-3">
                <EndpointSection
                  method="GET"
                  path="/api/v1/properties"
                  description="List properties"
                >
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Retrieve a paginated list of properties with optional filtering and sorting.
                  </p>

                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 text-sm">
                    Query Parameters
                  </h4>
                  <div className="mb-4 text-sm space-y-1">
                    <div className="flex gap-2">
                      <code className="text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                        county_id
                      </code>
                      <span className="text-slate-600 dark:text-slate-400">
                        Filter by county ID
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <code className="text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                        state_code
                      </code>
                      <span className="text-slate-600 dark:text-slate-400">
                        Filter by state (e.g., &quot;PA&quot;, &quot;FL&quot;)
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <code className="text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                        min_total_due
                      </code>
                      <span className="text-slate-600 dark:text-slate-400">
                        Minimum total due amount
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <code className="text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                        max_total_due
                      </code>
                      <span className="text-slate-600 dark:text-slate-400">
                        Maximum total due amount
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <code className="text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                        min_investability_score
                      </code>
                      <span className="text-slate-600 dark:text-slate-400">
                        Minimum investability score (0-100)
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <code className="text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                        limit
                      </code>
                      <span className="text-slate-600 dark:text-slate-400">
                        Number of results (max 1000, default 100)
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <code className="text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                        offset
                      </code>
                      <span className="text-slate-600 dark:text-slate-400">
                        Pagination offset
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <code className="text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                        sort_by
                      </code>
                      <span className="text-slate-600 dark:text-slate-400">
                        Sort field (total_due, investability_score, created_at, updated_at)
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <code className="text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                        sort_order
                      </code>
                      <span className="text-slate-600 dark:text-slate-400">
                        Sort direction (asc, desc)
                      </span>
                    </div>
                  </div>

                  <CodeExample
                    language="bash"
                    title="Example Request"
                    code={`curl "https://taxdeedflow.com/api/v1/properties?state_code=PA&min_total_due=5000&limit=10" \\
  -H "x-api-key: YOUR_API_KEY"`}
                  />

                  <div className="mt-4">
                    <CodeExample
                      language="json"
                      title="Example Response"
                      code={`{
  "data": [
    {
      "id": "prop-123",
      "county_id": "county-456",
      "parcel_id": "12-34-567",
      "address": "123 Main St",
      "total_due": 5250.00,
      "sale_date": "2024-06-15",
      "investability_score": 85,
      "has_regrid_data": true,
      "has_screenshot": true,
      "visual_validation_status": "approved",
      "county": {
        "county_name": "Blair",
        "state_code": "PA"
      }
    }
  ],
  "count": 1,
  "pagination": {
    "limit": 10,
    "offset": 0,
    "has_more": false
  }
}`}
                    />
                  </div>
                </EndpointSection>

                <EndpointSection
                  method="GET"
                  path="/api/v1/properties/[id]"
                  description="Get property details"
                >
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Retrieve detailed information about a specific property including related data.
                  </p>

                  <CodeExample
                    language="bash"
                    title="Example Request"
                    code={`curl "https://taxdeedflow.com/api/v1/properties/prop-123" \\
  -H "x-api-key: YOUR_API_KEY"`}
                  />

                  <div className="mt-4">
                    <CodeExample
                      language="json"
                      title="Example Response"
                      code={`{
  "data": {
    "id": "prop-123",
    "county_id": "county-456",
    "parcel_id": "12-34-567",
    "address": "123 Main St",
    "total_due": 5250.00,
    "sale_date": "2024-06-15",
    "investability_score": 85,
    "county": {
      "county_name": "Blair",
      "state_code": "PA"
    },
    "regrid_data": {
      "property_type": "Single Family",
      "year_built": 1985,
      "lot_size": 0.25
    }
  }
}`}
                    />
                  </div>
                </EndpointSection>
              </div>
            </div>

            {/* Counties Endpoints */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                Counties
              </h3>
              <div className="space-y-3">
                <EndpointSection
                  method="GET"
                  path="/api/v1/counties"
                  description="List counties"
                >
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Retrieve a list of counties with property counts and upcoming sale information.
                  </p>

                  <CodeExample
                    language="bash"
                    title="Example Request"
                    code={`curl "https://taxdeedflow.com/api/v1/counties?state_code=PA" \\
  -H "x-api-key: YOUR_API_KEY"`}
                  />

                  <div className="mt-4">
                    <CodeExample
                      language="json"
                      title="Example Response"
                      code={`{
  "data": [
    {
      "id": "county-456",
      "county_name": "Blair",
      "state_code": "PA",
      "state_name": "Pennsylvania",
      "property_count": 845,
      "upcoming_sale": {
        "sale_date": "2024-06-15",
        "sale_type": "Judicial",
        "registration_deadline": "2024-06-01"
      }
    }
  ],
  "count": 1,
  "pagination": {
    "limit": 100,
    "offset": 0,
    "has_more": false
  }
}`}
                    />
                  </div>
                </EndpointSection>

                <EndpointSection
                  method="GET"
                  path="/api/v1/counties/[id]"
                  description="Get county details"
                >
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Retrieve detailed information about a specific county including all related resources.
                  </p>

                  <CodeExample
                    language="bash"
                    title="Example Request"
                    code={`curl "https://taxdeedflow.com/api/v1/counties/county-456" \\
  -H "x-api-key: YOUR_API_KEY"`}
                  />
                </EndpointSection>
              </div>
            </div>

            {/* Risk Analysis Endpoints */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                Risk Analysis
              </h3>
              <div className="space-y-3">
                <EndpointSection
                  method="POST"
                  path="/api/v1/risk-analysis"
                  description="Analyze property risk"
                >
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Calculate comprehensive risk analysis for a property including flood, earthquake,
                    wildfire, and other environmental risks.
                  </p>

                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-2 text-sm">
                    Request Body
                  </h4>
                  <div className="mb-4 text-sm space-y-1">
                    <div className="flex gap-2">
                      <code className="text-slate-900 dark:text-slate-100 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                        property_id
                      </code>
                      <span className="text-slate-600 dark:text-slate-400">
                        Property ID (required)
                      </span>
                    </div>
                  </div>

                  <CodeExample
                    language="bash"
                    title="Example Request"
                    code={`curl -X POST "https://taxdeedflow.com/api/v1/risk-analysis" \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"property_id": "prop-123"}'`}
                  />

                  <div className="mt-4">
                    <CodeExample
                      language="json"
                      title="Example Response"
                      code={`{
  "data": {
    "property_id": "prop-123",
    "risk_score": 35,
    "risk_level": "low",
    "factors": [
      {
        "category": "flood",
        "score": 15,
        "weight": 0.3,
        "description": "Low flood risk area"
      },
      {
        "category": "earthquake",
        "score": 5,
        "weight": 0.2,
        "description": "Minimal seismic activity"
      }
    ],
    "recommendations": [
      "Consider flood insurance",
      "Property is in good condition for investment"
    ],
    "calculated_at": "2024-01-23T14:00:00Z"
  }
}`}
                    />
                  </div>
                </EndpointSection>
              </div>
            </div>

            {/* Developer Management Endpoints */}
            <div className="mb-8">
              <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
                Developer Management
              </h3>
              <div className="space-y-3">
                <EndpointSection
                  method="POST"
                  path="/api/developer/keys"
                  description="Create API key"
                >
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Create a new API key for authentication. Requires session authentication.
                  </p>

                  <CodeExample
                    language="bash"
                    title="Example Request"
                    code={`curl -X POST "https://taxdeedflow.com/api/developer/keys" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Production Server",
    "permissions": ["read", "write"],
    "rate_limit_tier": "pro"
  }'`}
                  />
                </EndpointSection>

                <EndpointSection
                  method="GET"
                  path="/api/developer/keys"
                  description="List API keys"
                >
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Retrieve all API keys for the authenticated user.
                  </p>
                </EndpointSection>

                <EndpointSection
                  method="DELETE"
                  path="/api/developer/keys/[id]"
                  description="Revoke API key"
                >
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Revoke an API key. The key will immediately stop working.
                  </p>
                </EndpointSection>

                <EndpointSection
                  method="GET"
                  path="/api/developer/usage"
                  description="Get usage statistics"
                >
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Retrieve usage statistics including request counts and rate limit status.
                  </p>
                </EndpointSection>

                <EndpointSection
                  method="POST"
                  path="/api/developer/webhooks"
                  description="Create webhook"
                >
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Create a webhook subscription to receive real-time updates.
                  </p>

                  <CodeExample
                    language="bash"
                    title="Example Request"
                    code={`curl -X POST "https://taxdeedflow.com/api/developer/webhooks" \\
  -H "Content-Type: application/json" \\
  -d '{
    "url": "https://example.com/webhook",
    "events": ["property.created", "property.updated"]
  }'`}
                  />
                </EndpointSection>

                <EndpointSection
                  method="GET"
                  path="/api/developer/webhooks"
                  description="List webhooks"
                >
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Retrieve all webhook subscriptions for the authenticated user.
                  </p>
                </EndpointSection>

                <EndpointSection
                  method="DELETE"
                  path="/api/developer/webhooks/[id]"
                  description="Delete webhook"
                >
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                    Delete a webhook subscription.
                  </p>
                </EndpointSection>
              </div>
            </div>
          </div>
        </section>

        {/* Error Codes Section */}
        <section id="errors" className="mb-12">
          <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">
              Error Codes
            </h2>
            <p className="text-slate-600 dark:text-slate-400 mb-4">
              The API uses standard HTTP status codes to indicate success or failure.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-100 dark:bg-slate-700">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold text-slate-900 dark:text-slate-100">
                      Status Code
                    </th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-900 dark:text-slate-100">
                      Meaning
                    </th>
                    <th className="px-4 py-2 text-left font-semibold text-slate-900 dark:text-slate-100">
                      Description
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  <tr>
                    <td className="px-4 py-2 font-mono text-slate-900 dark:text-slate-100">
                      200
                    </td>
                    <td className="px-4 py-2 text-slate-900 dark:text-slate-100">OK</td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-400">
                      Request succeeded
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-mono text-slate-900 dark:text-slate-100">
                      201
                    </td>
                    <td className="px-4 py-2 text-slate-900 dark:text-slate-100">Created</td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-400">
                      Resource created successfully
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-mono text-slate-900 dark:text-slate-100">
                      400
                    </td>
                    <td className="px-4 py-2 text-slate-900 dark:text-slate-100">
                      Bad Request
                    </td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-400">
                      Invalid request parameters
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-mono text-slate-900 dark:text-slate-100">
                      401
                    </td>
                    <td className="px-4 py-2 text-slate-900 dark:text-slate-100">
                      Unauthorized
                    </td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-400">
                      Missing or invalid API key
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-mono text-slate-900 dark:text-slate-100">
                      403
                    </td>
                    <td className="px-4 py-2 text-slate-900 dark:text-slate-100">
                      Forbidden
                    </td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-400">
                      Insufficient permissions
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-mono text-slate-900 dark:text-slate-100">
                      404
                    </td>
                    <td className="px-4 py-2 text-slate-900 dark:text-slate-100">
                      Not Found
                    </td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-400">
                      Resource not found
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-mono text-slate-900 dark:text-slate-100">
                      429
                    </td>
                    <td className="px-4 py-2 text-slate-900 dark:text-slate-100">
                      Too Many Requests
                    </td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-400">
                      Rate limit exceeded
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-2 font-mono text-slate-900 dark:text-slate-100">
                      500
                    </td>
                    <td className="px-4 py-2 text-slate-900 dark:text-slate-100">
                      Internal Server Error
                    </td>
                    <td className="px-4 py-2 text-slate-600 dark:text-slate-400">
                      Server error occurred
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4">
              <CodeExample
                language="json"
                title="Error Response Format"
                code={`{
  "error": "unauthorized",
  "message": "Invalid API key"
}`}
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}
