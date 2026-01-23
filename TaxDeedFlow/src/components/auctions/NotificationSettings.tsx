"use client"

import { useState, useEffect } from "react"
import { Bell, BellOff, CheckCircle2, AlertTriangle, Loader2, Shield } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  isNotificationSupported,
  isNotificationPermissionGranted,
  isNotificationPermissionDenied,
  requestNotificationPermission,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  getCurrentPushSubscription,
  sendTestNotification,
} from "@/lib/notifications/push-service"

interface NotificationSettingsProps {
  className?: string
}

/**
 * Notification settings component for push notification opt-in
 * Manages browser permissions and push notification subscriptions
 */
export function NotificationSettings({ className }: NotificationSettingsProps) {
  const [isSupported, setIsSupported] = useState(false)
  const [isEnabled, setIsEnabled] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [permissionState, setPermissionState] = useState<NotificationPermission>("default")

  // Notification preferences
  const [notifyRegistrationDeadline, setNotifyRegistrationDeadline] = useState(true)
  const [notifyAuctionDate, setNotifyAuctionDate] = useState(true)
  const [notifyDaysBefore, setNotifyDaysBefore] = useState<number[]>([3, 7])

  /**
   * Initialize notification state on mount
   */
  useEffect(() => {
    const initializeNotifications = async () => {
      // Check if notifications are supported
      const supported = isNotificationSupported()
      setIsSupported(supported)

      if (!supported) {
        return
      }

      // Check current permission state
      const permission = Notification.permission
      setPermissionState(permission)

      // Check if already subscribed
      const subscription = await getCurrentPushSubscription()
      setIsEnabled(!!subscription)
    }

    initializeNotifications()
  }, [])

  /**
   * Handle enabling notifications
   */
  const handleEnableNotifications = async () => {
    setIsLoading(true)
    setStatus("idle")
    setErrorMessage(null)

    try {
      // Request permission if not granted
      if (!isNotificationPermissionGranted()) {
        const permission = await requestNotificationPermission()
        setPermissionState(permission)

        if (permission !== "granted") {
          throw new Error("Notification permission denied")
        }
      }

      // Subscribe to push notifications
      const subscription = await subscribeToPushNotifications()

      if (!subscription) {
        throw new Error("Failed to create push subscription")
      }

      // Send subscription to backend
      const response = await fetch("/api/auctions/notifications/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "subscribe",
          subscription,
          preferences: {
            notifyRegistrationDeadline,
            notifyAuctionDate,
            notifyDaysBefore,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to subscribe to notifications")
      }

      setIsEnabled(true)
      setStatus("success")

      // Send test notification
      await sendTestNotification()

      setTimeout(() => setStatus("idle"), 3000)
    } catch (error) {
      console.error("[NotificationSettings] Enable failed:", error)
      setStatus("error")
      setErrorMessage(error instanceof Error ? error.message : "Failed to enable notifications")
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Handle disabling notifications
   */
  const handleDisableNotifications = async () => {
    setIsLoading(true)
    setStatus("idle")
    setErrorMessage(null)

    try {
      // Unsubscribe from push notifications
      const unsubscribed = await unsubscribeFromPushNotifications()

      if (!unsubscribed) {
        throw new Error("Failed to unsubscribe from notifications")
      }

      // Notify backend
      const response = await fetch("/api/auctions/notifications/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "unsubscribe",
        }),
      })

      if (!response.ok) {
        console.warn("[NotificationSettings] Backend unsubscribe failed, but local unsubscribe succeeded")
      }

      setIsEnabled(false)
      setStatus("success")
      setTimeout(() => setStatus("idle"), 3000)
    } catch (error) {
      console.error("[NotificationSettings] Disable failed:", error)
      setStatus("error")
      setErrorMessage(error instanceof Error ? error.message : "Failed to disable notifications")
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Update notification preferences
   */
  const handleUpdatePreferences = async () => {
    if (!isEnabled) return

    setIsLoading(true)
    setStatus("idle")
    setErrorMessage(null)

    try {
      const subscription = await getCurrentPushSubscription()

      if (!subscription) {
        throw new Error("No active subscription found")
      }

      const response = await fetch("/api/auctions/notifications/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "subscribe",
          subscription,
          preferences: {
            notifyRegistrationDeadline,
            notifyAuctionDate,
            notifyDaysBefore,
          },
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to update preferences")
      }

      setStatus("success")
      setTimeout(() => setStatus("idle"), 3000)
    } catch (error) {
      console.error("[NotificationSettings] Update preferences failed:", error)
      setStatus("error")
      setErrorMessage(error instanceof Error ? error.message : "Failed to update preferences")
    } finally {
      setIsLoading(false)
    }
  }

  /**
   * Handle toggle preference changes
   */
  const handleDaysBeforeToggle = (days: number) => {
    setNotifyDaysBefore((prev) =>
      prev.includes(days) ? prev.filter((d) => d !== days) : [...prev, days].sort((a, b) => a - b)
    )
  }

  // Show not supported message
  if (!isSupported) {
    return (
      <div className={cn("bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4", className)}>
        <div className="flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              Notifications Not Supported
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Your browser does not support push notifications. Please use a modern browser like
              Chrome, Firefox, or Safari to enable deadline alerts.
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Show permission denied message
  if (isNotificationPermissionDenied()) {
    return (
      <div className={cn("bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4", className)}>
        <div className="flex items-start gap-3">
          <BellOff className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">
              Notifications Blocked
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              You have blocked notifications for this site. To enable deadline alerts, please update
              your browser settings.
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              <strong>Chrome:</strong> Settings → Privacy and Security → Site Settings → Notifications
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-4", className)}>
      {/* Header */}
      <div className="mb-4">
        <h3 className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Bell className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          Push Notifications
        </h3>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
          Get browser notifications for upcoming registration deadlines and auction dates
        </p>
      </div>

      {/* Enable/Disable Toggle */}
      <div className="mb-4">
        <button
          onClick={isEnabled ? handleDisableNotifications : handleEnableNotifications}
          disabled={isLoading}
          className={cn(
            "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors",
            isEnabled
              ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 dark:text-slate-200 dark:border-slate-600"
              : "bg-blue-600 hover:bg-blue-700 text-white",
            "disabled:bg-slate-300 disabled:cursor-not-allowed dark:disabled:bg-slate-600",
            "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          )}
        >
          {isLoading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Processing...</span>
            </>
          ) : isEnabled ? (
            <>
              <BellOff className="h-4 w-4" />
              <span>Disable Notifications</span>
            </>
          ) : (
            <>
              <Bell className="h-4 w-4" />
              <span>Enable Notifications</span>
            </>
          )}
        </button>
      </div>

      {/* Notification Preferences (shown when enabled) */}
      {isEnabled && (
        <div className="space-y-3 mb-4 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-lg border border-slate-200 dark:border-slate-700">
          <div className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <span className="font-medium text-slate-900 dark:text-slate-100">Notification Preferences</span>
          </div>

          {/* Notify for registration deadlines */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notifyRegistrationDeadline}
              onChange={(e) => setNotifyRegistrationDeadline(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              Registration deadlines
            </span>
          </label>

          {/* Notify for auction dates */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={notifyAuctionDate}
              onChange={(e) => setNotifyAuctionDate(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm text-slate-700 dark:text-slate-300">
              Auction sale dates
            </span>
          </label>

          {/* Reminder timing */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">
              Send reminders:
            </p>
            <div className="space-y-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyDaysBefore.includes(1)}
                  onChange={() => handleDaysBeforeToggle(1)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  1 day before
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyDaysBefore.includes(3)}
                  onChange={() => handleDaysBeforeToggle(3)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  3 days before
                </span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifyDaysBefore.includes(7)}
                  onChange={() => handleDaysBeforeToggle(7)}
                  className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                />
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  7 days before
                </span>
              </label>
            </div>
          </div>

          {/* Update preferences button */}
          <button
            onClick={handleUpdatePreferences}
            disabled={isLoading}
            className={cn(
              "w-full mt-2 px-3 py-2 text-sm rounded-lg font-medium transition-colors",
              "bg-blue-600 hover:bg-blue-700 text-white",
              "disabled:bg-slate-300 disabled:cursor-not-allowed dark:disabled:bg-slate-600",
              "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            )}
          >
            Update Preferences
          </button>
        </div>
      )}

      {/* Status Messages */}
      {status === "success" && (
        <div className="mt-4 bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-200 dark:border-green-800">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-green-800 dark:text-green-200 text-sm">
                {isEnabled ? "Notifications enabled!" : "Notifications disabled"}
              </p>
              {isEnabled && (
                <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                  You&apos;ll receive alerts for upcoming deadlines based on your preferences.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {status === "error" && errorMessage && (
        <div className="mt-4 bg-red-50 dark:bg-red-900/20 rounded-lg p-3 border border-red-200 dark:border-red-800">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-800 dark:text-red-200 text-sm">
                Failed to {isEnabled ? "disable" : "enable"} notifications
              </p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                {errorMessage}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Help Text */}
      <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
        <p className="text-xs text-slate-500 dark:text-slate-400">
          <strong>Privacy:</strong> Your notification preferences are stored securely and you can
          disable notifications at any time. We only send alerts for auctions you&apos;re tracking.
        </p>
      </div>
    </div>
  )
}
