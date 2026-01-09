"use client"

import { useEffect } from "react"
import { AlertTriangle, RefreshCw, Home, WifiOff } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application error:", error)
  }, [error])

  // Check if it's a network-related error
  const isNetworkError =
    error.message?.toLowerCase().includes("network") ||
    error.message?.toLowerCase().includes("fetch") ||
    error.message?.toLowerCase().includes("failed to load") ||
    error.message?.toLowerCase().includes("connection") ||
    error.name === "TypeError" && error.message?.includes("fetch")

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
        {/* Icon */}
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
          {isNetworkError ? (
            <WifiOff className="w-8 h-8 text-red-600" />
          ) : (
            <AlertTriangle className="w-8 h-8 text-red-600" />
          )}
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          {isNetworkError ? "Connection Problem" : "Something Went Wrong"}
        </h1>

        {/* Description */}
        <p className="text-slate-600 mb-6">
          {isNetworkError ? (
            <>
              We couldn&apos;t connect to the server. Please check your internet
              connection and try again.
            </>
          ) : (
            <>
              We encountered an unexpected error. Our team has been notified and
              is working to fix the issue.
            </>
          )}
        </p>

        {/* Error ID (for support) */}
        {error.digest && (
          <p className="text-xs text-slate-400 mb-6">
            Error ID: {error.digest}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 font-medium rounded-lg hover:bg-slate-200 transition-colors"
          >
            <Home className="w-4 h-4" />
            Go Home
          </a>
        </div>

        {/* Help text */}
        <p className="text-sm text-slate-500 mt-6">
          If this problem persists, please contact support.
        </p>
      </div>
    </div>
  )
}
