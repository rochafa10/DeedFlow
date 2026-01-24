"use client"

import { useEffect, useState } from "react"
import { WifiOff, Wifi } from "lucide-react"

export function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(true)
  const [showReconnected, setShowReconnected] = useState(false)

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine)

    const handleOnline = () => {
      setIsOnline(true)
      setShowReconnected(true)

      // Hide reconnected message after 3 seconds
      setTimeout(() => {
        setShowReconnected(false)
      }, 3000)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setShowReconnected(false)
    }

    // Listen for online/offline events
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Cleanup
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  // Don't render if online and not showing reconnected message
  if (isOnline && !showReconnected) {
    return null
  }

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 ${
        isOnline
          ? "bg-green-500 text-white"
          : "bg-amber-500 text-white"
      }`}
      role="alert"
      aria-live="polite"
    >
      <div className="max-w-7xl mx-auto px-4 py-2.5 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center gap-2">
          {isOnline ? (
            <>
              <Wifi className="h-4 w-4" aria-hidden="true" />
              <span className="text-sm font-medium">
                Connection restored. You are back online.
              </span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4" aria-hidden="true" />
              <span className="text-sm font-medium">
                No internet connection. Some features may be limited.
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
