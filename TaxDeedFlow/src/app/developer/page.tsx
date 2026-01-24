"use client"

import { useEffect } from "react"
import { Key, BookOpen, BarChart3, Webhook, ArrowRight, Code, Shield, Zap } from "lucide-react"
import { Header } from "@/components/layout/Header"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import Link from "next/link"

export default function DeveloperPage() {
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const router = useRouter()

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
      <Header />

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">Developer Portal</h1>
            <p className="text-xl text-blue-100 max-w-2xl mx-auto">
              Build powerful applications with the Tax Deed Flow API. Access property data, risk analysis, and auction information programmatically.
            </p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {/* API Keys Card */}
          <Link href="/developer/keys">
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-shadow cursor-pointer group">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-lg">
                  <Key className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                </div>
                <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                API Keys
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Create and manage your API keys for authentication
              </p>
            </div>
          </Link>

          {/* API Documentation Card */}
          <Link href="/developer/docs">
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-shadow cursor-pointer group">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-lg">
                  <BookOpen className="h-6 w-6 text-green-600 dark:text-green-300" />
                </div>
                <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-green-600 transition-colors" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                API Documentation
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Explore endpoints, request examples, and response formats
              </p>
            </div>
          </Link>

          {/* Usage Dashboard Card */}
          <Link href="/developer/usage">
            <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-shadow cursor-pointer group">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-purple-600 dark:text-purple-300" />
                </div>
                <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-purple-600 transition-colors" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                Usage Dashboard
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Monitor your API usage, rate limits, and statistics
              </p>
            </div>
          </Link>
        </div>

        {/* Features Section */}
        <div className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-8 mb-12">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-6">
            API Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg flex-shrink-0">
                <Code className="h-5 w-5 text-blue-600 dark:text-blue-300" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                  RESTful API
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Clean, predictable REST endpoints with comprehensive filtering and pagination
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg flex-shrink-0">
                <Shield className="h-5 w-5 text-green-600 dark:text-green-300" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                  Secure Authentication
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  API key authentication with configurable permissions and rate limits
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2 bg-purple-100 dark:bg-purple-900 rounded-lg flex-shrink-0">
                <Zap className="h-5 w-5 text-purple-600 dark:text-purple-300" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                  Real-time Updates
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Webhook support for property updates, auction alerts, and risk score changes
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg flex-shrink-0">
                <Webhook className="h-5 w-5 text-orange-600 dark:text-orange-300" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                  Comprehensive Data
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Access property details, risk analysis, county information, and auction data
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Getting Started */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 p-8">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
            Getting Started
          </h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                1
              </div>
              <div>
                <p className="text-slate-700 dark:text-slate-300">
                  <Link href="/developer/keys" className="font-semibold text-blue-600 hover:text-blue-700">
                    Create an API key
                  </Link>{" "}
                  to authenticate your requests
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                2
              </div>
              <div>
                <p className="text-slate-700 dark:text-slate-300">
                  Review the{" "}
                  <Link href="/developer/docs" className="font-semibold text-blue-600 hover:text-blue-700">
                    API documentation
                  </Link>{" "}
                  to learn about available endpoints
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                3
              </div>
              <div>
                <p className="text-slate-700 dark:text-slate-300">
                  Make your first API request and start building!
                </p>
              </div>
            </div>
          </div>

          {/* Code Example */}
          <div className="mt-6 bg-slate-900 rounded-lg p-4 overflow-x-auto">
            <pre className="text-sm text-slate-100">
              <code>{`curl https://taxdeedflow.com/api/v1/properties \\
  -H "x-api-key: YOUR_API_KEY" \\
  -H "Content-Type: application/json"`}</code>
            </pre>
          </div>
        </div>
      </div>
    </div>
  )
}
