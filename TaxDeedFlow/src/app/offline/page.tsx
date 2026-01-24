"use client"

import Link from "next/link"
import { Home, WifiOff, RefreshCw } from "lucide-react"

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4">
      <div className="text-center">
        <div className="flex justify-center mb-6">
          <div className="p-4 bg-blue-100 dark:bg-blue-900/30 rounded-full">
            <WifiOff className="h-12 w-12 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          </div>
        </div>

        <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-4">
          You&apos;re Offline
        </h1>
        <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
          No Internet Connection
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mb-8 max-w-md">
          It looks like you&apos;ve lost your internet connection. Some features may be limited until you&apos;re back online.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary text-white font-medium rounded-lg hover:bg-primary/90 transition-colors min-h-[44px]"
          >
            <RefreshCw className="h-5 w-5" aria-hidden="true" />
            Try Again
          </button>

          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white font-medium rounded-lg hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors min-h-[44px]"
          >
            <Home className="h-5 w-5" aria-hidden="true" />
            Go to Home
          </Link>
        </div>

        <div className="mt-12 p-4 bg-slate-100 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 max-w-md mx-auto">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">
            Available Offline:
          </h3>
          <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1 text-left">
            <li>• Previously viewed properties</li>
            <li>• Saved watchlist items</li>
            <li>• Cached auction data</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
