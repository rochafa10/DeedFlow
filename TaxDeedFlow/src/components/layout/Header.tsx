"use client"

import { useState, useEffect } from "react"
import { Building2, LogOut, User, ChevronDown, Bell, Check, X, Menu } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"
import { useRouter } from "next/navigation"
import { SkipLink } from "./SkipLink"
import {
  requestNotificationPermission,
  subscribeToPushNotifications,
  areNotificationsEnabled,
  isNotificationSupported,
} from "@/lib/pwa/notification-manager"

type NotificationType = "info" | "warning" | "success" | "error" | "critical"

interface Notification {
  id: string
  title: string
  message: string
  time: string
  read: boolean
  type: NotificationType
}

export function Header() {
  const { user, logout, isAuthenticated } = useAuth()
  const [showDropdown, setShowDropdown] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | null>(null)
  const router = useRouter()

  // Fetch notifications from API
  useEffect(() => {
    if (!isAuthenticated) return

    const fetchNotifications = async () => {
      try {
        setLoading(true)
        const response = await fetch("/api/alerts?acknowledged=false&limit=10")
        const data = await response.json()

        if (data.alerts) {
          const formattedNotifications: Notification[] = data.alerts.map((alert: any) => ({
            id: alert.id,
            title: alert.title,
            message: alert.message,
            time: formatTime(alert.date),
            read: alert.acknowledged,
            type: mapAlertTypeToNotificationType(alert.type),
          }))
          setNotifications(formattedNotifications)
        }
      } catch (error) {
        // Silent fail - use empty array
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()

    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [isAuthenticated])

  // Check notification permission on mount
  useEffect(() => {
    if (isNotificationSupported()) {
      setNotificationPermission(Notification.permission)
    }
  }, [])

  const handleLogout = async () => {
    await logout()
    router.push("/login")
  }

  const unreadCount = notifications.filter((n) => !n.read).length

  const markAsRead = async (id: string) => {
    try {
      // Update locally first for immediate feedback
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      )

      // Update on server
      await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId: id, acknowledge: true }),
      })
    } catch (error) {
      // Silent fail
    }
  }

  const markAllAsRead = async () => {
    try {
      // Update locally first for immediate feedback
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))

      // Update on server
      await fetch("/api/alerts", {
        method: "PATCH",
      })
    } catch (error) {
      // Silent fail
    }
  }

  const dismissNotification = async (id: string) => {
    try {
      // Remove locally first for immediate feedback
      setNotifications((prev) => prev.filter((n) => n.id !== id))

      // Acknowledge on server (dismiss = acknowledge)
      await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId: id, acknowledge: true }),
      })
    } catch (error) {
      // Silent fail
    }
  }

  const handleEnableNotifications = async () => {
    try {
      const permission = await requestNotificationPermission()
      setNotificationPermission(permission)

      if (permission === "granted") {
        // Subscribe to push notifications
        const subscription = await subscribeToPushNotifications()
        if (subscription) {
          // Send subscription to server
          await fetch("/api/notifications/subscribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ subscription }),
          })
        }
      }
    } catch (error) {
      // Silent fail
    }
  }

  const userInitial = user?.name?.charAt(0)?.toUpperCase() || user?.email?.charAt(0)?.toUpperCase() || "U"

  const getTypeStyles = (type: NotificationType) => {
    switch (type) {
      case "warning":
        return "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400"
      case "success":
        return "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400"
      case "error":
      case "critical":
        return "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
      default:
        return "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400"
    }
  }

  // Format relative time
  const formatTime = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins} min ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`
    return date.toLocaleDateString()
  }

  // Map API alert type to notification type
  const mapAlertTypeToNotificationType = (type: string): NotificationType => {
    switch (type?.toLowerCase()) {
      case "critical":
        return "critical"
      case "warning":
        return "warning"
      case "success":
        return "success"
      case "error":
        return "error"
      default:
        return "info"
    }
  }

  return (
    <>
      <SkipLink />
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            {/* Mobile Menu Button - min 44x44px touch target */}
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="md:hidden min-w-[44px] min-h-[44px] p-2.5 -ml-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-center"
              aria-label="Open menu"
              aria-expanded={showMobileMenu}
            >
              <Menu className="h-6 w-6 text-slate-600 dark:text-slate-300" aria-hidden="true" />
            </button>
            <Building2 className="h-8 w-8 text-primary" aria-hidden="true" />
            <span className="text-xl font-bold text-slate-900 dark:text-white">Tax Deed Flow</span>
          </div>
          <nav className="hidden md:flex items-center gap-6">
            <a href="/" className="text-sm font-medium text-primary">Dashboard</a>
            <a href="/properties" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">Properties</a>
            <a href="/counties" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">Counties</a>
            <a href="/auctions" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">Auctions</a>
            <a href="/batch-jobs" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">Batch Jobs</a>
            <a href="/orchestration" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">Orchestration</a>
            <a href="/data-integrity" className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white">Data Integrity</a>
          </nav>
          {isAuthenticated && (
            <div className="flex items-center gap-2">
              {/* Notification Bell */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowNotifications(!showNotifications)
                    setShowDropdown(false)
                  }}
                  className="relative min-w-[44px] min-h-[44px] p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex items-center justify-center"
                  aria-label="Notifications"
                >
                  <Bell className="h-5 w-5 text-slate-600 dark:text-slate-300" aria-hidden="true" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>

                {showNotifications && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowNotifications(false)}
                    />

                    {/* Notifications Dropdown */}
                    <div className="absolute right-0 mt-2 w-80 rounded-lg bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 z-20 overflow-hidden">
                      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-900">
                        <h3 className="font-semibold text-slate-900 dark:text-white">Notifications</h3>
                        {unreadCount > 0 && (
                          <button
                            onClick={markAllAsRead}
                            className="min-h-[44px] px-3 flex items-center text-xs text-primary hover:text-primary/80 font-medium"
                          >
                            Mark all as read
                          </button>
                        )}
                      </div>

                      {/* Permission prompt */}
                      {isNotificationSupported() && notificationPermission !== "granted" && (
                        <div className="px-4 py-3 bg-blue-50 dark:bg-blue-900/20 border-b border-slate-200 dark:border-slate-700">
                          <p className="text-sm text-slate-700 dark:text-slate-300 mb-2">
                            Enable push notifications to get real-time alerts
                          </p>
                          <button
                            onClick={handleEnableNotifications}
                            className="w-full px-3 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary/90 transition-colors"
                          >
                            Enable Notifications
                          </button>
                        </div>
                      )}

                      <div className="max-h-80 overflow-y-auto">
                        {loading ? (
                          <div className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                            <Bell className="h-8 w-8 mx-auto mb-2 text-slate-300 dark:text-slate-600 animate-pulse" aria-hidden="true" />
                            <p className="text-sm">Loading...</p>
                          </div>
                        ) : notifications.length > 0 ? (
                          notifications.map((notification) => (
                            <div
                              key={notification.id}
                              className={`px-4 py-3 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 ${
                                !notification.read ? "bg-blue-50/50 dark:bg-blue-900/10" : ""
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`p-1.5 rounded-full ${getTypeStyles(notification.type)}`}>
                                  <Bell className="h-3 w-3" aria-hidden="true" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2">
                                    <p className="text-sm font-medium text-slate-900 dark:text-white truncate">
                                      {notification.title}
                                    </p>
                                    <div className="flex items-center gap-1 flex-shrink-0">
                                      {!notification.read && (
                                        <button
                                          onClick={() => markAsRead(notification.id)}
                                          className="min-w-[44px] min-h-[44px] p-2 hover:bg-slate-200 dark:hover:bg-slate-600 rounded flex items-center justify-center"
                                          title="Mark as read"
                                          aria-label="Mark as read"
                                        >
                                          <Check className="h-4 w-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                                        </button>
                                      )}
                                      <button
                                        onClick={() => dismissNotification(notification.id)}
                                        className="min-w-[44px] min-h-[44px] p-2 hover:bg-slate-200 dark:hover:bg-slate-600 rounded flex items-center justify-center"
                                        title="Dismiss"
                                        aria-label="Dismiss notification"
                                      >
                                        <X className="h-4 w-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
                                      </button>
                                    </div>
                                  </div>
                                  <p className="text-sm text-slate-600 dark:text-slate-300 truncate">
                                    {notification.message}
                                  </p>
                                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                                    {notification.time}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="px-4 py-8 text-center text-slate-500 dark:text-slate-400">
                            <Bell className="h-8 w-8 mx-auto mb-2 text-slate-300 dark:text-slate-600" aria-hidden="true" />
                            <p className="text-sm">No notifications</p>
                          </div>
                        )}
                      </div>

                      {notifications.length > 0 && (
                        <div className="px-4 py-2 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
                          <a
                            href="/settings/notifications"
                            className="min-h-[44px] flex items-center text-xs text-primary hover:text-primary/80 font-medium"
                          >
                            View all notifications
                          </a>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowDropdown(!showDropdown)
                    setShowNotifications(false)
                  }}
                  className="flex items-center gap-2 min-h-[44px] p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  aria-label="User menu"
                  aria-expanded={showDropdown}
                >
                  <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center text-sm font-medium">
                    {userInitial}
                  </div>
                  <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${showDropdown ? 'rotate-180' : ''}`} aria-hidden="true" />
                </button>

                {showDropdown && (
                  <>
                    {/* Backdrop to close dropdown when clicking outside */}
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowDropdown(false)}
                    />

                    {/* Dropdown menu */}
                    <div className="absolute right-0 mt-2 w-56 rounded-lg bg-white dark:bg-slate-800 shadow-lg border border-slate-200 dark:border-slate-700 py-1 z-20">
                      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                        <p className="text-sm font-medium text-slate-900 dark:text-white">{user?.name || "User"}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                      </div>
                      <div className="py-1">
                        <a
                          href="/settings"
                          className="flex items-center gap-2 px-4 py-2.5 min-h-[44px] text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
                        >
                          <User className="h-4 w-4" aria-hidden="true" />
                          Account Settings
                        </a>
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2 px-4 py-2.5 min-h-[44px] text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <LogOut className="h-4 w-4" aria-hidden="true" />
                          Sign out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      {showMobileMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setShowMobileMenu(false)}
          />

          {/* Slide-out Menu */}
          <nav className="fixed top-0 left-0 h-full w-64 bg-white dark:bg-slate-800 shadow-lg z-50 md:hidden transform transition-transform">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-6 w-6 text-primary" aria-hidden="true" />
                <span className="font-bold text-slate-900 dark:text-white">Tax Deed Flow</span>
              </div>
              <button
                onClick={() => setShowMobileMenu(false)}
                className="min-w-[44px] min-h-[44px] p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 flex items-center justify-center"
                aria-label="Close menu"
              >
                <X className="h-5 w-5 text-slate-600 dark:text-slate-300" aria-hidden="true" />
              </button>
            </div>
            <div className="py-4">
              <a
                href="/"
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center gap-3 px-4 py-3 min-h-[44px] text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Dashboard
              </a>
              <a
                href="/properties"
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center gap-3 px-4 py-3 min-h-[44px] text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Properties
              </a>
              <a
                href="/counties"
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center gap-3 px-4 py-3 min-h-[44px] text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Counties
              </a>
              <a
                href="/auctions"
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center gap-3 px-4 py-3 min-h-[44px] text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Auctions
              </a>
              <a
                href="/batch-jobs"
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center gap-3 px-4 py-3 min-h-[44px] text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Batch Jobs
              </a>
              <a
                href="/orchestration"
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center gap-3 px-4 py-3 min-h-[44px] text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Orchestration
              </a>
              <a
                href="/data-integrity"
                onClick={() => setShowMobileMenu(false)}
                className="flex items-center gap-3 px-4 py-3 min-h-[44px] text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                Data Integrity
              </a>
            </div>
          </nav>
        </>
      )}
      </header>
    </>
  )
}
